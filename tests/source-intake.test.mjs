import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { generateSourceReport, inspectSource, inspectSources, buildSourceNotes } from "../scripts/source-intake.mjs";

const item = { id: "source-fixture", title: "Source Fixture", sources: [{ label: "项目来源", url: "https://example.org/project" }, { label: "事务所来源", url: "https://example.org/studio" }] };

test("source intake extracts page evidence without interpretation", async () => {
  const report = await inspectSources({
    item,
    delayMs: 0,
    now: () => "2026-07-15T00:00:00.000Z",
    fetchImpl: async (url) => new Response(`<html><head><title>${url.includes("project") ? "项目页面" : "事务所页面"}</title><meta name="description" content="公开页面摘要"><link rel="canonical" href="${url}"></head><body><h1>原始标题</h1><script>ignore me</script><p>这是用于核验的公开页面摘录。</p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" }, status: 200 }),
  });
  assert.deepEqual(report.summary, { sourceCount: 2, reachableCount: 2, failedCount: 0 });
  assert.equal(report.policy.interpretation, "none");
  assert.equal(report.sources[0].title, "项目页面");
  assert.match(report.sources[0].excerpt, /公开页面摘录/);
  assert.doesNotMatch(report.sources[0].excerpt, /ignore me/);
  assert.match(buildSourceNotes(report), /不替代原始来源/);
});

test("source intake reports failures and enforces HTTPS", async () => {
  const invalid = await inspectSource({ label: "不安全来源", url: "http://example.org/project" }, { fetchImpl: async () => { throw new Error("should not fetch"); } });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /HTTPS/);

  const failed = await inspectSource({ label: "失效来源", url: "https://example.org/missing" }, { fetchImpl: async () => { throw new Error("network unavailable"); } });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /network unavailable/);

  const insecureRedirect = await inspectSource({ label: "非安全重定向", url: "https://example.org/redirect" }, {
    fetchImpl: async () => {
      const response = new Response("<html><title>redirect</title></html>", { headers: { "content-type": "text/html" }, status: 200 });
      Object.defineProperty(response, "url", { value: "http://example.org/redirect" });
      return response;
    },
  });
  assert.equal(insecureRedirect.ok, false);
  assert.match(insecureRedirect.error, /非 HTTPS/);
});

test("source intake marks oversized pages as review-required", async () => {
  const response = await inspectSource({ label: "大页面", url: "https://example.org/large" }, { maxBytes: 12, fetchImpl: async () => new Response("<html><title>too large</title></html>", { headers: { "content-type": "text/html" }, status: 200 }) });
  assert.equal(response.ok, false);
  assert.equal(response.truncated, true);
  assert.match(response.error, /字节上限/);
});

test("source intake CLI workflow writes JSON and Markdown evidence", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-intake-"));
  const input = path.join(tempDir, "case.json");
  const out = path.join(tempDir, "sources");
  await fs.writeFile(input, JSON.stringify({
    id: "source-fixture",
    title: "Source Fixture",
    architect: "Studio",
    location: "City",
    year: "2026",
    typology: "公共空间",
    projectType: "公共",
    image: "https://example.org/image.jpg",
    imageCredit: { label: "Example / CC0", url: "https://example.org/license", license: "CC0" },
    principle: "编辑性归纳",
    strategy: "空间策略",
    elements: ["路径"],
    palette: [{ name: "灰", hex: "#888888" }],
    sources: [{ label: "公开来源", url: "https://example.org/project" }],
    risks: ["待核验"],
    tags: ["公共性"],
  }));
  const report = await generateSourceReport({ input, out, delayMs: 0, fetchImpl: async () => new Response("<html><title>Fixture</title><p>evidence</p></html>", { headers: { "content-type": "text/html" }, status: 200 }) });
  assert.equal(report.summary.reachableCount, 1);
  assert.match(await fs.readFile(path.join(out, "source-report.json"), "utf8"), /"reachableCount": 1/);
  assert.match(await fs.readFile(path.join(out, "source-notes.md"), "utf8"), /Fixture/);
});
