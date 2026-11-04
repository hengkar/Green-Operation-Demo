export const HOURS_PER_YEAR = 24 * 6 * 52;
export const RATE = 0.35;
export const CARBON = 0.740;
export const POWER = { Small: 0.5, Medium: 1.5, Large: 4 };
export const STORAGE_KEY = 'airwalk-leaks-v1';

export function seedLeaks() {
  return [
    ['Compressor room', 'Large', 'Open'],
    ['Line 1', 'Medium', 'Open'],
    ['Line 1', 'Small', 'Open'],
    ['Line 2', 'Medium', 'Fixed'],
    ['Line 2', 'Small', 'Open'],
    ['Warehouse', 'Large', 'Fixed'],
    ['Warehouse', 'Small', 'Open'],
    ['Compressor room', 'Medium', 'Fixed'],
  ].map(([location, size, status], index) => ({ id: index + 1, location, size, status, date: '2026-10-24' }));
}

export function totals(leaks) {
  const open = leaks.filter(leak => leak.status === 'Open');
  const fixed = leaks.filter(leak => leak.status === 'Fixed');
  const kw = open.reduce((sum, leak) => sum + POWER[leak.size], 0);
  const savedKw = fixed.reduce((sum, leak) => sum + POWER[leak.size], 0);
  return { open: open.length, fixed: fixed.length, kw, cost: kw * HOURS_PER_YEAR * RATE,
    carbon: kw * HOURS_PER_YEAR * CARBON, savings: savedKw * HOURS_PER_YEAR * RATE,
    savedCarbon: savedKw * HOURS_PER_YEAR * CARBON };
}

export function nextId(leaks) {
  return Math.max(0, ...leaks.map(leak => leak.id)) + 1;
}

export function validLeaks(data) {
  return Array.isArray(data) && data.every(leak => leak && Number.isSafeInteger(leak.id) && leak.id > 0
    && typeof leak.location === 'string' && leak.location.trim().length > 0
    && Object.hasOwn(POWER, leak.size) && ['Open', 'Fixed'].includes(leak.status)
    && typeof leak.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(leak.date))
    && new Set(data.map(leak => leak.id)).size === data.length;
}
