# 参与 ArchLens / 建筑透镜

ArchLens 优先累积可追溯的原始资料和清晰的编辑判断，不追求无来源的批量生成。贡献案例前，请先确认项目资料可以公开核验，并把图片许可与原始来源分开记录。

## 推荐路径

1. 先提交一个 [案例 Wish List](.github/ISSUE_TEMPLATE/wish-list.yml)，或直接提交 [案例资料](.github/ISSUE_TEMPLATE/case-submission.yml)。
2. 按 [`skills/case-production/SKILL.md`](skills/case-production/SKILL.md) 收集来源、整理字段、标记编辑性归纳和迁移风险。
3. 修改 `lib/data.ts` 时同步补齐 `imageCredit`、`sources`、`palette`、`risks` 和 `tags`。
4. 单个案例运行 `npm run source:audit -- --input <case.json> --out <目录>`；批量案例运行 `npm run source:pipeline -- --input <案例目录> --out <目录>`，检查来源状态后再运行 `npm run case:pack -- --input <case.json> --out <目录> --source-report <source-report.json>` 生成带来源证据的资料包。
5. 本地运行 `npm test` 和 `npm run lint`，确认案例页面、MCP 和资料包都能消费同一份数据。
6. 提交 Pull Request，并在描述中说明来源、许可、验证方式和未解决的局限。

## 内容边界

- 不提交密钥、`.env`、未授权的图片文件或整段复制的受版权保护文本。
- 图片默认只保留公开来源链接、署名和许可，不把外部图片下载进仓库。
- AI 可以辅助整理，但不能替代原始来源；编辑性归纳必须用清晰字段承载，并允许复核。
- 如果事实无法从公开来源核验，请明确写成待核验项，不要当作确定事实发布。

## 合并前检查

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run dataset:audit`
- [ ] `npm run source:audit -- --input <case.json> --out <目录>`，并复核 `source-notes.md`
- [ ] 批量提交时复核 `source:pipeline` 的 `pipeline-report.json`，没有失败项
- [ ] 资料包中的 `source-report.json` 与案例 ID 匹配，且已回到原始页面复核
- [ ] 如从外部 `case.json` 生产资料包，运行 `npm run case:pack -- --input <case.json> --out <目录>`
- [ ] 每个案例至少有一个 HTTPS 原始来源
- [ ] 图像链接、图像署名和图像许可已记录
- [ ] 研究资料包中的 Markdown、README 和 JSON 与页面/MCP 保持一致
