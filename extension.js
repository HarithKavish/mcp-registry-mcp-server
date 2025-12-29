const vscode = require('vscode');
const axios = require('axios');

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

    context.subscriptions.push(listCmd, installCmd);
}

function deactivate() { }

module.exports = { activate, deactivate };
