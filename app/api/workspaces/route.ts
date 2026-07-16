import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { workspaceAuditEvents, workspaceMembers, workspaceSpaces } from "@/db/schema";
import { canWriteWorkspace, hashWorkspaceToken, type WorkspaceRole } from "@/lib/workspace-auth";
import { parseWorkspaceSnapshot, validateWorkspaceSnapshot, type WorkspaceSnapshot } from "@/lib/workspace";
import { consumeWorkspaceQuota, workspaceQuotaLimit, type WorkspaceQuotaAction, type WorkspaceQuotaLimits, type WorkspaceQuotaResult, type WorkspaceQuotaRole } from "@/lib/workspace-rate-limit";
import { getMcpRuntimeConfig, hasValidWorkspaceAuthorization } from "@/lib/runtime-config";

const jsonHeaders = { "Cache-Control": "no-store" };
type WorkspaceDatabase = Awaited<ReturnType<typeof getDb>>;
type WorkspaceAccess = { role: WorkspaceRole; actor: string; memberId: string | null };

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库操作失败";
  if (message.includes("no such table") || message.includes("workspace_spaces") || message.includes("workspace_rate_limit_buckets")) return "共享工作区数据表不可用，请先应用 drizzle migration";
  return message;
}

function quotaLimits(config: ReturnType<typeof getMcpRuntimeConfig>): WorkspaceQuotaLimits {
  return { read: config.workspaceRateLimitPerMinute, write: config.workspaceWriteRateLimitPerMinute, member: config.workspaceMemberRateLimitPerMinute };
}

async function quota(db: WorkspaceDatabase, bucketKey: string, action: WorkspaceQuotaAction, role: WorkspaceQuotaRole, config: ReturnType<typeof getMcpRuntimeConfig>) {
  return consumeWorkspaceQuota(db, `${bucketKey}:${action}`, workspaceQuotaLimit(action, role, quotaLimits(config)));
}

function quotaResponse(quota: WorkspaceQuotaResult, action: WorkspaceQuotaAction, role: WorkspaceQuotaRole) {
  const retryAfterSeconds = Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 1000));
  return Response.json({ error: "共享工作区请求过于频繁，请稍后重试", retryAfterSeconds, quota: { action, role, limit: quota.limit } }, { status: 429, headers: { ...jsonHeaders, "Retry-After": String(retryAfterSeconds), "X-RateLimit-Limit": String(quota.limit), "X-RateLimit-Remaining": String(quota.remaining), "X-RateLimit-Reset": String(Math.ceil(quota.resetAt / 1000)), "X-RateLimit-Scope": `${action}:${role}` } });
}

function enabled(config: ReturnType<typeof getMcpRuntimeConfig>) {
  return config.workspaceAuthEnabled || config.workspaceWriteEnabled;
}

function authConfigurationResponse(config: ReturnType<typeof getMcpRuntimeConfig>) {
  if (!config.workspaceAuthEnabled) return Response.json({ error: "共享工作区需要配置 ARCHLENS_WORKSPACE_TOKEN" }, { status: 503, headers: jsonHeaders });
  return null;
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function operatorAuthResponse(request: Request, config: ReturnType<typeof getMcpRuntimeConfig>) {
  const configuration = authConfigurationResponse(config);
  if (configuration) return configuration;
  if (!hasValidWorkspaceAuthorization(request, config)) return Response.json({ error: "需要有效的 workspace operator token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
  return null;
}

async function resolveAccess(db: WorkspaceDatabase, request: Request, spaceId: string, config: ReturnType<typeof getMcpRuntimeConfig>): Promise<WorkspaceAccess | null> {
  if (hasValidWorkspaceAuthorization(request, config)) return { role: "owner", actor: "operator", memberId: null };
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await hashWorkspaceToken(token);
  const now = new Date().toISOString();
  const rows = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.spaceId, spaceId), eq(workspaceMembers.tokenHash, tokenHash), isNull(workspaceMembers.revokedAt), or(isNull(workspaceMembers.expiresAt), gt(workspaceMembers.expiresAt, now)))).limit(1);
  const member = rows[0];
  return member ? { role: member.role as WorkspaceRole, actor: member.memberId, memberId: member.memberId } : null;
}

function parseId(value: string | null) {
  const id = value?.trim() ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("space id 必须使用 kebab-case");
  return id;
}

function parseName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new Error("name 必须是非空字符串");
  if (value.trim().length > 120) throw new Error("name 不能超过 120 个字符");
  return value.trim();
}

function parseOwnerLabel(value: unknown) {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("ownerLabel 必须是字符串");
  return value.trim().slice(0, 120);
}

function publicSpace(row: typeof workspaceSpaces.$inferSelect, snapshot: WorkspaceSnapshot, role?: WorkspaceRole) {
  return { id: row.id, name: row.name, ownerLabel: row.ownerLabel, schemaVersion: row.schemaVersion, datasetVersion: row.datasetVersion, snapshot, ...(role ? { role } : {}), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function parseBody(body: unknown, config: ReturnType<typeof getMcpRuntimeConfig>, requireName: boolean) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("请求体必须是对象");
  const input = body as { id?: unknown; name?: unknown; ownerLabel?: unknown; snapshot?: unknown };
  const id = typeof input.id === "string" ? parseId(input.id) : "";
  const name = requireName || input.name !== undefined ? parseName(input.name) : "";
  const ownerLabel = parseOwnerLabel(input.ownerLabel);
  const snapshot = validateWorkspaceSnapshot(input.snapshot);
  if (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > config.workspaceMaxSnapshotBytes) throw new Error(`snapshot 超过 ${config.workspaceMaxSnapshotBytes} 字节上限`);
  return { id, name, ownerLabel, snapshot };
}

export async function GET(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!enabled(config)) return Response.json({ error: "共享工作区未启用" }, { status: 404, headers: jsonHeaders });
  const configuration = authConfigurationResponse(config);
  if (configuration) return configuration;
  try {
    const params = new URL(request.url).searchParams;
    const id = params.get("id")?.trim();
    const operator = hasValidWorkspaceAuthorization(request, config);
    const memberToken = bearerToken(request);
    if (!operator && !memberToken) return Response.json({ error: "需要有效的 workspace member token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
    if (!id && !operator) return Response.json({ error: "成员 token 查询空间时必须提供 id 参数" }, { status: 400, headers: jsonHeaders });
    const db = await getDb();
    if (id) {
      const spaceId = parseId(id);
      const access = await resolveAccess(db, request, spaceId, config);
      if (!access) return Response.json({ error: "没有访问该共享工作区的权限" }, { status: 403, headers: jsonHeaders });
      const quotaResult = await quota(db, `space:${spaceId}:${access.actor}`, "read", access.role, config);
      if (!quotaResult.allowed) return quotaResponse(quotaResult, "read", access.role);
      const rows = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, spaceId)).limit(1);
      if (!rows[0]) return Response.json({ error: "找不到共享工作区" }, { status: 404, headers: jsonHeaders });
      return Response.json({ space: publicSpace(rows[0], parseWorkspaceSnapshot(rows[0].snapshotJson), access.role) }, { headers: jsonHeaders });
    }
    const quotaResult = await quota(db, "spaces:operator", "read", "operator", config);
    if (!quotaResult.allowed) return quotaResponse(quotaResult, "read", "operator");
    const rows = await db.select().from(workspaceSpaces).orderBy(desc(workspaceSpaces.updatedAt)).limit(50);
    return Response.json({ spaces: rows.map((row) => ({ id: row.id, name: row.name, ownerLabel: row.ownerLabel, schemaVersion: row.schemaVersion, datasetVersion: row.datasetVersion, role: "owner", createdAt: row.createdAt, updatedAt: row.updatedAt })) }, { headers: jsonHeaders });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 503, headers: jsonHeaders });
  }
}

export async function POST(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.workspaceWriteEnabled) return Response.json({ error: "共享工作区写入未启用" }, { status: 404, headers: jsonHeaders });
  const auth = operatorAuthResponse(request, config);
  if (auth) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "请求体必须是 JSON" }, { status: 400, headers: jsonHeaders }); }
  try {
    const parsed = parseBody(body, config, true);
    if (!parsed.id) throw new Error("id 必须是非空字符串");
    const db = await getDb();
    const quotaResult = await quota(db, "spaces:operator", "write", "operator", config);
    if (!quotaResult.allowed) return quotaResponse(quotaResult, "write", "operator");
    const now = new Date().toISOString();
    await db.batch([
      db.insert(workspaceSpaces).values({ id: parsed.id, name: parsed.name, ownerLabel: parsed.ownerLabel, schemaVersion: parsed.snapshot.schemaVersion, datasetVersion: parsed.snapshot.datasetVersion, snapshotJson: JSON.stringify(parsed.snapshot), createdAt: now, updatedAt: now }),
      db.insert(workspaceAuditEvents).values({ id: crypto.randomUUID(), spaceId: parsed.id, memberId: null, actor: "operator", action: "space.created", detailJson: JSON.stringify({ name: parsed.name }), createdAt: now }),
    ]);
    const [row] = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, parsed.id)).limit(1);
    return Response.json({ space: publicSpace(row, parsed.snapshot, "owner") }, { status: 201, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "共享工作区创建失败";
    const status = message.includes("UNIQUE") || message.includes("unique") ? 409 : message.includes("必须") || message.includes("超过") || message.includes("对象") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}

export async function PUT(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.workspaceWriteEnabled) return Response.json({ error: "共享工作区写入未启用" }, { status: 404, headers: jsonHeaders });
  const configuration = authConfigurationResponse(config);
  if (configuration) return configuration;
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  const memberToken = bearerToken(request);
  if (!memberToken && !hasValidWorkspaceAuthorization(request, config)) return Response.json({ error: "需要有效的 workspace member token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "请求体必须是 JSON" }, { status: 400, headers: jsonHeaders }); }
  try {
    const spaceId = parseId(id);
    const parsed = parseBody(body, config, false);
    const db = await getDb();
    const existing = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, spaceId)).limit(1);
    if (!existing[0]) return Response.json({ error: "找不到共享工作区" }, { status: 404, headers: jsonHeaders });
    const access = await resolveAccess(db, request, spaceId, config);
    if (!access) return Response.json({ error: "没有访问该共享工作区的权限" }, { status: 403, headers: jsonHeaders });
    if (!canWriteWorkspace(access.role)) return Response.json({ error: "当前成员角色只能读取共享工作区" }, { status: 403, headers: jsonHeaders });
    const quotaResult = await quota(db, `space:${spaceId}:${access.actor}`, "write", access.role, config);
    if (!quotaResult.allowed) return quotaResponse(quotaResult, "write", access.role);
    const now = new Date().toISOString();
    await db.batch([
      db.update(workspaceSpaces).set({ name: parsed.name || existing[0].name, ownerLabel: parsed.ownerLabel || existing[0].ownerLabel, schemaVersion: parsed.snapshot.schemaVersion, datasetVersion: parsed.snapshot.datasetVersion, snapshotJson: JSON.stringify(parsed.snapshot), updatedAt: now }).where(eq(workspaceSpaces.id, spaceId)),
      db.insert(workspaceAuditEvents).values({ id: crypto.randomUUID(), spaceId, memberId: access.memberId, actor: access.actor, action: "space.updated", detailJson: JSON.stringify({ datasetVersion: parsed.snapshot.datasetVersion }), createdAt: now }),
    ]);
    const [row] = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, spaceId)).limit(1);
    return Response.json({ space: publicSpace(row, parsed.snapshot, access.role) }, { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "共享工作区更新失败";
    const status = message.includes("必须") || message.includes("超过") || message.includes("对象") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}
