import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stableValue(entry)]));
  return value;
}

function contentHash(item) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(item))).digest("hex");
}

export function buildDatasetSnapshot(items, { version, kind, sourceOfTruth = "lib/data.ts" }) {
  const cases = items.map((item) => ({
    id: item.id,
    title: item.title,
    projectType: item.projectType,
    region: item.region,
    sourceCount: item.sources.length,
    sourceUrls: item.sources.map((source) => source.url),
    imageLicense: item.imageCredit.license,
    contentHash: contentHash(item),
  })).sort((left, right) => left.id.localeCompare(right.id));
  return { schemaVersion: "1.0.0", name: "archlens-case-library", version, kind, sourceOfTruth, caseCount: cases.length, cases };
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function versionParts(version) {
  const match = /^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  if (!leftParts || !rightParts) return left.localeCompare(right);
  for (let index = 0; index < leftParts.length; index += 1) if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  return 0;
}

export function compareDatasetSnapshots(current, baseline) {
  const currentCases = indexById(current.cases);
  const baselineCases = indexById(baseline.cases);
  const added = current.cases.filter((item) => !baselineCases.has(item.id)).map((item) => item.id);
  const removed = baseline.cases.filter((item) => !currentCases.has(item.id)).map((item) => item.id);
  const changed = current.cases.filter((item) => baselineCases.has(item.id) && item.contentHash !== baselineCases.get(item.id).contentHash).map((item) => item.id);
  const hasContentChange = added.length > 0 || removed.length > 0 || changed.length > 0;
  const errors = [];
  if (hasContentChange && current.version === baseline.version) errors.push(`案例内容发生变化，但数据集版本仍为 ${current.version}`);
  if (compareVersions(current.version, baseline.version) < 0) errors.push(`数据集版本 ${current.version} 低于基线版本 ${baseline.version}`);
  return { status: errors.length ? "failed" : "ok", errors, added, removed, changed, hasContentChange, currentVersion: current.version, baselineVersion: baseline.version };
}

async function loadCurrentDataset() {
  const [{ cases, validateCaseLibrary }, { DATASET_VERSION, DATASET_KIND }] = await Promise.all([import("../lib/data.ts"), import("../lib/dataset-meta.ts")]);
  validateCaseLibrary(cases);
  return buildDatasetSnapshot(cases, { version: DATASET_VERSION, kind: DATASET_KIND });
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--baseline" || value === "--write") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${value} 需要一个路径`);
      args[value.slice(2)] = next;
      index += 1;
    } else if (value === "--help" || value === "-h") args.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  return args;
}

export async function runDatasetAudit({ baselinePath, writePath } = {}) {
  const current = await loadCurrentDataset();
  if (writePath) {
    await fs.mkdir(path.dirname(writePath), { recursive: true });
    await fs.writeFile(writePath, `${JSON.stringify(current, null, 2)}\n`);
  }
  const comparison = baselinePath ? compareDatasetSnapshots(current, JSON.parse(await fs.readFile(baselinePath, "utf8"))) : { status: "ok", errors: [], added: [], removed: [], changed: [], hasContentChange: false, currentVersion: current.version, baselineVersion: null };
  return { current, comparison, outputPath: writePath ?? null };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("用法：node --experimental-strip-types scripts/dataset-audit.mjs [--baseline <manifest.json>] [--write <manifest.json>]");
    return;
  }
  const result = await runDatasetAudit({ baselinePath: args.baseline ? path.resolve(args.baseline) : undefined, writePath: args.write ? path.resolve(args.write) : undefined });
  console.log(JSON.stringify({ ...result.comparison, caseCount: result.current.caseCount, outputPath: result.outputPath }, null, 2));
  if (result.comparison.status !== "ok") {
    for (const error of result.comparison.errors) console.error(`数据集审核失败：${error}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
