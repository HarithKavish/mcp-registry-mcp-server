# MCP Server — VS Code Extension

A VS Code extension that manages local MCP (Model Context Protocol) servers, plus the
real, spec-compliant MCP tool packages themselves:

| Package | What it does |
|---|---|
| [`packages/mcp`](packages/mcp) (`@harith/context-mcp`) | `echo` / `server_info` tools; the transport this repo verifies against |
| [`packages/camera-mcp`](packages/camera-mcp) (`@harith/camera-mcp`) | `capture_photo` — open the webcam, take one photo, close it, return the image |
| [`packages/context-mcp-starter`](packages/context-mcp-starter) | Copy-paste starter template for scaffolding a new tool package here |

Every package is built on `@modelcontextprotocol/sdk` and speaks real MCP (JSON-RPC 2.0
over stdio or Streamable HTTP) — this is the shared shape every tool in this repository
follows on its way to the VS Code Marketplace.

The extension itself (`extension.js`) can start/stop a local MCP server, browse an MCP
registry, and is what surfaces `contributes.mcpServers` to VS Code's MCP client.

Governed by the HarithKavish ecosystem — see [GOVERNANCE.md](GOVERNANCE.md) and
[AGENTS.md](AGENTS.md).

## Adding a new tool

1. Copy `packages/context-mcp-starter` to `packages/<your-tool>`.
2. Rename it in `package.json` (`name`, `bin`, `description`).
3. Replace the `echo` tool in `bin/index.js` with `server.registerTool(...)` calls for
   your real tool(s).
4. Add an entry under `contributes.mcpServers` in the root `package.json` if it should
   be surfaced by this extension.
5. Run `npm install` at the repo root (npm workspaces) and add a smoke test under
   `scripts/`, following `scripts/test_wrapper.js`.

To run locally:

```bash
npm install
code --extensionDevelopmentPath=.
```
