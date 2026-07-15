import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DELAY_MS = 100;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (["--input", "--endpoint", "--token", "--delay"].includes(value)) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${value} 需要一个值`);
      args[value.slice(2).replaceAll("-", "_")] = next;
      index += 1;
    } else if (value === "--help" || value === "-h") args.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  return args;
}

function integer(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function endpoint(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("ingest endpoint 必须使用 HTTPS");
  return parsed.href.replace(/\/$/, "");
}

async function collectReports(input) {
  const inputPath = path.resolve(input);
  const stat = await fs.stat(inputPath);
  if (stat.isFile()) return inputPath.endsWith("source-report.json") ? [inputPath] : [];
  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const candidate = path.join(inputPath, entry.name);
    if (entry.isDirectory()) files.push(...await collectReports(candidate));
    else if (entry.isFile() && entry.name === "source-report.json") files.push(candidate);
  }
  return files;
}

function validateReportShape(report, input) {
  if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error(`${input} 必须是 JSON 对象`);
  if (report.schemaVersion !== "1.0.0") throw new Error(`${input} schemaVersion 不受支持`);
  if (!report.case?.id || !report.case?.title) throw new Error(`${input} 缺少 case.id 或 case.title`);
  if (!Array.isArray(report.sources)) throw new Error(`${input} 缺少 sources 数组`);
  return report;
}

export async function ingestReports({ input, endpoint: targetEndpoint, token = "", delayMs = DEFAULT_DELAY_MS, fetchImpl = fetch }) {
  const reports = await collectReports(input);
  if (!reports.length) throw new Error("没有找到 source-report.json，拒绝空 ingest");
  const endpointUrl = endpoint(targetEndpoint);
  const results = [];
  for (const [index, reportPath] of reports.entries()) {
    if (index > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const report = validateReportShape(JSON.parse(await fs.readFile(reportPath, "utf8")), reportPath);
      const headers = { "content-type": "application/json", accept: "application/json" };
      if (token) headers.authorization = `Bearer ${token}`;
      const response = await fetchImpl(endpointUrl, { method: "POST", headers, body: JSON.stringify({ report }) });
      let body = null;
      try { body = await response.json(); } catch { body = { error: "响应不是 JSON" }; }
      if (!response.ok) throw new Error(`${response.status}: ${body?.error ?? "登记失败"}`);
      results.push({ input: reportPath, caseId: report.case.id, ok: true, record: body?.record ?? null });
    } catch (error) {
      results.push({ input: reportPath, caseId: null, ok: false, error: error instanceof Error ? error.message : "登记失败" });
    }
  }
  return { endpoint: endpointUrl, summary: { reportCount: reports.length, succeededCount: results.filter((item) => item.ok).length, failedCount: results.filter((item) => !item.ok).length, status: results.some((item) => !item.ok) ? "failed" : "ok" }, results };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input || !(args.endpoint || process.env.ARCHLENS_SOURCE_INTAKE_ENDPOINT)) {
    console.log("用法：npm run source:ingest -- --input <source-report.json 或目录> --endpoint <https://.../api/source-intake> [--token <token>] [--delay <ms>]");
    if (!args.input || !(args.endpoint || process.env.ARCHLENS_SOURCE_INTAKE_ENDPOINT)) process.exitCode = 1;
    return;
  }
  const result = await ingestReports({ input: args.input, endpoint: args.endpoint ?? process.env.ARCHLENS_SOURCE_INTAKE_ENDPOINT, token: args.token ?? process.env.ARCHLENS_SOURCE_INTAKE_TOKEN ?? "", delayMs: integer(args.delay, DEFAULT_DELAY_MS) });
  console.log(JSON.stringify({ endpoint: result.endpoint, summary: result.summary, results: result.results.map(({ input, caseId, ok, error }) => ({ input, caseId, ok, ...(error ? { error } : {}) })) }, null, 2));
  if (result.summary.status !== "ok") process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
