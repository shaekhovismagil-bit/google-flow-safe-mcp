# One-command Chrome launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start a dedicated Google Flow Chrome profile and the stdio MCP server with one command, retaining the user's one-time sign-in locally.

**Architecture:** A small launcher resolves a normal Chrome executable, creates no copied data, and starts Chrome only with a newly created dedicated profile directory and loopback CDP. `src/index.js` waits for this local CDP endpoint before accepting MCP requests. The existing Flow session continues to use Playwright only over CDP.

**Tech Stack:** Node.js 20+ ESM, built-in `node:child_process`, `node:fs`, `node:path`, `node:timers/promises`, existing MCP SDK and Playwright Core.

## Global Constraints

- Chrome launches only with `--remote-debugging-address=127.0.0.1` and an integer local port.
- Use a new persistent `GoogleFlowSafeMCP/chrome-profile` directory; never copy/read `Cookies`, `Login Data`, `Local State`, passwords, tokens, or sessions.
- Default navigation is `https://labs.google/fx/tools/flow`; no stealth, CAPTCHA bypass, upload paths, or client-config editing.
- Existing Chrome user profiles are never targeted.
- A Flow generation still requires `confirm: true`.

---

### Task 1: Test and implement the safe Chrome launcher

**Files:**
- Create: `test/browser-launcher.test.js`
- Create: `src/browser-launcher.js`

**Interfaces:**
- Produces `getDedicatedProfileDir(env)`, `buildChromeArgs({ cdpPort, profileDir, flowUrl })`, and `launchDedicatedChrome({ spawnImpl, executable, cdpPort, profileDir, flowUrl })`.

- [ ] **Step 1: Write failing tests** for a profile directory below `LOCALAPPDATA/GoogleFlowSafeMCP/chrome-profile`, loopback-only arguments, rejection of invalid ports, and a detached non-shell spawn.
- [ ] **Step 2: Run `npm.cmd test test/browser-launcher.test.js`** and observe missing-module failure.
- [ ] **Step 3: Add minimal launcher implementation** using only Node built-ins; it must pass an argument array, never a shell command, and make no profile copies.
- [ ] **Step 4: Run `npm.cmd test test/browser-launcher.test.js`** and observe all launcher tests pass.

### Task 2: Start Chrome before the stdio server

**Files:**
- Modify: `src/index.js`
- Modify: `config.example.json`
- Modify: `package.json`

**Interfaces:**
- Consumes `ensureDedicatedChrome(options)` from `src/browser-launcher.js`.
- Produces a `start` command that opens the dedicated Chrome profile before connecting the MCP stdio transport.

- [ ] **Step 1: Write a failing test** that proves `ensureDedicatedChrome` returns immediately when local CDP is available and otherwise invokes the launcher before polling `http://127.0.0.1:<port>/json/version`.
- [ ] **Step 2: Run the focused test** and observe the expected missing-export failure.
- [ ] **Step 3: Implement bounded local polling** and call it from `src/index.js`; default `autoLaunchChrome` to `true`.
- [ ] **Step 4: Run the full suite** and observe all tests pass.

### Task 3: Make the user flow plain and publish it

**Files:**
- Modify: `README.md`
- Modify: `config.example.json`

- [ ] **Step 1: Document one command:** `npm start`; explain that Chrome appears automatically and Google sign-in is needed only on first launch.
- [ ] **Step 2: State the exact boundary:** it is a separate persistent Flow profile, not the user's existing Chrome profile.
- [ ] **Step 3: Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd audit`**.
- [ ] **Step 4: Commit only implementation, tests, config, README, and this plan; push to `main`.**
