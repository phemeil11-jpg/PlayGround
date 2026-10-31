import { artFor, cardBackMarkup } from './art.js';
import { ATTRIBUTE_COLOR, KIND_LABEL } from './cards.js';
import { atkOf, defOf } from './engine.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

export function rarityClass(def) {
  return `rarity-${def.rarity || 'common'}`;
}

export function kindClass(def) {
  return `kind-${def.kind}`;
}

function stars(def) {
  const level = def.level || 0;
  let out = '';
  for (let i = 0; i < level; i++) out += '<i>★</i>';
  return `<span class="level-pips" aria-label="レベル${level}">${out}</span>`;
}

function glyph(def) {
  if (def.kind === 'spell') return '<span class="kind-glyph">魔</span>';
  if (def.kind === 'trap') return '<span class="kind-glyph">罠</span>';
  return stars(def);
}

function metaLine(def) {
  if (def.kind === 'monster') {
    return `Lv${def.level} · ${def.attribute}属性 · ${def.race}`;
  }
  return def.kind === 'spell' ? '魔法カード / ノーマル' : '罠カード / ノーマル';
}

function statsMarkup(card) {
  if (card.def.kind !== 'monster') {
    return `<div class="card-stats spell-stats"><span class="stat type">${KIND_LABEL[card.def.kind]}</span></div>`;
  }
  const baseAtk = card.def.atk;
  const baseDef = card.def.def;
  const atk = atkOf(card);
  const def = defOf(card);
  const buffed = atk !== baseAtk || def !== baseDef;
  return `<div class="card-stats${buffed ? ' buffed' : ''}">
    <span class="stat atk"><i>ATK</i><b>${atk}</b></span>
    <span class="stat def"><i>DEF</i><b>${def}</b></span>
  </div>`;
}

function handMarkup(card, extra) {
  const def = card.def;
  const accent = def.kind === 'monster' ? ATTRIBUTE_COLOR[def.attribute] : `hsl(${def.hue} 100% 70%)`;
  return `
    <div class="card hand-card ${kindClass(def)} ${rarityClass(def)} ${extra}" data-uid="${card.uid}" style="--accent:${accent}">
      <div class="card-frame">
        <div class="card-art">
          <div class="art-layer">${artFor(def)}</div>
          <div class="art-scan"></div>
          <div class="art-shine"></div>
          <div class="art-top">
            ${glyph(def)}
            <span class="kind-tag">${def.kind === 'monster' ? def.race : KIND_LABEL[def.kind]}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-name">${escapeHtml(def.name)}</div>
          <div class="card-meta">${metaLine(def)}</div>
          <div class="card-text">${escapeHtml(def.text || '')}</div>
          ${statsMarkup(card)}
        </div>
      </div>
      <div class="holo"></div>
      <div class="card-edge"></div>
    </div>`;
}

function fieldMarkup(card, extra) {
  const def = card.def;
  const accent = def.kind === 'monster' ? ATTRIBUTE_COLOR[def.attribute] : `hsl(${def.hue} 100% 70%)`;
  const buffed = card.def.kind === 'monster' && (card.atkMod || card.defMod);
  return `
    <div class="card field-card ${kindClass(def)} ${rarityClass(def)} ${buffed ? 'buffed' : ''} ${extra}" data-uid="${card.uid}" style="--accent:${accent}" title="${escapeHtml(def.name)}">
      <div class="card-art">
        <div class="art-layer">${artFor(def)}</div>
        <div class="art-scan"></div>
      </div>
      <div class="field-shade"></div>
      <div class="field-name">${escapeHtml(def.name)}</div>
      <div class="field-stats">
        ${def.kind === 'monster'
          ? `<b class="f-atk">${atkOf(card)}</b><span>/</span><b class="f-def">${defOf(card)}</b>`
          : `<b class="f-kind">${def.kind === 'spell' ? '魔法' : '罠'}</b>`}
      </div>
      <div class="holo"></div>
    </div>`;
}

function previewMarkup(card) {
  return handMarkup(card, 'preview-card');
}

export function cardMarkup(card, { variant = 'hand', extra = '' } = {}) {
  if (variant === 'field') return fieldMarkup(card, extra);
  if (variant === 'preview') return previewMarkup(card);
  return handMarkup(card, extra);
}

export function cardElement(card, options = {}) {
  const holder = document.createElement('div');
  holder.innerHTML = cardMarkup(card, options).trim();
  return holder.firstElementChild;
}

export function faceDownMarkup(variant = 'field', extra = '') {
  return `<div class="card ${variant}-card facedown ${extra}" aria-label="セットされたカード">
    <div class="card-frame">
      <div class="card-art back-art">${cardBackMarkup()}</div>
      <div class="back-shine"></div>
    </div>
  </div>`;
}

export function faceDownElement(variant = 'field', extra = '') {
  const holder = document.createElement('div');
  holder.innerHTML = faceDownMarkup(variant, extra).trim();
  return holder.firstElementChild;
}

export function cardText(card) {
  return `${card.def.name} / ${card.def.kind === 'monster' ? `ATK ${atkOf(card)} DEF ${defOf(card)}` : KIND_LABEL[card.def.kind]}`;
}
