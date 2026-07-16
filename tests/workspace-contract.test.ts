import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceSnapshot, parseWorkspaceSnapshot, validateWorkspaceSnapshot } from "../lib/workspace.ts";

test("workspace snapshot keeps dataset provenance and user state", () => {
  const snapshot = buildWorkspaceSnapshot(["heydar-aliyev-centre"], { "heydar-aliyev-centre": 5 }, { template: "principles", prompt: "提取设计思路", createdAt: "2026-07-15T10:00:00.000Z" });
  assert.equal(snapshot.schemaVersion, "1.0.0");
  assert.equal(snapshot.datasetVersion, "2026-07-15.2");
  assert.equal(parseWorkspaceSnapshot(JSON.stringify(snapshot)).ratings["heydar-aliyev-centre"], 5);
});

test("workspace snapshot rejects duplicate cases and invalid ratings", () => {
  assert.throws(() => validateWorkspaceSnapshot({ schemaVersion: "1.0.0", datasetVersion: "2026-07-15.2", exportedAt: "now", savedCaseIds: ["a", "a"], ratings: { a: 6 }, lastResearch: null }), /不能重复/);
  assert.throws(() => validateWorkspaceSnapshot({ schemaVersion: "1.0.0", datasetVersion: "2026-07-15.2", exportedAt: "now", savedCaseIds: [], ratings: { a: 6 }, lastResearch: null }), /必须是 0-5/);
});

test("workspace snapshot rejects malformed JSON and oversized prompts", () => {
  assert.throws(() => parseWorkspaceSnapshot("not-json"), /有效的 JSON/);
  assert.throws(() => validateWorkspaceSnapshot({ schemaVersion: "1.0.0", datasetVersion: "2026-07-15.2", exportedAt: "now", savedCaseIds: [], ratings: {}, lastResearch: { template: "x", prompt: "x".repeat(4001), createdAt: "now" } }), /不能超过 4000/);
});
