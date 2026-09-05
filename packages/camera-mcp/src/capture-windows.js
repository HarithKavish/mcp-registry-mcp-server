const { spawn } = require('child_process');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'capture-windows.ps1');

/**
 * Runs the WinRT capture script under Windows PowerShell 5.1.
 *
 * WinRT projection (`[Type, Ns, ContentType=WindowsRuntime]`) only works under the
 * .NET Framework CLR that `powershell.exe` hosts -- PowerShell 7+ (`pwsh`) runs on
 * .NET Core/.NET 5+ and throws "Operation is not supported on this platform" for the
 * same script, so this must invoke `powershell.exe` specifically, not `pwsh`.
 */
function captureWindows({ outFile, warmupMs, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', SCRIPT_PATH,
        '-OutFile', outFile,
        '-WarmupMs', String(warmupMs)
      ],
      { windowsHide: true }
    );

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`camera capture timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`failed to launch powershell.exe: ${err.message}`));
    });

    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const jsonLine = stdout.trim().split('\n').filter(Boolean).pop();
      let result;
      try {
        result = jsonLine ? JSON.parse(jsonLine) : null;
      } catch {
        result = null;
      }

      if (code === 0 && result && result.ok) {
        resolve(result.path);
        return;
      }

      const message = (result && result.message) || stderr.trim() || `capture script exited with code ${code}`;
      reject(new Error(message));
    });
  });
}

module.exports = { captureWindows };
