#!/usr/bin/env node
// Starter template: copy this package to scaffold a new MCP tool in this repository.
// Replace the `echo` tool below with real tool(s), keep the CLI flags and transport
// wiring, and give the package its own name/bin/description in package.json.
const http = require('http');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

const NAME = 'harith-context-mcp-starter';
const VERSION = require('../package.json').version;

function parseArgs(argv) {
  const args = { transport: 'stdio', port: 8080, apiKey: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--transport' && argv[i + 1]) { args.transport = argv[++i]; continue; }
    if (a === '--port' && argv[i + 1]) { args.port = Number(argv[++i]); continue; }
    if (a === '--api-key' && argv[i + 1]) { args.apiKey = argv[++i]; continue; }
  }
  return args;
}

const ARGS = parseArgs(process.argv);

function buildServer() {
  const server = new McpServer({ name: NAME, version: VERSION });

  // Replace this with your tool(s).
  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description: 'Echoes back whatever text is sent to it.',
      inputSchema: { text: z.string().describe('Text to echo back') }
    },
    async ({ text }) => ({ content: [{ type: 'text', text }] })
  );

  return server;
}

async function runStdio() {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
  console.error(`${NAME} stdio ready`);
}

function runHttp() {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    if (ARGS.apiKey) {
      const key = req.headers['x-api-key'] || req.headers['authorization'];
      if (!key || !key.includes(ARGS.apiKey)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
    }
    transport.handleRequest(req, res);
  });

  httpServer.listen(ARGS.port, () => console.error(`${NAME} http listening on ${ARGS.port}`));
  process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
  process.on('SIGINT', () => httpServer.close(() => process.exit(0)));
}

if (ARGS.transport === 'http') runHttp(); else runStdio();

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', String(err));
  process.exit(1);
});
