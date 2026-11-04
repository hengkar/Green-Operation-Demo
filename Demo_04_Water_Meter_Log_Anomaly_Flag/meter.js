export const INITIAL_READING = 10520;
export const RATE = 2.97;
export const DEMO_USE = [40, 42, 38, 41, 44, 10, 9, 41, 95, 43, 39, 42, 11, 8];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getDays(consumption) {
  let cumulative = INITIAL_READING;
  return consumption.map((use, index) => {
    cumulative += use;
    const previous = consumption.slice(Math.max(0, index - 7), index);
    const average = previous.length === 7 ? previous.reduce((a, b) => a + b, 0) / 7 : null;
    return { day: index + 1, weekday: WEEKDAYS[index % 7], use, cumulative, average,
      flagged: average !== null && use > average * 1.5 };
  });
}

export function addReading(consumption, value) {
  const reading = Number(value);
  const current = consumption.reduce((a, b) => a + b, INITIAL_READING);
  if (String(value).trim() === '' || !Number.isFinite(reading) || reading < current || reading > 1e12) {
    throw new Error(`Enter a cumulative reading between ${current.toFixed(2)} and 1,000,000,000,000 m³. It cannot be lower than the last reading.`);
  }
  return [...consumption, Math.round((reading - current) * 100) / 100];
}

export function isValidHistory(value) {
  return Array.isArray(value) && value.length >= DEMO_USE.length &&
    value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) &&
    DEMO_USE.every((n, index) => value[index] === n) &&
    value.reduce((a, b) => a + b, INITIAL_READING) <= 1e12;
}
