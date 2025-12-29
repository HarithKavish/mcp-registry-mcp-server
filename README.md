# MCP Server — VS Code Extension

This extension provides MCP (Model Context Protocol) server tooling from inside VS Code:
- Start and stop a local MCP server (subprocess via `npx` or local package)
- Connect to a running MCP HTTP/stdio server
- List registry entries and request installs from MCP registries

See the `packages/mcp` minimal example for a local MCP transport implementation.

To run locally:

```bash
cd mcp-registry-mcp-server
npm install
code --extensionDevelopmentPath=.
```
