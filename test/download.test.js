import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadMp4 } from '../src/download.js';

test('downloads an MP4 only into the safe output directory and returns attachment metadata', async () => {
  const result = await downloadMp4({
    suggestedName: 'clip.mp4',
    download: async (target) => { await import('node:fs/promises').then((fs) => fs.writeFile(target, Buffer.from('mp4'))); }
  });
  assert.equal(result.mimeType, 'video/mp4');
  assert.equal(result.sizeBytes, 3);
  assert.match(result.path, /outputs[\\/]videos[\\/]clip\.mp4$/);
  assert.match(result.fileUri, /^file:\/\//);
  assert.match(result.attachmentText, /video/i);
  await import('node:fs/promises').then((fs) => fs.rm(result.path));
});
