#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const readline = require('readline');

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
const NAME = 'harith-context-mcp-starter';
let shuttingDown = false;

function safeLog(...args) { console.error(...args); }

function handleMessage(msg) {
    // very small dispatcher: if method === 'echo' return params, else return info
    const res = { id: msg.id || null };
    try {
        if (msg.method === 'echo') {
            res.result = { echo: msg.params };
        } else if (msg.method === 'info') {
            res.result = { name: NAME, transport: ARGS.transport };
        } else {
            res.result = { ok: true, method: msg.method || 'unknown' };
        }
    } catch (e) {
        res.error = { message: String(e) };
    }
    return res;
}

function runStdIO() {
    // Announce readiness to stderr so controllers can detect lifecycle
    safeLog(`${NAME} stdio ready`);

    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on('line', (line) => {
        if (shuttingDown) return;
        line = line.trim();
        if (!line) return;
        let obj;
        try {
            obj = JSON.parse(line);
        } catch (e) {
            // malformed -- write error JSON to stdout
            const err = { id: null, error: { message: 'invalid_json' } };
            process.stdout.write(JSON.stringify(err) + '\n');
            return;
        }
        const out = handleMessage(obj);
        // MUST NOT write logs to stdout besides JSON
        process.stdout.write(JSON.stringify(out) + '\n');
    });

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('uncaughtException', (err) => {
        safeLog('uncaughtException', String(err));
        // attempt graceful shutdown
        shutdown();
    });

    function shutdown() {
        if (shuttingDown) return;
        shuttingDown = true;
        safeLog(`${NAME} shutting down`);
        // allow a short timeout then exit
        setTimeout(() => process.exit(0), 200);
    }
}

function runHTTP() {
    const server = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/mcp') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'not_found' }));
            return;
        }
        if (ARGS.apiKey) {
            const key = req.headers['x-api-key'] || req.headers['authorization'];
            if (!key || (!key.includes(ARGS.apiKey))) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'unauthorized' }));
                return;
            }
        }
        let body = '';
        req.on('data', (c) => body += c.toString());
        req.on('end', () => {
            let msg;
            try { msg = JSON.parse(body); } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid_json' }));
                return;
            }
            const out = handleMessage(msg);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(out));
        });
    });
    server.listen(ARGS.port, () => safeLog(`${NAME} http listening on ${ARGS.port}`));
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
    process.on('SIGINT', () => server.close(() => process.exit(0)));
}

if (ARGS.transport === 'http') runHTTP(); else runStdIO();
