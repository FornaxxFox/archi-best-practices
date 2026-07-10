# ArchLens MCP

The demo exposes a real no-auth MCP-compatible HTTP endpoint at `/api/mcp`.

## Connection

Point an MCP client at:

```text
https://<your-domain>/api/mcp
```

The endpoint supports `initialize`, `tools/list`, `tools/call`, and `resources/list`. It is backed by the same curated case data used by the website. No model provider is bundled; clients can use the returned structured context with their own agent or model.

## Tools

- `search_cases`
- `get_case`
- `extract_design_elements`
- `compare_cases`
- `build_research_pack`

Authentication is intentionally omitted in the demo. Add API key validation and rate limiting before production use.

