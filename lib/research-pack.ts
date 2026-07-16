import type { CaseStudy } from "./data";

export type ResearchPack = {
  filename: string;
  readme: string;
  markdown: string;
  json: CaseStudy;
};

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

export function buildResearchPack(item: CaseStudy): ResearchPack {
  const metadata = [
    `- 事务所：${item.architect}`,
    `- 地点：${item.location}`,
    `- 年份：${item.year}`,
    `- 类型：${item.typology}`,
    `- 项目类型：${item.projectType}`,
    `- 地域：${item.region}`,
    `- 规模：${item.scale}`,
    `- 标签：${item.tags.join("、")}`,
  ].join("\n");
  const imageNote = `- 图像：${item.imageCredit.label}（${item.imageCredit.license}）\n- 图像来源：${item.imageCredit.url}\n- ArchLens 仅记录外部公开图像链接与许可，不在资料包中重新分发图像文件。`;
  const sourceList = item.sources.map((source) => `- [${source.label}](${source.url})`).join("\n");
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
    "",
    "## 图像署名与许可",
    imageNote,
    "",
    "## 原始来源",
    sourceList,
  ].join("\n");

  return { filename: `${item.id}-research-pack`, readme, markdown, json: item };
}
