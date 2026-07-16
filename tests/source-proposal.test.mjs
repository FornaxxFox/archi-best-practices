import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runSourceProposal } from "../scripts/source-proposal.mjs";

function report(id, failedCount = 0) {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-15T00:00:00.000Z",
    case: { id, title: id },
    policy: { onlyHttps: true, downloadedImages: false, maxBytes: 1000, timeoutMs: 1000, delayMs: 0, interpretation: "none" },
    summary: { sourceCount: 1, reachableCount: failedCount ? 0 : 1, failedCount },
    sources: [{ label: "官方来源", url: "https://example.com/source", ok: !failedCount, status: failedCount ? 500 : 200, contentType: "text/html", finalUrl: "https://example.com/source", bytesRead: 100, truncated: false, title: "Source", description: "", canonicalUrl: "", excerpt: "", error: failedCount ? "HTTP 500" : null, durationMs: 1 }],
  };
}

test("source proposal creates a manual-review candidate without mutation", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-proposal-"));
  await fs.mkdir(path.join(dir, "case-a"));
  await fs.writeFile(path.join(dir, "case-a", "source-report.json"), JSON.stringify(report("case-a")));
  const result = await runSourceProposal({ input: dir, now: () => "2026-07-15T01:00:00.000Z" });
  assert.equal(result.status, "ready_for_manual_review");
  assert.equal(result.policy.autoPublish, false);
  assert.equal(result.summary.eligibleCaseCount, 1);
  assert.match(await fs.readFile(path.join(dir, "release-candidate", "dataset-change-proposal.md"), "utf8"), /不会自动修改/);
});

test("source proposal blocks failed evidence and rejects empty input", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-proposal-blocked-"));
  await fs.writeFile(path.join(dir, "source-report.json"), JSON.stringify(report("case-a", 1)));
  const result = await runSourceProposal({ input: dir });
  assert.equal(result.status, "blocked");
  assert.equal(result.summary.blockedCaseCount, 1);
  const empty = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-proposal-empty-"));
  await assert.rejects(() => runSourceProposal({ input: empty }), /拒绝生成空发布候选/);
});
