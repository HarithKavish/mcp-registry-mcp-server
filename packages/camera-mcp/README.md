# @harith/camera-mcp

A real MCP server (`@modelcontextprotocol/sdk`, stdio transport) exposing one tool:

### `capture_photo`

Opens the local webcam, takes a single still photo, immediately closes/releases the
camera, and returns the photo as an MCP image content block (base64 JPEG) so an agent
can show it directly in chat.

| Input      | Type   | Default | Description                                              |
|------------|--------|---------|------------------------------------------------------------|
| `warmupMs` | number | `1200`  | Milliseconds to let auto-exposure/white-balance settle first |

## Platform support

- **Windows** — implemented via the `Windows.Media.Capture` WinRT API (the same stack
  the built-in Camera app uses), run through Windows PowerShell 5.1 (`powershell.exe`).
  No extra binaries (ffmpeg, drivers, etc.) required.
- **macOS / Linux** — not implemented yet. Calling `capture_photo` on those platforms
  returns a clear `isError` result rather than crashing.

## Usage

```bash
npx -y @harith/camera-mcp
```

Add it to any MCP-compatible client's server list, e.g. VS Code's `contributes.mcpServers`:

```json
{
  "name": "harith-camera-mcp",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@harith/camera-mcp"]
}
```

## Local development

```bash
npm install   # from the repo root (npm workspaces)
node packages/camera-mcp/bin/index.js
```

## How it works

1. Node spawns `powershell.exe` (not `pwsh` — WinRT projection only works under the
   .NET Framework CLR that Windows PowerShell 5.1 hosts) running
   `scripts/capture-windows.ps1`.
2. The script initializes `Windows.Media.Capture.MediaCapture`, waits `warmupMs` for
   auto-exposure to settle, captures one JPEG to a temp file, and disposes the
   `MediaCapture` object — which releases the camera device immediately.
3. Node reads the temp file, base64-encodes it, deletes it, and returns it as an
   `image` content block.
