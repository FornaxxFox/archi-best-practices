import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sourceIntakeRecords } from "@/db/schema";
import { cases, findCase } from "@/lib/data";
import { reportByteLength, validateSourceIntakeReport, type SourceIntakeReport } from "@/lib/source-intake-contract";
import { getMcpRuntimeConfig, hasValidSourceIntakeAuthorization } from "@/lib/runtime-config";

const jsonHeaders = { "Cache-Control": "no-store" };

function unavailable() {
  return Response.json({ error: "来源 intake 持久化尚未配置 D1" }, { status: 503, headers: jsonHeaders });
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库操作失败";
  if (message.includes("no such table") || message.includes("source_intake_records")) return "来源 intake 数据表不可用，请先应用 drizzle migration";
  return message;
}

function publicRecord(record: typeof sourceIntakeRecords.$inferSelect) {
  return {
    id: record.id,
    caseId: record.caseId,
    caseTitle: record.caseTitle,
    status: record.status,
    summary: { sourceCount: record.sourceCount, reachableCount: record.reachableCount, failedCount: record.failedCount },
    generatedAt: record.generatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function parseLimit(value: string | null) {
  const parsed = Number(value ?? "20");
  return Number.isInteger(parsed) ? Math.min(50, Math.max(1, parsed)) : 20;
}

export async function GET(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!hasValidSourceIntakeAuthorization(request, config)) return Response.json({ error: "需要有效的 Bearer token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
  try {
    const db = await getDb();
    const params = new URL(request.url).searchParams;
    const id = params.get("id")?.trim();
    const caseId = params.get("case_id")?.trim();
    const status = params.get("status");
    const limit = parseLimit(params.get("limit"));
    if (status && status !== "recorded" && status !== "needs_review") return Response.json({ error: "status 必须是 recorded 或 needs_review" }, { status: 400, headers: jsonHeaders });
    if (id) {
      const rows = await db.select().from(sourceIntakeRecords).where(eq(sourceIntakeRecords.id, id)).limit(1);
      if (!rows[0]) return Response.json({ error: "找不到来源 intake 记录" }, { status: 404, headers: jsonHeaders });
      const report = JSON.parse(rows[0].reportJson) as SourceIntakeReport;
      return Response.json({ record: publicRecord(rows[0]), report }, { headers: jsonHeaders });
    }
    const filters = [caseId ? eq(sourceIntakeRecords.caseId, caseId) : undefined, status ? eq(sourceIntakeRecords.status, status as "recorded" | "needs_review") : undefined].filter(Boolean);
    const rows = filters.length ? await db.select().from(sourceIntakeRecords).where(and(...filters)).orderBy(desc(sourceIntakeRecords.createdAt)).limit(limit) : await db.select().from(sourceIntakeRecords).orderBy(desc(sourceIntakeRecords.createdAt)).limit(limit);
    return Response.json({ records: rows.map(publicRecord), limit, caseCount: cases.length }, { headers: jsonHeaders });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 503, headers: jsonHeaders });
  }
}

export async function POST(request: Request) {
  const config = getMcpRuntimeConfig();
  if (!config.sourceIntakeWriteEnabled) return Response.json({ error: "来源 intake 写入未启用" }, { status: 404, headers: jsonHeaders });
  if (!hasValidSourceIntakeAuthorization(request, config)) return Response.json({ error: "需要有效的 Bearer token" }, { status: 401, headers: { ...jsonHeaders, "WWW-Authenticate": "Bearer" } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400, headers: jsonHeaders });
  }
  try {
    if (!body || typeof body !== "object" || Array.isArray(body) || !("report" in body)) throw new Error("请求体必须包含 report");
    const report = validateSourceIntakeReport((body as { report: unknown }).report);
    const item = findCase(report.case.id);
    if (!item) return Response.json({ error: `找不到案例：${report.case.id}` }, { status: 422, headers: jsonHeaders });
    if (report.case.title !== item.title) return Response.json({ error: "source-report 的案例标题与案例库不一致" }, { status: 422, headers: jsonHeaders });
    if (reportByteLength(report) > config.sourceIntakeMaxReportBytes) return Response.json({ error: `source-report 超过 ${config.sourceIntakeMaxReportBytes} 字节上限` }, { status: 413, headers: jsonHeaders });
    const db = await getDb();
    const now = new Date().toISOString();
    const [record] = await db.insert(sourceIntakeRecords).values({ id: crypto.randomUUID(), caseId: item.id, caseTitle: item.title, status: report.summary.failedCount > 0 ? "needs_review" : "recorded", sourceCount: report.summary.sourceCount, reachableCount: report.summary.reachableCount, failedCount: report.summary.failedCount, generatedAt: report.generatedAt, reportJson: JSON.stringify(report), createdAt: now, updatedAt: now }).returning();
    return Response.json({ record: publicRecord(record) }, { status: 201, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "来源 intake 记录失败";
    const status = message.includes("必须") || message.includes("schemaVersion") || message.includes("数量") || message.includes("HTTPS") ? 422 : 503;
    return Response.json({ error: status === 503 ? databaseError(error) : message }, { status, headers: jsonHeaders });
  }
}
