import { cases, findCase, mcpTools, type CaseStudy } from "./data";
import { buildResearchPack } from "./research-pack";

export const MCP_SERVER_VERSION = "0.2.0";
export const MCP_SCHEMA_VERSION = "1.0.0";
export const MCP_PROTOCOL_VERSION = "2025-03-26";

export type McpErrorCode = "INVALID_PARAMS" | "CASE_NOT_FOUND" | "UNKNOWN_TOOL";

export class McpToolError extends Error {
  constructor(public readonly code: McpErrorCode, message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "McpToolError";
  }
}

const projectTypes = ["文化", "公共", "居住", "规划", "景观"] as const;
const regions = ["亚洲", "欧洲", "中东", "北美"] as const;

export const mcpToolDefinitions = [
  {
    name: "search_cases",
    description: mcpTools[0].description,
    inputSchema: { type: "object", additionalProperties: false, properties: { query: { type: "string" }, projectType: { type: "string", enum: projectTypes }, region: { type: "string", enum: regions }, tag: { type: "string" } } },
  },
  {
    name: "get_case",
    description: mcpTools[1].description,
    inputSchema: { type: "object", additionalProperties: false, required: ["case_id"], properties: { case_id: { type: "string", minLength: 1 } } },
  },
  {
    name: "extract_design_elements",
    description: mcpTools[2].description,
    inputSchema: { type: "object", additionalProperties: false, required: ["case_id"], properties: { case_id: { type: "string", minLength: 1 } } },
  },
  {
    name: "compare_cases",
    description: mcpTools[3].description,
    inputSchema: { type: "object", additionalProperties: false, required: ["case_ids"], properties: { case_ids: { type: "array", minItems: 2, maxItems: cases.length, uniqueItems: true, items: { type: "string", minLength: 1 } } } },
  },
  {
    name: "build_research_pack",
    description: mcpTools[4].description,
    inputSchema: { type: "object", additionalProperties: false, required: ["case_id"], properties: { case_id: { type: "string", minLength: 1 } } },
  },
];

function compactCase(item: CaseStudy) {
  return { id: item.id, title: item.title, architect: item.architect, location: item.location, year: item.year, scale: item.scale, typology: item.typology, projectType: item.projectType, region: item.region, tags: item.tags, short: item.short, image: item.image, imageCredit: item.imageCredit, sources: item.sources };
}

function asObject(args: Record<string, unknown>) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new McpToolError("INVALID_PARAMS", "工具参数必须是 JSON 对象");
  return args;
}

function optionalString(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (value !== undefined && typeof value !== "string") throw new McpToolError("INVALID_PARAMS", `${key} 必须是字符串`, { field: key });
  return value === undefined ? "" : value;
}

function caseId(args: Record<string, unknown>) {
  const value = optionalString(asObject(args), "case_id").trim();
  if (!value) throw new McpToolError("INVALID_PARAMS", "case_id 不能为空", { field: "case_id" });
  return value;
}

function findRequiredCase(id: string) {
  const item = findCase(id);
  if (!item) throw new McpToolError("CASE_NOT_FOUND", "找不到这个案例", { case_id: id });
  return item;
}

export function callMcpTool(name: string, args: Record<string, unknown>) {
  if (name === "search_cases") {
    const input = asObject(args);
    const query = optionalString(input, "query").toLowerCase();
    const projectType = optionalString(input, "projectType");
    const region = optionalString(input, "region");
    const tag = optionalString(input, "tag").toLowerCase();
    if (projectType && !(projectTypes as readonly string[]).includes(projectType)) throw new McpToolError("INVALID_PARAMS", "projectType 不是支持的项目类型", { field: "projectType", allowed: projectTypes });
    if (region && !(regions as readonly string[]).includes(region)) throw new McpToolError("INVALID_PARAMS", "region 不是支持的地域", { field: "region", allowed: regions });
    return cases.filter((item) => !query || [item.title, item.architect, item.location, item.typology, item.short, item.context, item.principle, item.strategy, item.materialNotes, ...(item.researchQuestions ?? []), ...item.tags].filter(Boolean).join(" ").toLowerCase().includes(query)).filter((item) => !projectType || item.projectType === projectType).filter((item) => !region || item.region === region).filter((item) => !tag || item.tags.some((value) => value.toLowerCase().includes(tag))).map(compactCase);
  }
  if (name === "get_case") {
    return findRequiredCase(caseId(args));
  }
  if (name === "extract_design_elements") {
    const item = findRequiredCase(caseId(args));
    return { case_id: item.id, title: item.title, context: item.context, principle: item.principle, strategy: item.strategy, researchQuestions: item.researchQuestions, elements: item.elements, palette: item.palette, materialNotes: item.materialNotes, tags: item.tags, risks: item.risks, imageCredit: item.imageCredit, sources: item.sources };
  }
  if (name === "compare_cases") {
    const input = asObject(args);
    if (!Array.isArray(input.case_ids) || input.case_ids.length < 2 || input.case_ids.length > cases.length) throw new McpToolError("INVALID_PARAMS", `case_ids 必须包含 2-${cases.length} 个案例 ID`, { field: "case_ids", minItems: 2, maxItems: cases.length });
    if (input.case_ids.some((id) => typeof id !== "string" || !id.trim())) throw new McpToolError("INVALID_PARAMS", "case_ids 中每一项都必须是非空字符串", { field: "case_ids" });
    const ids = input.case_ids as string[];
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) throw new McpToolError("INVALID_PARAMS", "case_ids 不能包含重复案例", { field: "case_ids" });
    return ids.map(findRequiredCase).map((item) => ({ id: item.id, title: item.title, principle: item.principle, strategy: item.strategy, elements: item.elements, palette: item.palette, risks: item.risks }));
  }
  if (name === "build_research_pack") {
    return buildResearchPack(findRequiredCase(caseId(args)));
  }
  throw new McpToolError("UNKNOWN_TOOL", `未知工具：${name}`, { tool: name });
}
