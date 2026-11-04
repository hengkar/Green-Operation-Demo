'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sampleEntries, summarize, filterEntries, validEntry, escapeHTML, csvContent, daysAgo } = require('./app.js');
const now = new Date(2026, 9, 31, 12);

test('all twelve exact sample entries span the last seven local days', () => {
  const entries = sampleEntries(now);
  assert.equal(entries.length, 12);
  assert.ok(entries.every(validEntry));
  assert.equal(new Set(entries.map(entry => entry.date)).size, 7);
  assert.equal(entries[0].date, '2026-10-25');
  assert.equal(entries.at(-1).date, '2026-10-31');
  assert.equal(filterEntries(entries, 'all', '7', now).length, 12);
  assert.deepEqual(entries.map(({ line, defect, quantity }) => [line, defect, quantity]), [
    ['L1', 'Flash', 40], ['L1', 'Short shot', 15], ['L2', 'Scratch', 60],
    ['L2', 'Scratch', 35], ['L3', 'Dimension out', 20], ['L1', 'Flash', 55],
    ['L2', 'Contamination', 10], ['L3', 'Short shot', 25], ['L2', 'Scratch', 45],
    ['L1', 'Flash', 30], ['L3', 'Other', 5], ['L2', 'Dimension out', 12]
  ]);
});
test('totals, impact, descending Pareto and cumulative percentages are correct', () => {
  const stats = summarize(sampleEntries(now));
  assert.equal(stats.total, 352);
  assert.ok(Math.abs(stats.plastic - 42.24) < 1e-9);
  assert.ok(Math.abs(stats.energy - 123.2) < 1e-9);
  assert.deepEqual(stats.defects.map(item => [item.defect, item.quantity]), [
    ['Scratch', 140], ['Flash', 125], ['Short shot', 40], ['Dimension out', 32], ['Contamination', 10], ['Other', 5]
  ]);
  assert.equal(stats.defects[0].percent.toFixed(1), '39.8');
  assert.equal(stats.defects.at(-1).cumulative, 100);
  assert.ok(stats.defects.every((item, i, list) => !i || item.cumulative >= list[i - 1].cumulative));
});
test('line and rolling date filters include boundaries but exclude future entries', () => {
  const entries = sampleEntries(now);
  assert.equal(summarize(filterEntries(entries, 'L2', '7', now)).total, 162);
  const extra = [ { ...entries[0], date: '2026-10-24' }, { ...entries[0], date: '2026-11-01' } ];
  assert.equal(filterEntries([...entries, ...extra], 'all', '7', now).length, 12);
  assert.equal(filterEntries([...entries, ...extra], 'all', 'all', now).length, 14);
  assert.equal(daysAgo(6, new Date(2026, 0, 3, 12)), '2025-12-28');
});
test('empty view has zero impact and no priority', () => {
  assert.deepEqual(summarize([]), { total: 0, plastic: 0, energy: 0, defects: [] });
});
test('invalid dates, quantities, lines, defects and oversized notes are rejected', () => {
  const entry = sampleEntries(now)[0];
  for (const quantity of [0, -1, 1.5, NaN, Infinity, '10', 1000001]) assert.equal(validEntry({ ...entry, quantity }), false);
  for (const date of ['2026-02-30', 'invalid', '2026-1-1']) assert.equal(validEntry({ ...entry, date }), false);
  assert.equal(validEntry({ ...entry, line: 'L4' }), false);
  assert.equal(validEntry({ ...entry, defect: 'Unknown' }), false);
  assert.equal(validEntry({ ...entry, note: 'a'.repeat(501) }), false);
  assert.equal(validEntry(null), false);
});
test('notes are escaped and CSV quotes and formulas are handled safely', () => {
  assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
  const entry = { ...sampleEntries(now)[0], note: '=SUM(A1:A2), "test"\nnext' };
  const csv = csvContent([entry]);
  assert.ok(csv.includes('"\'=SUM(A1:A2), ""test""\nnext"'));
  assert.equal(csvContent([]), 'Date,Line,Defect type,Quantity,Note');
});
