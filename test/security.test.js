import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCdpEndpoint, assertFlowUrl, safeOutputPath } from '../src/security.js';

test('rejects non-loopback CDP endpoints', () => {
  assert.throws(() => assertCdpEndpoint('http://192.168.1.4:9222'), /127\.0\.0\.1/);
  assert.throws(() => assertCdpEndpoint('http://localhost:9222'), /127\.0\.0\.1/);
});

test('allows only HTTPS labs.google Flow URLs without credentials or query', () => {
  assert.equal(assertFlowUrl('https://labs.google/fx/tools/flow').origin, 'https://labs.google');
  assert.throws(() => assertFlowUrl('https://example.com/'), /labs\.google/);
  assert.throws(() => assertFlowUrl('http://labs.google/fx/tools/flow'), /HTTPS/);
  assert.throws(() => assertFlowUrl('https://labs.google/fx?token=secret'), /query/);
});

test('keeps output paths inside outputs/videos with an MP4 extension', () => {
  const target = safeOutputPath('render.mp4');
  assert.match(target, /outputs[\\/]videos[\\/]render\.mp4$/);
  assert.throws(() => safeOutputPath('../escape.mp4'), /filename/);
  assert.throws(() => safeOutputPath('render.txt'), /\.mp4/);
});
