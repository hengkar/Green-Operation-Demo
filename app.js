const localFileNotice = document.getElementById('local-file-notice');
if (localFileNotice) localFileNotice.hidden = window.location.protocol !== 'file:';

const hoverCapability = window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)');

for (const card of document.querySelectorAll('.demo-card')) {
  card.addEventListener('pointermove', (event) => {
    if (!hoverCapability.matches) return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--mouse-x');
    card.style.removeProperty('--mouse-y');
  });
}
