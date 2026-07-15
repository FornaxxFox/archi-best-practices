# ArchLens 发布与回滚记录

本文件记录可验证的发布点。回滚时应选择已保存且经过验证的 Sites 版本，不要直接用未验证的本地构建覆盖线上版本。

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

- Dataset 仍是仓库内的精选种子数据，版本号需要随内容提交显式更新。
- MCP 仍是无鉴权 Demo；持久化限流、审计存储和团队权限属于生产化阶段。
