import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  buildChromeArgs,
  ensureDedicatedChrome,
  getDedicatedProfileDir,
  launchDedicatedChrome
} from '../src/browser-launcher.js';

test('uses a dedicated profile below LOCALAPPDATA instead of the main Chrome profile', () => {
  assert.equal(
    getDedicatedProfileDir({ LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local' }, 'win32'),
    path.join('C:\\Users\\Ada\\AppData\\Local', 'GoogleFlowSafeMCP', 'chrome-profile')
  );
});

test('builds Chrome arguments with loopback CDP and the allowed Flow page', () => {
  assert.deepEqual(
    buildChromeArgs({ cdpPort: 9222, profileDir: 'C:\\Users\\Ada\\AppData\\Local\\GoogleFlowSafeMCP\\chrome-profile' }),
    [
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=9222',
      '--user-data-dir=C:\\Users\\Ada\\AppData\\Local\\GoogleFlowSafeMCP\\chrome-profile',
      'https://labs.google/fx/tools/flow'
    ]
  );
  assert.throws(() => buildChromeArgs({ cdpPort: 0, profileDir: 'C:\\Users\\Ada\\AppData\\Local\\GoogleFlowSafeMCP\\chrome-profile' }), /port/i);
});

test('launches Chrome detached without a shell and never passes a main-profile path', () => {
  let received;
  const result = launchDedicatedChrome({
    executable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    cdpPort: 9222,
    profileDir: 'C:\\Users\\Ada\\AppData\\Local\\GoogleFlowSafeMCP\\chrome-profile',
    spawnImpl: (...args) => {
      received = args;
      return { unref() {} };
    }
  });
  assert.equal(result.launched, true);
  assert.equal(received[2].shell, false);
  assert.equal(received[2].detached, true);
  assert.ok(received[1].includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(received[1].some((arg) => arg.includes('GoogleFlowSafeMCP')));
});

test('does not launch a second Chrome when loopback CDP is already available', async () => {
  let launches = 0;
  const result = await ensureDedicatedChrome({
    cdpPort: 9222,
    isCdpReady: async () => true,
    launch: () => { launches += 1; }
  });
  assert.deepEqual(result, { launched: false, cdpPort: 9222 });
  assert.equal(launches, 0);
});
