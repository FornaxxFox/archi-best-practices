import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const schemaVersion = "1.0.0";
const allowedTools = new Set(["search_cases", "get_case", "extract_design_elements", "compare_cases", "build_research_pack"]);
const outputFormats = new Set(["markdown", "json"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${field} 必须是非空字符串`);
}

export function validateWorkflow(workflow) {
  const errors = [];
  if (!isRecord(workflow)) throw new Error("工作流必须是一个 JSON 对象");
  if (workflow.schemaVersion !== schemaVersion) errors.push(`schemaVersion 必须是 ${schemaVersion}`);
  requireString(workflow.id, "id", errors);
  if (typeof workflow.id === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workflow.id)) errors.push("id 必须使用 kebab-case");
  requireString(workflow.title, "title", errors);
  requireString(workflow.description, "description", errors);
  requireString(workflow.prompt, "prompt", errors);
  if (!Array.isArray(workflow.steps) || workflow.steps.length < 1 || workflow.steps.length > 6) errors.push("steps 必须包含 1-6 个步骤");
  const stepIds = new Set();
  for (const [index, step] of (Array.isArray(workflow.steps) ? workflow.steps : []).entries()) {
    const prefix = `steps[${index}]`;
    if (!isRecord(step)) {
      errors.push(`${prefix} 必须是对象`);
      continue;
    }
    requireString(step.id, `${prefix}.id`, errors);
    if (step.id && stepIds.has(step.id)) errors.push(`${prefix}.id 不能重复`);
    if (step.id) stepIds.add(step.id);
    requireString(step.purpose, `${prefix}.purpose`, errors);
    if (typeof step.tool !== "string" || !allowedTools.has(step.tool)) errors.push(`${prefix}.tool 不是支持的 MCP 工具`);
    if (!isRecord(step.args)) errors.push(`${prefix}.args 必须是对象`);
  }
  if (!isRecord(workflow.output)) errors.push("output 必须是对象");
  else {
    if (typeof workflow.output.format !== "string" || !outputFormats.has(workflow.output.format)) errors.push("output.format 必须是 markdown 或 json");
    if (!Array.isArray(workflow.output.sections) || !workflow.output.sections.length || workflow.output.sections.some((section) => typeof section !== "string" || !section.trim())) errors.push("output.sections 必须是非空字符串数组");
    if (workflow.output.citeSources !== true) errors.push("output.citeSources 必须为 true");
  }
  if (!Array.isArray(workflow.constraints) || !workflow.constraints.length || workflow.constraints.some((item) => typeof item !== "string" || !item.trim())) errors.push("constraints 必须是非空字符串数组");
  if (errors.length) throw new Error(`工作流校验失败：\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return workflow;
}

async function collectInputs(input) {
  const stats = await fs.stat(input);
  if (stats.isFile()) return [input];
  const entries = await fs.readdir(input, { withFileTypes: true });
  return (await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => collectInputs(path.join(input, entry.name))))).flat().sort();
}

export async function checkWorkflows(input) {
  const files = await collectInputs(path.resolve(input));
  if (!files.length) throw new Error("没有找到工作流 JSON 文件");
  const ids = new Set();
  const results = [];
  for (const file of files) {
    const workflow = validateWorkflow(JSON.parse(await fs.readFile(file, "utf8")));
    if (ids.has(workflow.id)) throw new Error(`工作流 ID 重复：${workflow.id}`);
    ids.add(workflow.id);
    results.push({ id: workflow.id, title: workflow.title, file, stepCount: workflow.steps.length });
  }
  return { schemaVersion, count: results.length, workflows: results };
}

async function main() {
  const input = process.argv[2] ?? "workflows/templates";
  console.log(JSON.stringify(await checkWorkflows(input), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
