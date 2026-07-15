import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSourceIntakeReport } from "../lib/source-intake-contract.ts";

const PROPOSAL_SCHEMA_VERSION = "1.0.0";
const REPORT_FILE = "source-report.json";

function isExcluded(candidate, excludedPath) {
  return candidate === excludedPath || candidate.startsWith(`${excludedPath}${path.sep}`);
}

async function collectReports(input, excludedPath) {
  if (isExcluded(input, excludedPath)) return [];
  const stat = await fs.stat(input);
  if (stat.isFile()) return input.endsWith(REPORT_FILE) ? [input] : [];
  const entries = await fs.readdir(input, { withFileTypes: true });
  const reports = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    reports.push(...await collectReports(path.join(input, entry.name), excludedPath));
  }
  return reports;
}

function proposalMarkdown(proposal) {
  const lines = [
    "# ArchLens Dataset Change Proposal",
    "",
    "> 这是一个人工审阅用的发布候选，不是自动入库结果。它只携带来源 intake 证据，不会修改 `lib/data.ts`。",
    "",
    `- 状态：${proposal.status}`,
    `- 生成时间：${proposal.generatedAt}`,
    `- 案例数量：${proposal.summary.caseCount}`,
    `- 可进入人工复核：${proposal.summary.eligibleCaseCount}`,
    `- 失败门禁：${proposal.summary.blockedCaseCount}`,
    "",
    "## 发布边界",
    "- `autoPublish: false`：不会自动修改案例数据集。",
    "- `requiresPullRequest: true`：需要人工把确认后的字段修改提交到 GitHub PR。",
    "- 运行 `npm run dataset:audit`：确认数据集版本和逐案例变更基线。",
    "",
    "## 案例证据",
  ];
  for (const item of proposal.cases) lines.push("", `### ${item.title}`, `- 案例 ID：\`${item.caseId}\``, `- 来源状态：${item.status}`, `- 来源数量：${item.evidence.sourceCount}`, `- 可访问：${item.evidence.reachableCount}`, `- 失败：${item.evidence.failedCount}`, `- 报告：\`${item.sourceReportPath}\``);
  if (proposal.errors.length) lines.push("", "## 错误", ...proposal.errors.map((error) => `- ${error.input}：${error.message}`));
  return `${lines.join("\n")}\n`;
}

export async function runSourceProposal({ input, out, now = () => new Date().toISOString() }) {
  const inputPath = path.resolve(input);
  const outputDir = path.resolve(out ?? path.join(inputPath, "release-candidate"));
  const files = await collectReports(inputPath, outputDir);
  if (!files.length) throw new Error("没有找到 source-report.json，拒绝生成空发布候选");
  const cases = [];
  const errors = [];
  const seenIds = new Set();
  for (const file of files) {
    try {
      const report = validateSourceIntakeReport(JSON.parse(await fs.readFile(file, "utf8")));
      if (seenIds.has(report.case.id)) throw new Error(`案例 ID 重复：${report.case.id}`);
      seenIds.add(report.case.id);
      cases.push({ caseId: report.case.id, title: report.case.title, status: report.summary.failedCount ? "needs_review" : "ready_for_manual_review", sourceReportPath: file, evidence: report.summary });
    } catch (error) {
      errors.push({ input: file, message: error instanceof Error ? error.message : "source-report 校验失败" });
    }
  }
  const blockedCaseCount = cases.filter((item) => item.status === "needs_review").length + errors.length;
  const proposal = {
    schemaVersion: PROPOSAL_SCHEMA_VERSION,
    generatedAt: now(),
    input: inputPath,
    outputDir,
    policy: { autoPublish: false, datasetMutation: false, requiresPullRequest: true, sourceOnly: true },
    status: blockedCaseCount ? "blocked" : "ready_for_manual_review",
    summary: { caseCount: files.length, validCaseCount: cases.length, eligibleCaseCount: cases.filter((item) => item.status === "ready_for_manual_review").length, blockedCaseCount },
    cases: cases.sort((left, right) => left.caseId.localeCompare(right.caseId)),
    errors,
  };
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, "dataset-change-proposal.json"), `${JSON.stringify(proposal, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, "dataset-change-proposal.md"), proposalMarkdown(proposal)),
  ]);
  return { ...proposal, proposalPath: path.join(outputDir, "dataset-change-proposal.json") };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input" || value === "--out") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${value} 需要一个路径`);
      args[value.slice(2)] = next;
      index += 1;
    } else if (value === "--help" || value === "-h") args.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log("用法：npm run source:proposal -- --input <source-report.json 或目录> [--out <目录>]");
    if (!args.input && !args.help) process.exitCode = 1;
    return;
  }
  const proposal = await runSourceProposal({ input: args.input, out: args.out });
  console.log(JSON.stringify({ proposalPath: proposal.proposalPath, status: proposal.status, summary: proposal.summary }, null, 2));
  if (proposal.status === "blocked") process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
