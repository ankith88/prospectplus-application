import { execFile } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Runs a CLI command (mcporter, opencli, etc.) with extended PATH containing
 * standard Homebrew, user-local, and Python venv bin directories.
 */
export async function runCliCommand(
  cmd: string,
  args: string[],
  options: { timeoutMs?: number; env?: Record<string, string> } = {}
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs || 20000;
  const homeDir = os.homedir();
  const extraPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    path.join(homeDir, '.agent-reach-venv/bin'),
    path.join(homeDir, '.local/bin'),
  ].join(':');

  const env = {
    ...process.env,
    PATH: `${extraPaths}:${process.env.PATH || ''}`,
    ...(options.env || {}),
  };

  return new Promise((resolve) => {
    execFile(cmd, args, { env, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          stdout: stdout || '',
          stderr: stderr || err.message,
          code: (err as any).code || 1,
        });
      } else {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          code: 0,
        });
      }
    });
  });
}

/**
 * Fetch a webpage cleanly converted to Markdown via Jina Reader.
 * Handles dynamic JavaScript rendering and removes cookie/nav boilerplate.
 */
export async function fetchWithJinaReader(url: string, timeoutMs: number = 10000): Promise<string> {
  try {
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    const jinaUrl = `https://r.jina.ai/${target}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'MailPlus-ProspectPlus/1.0',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) {
      return '';
    }
    const text = await resp.text();
    return text || '';
  } catch {
    return '';
  }
}
