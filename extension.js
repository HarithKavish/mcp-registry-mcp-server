const vscode = require('vscode');
const axios = require('axios');
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

function activate(context) {
    const listCmd = vscode.commands.registerCommand('mcp.listServers', async () => {
        const config = vscode.workspace.getConfiguration('mcp');
        const serverUrl = config.get('serverUrl') || await vscode.window.showInputBox({ prompt: 'MCP server URL', value: 'https://registry.modelcontextprotocol.io/' });
        try {
            const resp = await axios.get(serverUrl);
            const data = resp.data;
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
            const resp = await axios.post(installUrl, { server_id: serverId }, { headers: { 'X-API-Key': apiKey } });
            vscode.window.showInformationMessage(`Install request: ${resp.data.status || 'accepted'}`);
        } catch (err) {
            const msg = err.response && err.response.data ? JSON.stringify(err.response.data) : (err.message || String(err));
            vscode.window.showErrorMessage('Install failed: ' + msg);
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
            const resp = await axios.get(serverUrl);
            vscode.window.showInformationMessage(`MCP server: ${JSON.stringify(resp.data).slice(0,200)}`);
        } catch (err) {
            vscode.window.showErrorMessage('Failed to connect: ' + (err.message || String(err)));
        }
    });

    context.subscriptions.push(startCmd, stopCmd, showLogsCmd, connectCmd);

    context.subscriptions.push(listCmd, installCmd);
}

function deactivate() { }

module.exports = { activate, deactivate };
