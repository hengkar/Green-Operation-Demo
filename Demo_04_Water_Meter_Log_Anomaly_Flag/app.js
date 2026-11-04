import { INITIAL_READING, RATE, DEMO_USE, WEEKDAYS, getDays, addReading, isValidHistory } from './meter.js';

const $ = id => document.getElementById(id);
const format = (value, digits = 0) => value.toLocaleString('en-MY', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const storageKey = 'waterwise-daily-readings-v1';
let consumption = [...DEMO_USE];
let toastTimer;

try {
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) {
    const parsed = JSON.parse(saved);
    if (isValidHistory(parsed)) consumption = parsed;
    else storageWarning('Saved readings could not be restored. Showing the fictional starter data.');
  }
} catch {
  storageWarning('Device storage is unavailable. Readings will only last for this visit.');
}

function storageWarning(message) {
  $('storage-status').textContent = message;
  $('storage-status').hidden = false;
}

function renderChart(days) {
  const width = Math.max(240, $('chart').clientWidth);
  const height = width < 500 ? 220 : 252;
  const left = 30, right = 12, top = 24, bottom = 35;
  const plotHeight = height - top - bottom;
  const largest = Math.max(...days.map(day => day.use), 1);
  const step = 10 ** Math.floor(Math.log10(largest));
  const maximum = Math.ceil(largest * 1.2 / step) * step;
  const x = index => left + index / Math.max(days.length - 1, 1) * (width - left - right);
  const y = value => top + plotHeight * (1 - value / maximum);
  const points = days.map((day, index) => `${x(index)},${y(day.use)}`).join(' ');
  const averages = days.flatMap((day, index) => day.average === null ? [] : [`${x(index)},${y(day.average)}`]).join(' ');
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = maximum * index / 4;
    return `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" stroke="#e9ede5" stroke-dasharray="3 4"/><text x="${left - 12}" y="${y(value) + 3}" text-anchor="end" fill="#98a08f" font-size="10">${format(value, value % 1 ? 1 : 0)}</text>`;
  }).join('');
  const labelInterval = Math.max(1, Math.ceil(days.length / 14));
  const labels = days.flatMap((day, index) => index % labelInterval === 0 || index === days.length - 1 ? [`<text x="${x(index)}" y="${height - 13}" text-anchor="middle" fill="#97a08e" font-size="10">${day.day}</text>`] : []).join('');
  const dots = days.map((day, index) => {
    const title = `Day ${day.day}, ${day.weekday}: ${format(day.use, 2)} m³${day.flagged ? '. Check for leaks or open valves' : ''}`;
    return `${day.flagged ? `<line x1="${x(index)}" x2="${x(index)}" y1="${y(day.use)}" y2="${height - bottom}" stroke="#e6b7a8" stroke-dasharray="3 4"/><rect x="${x(index) - 22}" y="${y(day.use) - 26}" width="44" height="19" rx="5" fill="#fbede7"/><text x="${x(index)}" y="${y(day.use) - 13}" text-anchor="middle" fill="#b55a46" font-size="10" font-weight="600">${format(day.use, day.use % 1 ? 1 : 0)}</text>` : ''}<circle cx="${x(index)}" cy="${y(day.use)}" r="${day.flagged ? 5 : 3.5}" fill="${day.flagged ? '#c36551' : '#568367'}" stroke="white" stroke-width="2"><title>${title}</title></circle>`;
  }).join('');
  $('chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-svg-title chart-svg-description"><title id="chart-svg-title">Daily water consumption over ${days.length} days</title><desc id="chart-svg-description">${days.map(day => `Day ${day.day}: ${day.use} m³${day.flagged ? ', flagged for unusual use' : ''}`).join('; ')}. Dashed line shows the average of the previous seven days.</desc><defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8fac77" stop-opacity=".2"/><stop offset="1" stop-color="#8fac77" stop-opacity=".015"/></linearGradient></defs>${grid}<polygon points="${left},${height - bottom} ${points} ${width - right},${height - bottom}" fill="url(#area-fill)"/><polyline points="${averages}" fill="none" stroke="#a5b597" stroke-width="1.5" stroke-dasharray="5 5"/><polyline points="${points}" fill="none" stroke="#568367" stroke-width="2.5" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}

function render() {
  const days = getDays(consumption);
  const latest = days.at(-1);
  const total = consumption.reduce((a, b) => a + b, 0);
  const flagged = days.filter(day => day.flagged);
  $('cumulative').textContent = format(latest.cumulative, latest.cumulative % 1 ? 2 : 0);
  $('latest-day').textContent = `Day ${latest.day} · ${latest.weekday}`;
  $('total').textContent = format(total, total % 1 ? 2 : 0);
  $('average').textContent = format(total / days.length, 1);
  $('cost').textContent = format(total * RATE, 2);
  $('period').textContent = `Across ${days.length} logged days`;
  $('chart-period').textContent = `${days.length} days`;
  $('history-count').textContent = `${days.length} entries`;
  $('anomaly-alert').hidden = !flagged.length;
  $('alert-title').textContent = flagged.length === 1 ? 'One day worth a closer look' : `${flagged.length} days worth a closer look`;
  $('alert-description').textContent = flagged.map(day => `Day ${day.day} (${day.weekday}): ${format(day.use, day.use % 1 ? 2 : 0)} m³ — ${day.average === 0 ? 'above a previous 7-day average of zero' : `${Math.round((day.use / day.average - 1) * 100)}% above its previous 7-day average`}.`).join(' ');
  $('history-rows').innerHTML = [...days].reverse().map(day => `<tr class="${day.flagged ? 'flagged-row' : ''}"><td><strong>Day ${day.day}</strong><span>${day.weekday}</span></td><td>${format(day.cumulative, day.cumulative % 1 ? 2 : 0)}</td><td>${format(day.use, day.use % 1 ? 2 : 0)}</td><td>${day.flagged ? '<span class="status-badge">↗ Unusual use</span><span class="flag-message">Check for leaks or open valves</span>' : day.average === null ? '<span class="status-badge pending">Building baseline</span>' : '<span class="status-badge">✓ Within range</span>'}</td></tr>`).join('');
  renderChart(days);
}

$('add-reading').addEventListener('click', () => {
  const nextDay = consumption.length + 1;
  const current = consumption.reduce((a, b) => a + b, INITIAL_READING);
  $('reading-form').reset();
  $('form-error').textContent = '';
  $('next-day').textContent = `Day ${nextDay} · ${WEEKDAYS[(nextDay - 1) % 7]} in your fictional log`;
  $('reading-input').min = current.toFixed(2);
  $('reading-input').max = '1000000000000';
  $('reading-input').placeholder = current.toFixed(2);
  $('reading-help').textContent = `Last reading: ${format(current, current % 1 ? 2 : 0)} m³. Enter the total on your meter, not the daily usage.`;
  $('reading-dialog').showModal();
  $('reading-input').focus();
});

$('close-dialog').addEventListener('click', () => $('reading-dialog').close());
$('reading-dialog').addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    $('reading-dialog').close();
  }
});
$('reading-input').addEventListener('input', () => { $('form-error').textContent = ''; });
$('reading-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    consumption = addReading(consumption, $('reading-input').value);
  } catch (error) {
    $('form-error').textContent = error.message;
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(consumption));
    $('storage-status').hidden = true;
  } catch {
    storageWarning('Reading added for this visit, but could not be saved on this device.');
  }
  render();
  $('reading-dialog').close();
  const latest = getDays(consumption).at(-1);
  $('toast').textContent = latest.flagged ? 'Reading added. Check for leaks or open valves.' : `Day ${latest.day} saved · ${format(latest.use, latest.use % 1 ? 2 : 0)} m³ used`;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
});

render();
let chartWidth = $('chart').clientWidth;
new ResizeObserver(() => {
  const nextWidth = $('chart').clientWidth;
  if (nextWidth !== chartWidth) {
    chartWidth = nextWidth;
    renderChart(getDays(consumption));
  }
}).observe($('chart'));
