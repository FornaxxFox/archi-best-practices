import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runSourcePipeline } from "../scripts/source-pipeline.mjs";

function caseJson(id) {
  return {
    id,
    title: id,
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
    sources: [{ label: "公开来源", url: `https://example.org/${id}` }],
    risks: ["待核验"],
    tags: ["公共性"],
  };
}

test("source pipeline processes a directory and writes one report per case", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-pipeline-"));
  await fs.mkdir(path.join(tempDir, "cases"));
  await fs.writeFile(path.join(tempDir, "cases", "a.json"), JSON.stringify(caseJson("case-a")));
  await fs.writeFile(path.join(tempDir, "cases", "b.json"), JSON.stringify(caseJson("case-b")));
  const out = path.join(tempDir, "reports");
  const result = await runSourcePipeline({
    input: path.join(tempDir, "cases"),
    out,
    delayMs: 0,
    now: () => "2026-07-15T00:00:00.000Z",
    fetchImpl: async () => new Response("<html><title>Fixture</title><p>evidence</p></html>", { headers: { "content-type": "text/html" }, status: 200 }),
  });
  assert.deepEqual(result.summary, { caseCount: 2, completedCaseCount: 2, invalidCaseCount: 0, sourceCount: 2, reachableCount: 2, failedSourceCount: 0, status: "ok" });
  assert.match(await fs.readFile(path.join(out, "pipeline-report.json"), "utf8"), /"completedCaseCount": 2/);
  assert.match(await fs.readFile(path.join(out, "case-a", "source-notes.md"), "utf8"), /Fixture/);
  assert.match(await fs.readFile(path.join(out, "case-b", "source-report.json"), "utf8"), /"reachableCount": 1/);
});

test("source pipeline keeps invalid cases in the summary and fails the gate", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-pipeline-invalid-"));
  await fs.writeFile(path.join(tempDir, "invalid.json"), JSON.stringify({ id: "invalid" }));
  const result = await runSourcePipeline({ input: tempDir, out: path.join(tempDir, "reports"), delayMs: 0, fetchImpl: async () => { throw new Error("should not fetch"); } });
  assert.equal(result.summary.status, "failed");
  assert.equal(result.summary.invalidCaseCount, 1);
  assert.match(result.errors[0].message, /案例数据校验失败/);
});

test("source pipeline can be rerun when its default output is inside the input directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-pipeline-rerun-"));
  await fs.writeFile(path.join(tempDir, "case.json"), JSON.stringify(caseJson("case-rerun")));
  const options = { input: tempDir, delayMs: 0, now: () => "2026-07-15T00:00:00.000Z", fetchImpl: async () => new Response("<html><title>Fixture</title></html>", { headers: { "content-type": "text/html" }, status: 200 }) };
  const first = await runSourcePipeline(options);
  const second = await runSourcePipeline(options);
  assert.equal(first.summary.status, "ok");
  assert.equal(second.summary.status, "ok");
  assert.equal(second.summary.caseCount, 1);
});
