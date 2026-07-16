# 来源 intake 持久化登记

ArchLens 的来源处理分成两个明确阶段：

1. `source:audit` / `source:pipeline` 读取公开 HTTPS 页面，只记录状态、页面元数据和有界摘录。
2. 可选的 `POST /api/source-intake` 将已经生成并人工复核的 `source-report.json` 登记到 D1，形成可查询的证据记录。

登记接口不抓取网页、不下载图片、不生成事实，也不自动把报告合并进 `lib/data.ts`。它只保存证据和状态，避免“登记成功”被误解成“内容已经审核发布”。

## 配置

`.openai/hosting.json` 使用 `d1: "DB"` 声明逻辑绑定；部署时由 Sites 负责实际资源。仓库已包含 Drizzle migration，schema 变化时使用：

```bash
npm run db:generate
```

写入默认关闭。需要显式设置：

```text
ARCHLENS_SOURCE_INTAKE_WRITE_ENABLED=true
ARCHLENS_SOURCE_INTAKE_MAX_REPORT_BYTES=250000
```

如果设置了独立的 `ARCHLENS_SOURCE_INTAKE_TOKEN`，来源登记的 GET/POST 请求需要：

```text
Authorization: Bearer <token>
```

没有设置独立 token 时，接口会沿用 `ARCHLENS_MCP_TOKEN` 的鉴权配置；两个 token 都为空时，只有显式打开写入开关才会允许匿名写入。因此生产环境建议使用独立 token，公开 MCP 仍可保持无鉴权。

公开 Demo 保持写入关闭；没有 D1 绑定时接口返回 503，不降级到浏览器存储或进程内 Map。

## 登记一个报告

先生成报告和资料包：

```bash
npm run source:audit -- --input ./case.json --out ./research-packs/my-case/sources
npm run case:pack -- --input ./case.json --out ./research-packs/my-case --source-report ./research-packs/my-case/sources/source-report.json
```

再把完整 JSON 作为 `report` 传入：

```bash
node -e 'const fs=require("fs"); const report=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); console.log(JSON.stringify({report}))' ./research-packs/my-case/sources/source-report.json > /tmp/archlens-source-intake.json
curl -X POST "https://<your-domain>/api/source-intake" \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token>' \
  --data-binary @/tmp/archlens-source-intake.json
```

批量报告可以用仓库内置的顺序 ingest 脚本：

```bash
npm run source:ingest -- \
  --input ./research-packs/source-intake \
  --endpoint https://<your-domain>/api/source-intake \
  --token "$ARCHLENS_SOURCE_INTAKE_TOKEN"
```

脚本只提交已经存在的 `source-report.json`，按文件名稳定排序、逐个请求，并输出成功/失败总览；任何失败都会以非零退出码结束，不会把失败报告伪装成已入库。

接口会校验 schema 版本、案例 ID、来源数量、HTTPS、来源状态和策略边界。任何失败来源都会记录为 `needs_review`，不会被静默过滤。

## 查询记录

```bash
curl -s "https://<your-domain>/api/source-intake?case_id=heydar-aliyev-centre&limit=20"
curl -s "https://<your-domain>/api/source-intake?status=needs_review"
curl -s "https://<your-domain>/api/source-intake?id=<record-id>"
```

列表只返回摘要；传 `id` 时返回完整的 `source-report` 和审核事件，便于回到原始页面复核。

## 审核队列与状态迁移

来源失败的报告会进入 `needs_review`，不会被当成已核验内容。启用写入后，审核者可以显式迁移状态：

```bash
curl -X PATCH "https://<your-domain>/api/source-intake?id=<record-id>" \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token>' \
  --data '{"status":"approved","note":"已回到事务所项目页复核来源上下文"}'
```

允许的迁移是：`recorded → needs_review`、`needs_review → approved/rejected`、`approved/rejected → needs_review`。每次登记和迁移都会写入 `source_intake_review_events`，记录前后状态、备注、actor 和时间。

## 数据表与回滚

`source_intake_records` 保存：

- 记录 ID、案例 ID 和案例标题；
- `recorded` / `needs_review` / `approved` / `rejected` 状态；
- 来源总数、可访问数、失败数；
- 生成时间、登记时间和更新时间；
- 完整但有大小上限的 `report_json`。

这个切片不执行自动入库，因此不会直接改变案例数据集；“approved”只表示来源证据完成审核，不等于自动合并到 `lib/data.ts`。后续若增加自动入库，应在审核事件之后另设显式发布动作，并保持可回滚。

## 生成发布候选

可以把本地的 `source-report.json` 或目录交给发布候选脚本：

```bash
npm run source:proposal -- \
  --input ./research-packs/source-intake \
  --out ./research-packs/release-candidate
```

脚本会输出 `dataset-change-proposal.json` 和 Markdown 审阅包。所有来源无失败时状态为 `ready_for_manual_review`；任一来源失败、报告非法或案例重复时状态为 `blocked` 并以非零退出。候选文件明确声明 `autoPublish: false`、`datasetMutation: false` 和 `requiresPullRequest: true`，不会修改 `lib/data.ts`。

## GitHub 可复用来源工作流

仓库提供 `.github/workflows/source-intake.yml`。它支持 GitHub Actions 手动触发，也会在每周一自动检查 `research-packs/source-input`；没有该目录时定时运行会安全跳过。触发后它会：

1. 按稳定顺序运行 `source:pipeline`，保存每个案例的 `source-report.json` 和 `source-notes.md`。
2. 无论抓取是否有失败，都生成 `dataset-change-proposal.json` 和 Markdown 审阅包；失败会保持 `blocked`，并上传证据供复核。
3. 只有明确把 `ingest` 设为 `true` 且提供 `ARCHLENS_SOURCE_INTAKE_TOKEN` secret 时，才会把成功报告登记到 D1。

这个 workflow 不修改 `lib/data.ts`、不自动创建 PR，也不自动发布数据集；数据集变更仍需人工确认、PR、`dataset:audit` 和可回滚的发布记录。

## 可选共享工作区

浏览器工作区默认只存在本地，也可以通过 JSON 快照交接。如果需要一个 D1 中的共享空间，必须同时配置独立 token 和写入开关：

```text
ARCHLENS_WORKSPACE_TOKEN=<strong-random-token>
ARCHLENS_WORKSPACE_WRITE_ENABLED=true
ARCHLENS_WORKSPACE_MAX_SNAPSHOT_BYTES=500000
ARCHLENS_WORKSPACE_RATE_LIMIT_PER_MINUTE=120
ARCHLENS_WORKSPACE_WRITE_RATE_LIMIT_PER_MINUTE=60
ARCHLENS_WORKSPACE_MEMBER_RATE_LIMIT_PER_MINUTE=30
ARCHLENS_WORKSPACE_INVITE_BASE_URL=https://<your-domain>
```

接口：

```bash
curl -H "Authorization: Bearer $ARCHLENS_WORKSPACE_TOKEN" \
  "https://<your-domain>/api/workspaces"

curl -X POST "https://<your-domain>/api/workspaces" \
  -H "Authorization: Bearer $ARCHLENS_WORKSPACE_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"id":"studio-research","name":"Studio Research","ownerLabel":"Team","snapshot":{}}'
```

示例中的空 `snapshot` 只用于说明接口形状；实际请求必须提供由页面导出的完整 workspace snapshot。公开 Demo 不配置 token，因此 `/api/workspaces` 返回 404；配置 token 但未应用 migration 时返回 503。operator token 负责空间和成员管理，成员通过独立 token 访问指定空间。

成员级访问通过一次性 token 实现。operator 创建成员后，响应中的 token 只返回一次：

```bash
curl -X POST "https://<your-domain>/api/workspaces/members" \
  -H "Authorization: Bearer $ARCHLENS_WORKSPACE_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"spaceId":"studio-research","memberId":"designer-a","label":"Designer A","role":"editor","expiresInDays":30}'

curl -H "Authorization: Bearer $ARCHLENS_WORKSPACE_TOKEN" \
  "https://<your-domain>/api/workspaces/members?space_id=studio-research"

curl -X DELETE "https://<your-domain>/api/workspaces/members?space_id=studio-research&member_id=designer-a" \
  -H "Authorization: Bearer $ARCHLENS_WORKSPACE_TOKEN"
```

`viewer` 只能读取指定空间，`editor` 可以更新快照，operator/owner 才能创建空间、邀请和撤销成员。成员 token 只保存 SHA-256 hash，默认 30 天过期，可通过 `expiresInDays` 设置为 1–365 天；成员邀请和撤销会写入 `workspace_audit_events`。配置 `ARCHLENS_WORKSPACE_INVITE_BASE_URL` 后，邀请响应会额外返回 `/boards#archlens-invite=...` 链接，token 位于 URL fragment，不会随 HTTP 请求发送；打开后需在工作区页面主动点击同步。当前不支持多 operator。

共享工作区接口还支持独立的 D1 配额。读取、写入、成员管理默认分别是每个身份每分钟 120、60、30 次；owner/operator 的预算按 2 倍计算，editor/viewer 使用基础预算。可通过 `ARCHLENS_WORKSPACE_RATE_LIMIT_PER_MINUTE`、`ARCHLENS_WORKSPACE_WRITE_RATE_LIMIT_PER_MINUTE` 和 `ARCHLENS_WORKSPACE_MEMBER_RATE_LIMIT_PER_MINUTE` 调整。超出时返回 429、`Retry-After` 和 `X-RateLimit-Scope`，配额表未完成 migration 时接口返回 503，不会退化为无限制写入。
