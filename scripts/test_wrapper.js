const { spawn } = require('child_process');
const path = require('path');

const wrapper = path.join(__dirname, '..', 'packages', 'mcp', 'index.js');

console.log('Spawning wrapper:', wrapper);

const child = spawn(process.execPath, [wrapper, '--transport', 'stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });

let stdout = '';
let stderr = '';

child.stdout.on('data', (d) => {
    const s = d.toString();
    stdout += s;
    process.stdout.write('[child-stdout] ' + s);
});

child.stderr.on('data', (d) => {
    const s = d.toString();
    stderr += s;
    process.stderr.write('[child-stderr] ' + s);
});

child.on('exit', (code, sig) => {
    console.log(`child exited code=${code} sig=${sig}`);
    process.exit(code === 0 ? 0 : 1);
});

child.on('error', (err) => {
    console.error('child error', err);
    process.exit(2);
});

(async () => {
    // wait for ready on stderr (readonly)
    const ready = await waitForStringIn(stderrGetter, 'stdio transport ready', 3000);
    if (!ready) {
        console.error('Did not see ready message on stderr; continuing anyway');
    }

    // send a JSON line to stdin
    const msg = { query: 'info', apiKey: 'TEST' };
    child.stdin.write(JSON.stringify(msg) + '\n');

    // wait for echo response on stdout
    const got = await waitForStringIn(stdoutGetter, '"echo"', 3000);
    if (!got) {
        console.error('Did not receive echo response on stdout');
        // kill child and exit with failure
        child.kill();
        return;
    }
    console.log('Received echo response on stdout');

    // send SIGTERM to test killability
    console.log('Sending SIGTERM to child');
    child.kill();
})();

function stderrGetter() { return stderr; }
function stdoutGetter() { return stdout; }

function waitForStringIn(getter, substr, timeout) {
    return new Promise((resolve) => {
        const start = Date.now();
        const iv = setInterval(() => {
            if (getter().includes(substr)) {
                clearInterval(iv);
                resolve(true);
                return;
            }
            if (Date.now() - start > timeout) {
                clearInterval(iv);
                resolve(false);
            }
        }, 100);
    });
}
