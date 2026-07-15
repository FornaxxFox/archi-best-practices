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

接口会校验 schema 版本、案例 ID、来源数量、HTTPS、来源状态和策略边界。任何失败来源都会记录为 `needs_review`，不会被静默过滤。

## 查询记录

```bash
curl -s "https://<your-domain>/api/source-intake?case_id=heydar-aliyev-centre&limit=20"
curl -s "https://<your-domain>/api/source-intake?status=needs_review"
curl -s "https://<your-domain>/api/source-intake?id=<record-id>"
```

列表只返回摘要；传 `id` 时返回完整的 `source-report`，便于回到原始页面复核。

## 数据表与回滚

`source_intake_records` 保存：

- 记录 ID、案例 ID 和案例标题；
- `recorded` / `needs_review` 状态；
- 来源总数、可访问数、失败数；
- 生成时间、登记时间和更新时间；
- 完整但有大小上限的 `report_json`。

这个切片不执行自动入库，因此不会直接改变案例数据集。后续若增加队列或审核动作，应在这张证据记录之上新增状态迁移和审计事件，并保持可回滚。
