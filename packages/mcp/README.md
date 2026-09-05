# @harith/context-mcp

A real MCP server (built on `@modelcontextprotocol/sdk`) exposing `echo` and
`server_info` tools, used to verify the MCP transport end-to-end. Speak to it with any
MCP client, not with raw `curl`/JSON lines -- both transports below are real JSON-RPC
2.0 over the standard MCP wire format.

Usage (stdio -- what VS Code and other MCP clients use):

```bash
node index.js --transport stdio
# or via npx (when published):
npx -y @harith/context-mcp --transport stdio
```

Usage (http -- Streamable HTTP transport):

```bash
node index.js --transport http --port 3000 --api-key MYKEY
```

Connect with an MCP client (e.g. the SDK's `StreamableHTTPClientTransport`) at
`http://localhost:3000/mcp`, sending `x-api-key: MYKEY` or `Authorization: Bearer MYKEY`.
