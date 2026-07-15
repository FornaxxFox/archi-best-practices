import assert from "node:assert/strict";
import test from "node:test";
import { reportByteLength, validateSourceIntakeReport } from "../lib/source-intake-contract.ts";

function report(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-15T00:00:00.000Z",
    case: { id: "fixture-case", title: "Fixture Case" },
    policy: { onlyHttps: true, downloadedImages: false, maxBytes: 1000, timeoutMs: 1000, delayMs: 0, interpretation: "none" },
    summary: { sourceCount: 1, reachableCount: 1, failedCount: 0 },
    sources: [{ label: "公开来源", url: "https://example.org/case", ok: true, status: 200, contentType: "text/html", finalUrl: "https://example.org/case", bytesRead: 32, truncated: false, title: "Fixture", description: "", canonicalUrl: "", excerpt: "证据", error: null, durationMs: 12 }],
    ...overrides,
  };
}

test("source intake contract accepts a complete report and keeps bounded JSON measurable", () => {
  const value = validateSourceIntakeReport(report(), "fixture-case");
  assert.equal(value.summary.reachableCount, 1);
  assert.ok(reportByteLength(value) > 0);
});

test("source intake contract rejects mismatched counts and insecure URLs", () => {
  assert.throws(() => validateSourceIntakeReport(report({ summary: { sourceCount: 1, reachableCount: 0, failedCount: 0 } })), /数量不一致/);
  assert.throws(() => validateSourceIntakeReport(report({ sources: [{ ...report().sources[0], url: "http://example.org/case" }] })), /HTTPS/);
});

test("source intake contract preserves failed evidence as a reviewable report", () => {
  const value = validateSourceIntakeReport(report({ summary: { sourceCount: 1, reachableCount: 0, failedCount: 1 }, sources: [{ ...report().sources[0], ok: false, status: null, finalUrl: null, error: "network unavailable" }] }));
  assert.equal(value.summary.failedCount, 1);
  assert.equal(value.sources[0].error, "network unavailable");
});
