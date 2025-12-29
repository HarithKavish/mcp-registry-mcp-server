# context-mcp-starter

Minimal MCP server starter supporting `stdio` and `http` transports.

Usage:

StdIO (suitable for VS Code MCP lifecycle):

```
node ./bin/index.js --transport stdio
```

HTTP:

```
node ./bin/index.js --transport http --port 8080 --api-key secret
curl -X POST http://localhost:8080/mcp -H 'Content-Type: application/json' -d '{"method":"info"}'
```

Behavior for VS Code lifecycle:
- writes readiness and logs to stderr only
- reads newline-delimited JSON from stdin and writes JSON responses to stdout
- handles SIGTERM/SIGINT gracefully
