const { spawn } = require('child_process');
const path = require('path');

(async function () {
    const bin = path.join(__dirname, '..', 'packages', 'context-mcp-starter', 'bin', 'index.js');
    const child = spawn(process.execPath, [bin, '--transport', 'stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', d => {
        stderr += d.toString();
        process.stdout.write('[child-stderr] ' + d.toString());
    });

    let stdout = '';
    child.stdout.on('data', d => {
        stdout += d.toString();
        process.stdout.write('[child-stdout] ' + d.toString());
    });

    // wait for ready message on stderr
    await new Promise((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('timeout waiting for ready')), 3000);
        const onData = () => {
            if (stderr.includes('stdio ready')) {
                clearTimeout(to);
                resolve();
            }
        };
        child.stderr.on('data', onData);
    }).catch(e => { console.error(e); child.kill(); process.exit(1); });

    // send JSON request
    const req = { id: 1, method: 'echo', params: { msg: 'hello' } };
    child.stdin.write(JSON.stringify(req) + '\n');

    // wait for response
    await new Promise((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('timeout waiting for response')), 3000);
        const onData = () => {
            if (stdout.includes('"echo"')) {
                clearTimeout(to);
                resolve();
            }
        };
        child.stdout.on('data', onData);
    }).catch(e => { console.error(e); child.kill(); process.exit(1); });

    // request shutdown
    child.kill('SIGTERM');
    const code = await new Promise(r => child.on('exit', r));
    console.log('child exited with', code);
    process.exit(code === 0 ? 0 : 1);
})();
