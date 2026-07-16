import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCase } from "./case-pack.mjs";
import { buildSourceNotes, inspectSources } from "./source-intake.mjs";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_DELAY_MS = 250;

function isExcluded(candidate, excludedPath) {
  return candidate === excludedPath || candidate.startsWith(`${excludedPath}${path.sep}`);
}

async function collectJsonFiles(input, excludedPath) {
  if (isExcluded(input, excludedPath)) return [];
  const stat = await fs.stat(input);
  if (stat.isFile()) return [input];
  const entries = await fs.readdir(input, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(input, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(entryPath, excludedPath));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(entryPath);
  }
  return files;
}

function sourceFailureCount(report) {
  return report.summary.failedCount;
}

export async function runSourcePipeline({ input, out, timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_BYTES, delayMs = DEFAULT_DELAY_MS, fetchImpl, now = () => new Date().toISOString() }) {
  const inputPath = path.resolve(input);
  const outputDir = path.resolve(out ?? path.join(inputPath, "source-intake"));
  const files = await collectJsonFiles(inputPath, outputDir);
  const reports = [];
  const errors = [];
  const seenIds = new Set();
  let sourceCount = 0;
  let reachableCount = 0;
  let failedSourceCount = 0;

  for (const file of files) {
    try {
      const item = validateCase(JSON.parse(await fs.readFile(file, "utf8")));
      if (seenIds.has(item.id)) throw new Error(`案例 ID 重复：${item.id}`);
      seenIds.add(item.id);
      const report = await inspectSources({ item, fetchImpl, timeoutMs, maxBytes, delayMs, now });
      const caseOutputDir = path.join(outputDir, item.id);
      await fs.mkdir(caseOutputDir, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(caseOutputDir, "source-report.json"), `${JSON.stringify(report, null, 2)}\n`),
        fs.writeFile(path.join(caseOutputDir, "source-notes.md"), buildSourceNotes(report)),
      ]);
      const failedCount = sourceFailureCount(report);
      sourceCount += report.summary.sourceCount;
      reachableCount += report.summary.reachableCount;
      failedSourceCount += failedCount;
      reports.push({ id: item.id, title: item.title, input: file, outputDir: caseOutputDir, summary: report.summary });
    } catch (error) {
      errors.push({ input: file, message: error instanceof Error ? error.message : "案例处理失败" });
    }
  }

  const summary = { caseCount: files.length, completedCaseCount: reports.length, invalidCaseCount: errors.length, sourceCount, reachableCount, failedSourceCount, status: errors.length || failedSourceCount ? "failed" : "ok" };
  await fs.mkdir(outputDir, { recursive: true });
  const pipelineReport = { schemaVersion: "1.0.0", generatedAt: now(), input: inputPath, outputDir, policy: { sequential: true, timeoutMs, maxBytes, delayMs, downloadedImages: false, interpretation: "none" }, summary, reports, errors };
  await fs.writeFile(path.join(outputDir, "pipeline-report.json"), `${JSON.stringify(pipelineReport, null, 2)}\n`);
  return { ...pipelineReport, pipelineReportPath: path.join(outputDir, "pipeline-report.json") };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (["--input", "--out", "--timeout", "--max-bytes", "--delay"].includes(value)) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${value} 需要一个值`);
      args[value.slice(2).replaceAll("-", "_")] = next;
      index += 1;
    } else if (value === "--help" || value === "-h") args.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  return args;
}

function integer(value, fallback, allowZero = false) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && (allowZero ? parsed >= 0 : parsed > 0) ? parsed : fallback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log("用法：npm run source:pipeline -- --input <案例目录或 case.json> [--out <目录>] [--timeout <ms>] [--max-bytes <n>] [--delay <ms>]");
    if (!args.input && !args.help) process.exitCode = 1;
    return;
  }
  const result = await runSourcePipeline({ input: args.input, out: args.out, timeoutMs: integer(args.timeout, DEFAULT_TIMEOUT_MS), maxBytes: integer(args.max_bytes, DEFAULT_MAX_BYTES), delayMs: integer(args.delay, DEFAULT_DELAY_MS, true) });
  console.log(JSON.stringify({ pipelineReportPath: result.pipelineReportPath, summary: result.summary }, null, 2));
  if (result.summary.status !== "ok") process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
