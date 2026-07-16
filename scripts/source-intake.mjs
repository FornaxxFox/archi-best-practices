import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCase } from "./case-pack.mjs";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_DELAY_MS = 250;
const MAX_EXCERPT_LENGTH = 600;

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  return decodeEntities(value.replace(/<!--.*?-->/gs, " ").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ").replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function firstMatch(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function extractPageMetadata(html) {
  const title = cleanText(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i));
  const description = cleanText(firstMatch(html, /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || firstMatch(html, /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i));
  const canonical = firstMatch(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || firstMatch(html, /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const text = cleanText(html);
  return { title: title.slice(0, 240), description: description.slice(0, MAX_EXCERPT_LENGTH), canonicalUrl: canonical.slice(0, 2_000), excerpt: text.slice(0, MAX_EXCERPT_LENGTH) };
}

async function readBody(response, maxBytes) {
  if (!response.body) {
    const text = await response.text();
    const bytes = new TextEncoder().encode(text);
    return { text: new TextDecoder().decode(bytes.slice(0, maxBytes)), bytesRead: Math.min(bytes.byteLength, maxBytes), truncated: bytes.byteLength > maxBytes };
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = maxBytes - bytesRead;
    if (value.byteLength > remaining) {
      chunks.push(value.slice(0, Math.max(0, remaining)));
      bytesRead = maxBytes;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    bytesRead += value.byteLength;
  }
  const output = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(output), bytesRead, truncated };
}

function sourceError(error) {
  return error instanceof Error ? error.message : "来源抓取失败";
}

function ensureHttps(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("来源 URL 必须使用 HTTPS");
  return parsed;
}

export async function inspectSource(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const startedAt = Date.now();
  let parsed;
  try {
    parsed = ensureHttps(source.url);
  } catch (error) {
    return { label: source.label, url: source.url, ok: false, status: null, contentType: null, finalUrl: null, bytesRead: 0, truncated: false, title: "", description: "", canonicalUrl: "", excerpt: "", error: sourceError(error), durationMs: Date.now() - startedAt };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(parsed.href, { redirect: "follow", signal: controller.signal, headers: { accept: "text/html,application/xhtml+xml", "user-agent": "ArchLens-source-intake/0.1" } });
    const body = await readBody(response, maxBytes);
    const contentType = response.headers.get("content-type") ?? "";
    const page = /html|xhtml/i.test(contentType) || !contentType ? extractPageMetadata(body.text) : { title: "", description: "", canonicalUrl: "", excerpt: "" };
    const finalUrl = response.url || parsed.href;
    const redirectedToInsecure = new URL(finalUrl).protocol !== "https:";
    const ok = response.ok && !body.truncated && !redirectedToInsecure;
    const error = redirectedToInsecure ? "来源重定向到了非 HTTPS URL" : body.truncated ? `响应超过 ${maxBytes} 字节上限，已截断` : !response.ok ? `HTTP ${response.status}` : null;
    return { label: source.label, url: source.url, ok, status: response.status, contentType, finalUrl, bytesRead: body.bytesRead, truncated: body.truncated, ...page, error, durationMs: Date.now() - startedAt };
  } catch (error) {
    return { label: source.label, url: source.url, ok: false, status: null, contentType: null, finalUrl: null, bytesRead: 0, truncated: false, title: "", description: "", canonicalUrl: "", excerpt: "", error: error?.name === "AbortError" ? `请求超过 ${timeoutMs}ms 超时` : sourceError(error), durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectSources({ item, fetchImpl, timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_BYTES, delayMs = DEFAULT_DELAY_MS, now = () => new Date().toISOString() }) {
  const results = [];
  for (const [index, source] of item.sources.entries()) {
    if (index > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    results.push(await inspectSource(source, { fetchImpl, timeoutMs, maxBytes }));
  }
  return { schemaVersion: "1.0.0", generatedAt: now(), case: { id: item.id, title: item.title }, policy: { onlyHttps: true, downloadedImages: false, maxBytes, timeoutMs, delayMs, interpretation: "none" }, summary: { sourceCount: results.length, reachableCount: results.filter((source) => source.ok).length, failedCount: results.filter((source) => !source.ok).length }, sources: results };
}

export function buildSourceNotes(report) {
  const lines = [
    `# ${report.case.title} · ArchLens Source Intake`,
    "",
    "> 这份报告只记录公开来源的抓取状态、页面元数据和短摘录，不替代原始来源，也不包含 AI 生成的事实判断。请回到原页面核验上下文、日期和许可。",
    "",
    `- 检查时间：${report.generatedAt}`,
    `- 来源数量：${report.summary.sourceCount}`,
    `- 可访问：${report.summary.reachableCount}`,
    `- 失败：${report.summary.failedCount}`,
    `- 策略：仅 HTTPS；不下载图片；单来源最多读取 ${report.policy.maxBytes} 字节；超时 ${report.policy.timeoutMs}ms。`,
    "",
    "## 来源证据",
  ];
  for (const source of report.sources) lines.push("", `### ${source.label}`, `- URL：${source.url}`, `- 状态：${source.ok ? "可访问" : "需复核"}${source.status ? `（HTTP ${source.status}）` : ""}`, `- 最终 URL：${source.finalUrl ?? "未获取"}`, `- 页面标题：${source.title || "未提取"}`, `- Canonical：${source.canonicalUrl || "未提取"}`, `- 摘要元数据：${source.description || "未提取"}`, `- 短摘录：${source.excerpt || "未提取"}`, `- 错误：${source.error ?? "无"}`);
  return `${lines.join("\n")}\n`;
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

export async function generateSourceReport({ input, out, timeoutMs, maxBytes, delayMs, fetchImpl }) {
  const item = validateCase(JSON.parse(await fs.readFile(input, "utf8")));
  const report = await inspectSources({ item, fetchImpl, timeoutMs: integer(timeoutMs, DEFAULT_TIMEOUT_MS), maxBytes: integer(maxBytes, DEFAULT_MAX_BYTES), delayMs: integer(delayMs, DEFAULT_DELAY_MS, true) });
  const outputDir = out ?? path.resolve(path.dirname(input), `${item.id}-source-intake`);
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([fs.writeFile(path.join(outputDir, "source-report.json"), `${JSON.stringify(report, null, 2)}\n`), fs.writeFile(path.join(outputDir, "source-notes.md"), buildSourceNotes(report))]);
  return { ...report, outputDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log("用法：npm run source:audit -- --input <case.json> [--out <目录>] [--timeout <ms>] [--max-bytes <n>] [--delay <ms>]");
    if (!args.input && !args.help) process.exitCode = 1;
    return;
  }
  const report = await generateSourceReport({ input: path.resolve(args.input), out: args.out ? path.resolve(args.out) : undefined, timeoutMs: args.timeout, maxBytes: args.max_bytes, delayMs: args.delay });
  console.log(JSON.stringify({ caseId: report.case.id, outputDir: report.outputDir, summary: report.summary }, null, 2));
  if (report.summary.failedCount > 0) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
