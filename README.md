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

## MCP

把 `https://<your-domain>/api/mcp` 配置到支持 Streamable HTTP MCP 的 Agent 中即可。当前服务版本为 `0.2.0`、契约版本为 `1.0.0`，工具 schema、curl 和客户端连接说明见 [`mcp/README.md`](mcp/README.md)。Demo 不绑定任何模型供应商，返回的结构化案例上下文交给用户自己的 AI 工具继续处理。

## 案例生产

可复用的案例生产 Skill 在 [`skills/case-production/SKILL.md`](skills/case-production/SKILL.md)，规定了来源采集、结构化、设计理念提取、引用核验和资料包输出流程。

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
```
