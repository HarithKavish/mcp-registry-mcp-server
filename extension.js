const vscode = require('vscode');
const child_process = require('child_process');
const path = require('path');

let serverProcess = null;
let outputChannel = null;
let statusBar = null;

function makeOutputChannel() {
    if (!outputChannel) outputChannel = vscode.window.createOutputChannel('MCP Server');
    return outputChannel;
}

function updateStatus(text) {
    if (!statusBar) {
        statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBar.command = 'mcp.showServerLogs';
        statusBar.show();
    }
    statusBar.text = text;
}

// Registers this extension's bundled tools with VS Code's MCP client via the real
// contribution point (contributes.mcpServerDefinitionProviders +
// vscode.lm.registerMcpServerDefinitionProvider). VS Code owns spawning/lifecycle for
// these -- this is separate from, and does not replace, the manual start/stop/connect
// commands below, which manage the HTTP-transport variant on a user-chosen port.
function registerMcpProvider(context) {
    const provider = {
        provideMcpServerDefinitions: async () => [
            new vscode.McpStdioServerDefinition(
                'harith-context-mcp',
                'npx',
                ['-y', '@harith/context-mcp', '--transport', 'stdio']
            ),
            new vscode.McpStdioServerDefinition(
                'harith-camera-mcp',
                'npx',
                ['-y', '@harith/camera-mcp']
            )
        ]
    };

    context.subscriptions.push(
        vscode.lm.registerMcpServerDefinitionProvider('harithMcpTools', provider)
    );
}

function activate(context) {
    registerMcpProvider(context);

    const listCmd = vscode.commands.registerCommand('mcp.listServers', async () => {
        const config = vscode.workspace.getConfiguration('mcp');
        const serverUrl = config.get('serverUrl') || await vscode.window.showInputBox({ prompt: 'MCP server URL', value: 'https://registry.modelcontextprotocol.io/' });
        try {
            const resp = await fetch(serverUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            let items = [];
            if (Array.isArray(data)) items = data;
            else if (data.servers) items = data.servers;
            else if (data.items) items = data.items;

            const picks = items.map(i => ({ label: i.name || i.id || JSON.stringify(i), description: i.description || '' }));
            const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Select server to inspect' });
            if (pick) {
                vscode.window.showInformationMessage(`Selected: ${pick.label}`);
            }
        } catch (err) {
            vscode.window.showErrorMessage('Failed to fetch servers: ' + (err.message || err.toString()));
        }
    });

    const installCmd = vscode.commands.registerCommand('mcp.installServer', async () => {
        const config = vscode.workspace.getConfiguration('mcp');
        const serverUrl = config.get('serverUrl') || await vscode.window.showInputBox({ prompt: 'MCP registry URL', value: 'https://registry.modelcontextprotocol.io/' });
        const apiKey = config.get('apiKey') || await vscode.window.showInputBox({ prompt: 'API Key (X-API-Key)', password: true });
        const serverId = await vscode.window.showInputBox({ prompt: 'Server ID to install' });
        if (!serverId) return;

        try {
            const installUrl = serverUrl.replace(/\/$/, '') + '/install';
            const resp = await fetch(installUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({ server_id: serverId })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(JSON.stringify(data) || `HTTP ${resp.status}`);
            vscode.window.showInformationMessage(`Install request: ${data.status || 'accepted'}`);
        } catch (err) {
            vscode.window.showErrorMessage('Install failed: ' + (err.message || String(err)));
        }
    });

    const startCmd = vscode.commands.registerCommand('mcp.startServer', async () => {
        if (serverProcess) {
            vscode.window.showInformationMessage('MCP server already running');
            return;
        }
        const config = vscode.workspace.getConfiguration('mcp');
        const port = config.get('port') || 3000;
        const useNpx = config.get('useNpx') !== false; // default true

        const args = ['-y', '@harith/context-mcp', '--transport', 'http', '--port', String(port)];
        const cmd = useNpx ? 'npx' : 'node';
        const cmdArgs = useNpx ? args : [path.join(context.extensionPath || process.cwd(), 'packages', 'mcp', 'index.js'), '--transport', 'http', '--port', String(port)];

        try {
            const out = makeOutputChannel();
            out.appendLine(`Starting MCP server: ${cmd} ${cmdArgs.join(' ')}`);
            serverProcess = child_process.spawn(cmd, cmdArgs, { shell: false });
            serverProcess.stdout.on('data', (d) => out.appendLine(String(d)));
            serverProcess.stderr.on('data', (d) => out.appendLine(String(d)));
            serverProcess.on('exit', (code, sig) => {
                out.appendLine(`MCP server exited: code=${code} sig=${sig}`);
                serverProcess = null;
                updateStatus('MCP: stopped');
            });
            updateStatus('MCP: running');
            vscode.window.showInformationMessage('MCP server started');
        } catch (e) {
            vscode.window.showErrorMessage('Failed to start MCP server: ' + e.message);
        }
    });

    const stopCmd = vscode.commands.registerCommand('mcp.stopServer', async () => {
        if (!serverProcess) {
            vscode.window.showInformationMessage('MCP server is not running');
            return;
        }
        try {
            serverProcess.kill();
            serverProcess = null;
            updateStatus('MCP: stopped');
            vscode.window.showInformationMessage('MCP server stopped');
        } catch (e) {
            vscode.window.showErrorMessage('Failed to stop MCP server: ' + e.message);
        }
    });

    const showLogsCmd = vscode.commands.registerCommand('mcp.showServerLogs', async () => {
        const out = makeOutputChannel();
        out.show(true);
    });

    const connectCmd = vscode.commands.registerCommand('mcp.connectServer', async () => {
        const config = vscode.workspace.getConfiguration('mcp');
        const serverUrl = config.get('serverUrl') || await vscode.window.showInputBox({ prompt: 'MCP server URL', value: 'http://localhost:3000/mcp' });
        try {
            const resp = await fetch(serverUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            vscode.window.showInformationMessage(`MCP server: ${JSON.stringify(data).slice(0, 200)}`);
        } catch (err) {
            vscode.window.showErrorMessage('Failed to connect: ' + (err.message || String(err)));
        }
    });

    context.subscriptions.push(startCmd, stopCmd, showLogsCmd, connectCmd);

    context.subscriptions.push(listCmd, installCmd);
}

function deactivate() { }

module.exports = { activate, deactivate };
