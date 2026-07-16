import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { workspaceAuditEvents, workspaceMembers, workspaceSpaces } from "@/db/schema";
import { generateWorkspaceToken, hashWorkspaceToken, isWorkspaceRole, workspaceTokenExpiry, type WorkspaceRole } from "@/lib/workspace-auth";
import { buildWorkspaceInviteUrl } from "@/lib/workspace-invite";
import { consumeWorkspaceQuota, workspaceQuotaLimit, type WorkspaceQuotaLimits, type WorkspaceQuotaResult } from "@/lib/workspace-rate-limit";
import { getMcpRuntimeConfig, hasValidWorkspaceAuthorization } from "@/lib/runtime-config";

const jsonHeaders = { "Cache-Control": "no-store" };

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库操作失败";
  if (message.includes("no such table") || message.includes("workspace_members") || message.includes("workspace_audit_events") || message.includes("workspace_rate_limit_buckets")) return "共享工作区成员数据表不可用，请先应用 drizzle migration";
  return message;
}

function quota(config: ReturnType<typeof getMcpRuntimeConfig>, db: Awaited<ReturnType<typeof getDb>>, bucketKey: string) {
  const limits: WorkspaceQuotaLimits = { read: config.workspaceRateLimitPerMinute, write: config.workspaceWriteRateLimitPerMinute, member: config.workspaceMemberRateLimitPerMinute };
  return consumeWorkspaceQuota(db, `${bucketKey}:member`, workspaceQuotaLimit("member", "operator", limits));
}

function quotaResponse(quota: WorkspaceQuotaResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 1000));
  return Response.json({ error: "共享工作区请求过于频繁，请稍后重试", retryAfterSeconds, quota: { action: "member", role: "operator", limit: quota.limit } }, { status: 429, headers: { ...jsonHeaders, "Retry-After": String(retryAfterSeconds), "X-RateLimit-Limit": String(quota.limit), "X-RateLimit-Remaining": String(quota.remaining), "X-RateLimit-Reset": String(Math.ceil(quota.resetAt / 1000)), "X-RateLimit-Scope": "member:operator" } });
}

function disabled(config: ReturnType<typeof getMcpRuntimeConfig>) {
  return !config.workspaceAuthEnabled && !config.workspaceWriteEnabled;
}

function operatorResponse(request: Request, config: ReturnType<typeof getMcpRuntimeConfig>) {
  if (!config.workspaceAuthEnabled) return Response.json({ error: "共享工作区需要配置 ARCHLENS_WORKSPACE_TOKEN" }, { status: 503, headers: jsonHeaders });
  if (!hasValidWorkspaceAuthorization(request, config)) return Response.json({ error: "成员管理需要有效的 workspace operator token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
  return null;
}

function id(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) throw new Error(`${field} 必须使用 kebab-case`);
  return value.trim();
}

function label(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new Error("label 必须是非空字符串");
  if (value.trim().length > 120) throw new Error("label 不能超过 120 个字符");
  return value.trim();
}

async function spaceExists(db: Awaited<ReturnType<typeof getDb>>, spaceId: string) {
  const rows = await db.select({ id: workspaceSpaces.id }).from(workspaceSpaces).where(eq(workspaceSpaces.id, spaceId)).limit(1);
  return Boolean(rows[0]);
}

export async function GET(request: Request) {
  const config = getMcpRuntimeConfig();
  if (disabled(config)) return Response.json({ error: "共享工作区未启用" }, { status: 404, headers: jsonHeaders });
  const auth = operatorResponse(request, config);
  if (auth) return auth;
  try {
    const spaceId = id(new URL(request.url).searchParams.get("space_id"), "space_id");
    const db = await getDb();
    const quotaResult = await quota(config, db, "members:operator");
    if (!quotaResult.allowed) return quotaResponse(quotaResult);
    const members = await db.select({ memberId: workspaceMembers.memberId, label: workspaceMembers.label, role: workspaceMembers.role, createdAt: workspaceMembers.createdAt, expiresAt: workspaceMembers.expiresAt, revokedAt: workspaceMembers.revokedAt }).from(workspaceMembers).where(eq(workspaceMembers.spaceId, spaceId)).orderBy(desc(workspaceMembers.createdAt));
    const audits = await db.select().from(workspaceAuditEvents).where(eq(workspaceAuditEvents.spaceId, spaceId)).orderBy(desc(workspaceAuditEvents.createdAt)).limit(100);
    return Response.json({ members, auditEvents: audits }, { headers: jsonHeaders });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 503, headers: jsonHeaders });
  }
}

export async function POST(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.workspaceWriteEnabled) return Response.json({ error: "共享工作区写入未启用" }, { status: 404, headers: jsonHeaders });
  const auth = operatorResponse(request, config);
  if (auth) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "请求体必须是 JSON" }, { status: 400, headers: jsonHeaders }); }
  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("请求体必须是对象");
    const input = body as { spaceId?: unknown; memberId?: unknown; label?: unknown; role?: unknown; expiresInDays?: unknown };
    const spaceId = id(input.spaceId, "spaceId");
    const memberId = id(input.memberId, "memberId");
    const memberLabel = label(input.label);
    const expiresAt = workspaceTokenExpiry(input.expiresInDays);
    if (!isWorkspaceRole(input.role) || input.role === "owner") throw new Error("role 只能是 editor 或 viewer");
    const role = input.role as Exclude<WorkspaceRole, "owner">;
    const db = await getDb();
    const quotaResult = await quota(config, db, "members:operator");
    if (!quotaResult.allowed) return quotaResponse(quotaResult);
    if (!(await spaceExists(db, spaceId))) return Response.json({ error: "找不到共享工作区" }, { status: 404, headers: jsonHeaders });
    const token = generateWorkspaceToken();
    const tokenHash = await hashWorkspaceToken(token);
    const now = new Date().toISOString();
    await db.batch([
      db.insert(workspaceMembers).values({ id: `${spaceId}:${memberId}`, spaceId, memberId, label: memberLabel, role, tokenHash, createdAt: now, expiresAt, revokedAt: null }),
      db.insert(workspaceAuditEvents).values({ id: crypto.randomUUID(), spaceId, memberId, actor: "operator", action: "member.invited", detailJson: JSON.stringify({ role, label: memberLabel, expiresAt }), createdAt: now }),
    ]);
    const inviteUrl = config.workspaceInviteBaseUrl ? buildWorkspaceInviteUrl(config.workspaceInviteBaseUrl, { spaceId, memberId, token, expiresAt }) : undefined;
    return Response.json({ member: { spaceId, memberId, label: memberLabel, role, createdAt: now, expiresAt, revokedAt: null }, token, ...(inviteUrl ? { inviteUrl } : {}), warning: "token 只返回这一次，请立即交给成员并安全保存；inviteUrl 使用 URL fragment，不会随 HTTP 请求发送" }, { status: 201, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "成员邀请失败";
    const status = message.includes("UNIQUE") || message.includes("unique") ? 409 : message.includes("必须") || message.includes("只能") || message.includes("超过") || message.includes("对象") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}

export async function DELETE(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.workspaceWriteEnabled) return Response.json({ error: "共享工作区写入未启用" }, { status: 404, headers: jsonHeaders });
  const auth = operatorResponse(request, config);
  if (auth) return auth;
  try {
    const params = new URL(request.url).searchParams;
    const spaceId = id(params.get("space_id"), "space_id");
    const memberId = id(params.get("member_id"), "member_id");
    const db = await getDb();
    const quotaResult = await quota(config, db, "members:operator");
    if (!quotaResult.allowed) return quotaResponse(quotaResult);
    const rows = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.spaceId, spaceId), eq(workspaceMembers.memberId, memberId))).limit(1);
    if (!rows[0]) return Response.json({ error: "找不到共享工作区成员" }, { status: 404, headers: jsonHeaders });
    if (rows[0].revokedAt) return Response.json({ member: { memberId, revokedAt: rows[0].revokedAt }, alreadyRevoked: true }, { headers: jsonHeaders });
    const now = new Date().toISOString();
    await db.batch([
      db.update(workspaceMembers).set({ revokedAt: now }).where(eq(workspaceMembers.id, rows[0].id)),
      db.insert(workspaceAuditEvents).values({ id: crypto.randomUUID(), spaceId, memberId, actor: "operator", action: "member.revoked", detailJson: "{}", createdAt: now }),
    ]);
    return Response.json({ member: { memberId, revokedAt: now } }, { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "成员撤销失败";
    const status = message.includes("必须") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}
