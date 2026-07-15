import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredStringFields = [
  "id",
  "title",
  "architect",
  "location",
  "year",
  "typology",
  "projectType",
  "principle",
  "strategy",
];

const list = (items) => items.map((item) => `- ${item}`).join("\n");

export function validateCase(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("输入必须是一个 JSON 对象");
  const errors = [];
  for (const field of requiredStringFields) if (typeof item[field] !== "string" || !item[field].trim()) errors.push(`${field} 必须是非空字符串`);
  if (typeof item.id === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) errors.push("id 必须使用 kebab-case");
  if (typeof item.image !== "string" || !item.image.startsWith("https://")) errors.push("image 必须是 HTTPS URL");
  if (!item.imageCredit || typeof item.imageCredit !== "object" || !item.imageCredit.url?.startsWith("https://") || !item.imageCredit.license?.trim()) errors.push("imageCredit 必须包含 HTTPS url 和 license");
  if (!Array.isArray(item.sources) || !item.sources.length || item.sources.some((source) => !source?.label?.trim() || !source.url?.startsWith("https://"))) errors.push("sources 必须包含带标签的 HTTPS 来源");
  if (!Array.isArray(item.elements) || !item.elements.length) errors.push("elements 不能为空数组");
  if (!Array.isArray(item.risks) || !item.risks.length) errors.push("risks 不能为空数组");
  if (!Array.isArray(item.tags) || !item.tags.length) errors.push("tags 不能为空数组");
  if (!Array.isArray(item.palette) || !item.palette.length || item.palette.some((color) => !color?.name?.trim() || !/^#[0-9a-f]{6}$/i.test(color.hex ?? ""))) errors.push("palette 必须包含名称和 6 位 HEX 颜色");
  if (errors.length) throw new Error(`案例数据校验失败：\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return item;
}

function validateSourceReport(report, caseId) {
  if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error("source-report 必须是 JSON 对象");
  if (report.schemaVersion !== "1.0.0") throw new Error("source-report schemaVersion 不受支持");
  if (report.case?.id !== caseId) throw new Error(`source-report 的案例 ID 必须是 ${caseId}`);
  if (!Array.isArray(report.sources)) throw new Error("source-report.sources 必须是数组");
  if (report.sources.some((source) => !source?.label?.trim() || !source.url?.startsWith("https://"))) throw new Error("source-report.sources 必须包含带标签的 HTTPS URL");
  return report;
}

export function buildResearchPack(item, sourceReport) {
  const metadata = [
    `- 事务所：${item.architect}`,
    `- 地点：${item.location}`,
    `- 年份：${item.year}`,
    `- 类型：${item.typology}`,
    `- 项目类型：${item.projectType}`,
    `- 地域：${item.region ?? "未记录"}`,
    `- 规模：${item.scale ?? "未记录"}`,
    `- 标签：${item.tags.join("、")}`,
  ].join("\n");
  const imageNote = `- 图像：${item.imageCredit.label}（${item.imageCredit.license}）\n- 图像来源：${item.imageCredit.url}\n- ArchLens 仅记录外部公开图像链接与许可，不在资料包中重新分发图像文件。`;
  const sourceList = item.sources.map((source) => `- [${source.label}](${source.url})`).join("\n");
  const intakeNote = sourceReport ? `\n## 来源 intake 证据\n- 检查时间：${sourceReport.generatedAt}\n- 可访问来源：${sourceReport.summary.reachableCount}/${sourceReport.summary.sourceCount}\n- 失败来源：${sourceReport.summary.failedCount}\n- 详细页面元数据和有界摘录见 \`source-report.json\`；这些内容只用于回到原页面复核，不是自动生成的事实。` : "";
  const markdown = [
    `# ${item.title}`,
    "> 这是一份基于公开来源整理的研究资料包。事实、图像许可和设计判断应回到原始来源核验；“核心理念”“空间策略”等栏目包含 ArchLens 的编辑性归纳。",
    `\n## 项目概览\n${metadata}`,
    `\n## 项目背景\n${item.context ?? item.short}`,
    `\n## 核心理念\n${item.principle}`,
    `\n## 空间策略\n${item.strategy}`,
    `\n## 研究问题\n${list(item.researchQuestions ?? [])}`,
    `\n## 设计元素\n${list(item.elements)}`,
    `\n## 颜色与材料\n${item.palette.map((color) => `- ${color.name}：${color.hex}`).join("\n")}\n\n${item.materialNotes ?? "未单独记录材料说明。"}`,
    `\n## 风险与局限\n${list(item.risks)}`,
    `\n## 图像署名与许可\n${imageNote}`,
    intakeNote,
    `\n## 原始来源\n${sourceList}`,
  ].join("\n");
  const readme = [
    `# ${item.title} · ArchLens Research Pack`,
    "",
    "这份资料包包含 `case.json`、研究 Markdown 和本说明文件，供设计研究、案例比较与外部 Agent 使用。",
    "",
    "## 使用边界",
    "- 原始来源负责项目事实；ArchLens 的理念、策略和元素字段是可复核的编辑性归纳，不是事务所官方表述。",
    "- 使用前请打开原始来源核验上下文、日期、版权和许可；不要把案例中的形式直接当作可复制方案。",
    "- 图像只保留公开来源链接和署名信息，ArchLens 不重新分发图像文件。",
    "",
    "## 项目索引",
    metadata,
    "",
    "## 文件说明",
    "- `case.json`：完整结构化案例数据，可由 MCP 或脚本继续处理。",
    "- `research-pack.md`：适合阅读、批注和继续研究的 Markdown。",
    "- `README.md`：来源、使用边界和许可提示。",
    ...(sourceReport ? ["- `source-report.json`：来源 intake 的状态、页面元数据和有界摘录，不替代原始页面。"] : []),
    "",
    "## 图像署名与许可",
    imageNote,
    "",
    "## 原始来源",
    sourceList,
  ].join("\n");
  return { markdown, readme };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input" || value === "--out" || value === "--source-report") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${value} 需要一个路径`);
      args[value.slice(2)] = next;
      index += 1;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else {
      throw new Error(`未知参数：${value}`);
    }
  }
  return args;
}

export async function generatePack({ input, out, sourceReport }) {
  const item = validateCase(JSON.parse(await fs.readFile(input, "utf8")));
  const targetDir = out ?? path.resolve(path.dirname(input), item.id);
  const report = sourceReport ? validateSourceReport(JSON.parse(await fs.readFile(sourceReport, "utf8")), item.id) : undefined;
  const pack = buildResearchPack(item, report);
  await fs.mkdir(targetDir, { recursive: true });
  const files = {
    json: path.join(targetDir, "case.json"),
    markdown: path.join(targetDir, "research-pack.md"),
    readme: path.join(targetDir, "README.md"),
  };
  if (report) files.sourceReport = path.join(targetDir, "source-report.json");
  await Promise.all([
    fs.writeFile(files.json, `${JSON.stringify(item, null, 2)}\n`),
    fs.writeFile(files.markdown, `${pack.markdown}\n`),
    fs.writeFile(files.readme, `${pack.readme}\n`),
    ...(report ? [fs.writeFile(files.sourceReport, `${JSON.stringify(report, null, 2)}\n`)] : []),
  ]);
  return { caseId: item.id, outputDir: targetDir, files };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    console.log("用法：npm run case:pack -- --input <case.json> [--out <目录>] [--source-report <source-report.json>]");
    if (!args.input && !args.help) process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(await generatePack({ input: path.resolve(args.input), out: args.out ? path.resolve(args.out) : undefined, sourceReport: args["source-report"] ? path.resolve(args["source-report"]) : undefined }), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
