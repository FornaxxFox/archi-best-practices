import assert from "node:assert/strict";
import test from "node:test";
import { buildDatasetSnapshot, compareDatasetSnapshots } from "../scripts/dataset-audit.mjs";

const makeCase = (id, principle = "principle") => ({ id, title: id, projectType: "公共", region: "亚洲", sources: [{ url: `https://example.org/${id}` }], imageCredit: { license: "CC0" }, principle });

test("dataset snapshot has stable case hashes and sorted IDs", () => {
  const snapshot = buildDatasetSnapshot([makeCase("b"), makeCase("a")], { version: "2026-07-15.1", kind: "curated-seed" });
  assert.deepEqual(snapshot.cases.map((item) => item.id), ["a", "b"]);
  assert.match(snapshot.cases[0].contentHash, /^[a-f0-9]{64}$/);
  assert.equal(buildDatasetSnapshot([makeCase("a")], { version: "2026-07-15.1", kind: "curated-seed" }).cases[0].contentHash, buildDatasetSnapshot([makeCase("a")], { version: "2026-07-15.1", kind: "curated-seed" }).cases[0].contentHash);
});

test("dataset audit requires a new version for content changes", () => {
  const baseline = buildDatasetSnapshot([makeCase("a")], { version: "2026-07-15.1", kind: "curated-seed" });
  const changed = buildDatasetSnapshot([makeCase("a", "changed")], { version: "2026-07-15.1", kind: "curated-seed" });
  const result = compareDatasetSnapshots(changed, baseline);
  assert.equal(result.status, "failed");
  assert.deepEqual(result.changed, ["a"]);
  assert.match(result.errors[0], /版本/);
});

test("dataset audit records added and removed cases after version bump", () => {
  const baseline = buildDatasetSnapshot([makeCase("a"), makeCase("b")], { version: "2026-07-15.1", kind: "curated-seed" });
  const current = buildDatasetSnapshot([makeCase("a"), makeCase("c")], { version: "2026-07-16.1", kind: "curated-seed" });
  const result = compareDatasetSnapshots(current, baseline);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.added, ["c"]);
  assert.deepEqual(result.removed, ["b"]);
});
