import { eq, lt, sql } from "drizzle-orm";
import { getDb, hasDbBinding } from "@/db";
import { mcpRateLimitBuckets } from "@/db/schema";
import { getDatasetManifest } from "@/lib/dataset";
import { callMcpTool, getMcpPrompt, MCP_PROTOCOL_VERSION, MCP_SCHEMA_VERSION, MCP_SERVER_VERSION, McpToolError, mcpPromptDefinitions, mcpResourceDefinitions, mcpResourceTemplateDefinitions, mcpToolDefinitions, readMcpResource } from "@/lib/mcp";
import { getMcpRuntimeConfig, hasValidMcpAuthorization } from "@/lib/runtime-config";

const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-request-id, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Server-Version, MCP-Schema-Version, WWW-Authenticate, X-Request-ID, X-Response-Time-Ms, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  "Content-Type": "application/json",
  "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  "MCP-Server-Version": MCP_SERVER_VERSION,
  "MCP-Schema-Version": MCP_SCHEMA_VERSION,
};

const rateLimitWindowMs = 60_000;
const buckets = new Map<string, { startedAt: number; count: number }>();
let persistentRateLimitWarningLogged = false;

type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: number };

function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function clientKey(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

function consumeMemoryRateLimit(request: Request, limit: number, now = Date.now()): RateLimitResult {
  const key = clientKey(request);
  const current = buckets.get(key);
  const bucket = !current || now - current.startedAt >= rateLimitWindowMs ? { startedAt: now, count: 0 } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 1000) {
    for (const [bucketKey, value] of buckets) if (now - value.startedAt >= rateLimitWindowMs) buckets.delete(bucketKey);
  }
  return { allowed: bucket.count <= limit, limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.startedAt + rateLimitWindowMs };
}

async function consumeRateLimit(request: Request, limit: number): Promise<RateLimitResult> {
  const now = Date.now();
  const key = clientKey(request);
  const windowStartedAt = Math.floor(now / rateLimitWindowMs) * rateLimitWindowMs;
  if (await hasDbBinding()) {
    try {
      const db = await getDb();
      await db.insert(mcpRateLimitBuckets).values({ clientKey: key, windowStartedAt, count: 1, updatedAt: new Date(now).toISOString() }).onConflictDoUpdate({
        target: mcpRateLimitBuckets.clientKey,
        set: {
          windowStartedAt: sql`CASE WHEN ${mcpRateLimitBuckets.windowStartedAt} = ${windowStartedAt} THEN ${mcpRateLimitBuckets.windowStartedAt} ELSE ${windowStartedAt} END`,
          count: sql`CASE WHEN ${mcpRateLimitBuckets.windowStartedAt} = ${windowStartedAt} THEN ${mcpRateLimitBuckets.count} + 1 ELSE 1 END`,
          updatedAt: new Date(now).toISOString(),
        },
      });
      const [bucket] = await db.select({ windowStartedAt: mcpRateLimitBuckets.windowStartedAt, count: mcpRateLimitBuckets.count }).from(mcpRateLimitBuckets).where(eq(mcpRateLimitBuckets.clientKey, key)).limit(1);
      if (!bucket) throw new Error("限流 bucket 写入后无法读取");
      if (Math.random() < 0.01) await db.delete(mcpRateLimitBuckets).where(lt(mcpRateLimitBuckets.windowStartedAt, windowStartedAt - rateLimitWindowMs));
      return { allowed: bucket.count <= limit, limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.windowStartedAt + rateLimitWindowMs };
    } catch (error) {
      if (!persistentRateLimitWarningLogged) {
        persistentRateLimitWarningLogged = true;
        console.warn(JSON.stringify({ event: "mcp_rate_limit_fallback", message: error instanceof Error ? error.message : "D1 rate limit unavailable" }));
      }
    }
  }
  return consumeMemoryRateLimit(request, limit, now);
}

function response(body: unknown, requestIdValue: string, status = 200, rate?: RateLimitResult, startedAt = Date.now()) {
  const headers = new Headers(baseHeaders);
  headers.set("X-Request-ID", requestIdValue);
  headers.set("X-Response-Time-Ms", String(Date.now() - startedAt));
  if (rate) {
    headers.set("X-RateLimit-Limit", String(rate.limit));
    headers.set("X-RateLimit-Remaining", String(rate.remaining));
    headers.set("X-RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000)));
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function rpcError(id: string | number | null, code: number, message: string, requestIdValue: string, rate: RateLimitResult, startedAt: number, data?: unknown, status = 400) {
  return response({ jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } }, requestIdValue, status, rate, startedAt);
}

function unauthorized(requestIdValue: string, rate: ReturnType<typeof consumeRateLimit>, startedAt: number) {
  const result = rpcError(null, -32001, "需要有效的 Bearer token", requestIdValue, rate, startedAt, { auth: "bearer" }, 401);
  result.headers.set("WWW-Authenticate", "Bearer");
  return result;
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
  const config = getMcpRuntimeConfig();
  const rate = await consumeRateLimit(request, config.rateLimitPerMinute);
  if (!rate.allowed) return rpcError(null, -32029, "请求过于频繁，请稍后重试", id, rate, startedAt, { retryAfterSeconds: Math.ceil((rate.resetAt - Date.now()) / 1000) }, 429);
  if (!hasValidMcpAuthorization(request, config)) {
    logRequest(id, "GET", startedAt, "unauthorized");
    return unauthorized(id, rate, startedAt);
  }
  logRequest(id, "GET", startedAt, "ok");
  return response({ name: "archlens", version: MCP_SERVER_VERSION, schemaVersion: MCP_SCHEMA_VERSION, protocol: MCP_PROTOCOL_VERSION, transport: "streamable-http", auth: config.authEnabled ? "bearer" : "none", rateLimitPerMinute: config.rateLimitPerMinute, dataset: getDatasetManifest(), tools: mcpToolDefinitions.map((tool) => tool.name), resources: mcpResourceDefinitions.map((resource) => resource.uri), resourceTemplates: mcpResourceTemplateDefinitions.map((resource) => resource.uriTemplate), prompts: mcpPromptDefinitions.map((prompt) => prompt.name), endpoint: "/api/mcp" }, id, 200, rate, startedAt);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const id = requestId(request);
  const config = getMcpRuntimeConfig();
  const rate = await consumeRateLimit(request, config.rateLimitPerMinute);
  let method = "parse";
  if (!rate.allowed) return rpcError(null, -32029, "请求过于频繁，请稍后重试", id, rate, startedAt, { retryAfterSeconds: Math.ceil((rate.resetAt - Date.now()) / 1000) }, 429);
  if (!hasValidMcpAuthorization(request, config)) {
    logRequest(id, method, startedAt, "unauthorized");
    return unauthorized(id, rate, startedAt);
  }
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
      return response({ jsonrpc: "2.0", id: messageId, result: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: "archlens", version: MCP_SERVER_VERSION, schemaVersion: MCP_SCHEMA_VERSION, dataset: getDatasetManifest() } } }, id, 200, rate, startedAt);
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
      return response({ jsonrpc: "2.0", id: messageId, result: { resources: mcpResourceDefinitions } }, id, 200, rate, startedAt);
    }
    if (method === "resources/templates/list") {
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { resourceTemplates: mcpResourceTemplateDefinitions } }, id, 200, rate, startedAt);
    }
    if (method === "resources/read") {
      const uri = typeof message.params?.uri === "string" ? message.params.uri : "";
      if (!uri) {
        logRequest(id, method, startedAt, "invalid_params");
        return rpcError(messageId, -32602, "resources/read 需要非空 uri", id, rate, startedAt, { field: "uri" });
      }
      const resource = readMcpResource(uri);
      if (!resource) {
        logRequest(id, method, startedAt, "resource_not_found");
        return rpcError(messageId, -32002, "Resource not found", id, rate, startedAt, { uri }, 404);
      }
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { contents: [resource] } }, id, 200, rate, startedAt);
    }
    if (method === "prompts/list") {
      logRequest(id, method, startedAt, "ok");
      return response({ jsonrpc: "2.0", id: messageId, result: { prompts: mcpPromptDefinitions } }, id, 200, rate, startedAt);
    }
    if (method === "prompts/get") {
      const name = typeof message.params?.name === "string" ? message.params.name : "";
      if (!name) {
        logRequest(id, method, startedAt, "invalid_params");
        return rpcError(messageId, -32602, "prompts/get 需要非空 name", id, rate, startedAt, { field: "name" });
      }
      try {
        const prompt = getMcpPrompt(name, message.params?.arguments ?? {});
        if (!prompt) {
          logRequest(id, method, startedAt, "invalid_params");
          return rpcError(messageId, -32602, "Unknown prompt", id, rate, startedAt, { name });
        }
        logRequest(id, method, startedAt, "ok");
        return response({ jsonrpc: "2.0", id: messageId, result: prompt }, id, 200, rate, startedAt);
      } catch (error) {
        const promptError = error instanceof McpToolError ? error : new McpToolError("INVALID_PARAMS", error instanceof Error ? error.message : "prompt 参数无效");
        logRequest(id, method, startedAt, promptError.code);
        return rpcError(messageId, -32602, promptError.message, id, rate, startedAt, promptError.details);
      }
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
