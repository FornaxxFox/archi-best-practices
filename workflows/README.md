# ArchLens 研究工作流模板

这里的工作流是用户自有的轻量 manifest，不是 ArchLens 官方 AI 助手。它把一个研究任务拆成短 Prompt、MCP 工具调用、输出栏目和边界约束，用户可以复制到自己的 Claude、Cursor、脚本或 Agent 中继续执行。

## 快速开始

```bash
npm run workflow:check
```

选择 `templates/` 下的 JSON，替换 `{{case_id}}` 或 `{{case_id_a}}` 等变量，然后把 `prompt`、`steps` 和 `constraints` 交给你自己的工作流执行器。ArchLens 只提供只读 MCP 数据和资料包，不保存你的模型调用、不代替你生成结论。

## 当前模板

| 模板 | 适合什么时候用 | MCP 工具 |
| --- | --- | --- |
| `extract-design-thinking.json` | 快速理解一个案例的理念和空间策略 | `get_case`、`extract_design_elements`、`build_research_pack` |
| `elements-palette.json` | 整理设计元素、颜色和材料线索 | `extract_design_elements`、`get_case` |
| `compare-cases.json` | 比较两个案例的策略和迁移条件 | `compare_cases`、`build_research_pack` |
| `match-brief.json` | 从研究任务匹配案例并形成多案例集合 | `list_case_facets`、`match_cases_to_brief`、`build_case_collection` |

## 边界

- 模板只允许调用当前公开的只读 MCP 工具；它们不会自动抓取网页、写入数据集或发布案例。
- `citeSources` 必须为 `true`，输出必须保留原始来源链接。
- 模板中的“核心理念”“迁移条件”等栏目需要用户自己的 Agent 标注为事实、编辑性归纳或比较判断。
- 新增模板时校验器接收目录或单个 JSON 路径：`node scripts/workflow-check.mjs workflows/templates/new.json`。
