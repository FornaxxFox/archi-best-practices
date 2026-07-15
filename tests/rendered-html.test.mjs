import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

async function renderWithWorker(worker, path = "/", init = {}) {
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" }, ...init }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function render(path = "/", init = {}) {
  return renderWithWorker(await loadWorker(), path, init);
}

test("server-renders the ArchLens research entry", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /ArchLens/);
  assert.match(html, /让每个案例/);
  assert.match(html, /提取设计思路/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("server-renders the MCP page", async () => {
  const response = await render("/mcp");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /MODEL CONTEXT PROTOCOL/);
  assert.match(html, /真实调用/);
  assert.match(html, /search_cases/);
});

test("server-renders portable workspace controls", async () => {
  const response = await render("/boards");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PORTABLE WORKSPACE/);
  assert.match(html, /导出工作区 JSON/);
  assert.match(html, /导入工作区 JSON/);
  assert.match(html, /case-submission\.yml/);
  assert.match(html, /提交完整案例资料/);
});

test("server-renders the project narrative page", async () => {
  const response = await render("/project");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /ABOUT THE PROJECT/);
  assert.match(html, /代码应该让理念可执行/);
  assert.match(html, /MILESTONES/);
  assert.match(html, /生产级知识基础设施/);
});

test("MCP endpoint returns tool definitions and case data", async () => {
  const response = await render("/api/mcp");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.name, "archlens");
  assert.equal(body.version, "0.2.0");
  assert.equal(body.schemaVersion, "1.0.0");
  assert.equal(body.auth, "none");
  assert.equal(body.rateLimitPerMinute, 60);
  assert.equal(body.dataset.caseCount, 18);
  assert.equal(body.dataset.version, "2026-07-15.2");
  assert.match(body.endpoint, /\/api\/mcp/);
  assert.match(response.headers.get("x-request-id") ?? "", /.+/);
  assert.equal(response.headers.get("mcp-schema-version"), "1.0.0");
});

test("health endpoint exposes dataset and protocol readiness", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.dataset.caseCount, 18);
  assert.equal(body.dataset.kind, "curated-seed");
  assert.equal(body.checks.caseLibrary, "ok");
  assert.equal(body.mcp.auth, "none");
  assert.equal(body.mcp.rateLimitStorage, "memory");
  assert.equal(body.sourceIntake.auth, "none");
  assert.equal(body.sourceIntake.writeEnabled, false);
  assert.equal(body.workspace.storage, "disabled");
  assert.equal(body.workspace.memberPermissions, "disabled");
  assert.equal(body.workspace.inviteLinks, false);
  assert.equal(body.workspace.writeEnabled, false);
  assert.equal(body.workspace.rateLimitPerMinute, 120);
});

test("shared workspace route stays closed by default", async () => {
  const response = await render("/api/workspaces");
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /未启用/);
});

test("shared workspace member management stays closed by default", async () => {
  const response = await render("/api/workspaces/members?space_id=studio-research");
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /未启用/);
});

test("shared workspace route requires its own token and never opens anonymous writes", async () => {
  const previousToken = process.env.ARCHLENS_WORKSPACE_TOKEN;
  const previousWrite = process.env.ARCHLENS_WORKSPACE_WRITE_ENABLED;
  try {
    process.env.ARCHLENS_WORKSPACE_TOKEN = "workspace-token";
    delete process.env.ARCHLENS_WORKSPACE_WRITE_ENABLED;
    assert.equal((await render("/api/workspaces")).status, 401);
    assert.equal((await render("/api/workspaces", { headers: { authorization: "Bearer workspace-token" } })).status, 503);
    delete process.env.ARCHLENS_WORKSPACE_TOKEN;
    process.env.ARCHLENS_WORKSPACE_WRITE_ENABLED = "true";
    const response = await render("/api/workspaces", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /需要配置/);
  } finally {
    if (previousToken === undefined) delete process.env.ARCHLENS_WORKSPACE_TOKEN;
    else process.env.ARCHLENS_WORKSPACE_TOKEN = previousToken;
    if (previousWrite === undefined) delete process.env.ARCHLENS_WORKSPACE_WRITE_ENABLED;
    else process.env.ARCHLENS_WORKSPACE_WRITE_ENABLED = previousWrite;
  }
});

test("source intake route fails closed when D1 is not bound", async () => {
  const response = await render("/api/source-intake");
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /D1|数据表/);
});

test("MCP bearer auth is opt-in and preserves the public demo by default", async () => {
  const previousToken = process.env.ARCHLENS_MCP_TOKEN;
  try {
    process.env.ARCHLENS_MCP_TOKEN = "test-token";
    const unauthorizedResponse = await render("/api/mcp");
    assert.equal(unauthorizedResponse.status, 401);
    assert.match(unauthorizedResponse.headers.get("www-authenticate") ?? "", /Bearer/);

    const authorizedResponse = await render("/api/mcp", { headers: { authorization: "Bearer test-token" } });
    assert.equal(authorizedResponse.status, 200);
    assert.equal((await authorizedResponse.json()).auth, "bearer");
  } finally {
    if (previousToken === undefined) delete process.env.ARCHLENS_MCP_TOKEN;
    else process.env.ARCHLENS_MCP_TOKEN = previousToken;
  }
});

test("MCP rate limit can be configured without changing the handler", async () => {
  const previousLimit = process.env.ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE;
  const clientIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  try {
    delete process.env.ARCHLENS_MCP_TOKEN;
    process.env.ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE = "2";
    const headers = { "x-forwarded-for": clientIp };
    const worker = await loadWorker();
    assert.equal((await renderWithWorker(worker, "/api/mcp", { headers })).status, 200);
    assert.equal((await renderWithWorker(worker, "/api/mcp", { headers })).status, 200);
    assert.equal((await renderWithWorker(worker, "/api/mcp", { headers })).status, 429);
  } finally {
    if (previousLimit === undefined) delete process.env.ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE;
    else process.env.ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE = previousLimit;
  }
});

test("MCP case tools expose the same research-pack fields", async () => {
  const call = (name, args) => render("/api/mcp", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  const searchResponse = await call("search_cases", {});
  const searchBody = await searchResponse.json();
  const results = searchBody.result.structuredContent;
  assert.equal(results.length, 18);

  const landscapeResponse = await call("search_cases", { projectType: "景观", region: "北美" });
  const landscapeBody = await landscapeResponse.json();
  assert.deepEqual(landscapeBody.result.structuredContent.map((item) => item.id), ["high-line"]);

  const planningResponse = await call("search_cases", { projectType: "规划" });
  const planningBody = await planningResponse.json();
  assert.deepEqual(planningBody.result.structuredContent.map((item) => item.id), ["hammarby-sjostad", "vauban-freiburg"]);

  const semanticSearchResponse = await call("search_cases", { query: "公共性" });
  const semanticSearchBody = await semanticSearchResponse.json();
  assert.ok(semanticSearchBody.result.structuredContent.length > 0);

  for (const result of results) {
    const caseResponse = await call("get_case", { case_id: result.id });
    const caseBody = await caseResponse.json();
    const item = caseBody.result.structuredContent;
    assert.ok(item.imageCredit.license);
    assert.ok(item.sources.length > 0);
    assert.ok(item.researchQuestions.length > 0);
    assert.ok(item.elements.length > 0);
    assert.ok(item.palette.every((color) => /^#[0-9a-f]{6}$/i.test(color.hex)));
    assert.ok(item.risks.length > 0);

    const packResponse = await call("build_research_pack", { case_id: result.id });
    const packBody = await packResponse.json();
    const pack = packBody.result.structuredContent;
    assert.match(pack.markdown, /研究问题/);
    assert.match(pack.markdown, /图像署名与许可/);
    assert.match(pack.readme, /ArchLens Research Pack/);
    assert.deepEqual(pack.json.imageCredit, item.imageCredit);
    assert.deepEqual(pack.json.sources, item.sources);
  }
});

test("MCP returns stable JSON-RPC errors and tool errors", async () => {
  const post = (body) => render("/api/mcp", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body,
  });

  const invalidJson = await post("{");
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, -32700);

  const invalidRequest = await post(JSON.stringify({ jsonrpc: "2.0", id: 3 }));
  assert.equal(invalidRequest.status, 400);
  assert.equal((await invalidRequest.json()).error.code, -32600);

  const unknownMethod = await post(JSON.stringify({ jsonrpc: "2.0", id: 4, method: "unknown/method" }));
  assert.equal(unknownMethod.status, 404);
  assert.equal((await unknownMethod.json()).error.code, -32601);

  const invalidToolArgs = await post(JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_case", arguments: {} } }));
  const invalidToolBody = await invalidToolArgs.json();
  assert.equal(invalidToolArgs.status, 200);
  assert.equal(invalidToolBody.result.isError, true);
  assert.equal(invalidToolBody.result.structuredContent.error.code, "INVALID_PARAMS");
  assert.match(invalidToolArgs.headers.get("x-response-time-ms") ?? "", /^\d+$/);
});
