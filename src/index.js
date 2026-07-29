import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FlowSession } from './flow-session.js';
import { ensureDedicatedChrome } from './browser-launcher.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfig = { cdpPort: 9222, flowUrl: 'https://labs.google/fx/tools/flow', defaultTimeoutMs: 300000 };

async function loadConfig() {
  try {
    const value = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8'));
    return { ...defaultConfig, ...value };
  } catch (error) {
    if (error?.code === 'ENOENT') return defaultConfig;
    throw new Error('config.json is not valid JSON.');
  }
}

const toolDefinitions = [
  { name: 'flow_connect', description: 'Connect to an already-running local Chrome CDP endpoint and open an allowed Google Flow URL.', inputSchema: { type: 'object', properties: { cdpPort: { type: 'integer', minimum: 1, maximum: 65535 }, flowUrl: { type: 'string' } }, additionalProperties: false } },
  { name: 'flow_status', description: 'Report CDP connection, current permitted page, and active generation state.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'flow_generate_video', description: 'Fill video settings. Does not spend credits unless confirm is exactly true.', inputSchema: { type: 'object', required: ['prompt'], properties: { prompt: { type: 'string', minLength: 1 }, model: { type: 'string' }, ratio: { type: 'string' }, duration: { type: 'string' }, confirm: { type: 'boolean', default: false } }, additionalProperties: false } },
  { name: 'flow_wait_for_video', description: 'Wait for a started Flow video generation to become ready.', inputSchema: { type: 'object', properties: { timeoutMs: { type: 'integer', minimum: 1, maximum: 900000 } }, additionalProperties: false } },
  { name: 'flow_download_video', description: 'Download the ready MP4 into outputs/videos and return local attachment metadata.', inputSchema: { type: 'object', properties: { filename: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9._-]*\\.mp4$' } }, additionalProperties: false } },
  { name: 'flow_disconnect', description: 'Disconnect from CDP without deleting or changing Chrome user data.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }
];

const logger = { info(event, fields = {}) { process.stderr.write(`[flow-mcp] ${event} ${JSON.stringify(fields)}\n`); } };
const session = new FlowSession({ logger });
const server = new Server({ name: 'google-flow-safe-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });

function toolResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments ?? {};
    let value;
    switch (request.params.name) {
      case 'flow_connect': { const config = await loadConfig(); value = await session.connect({ ...config, ...args }); break; }
      case 'flow_status': value = session.status(); break;
      case 'flow_generate_video': value = await session.generateVideo(args); break;
      case 'flow_wait_for_video': { const config = await loadConfig(); value = await session.waitForVideo({ timeoutMs: args.timeoutMs ?? config.defaultTimeoutMs }); break; }
      case 'flow_download_video': value = await session.downloadVideo(args); break;
      case 'flow_disconnect': value = await session.disconnect(); break;
      default: throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return toolResult(value);
  } catch (error) {
    logger.info('Tool request failed', { tool: request.params.name, error: error instanceof Error ? error.message : 'Unknown error' });
    return { content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown error' }], isError: true };
  }
});

const startupConfig = await loadConfig();
if (startupConfig.autoLaunchChrome !== false) {
  await ensureDedicatedChrome({ cdpPort: startupConfig.cdpPort, flowUrl: startupConfig.flowUrl });
}
await server.connect(new StdioServerTransport());
