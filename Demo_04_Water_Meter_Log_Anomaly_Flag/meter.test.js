import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_READING, RATE, DEMO_USE, getDays, addReading, isValidHistory } from './meter.js';

test('fictional seed preserves consumption, cumulative readings, weekdays and summary', () => {
  const days = getDays(DEMO_USE);
  assert.equal(days.length, 14);
  assert.equal(days[0].weekday, 'Monday');
  assert.equal(days[13].weekday, 'Sunday');
  assert.equal(days[0].cumulative, INITIAL_READING + 40);
  assert.equal(days.at(-1).cumulative, 11023);
  const total = DEMO_USE.reduce((a, b) => a + b, 0);
  assert.equal(total, 503);
  assert.equal((total / days.length).toFixed(1), '35.9');
  assert.equal((total * RATE).toFixed(2), '1493.91');
});

test('flags only day 9 with an average excluding the current day', () => {
  const days = getDays(DEMO_USE);
  assert.deepEqual(days.filter(day => day.flagged).map(day => day.day), [9]);
  assert.equal(days[8].average, (42 + 38 + 41 + 44 + 10 + 9 + 41) / 7);
  assert.ok(days.slice(0, 7).every(day => day.average === null && !day.flagged));
});

test('threshold is strictly more than 50%, including a zero baseline', () => {
  const baseline = Array(7).fill(40);
  assert.equal(getDays([...baseline, 60]).at(-1).flagged, false);
  assert.equal(getDays([...baseline, 60.01]).at(-1).flagged, true);
  assert.equal(getDays([...Array(7).fill(0), 1]).at(-1).flagged, true);
  assert.equal(getDays(Array(8).fill(0)).at(-1).flagged, false);
});

test('new cumulative readings derive use without mutating existing history', () => {
  const updated = addReading(DEMO_USE, '11063.25');
  assert.equal(updated.at(-1), 40.25);
  assert.equal(DEMO_USE.length, 14);
  assert.equal(getDays(updated).at(-1).cumulative, 11063.25);
  assert.equal(getDays(updated).at(-1).weekday, 'Monday');
  assert.equal(addReading(DEMO_USE, 11023).at(-1), 0);
  assert.equal(getDays(addReading(DEMO_USE, 11123)).at(-1).flagged, true);
});

test('invalid, blank, decreasing and unbounded readings are rejected', () => {
  for (const value of ['', ' ', 'not a number', 'Infinity', NaN, 11022, -1, 1e13]) {
    assert.throws(() => addReading(DEMO_USE, value));
  }
});

test('stored data must retain starter history and valid finite consumption', () => {
  assert.ok(isValidHistory(DEMO_USE));
  assert.ok(isValidHistory([...DEMO_USE, 0, 50.25]));
  for (const value of [null, {}, [], [1, 2], [...DEMO_USE, -1], [...DEMO_USE, NaN], [...DEMO_USE, '4'], [...DEMO_USE, 1e13]]) {
    assert.equal(isValidHistory(value), false);
  }
});
