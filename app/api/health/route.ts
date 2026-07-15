import { cases } from "@/lib/data";
import { getDatasetManifest } from "@/lib/dataset";
import { MCP_PROTOCOL_VERSION, MCP_SCHEMA_VERSION, MCP_SERVER_VERSION } from "@/lib/mcp";

export function GET() {
  return Response.json({
    status: "ok",
    service: "archlens",
    runtime: "demo",
    versions: { server: MCP_SERVER_VERSION, schema: MCP_SCHEMA_VERSION, protocol: MCP_PROTOCOL_VERSION },
    dataset: getDatasetManifest(),
    checks: { caseLibrary: cases.length > 0 ? "ok" : "failed" },
  }, { headers: { "Cache-Control": "no-store" } });
}
