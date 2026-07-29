import { mkdir, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getVideosDir, safeOutputPath } from './security.js';

export async function downloadMp4({ suggestedName, download }) {
  const path = safeOutputPath(suggestedName);
  await mkdir(getVideosDir(), { recursive: true });
  await download(path);
  const info = await stat(path);
  if (!info.isFile() || info.size === 0) throw new Error('Download did not produce a non-empty MP4 file.');
  return {
    path,
    fileUri: pathToFileURL(path).href,
    sizeBytes: info.size,
    mimeType: 'video/mp4',
    attachmentText: `Video is ready locally: ${path}. Attach this MP4 file to the chat if your MCP client supports local file attachments.`
  };
}
