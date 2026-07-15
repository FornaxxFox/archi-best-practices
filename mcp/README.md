# ArchLens MCP

ArchLens exposes a real no-auth Streamable HTTP MCP-compatible endpoint at `/api/mcp`.
当前契约版本为 `1.0.0`，服务版本为 `0.2.0`。

## Connection

把 MCP 客户端的远程 HTTP 地址指向：

```text
https://<your-domain>/api/mcp
```

当前公开 Demo Endpoint：

```text
https://archlens.yiking233.chatgpt.site/api/mcp
```

Endpoint 支持 `initialize`、`tools/list`、`tools/call` 和 `resources/list`，与网站使用同一份精选案例数据。不绑定模型供应商，客户端可以把返回的结构化上下文交给自己的 Agent 或模型。

发布后可用健康检查确认数据集版本和案例数量：

```bash
curl -s https://archlens.yiking233.chatgpt.site/api/health
```

## 快速验证

先检查服务能力：

```bash
export ARCHLENS_ENDPOINT="https://<your-domain>/api/mcp"
curl -i "$ARCHLENS_ENDPOINT"
```

调用案例检索工具：

```bash
curl -s "$ARCHLENS_ENDPOINT" \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_cases","arguments":{"query":"公共性"}}}'
```

调用完整研究资料包：

```bash
curl -s "$ARCHLENS_ENDPOINT" \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"build_research_pack","arguments":{"case_id":"heydar-aliyev-centre"}}}'
```

仓库还提供一个零依赖的协议级 smoke client，可在部署后验证远程 MCP：

```bash
ARCHLENS_MCP_ENDPOINT="https://<your-domain>/api/mcp" npm run mcp:smoke
```

如果站点仍是 Sites 私有访问，在同一条命令中临时提供 `OAI_SITES_AUTHORIZATION="Bearer ..."`；不要把这个值写入仓库、shell history 或 CI 配置。

如果客户端支持远程 Streamable HTTP MCP，只需要新增一个服务器地址即可；配置文件通常类似：

```json
{
  "mcpServers": {
    "archlens": {
      "url": "https://<your-domain>/api/mcp"
    }
  }
}
```

上面的配置可用于支持远程 HTTP MCP 的 Claude、Cursor 或其他客户端；无需追加 Sites 绕过令牌。

不同客户端的配置入口和字段名可能不同，请以客户端当前文档为准；核心连接信息只有 Endpoint URL。

## 从案例 JSON 生产资料包

案例贡献者可以先复制 [`skills/case-production/case.template.json`](../skills/case-production/case.template.json)，完成来源和编辑字段，再使用仓库内置的零依赖脚本：

```bash
npm run source:audit -- --input ./case.json --out ./research-packs/my-case/sources
npm run case:pack -- --input ./case.json --out ./research-packs/my-case --source-report ./research-packs/my-case/sources/source-report.json
```

来源 intake 只读取 HTTPS 页面标题、描述、canonical 和有界短摘录，输出来源状态报告；不下载图片、不保存整页内容、不生成事实。带上 `--source-report` 后，case pack 会校验案例 ID 和来源 URL，并把报告一起复制进资料包。随后 case pack 脚本会拒绝缺少来源、许可、风险或结构化字段的输入，并生成可下载、可审阅、可继续被 Agent 读取的资料包。网站和 MCP 运行时仍使用 `lib/data.ts`，合并前应把通过校验的字段同步到案例库。

## Tools

- `search_cases`
- `get_case`
- `extract_design_elements`
- `compare_cases`
- `build_research_pack`

来源证据登记不作为 MCP 工具自动写入；贡献者先用 CLI 生成并复核报告，再按 [`docs/SOURCE_INTAKE.md`](../docs/SOURCE_INTAKE.md) 选择性登记到 D1。这样 MCP 仍然只读取稳定的案例资料，避免把外部网页抓取或写入副作用隐藏在 Agent 调用里。

## 契约与错误

- `GET /api/mcp` 返回 `version`、`schemaVersion`、`protocol` 和工具索引。
- 每个响应带有 `X-Request-ID`、`X-Response-Time-Ms`、`MCP-Server-Version` 和 `MCP-Schema-Version`，便于客户端和部署日志定位请求。
- 工具业务错误保持 HTTP 200，并在 `result.isError=true`、`result.structuredContent.error` 中返回 `code`、`message` 和 `details`，方便 MCP 客户端继续处理。
- JSON-RPC 解析错误使用 `-32700`，无效请求使用 `-32600`，未知方法使用 `-32601`，服务异常使用 `-32603`。
- 每个客户端标识默认每分钟 60 次请求，并通过 `X-RateLimit-*` 响应头暴露状态；配置 D1 时 bucket 使用 `mcp_rate_limit_buckets` 持久化，没有 D1 时才退回进程内 fallback。公开无鉴权 Demo 仍不等同于完整生产配额系统。

Authentication is intentionally omitted in the demo. Production use still requires API key validation, durable rate limiting, audit logs, and a deployment-level timeout around external data sources.

## 可选生产配置

Demo 不设置以下变量，因此当前 Endpoint 保持公开。部署到自己的环境时，可以通过运行时环境变量启用 Bearer 鉴权和调整进程内限流：

```text
ARCHLENS_MCP_TOKEN=<strong-random-token>
ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE=120
```

启用后，`/api/mcp` 要求 `Authorization: Bearer <token>`；`/api/health` 会只报告 `auth: "bearer"`，不会泄露 token。健康接口的 `mcp.rateLimitStorage` 会报告当前使用 `d1` 还是 `memory`，便于确认跨实例限流是否真的生效。

来源 intake 的 D1 登记是另一个显式开关：设置 `ARCHLENS_SOURCE_INTAKE_WRITE_ENABLED=true` 后，`POST /api/source-intake` 才会写入；生产环境建议同时设置独立的 `ARCHLENS_SOURCE_INTAKE_TOKEN`，这样不会影响公开 MCP 的无鉴权配置。公开 Demo 默认关闭写入。
