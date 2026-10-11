# Agent Instructions

This repository is part of the **HarithKavish ecosystem**.

**Before changing anything**, read
[AGENT_BOOTSTRAP.md](https://github.com/HarithKavish/harithkavish-governance/blob/main/AGENT_BOOTSTRAP.md)
and follow it. See [GOVERNANCE.md](GOVERNANCE.md) for what governs this repository.

Do not begin implementation work before discovery is complete.

## Hard stops

A reminder, not the rule. These restate doctrine articles so an agent that reads nothing
else still has the guardrails. Governance is authoritative; if these ever disagree with
it, governance wins.

- Do not commit to the production branch (Article 6).
- Do not commit secrets or credentials (Article 5, SECURITY).
- Do not redefine design foundations locally (Article 4).
- Do not copy governance or the design system into this repository (Article 3).
- Do not act outside the scope you were given (Article 9).

## About this repository

A monorepo of real Model Context Protocol (MCP) tools published under the
`@harith` npm scope, plus a VS Code extension (`extension.js`) that can start/stop a
local MCP server, browse an MCP registry, and surface these tools' `contributes.mcpServers`
entries to VS Code's MCP client. Each tool under `packages/` is an independent,
spec-compliant MCP server built on `@modelcontextprotocol/sdk` — this is the shared
pattern every new tool in this repository follows on its way to the VS Code Marketplace
(and, in future, the HarithKavish store).

## Working here

- Every package under `packages/` is a real MCP server using `@modelcontextprotocol/sdk`
  (`McpServer` + a real transport) — not a hand-rolled JSON-line protocol. New tools
  follow the same shape: a `package.json` with a `bin` entry, a `README.md`, and tool
  registration via `server.registerTool(...)`.
- A tool that talks to hardware (camera, microphone, etc.) must fully release the device
  when the call completes — no MCP tool call should leave a device open or a process
  lingering after it returns.
- `packages/context-mcp-starter` is a template for scaffolding new MCP tool packages in
  this repository — keep it minimal and copy-pasteable rather than growing real business
  logic into it.
