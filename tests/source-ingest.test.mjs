import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ingestReports } from "../scripts/source-ingest.mjs";

function report(id) {
  return { schemaVersion: "1.0.0", generatedAt: "2026-07-15T00:00:00.000Z", case: { id, title: id }, policy: { onlyHttps: true, downloadedImages: false, maxBytes: 1000, timeoutMs: 1000, delayMs: 0, interpretation: "none" }, summary: { sourceCount: 0, reachableCount: 0, failedCount: 0 }, sources: [] };
}

test("source ingest posts reports sequentially without exposing the token", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-ingest-"));
  await fs.mkdir(path.join(tempDir, "case-a"));
  await fs.mkdir(path.join(tempDir, "case-b"));
  await fs.writeFile(path.join(tempDir, "case-a", "source-report.json"), JSON.stringify(report("case-a")));
  await fs.writeFile(path.join(tempDir, "case-b", "source-report.json"), JSON.stringify(report("case-b")));
  const calls = [];
  const result = await ingestReports({ input: tempDir, endpoint: "https://example.org/api/source-intake", token: "secret-token", delayMs: 0, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return Response.json({ record: { id: `record-${calls.length}` } }, { status: 201 });
  } });
  assert.deepEqual(result.summary, { reportCount: 2, succeededCount: 2, failedCount: 0, status: "ok" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers.authorization, "Bearer secret-token");
  assert.deepEqual(JSON.parse(calls[1].init.body).report.case, { id: "case-b", title: "case-b" });
});

test("source ingest keeps per-report failures and rejects insecure endpoints", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-ingest-failure-"));
  const input = path.join(tempDir, "source-report.json");
  await fs.writeFile(input, JSON.stringify(report("case-a")));
  const result = await ingestReports({ input, endpoint: "https://example.org/api/source-intake", delayMs: 0, fetchImpl: async () => Response.json({ error: "write disabled" }, { status: 404 }) });
  assert.equal(result.summary.status, "failed");
  assert.match(result.results[0].error, /write disabled/);
  await assert.rejects(() => ingestReports({ input, endpoint: "http://example.org/api/source-intake", delayMs: 0 }), /HTTPS/);
});

test("source ingest rejects an empty input directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-source-ingest-empty-"));
  await assert.rejects(() => ingestReports({ input: tempDir, endpoint: "https://example.org/api/source-intake", delayMs: 0 }), /空 ingest/);
});
