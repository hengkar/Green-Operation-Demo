'use strict';

const DEFECTS = ['Short shot', 'Flash', 'Scratch', 'Dimension out', 'Contamination', 'Other'];
const LINES = ['L1', 'L2', 'L3'];
const STORAGE_KEY = 'loop-scrap-entries-v1';

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysAgo(days, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return localDate(date);
}

function validEntry(entry) {
  if (!entry || typeof entry !== 'object' || typeof entry.date !== 'string') return false;
  const date = new Date(`${entry.date}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && !Number.isNaN(date.getTime()) &&
    localDate(date) === entry.date && LINES.includes(entry.line) && DEFECTS.includes(entry.defect) &&
    Number.isSafeInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 1000000 &&
    typeof entry.note === 'string' && entry.note.length <= 500;
}

function sampleEntries(now = new Date()) {
  const samples = [
    ['L1', 'Flash', 40], ['L1', 'Short shot', 15], ['L2', 'Scratch', 60],
    ['L2', 'Scratch', 35], ['L3', 'Dimension out', 20], ['L1', 'Flash', 55],
    ['L2', 'Contamination', 10], ['L3', 'Short shot', 25], ['L2', 'Scratch', 45],
    ['L1', 'Flash', 30], ['L3', 'Other', 5], ['L2', 'Dimension out', 12]
  ];
  return samples.map(([line, defect, quantity], index) => ({
    id: `sample-${index}`, date: daysAgo(6 - Math.floor(index * 7 / 12), now), line, defect, quantity, note: ''
  }));
}

function filterEntries(entries, line, period, now = new Date()) {
  return entries.filter(entry => (line === 'all' || entry.line === line) &&
    (period === 'all' || (entry.date >= daysAgo(6, now) && entry.date <= localDate(now))));
}

function summarize(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const defects = DEFECTS.map(defect => ({ defect,
    quantity: entries.filter(entry => entry.defect === defect).reduce((sum, entry) => sum + entry.quantity, 0)
  })).filter(item => item.quantity > 0).sort((a, b) => b.quantity - a.quantity);
  let cumulative = 0;
  for (const item of defects) {
    cumulative += item.quantity;
    item.percent = total ? item.quantity / total * 100 : 0;
    item.cumulative = total ? cumulative / total * 100 : 0;
  }
  return { total, plastic: total * 0.12, energy: total * 0.35, defects };
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function csvContent(entries) {
  const cell = value => {
    const text = String(value);
    // Prevent spreadsheet applications from interpreting notes as formulas.
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  };
  return ['Date,Line,Defect type,Quantity,Note', ...entries.map(entry =>
    [entry.date, entry.line, entry.defect, entry.quantity, entry.note].map(cell).join(','))].join('\r\n');
}

function init() {
  const $ = id => document.getElementById(id);
  let entries;
  let storageAvailable = true;
  let expanded = false;
  let currentEntries = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      entries = sampleEntries();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } else {
      entries = JSON.parse(saved);
      if (!Array.isArray(entries) || !entries.every(validEntry)) throw new Error('Invalid saved data');
    }
  } catch (error) {
    entries = sampleEntries();
    storageAvailable = false;
    $('form-status').textContent = 'Device storage is unavailable or saved data could not be read. Demo data is shown; new entries cannot be saved until storage is available.';
  }

  const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  function renderChart(stats) {
    if (!stats.total) {
      $('pareto-chart').innerHTML = '<div class="empty-state">No scrap logged for this view. A fresh start.</div>';
      return;
    }
    const width = Math.max(300, $('pareto-chart').clientWidth);
    const mobile = width < 500;
    const height = mobile ? 270 : 285;
    const left = 32, right = width - 38, top = 28, bottom = height - 57;
    const plotHeight = bottom - top;
    const max = Math.ceil(stats.defects[0].quantity / 4 / 10) * 10 * 4;
    const step = (right - left) / stats.defects.length;
    const barWidth = Math.min(61, step * 0.57);
    const points = stats.defects.map((item, i) => [left + step * (i + 0.5), bottom - item.cumulative / 100 * plotHeight]);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Scrap Pareto chart</title><desc id="chart-desc">${escapeHTML(stats.defects.map(item => `${item.defect}: ${item.quantity} pieces, ${item.cumulative.toFixed(1)}% cumulative`).join('; '))}</desc>`;
    for (let i = 0; i <= 4; i++) {
      const y = bottom - plotHeight * i / 4;
      svg += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e9ede4" ${i ? 'stroke-dasharray="3 4"' : ''}/><text x="${left - 10}" y="${y + 3}" text-anchor="end" fill="#99a18e" font-size="9">${number(max * i / 4)}</text><text x="${right + 10}" y="${y + 3}" fill="#99a18e" font-size="9">${i * 25}%</text>`;
    }
    stats.defects.forEach((item, i) => {
      const x = left + step * (i + 0.5);
      const barHeight = item.quantity / max * plotHeight;
      const words = item.defect === 'Contamination' && mobile ? ['Contami-', 'nation'] : item.defect.split(' ');
      svg += `<rect x="${x - barWidth / 2}" y="${bottom - barHeight}" width="${barWidth}" height="${barHeight}" rx="4" fill="${i === 0 ? '#537b49' : '#b4c59b'}"><title>${escapeHTML(item.defect)}: ${item.quantity} pieces</title></rect><text x="${x}" y="${bottom - barHeight - 8}" text-anchor="middle" fill="#627653" font-size="10" font-weight="600">${number(item.quantity)}</text><text x="${x}" y="${bottom + 20}" text-anchor="middle" fill="#859078" font-size="${mobile ? 8 : 10}">${words.map((word, index) => `<tspan x="${x}" dy="${index ? 12 : 0}">${escapeHTML(word)}</tspan>`).join('')}</text>`;
    });
    svg += `<polyline points="${points.map(point => point.join(',')).join(' ')}" fill="none" stroke="#3f7050" stroke-width="2" stroke-linejoin="round"/>`;
    points.forEach(([x, y], i) => {
      svg += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff" stroke="#3f7050" stroke-width="1.8"><title>${stats.defects[i].cumulative.toFixed(1)}% cumulative</title></circle>`;
    });
    svg += '</svg>';
    $('pareto-chart').innerHTML = svg;
  }

  function render() {
    currentEntries = filterEntries(entries, $('line-filter').value, $('period-filter').value);
    const stats = summarize(currentEntries);
    $('total-pieces').textContent = number(stats.total);
    $('total-plastic').textContent = number(stats.plastic);
    $('total-energy').textContent = number(stats.energy);
    $('entry-count').textContent = `Across ${currentEntries.length} logged ${currentEntries.length === 1 ? 'entry' : 'entries'}`;
    $('history-count').textContent = currentEntries.length;
    const top = stats.defects[0];
    $('priority-text').innerHTML = top
      ? `Start with <strong>${escapeHTML(top.defect)}</strong> — <strong>${number(top.quantity)} pieces (${top.percent.toFixed(1)}%)</strong> of your scrap. The biggest opportunity to reduce waste.`
      : 'No defects to prioritize yet. Log an entry to find your first opportunity.';
    renderChart(stats);
    const sorted = [...currentEntries].reverse().sort((a, b) => b.date.localeCompare(a.date));
    const visible = expanded ? sorted : sorted.slice(0, 4);
    $('entries-list').innerHTML = visible.length ? visible.map(entry => `<article class="entry-row"><span class="line-badge">${escapeHTML(entry.line)}</span><div class="entry-detail"><div class="entry-name">${escapeHTML(entry.defect)}</div><div class="entry-date">${dateLabel(entry.date)}</div>${entry.note ? `<p class="entry-note">${escapeHTML(entry.note)}</p>` : ''}</div><div class="entry-quantity">${number(entry.quantity)}<span>pcs</span></div></article>`).join('') : '<div class="empty-state">No entries in this view. Log your first scrap above.</div>';
    $('show-more').hidden = sorted.length <= 4;
    $('show-more').textContent = expanded ? 'Show fewer entries ↑' : `Show all ${sorted.length} entries ↓`;
    $('export-button').disabled = !currentEntries.length;
  }

  $('entry-date').value = localDate();
  $('entry-date').max = localDate();
  $('scrap-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const entry = { id: globalThis.crypto?.randomUUID?.() || `entry-${Date.now()}-${Math.random()}`, date: data.get('date'), line: data.get('line'), defect: data.get('defect'), quantity: Number(data.get('quantity')), note: data.get('note').trim() };
    if (!validEntry(entry) || entry.date > localDate()) {
      $('form-status').textContent = 'Enter a valid date (today or earlier) and a whole quantity from 1 to 1,000,000.';
      return;
    }
    try {
      if (!storageAvailable) throw new Error('Storage unavailable');
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...entries, entry]));
    } catch (error) {
      $('form-status').textContent = 'Entry not saved. Device storage is unavailable or full. Export your existing entries, then try again with storage enabled.';
      return;
    }
    entries.push(entry);
    form.reset();
    $('entry-date').value = localDate();
    expanded = false;
    render();
    const inView = currentEntries.includes(entry);
    $('form-status').textContent = `Entry saved: ${entry.quantity} ${entry.defect} pieces on ${entry.line}.${inView ? ' Your dashboard is up to date.' : ' This entry is outside your current filters.'}`;
  });
  for (const id of ['line-filter', 'period-filter']) {
    $(id).addEventListener('change', () => { expanded = false; render(); });
  }
  $('show-more').addEventListener('click', () => { expanded = !expanded; render(); });
  $('export-button').addEventListener('click', () => {
    const blob = new Blob(['\uFEFF' + csvContent(currentEntries)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loop-scrap-${localDate()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
  if (typeof ResizeObserver !== 'undefined') {
    let previousWidth = 0;
    new ResizeObserver(([event]) => {
      if (Math.abs(previousWidth - event.contentRect.width) > 1) {
        previousWidth = event.contentRect.width;
        renderChart(summarize(currentEntries));
      }
    }).observe($('pareto-chart'));
  }
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { localDate, daysAgo, validEntry, sampleEntries, filterEntries, summarize, escapeHTML, csvContent };
