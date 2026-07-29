import test from 'node:test';
import assert from 'node:assert/strict';
import { requireConfirmation } from '../src/security.js';

test('refuses a credit-consuming generation without explicit confirmation', () => {
  assert.throws(() => requireConfirmation(false), /confirm: true/);
  assert.doesNotThrow(() => requireConfirmation(true));
});
