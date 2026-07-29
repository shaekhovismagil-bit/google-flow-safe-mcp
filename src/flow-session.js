import { chromium } from 'playwright-core';
import { assertCdpEndpoint, assertFlowUrl, promptSummary, redactUrl, requireConfirmation } from './security.js';
import { downloadMp4 } from './download.js';

const FLOW_DEFAULT_URL = 'https://labs.google/fx/tools/flow';
const SELECTORS = {
  prompt: 'textarea, [contenteditable="true"]',
  generate: 'button:has-text("Generate")',
  readyVideo: 'video[src]',
  download: 'button:has-text("Download")'
};

export class FlowSession {
  constructor({ logger = console } = {}) { this.logger = logger; this.browser = null; this.page = null; this.generation = null; }

  async connect({ cdpPort = 9222, flowUrl = FLOW_DEFAULT_URL } = {}) {
    const cdp = assertCdpEndpoint(`http://127.0.0.1:${cdpPort}`);
    const flow = assertFlowUrl(flowUrl);
    this.browser = await chromium.connectOverCDP(cdp.href);
    const context = this.browser.contexts()[0];
    if (!context) throw new Error('CDP browser has no accessible browser context.');
    this.page = context.pages().find((page) => page.url().startsWith('https://labs.google/')) ?? await context.newPage();
    await this.page.goto(flow.href, { waitUntil: 'domcontentloaded' });
    this.logger.info('Connected to Google Flow', { url: redactUrl(flow.href) });
    return this.status();
  }

  status() {
    return {
      connected: Boolean(this.browser?.isConnected()),
      page: this.page ? redactUrl(this.page.url()) : null,
      generation: this.generation ? { state: this.generation.state, startedAt: this.generation.startedAt } : null
    };
  }

  assertConnected() { if (!this.browser?.isConnected() || !this.page) throw new Error('Not connected. Call flow_connect first.'); }

  async generateVideo({ prompt, model, ratio, duration, confirm = false }) {
    this.assertConnected();
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('prompt must be a non-empty string.');
    this.logger.info('Preparing Flow video generation', { ...promptSummary(prompt), model, ratio, duration, confirmed: confirm });
    const promptBox = this.page.locator(SELECTORS.prompt).first();
    await promptBox.waitFor({ state: 'visible', timeout: 15_000 });
    await promptBox.fill(prompt);
    // Model/ratio/duration are deliberately selected only by visible labels; no arbitrary DOM or URL discovery.
    for (const value of [model, ratio, duration]) {
      if (value) await this.page.getByText(String(value), { exact: true }).first().click().catch(() => { throw new Error(`Flow control not available for requested value: ${value}`); });
    }
    if (!confirm) return { prepared: true, generated: false, message: 'Prompt prepared. Generation was not started; call again with confirm: true to spend Flow credits.' };
    requireConfirmation(confirm);
    await this.page.locator(SELECTORS.generate).first().click();
    this.generation = { state: 'running', startedAt: new Date().toISOString() };
    return { prepared: true, generated: true, message: 'Generation started.' };
  }

  async waitForVideo({ timeoutMs = 300_000 } = {}) {
    this.assertConnected();
    if (!this.generation) return { state: 'idle', message: 'No active generation in this MCP session.' };
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 900_000) throw new Error('timeoutMs must be an integer between 1 and 900000.');
    try {
      await this.page.locator(SELECTORS.readyVideo).first().waitFor({ state: 'visible', timeout: timeoutMs });
      this.generation.state = 'ready';
      return { state: 'ready', message: 'Video is ready to download.' };
    } catch {
      this.generation.state = 'waiting';
      return { state: 'waiting', message: 'Video is not ready before timeout; call flow_wait_for_video again.' };
    }
  }

  async downloadVideo({ filename = `flow-${Date.now()}.mp4` } = {}) {
    this.assertConnected();
    if (this.generation?.state !== 'ready') throw new Error('No ready video. Call flow_wait_for_video until it reports ready.');
    const result = await downloadMp4({ suggestedName: filename, download: async (target) => {
      const event = this.page.waitForEvent('download', { timeout: 30_000 });
      await this.page.locator(SELECTORS.download).first().click();
      const download = await event;
      await download.saveAs(target);
    }});
    this.generation.state = 'downloaded';
    return result;
  }

  async disconnect() {
    if (this.browser) await this.browser.close();
    this.browser = null; this.page = null; this.generation = null;
    return { disconnected: true, message: 'Disconnected from CDP. No Chrome user data was modified.' };
  }
}
