#!/usr/bin/env node
const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const { captureWindows } = require('../src/capture-windows.js');

const server = new McpServer({
  name: 'harith-camera-mcp',
  version: require('../package.json').version
});

server.registerTool(
  'capture_photo',
  {
    title: 'Capture photo',
    description:
      'Opens the local webcam, takes a single still photo, immediately closes/releases ' +
      'the camera, and returns the photo as an image so it can be shown in chat.',
    inputSchema: {
      warmupMs: z
        .number()
        .int()
        .min(0)
        .max(5000)
        .default(1200)
        .describe('Milliseconds to let auto-exposure/white-balance settle before the shot.')
    }
  },
  async ({ warmupMs }) => {
    if (process.platform !== 'win32') {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `capture_photo is not implemented for platform "${process.platform}" yet ` +
              '(Windows-only in this version).'
          }
        ]
      };
    }

    const tmpFile = path.join(os.tmpdir(), `camera-mcp-${crypto.randomUUID()}.jpg`);

    try {
      await captureWindows({ outFile: tmpFile, warmupMs, timeoutMs: 15000 });
      const buffer = await fs.readFile(tmpFile);
      return {
        content: [
          {
            type: 'image',
            data: buffer.toString('base64'),
            mimeType: 'image/jpeg'
          },
          {
            type: 'text',
            text: 'Captured a photo from the webcam and closed the camera.'
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `camera capture failed: ${err.message}` }]
      };
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('harith-camera-mcp: ready (stdio)');
}

main().catch((err) => {
  console.error('harith-camera-mcp: fatal error', err);
  process.exit(1);
});
