import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
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

test("MCP endpoint returns tool definitions and case data", async () => {
  const response = await render("/api/mcp");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.name, "archlens");
  assert.match(body.endpoint, /\/api\/mcp/);
});

