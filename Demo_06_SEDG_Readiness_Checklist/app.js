const STORAGE_KEY = 'ready-set-esg-v1';
const statuses = { have: { label: 'Have data', symbol: '✓', value: 1 }, partly: { label: 'Partly', symbol: '◐', value: 0.5 }, no: { label: 'No data', symbol: '−', value: 0 } };
const groups = [
  { id: 'environment', name: 'Environment', subtitle: 'Your footprint, made clearer.', icon: '<path d="M19 3C9 2 3 7 5 14c2 6 12 5 14-11Z"/><path d="M3 21 14 10M8 16v-5m0 5h5"/>', items: [
    { id: 'electricity', title: 'Electricity consumption', description: 'Electricity used in kWh. Start with your monthly utility bills.' },
    { id: 'fuel', title: 'Fuel use', description: 'Diesel, petrol, gas and other fuels used, with quantities and units.' },
    { id: 'water', title: 'Water consumption', description: 'Water used in m³. Your water bills are a good starting point.' },
    { id: 'waste', title: 'Waste generated', description: 'Waste quantities, types, and how it is recycled or disposed of.' },
    { id: 'scope1', title: 'Scope 1 emissions', description: 'Direct emissions from your fuel use, vehicles and equipment, in tCO₂e.' },
    { id: 'scope2', title: 'Scope 2 emissions', description: 'Indirect emissions from purchased electricity, in tCO₂e.' }
  ] },
  { id: 'social', name: 'Social', subtitle: 'The people behind your business.', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>', items: [
    { id: 'headcount', title: 'Employee headcount', description: 'Your total workforce and a breakdown by employment type.' },
    { id: 'training', title: 'Training hours', description: 'Hours of employee training, supported by attendance or training logs.' },
    { id: 'injuries', title: 'Workplace injuries', description: 'Work-related injuries and incidents, including a record if there were none.' },
    { id: 'welfare', title: 'Worker welfare policies', description: 'Policies on fair treatment, working conditions and employee wellbeing.' }
  ] },
  { id: 'governance', name: 'Governance', subtitle: 'Good practices that build trust.', icon: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/>', items: [
    { id: 'bribery', title: 'Anti-bribery policy', description: 'A documented policy on preventing bribery and corruption.' },
    { id: 'whistleblowing', title: 'Whistleblowing channel', description: 'A clear, confidential way for people to raise concerns.' },
    { id: 'oversight', title: 'Owner / board oversight', description: 'A named owner or board member who oversees ESG matters.' }
  ] }
];
const items = groups.flatMap(group => group.items.map(item => ({ ...item, group: group.name })));
let storageAvailable = true;
let state = {};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  for (const item of items) {
    const entry = saved?.[item.id];
    state[item.id] = { status: Object.hasOwn(statuses, entry?.status) ? entry.status : 'no', owner: typeof entry?.owner === 'string' ? entry.owner.slice(0, 100) : '' };
  }
} catch {
  storageAvailable = false;
}
for (const item of items) state[item.id] ??= { status: 'no', owner: '' };

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  updateSaveState();
}
function updateSaveState() {
  document.getElementById('save-state').textContent = storageAvailable ? '✓ All changes saved on this device' : 'Changes stay open here, but device storage is unavailable.';
}
function percentage(list) {
  return Math.round(list.reduce((sum, item) => sum + statuses[state[item.id].status].value, 0) / list.length * 100);
}
function renderChecklist() {
  document.getElementById('checklist-groups').innerHTML = groups.map((group, groupIndex) => `
    <section class="checklist-group ${group.id}" aria-labelledby="${group.id}-title">
      <div class="group-heading"><span class="group-symbol" aria-hidden="true"><svg viewBox="0 0 24 24">${group.icon}</svg></span><div><h3 id="${group.id}-title">${group.name}</h3><p>${group.subtitle}</p></div><span class="group-count">${group.items.length} items · <span id="${group.id}-count">0</span> ready</span></div>
      ${group.items.map((item, index) => `
        <article class="item-card" id="item-${item.id}" aria-labelledby="title-${item.id}">
          <div class="item-title-row"><h4 id="title-${item.id}">${item.title}</h4><span class="item-number">0${groupIndex + 1}.${String(index + 1).padStart(2, '0')}</span></div>
          <p class="item-description">${item.description}</p>
          <div class="status-buttons" role="group" aria-labelledby="title-${item.id}">
            ${Object.entries(statuses).map(([key, status]) => `<button type="button" class="status-button" data-item="${item.id}" data-status="${key}" aria-pressed="${state[item.id].status === key}"><span class="button-symbol" aria-hidden="true">${status.symbol}</span>${status.label}</button>`).join('')}
          </div>
          <div class="owner-row"><label for="owner-${item.id}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="2.5"/><path d="M3 14v-1a5 5 0 0 1 10 0v1"/></svg>Owner</label><input id="owner-${item.id}" data-owner="${item.id}" aria-label="Owner for ${item.title}" placeholder="Add a name (optional)" maxlength="100" autocomplete="off"></div>
        </article>`).join('')}
    </section>`).join('');
  for (const item of items) document.getElementById(`owner-${item.id}`).value = state[item.id].owner;
  document.getElementById('group-scores').innerHTML = groups.map(group => `<div class="group-score ${group.id}"><span class="group-score-name"><span class="score-dot ${group.id}"></span>${group.name}</span><div class="progress-track" role="progressbar" aria-label="${group.name} readiness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="${group.id}-progress"><div class="progress-fill"></div></div><span class="score-value" id="${group.id}-score">0%</span></div>`).join('');
}
function updateSummary() {
  const score = percentage(items);
  document.getElementById('overall-score').textContent = score;
  document.getElementById('score-ring').style.setProperty('--score', score);
  document.getElementById('ready-count').textContent = `${items.filter(item => state[item.id].status === 'have').length} / ${items.length}`;
  document.getElementById('overall-caption').textContent = score === 100 ? 'All items ready. Keep your records up to date.' : score >= 70 ? 'Looking good. Close the gaps and keep going.' : score > 0 ? 'You’re making progress. One step at a time.' : 'A starting point. Every bit of data counts.';
  for (const group of groups) {
    const value = percentage(group.items);
    document.getElementById(`${group.id}-score`).textContent = `${value}%`;
    document.getElementById(`${group.id}-count`).textContent = group.items.filter(item => state[item.id].status === 'have').length;
    const progress = document.getElementById(`${group.id}-progress`);
    progress.setAttribute('aria-valuenow', value);
    progress.firstElementChild.style.width = `${value}%`;
  }
  updateGaps();
}
function updateGaps() {
  const gaps = items.filter(item => state[item.id].status !== 'have').sort((a, b) => statuses[state[a.id].status].value - statuses[state[b.id].status].value).slice(0, 5);
  const list = document.getElementById('gap-list');
  list.replaceChildren();
  if (!gaps.length) {
    const message = document.createElement('li');
    message.className = 'empty-gaps';
    message.textContent = '✓ No gaps left. All 13 items have data — a great foundation for your next customer conversation.';
    list.append(message);
    return;
  }
  gaps.forEach((item, index) => {
    const entry = state[item.id];
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'gap-link';
    link.href = `#item-${item.id}`;
    link.style.textDecoration = 'none';
    link.innerHTML = `<span class="gap-number">${index + 1}</span><span class="gap-info"><span class="gap-title">${item.title}</span><span class="gap-owner"></span></span><span class="gap-status ${entry.status === 'partly' ? 'partial' : ''}">${statuses[entry.status].label}</span><span class="gap-arrow" aria-hidden="true">↗</span>`;
    link.querySelector('.gap-owner').textContent = `${item.group} · ${entry.owner.trim() || 'Owner not assigned'}`;
    li.append(link);
    list.append(li);
  });
}
renderChecklist();
updateSummary();
updateSaveState();
document.getElementById('checklist-groups').addEventListener('click', event => {
  const button = event.target.closest('button[data-status]');
  if (!button) return;
  state[button.dataset.item].status = button.dataset.status;
  for (const sibling of button.parentElement.children) sibling.setAttribute('aria-pressed', String(sibling === button));
  save();
  updateSummary();
});
document.getElementById('checklist-groups').addEventListener('input', event => {
  const id = event.target.dataset.owner;
  if (!id) return;
  state[id].owner = event.target.value;
  save();
  updateGaps();
});
