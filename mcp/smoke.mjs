const endpoint = process.env.ARCHLENS_MCP_ENDPOINT;
const authorization = process.env.OAI_SITES_AUTHORIZATION;

if (!endpoint) throw new Error("缺少 ARCHLENS_MCP_ENDPOINT，例如 https://<domain>/api/mcp");

const headers = { "content-type": "application/json" };
if (authorization) headers["OAI-Sites-Authorization"] = authorization;

const healthResponse = await fetch(new URL("/api/health", endpoint), { headers });
const health = await healthResponse.json();
if (!healthResponse.ok || health.status !== "ok" || health.dataset?.caseCount !== 18) throw new Error(`health 检查失败：${JSON.stringify(health)}`);

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
if (initialize.protocolVersion !== "2025-03-26") throw new Error(`协议版本不匹配：${initialize.protocolVersion}`);
await rpc("notifications/initialized", {});

const tools = await rpc("tools/list", {});
const expectedTools = ["search_cases", "get_case", "extract_design_elements", "compare_cases", "build_research_pack"];
const actualTools = tools.tools.map((tool) => tool.name);
for (const name of expectedTools) if (!actualTools.includes(name)) throw new Error(`缺少 MCP 工具：${name}`);

const search = await rpc("tools/call", { name: "search_cases", arguments: { query: "公共性" } });
if (!search.structuredContent.some((item) => item.id === "rolex-learning-centre")) throw new Error("语义检索未返回 Rolex Learning Center");

const landscape = await rpc("tools/call", { name: "search_cases", arguments: { projectType: "景观" } });
if (!landscape.structuredContent.some((item) => item.id === "superkilen")) throw new Error("类型检索未返回 Superkilen");

const item = await rpc("tools/call", { name: "get_case", arguments: { case_id: "heydar-aliyev-centre" } });
if (!item.structuredContent?.imageCredit?.license || !item.structuredContent?.sources?.length) throw new Error("get_case 缺少来源或图像许可");

const pack = await rpc("tools/call", { name: "build_research_pack", arguments: { case_id: "heydar-aliyev-centre" } });
if (!pack.structuredContent?.markdown?.includes("原始来源") || !pack.structuredContent?.readme?.includes("ArchLens Research Pack")) throw new Error("research pack 内容不完整");

console.log(JSON.stringify({ endpoint, datasetVersion: health.dataset.version, protocolVersion: initialize.protocolVersion, toolCount: actualTools.length, semanticSearchMatches: search.structuredContent.length, landscapeMatches: landscape.structuredContent.length, checkedCase: item.structuredContent.id, researchPack: "ok" }, null, 2));
