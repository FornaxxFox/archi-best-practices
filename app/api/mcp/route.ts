import { getDatasetManifest } from "@/lib/dataset";
import { callMcpTool, MCP_PROTOCOL_VERSION, MCP_SCHEMA_VERSION, MCP_SERVER_VERSION, McpToolError, mcpToolDefinitions } from "@/lib/mcp";

const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-request-id, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Server-Version, MCP-Schema-Version, X-Request-ID, X-Response-Time-Ms, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  "Content-Type": "application/json",
  "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  "MCP-Server-Version": MCP_SERVER_VERSION,
  "MCP-Schema-Version": MCP_SCHEMA_VERSION,
};

const rateLimit = { limit: 60, windowMs: 60_000 };
const buckets = new Map<string, { startedAt: number; count: number }>();

function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function clientKey(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const current = buckets.get(key);
  const bucket = !current || now - current.startedAt >= rateLimit.windowMs ? { startedAt: now, count: 0 } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 1000) {
    for (const [bucketKey, value] of buckets) if (now - value.startedAt >= rateLimit.windowMs) buckets.delete(bucketKey);
  }
  return { allowed: bucket.count <= rateLimit.limit, remaining: Math.max(0, rateLimit.limit - bucket.count), resetAt: bucket.startedAt + rateLimit.windowMs };
}

function response(body: unknown, requestIdValue: string, status = 200, rate?: ReturnType<typeof consumeRateLimit>, startedAt = Date.now()) {
  const headers = new Headers(baseHeaders);
  headers.set("X-Request-ID", requestIdValue);
  headers.set("X-Response-Time-Ms", String(Date.now() - startedAt));
  if (rate) {
    headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    headers.set("X-RateLimit-Remaining", String(rate.remaining));
    headers.set("X-RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000)));
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function rpcError(id: string | number | null, code: number, message: string, requestIdValue: string, rate: ReturnType<typeof consumeRateLimit>, startedAt: number, data?: unknown, status = 400) {
  return response({ jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } }, requestIdValue, status, rate, startedAt);
}

type JsonRpcMessage = { id?: string | number; method?: string; params?: Record<string, unknown> };

function parseMessage(value: unknown): JsonRpcMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("请求必须是 JSON 对象");
  const message = value as JsonRpcMessage;
  if (message.id !== undefined && typeof message.id !== "string" && typeof message.id !== "number") throw new Error("id 必须是字符串或数字");
  if (typeof message.method !== "string" || !message.method) throw new Error("method 必须是非空字符串");
  if (message.params !== undefined && (!message.params || typeof message.params !== "object" || Array.isArray(message.params))) throw new Error("params 必须是 JSON 对象");
  return message;
}

function logRequest(requestIdValue: string, method: string, startedAt: number, outcome: string) {
  console.info(JSON.stringify({ event: "mcp_request", requestId: requestIdValue, method, outcome, durationMs: Date.now() - startedAt }));
}

export async function OPTIONS(request: Request) {
  const startedAt = Date.now();
  const id = requestId(request);
  return response(null, id, 204, undefined, startedAt);
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const id = requestId(request);
  const rate = consumeRateLimit(request);
  if (!rate.allowed) return rpcError(null, -32029, "请求过于频繁，请稍后重试", id, rate, startedAt, { retryAfterSeconds: Math.ceil((rate.resetAt - Date.now()) / 1000) }, 429);
  logRequest(id, "GET", startedAt, "ok");
  return response({ name: "archlens", version: MCP_SERVER_VERSION, schemaVersion: MCP_SCHEMA_VERSION, protocol: MCP_PROTOCOL_VERSION, transport: "streamable-http", auth: "none", dataset: getDatasetManifest(), tools: mcpToolDefinitions.map((tool) => tool.name), endpoint: "/api/mcp" }, id, 200, rate, startedAt);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const id = requestId(request);
  const rate = consumeRateLimit(request);
  let method = "parse";
  if (!rate.allowed) return rpcError(null, -32029, "请求过于频繁，请稍后重试", id, rate, startedAt, { retryAfterSeconds: Math.ceil((rate.resetAt - Date.now()) / 1000) }, 429);
  try {
    let rawMessage: unknown;
    try {
      rawMessage = await request.json();
    } catch (error) {
      logRequest(id, method, startedAt, "parse_error");
      return rpcError(null, -32700, error instanceof Error ? error.message : "无法解析 JSON 请求", id, rate, startedAt);
    }
    let message: JsonRpcMessage;
    try {
      message = parseMessage(rawMessage);
    } catch (error) {
      logRequest(id, method, startedAt, "invalid_request");
      return rpcError(null, -32600, error instanceof Error ? error.message : "无效的 JSON-RPC 请求", id, rate, startedAt);
    }
    method = message.method ?? "unknown";
    const messageId = message.id ?? null;
    if (method === "initialize") {
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "archlens", version: MCP_SERVER_VERSION, schemaVersion: MCP_SCHEMA_VERSION, dataset: getDatasetManifest() } } }, id, 200, rate, startedAt);
    }
    if (method === "notifications/initialized") {
      logRequest(id, method, startedAt, "ok");
      return response(null, id, 202, rate, startedAt);
    }
    if (method === "tools/list") {
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { tools: mcpToolDefinitions } }, id, 200, rate, startedAt);
    }
    if (method === "resources/list") {
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { resources: [{ uri: "archlens://cases", name: "ArchLens case library", description: "公开案例结构化索引", metadata: getDatasetManifest() }] } }, id, 200, rate, startedAt);
    }
    if (method !== "tools/call") {
      logRequest(id, method, startedAt, "method_not_found");
      return rpcError(messageId, -32601, `Method not found: ${method}`, id, rate, startedAt, undefined, 404);
    }
    const name = typeof message.params?.name === "string" ? message.params.name : "";
    const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const result = callMcpTool(name, args);
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false } }, id, 200, rate, startedAt);
    } catch (error) {
      const toolError = error instanceof McpToolError ? error : new McpToolError("INVALID_PARAMS", error instanceof Error ? error.message : "MCP 调用失败");
      logRequest(id, method, startedAt, toolError.code);
      return response({ jsonrpc: "2.0", id: messageId, result: { content: [{ type: "text", text: toolError.message }], structuredContent: { error: { code: toolError.code, message: toolError.message, details: toolError.details ?? null } }, isError: true } }, id, 200, rate, startedAt);
    }
  } catch (error) {
    logRequest(id, method, startedAt, "internal_error");
    return rpcError(null, -32603, error instanceof Error ? error.message : "MCP 服务内部错误", id, rate, startedAt, undefined, 500);
  }
}
