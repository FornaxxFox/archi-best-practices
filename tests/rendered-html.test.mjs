import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" }, ...init }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
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
  assert.match(body.endpoint, /\/api\/mcp/);
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
  assert.equal(results.length, 8);

  for (const result of results) {
    const caseResponse = await call("get_case", { case_id: result.id });
    const caseBody = await caseResponse.json();
    const item = caseBody.result.structuredContent;
    assert.ok(item.imageCredit.license);
    assert.ok(item.sources.length > 0);
    assert.ok(item.researchQuestions.length > 0);

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
