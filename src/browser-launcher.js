import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assertFlowUrl } from './security.js';

const FLOW_URL = 'https://labs.google/fx/tools/flow';

function assertPort(cdpPort) {
  if (!Number.isInteger(cdpPort) || cdpPort < 1 || cdpPort > 65535) {
    throw new Error('CDP port must be an integer between 1 and 65535.');
  }
}

export function getDedicatedProfileDir(env = process.env, platform = process.platform) {
  if (platform === 'win32') {
    if (!env.LOCALAPPDATA) throw new Error('LOCALAPPDATA is required to create the dedicated Flow profile path.');
    return path.join(env.LOCALAPPDATA, 'GoogleFlowSafeMCP', 'chrome-profile');
  }
  if (platform === 'darwin') return path.join(env.HOME ?? '', 'Library', 'Application Support', 'GoogleFlowSafeMCP', 'chrome-profile');
  return path.join(env.XDG_DATA_HOME ?? path.join(env.HOME ?? '', '.local', 'share'), 'GoogleFlowSafeMCP', 'chrome-profile');
}

function assertDedicatedProfileDir(profileDir) {
  const normalized = String(profileDir).replaceAll('\\', '/').toLowerCase();
  if (!normalized.includes('/googleflowsafemcp/chrome-profile')) {
    throw new Error('Chrome must use the dedicated GoogleFlowSafeMCP profile directory.');
  }
}

export function buildChromeArgs({ cdpPort, profileDir, flowUrl = FLOW_URL }) {
  assertPort(cdpPort);
  assertDedicatedProfileDir(profileDir);
  const flow = assertFlowUrl(flowUrl);
  return [
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    flow.href
  ];
}

export function resolveChromeExecutable({ env = process.env, platform = process.platform, exists = existsSync } = {}) {
  const candidates = platform === 'win32'
    ? [
        env.ProgramFiles && path.join(env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        env['ProgramFiles(x86)'] && path.join(env['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
      ]
    : platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  const executable = candidates.filter(Boolean).find(exists);
  if (!executable) throw new Error('Google Chrome was not found. Install Google Chrome, then run npm start again.');
  return executable;
}

export function launchDedicatedChrome({ executable, cdpPort, profileDir, flowUrl = FLOW_URL, spawnImpl = spawn }) {
  const args = buildChromeArgs({ cdpPort, profileDir, flowUrl });
  const child = spawnImpl(executable, args, { detached: true, shell: false, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { launched: true, cdpPort };
}

export async function isCdpReady(cdpPort, fetchImpl = fetch) {
  assertPort(cdpPort);
  try {
    const response = await fetchImpl(`http://127.0.0.1:${cdpPort}/json/version`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureDedicatedChrome({
  cdpPort = 9222,
  profileDir = getDedicatedProfileDir(),
  executable = resolveChromeExecutable(),
  flowUrl = FLOW_URL,
  isCdpReady: ready = isCdpReady,
  launch = launchDedicatedChrome,
  wait = delay,
  timeoutMs = 20_000
} = {}) {
  assertPort(cdpPort);
  if (await ready(cdpPort)) return { launched: false, cdpPort };
  launch({ executable, cdpPort, profileDir, flowUrl });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(250);
    if (await ready(cdpPort)) return { launched: true, cdpPort };
  }
  throw new Error(`Chrome did not expose local CDP on 127.0.0.1:${cdpPort} within ${timeoutMs}ms.`);
}
