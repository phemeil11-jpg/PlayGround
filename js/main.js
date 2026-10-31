import { DuelUI } from './ui.js';
import { cardElement } from './render.js';
import { createInstance } from './engine.js';
import { CARD_POOL } from './cards.js';

const ui = new DuelUI();
window.__duelUI = ui;

document.getElementById('start-btn').addEventListener('click', () => {
  ui.start();
});

document.getElementById('howto-btn').addEventListener('click', () => {
  ui.showRules();
});

// Decorative cards on the title screen.
const showcase = document.getElementById('title-showcase');
for (const id of ['aurora_dragon', 'dark_mage', 'holy_barrier']) {
  const def = CARD_POOL[id];
  if (!def) continue;
  showcase.append(cardElement(createInstance(def), { variant: 'hand' }));
}
