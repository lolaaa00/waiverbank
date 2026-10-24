import test from 'node:test';
import assert from 'node:assert/strict';
import { executionLeader } from '../scripts/receipt-utils.mjs';

test('cancelled validator after quorum cannot replace a successful leader', () => {
  const leader = { mode: 'leader', execution_result: 'SUCCESS' };
  const idle = { mode: 'validator', execution_result: 'ERROR', vote: 'idle' };
  assert.equal(executionLeader({ consensus_data: { leader_receipt: [leader, idle] } }), leader);
});
test('an actual leader error remains an error', () => {
  const leader = { mode: 'leader', execution_result: 'ERROR' };
  assert.equal(executionLeader({ consensus_data: { leader_receipt: leader } }), leader);
});
test('missing leader cannot be interpreted as success', () => {
  assert.equal(executionLeader({ consensus_data: { leader_receipt: [{ mode: 'validator' }] } }), undefined);
});
