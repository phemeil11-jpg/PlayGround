'use strict';

/* ============================================================
   Spell / trap artwork + card back — procedural SVG
   ============================================================ */

const BACK_SVG = `<svg viewBox="0 0 100 140" aria-hidden="true">
  <circle cx="50" cy="64" r="31" fill="none" stroke="#e9c877" stroke-width=".8" opacity=".55"/>
  <circle cx="50" cy="64" r="24" fill="none" stroke="#e9c877" stroke-width=".5" opacity=".35" stroke-dasharray="1 3"/>
  <circle cx="50" cy="64" r="37" fill="none" stroke="#b98cff" stroke-width=".5" opacity=".28"/>
  <path d="M50 30 L55 45 L70 50 L56 57 L58 73 L50 64 L42 73 L44 57 L30 50 L45 45 Z" fill="#e9c877" opacity=".75"/>
  <path d="M26 96 C34 86 43 82 50 82 C57 82 66 86 74 96 C65 93 57 91 50 91 C43 91 35 93 26 96Z" fill="#b98cff" opacity=".55"/>
  <path d="M50 86 L50 98 M40 89 L46 97 M60 89 L54 97" stroke="#e9c877" stroke-width=".8" opacity=".5"/>
  <text x="50" y="121" text-anchor="middle" font-size="7" letter-spacing="3.4" fill="#e9c877" opacity=".6" font-family="serif">DUEL</text>
</svg>`;

function sparkles(u) {
  const seed = parseInt((u || 'c1').replace(/\D/g, ''), 10) || 1;
  const rnd = n => { const x = Math.sin(seed * 97.13 + n * 31.7) * 43758.5453; return x - Math.floor(x); };
  let out = '';
  for (let i = 0; i < 16; i++) {
    const x = (rnd(i) * 200).toFixed(1), y = (rnd(i + 40) * 150).toFixed(1);
    const r = (rnd(i + 80) * 1.7 + .4).toFixed(1), o = (rnd(i + 10) * .5 + .12).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }
  return `<g>${out}</g>`;
}

function svgOpen(u, hue) {
  return `<svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="bg${u}" cx="50%" cy="42%" r="78%">
      <stop offset="0" stop-color="hsl(${hue} 92% 58%)"/>
      <stop offset=".4" stop-color="hsl(${hue} 78% 33%)"/>
      <stop offset="1" stop-color="hsl(${hue} 66% 7%)"/>
    </radialGradient>
    <linearGradient id="mt${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 100% 95%)"/>
      <stop offset=".45" stop-color="hsl(${hue} 92% 70%)"/>
      <stop offset="1" stop-color="hsl(${hue} 85% 36%)"/>
    </linearGradient>
    <linearGradient id="dk${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 72% 26%)"/>
      <stop offset="1" stop-color="hsl(${hue} 72% 7%)"/>
    </linearGradient>
    <radialGradient id="gl${u}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
      <stop offset=".35" stop-color="hsl(${hue} 100% 82%)" stop-opacity=".75"/>
      <stop offset="1" stop-color="hsl(${hue} 100% 60%)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vg${u}" cx="50%" cy="46%" r="72%">
      <stop offset=".42" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".72"/>
    </radialGradient>
  </defs>
  <rect width="200" height="150" fill="url(#bg${u})"/>
  ${sparkles(u)}
  <ellipse cx="100" cy="74" rx="72" ry="56" fill="url(#gl${u})" opacity=".42"/>`;
}

function runeRing(cx, cy, r, color) {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x = (cx + Math.cos(a) * r).toFixed(1), y = (cy + Math.sin(a) * r).toFixed(1);
    out += `<rect x="${(x - 1.4)}" y="${(y - 4)}" width="2.8" height="8" fill="${color}" opacity="${i % 3 ? .3 : .62}" transform="rotate(${i * 30} ${x} ${y})"/>`;
  }
  return `<g>${out}</g>`;
}

function spellArt(u, hue, sym) {
  const line = `hsl(${hue} 100% 84%)`;
  return `<g>
    <circle cx="100" cy="72" r="54" fill="none" stroke="${line}" stroke-width=".7" opacity=".35" stroke-dasharray="2 6"/>
    <circle cx="100" cy="72" r="43" fill="none" stroke="${line}" stroke-width="1.3" opacity=".7"/>
    <circle cx="100" cy="72" r="36" fill="url(#dk${u})" opacity=".45"/>
    ${runeRing(100, 72, 49, line)}
    <circle cx="100" cy="72" r="30" fill="url(#gl${u})" opacity=".4"/>
    <text x="100" y="94" text-anchor="middle" font-family="serif" font-size="56" font-weight="700" fill="none" stroke="${line}" stroke-width="3" opacity=".3">${sym}</text>
    <text x="100" y="94" text-anchor="middle" font-family="serif" font-size="56" font-weight="700" fill="#f8e7b0" opacity=".95">${sym}</text>
    <path d="M100 12 L100 22 M100 122 L100 132 M40 72 L50 72 M150 72 L160 72" stroke="${line}" stroke-width="1.3" opacity=".55"/>
  </g>`;
}

function trapArt(u, hue, sym) {
  const line = `hsl(${hue} 100% 84%)`;
  return `<g>
    <path d="M100 18 L166 128 L34 128 Z" fill="none" stroke="${line}" stroke-width="1.2" opacity=".5"/>
    <path d="M100 30 L156 119 L44 119 Z" fill="url(#dk${u})" opacity=".55"/>
    <circle cx="100" cy="72" r="42" fill="url(#gl${u})" opacity=".32"/>
    <ellipse cx="100" cy="62" rx="33" ry="20" fill="#070410" stroke="#e9c877" stroke-width="1.2"/>
    <ellipse cx="100" cy="62" rx="13.5" ry="13.5" fill="hsl(${hue} 90% 55%)" opacity=".92"/>
    <circle cx="100" cy="62" r="6" fill="#0b0616"/>
    <circle cx="95.5" cy="57.5" r="2" fill="#fff" opacity=".9"/>
    <text x="100" y="119" text-anchor="middle" font-family="serif" font-size="20" font-weight="700" fill="#f8e7b0" opacity=".82">${sym}</text>
  </g>`;
}

function artFor(card) {
  const u = card.uid.replace(/[^a-z0-9]/gi, '');
  const hue = card.hue;
  let body;
  if (card.kind === 'monster') body = (MONSTER_ART[card.art] || artWarrior)(u, hue);
  else if (card.kind === 'spell') body = spellArt(u, hue, card.symbol);
  else body = trapArt(u, hue, card.symbol);
  return `${svgOpen(u, hue)}${body}<rect width="200" height="150" fill="url(#vg${u})"/></svg>`;
}
