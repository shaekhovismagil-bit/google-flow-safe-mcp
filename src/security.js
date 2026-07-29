import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const videosDir = path.join(projectRoot, 'outputs', 'videos');

export function assertCdpEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('CDP endpoint must be a valid URL.'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !/^\d+$/.test(url.port)) {
    throw new Error('CDP is permitted only at http://127.0.0.1:<port>.');
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('CDP endpoint must not contain credentials, paths, query, or fragment.');
  }
  return url;
}

export function assertFlowUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Flow URL must be a valid URL.'); }
  if (url.protocol !== 'https:') throw new Error('Flow URL must use HTTPS.');
  if (url.hostname !== 'labs.google') throw new Error('Only labs.google URLs are permitted.');
  if (url.username || url.password || url.search || url.hash) throw new Error('Flow URL must not contain credentials, query, or fragment.');
  return url;
}

export function safeOutputPath(filename) {
  if (typeof filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.mp4$/i.test(filename)) {
    throw new Error('Video filename must be a simple .mp4 filename.');
  }
  const target = path.resolve(videosDir, filename);
  if (path.dirname(target) !== videosDir) throw new Error('Video filename escapes the output directory.');
  return target;
}

export function getVideosDir() { return videosDir; }

export function requireConfirmation(confirm) {
  if (confirm !== true) throw new Error('This action may consume Flow credits. Call again with confirm: true.');
}

export function redactUrl(url) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
}

export function promptSummary(prompt) {
  return `promptLength=${String(prompt ?? '').length}`;
}
