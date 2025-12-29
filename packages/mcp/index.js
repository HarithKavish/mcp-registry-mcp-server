#!/usr/bin/env node
const http = require('http');

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
const transport = (argv.transport || 'stdio');
const port = parseInt(argv.port || process.env.PORT || '3000', 10);
const apiKey = argv['api-key'] || process.env.CONTEXT7_API_KEY || null;

function checkApiKeyHeader(req) {
  if (!apiKey) return true;
  const header = req.headers['x-api-key'] || req.headers['authorization'];
  if (!header) return false;
  if (header.startsWith('Bearer ')) return header.slice(7) === apiKey;
  return header === apiKey;
}

if (transport === 'http') {
  const server = http.createServer((req, res) => {
    if (req.url === '/mcp') {
      if (!checkApiKeyHeader(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
      const body = {
        ok: true,
        name: 'harith-context-mcp',
        transport: 'http',
        version: '0.0.1'
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });

  server.listen(port, () => {
    console.error(`harith-mcp http transport listening on port ${port}`);
  });
} else {
  // stdio transport: simple JSON line protocol
  process.stdin.setEncoding('utf8');
  let buf = '';
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (apiKey && msg.apiKey && msg.apiKey !== apiKey) {
          process.stdout.write(JSON.stringify({ error: 'unauthorized' }) + '\n');
          continue;
        }
        // Echo minimal MCP response
        const resp = { ok: true, name: 'harith-context-mcp', transport: 'stdio', echo: msg };
        process.stdout.write(JSON.stringify(resp) + '\n');
      } catch (e) {
        process.stdout.write(JSON.stringify({ error: 'invalid_json' }) + '\n');
      }
    }
  });
  console.error('harith-mcp stdio transport ready');
}

// Handle termination signals so VS Code can kill/restart reliably
function shutdown(code = 0) {
  try {
    console.error('harith-mcp shutting down');
  } catch (e) { }
  process.exit(code);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
process.on('uncaughtException', (err) => {
  try { console.error('unhandled exception', err && err.stack ? err.stack : String(err)); } catch (e) { }
  shutdown(1);
});
#!/usr/bin / env node
const http = require('http');

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
const transport = (argv.transport || 'stdio');
const port = parseInt(argv.port || process.env.PORT || '3000', 10);
const apiKey = argv['api-key'] || process.env.CONTEXT7_API_KEY || null;

function checkApiKeyHeader(req) {
  if (!apiKey) return true;
  const header = req.headers['x-api-key'] || req.headers['authorization'];
  if (!header) return false;
  if (header.startsWith('Bearer ')) return header.slice(7) === apiKey;
  return header === apiKey;
}

if (transport === 'http') {
  const server = http.createServer((req, res) => {
    if (req.url === '/mcp') {
      if (!checkApiKeyHeader(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
      const body = {
        ok: true,
        name: 'harith-context-mcp',
        transport: 'http',
        version: '0.0.1'
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });

  server.listen(port, () => {
    console.log(`harith-mcp http transport listening on port ${port}`);
  });
} else {
  // stdio transport: simple JSON line protocol
  process.stdin.setEncoding('utf8');
  let buf = '';
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (apiKey && msg.apiKey && msg.apiKey !== apiKey) {
          process.stdout.write(JSON.stringify({ error: 'unauthorized' }) + '\n');
          continue;
        }
        // Echo minimal MCP response
        const resp = { ok: true, name: 'harith-context-mcp', transport: 'stdio', echo: msg };
        process.stdout.write(JSON.stringify(resp) + '\n');
      } catch (e) {
        process.stdout.write(JSON.stringify({ error: 'invalid_json' }) + '\n');
      }
    }
  });
  console.log('harith-mcp stdio transport ready');
}
