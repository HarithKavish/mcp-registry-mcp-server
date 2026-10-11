#!/usr/bin/env node
const http = require('http');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

const NAME = 'harith-context-mcp';
const VERSION = require('./package.json').version;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[key] = val;
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));
const transportKind = argv.transport || 'stdio';
const port = parseInt(argv.port || process.env.PORT || '3000', 10);
const apiKey = argv['api-key'] || process.env.CONTEXT7_API_KEY || null;

function buildServer() {
  const server = new McpServer({ name: NAME, version: VERSION });

  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description: 'Echoes back whatever text is sent to it. Used to verify the MCP transport is wired up correctly.',
      inputSchema: { text: z.string().describe('Text to echo back') }
    },
    async ({ text }) => ({ content: [{ type: 'text', text }] })
  );

  server.registerTool(
    'server_info',
    {
      title: 'Server info',
      description: 'Returns this server\'s name, version, and active transport.',
      inputSchema: {}
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify({ name: NAME, version: VERSION, transport: transportKind }) }]
    })
  );

  return server;
}

function checkApiKeyHeader(req) {
  if (!apiKey) return true;
  const header = req.headers['x-api-key'] || req.headers['authorization'];
  if (!header) return false;
  if (header.startsWith('Bearer ')) return header.slice(7) === apiKey;
  return header === apiKey;
}

async function runStdio() {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
  console.error(`${NAME} stdio transport ready`);
}

function runHttp() {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    if (req.url !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    if (!checkApiKeyHeader(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    transport.handleRequest(req, res);
  });

  httpServer.listen(port, () => {
    console.error(`${NAME} http transport listening on port ${port}`);
  });

  process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
  process.on('SIGINT', () => httpServer.close(() => process.exit(0)));
}

if (transportKind === 'http') {
  runHttp();
} else {
  runStdio();
}

process.on('uncaughtException', (err) => {
  console.error('unhandled exception', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
