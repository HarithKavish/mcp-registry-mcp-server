// Smoke test for packages/context-mcp-starter: connects a real MCP client over stdio
// and calls the starter's `echo` tool.
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

(async () => {
  const bin = path.join(__dirname, '..', 'packages', 'context-mcp-starter', 'bin', 'index.js');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [bin, '--transport', 'stdio']
  });

  const client = new Client({ name: 'test_starter_wrapper', version: '0.0.1' });
  await client.connect(transport);

  const result = await client.callTool({ name: 'echo', arguments: { text: 'hello' } });
  const text = result.content.find((c) => c.type === 'text')?.text;
  if (text !== 'hello') {
    throw new Error(`expected echo to return 'hello', got: ${JSON.stringify(result)}`);
  }

  console.log('OK: context-mcp-starter echo tool round-tripped over real MCP stdio transport');
  await client.close();
  process.exit(0);
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
