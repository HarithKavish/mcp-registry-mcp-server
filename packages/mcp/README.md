# @harith/context-mcp (minimal)

This package provides a minimal MCP transport wrapper for testing registry integration.

Usage (http):

```bash
# start HTTP transport on port 3000
node index.js --transport http --port 3000 --api-key MYKEY
# or via npx (when published):
npx -y @harith/context-mcp --transport http --port 3000 --api-key MYKEY
```

Request:

```
curl -H "x-api-key: MYKEY" http://localhost:3000/mcp
```

Usage (stdio):

```bash
node index.js --transport stdio --api-key MYKEY
# send JSON lines to stdin and receive JSON lines on stdout
echo '{"query":"info","apiKey":"MYKEY"}' | node index.js --transport stdio
```
# @harith/context-mcp (minimal)

This package provides a minimal MCP transport wrapper for testing registry integration.

Usage (http):

```bash
# start HTTP transport on port 3000
node index.js --transport http --port 3000 --api-key MYKEY
# or via npx (when published):
npx -y @harith/context-mcp --transport http --port 3000 --api-key MYKEY
```

Request:

```
curl -H "x-api-key: MYKEY" http://localhost:3000/mcp
```

Usage (stdio):

```bash
node index.js --transport stdio --api-key MYKEY
# send JSON lines to stdin and receive JSON lines on stdout
echo '{"query":"info","apiKey":"MYKEY"}' | node index.js --transport stdio
```
