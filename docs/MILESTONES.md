# ArchLens Milestones

## M0 — 可演示的内容入口（已完成）

- 桌面端中文产品界面
- Mobbin 式案例浏览、筛选和详情抽屉
- 首批 18 个精选案例，覆盖建筑、景观与规划
- 本地收藏、评分和 Wish List
- MCP Playground 与无鉴权 HTTP Endpoint

## M1 — 内容生产与资料包（已完成首个闭环）

- 补齐案例背景、研究问题和材料说明
- 统一 `case.json`、Markdown、README 输出
- 记录来源、署名和许可
- 用案例生产 Skill 固化编辑流程
- 网站下载与 MCP `build_research_pack` 共用同一份资料包生成器
- 提供零依赖 `case:pack` CLI 与可复制的 `case.template.json`
- 资料包明确区分原始来源、编辑性归纳、图像署名和迁移风险

验收标准：新增案例可以按照同一份 Skill 独立生产，并能被网站、下载和 MCP 同时消费。当前 18 个案例已通过资料包字段回归验证。

## M2 — MCP 稳定化（Demo 已完成）

- 明确工具 schema 版本策略
- 服务版本 `0.2.0`、工具契约版本 `1.0.0`
- 统一 JSON-RPC 错误、工具业务错误、限流和请求日志
- 提供 request ID、耗时和 `X-RateLimit-*` 响应头
- 提供 curl 与远程 Streamable HTTP 客户端接入示例
- Demo Endpoint 已开放公开访问，零依赖 smoke client 可直接验证远程连接
- `/api/health` 暴露数据集版本、案例数量和协议就绪状态
- 验证标准 HTTP MCP 初始化、通知、工具调用和资料包路径
- 可选 Bearer 鉴权和运行时限流配置已实现，公开 Demo 默认不启用

验收标准：外部 Agent 能稳定检索、获取和比较案例，并在错误时得到可定位的响应。当前 Demo 的本地工具调用、错误路径、资料包路径和远程 smoke 已通过测试；持久化限流和主流客户端实测仍属于生产化前置工作。

## M3 — 开放协作与内容增长（首个闭环已完成）

- GitHub 案例提交和 Wish List 模板
- CI 检查 schema、来源和许可字段
- 贡献者指南与编辑规范
- 零依赖来源 intake：检查 HTTPS、状态、标题、描述、canonical 和有界摘录
- 目录级来源 pipeline：逐案例报告、总览和失败门禁
- 扩展建筑、城乡规划和景观分类

验收标准：贡献者不需要了解前端实现，也能完成来源 intake、资料包生成和 PR 提交；来源失败必须被显式标记，不能静默变成“已核验”。

当前状态：案例提交模板、来源 intake、目录级 pipeline、资料包证据交接和分类扩展均已落地；后续以新增真实案例和社区贡献为主。

## M4 — 生产级知识基础设施

- 可配置的检索与爬取 pipeline
- 数据集版本、逐案例变更审核和基线记录
- MCP 鉴权、配额和团队空间
- 用户自有模型和工作流的可选接入

当前进展：来源 intake、目录级 pipeline、`dataset:audit`、D1 证据登记、审核状态迁移、MCP 与 workspace D1 限流 bucket、顺序 ingest、支持手动和每周触发的 GitHub 来源同步 workflow、用户自有工作流 manifest 校验、可移交 workspace snapshot、operator-token 共享工作区、成员角色/撤销/审计/过期控制/邀请链接、按操作和角色区分的配额策略以及显式发布候选门禁已完成首个可执行闭环；自动入库仍保持人工审核门禁。

验收标准：系统具备可回滚、可审计、可扩展和可定位的线上运行能力。
