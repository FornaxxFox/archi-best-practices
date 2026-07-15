import { getDb, hasDbBinding } from "@/db";
import { sourceIntakeRecords } from "@/db/schema";
import { cases } from "@/lib/data";
import { getDatasetManifest } from "@/lib/dataset";
import { MCP_PROTOCOL_VERSION, MCP_SCHEMA_VERSION, MCP_SERVER_VERSION } from "@/lib/mcp";
import { getMcpRuntimeConfig } from "@/lib/runtime-config";

async function sourceIntakeStorageStatus() {
  if (!(await hasDbBinding())) return "not_configured";
  try {
    const db = await getDb();
    await db.select({ id: sourceIntakeRecords.id }).from(sourceIntakeRecords).limit(1);
    return "ready";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return message.includes("no such table") || message.includes("source_intake_records") ? "migration_required" : "error";
  }
}

export async function GET() {
  const config = getMcpRuntimeConfig();
  const sourceIntakeStorage = await sourceIntakeStorageStatus();
  return Response.json({
    status: "ok",
    service: "archlens",
    runtime: "demo",
    versions: { server: MCP_SERVER_VERSION, schema: MCP_SCHEMA_VERSION, protocol: MCP_PROTOCOL_VERSION },
    mcp: { auth: config.authEnabled ? "bearer" : "none", rateLimitPerMinute: config.rateLimitPerMinute },
    sourceIntake: { storage: sourceIntakeStorage, writeEnabled: config.sourceIntakeWriteEnabled, maxReportBytes: config.sourceIntakeMaxReportBytes },
    dataset: getDatasetManifest(),
    checks: { caseLibrary: cases.length > 0 ? "ok" : "failed", sourceIntake: sourceIntakeStorage },
  }, { headers: { "Cache-Control": "no-store" } });
}
