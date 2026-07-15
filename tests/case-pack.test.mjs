import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/case-pack.mjs", ...args], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => resolve({ code, stdout, stderr }));
});

test("case pack CLI validates a case and emits the reusable three-file pack", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "archlens-case-pack-"));
  try {
    const input = path.join(tempDir, "case.json");
    const output = path.join(tempDir, "pack");
    await writeFile(input, JSON.stringify({
      id: "test-case",
      title: "Test Case",
      architect: "Test Studio",
      location: "Test City",
      year: "2026",
      typology: "公共空间",
      region: "亚洲",
      scale: "城市尺度",
      projectType: "公共",
      image: "https://example.org/image.jpg",
      imageCredit: { label: "Example / CC BY 4.0", url: "https://example.org/license", license: "CC BY 4.0" },
      short: "A traceable test case.",
      principle: "A test principle.",
      strategy: "A test strategy.",
      elements: ["edge"],
      palette: [{ name: "gray", hex: "#6b7280" }],
      sources: [{ label: "Example source", url: "https://example.org/project" }],
      risks: ["Needs review."],
      tags: ["test"],
      researchQuestions: ["What should be checked?"]
    }));
    const result = await run(["--input", input, "--out", output]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /test-case/);
    assert.match(await readFile(path.join(output, "research-pack.md"), "utf8"), /原始来源/);
    assert.match(await readFile(path.join(output, "README.md"), "utf8"), /ArchLens Research Pack/);
    assert.equal(JSON.parse(await readFile(path.join(output, "case.json"), "utf8")).id, "test-case");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("case pack CLI rejects missing source provenance", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "archlens-case-pack-invalid-"));
  try {
    const input = path.join(tempDir, "case.json");
    await writeFile(input, JSON.stringify({ id: "invalid-case" }));
    const result = await run(["--input", input]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /案例数据校验失败/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("case pack CLI carries a reviewed source intake report into the research pack", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "archlens-case-pack-source-report-"));
  try {
    const input = path.join(tempDir, "case.json");
    const report = path.join(tempDir, "source-report.json");
    const output = path.join(tempDir, "pack");
    await writeFile(input, JSON.stringify({
      id: "reported-case",
      title: "Reported Case",
      architect: "Test Studio",
      location: "Test City",
      year: "2026",
      typology: "公共空间",
      region: "亚洲",
      scale: "城市尺度",
      projectType: "公共",
      image: "https://example.org/image.jpg",
      imageCredit: { label: "Example / CC0", url: "https://example.org/license", license: "CC0" },
      short: "A traceable test case.",
      principle: "A test principle.",
      strategy: "A test strategy.",
      elements: ["edge"],
      palette: [{ name: "gray", hex: "#6b7280" }],
      sources: [{ label: "Example source", url: "https://example.org/project" }],
      risks: ["Needs review."],
      tags: ["test"],
    }));
    await writeFile(report, JSON.stringify({ schemaVersion: "1.0.0", generatedAt: "2026-07-15T00:00:00.000Z", case: { id: "reported-case", title: "Reported Case" }, policy: { maxBytes: 1000, timeoutMs: 1000 }, summary: { sourceCount: 1, reachableCount: 1, failedCount: 0 }, sources: [{ label: "Example source", url: "https://example.org/project", ok: true, title: "Example" }] }));
    const result = await run(["--input", input, "--out", output, "--source-report", report]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(await readFile(path.join(output, "research-pack.md"), "utf8"), /来源 intake 证据/);
    assert.match(await readFile(path.join(output, "README.md"), "utf8"), /source-report\.json/);
    assert.equal(JSON.parse(await readFile(path.join(output, "source-report.json"), "utf8")).case.id, "reported-case");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
