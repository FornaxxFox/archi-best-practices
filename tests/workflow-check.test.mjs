import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkWorkflows, validateWorkflow } from "../scripts/workflow-check.mjs";

const template = {
  schemaVersion: "1.0.0",
  id: "test-workflow",
  title: "测试工作流",
  description: "验证 manifest 合约",
  prompt: "请基于 MCP 返回值整理研究结果。",
  steps: [{ id: "read", tool: "get_case", args: { case_id: "{{case_id}}" }, purpose: "读取案例" }],
  output: { format: "markdown", sections: ["来源"], citeSources: true },
  constraints: ["保留来源链接。"],
};

test("workflow manifest accepts a valid read-only MCP workflow", () => {
  assert.equal(validateWorkflow(template).id, "test-workflow");
});

test("workflow manifest rejects unknown tools and missing citations", () => {
  assert.throws(() => validateWorkflow({ ...template, steps: [{ ...template.steps[0], tool: "unknown_tool" }], output: { ...template.output, citeSources: false } }), /支持的 MCP 工具/);
});

test("workflow checker validates a directory and detects duplicate ids", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "archlens-workflows-"));
  await fs.writeFile(path.join(dir, "one.json"), JSON.stringify(template));
  assert.equal((await checkWorkflows(dir)).count, 1);
  await fs.writeFile(path.join(dir, "two.json"), JSON.stringify(template));
  await assert.rejects(() => checkWorkflows(dir), /工作流 ID 重复/);
});
