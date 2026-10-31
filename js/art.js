// 手続き生成カードアート — SVG をデータURIとして描画

const PALETTES = {
  LIGHT: { deep: '#171204', mid: '#c9a53f', light: '#ffeeb4', glow: '#fff3c8' },
  DARK: { deep: '#120820', mid: '#7c3fb2', light: '#dcb8ff', glow: '#b86bff' },
  FIRE: { deep: '#1d0703', mid: '#d9501d', light: '#ffc37e', glow: '#ff7a2a' },
  WATER: { deep: '#03101d', mid: '#1d7db8', light: '#a6e6ff', glow: '#3fbcff' },
  WIND: { deep: '#03130f', mid: '#2aa97c', light: '#a9f6d4', glow: '#4be0a8' },
  EARTH: { deep: '#150f09', mid: '#a06e3a', light: '#e8caa0', glow: '#dca65f' }
}

const TYPE_PALETTE = {
  spell: { deep: '#04140f', mid: '#299a73', light: '#bbffdf', glow: '#38e2a2' },
  trap: { deep: '#170617', mid: '#ac2f86', light: '#ffc2e8', glow: '#ff4fb0' }
}

const ATTR_LABEL = {
  LIGHT: '光', DARK: '闇', FIRE: '炎', WATER: '水', WIND: '風', EARTH: '地'
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

function ring(c, r, op = 0.45, dash = '3 6') {
  return `<circle cx="160" cy="196" r="${r}" fill="none" stroke="${c.light}" stroke-opacity="${op}" stroke-width="1.2" stroke-dasharray="${dash}"/>`
}

function stars(c, seed) {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < 34; i++) {
    const x = 12 + r() * 296
    const y = 10 + r() * 330
    const s = 0.5 + r() * 1.7
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(2)}" fill="${c.light}" opacity="${(0.15 + r() * 0.6).toFixed(2)}"/>`
  }
  return out
}

function rays(c, seed) {
  const r = rng(seed + 7)
  let out = ''
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2
    const x = 160 + Math.cos(a) * 220
    const y = 190 + Math.sin(a) * 220
    out += `<line x1="160" y1="196" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${c.light}" stroke-opacity="0.1" stroke-width="14"/>`
  }
  return out
}

function bolt(c) {
  return `<path d="M186 44 L118 208 L162 206 L134 336 L226 168 L178 170 L214 44 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.6" stroke-width="1.4"/>`
}

function motif(card, c) {
  switch (card.motif || card.icon) {
    case 'dragon':
      return `
        <g transform="translate(160 206)">
          <path d="M-16 -44 C-90 -150 -170 -168 -196 -120 C-150 -96 -132 -64 -110 -20 C-148 -34 -172 -22 -186 6 C-142 6 -110 18 -78 44 Z" fill="url(#g1)" opacity="0.55"/>
          <path d="M16 -44 C90 -150 170 -168 196 -120 C150 -96 132 -64 110 -20 C148 -34 172 -22 186 6 C142 6 110 18 78 44 Z" fill="url(#g1)" opacity="0.55"/>
          <path d="M-72 30 L-92 -18 L-58 -36 L-44 -82 L-16 -44 L10 -96 L26 -38 L74 -54 L58 -8 L100 4 L62 26 L84 62 L34 54 L22 96 L-16 74 L-48 96 Z"
            fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.55" stroke-width="1.6"/>
          <path d="M-4 -20 L34 -34 L30 4 L-8 14 Z" fill="${c.deep}" stroke="${c.glow}" stroke-opacity="0.5"/>
          <circle cx="20" cy="-8" r="8" fill="${c.glow}" opacity="0.95"/>
          <circle cx="20" cy="-8" r="16" fill="${c.glow}" opacity="0.35"/>
          <path d="M-40 60 L-56 104 M-10 70 L-16 114 M26 66 L34 108" stroke="${c.light}" stroke-opacity="0.35" stroke-width="2"/>
        </g>`
    case 'warrior':
      return `
        <g transform="translate(160 204)">
          <circle cx="0" cy="6" r="92" fill="none" stroke="${c.light}" stroke-opacity="0.16" stroke-width="1.5" stroke-dasharray="2 8"/>
          <path d="M-84 108 Q-88 12 -46 -14 L46 -14 Q88 12 84 108 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.4" stroke-width="1.5"/>
          <path d="M-46 -14 L-58 -58 Q0 -96 58 -58 L46 -14 Z" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.5" stroke-width="1.5"/>
          <path d="M-40 -36 L40 -36 L34 -20 L-34 -20 Z" fill="${c.deep}" stroke="${c.glow}" stroke-opacity="0.8"/>
          <path d="M-26 -28 L26 -28" stroke="${c.glow}" stroke-width="3"/>
          <path d="M0 -24 L6 112 L0 128 L-6 112 Z" fill="${c.light}" opacity="0.95"/>
          <path d="M0 -24 L18 -6 L18 84 L0 96 L-18 84 L-18 -6 Z" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.7"/>
          <path d="M-38 74 L38 74" stroke="${c.light}" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
          <circle cx="0" cy="90" r="10" fill="${c.glow}" opacity="0.9"/>
        </g>`
    case 'mage':
      return `
        <g transform="translate(160 206)">
          ${[70, 92, 116].map((r, i) => `<circle cx="0" cy="-16" r="${r}" fill="none" stroke="${c.light}" stroke-opacity="${0.1 + i * 0.05}" stroke-width="1.2" stroke-dasharray="${i % 2 ? '2 10' : '20 14'}"/>`).join('')}
          <path d="M-58 112 Q-40 10 0 -20 Q40 10 58 112 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.4" stroke-width="1.5"/>
          <path d="M-34 -26 Q0 -78 34 -26 Q18 -12 0 -8 Q-18 -12 -34 -26 Z" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.6"/>
          <path d="M-12 -22 L12 -22 L8 4 L-8 4 Z" fill="${c.deep}"/>
          <circle cx="0" cy="-38" r="9" fill="${c.glow}" opacity="0.95"/>
          <circle cx="0" cy="-38" r="20" fill="${c.glow}" opacity="0.28"/>
          <path d="M52 112 L86 -84" stroke="${c.light}" stroke-opacity="0.8" stroke-width="5" stroke-linecap="round"/>
          <circle cx="88" cy="-96" r="16" fill="${c.glow}" opacity="0.9"/>
          <circle cx="88" cy="-96" r="30" fill="${c.glow}" opacity="0.22"/>
          <path d="M-40 60 Q0 44 40 60 M-46 84 Q0 68 46 84" stroke="${c.light}" stroke-opacity="0.3" fill="none" stroke-width="1.5"/>
        </g>`
    case 'beast':
      return `
        <g transform="translate(160 200)">
          <path d="M-76 -62 L-104 -118 L-44 -96 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
          <path d="M76 -62 L104 -118 L44 -96 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
          <path d="M-72 -58 Q-80 30 -44 74 Q0 118 44 74 Q80 30 72 -58 Q0 -92 -72 -58 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.45" stroke-width="1.6"/>
          <path d="M-40 -20 L-14 -8 L-26 18 Z" fill="${c.glow}" opacity="0.95"/>
          <path d="M40 -20 L14 -8 L26 18 Z" fill="${c.glow}" opacity="0.95"/>
          <path d="M-12 34 L0 20 L12 34 L0 46 Z" fill="${c.deep}" stroke="${c.light}" stroke-opacity="0.7"/>
          <path d="M-24 60 L-18 92 L-4 64 M24 60 L18 92 L4 64" fill="${c.light}" stroke="${c.light}" stroke-opacity="0.8" stroke-width="1.5"/>
          <path d="M-60 30 L-30 40 M60 30 L30 40" stroke="${c.light}" stroke-opacity="0.25" stroke-width="2"/>
        </g>`
    case 'rock':
      return `
        <g transform="translate(160 206)">
          <path d="M-104 74 L-74 -48 L-20 -84 L4 -18 L-30 82 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.45" stroke-width="1.4"/>
          <path d="M-6 -102 L48 -118 L92 -48 L56 16 L6 2 Z" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.55" stroke-width="1.4"/>
          <path d="M-26 88 L16 -22 L74 24 L96 96 L24 114 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5" stroke-width="1.6"/>
          <path d="M16 -22 L30 42 L74 24 M30 42 L-26 88" stroke="${c.glow}" stroke-opacity="0.5" fill="none"/>
          <circle cx="60" cy="-60" r="4" fill="${c.glow}"/>
          <circle cx="-78" cy="10" r="3" fill="${c.glow}"/>
        </g>`
    case 'machine':
      return `
        <g transform="translate(160 202)">
          <path d="M0 -110 L95 -55 L95 55 L0 110 L-95 55 L-95 -55 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.45" stroke-width="1.6"/>
          <path d="M0 -74 L64 -37 L64 37 L0 74 L-64 37 L-64 -37 Z" fill="${c.deep}" stroke="${c.light}" stroke-opacity="0.5"/>
          <circle cx="0" cy="0" r="34" fill="url(#g1)"/>
          <circle cx="0" cy="0" r="16" fill="${c.deep}" stroke="${c.glow}" stroke-width="3"/>
          <circle cx="0" cy="0" r="6" fill="${c.glow}"/>
          <path d="M-95 -55 L-64 -37 M95 -55 L64 -37 M-95 55 L-64 37 M95 55 L64 37 M0 -110 L0 -74 M0 110 L0 74" stroke="${c.light}" stroke-opacity="0.4" stroke-width="2"/>
          <circle cx="52" cy="-58" r="5" fill="${c.glow}" opacity="0.8"/>
          <circle cx="-52" cy="58" r="5" fill="${c.glow}" opacity="0.8"/>
        </g>`
    case 'fairy':
      return `
        <g transform="translate(160 200)">
          <ellipse cx="0" cy="-96" rx="42" ry="10" fill="none" stroke="${c.glow}" stroke-width="3" opacity="0.9"/>
          <path d="M-18 -30 Q-104 -80 -108 -6 Q-104 54 -18 26 Z" fill="url(#g1)" opacity="0.6" stroke="${c.light}" stroke-opacity="0.5"/>
          <path d="M18 -30 Q104 -80 108 -6 Q104 54 18 26 Z" fill="url(#g1)" opacity="0.6" stroke="${c.light}" stroke-opacity="0.5"/>
          <path d="M0 -52 Q28 -40 26 26 L40 108 L0 92 L-40 108 L-26 26 Q-28 -40 0 -52 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
          <circle cx="0" cy="-58" r="17" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.7"/>
          <path d="M-60 -104 L-74 -140 M60 -104 L74 -140" stroke="${c.glow}" stroke-opacity="0.5" stroke-width="2"/>
          <circle cx="-78" cy="-150" r="3" fill="${c.glow}"/>
          <circle cx="78" cy="-150" r="3" fill="${c.glow}"/>
        </g>`
    case 'plant':
      return `
        <g transform="translate(160 212)">
          <path d="M0 108 Q-10 40 -44 -10 M0 108 Q12 30 46 -6" stroke="${c.mid}" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M-44 -10 Q-108 -34 -112 20 Q-78 58 -26 30 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.35"/>
          <path d="M46 -6 Q108 -40 116 16 Q80 62 26 32 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.35"/>
          <path d="M0 40 Q-52 30 -54 0 Q-20 -24 4 8 Z" fill="url(#g1)" opacity="0.8"/>
          <circle cx="0" cy="-22" r="30" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.5"/>
          <circle cx="0" cy="-22" r="13" fill="${c.glow}" opacity="0.85"/>
          <circle cx="-58" cy="-72" r="3" fill="${c.glow}"/>
          <circle cx="62" cy="-64" r="3" fill="${c.glow}"/>
        </g>`
    case 'thunder':
      return `
        <g transform="translate(160 200)">
          <path d="M-108 -34 Q-128 -86 -78 -90 Q-64 -134 -8 -118 Q28 -158 76 -122 Q132 -130 128 -74 Q128 -34 88 -30 L-76 -30 Q-102 -30 -108 -34 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.4"/>
          ${bolt(c)}
          <path d="M-60 118 L-30 84 M60 118 L30 84 M0 128 L0 92" stroke="${c.light}" stroke-opacity="0.3" stroke-width="2"/>
        </g>`
    case 'sea':
      return `
        <g transform="translate(160 206)">
          <path d="M-118 72 Q-60 30 0 70 Q60 110 118 66" stroke="${c.mid}" stroke-width="10" fill="none" opacity="0.55"/>
          <path d="M-108 20 Q-54 -14 -10 12 Q34 38 78 8 Q108 -12 130 -4" stroke="${c.light}" stroke-opacity="0.3" stroke-width="3" fill="none"/>
          <path d="M-10 84 Q-64 34 -30 -20 Q0 -66 44 -50 Q80 -36 72 2 Q66 34 26 34 Q6 34 0 8" stroke="url(#g1)" stroke-width="26" fill="none" stroke-linecap="round"/>
          <path d="M48 -76 Q96 -108 106 -62 Q112 -26 74 -18 Q44 -12 38 -38 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
          <circle cx="76" cy="-52" r="6" fill="${c.glow}"/>
          <path d="M30 -34 L12 -18 M34 -20 L16 -4" stroke="${c.light}" stroke-opacity="0.5" stroke-width="2"/>
        </g>`
    case 'fiend':
      return `
        <g transform="translate(160 204)">
          <path d="M-20 -40 C-96 -118 -172 -110 -180 -56 C-140 -66 -112 -46 -88 -16 Z" fill="url(#g1)" opacity="0.5"/>
          <path d="M20 -40 C96 -118 172 -110 180 -56 C140 -66 112 -46 88 -16 Z" fill="url(#g1)" opacity="0.5"/>
          <path d="M-64 -66 L-92 -138 L-34 -96 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
          <path d="M64 -66 L92 -138 L34 -96 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
          <path d="M-70 -60 Q-84 30 -40 80 L-18 46 L0 96 L18 46 L40 80 Q84 30 70 -60 Q0 -104 -70 -60 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5" stroke-width="1.6"/>
          <path d="M-40 -18 L-12 -4 L-26 20 Z" fill="${c.glow}"/>
          <path d="M40 -18 L12 -4 L26 20 Z" fill="${c.glow}"/>
          <path d="M-28 52 L-18 76 L-6 56 M28 52 L18 76 L6 56" fill="${c.light}" stroke="${c.light}" stroke-opacity="0.7"/>
        </g>`
    // ── 魔法・罠アイコン ─────────────────
    case 'draw':
      return `<g transform="translate(160 200)">
        <path d="M-96 40 Q-96 -60 0 -74 Q96 -60 96 40 L96 76 Q0 64 0 64 Q0 64 -96 76 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
        <path d="M0 -74 L0 64" stroke="${c.light}" stroke-opacity="0.6" stroke-width="2"/>
        <path d="M-78 -30 Q-40 -44 -8 -36 M-78 -6 Q-40 -20 -8 -12 M8 -36 Q40 -44 78 -30 M8 -12 Q40 -20 78 -6" stroke="${c.light}" stroke-opacity="0.5" fill="none" stroke-width="1.5"/>
        <rect x="34" y="-118" width="42" height="58" rx="4" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.6" transform="rotate(12 55 -89)"/>
        <rect x="-78" y="-124" width="42" height="58" rx="4" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.6" transform="rotate(-14 -57 -95)"/>
      </g>`
    case 'destroy':
      return `<g transform="translate(160 200)">
        <circle cx="0" cy="0" r="86" fill="none" stroke="${c.light}" stroke-opacity="0.2" stroke-dasharray="4 8"/>
        <path d="M0 -96 L26 -24 L96 -12 L40 32 L56 100 L0 60 L-56 100 L-40 32 L-96 -12 L-26 -24 Z" fill="url(#g1)" opacity="0.7"/>
        <path d="M0 -96 L26 -24 L40 32 L0 60 L-40 32 L-26 -24 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.6"/>
        <path d="M0 -60 L12 4 L0 34 L-12 4 Z" fill="${c.deep}"/>
        <path d="M-96 -70 L-58 -46 M96 -70 L58 -46 M-104 62 L-64 44 M104 62 L64 44" stroke="${c.light}" stroke-opacity="0.5" stroke-width="2"/>
      </g>`
    case 'equip':
      return `<g transform="translate(160 200)">
        <path d="M-80 92 L64 -84" stroke="${c.light}" stroke-opacity="0.25" stroke-width="26" stroke-linecap="round"/>
        <path d="M-24 108 L6 78 M88 -108 L118 -138 M0 -70 L0 60" stroke="${c.light}" stroke-opacity="0.6" stroke-width="2"/>
        <path d="M-22 92 L-70 44 L44 -82 L92 -34 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.55"/>
        <path d="M-22 92 L44 -82 L92 -34 L26 140 Z" fill="url(#g1)" opacity="0.5"/>
        <circle cx="-10" cy="80" r="14" fill="${c.glow}" opacity="0.9"/>
        <path d="M84 -128 L96 -156 L108 -128 L136 -116 L108 -104 L96 -76 L84 -104 L56 -116 Z" fill="${c.glow}" opacity="0.8"/>
      </g>`
    case 'heal':
      return `<g transform="translate(160 200)">
        <circle cx="0" cy="0" r="88" fill="none" stroke="${c.light}" stroke-opacity="0.25" stroke-dasharray="2 8"/>
        <path d="M-22 -76 L22 -76 L22 -22 L76 -22 L76 22 L22 22 L22 76 L-22 76 L-22 22 L-76 22 L-76 -22 L-22 -22 Z" fill="url(#g1)" stroke="${c.light}" stroke-opacity="0.5"/>
        <circle cx="0" cy="0" r="18" fill="${c.deep}" opacity="0.4"/>
        <circle cx="0" cy="0" r="112" fill="${c.glow}" opacity="0.08"/>
        <path d="M-96 -64 L-116 -96 M96 -64 L116 -96" stroke="${c.light}" stroke-opacity="0.4" stroke-width="2"/>
      </g>`
    case 'revive':
      return `<g transform="translate(160 200)">
        <circle cx="0" cy="-4" r="86" fill="none" stroke="${c.light}" stroke-opacity="0.28" stroke-width="1.5" stroke-dasharray="30 12"/>
        <path d="M0 -104 L24 -52 L80 -48 L38 -8 L54 50 L0 20 L-54 50 L-38 -8 L-80 -48 L-24 -52 Z" fill="url(#g1)" opacity="0.28"/>
        <path d="M0 -72 Q42 -40 34 18 Q28 62 0 82 Q-28 62 -34 18 Q-42 -40 0 -72 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.5"/>
        <path d="M-96 44 Q-60 -8 -16 -14 M96 44 Q60 -8 16 -14" stroke="${c.glow}" stroke-opacity="0.5" fill="none" stroke-width="3"/>
        <circle cx="0" cy="-30" r="12" fill="${c.glow}"/>
      </g>`
    case 'barrier':
      return `<g transform="translate(160 200)">
        <path d="M0 -104 L82 -72 L74 18 Q64 76 0 106 Q-64 76 -74 18 L-82 -72 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.55" stroke-width="2"/>
        <path d="M0 -78 L58 -54 L52 14 Q44 58 0 80 Q-44 58 -52 14 L-58 -54 Z" fill="none" stroke="${c.light}" stroke-opacity="0.35" stroke-dasharray="6 6"/>
        <path d="M0 -40 L0 56 M-34 8 L34 8" stroke="${c.glow}" stroke-width="8" stroke-linecap="round" opacity="0.8"/>
        <circle cx="0" cy="8" r="46" fill="${c.glow}" opacity="0.08"/>
      </g>`
    case 'pit':
      return `<g transform="translate(160 200)">
        <circle cx="0" cy="-60" r="54" fill="${c.glow}" opacity="0.12"/>
        <path d="M-110 90 L-88 34 L-60 76 L-34 20 L-6 70 L22 16 L50 72 L76 30 L104 92 Z" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.45"/>
        <path d="M-110 90 L110 90 L96 118 L-96 118 Z" fill="${c.deep}" stroke="${c.light}" stroke-opacity="0.3"/>
        <path d="M-34 20 L-20 -22 L-6 70 M22 16 L34 -26 L50 72" stroke="${c.light}" stroke-opacity="0.5" stroke-width="2"/>
      </g>`
    case 'mirror':
      return `<g transform="translate(160 200)">
        <ellipse cx="0" cy="0" rx="76" ry="100" fill="url(#g2)" stroke="${c.light}" stroke-opacity="0.55" stroke-width="2"/>
        <ellipse cx="0" cy="0" rx="60" ry="82" fill="${c.deep}" stroke="${c.light}" stroke-opacity="0.35" stroke-dasharray="4 7"/>
        <path d="M-30 -44 Q10 -66 30 -26 Q46 14 8 30 Q-26 44 -34 8 Q-38 -24 -6 -30" stroke="${c.glow}" fill="none" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
        <path d="M-84 -78 L-106 -104 M84 -78 L106 -104 M-92 84 L-114 108 M92 84 L114 108" stroke="${c.light}" stroke-opacity="0.4" stroke-width="2"/>
      </g>`
    default:
      return `<g transform="translate(160 200)"><circle r="76" fill="url(#g1)"/></g>`
  }
}

export function cardArt(card) {
  const c = card.type === 'monster' ? PALETTES[card.attr] || PALETTES.LIGHT : TYPE_PALETTE[card.type]
  const seed = hash(card.name + (card.attr || card.type))
  const label = card.type === 'monster' ? ATTR_LABEL[card.attr] : null
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 440" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="bg" cx="50%" cy="34%" r="82%">
        <stop offset="0%" stop-color="${c.mid}" stop-opacity="0.38"/>
        <stop offset="46%" stop-color="${c.mid}" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${c.deep}"/>
      </radialGradient>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c.light}"/>
        <stop offset="52%" stop-color="${c.mid}"/>
        <stop offset="100%" stop-color="${c.deep}"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stop-color="${c.mid}"/>
        <stop offset="100%" stop-color="${c.deep}"/>
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0%" stop-color="${c.glow}" stop-opacity="0.5"/>
        <stop offset="60%" stop-color="${c.glow}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${c.glow}" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id="rim" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.6" flood-color="${c.glow}" flood-opacity="0.7"/>
      </filter>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="${c.light}" stroke-opacity="0.07" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="320" height="440" fill="${c.deep}"/>
    <rect width="320" height="440" fill="url(#bg)"/>
    <rect width="320" height="440" fill="url(#grid)"/>
    ${rays(c, seed)}
    <circle cx="160" cy="196" r="122" fill="url(#glow)" opacity="0.26"/>
    ${ring(c, 118, 0.3, '1 7')}
    ${ring(c, 146, 0.18, '18 12')}
    <g filter="url(#rim)">${motif(card, c)}</g>
    <ellipse cx="160" cy="356" rx="176" ry="54" fill="${c.deep}" opacity="0.5" filter="url(#soft)"/>
    ${stars(c, seed)}
    <path d="M0 0 L320 0 L320 440 L0 440 Z" fill="none" stroke="${c.light}" stroke-opacity="0.12"/>
    ${label ? `<text x="298" y="34" font-family="serif" font-size="15" fill="${c.light}" opacity="0.5" text-anchor="end">${label}</text>` : ''}
  </svg>`
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`
}

export const ATTR_COLOR = {
  LIGHT: '#e8cd7a', DARK: '#b78bf0', FIRE: '#ff8a52',
  WATER: '#6fd0ff', WIND: '#6ff0c0', EARTH: '#e0b47c'
}
