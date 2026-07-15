# ArchLens / 建筑透镜

[![ArchLens CI](https://github.com/YiJing233/archlens/actions/workflows/ci.yml/badge.svg)](https://github.com/YiJing233/archlens/actions/workflows/ci.yml) · [公开源码](https://github.com/YiJing233/archlens) · [在线 Demo](https://archlens.yiking233.chatgpt.site)

ArchLens 是一个面向建筑设计研究的开放案例资料库 Demo：参考 Mobbin 的检索与浏览效率，提供可追溯的案例结构化资料、研究资料包下载、轻量工作区和真实 MCP Endpoint。

## 本地运行

```bash
npm install
npm run dev
```

主要页面：

- `/`：研究入口与短 Prompt 模板
- `/cases`：案例库、筛选、案例详情和资料包下载
- `/boards`：本地收藏、评分和 Wish List
- `/project`：项目理念、任务、代码地图、预期和 Milestones
- `/mcp`：MCP 工具说明与可运行 Playground
- `/api/mcp`：无鉴权 MCP HTTP Endpoint
- `/api/health`：协议、数据集版本和案例库就绪状态
- `/api/source-intake`：可选的 D1 来源证据登记与复查接口（公开 Demo 默认关闭写入）
- `/api/workspaces`：可选的 D1 共享工作区接口（公开 Demo 默认关闭）

工作区支持从页面导出/导入 `workspace snapshot` JSON，便于通过文件或 GitHub 交接收藏、评分和最近研究任务；快照只在浏览器和用户自己的文件之间流转，不上传到 ArchLens。

## MCP

把 `https://archlens.yiking233.chatgpt.site/api/mcp` 配置到支持 Streamable HTTP MCP 的 Agent 中即可。当前服务版本为 `0.2.0`、契约版本为 `1.0.0`，工具 schema、curl 和客户端连接说明见 [`mcp/README.md`](mcp/README.md)。Demo 不绑定任何模型供应商，返回的结构化案例上下文交给用户自己的 AI 工具继续处理。

## 案例生产

可复用的案例生产 Skill 在 [`skills/case-production/SKILL.md`](skills/case-production/SKILL.md)，规定了来源采集、结构化、设计理念提取、引用核验和资料包输出流程。

贡献者可以复制 [`skills/case-production/case.template.json`](skills/case-production/case.template.json)，再运行 `npm run case:pack -- --input <case.json> --out <目录>`，零依赖生成 `case.json`、研究 Markdown 和 README 三件套。

如果需要先快速检查原始来源，可运行 `npm run source:audit -- --input <case.json> --out <目录>`。它只读取 HTTPS 网页的标题、描述、canonical 和短摘录，输出 `source-report.json` 与 `source-notes.md`；不下载图片、不生成事实，也不会把网页内容当作可执行指令。生成资料包时可追加 `--source-report <source-report.json>`，把这份证据一起交付。

贡献多个案例时，可运行 `npm run source:pipeline -- --input <案例目录> --out <目录>`，它会按顺序生成每个案例的来源报告和一个 `pipeline-report.json` 总览；任何无效案例或来源失败都会以非零状态阻断后续发布。

如果部署环境启用了 D1，可以把已经生成并人工复核的 `source-report.json` 登记到 `/api/source-intake`，保存案例 ID、来源数量、失败状态、时间线和完整报告；接口不会替代来源抓取，也不会自动生成事实。配置说明和请求示例见 [`docs/SOURCE_INTAKE.md`](docs/SOURCE_INTAKE.md)。

审核前可以生成一个不会自动入库的发布候选：`npm run source:proposal -- --input ./research-packs/source-intake --out ./research-packs/release-candidate`。它会验证来源报告、阻断失败证据，并输出 JSON/Markdown 审阅包；通过后仍需人工修改案例数据、提交 PR 并运行 `npm run dataset:audit`。

## 项目文档

- [项目理念、任务与预期](docs/PROJECT.md)
- [代码与架构](docs/ARCHITECTURE.md)
- [Milestones](docs/MILESTONES.md)

## 开源贡献

- 代码、MCP、schema 和 Skill 使用 Apache-2.0。
- 案例图片和原始资料按各自来源许可处理，默认保留来源链接与署名，不重新分发未授权素材。
- 新案例和 Wish List 使用 `.github/ISSUE_TEMPLATE/` 中的模板提交。
- 贡献流程与内容边界见 [`CONTRIBUTING.md`](CONTRIBUTING.md)，每次 PR 会自动运行案例/MCP 校验、构建测试和 lint。

## 验证

```bash
npm run build
npm test
npm run lint
npm run dataset:audit
ARCHLENS_MCP_ENDPOINT="https://<your-domain>/api/mcp" npm run mcp:smoke
```
