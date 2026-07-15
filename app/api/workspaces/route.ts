import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { workspaceSpaces } from "@/db/schema";
import { parseWorkspaceSnapshot, validateWorkspaceSnapshot, type WorkspaceSnapshot } from "@/lib/workspace";
import { getMcpRuntimeConfig, hasValidWorkspaceAuthorization } from "@/lib/runtime-config";

const jsonHeaders = { "Cache-Control": "no-store" };

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库操作失败";
  if (message.includes("no such table") || message.includes("workspace_spaces")) return "共享工作区数据表不可用，请先应用 drizzle migration";
  return message;
}

function enabled(config: ReturnType<typeof getMcpRuntimeConfig>) {
  return config.workspaceAuthEnabled || config.workspaceWriteEnabled;
}

function authResponse(request: Request, config: ReturnType<typeof getMcpRuntimeConfig>) {
  if (!config.workspaceAuthEnabled) return Response.json({ error: "共享工作区需要配置 ARCHLENS_WORKSPACE_TOKEN" }, { status: 503, headers: jsonHeaders });
  if (!hasValidWorkspaceAuthorization(request, config)) return Response.json({ error: "需要有效的 workspace Bearer token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
  return null;
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

function publicSpace(row: typeof workspaceSpaces.$inferSelect, snapshot: WorkspaceSnapshot) {
  return { id: row.id, name: row.name, ownerLabel: row.ownerLabel, schemaVersion: row.schemaVersion, datasetVersion: row.datasetVersion, snapshot, createdAt: row.createdAt, updatedAt: row.updatedAt };
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
  const auth = authResponse(request, config);
  if (auth) return auth;
  try {
    const db = await getDb();
    const params = new URL(request.url).searchParams;
    const id = params.get("id")?.trim();
    if (id) {
      const rows = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, parseId(id))).limit(1);
      if (!rows[0]) return Response.json({ error: "找不到共享工作区" }, { status: 404, headers: jsonHeaders });
      return Response.json({ space: publicSpace(rows[0], parseWorkspaceSnapshot(rows[0].snapshotJson)) }, { headers: jsonHeaders });
    }
    const rows = await db.select().from(workspaceSpaces).orderBy(desc(workspaceSpaces.updatedAt)).limit(50);
    return Response.json({ spaces: rows.map((row) => ({ id: row.id, name: row.name, ownerLabel: row.ownerLabel, schemaVersion: row.schemaVersion, datasetVersion: row.datasetVersion, createdAt: row.createdAt, updatedAt: row.updatedAt })) }, { headers: jsonHeaders });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 503, headers: jsonHeaders });
  }
}

export async function POST(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.workspaceWriteEnabled) return Response.json({ error: "共享工作区写入未启用" }, { status: 404, headers: jsonHeaders });
  const auth = authResponse(request, config);
  if (auth) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "请求体必须是 JSON" }, { status: 400, headers: jsonHeaders }); }
  try {
    const parsed = parseBody(body, config, true);
    if (!parsed.id) throw new Error("id 必须是非空字符串");
    const db = await getDb();
    const now = new Date().toISOString();
    await db.insert(workspaceSpaces).values({ id: parsed.id, name: parsed.name, ownerLabel: parsed.ownerLabel, schemaVersion: parsed.snapshot.schemaVersion, datasetVersion: parsed.snapshot.datasetVersion, snapshotJson: JSON.stringify(parsed.snapshot), createdAt: now, updatedAt: now });
    const [row] = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, parsed.id)).limit(1);
    return Response.json({ space: publicSpace(row, parsed.snapshot) }, { status: 201, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "共享工作区创建失败";
    const status = message.includes("UNIQUE") || message.includes("unique") ? 409 : message.includes("必须") || message.includes("超过") || message.includes("对象") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}

export async function PUT(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.workspaceWriteEnabled) return Response.json({ error: "共享工作区写入未启用" }, { status: 404, headers: jsonHeaders });
  const auth = authResponse(request, config);
  if (auth) return auth;
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "请求体必须是 JSON" }, { status: 400, headers: jsonHeaders }); }
  try {
    const spaceId = parseId(id);
    const parsed = parseBody(body, config, false);
    const db = await getDb();
    const existing = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, spaceId)).limit(1);
    if (!existing[0]) return Response.json({ error: "找不到共享工作区" }, { status: 404, headers: jsonHeaders });
    const now = new Date().toISOString();
    await db.update(workspaceSpaces).set({ name: parsed.name || existing[0].name, ownerLabel: parsed.ownerLabel || existing[0].ownerLabel, schemaVersion: parsed.snapshot.schemaVersion, datasetVersion: parsed.snapshot.datasetVersion, snapshotJson: JSON.stringify(parsed.snapshot), updatedAt: now }).where(eq(workspaceSpaces.id, spaceId));
    const [row] = await db.select().from(workspaceSpaces).where(eq(workspaceSpaces.id, spaceId)).limit(1);
    return Response.json({ space: publicSpace(row, parsed.snapshot) }, { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "共享工作区更新失败";
    const status = message.includes("必须") || message.includes("超过") || message.includes("对象") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}
