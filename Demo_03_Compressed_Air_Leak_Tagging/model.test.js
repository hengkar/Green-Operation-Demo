import test from 'node:test';
import assert from 'node:assert/strict';
import { seedLeaks, totals, nextId, validLeaks, HOURS_PER_YEAR } from './model.js';

test('eight demo leaks have correct open losses and fixed savings', () => {
  const leaks = seedLeaks();
  assert.equal(leaks.length, 8);
  assert.equal(HOURS_PER_YEAR, 7488);
  assert.equal(validLeaks(leaks), true);
  assert.deepEqual(totals(leaks), { open: 5, fixed: 3, kw: 7, cost: 18345.6, carbon: 38787.84, savings: 18345.6, savedCarbon: 38787.84 });
});
test('fixing a leak removes losses and adds annual savings', () => {
  const leaks = seedLeaks();
  leaks[0].status = 'Fixed';
  const result = totals(leaks);
  assert.equal(result.open, 4);
  assert.equal(result.fixed, 4);
  assert.equal(result.kw, 3);
  assert.equal(result.cost, 7862.4);
  assert.equal(result.savings, 28828.8);
});
test('empty and fully fixed registers have no open losses', () => {
  assert.equal(nextId([]), 1);
  assert.equal(totals([]).cost, 0);
  const leaks = seedLeaks().map(leak => ({ ...leak, status: 'Fixed' }));
  assert.equal(totals(leaks).kw, 0);
  assert.equal(totals(leaks).open, 0);
  assert.equal(nextId(leaks), 9);
});
test('invalid persisted records and duplicate tags are rejected', () => {
  assert.equal(validLeaks(null), false);
  assert.equal(validLeaks([null]), false);
  assert.equal(validLeaks([{ ...seedLeaks()[0], size: '__proto__' }]), false);
  assert.equal(validLeaks([{ ...seedLeaks()[0], location: ' ' }]), false);
  assert.equal(validLeaks([seedLeaks()[0], seedLeaks()[0]]), false);
});
