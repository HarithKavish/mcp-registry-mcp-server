# context-mcp-starter

Starter template for a real MCP server (`@modelcontextprotocol/sdk`, stdio + http
transport). Copy this package to scaffold a new tool in this repository: rename it,
replace the `echo` tool in `bin/index.js` with your own via `server.registerTool(...)`,
and update `package.json`'s `name`/`description`/`bin`.

Usage:

StdIO (suitable for VS Code's MCP lifecycle):

```
node ./bin/index.js --transport stdio
```

HTTP (Streamable HTTP transport):

```
node ./bin/index.js --transport http --port 8080 --api-key secret
```

Behavior for VS Code lifecycle:
- writes readiness and logs to stderr only
- speaks real MCP (JSON-RPC 2.0) on stdin/stdout, not a custom line protocol
- handles SIGTERM/SIGINT gracefully
