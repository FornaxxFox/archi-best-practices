import { callMcpTool, mcpToolDefinitions } from "@/lib/mcp";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "MCP-Protocol-Version": "2025-03-26",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET() {
  return response({ name: "archlens", version: "0.1.0", protocol: "2025-03-26", transport: "streamable-http", auth: "none", tools: mcpToolDefinitions.map((tool) => tool.name), endpoint: "/api/mcp" });
}

export async function POST(request: Request) {
  const message = (await request.json()) as { id?: string | number; method?: string; params?: Record<string, unknown> };
  const id = message.id ?? null;
  try {
    if (message.method === "initialize") {
      return response({ jsonrpc: "2.0", id, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "archlens", version: "0.1.0" } } });
    }
    if (message.method === "notifications/initialized") return new Response(null, { status: 202, headers });
    if (message.method === "tools/list") return response({ jsonrpc: "2.0", id, result: { tools: mcpToolDefinitions } });
    if (message.method === "resources/list") return response({ jsonrpc: "2.0", id, result: { resources: [{ uri: "archlens://cases", name: "ArchLens case library", description: "公开案例结构化索引" }] } });
    if (message.method === "tools/call") {
      const name = String(message.params?.name ?? "");
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      const result = callMcpTool(name, args);
      return response({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false } });
    }
    return response({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${message.method ?? ""}` } }, 404);
  } catch (error) {
    return response({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: error instanceof Error ? error.message : "MCP 调用失败" }], isError: true } }, 200);
  }
}

