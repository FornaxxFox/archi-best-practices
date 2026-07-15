# ArchLens 发布与回滚记录

本文件记录可验证的发布点。回滚时应选择已保存且经过验证的 Sites 版本，不要直接用未验证的本地构建覆盖线上版本。

## 2026-07-15 · Workspace quota policy release 56

- Git commit：`2d791a5a4889b90a61d1480c152f7b42db037b59`
- Sites：版本 56，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：workspace quota 按读取、写入、成员管理区分预算；owner/operator 使用 2 倍预算，editor/viewer 使用基础预算；429 响应增加 action、role 和 `X-RateLimit-Scope`。
- 默认配置：120 / 60 / 30 次每分钟，可分别通过 `ARCHLENS_WORKSPACE_RATE_LIMIT_PER_MINUTE`、`ARCHLENS_WORKSPACE_WRITE_RATE_LIMIT_PER_MINUTE` 和 `ARCHLENS_WORKSPACE_MEMBER_RATE_LIMIT_PER_MINUTE` 调整。
- 边界：公开 Demo 仍关闭 workspace；自动来源入库仍需人工审核、PR 和 dataset audit。
- 验证：构建、dataset audit、35 个 JavaScript 测试和 12 个 TypeScript 测试、lint、GitHub CI 和生产 health 通过。

## 2026-07-15 · Workspace invite handoff release 54

- Git commit：`05319f94ca785128f85455db9c29af96eb50cfbc`
- Sites：版本 54，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：可选 workspace invite URL；token 只放在 fragment，`/boards` 识别后由用户主动同步共享空间，服务端继续执行角色、过期和 quota 校验。
- 边界：只有配置 `ARCHLENS_WORKSPACE_INVITE_BASE_URL` 才返回 invite URL；公开 Demo 不生成邀请链接，token 不进入查询参数或服务端请求日志。
- 验证：构建、dataset audit、35 个 JavaScript 测试和 11 个 TypeScript 测试、GitHub CI 和 Sites 部署通过。

## 2026-07-15 · Scheduled source intake release 52

- Git commit：`30bb718e889512eef9401efa33f9ceb40f1ff388`
- Sites：版本 52，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：来源 workflow 每周一自动检查输入目录；有输入时运行抓取、解析和人工发布候选，没有输入时安全跳过；手动触发行为保持不变。
- 边界：定时任务只生成证据和 proposal，不自动登记 D1、不修改 `lib/data.ts`、不自动发布数据集。
- 验证：构建、dataset audit、35 个 JavaScript 测试和 10 个 TypeScript 测试、GitHub CI 和 Sites 部署通过。

## 2026-07-15 · Source intake automation release 50

- Git commit：`1355352ae49261d58f1c65d8a0c6672f2eba574a`
- Sites：版本 50，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：GitHub Actions `ArchLens Source Intake`，可手动触发顺序抓取、证据报告、阻断式人工发布候选和可选 D1 ingest；失败证据会作为 artifact 保留。
- 边界：workflow 不修改 `lib/data.ts`、不自动创建 PR、不自动发布数据集；`ingest=true` 也只登记 source evidence。
- 验证：工作流配置和 diff 检查、构建、dataset audit、35 个 JavaScript 测试和 10 个 TypeScript 测试通过；生产公开接口继续保持关闭写入。

## 2026-07-15 · Workspace quota release 49

- Git commit：`27210f5c3ac874be36a7e4fcc9b80017b69d58d9`
- Sites：版本 49，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：D1 `workspace_rate_limit_buckets`，按空间身份限制共享工作区和成员管理请求；默认每分钟 120 次，超限返回 429，缺 migration 返回 503。
- 边界：公开 Demo 默认关闭 workspace；MCP 的既有限流与 workspace quota 分开计数。
- 验证：本地构建、dataset audit、35 个 JavaScript 测试和 10 个 TypeScript 测试通过；lint 无错误；生产部署成功。

## 2026-07-15 · Workspace token expiry release 47

- Git commit：`6d4cb4fa7024c75a5a9a061b9717970b3771b354`
- Sites：版本 47，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`workspace_members.expires_at` 和成员 token 生命周期校验；默认 30 天，可按邀请设置 1–365 天。
- 边界：过期 token 与已撤销 token 一样不能读取或更新共享空间；公开 Demo 仍默认关闭共享工作区。
- 验证：本地构建、dataset audit、35 个 JavaScript 测试和 10 个 TypeScript 测试通过；lint 无错误；迁移生成成功并完成 Sites 部署。

## 2026-07-15 · Workspace member roles release 45

- Git commit：`172d72dd46ccb10e2c248f1870f000a39f75620a`
- Sites：版本 45，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`workspace_members` 成员表、`editor/viewer` 成员 token、按空间访问控制、成员撤销和 `workspace_audit_events` 审计事件。
- 安全边界：operator token 只用于空间和成员管理；成员 token 只返回一次，服务端只保存 SHA-256 hash；公开 Demo 仍默认返回 404，不开放共享工作区。
- 验证：本地构建、dataset audit、35 个 JavaScript 测试和 9 个 TypeScript 测试通过；lint 无错误；GitHub CI、生产 health、MCP smoke 和公开关闭行为通过。

## 2026-07-15 · Opt-in shared workspace release 43

- Git commit：`9298bc00494ad0911bbafab69bef31825f432212`
- Sites：版本 43，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：D1 `workspace_spaces` 表和 `/api/workspaces` 读写接口，支持带数据集版本的共享 workspace snapshot。
- 安全边界：必须配置独立 `ARCHLENS_WORKSPACE_TOKEN` 才能访问，必须额外开启 `ARCHLENS_WORKSPACE_WRITE_ENABLED=true` 才能写入；公开 Demo 默认返回 404，不接受匿名写入。
- 当前限制：一个 operator token 保护整个空间，成员级权限、邀请和更细粒度审计尚未实现。
- 验证：本地构建、dataset audit、34 个 JavaScript 测试和 7 个 TypeScript 测试通过；GitHub CI、生产 health 和公开关闭行为通过。

## 2026-07-15 · Manual dataset proposal gate release 41

- Git commit：`ebcbaad83e58d7a69c60a8622ce1395e3f34f099`
- Sites：版本 41，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`source:proposal`，把来源报告转换为人工审阅的 dataset change proposal；失败来源、非法报告、重复案例会阻断候选生成。
- 边界：候选明确声明 `autoPublish: false`、`datasetMutation: false`、`requiresPullRequest: true`，不会自动修改案例库。
- 验证：本地构建、dataset audit、32 个 JavaScript 测试和 7 个 TypeScript 测试通过；GitHub CI 和生产部署通过。

## 2026-07-15 · Portable workspace release 39

- Git commit：`019a6f7a3c41ed3183c9e440db2971a2b76e7933`
- Sites：版本 39，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：工作区 JSON 快照导出/导入，包含收藏、评分、最近研究任务和数据集版本；导入会校验 schema，并忽略当前数据集不存在的案例。
- 边界：快照只在浏览器和用户自己的文件之间流转，不上传、不写入 D1、不改变案例库；后续团队空间可以在此 schema 上增加权限层。
- 验证：本地构建、dataset audit、30 个 JavaScript 测试和 7 个 TypeScript 测试通过；`/boards` 服务端渲染、GitHub CI 和生产部署通过。

## 2026-07-15 · User-owned workflow templates release 37

- Git commit：`ead3e03b950ccb622de1317b8f40baf2dc404a26`
- Sites：版本 37，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：3 个短研究工作流 manifest，覆盖设计思路提取、元素/颜色提取和案例策略比较；新增零依赖 `workflow:check` 校验器。
- 边界：模板只编排现有只读 MCP，不绑定模型、不保存用户调用、不自动抓取或发布案例；输出强制保留来源链接。
- 验证：本地构建、dataset audit、29 个 JavaScript 测试和 4 个 TypeScript contract 测试通过；workflow check、lint、GitHub CI 和生产部署通过。

## 2026-07-15 · Source review queue release 35

- Git commit：`d8c2deee2a5dd1cfc8f01016e0915cbc041a671b`
- Sites：版本 35，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：来源证据审核队列，支持 `recorded`、`needs_review`、`approved`、`rejected` 状态和可追溯审核事件；状态迁移通过 D1 batch 原子写入。
- 边界：审核结果不会自动修改 `lib/data.ts`，案例发布仍需显式 PR、dataset audit 和回滚记录。
- 验证：本地构建、dataset audit、26 个 JavaScript 测试和 4 个 TypeScript contract 测试通过；GitHub CI、线上 `/api/health`、审核队列 GET 和 MCP smoke 通过。

## 2026-07-15 · Source ingest empty-input guard release 33

- Git commit：`d114bb1a0cb27a52a1855648393fe1426754cadf`
- Sites：版本 33，生产地址 <https://archlens.yiking233.chatgpt.site>
- 修复：空目录或不含 `source-report.json` 的 ingest 现在显式失败，避免批处理误报成功。
- 验证：本地 26 个 JavaScript 测试与 3 个 TypeScript contract 测试、构建、lint 和线上 MCP smoke 通过。

## 2026-07-15 · Source report ingest release 31

- Git commit：`fe2ec6999997002702b848b90777f15a409daeff`
- Sites：版本 31，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`source:ingest`，按稳定顺序把已复核的 `source-report.json` 批量提交到 D1 登记接口。
- 边界：只持久化已有来源证据，不启动隐藏爬虫、不自动修改案例库；任一失败都会以非零状态结束。
- 验证：本地 25 个 JavaScript 测试与 3 个 TypeScript contract 测试、构建、lint 和 GitHub CI 通过。

## 2026-07-15 · Persistent MCP quota release 30

- Git commit：`df74965bbfeb59a64fb45a1995a660efbba3eedb`
- Sites：版本 30，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：D1 `mcp_rate_limit_buckets`，MCP 限流在有 D1 时跨实例持久化；未配置 D1 时保留内存 fallback。
- 验证：线上 `/api/health` 报告 `rateLimitStorage: "d1"`，远程 MCP smoke 通过。

## 2026-07-15 · Source evidence handoff release 25

- Git commit：`10e23382e3e00a3a865910260792187072c3605e`
- Sites：版本 25，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`case:pack --source-report`，将来源 intake 报告作为可追溯证据接入资料包；未提供报告时保持原有三文件输出兼容。
- 边界：只校验并携带来源报告，不自动生成事实、不替代编辑复核。
- 验证：本地 22/22 测试、构建、lint、数据集审核和 GitHub CI 通过；线上 `/api/health` 与 MCP smoke 均通过。

## 2026-07-15 · Pipeline rerun fix release 23

- Git commit：`68540b57abf85f5f338b6a76d551f15de646cc72`
- Sites：版本 23，生产地址 <https://archlens.yiking233.chatgpt.site>
- 修复：批量来源 pipeline 默认输出目录位于输入目录时，重复执行不会再次读取历史报告。
- 验证：本地 21/21 测试、构建和 GitHub CI 通过；线上健康检查与 MCP smoke 保持通过。

## 2026-07-15 · Batch source pipeline release 21

- Git commit：`cb82d5166ce74700ad3d69190f4e8b565a04180a`
- Sites：版本 21，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`source:pipeline`，按顺序批量处理案例目录，写入逐案例来源报告和 `pipeline-report.json` 总览。
- 门禁：无效案例、重复 ID 或来源失败会保留证据并以非零状态结束，不会静默进入发布。
- 验证：本地 20/20 测试、构建和 GitHub CI 通过；线上健康检查、MCP smoke 和项目页状态通过。

## 2026-07-15 · Dataset audit release 19

- Git commit：`80e721c03621bb93e96eaed9b1ed4d037620a7f4`
- Sites：版本 19，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：`dataset:audit`、逐案例稳定内容哈希和 `docs/datasets/2026-07-15.1.json` 基线；案例内容变化但版本未递增时 CI 失败。
- 验证：本地 18/18 测试、数据集审核、构建和 GitHub CI 均通过；线上健康检查和 MCP smoke 保持通过。

## 2026-07-15 · Source intake release 17

- Git commit：`0c7df7446cc0de195e7df022601e0e500964f5e6`
- Sites：版本 17，生产地址 <https://archlens.yiking233.chatgpt.site>
- 新增：零依赖 `source:audit`，按 HTTPS、超时和字节上限检查公开来源，输出页面状态、标题、描述、canonical 和有界摘录。
- 边界：不下载图片、不保存整页、不生成事实；来源失败会显式标记为需复核。
- 验证：本地 15/15 测试、GitHub CI、线上 `/api/health` 和 MCP smoke 均通过；真实 ZHA 项目页只读验收成功。

## 2026-07-15 · Demo release 12

- Git commit：`60810110b5c8bfded8cd507ecb3d8d1990983b61`
- GitHub：`main`，CI run `29401394780` 成功
- Sites：版本 12，生产地址 <https://archlens.yiking233.chatgpt.site>
- Dataset：`2026-07-15.1`，12 个精选案例，类型覆盖建筑、景观与规划
- 新增：可执行 `case:pack`、公开 MCP Endpoint、健康检查、标准 MCP 初始化通知验证
- 生产验证：公开 GET `/api/health`、无令牌 MCP smoke、景观/北美筛选、资料包生成均通过

## 回滚路径

1. 先查看 Sites 已保存版本，确认目标版本的 commit SHA 和部署状态。
2. 优先回滚到上一稳定版本 11（commit `e9b3c3aab223516e7580903e7d083b407438d15b`）。
3. 重新执行公开 `/api/health`、MCP smoke 和案例筛选检查。
4. 在 GitHub 保留回滚原因、影响范围和恢复版本，不直接改写 `main` 历史。

## 当前限制

- Dataset 仍是仓库内的精选种子数据；版本变更现在由逐案例基线审核门禁约束。
- MCP 公开 Demo 默认无鉴权；成员角色、审计存储、token 过期、基础 workspace quota 和可选邀请链接已进入 D1 能力，更细粒度配额和自动入库仍属于后续生产化阶段。

## 2026-07-15 · Optional runtime security capability

- Source capability commit：`1ac512339c7a4b2c13c62fea53c731f27f3b9aef`
- Sites release：版本 15，已部署到公开 Demo（公开 Demo 默认仍为 `auth: "none"`）
- 配置：设置 `ARCHLENS_MCP_TOKEN` 后启用 Bearer 鉴权；设置 `ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE` 可调整单实例限流。
- 验证：本地 11/11 测试通过，GitHub CI 成功；线上 `/api/health` 与 MCP smoke 均通过，未向 Sites 写入 token。

## 2026-07-15 · Demo release 13

- Git commit：`cef72cbc33d9dd58fed50907c33f5fd70b0a863a`
- Sites：版本 13，生产地址 <https://archlens.yiking233.chatgpt.site>
- Dataset：`2026-07-15.1`，12 个精选案例
- 新增：`/api/health`、数据集 manifest、发布回滚记录、标准 `notifications/initialized` 验证
- 生产验证：无令牌 `npm run mcp:smoke` 成功；健康检查、景观检索和资料包路径均通过

## 当前回滚路径

1. 回滚前先确认 Sites 版本和 commit SHA 一致。
2. 当前稳定回滚目标为版本 12（commit `60810110b5c8bfded8cd507ecb3d8d1990983b61`）。
3. 回滚后重新执行 `/api/health` 和 `npm run mcp:smoke`。
