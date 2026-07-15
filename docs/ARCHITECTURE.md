# ArchLens 代码与架构

## 代码地图

```text
app/
  ArchLensApp.tsx       产品界面与桌面端交互
  api/mcp/route.ts       MCP HTTP Endpoint
  project/page.tsx       项目理念、任务与 Milestones
lib/
  data.ts                案例资料、任务模板和展示元数据
  dataset.ts             数据集版本与数量清单
  mcp.ts                 MCP 工具定义与领域逻辑
scripts/
  source-intake.mjs      原始来源状态、元数据和有界摘录
skills/
  case-production/       案例生产 Skill
docs/                    项目理念、架构、路线图和协作说明
.github/                 案例提交与 Wish List 模板
```

## 数据流

```text
公开原始资料
  → 案例生产 Skill
  → source:audit（只记录来源证据，不解释、不下载图片）
  → case.json / Markdown / README
  → lib/data.ts
  → 网站案例库 + 资料包下载
  → lib/mcp.ts
  → MCP contract / validation / observability / dataset manifest
  → /api/mcp
  → 用户自己的 Agent / 模型
```

## 设计约束

- 网站与模型供应商解耦。
- MCP 返回结构化内容，同时保留来源链接。
- MCP Endpoint 对外暴露服务版本和 schema 版本，并统一 JSON-RPC 与工具业务错误。
- 请求通过 request ID、耗时、限流响应头和结构化日志保持可定位；Demo 限流是进程内尽力实现。
- UI 只负责浏览、筛选、保存、下载和展示，不把推理成本藏在产品里。
- 案例字段变更必须同步更新 Skill、MCP schema、下载资料包和测试。
- 图片和原始材料的再分发权限必须单独记录。
- `/api/health` 必须报告协议版本、数据集版本、案例数量和基础校验状态。
- 发布记录必须保留 Git commit、Sites 版本和可执行回滚目标。
- MCP 鉴权通过运行时变量 opt-in，默认 Demo 不设置 token；密钥不能进入仓库或请求日志。

## 当前 Demo 的边界

当前案例数据是本地精选种子数据，MCP 公开 Demo 默认无鉴权，工作区使用浏览器本地存储。来源 intake 已提供单案例的可复用抓取与解析入口，但还没有持久化队列、跨实例配额、审计存储和自动入库；这些属于 M4 生产化阶段。
