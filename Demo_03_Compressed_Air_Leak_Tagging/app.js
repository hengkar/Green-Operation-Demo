import { seedLeaks, totals, nextId, validLeaks, POWER, STORAGE_KEY } from './model.js';

const paths = {
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
  tag: '<path d="M20 13 12 21 2 11V3h8Z"/><circle cx="7" cy="8" r="1"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
  leaf: '<path d="M20 3C6 2 1 9 6 16s16 3 14-13Z"/><path d="M4 21 15 10M8 17v-5m0 5h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  sort: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 8h8l3 4-6 6-7-7V6h5"/><circle cx="9" cy="10" r=".7"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.tag}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 }).format(value);
const tag = id => `LK-${String(id).padStart(3, '0')}`;
const escape = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let leaks = seedLeaks();
let filter = 'All';
let storageAvailable = true;
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    const data = JSON.parse(stored);
    if (validLeaks(data)) leaks = data;
  }
} catch { storageAvailable = false; }
let toastTimer;
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500);
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(leaks)); storageAvailable = true; }
  catch { storageAvailable = false; }
}
function render() {
  const result = totals(leaks);
  $('open-count').textContent = result.open;
  $('power').textContent = result.kw.toFixed(1);
  $('cost').textContent = money(result.cost);
  $('carbon').textContent = (result.carbon / 1000).toFixed(1);
  $('savings').textContent = `RM ${money(result.savings)}`;
  $('fixed-count').textContent = result.fixed;
  $('saved-carbon').textContent = `${(result.savedCarbon / 1000).toFixed(1)} t CO₂e avoided annually`;
  $('total-count').textContent = leaks.length;
  $('all-filter-count').textContent = leaks.length;
  $('open-filter-count').textContent = result.open;
  $('fixed-filter-count').textContent = result.fixed;
  const visible = leaks.filter(leak => filter === 'All' || leak.status === filter);
  $('leak-list').innerHTML = visible.map(leak => {
    const fixed = leak.status === 'Fixed';
    const date = new Date(`${leak.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `<article class="leak-card ${fixed ? 'fixed' : ''}" aria-label="${tag(leak.id)} ${escape(leak.location)} ${leak.status}">
      <span class="leak-icon">${icon(fixed ? 'check' : 'tag')}</span>
      <div class="leak-info"><div class="leak-topline"><span class="tag-number">${tag(leak.id)}</span><span class="status ${leak.status.toLowerCase()}">${leak.status}</span></div>
      <h3>${escape(leak.location)}</h3><div class="leak-meta"><span class="size-${leak.size.toLowerCase()}"><span class="size-dot"></span>${leak.size}</span><span class="meta-divider">·</span><span>Found ${escape(date)}</span></div></div>
      <div class="leak-actions"><span class="leak-power"><strong>${POWER[leak.size].toFixed(1)}</strong> kW ${fixed ? 'saved' : 'lost'}</span>${fixed ? `<span class="fixed-label">${icon('check')} All fixed</span>` : `<button class="fix-button" data-fix="${leak.id}" aria-label="Mark ${tag(leak.id)} fixed">${icon('check')} Mark fixed</button>`}</div>
    </article>`;
  }).join('') || `<div class="empty-state">${filter === 'Open' ? 'All clear. Every tagged leak is fixed!' : 'No leaks here yet. Your next walk starts with a tag.'}</div>`;
}

function setFilter(value) {
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  render();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
$('leak-list').addEventListener('click', event => {
  const button = event.target.closest('[data-fix]');
  if (!button) return;
  const leak = leaks.find(item => item.id === Number(button.dataset.fix));
  if (!leak || leak.status === 'Fixed') return;
  leak.status = 'Fixed';
  persist();
  render();
  notify(storageAvailable ? `${tag(leak.id)} marked fixed. A little less waste.` : 'Marked fixed for this visit. Device storage is unavailable.');
  const nextButton = $('leak-list').querySelector('[data-fix]');
  (nextButton || document.querySelector(`[data-filter="${filter}"]`)).focus({ preventScroll: true });
});
$('add-leak').addEventListener('click', () => {
  $('tag-form').reset();
  $('new-tag-number').textContent = tag(nextId(leaks));
  const now = new Date();
  $('date').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  $('location').setCustomValidity('');
  $('tag-dialog').showModal();
  $('location').focus();
});
$('close-dialog').addEventListener('click', () => $('tag-dialog').close());
$('location').addEventListener('input', () => $('location').setCustomValidity(''));
$('tag-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const location = data.get('location').trim();
  if (!location) {
    $('location').setCustomValidity('Enter a location for this leak.');
    $('location').reportValidity();
    return;
  }
  const leak = { id: nextId(leaks), location, size: data.get('size'), status: data.get('status'), date: data.get('date') };
  leaks.push(leak);
  persist();
  setFilter('All');
  $('tag-dialog').close();
  notify(storageAvailable ? `${tag(leak.id)} added. Keep the good walk going.` : 'Tag added for this visit. Device storage is unavailable.');
});
render();
if (!storageAvailable) notify('Device storage is unavailable. Changes may not survive a reload.');
