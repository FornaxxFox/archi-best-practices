# ArchLens MCP

ArchLens exposes a real no-auth Streamable HTTP MCP-compatible endpoint at `/api/mcp`.
当前契约版本为 `1.0.0`，服务版本为 `0.2.0`。

## Connection

把 MCP 客户端的远程 HTTP 地址指向：

```text
https://<your-domain>/api/mcp
```

Endpoint 支持 `initialize`、`tools/list`、`tools/call` 和 `resources/list`，与网站使用同一份精选案例数据。不绑定模型供应商，客户端可以把返回的结构化上下文交给自己的 Agent 或模型。

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

不同客户端的配置入口和字段名可能不同，请以客户端当前文档为准；核心连接信息只有 Endpoint URL。

## Tools

- `search_cases`
- `get_case`
- `extract_design_elements`
- `compare_cases`
- `build_research_pack`

## 契约与错误

- `GET /api/mcp` 返回 `version`、`schemaVersion`、`protocol` 和工具索引。
- 每个响应带有 `X-Request-ID`、`X-Response-Time-Ms`、`MCP-Server-Version` 和 `MCP-Schema-Version`，便于客户端和部署日志定位请求。
- 工具业务错误保持 HTTP 200，并在 `result.isError=true`、`result.structuredContent.error` 中返回 `code`、`message` 和 `details`，方便 MCP 客户端继续处理。
- JSON-RPC 解析错误使用 `-32700`，无效请求使用 `-32600`，未知方法使用 `-32601`，服务异常使用 `-32603`。
- Demo 对单个客户端标识做进程内 60 次/分钟的尽力限流，并通过 `X-RateLimit-*` 响应头暴露状态。无鉴权和无持久化限流不适合生产环境。

Authentication is intentionally omitted in the demo. Production use still requires API key validation, durable rate limiting, audit logs, and a deployment-level timeout around external data sources.
