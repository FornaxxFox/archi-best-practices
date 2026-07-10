# ArchLens 代码与架构

## 代码地图

```text
app/
  ArchLensApp.tsx       产品界面与桌面端交互
  api/mcp/route.ts       MCP HTTP Endpoint
  project/page.tsx       项目理念、任务与 Milestones
lib/
  data.ts                案例资料、任务模板和展示元数据
  mcp.ts                 MCP 工具定义与领域逻辑
skills/
  case-production/       案例生产 Skill
docs/                    项目理念、架构、路线图和协作说明
.github/                 案例提交与 Wish List 模板
```

## 数据流

```text
公开原始资料
  → 案例生产 Skill
  → case.json / Markdown / README
  → lib/data.ts
  → 网站案例库 + 资料包下载
  → lib/mcp.ts
  → /api/mcp
  → 用户自己的 Agent / 模型
```

## 设计约束

- 网站与模型供应商解耦。
- MCP 返回结构化内容，同时保留来源链接。
- UI 只负责浏览、筛选、保存、下载和展示，不把推理成本藏在产品里。
- 案例字段变更必须同步更新 Skill、MCP schema、下载资料包和测试。
- 图片和原始材料的再分发权限必须单独记录。

## 当前 Demo 的边界

当前案例数据是本地精选种子数据，MCP 暂无鉴权，工作区使用浏览器本地存储。生产化前需要补齐数据版本、权限、限流、审计和更强的来源校验。

