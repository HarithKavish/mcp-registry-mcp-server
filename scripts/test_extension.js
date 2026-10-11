// Exercises the extension's activation path (finding #3 on PR #1: it was never run).
// Stubs the 'vscode' module via Module._load and calls activate() directly, then
// drives the registered command handlers with a stubbed fetch -- no VS Code binary
// required, so it runs on a bare checkout with plain `node`.
//
// Covers:
//   - the MCP provider is OPT-IN: nothing is registered unless mcp.registerNpmServers
//     is true (the @harith/* packages are not on npm yet, so a default-on registration
//     would create servers that fail on every start)
//   - when enabled, the provider declares both servers with the right command/args
//   - mcp.installServer error handling: non-JSON body -> "HTTP <status>" (not "{}"),
//     JSON null body -> "HTTP <status>" (not a TypeError), JSON object body -> the body
//   - mcp.listServers tolerates a JSON null body without throwing
const path = require('path');
const Module = require('module');

let registered = [];      // calls to lm.registerMcpServerDefinitionProvider
let messages = [];        // showInformationMessage / showErrorMessage calls
let commands = {};        // command id -> handler, captured from registerCommand
let configValues = {};    // what workspace.getConfiguration('mcp').get() returns

function makeVscodeStub() {
    class McpStdioServerDefinition {
        constructor(label, command, args) {
            this.label = label;
            this.command = command;
            this.args = args;
        }
    }
    const disposables = [];
    return {
        McpStdioServerDefinition,
        StatusBarAlignment: { Right: 2 },
        window: {
            showInputBox: async (opts) => (opts && opts.prompt === 'Server ID to install' ? 'test-server' : 'http://registry.test'),
            showInformationMessage: (m) => messages.push({ kind: 'info', m }),
            showErrorMessage: (m) => messages.push({ kind: 'error', m }),
            showQuickPick: async (items) => { messages.push({ kind: 'pick', m: `${items.length} items` }); return undefined; },
            createOutputChannel: () => ({ appendLine: () => {}, show: () => {} }),
            createStatusBarItem: () => ({ show: () => {}, text: '' })
        },
        workspace: {
            getConfiguration: () => ({ get: (key) => configValues[key] })
        },
        commands: {
            registerCommand: (id, handler) => { commands[id] = handler; return { dispose: () => {} }; }
        },
        lm: {
            registerMcpServerDefinitionProvider: (id, provider) => {
                registered.push({ id, provider });
                return { dispose: () => {} };
            }
        },
        _disposables: disposables
    };
}

function loadExtensionFresh(vscodeStub) {
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === 'vscode') return vscodeStub;
        return originalLoad.apply(this, arguments);
    };
    try {
        delete require.cache[require.resolve(path.join(__dirname, '..', 'extension.js'))];
        return require(path.join(__dirname, '..', 'extension.js'));
    } finally {
        Module._load = originalLoad;
  }
}

function activateFresh() {
    registered = []; messages = []; commands = {};
    const stub = makeVscodeStub();
    const ext = loadExtensionFresh(stub);
    const context = { subscriptions: [], extensionPath: '/tmp' };
    ext.activate(context);
    return stub;
}

let failures = 0;
function check(name, cond) {
    if (cond) { console.log(`ok - ${name}`); }
    else { failures++; console.error(`FAIL - ${name}`); }
}

(async () => {
    // 1. Provider is opt-in: default config registers nothing.
    configValues = {};
    activateFresh();
    check('no provider registered by default (npm packages unpublished)', registered.length === 0);

    // 2. Enabled config registers both servers with the right command and args.
    configValues = { registerNpmServers: true };
    activateFresh();
    check('provider registered when mcp.registerNpmServers is true', registered.length === 1 && registered[0].id === 'harithMcpTools');
    const defs = await registered[0].provider.provideMcpServerDefinitions();
    check('two server definitions', defs.length === 2);
    check('context server: npx -y @harith/context-mcp',
        defs[0].label === 'harith-context-mcp' && defs[0].command === 'npx' &&
        defs[0].args.join(' ').includes('@harith/context-mcp'));
    check('camera server: npx -y @harith/camera-mcp',
        defs[1].label === 'harith-camera-mcp' && defs[1].command === 'npx' &&
        defs[1].args.join(' ').includes('@harith/camera-mcp'));

    // 3. installServer: 502 with an HTML (non-JSON) body -> status surfaced, not "{}".
    globalThis.fetch = async () => ({ ok: false, status: 502, json: () => Promise.reject(new Error('not json')) });
    configValues = {};
    activateFresh();
    await commands['mcp.installServer']();
    check('non-JSON 502 surfaces "HTTP 502"',
        messages.some(m => m.kind === 'error' && m.m.includes('HTTP 502')));
    check('non-JSON 502 does not surface "{}"', !messages.some(m => m.m.includes('{}')));

    // 4. installServer: 502 whose body is the JSON literal `null` -> status, no TypeError.
    messages = [];
    globalThis.fetch = async () => ({ ok: false, status: 502, json: () => Promise.resolve(null) });
    await commands['mcp.installServer']();
    check('JSON null 502 surfaces "HTTP 502"', messages.some(m => m.kind === 'error' && m.m.includes('HTTP 502')));
    check('JSON null 502 raises no TypeError', !messages.some(m => m.m.includes('Cannot convert')));

    // 5. installServer: 502 with a JSON object body -> the body is surfaced.
    messages = [];
    globalThis.fetch = async () => ({ ok: false, status: 400, json: () => Promise.resolve({ error: 'invalid server id' }) });
    await commands['mcp.installServer']();
    check('JSON object 400 surfaces the body', messages.some(m => m.m.includes('invalid server id')));

    // 6. installServer: 200 with JSON null body -> success path must not throw.
    messages = [];
    globalThis.fetch = async () => ({ ok: true, status: 200, json: () => Promise.resolve(null) });
    await commands['mcp.installServer']();
    check('JSON null 200 falls back to "accepted", not TypeError',
        messages.some(m => m.kind === 'info' && m.m.includes('accepted')));

    // 7. listServers: 200 with JSON null body -> no TypeError, empty pick list.
    messages = [];
    globalThis.fetch = async () => ({ ok: true, status: 200, json: () => Promise.resolve(null) });
    await commands['mcp.listServers']();
    check('listServers tolerates JSON null body', !messages.some(m => m.kind === 'error' && (m.m.includes('Cannot read') || m.m.includes('Cannot convert'))));

    if (failures > 0) {
        console.error(`FAILED: ${failures} check(s) failed`);
        process.exit(1);
    }
    console.log('OK: extension activation path, provider gating and install/list error handling all pass');
    process.exit(0);
})().catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
});
