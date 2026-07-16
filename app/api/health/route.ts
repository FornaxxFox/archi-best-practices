import { getDb, hasDbBinding } from "@/db";
import { sourceIntakeRecords, workspaceRateLimitBuckets, workspaceSpaces } from "@/db/schema";
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

async function workspaceStorageStatus(config: ReturnType<typeof getMcpRuntimeConfig>) {
  if (!config.workspaceAuthEnabled && !config.workspaceWriteEnabled) return "disabled";
  if (!(await hasDbBinding())) return "not_configured";
  try {
    const db = await getDb();
    await db.select({ id: workspaceSpaces.id }).from(workspaceSpaces).limit(1);
    await db.select({ bucketKey: workspaceRateLimitBuckets.bucketKey }).from(workspaceRateLimitBuckets).limit(1);
    return "ready";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return message.includes("no such table") || message.includes("workspace_spaces") ? "migration_required" : "error";
  }
}

export async function GET() {
  const config = getMcpRuntimeConfig();
  const sourceIntakeStorage = await sourceIntakeStorageStatus();
  const workspaceStorage = await workspaceStorageStatus(config);
  return Response.json({
    status: "ok",
    service: "archlens",
    runtime: "demo",
    versions: { server: MCP_SERVER_VERSION, schema: MCP_SCHEMA_VERSION, protocol: MCP_PROTOCOL_VERSION },
    mcp: { auth: config.authEnabled ? "bearer" : "none", rateLimitPerMinute: config.rateLimitPerMinute, rateLimitStorage: sourceIntakeStorage === "not_configured" ? "memory" : "d1" },
    sourceIntake: { storage: sourceIntakeStorage, auth: config.sourceIntakeAuthEnabled || config.authEnabled ? "bearer" : "none", writeEnabled: config.sourceIntakeWriteEnabled, maxReportBytes: config.sourceIntakeMaxReportBytes },
    workspace: { storage: workspaceStorage, auth: config.workspaceAuthEnabled ? "bearer" : "disabled", memberPermissions: config.workspaceAuthEnabled ? "operator_and_member_tokens" : "disabled", inviteLinks: config.workspaceAuthEnabled && Boolean(config.workspaceInviteBaseUrl), writeEnabled: config.workspaceWriteEnabled, rateLimitPerMinute: config.workspaceRateLimitPerMinute, rateLimitPolicy: { readPerMinute: config.workspaceRateLimitPerMinute, writePerMinute: config.workspaceWriteRateLimitPerMinute, memberPerMinute: config.workspaceMemberRateLimitPerMinute, ownerAndOperatorMultiplier: 2 }, rateLimitStorage: workspaceStorage === "ready" ? "d1" : workspaceStorage, maxSnapshotBytes: config.workspaceMaxSnapshotBytes },
    dataset: getDatasetManifest(),
    checks: { caseLibrary: cases.length > 0 ? "ok" : "failed", sourceIntake: sourceIntakeStorage, workspace: workspaceStorage },
  }, { headers: { "Cache-Control": "no-store" } });
}
