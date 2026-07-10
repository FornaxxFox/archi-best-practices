import { cases, findCase, mcpTools, type CaseStudy } from "./data";

export const mcpToolDefinitions = [
  {
    name: "search_cases",
    description: mcpTools[0].description,
    inputSchema: { type: "object", properties: { query: { type: "string" }, projectType: { type: "string" }, region: { type: "string" }, tag: { type: "string" } } },
  },
  {
    name: "get_case",
    description: mcpTools[1].description,
    inputSchema: { type: "object", required: ["case_id"], properties: { case_id: { type: "string" } } },
  },
  {
    name: "extract_design_elements",
    description: mcpTools[2].description,
    inputSchema: { type: "object", required: ["case_id"], properties: { case_id: { type: "string" } } },
  },
  {
    name: "compare_cases",
    description: mcpTools[3].description,
    inputSchema: { type: "object", required: ["case_ids"], properties: { case_ids: { type: "array", items: { type: "string" } } } },
  },
  {
    name: "build_research_pack",
    description: mcpTools[4].description,
    inputSchema: { type: "object", required: ["case_id"], properties: { case_id: { type: "string" } } },
  },
];

function compactCase(item: CaseStudy) {
  return { id: item.id, title: item.title, architect: item.architect, location: item.location, typology: item.typology, projectType: item.projectType, tags: item.tags, short: item.short, source: item.sources[0]?.url };
}

function researchPack(item: CaseStudy) {
  return {
    filename: `${item.id}-research-pack`,
    readme: `# ${item.title}\n\n资料包由 ArchLens Demo 生成。所有事实判断应回到原始来源核验。\n\n来源：${item.sources.map((source) => `- ${source.label}: ${source.url}`).join("\n")}`,
    markdown: [`# ${item.title}`, `\n## 项目概览\n- 事务所：${item.architect}\n- 地点：${item.location}\n- 年份：${item.year}\n- 类型：${item.typology}\n- 规模：${item.scale}`, `\n## 核心理念\n${item.principle}`, `\n## 空间策略\n${item.strategy}`, `\n## 设计元素\n${item.elements.map((element) => `- ${element}`).join("\n")}`, `\n## 风险与局限\n${item.risks.map((risk) => `- ${risk}`).join("\n")}`, `\n## 原始来源\n${item.sources.map((source) => `- [${source.label}](${source.url})`).join("\n")}`].join("\n"),
    json: item,
  };
}

export function callMcpTool(name: string, args: Record<string, unknown>) {
  if (name === "search_cases") {
    const query = String(args.query ?? "").toLowerCase();
    const projectType = String(args.projectType ?? "");
    const region = String(args.region ?? "");
    const tag = String(args.tag ?? "").toLowerCase();
    return cases.filter((item) => !query || [item.title, item.architect, item.location, item.typology, item.short, ...item.tags].join(" ").toLowerCase().includes(query)).filter((item) => !projectType || item.projectType === projectType).filter((item) => !region || item.region === region).filter((item) => !tag || item.tags.some((value) => value.toLowerCase().includes(tag))).map(compactCase);
  }
  if (name === "get_case") {
    const item = findCase(String(args.case_id ?? ""));
    if (!item) throw new Error("找不到这个案例");
    return item;
  }
  if (name === "extract_design_elements") {
    const item = findCase(String(args.case_id ?? ""));
    if (!item) throw new Error("找不到这个案例");
    return { case_id: item.id, title: item.title, principle: item.principle, strategy: item.strategy, elements: item.elements, palette: item.palette, tags: item.tags, risks: item.risks, sources: item.sources };
  }
  if (name === "compare_cases") {
    const ids = Array.isArray(args.case_ids) ? args.case_ids.map(String) : [];
    return ids.map((id) => findCase(id)).filter((item): item is CaseStudy => Boolean(item)).map((item) => ({ id: item.id, title: item.title, principle: item.principle, strategy: item.strategy, elements: item.elements, palette: item.palette, risks: item.risks }));
  }
  if (name === "build_research_pack") {
    const item = findCase(String(args.case_id ?? ""));
    if (!item) throw new Error("找不到这个案例");
    return researchPack(item);
  }
  throw new Error(`未知工具：${name}`);
}

