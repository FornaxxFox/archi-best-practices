const endpoint = process.env.ARCHLENS_MCP_ENDPOINT;
const authorization = process.env.OAI_SITES_AUTHORIZATION;
const expectedVersions = { server: "0.4.0", schema: "1.2.0", protocol: "2025-03-26" };

if (!endpoint) throw new Error("缺少 ARCHLENS_MCP_ENDPOINT，例如 https://<domain>/api/mcp");

const headers = { "content-type": "application/json" };
if (authorization) headers["OAI-Sites-Authorization"] = authorization;

const healthResponse = await fetch(new URL("/api/health", endpoint), { headers });
const health = await healthResponse.json();
if (!healthResponse.ok || health.status !== "ok" || health.dataset?.caseCount !== 18) throw new Error(`health 检查失败：${JSON.stringify(health)}`);
for (const [key, expected] of Object.entries(expectedVersions)) {
  if (health.versions?.[key] !== expected) throw new Error(`${key} 版本不匹配：期望 ${expected}，实际 ${health.versions?.[key] ?? "missing"}`);
}

let requestId = 0;
async function rpc(method, params) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
  });
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(`${method} HTTP ${response.status}: ${JSON.stringify(body)}`);
  if (body?.error) throw new Error(`${method} JSON-RPC ${body.error.code}: ${body.error.message}`);
  return body?.result;
}

const initialize = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "archlens-smoke", version: "1.0.0" } });
if (initialize.protocolVersion !== expectedVersions.protocol) throw new Error(`协议版本不匹配：${initialize.protocolVersion}`);
if (initialize.serverInfo?.version !== expectedVersions.server || initialize.serverInfo?.schemaVersion !== expectedVersions.schema) throw new Error(`initialize 服务版本不匹配：${JSON.stringify(initialize.serverInfo)}`);
if (!initialize.capabilities?.resources || !initialize.capabilities?.prompts || !initialize.capabilities?.tools) throw new Error("initialize 缺少 tools/resources/prompts capability");
await rpc("notifications/initialized", {});

const tools = await rpc("tools/list", {});
const expectedTools = ["search_cases", "get_case", "extract_design_elements", "compare_cases", "build_research_pack", "list_case_facets", "match_cases_to_brief", "build_case_collection"];
const actualTools = tools.tools.map((tool) => tool.name);
for (const name of expectedTools) if (!actualTools.includes(name)) throw new Error(`缺少 MCP 工具：${name}`);
if (tools.tools.some((tool) => tool.annotations?.readOnlyHint !== true || tool.annotations?.destructiveHint !== false)) throw new Error("MCP 工具缺少只读安全标记");

const search = await rpc("tools/call", { name: "search_cases", arguments: { query: "公共性" } });
if (!search.structuredContent.some((item) => item.id === "rolex-learning-centre")) throw new Error("语义检索未返回 Rolex Learning Center");

const landscape = await rpc("tools/call", { name: "search_cases", arguments: { projectType: "景观" } });
if (!landscape.structuredContent.some((item) => item.id === "superkilen")) throw new Error("类型检索未返回 Superkilen");

const item = await rpc("tools/call", { name: "get_case", arguments: { case_id: "heydar-aliyev-centre" } });
if (!item.structuredContent?.imageCredit?.license || !item.structuredContent?.sources?.length) throw new Error("get_case 缺少来源或图像许可");

const pack = await rpc("tools/call", { name: "build_research_pack", arguments: { case_id: "heydar-aliyev-centre" } });
if (!pack.structuredContent?.markdown?.includes("原始来源") || !pack.structuredContent?.readme?.includes("ArchLens Research Pack")) throw new Error("research pack 内容不完整");

const facets = await rpc("tools/call", { name: "list_case_facets", arguments: {} });
if (facets.structuredContent?.dataset?.caseCount !== 18 || !facets.structuredContent?.facets?.tags?.length) throw new Error("case facets 内容不完整");

const matches = await rpc("tools/call", { name: "match_cases_to_brief", arguments: { brief: "连续曲面 公共地景", limit: 3 } });
if (matches.structuredContent?.results?.[0]?.id !== "heydar-aliyev-centre" || !matches.structuredContent.results[0].matchedSignals?.length) throw new Error("brief 匹配结果不可解释或排序异常");

const collection = await rpc("tools/call", { name: "build_case_collection", arguments: { case_ids: ["heydar-aliyev-centre", "superkilen"] } });
if (collection.structuredContent?.caseCount !== 2 || collection.structuredContent?.sources?.length < 2) throw new Error("case collection 内容不完整");

const resources = await rpc("resources/list", {});
for (const uri of ["archlens://dataset", "archlens://cases", "archlens://workflows"]) if (!resources.resources.some((resource) => resource.uri === uri)) throw new Error(`缺少 MCP 资源：${uri}`);
const workflows = await rpc("resources/read", { uri: "archlens://workflows" });
const workflowPayload = JSON.parse(workflows.contents?.[0]?.text ?? "null");
if (!workflowPayload?.workflows?.some((workflow) => workflow.id === "match-brief-to-cases")) throw new Error("工作流资源不可读取");

const templates = await rpc("resources/templates/list", {});
if (!templates.resourceTemplates?.some((template) => template.uriTemplate === "archlens://cases/{case_id}")) throw new Error("缺少单案例资源模板");
const caseResource = await rpc("resources/read", { uri: "archlens://cases/heydar-aliyev-centre" });
const caseResourcePayload = JSON.parse(caseResource.contents?.[0]?.text ?? "null");
if (caseResourcePayload?.case?.id !== "heydar-aliyev-centre" || !caseResourcePayload.case.sources?.length) throw new Error("单案例资源不可读取");

const prompts = await rpc("prompts/list", {});
if (prompts.prompts?.length !== 4) throw new Error(`研究提示数量异常：${prompts.prompts?.length}`);
const prompt = await rpc("prompts/get", { name: "extract-design-thinking", arguments: { case_id: "heydar-aliyev-centre" } });
if (!prompt.messages?.[0]?.content?.text?.includes("build_research_pack") || !prompt.messages[0].content.text.includes("原始来源")) throw new Error("研究提示内容不完整");

console.log(JSON.stringify({ endpoint, datasetVersion: health.dataset.version, serverVersion: initialize.serverInfo.version, schemaVersion: initialize.serverInfo.schemaVersion, protocolVersion: initialize.protocolVersion, toolCount: actualTools.length, resourceCount: resources.resources.length, resourceTemplateCount: templates.resourceTemplates.length, promptCount: prompts.prompts.length, semanticSearchMatches: search.structuredContent.length, briefMatches: matches.structuredContent.results.length, landscapeMatches: landscape.structuredContent.length, checkedCase: item.structuredContent.id, researchPack: "ok", caseCollection: "ok", caseResource: "ok", prompt: "ok" }, null, 2));
