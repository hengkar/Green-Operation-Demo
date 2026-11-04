'use strict';

const IDLE_HOURS = 10;
const ELECTRICITY_RATE = 0.204;
const EMISSIONS_FACTOR = 0.740;
const YEARLY_NIGHTS = 260;
const STORAGE_KEY = 'last-out-walk-v1';
const machines = [
  ...Array.from({ length: 4 }, (_, i) => ({ name: `Injection Moulder ${i + 1}`, power: 6, type: 'moulder' })),
  ...Array.from({ length: 3 }, (_, i) => ({ name: `CNC ${i + 1}`, power: 3, type: 'cnc' })),
  ...Array.from({ length: 2 }, (_, i) => ({ name: `Dryer ${i + 1}`, power: 4, type: 'dryer' })),
  { name: 'Chiller 1', power: 8, type: 'chiller' },
];

let states = Array(machines.length).fill(null);
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (Array.isArray(saved) && saved.length === machines.length && saved.every(state => [null, 'off', 'on'].includes(state))) {
    states = saved;
  }
} catch {
  // The checklist remains usable when browser storage is unavailable.
}

const iconPaths = {
  moulder: '<path d="M3 17h18M5 17V8h5v9M10 11h8v6M7 5v3M15 8v3M18 13h3v4M5 20v-3M19 20v-3"/>',
  cnc: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8v8H8zM12 4v4M12 16v4M4 12h4M16 12h4"/>',
  dryer: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6h1M12 6h4M10 13c1-2 3 2 4 0"/>',
  chiller: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/>',
};
const machineList = document.getElementById('machines');
machineList.innerHTML = machines.map((machine, i) => `
  <article class="machine-card" data-index="${i}" aria-labelledby="machine-${i}">
    <div class="machine-details">
      <span class="machine-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${iconPaths[machine.type]}</svg></span>
      <div><h3 class="machine-name" id="machine-${i}">${machine.name}</h3><div class="machine-meta"><strong>${machine.power} kW</strong> idle <span aria-hidden="true">·</span> ${machine.power * IDLE_HOURS} kWh if left on</div></div>
      <span class="machine-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    </div>
    <div class="machine-buttons" role="group" aria-label="${machine.name} status">
      <button class="machine-button off-button" type="button" data-status="off" aria-pressed="false" aria-label="${machine.name}: Off"><span class="button-icon" aria-hidden="true">⏻</span> Off</button>
      <button class="machine-button on-button" type="button" data-status="on" aria-pressed="false" aria-label="${machine.name}: Left on"><span class="button-icon" aria-hidden="true">ϟ</span> Left on</button>
    </div>
  </article>
`).join('');

const formatMoney = value => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function update() {
  const leftOn = states.filter(state => state === 'on').length;
  const checked = states.filter(state => state !== null).length;
  const energy = machines.reduce((total, machine, i) => total + (states[i] === 'on' ? machine.power * IDLE_HOURS : 0), 0);
  const cost = energy * ELECTRICITY_RATE;
  document.getElementById('left-on').innerHTML = `${leftOn}<span> / 10</span>`;
  document.getElementById('energy').textContent = energy.toFixed(1);
  document.getElementById('carbon').textContent = (energy * EMISSIONS_FACTOR).toFixed(1);
  document.getElementById('cost').textContent = formatMoney(cost);
  document.getElementById('yearly').textContent = formatMoney(cost * YEARLY_NIGHTS);
  document.getElementById('cost-announcement').textContent = `Tonight's cost: RM ${formatMoney(cost)}. Yearly cost: RM ${formatMoney(cost * YEARLY_NIGHTS)}.`;
  document.getElementById('progress-count').textContent = `${checked} / 10`;
  document.getElementById('progress').setAttribute('aria-valuenow', checked);
  document.getElementById('progress-fill').style.width = `${checked * 10}%`;

  const status = document.getElementById('impact-status');
  status.textContent = leftOn ? `${leftOn} left on` : checked === machines.length ? 'All switched off' : checked ? 'Walk in progress' : 'Walk not started';
  status.className = `status-pill${leftOn ? ' warning' : checked === machines.length ? ' success' : ''}`;
  document.getElementById('walk-message').textContent = checked === machines.length ? 'Walk complete. You can still update any machine below.' : `Tap a status for each machine as you walk.${checked ? ` ${machines.length - checked} to go.` : ''}`;
  document.getElementById('completion-text').textContent = checked === machines.length ? (leftOn ? 'Walk complete. Every switch-off still makes a difference.' : 'All off. A clean finish for this shift.') : 'A better shutdown starts with a quick check.';

  machineList.querySelectorAll('.machine-card').forEach((card, i) => {
    card.dataset.state = states[i] || 'unchecked';
    card.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(states[i] === button.dataset.status)));
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {
    // Storage is optional; calculations never depend on it.
  }
}

machineList.addEventListener('click', event => {
  const button = event.target.closest('button[data-status]');
  if (!button) return;
  const index = Number(button.closest('.machine-card').dataset.index);
  states[index] = button.dataset.status;
  update();
});

document.getElementById('reset').addEventListener('click', () => {
  states = Array(machines.length).fill(null);
  update();
});

update();
