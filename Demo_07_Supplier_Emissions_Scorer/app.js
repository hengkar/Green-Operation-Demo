const initialSuppliers = [
  { name: 'Evergreen Packaging', sector: 'Packaging & materials', electricity: true, scope: true, target: true, renewables: 80, iso: true },
  { name: 'Solara Components', sector: 'Electronics', electricity: true, scope: true, target: true, renewables: 40, iso: false },
  { name: 'Northwood Textiles', sector: 'Textiles & fabrics', electricity: true, scope: true, target: false, renewables: 30, iso: false },
  { name: 'Bluewater Logistics', sector: 'Transport & logistics', electricity: true, scope: false, target: true, renewables: 10, iso: false },
  { name: 'Terra Office Supply', sector: 'Office supplies', electricity: true, scope: false, target: false, renewables: 20, iso: false },
  { name: 'Meridian Metals', sector: 'Metals & manufacturing', electricity: false, scope: false, target: false, renewables: 0, iso: false }
];
const storageKey = 'canopy-suppliers-v1';
function validSupplier(s) {
  return s && typeof s.name === 'string' && s.name.trim().length > 0 && s.name.length <= 80 && typeof s.sector === 'string' && s.sector.length <= 60 && ['electricity', 'scope', 'target', 'iso'].every(key => typeof s[key] === 'boolean') && typeof s.renewables === 'number' && Number.isFinite(s.renewables) && s.renewables >= 0 && s.renewables <= 100;
}
let suppliers = initialSuppliers.map(s => ({ ...s }));
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved) && saved.length > 0 && saved.every(validSupplier)) suppliers = saved;
} catch { /* Storage may be unavailable in private browsing. */ }
function score(s) {
  return (s.electricity ? 20 : 0) + (s.scope ? 30 : 0) + (s.target ? 20 : 0) + s.renewables * 0.15 + (s.iso ? 15 : 0);
}
function band(value) {
  if (value >= 70) return { name: 'Leader', className: 'leader', color: 'green' };
  if (value >= 40) return { name: 'Developing', className: 'developing', color: 'lime' };
  return { name: 'Not started', className: 'not-started', color: 'gray' };
}
function formatScore(value) {
  return Number(value.toFixed(2)).toString();
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function render() {
  const ranked = [...suppliers].sort((a, b) => score(b) - score(a));
  document.getElementById('total-stat').textContent = suppliers.length;
  document.getElementById('average-stat').textContent = Math.round(suppliers.reduce((sum, s) => sum + score(s), 0) / suppliers.length);
  document.getElementById('leader-stat').textContent = suppliers.filter(s => score(s) >= 70).length;
  document.getElementById('grow-stat').textContent = suppliers.filter(s => score(s) < 40).length;
  document.getElementById('nav-count').textContent = suppliers.length;
  document.getElementById('table-count').textContent = `${suppliers.length} suppliers`;
  const chart = document.getElementById('score-chart');
  chart.replaceChildren();
  chart.setAttribute('aria-label', ranked.map(s => `${s.name}: ${formatScore(score(s))} out of 100, ${band(score(s)).name}`).join('; '));
  ranked.forEach(s => {
    const value = score(s);
    const row = element('div', 'chart-row');
    const name = element('span', 'chart-name', s.name);
    name.title = s.name;
    const track = element('div', 'bar-track');
    const barNode = element('div', `bar ${band(value).color}`);
    barNode.style.width = `${value}%`;
    track.append(barNode);
    row.append(name, track, element('span', 'chart-value', formatScore(value)));
    chart.append(row);
  });
  const axis = element('div', 'chart-axis');
  [0, 20, 40, 60, 80, 100].forEach(tick => axis.append(element('span', '', tick)));
  chart.append(axis);
  const query = document.getElementById('search').value.trim().toLowerCase();
  const table = document.getElementById('suppliers-table');
  table.replaceChildren();
  let shown = 0;
  ranked.forEach((s, index) => {
    if (!`${s.name} ${s.sector}`.toLowerCase().includes(query)) return;
    shown++;
    const row = element('tr');
    row.append(element('td', '', String(index + 1).padStart(2, '0')));
    const supplierCell = element('td');
    const identity = element('div', 'supplier-cell');
    const initials = s.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    const details = element('div');
    details.append(element('strong', '', s.name), element('small', '', s.sector || 'Supplier'));
    identity.append(element('span', 'supplier-avatar', initials), details);
    supplierCell.append(identity);
    row.append(supplierCell);
    ['electricity', 'scope', 'target', 'renewables', 'iso'].forEach(key => {
      const cell = element('td');
      if (key === 'renewables') cell.textContent = `${s.renewables}%`;
      else {
        const answer = element('span', s[key] ? 'yes' : 'no', s[key] ? '✓' : '—');
        answer.setAttribute('aria-label', s[key] ? 'Yes' : 'No');
        cell.append(answer);
      }
      row.append(cell);
    });
    const value = score(s);
    const scoreCell = element('td');
    scoreCell.append(element('span', 'table-score', formatScore(value)), element('span', 'score-max', '/100'));
    const bandCell = element('td');
    const badge = element('span', `band band-${band(value).className}`);
    badge.append(element('i'), document.createTextNode(band(value).name));
    bandCell.append(badge);
    row.append(scoreCell, bandCell);
    table.append(row);
  });
  if (!shown) {
    const cell = element('td', 'empty-state', 'No suppliers found. Try a different search.');
    cell.colSpan = 9;
    const row = element('tr');
    row.append(cell);
    table.append(row);
  }
  document.getElementById('showing-count').textContent = `Showing ${shown} of ${suppliers.length} suppliers`;
}
const dialog = document.getElementById('supplier-dialog');
const form = document.getElementById('supplier-form');
function formSupplier() {
  const data = new FormData(form);
  return {
    name: data.get('supplierName').trim(),
    sector: data.get('sector').trim(),
    electricity: data.has('electricity'),
    scope: data.has('scope'),
    target: data.has('target'),
    iso: data.has('iso'),
    renewables: Number(data.get('renewables'))
  };
}
document.getElementById('add-supplier').addEventListener('click', () => {
  form.reset();
  document.getElementById('supplier-name').setCustomValidity('');
  document.getElementById('preview-score').textContent = '0';
  dialog.showModal();
  document.getElementById('supplier-name').focus();
});
['close-dialog', 'cancel-dialog'].forEach(id => document.getElementById(id).addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
form.addEventListener('input', () => {
  document.getElementById('supplier-name').setCustomValidity('');
  const supplier = formSupplier();
  document.getElementById('preview-score').textContent = formatScore(score({ ...supplier, renewables: Math.max(0, Math.min(100, supplier.renewables || 0)) }));
});
let toastTimer;
form.addEventListener('submit', event => {
  event.preventDefault();
  const supplier = formSupplier();
  if (!supplier.name) {
    const input = document.getElementById('supplier-name');
    input.setCustomValidity('Please enter a supplier name.');
    input.reportValidity();
    return;
  }
  if (!form.reportValidity() || !validSupplier(supplier)) return;
  suppliers.push(supplier);
  let persisted = true;
  try { localStorage.setItem(storageKey, JSON.stringify(suppliers)); } catch { persisted = false; }
  document.getElementById('search').value = '';
  render();
  dialog.close();
  const toast = document.getElementById('toast');
  toast.textContent = persisted ? `${supplier.name} added to your portfolio` : 'Supplier added. Browser storage unavailable; changes last for this visit only.';
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
});
document.getElementById('search').addEventListener('input', render);
render();
