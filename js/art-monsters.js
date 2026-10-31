'use strict';

/* ============================================================
   Monster artwork — procedural SVG
   ============================================================ */

function artDragon(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 84%)`;
  return `<g transform="translate(100 78)">
    <ellipse cx="0" cy="2" rx="58" ry="44" fill="${g}" opacity=".5"/>
    <path d="M-8 -6 C-34 -38 -64 -50 -90 -42 C-66 -30 -56 -12 -56 8 C-72 0 -86 6 -94 20 C-66 12 -40 28 -28 48 C-34 24 -24 6 -12 -6 Z" fill="${f}" opacity=".8"/>
    <path d="M8 -6 C34 -38 64 -50 90 -42 C66 -30 56 -12 56 8 C72 0 86 6 94 20 C66 12 40 28 28 48 C34 24 24 6 12 -6 Z" fill="${f}" opacity=".8"/>
    <path d="M-14 0 L-58 6 M-18 -14 L-66 -22 M14 0 L58 6 M18 -14 L66 -22" stroke="${line}" stroke-width=".7" opacity=".4"/>
    <path d="M-13 46 C-15 20 -11 -2 0 -16 C11 -2 15 20 13 46 Z" fill="${f}"/>
    <path d="M0 -54 L19 -31 L13 -8 L0 4 L-13 -8 L-19 -31 Z" fill="${f}" stroke="${line}" stroke-width="1"/>
    <path d="M-12 -45 L-31 -64 L-17 -48 M12 -45 L31 -64 L17 -48" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M-9 -4 L-6 8 L-3 -3 M9 -4 L6 8 L3 -3" fill="#fff" opacity=".9"/>
    <circle cx="-7" cy="-28" r="2.9" fill="#fff"/><circle cx="7" cy="-28" r="2.9" fill="#fff"/>
    <circle cx="-7" cy="-28" r="1.3" fill="#ff2d5e"/><circle cx="7" cy="-28" r="1.3" fill="#ff2d5e"/>
    <path d="M-11 8 L0 19 L11 8" fill="none" stroke="${line}" stroke-width="1" opacity=".55"/>
  </g>`;
}

function artMage(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 86%)`;
  return `<g transform="translate(100 78)">
    <circle cx="0" cy="-16" r="42" fill="${g}" opacity=".42"/>
    <circle cx="0" cy="-16" r="34" fill="none" stroke="${line}" stroke-width=".8" stroke-dasharray="2 6" opacity=".55"/>
    <path d="M0 -4 C14 -4 25 12 27 30 C39 44 47 60 51 72 L-51 72 C-47 60 -39 44 -27 30 C-25 12 -14 -4 0 -4Z" fill="${f}" stroke="${line}" stroke-width=".8"/>
    <path d="M-27 34 C-38 48 -44 62 -47 72 M27 34 C38 48 44 62 47 72" stroke="${line}" stroke-width=".8" opacity=".5"/>
    <path d="M0 -47 C17 -47 28 -28 26 -7 C17 -18 8 -22 0 -22 C-8 -22 -17 -18 -26 -7 C-28 -28 -17 -47 0 -47Z" fill="${f}" stroke="${line}" stroke-width=".8"/>
    <ellipse cx="0" cy="-17" rx="11" ry="13" fill="#090513"/>
    <circle cx="-4" cy="-19" r="1.8" fill="#ffe08a"/><circle cx="4" cy="-19" r="1.8" fill="#ffe08a"/>
    <path d="M-9 -10 C-4 -6 4 -6 9 -10" stroke="${line}" stroke-width=".8" fill="none" opacity=".7"/>
    <line x1="35" y1="72" x2="32" y2="-28" stroke="${line}" stroke-width="2.2"/>
    <circle cx="32" cy="-36" r="10" fill="${g}"/><circle cx="32" cy="-36" r="4" fill="#fff"/>
    <circle cx="32" cy="-36" r="15" fill="none" stroke="${line}" stroke-width=".7" opacity=".6"/>
    <path d="M-51 72 L-58 62 L-46 58 M51 72 L58 62 L46 58" fill="${f}" opacity=".8"/>
  </g>`;
}

function artDemon(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 82%)`;
  return `<g transform="translate(100 80)">
    <ellipse cx="0" cy="-4" rx="52" ry="42" fill="${g}" opacity=".42"/>
    <path d="M-16 -6 C-42 -36 -70 -46 -92 -36 C-72 -24 -64 -8 -64 10 C-78 6 -90 14 -96 28 C-72 18 -46 28 -34 48 C-38 24 -28 8 -14 -4 Z" fill="${f}" opacity=".72"/>
    <path d="M16 -6 C42 -36 70 -46 92 -36 C72 -24 64 -8 64 10 C78 6 90 14 96 28 C72 18 46 28 34 48 C38 24 28 8 14 -4 Z" fill="${f}" opacity=".72"/>
    <path d="M0 -44 C22 -44 34 -28 34 -10 C34 2 28 12 18 16 L21 34 L10 24 L0 30 L-10 24 L-21 34 L-18 16 C-28 12 -34 2 -34 -10 C-34 -28 -22 -44 0 -44Z" fill="${f}" stroke="${line}" stroke-width="1"/>
    <path d="M-20 -38 C-34 -52 -43 -68 -34 -74 C-25 -66 -18 -54 -12 -44" fill="none" stroke="${line}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M20 -38 C34 -52 43 -68 34 -74 C25 -66 18 -54 12 -44" fill="none" stroke="${line}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-21 -18 L-7 -12 M21 -18 L7 -12" stroke="#ff2d5e" stroke-width="4" stroke-linecap="round"/>
    <circle cx="-14" cy="-14" r="2" fill="#ffe6a0"/><circle cx="14" cy="-14" r="2" fill="#ffe6a0"/>
    <path d="M-11 -2 L-7 8 L-3 -2 M11 -2 L7 8 L3 -2" fill="#fff" opacity=".9"/>
    <path d="M-30 2 L-38 12 M30 2 L38 12" stroke="${line}" stroke-width="1.4" opacity=".6"/>
  </g>`;
}

function artWarrior(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 85%)`;
  return `<g transform="translate(100 80)">
    <ellipse cx="0" cy="0" rx="44" ry="42" fill="${g}" opacity=".35"/>
    <g opacity=".72">
      <g transform="rotate(34)"><rect x="-2.5" y="-60" width="5" height="66" rx="1" fill="${f}"/><rect x="-9" y="4" width="18" height="4" fill="${line}"/><rect x="-2" y="-68" width="4" height="8" fill="${line}"/></g>
      <g transform="rotate(-34)"><rect x="-2.5" y="-60" width="5" height="66" rx="1" fill="${f}"/><rect x="-9" y="4" width="18" height="4" fill="${line}"/><rect x="-2" y="-68" width="4" height="8" fill="${line}"/></g>
    </g>
    <path d="M0 -30 L28 -18 L26 18 C21 34 10 42 0 46 C-10 42 -21 34 -26 18 L-28 -18 Z" fill="url(#dk${u})" stroke="${line}" stroke-width="1.4"/>
    <path d="M0 -20 L18 -12 L16 14 C12 24 6 30 0 33 C-6 30 -12 24 -16 14 L-18 -12 Z" fill="none" stroke="${line}" stroke-width=".8" opacity=".65"/>
    <circle cx="0" cy="6" r="8" fill="${g}"/><circle cx="0" cy="6" r="3" fill="#fff"/>
    <path d="M0 -52 C18 -52 28 -38 26 -20 L14 -14 L0 -22 L-14 -14 L-26 -20 C-28 -38 -18 -52 0 -52Z" fill="${f}" stroke="${line}" stroke-width="1"/>
    <rect x="-19" y="-30" width="38" height="6" fill="#0a0614" opacity=".9"/>
    <circle cx="-7" cy="-27" r="1.6" fill="#7ff6ff"/><circle cx="7" cy="-27" r="1.6" fill="#7ff6ff"/>
    <path d="M0 -52 C-4 -64 -2 -72 6 -78" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round"/>
    <path d="M-26 34 L-38 44 L-26 50 M26 34 L38 44 L26 50" fill="${f}" opacity=".85"/>
  </g>`;
}

function artHarpy(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 86%)`;
  return `<g transform="translate(100 78)">
    <ellipse cx="0" cy="-10" rx="52" ry="40" fill="${g}" opacity=".42"/>
    <path d="M-8 -10 C-32 -42 -62 -54 -90 -46 C-66 -34 -56 -16 -54 4 C-70 -4 -84 2 -92 16 C-66 8 -42 24 -30 44 C-36 22 -26 6 -14 -6 Z" fill="${f}" opacity=".72"/>
    <path d="M8 -10 C32 -42 62 -54 90 -46 C66 -34 56 -16 54 4 C70 -4 84 2 92 16 C66 8 42 24 30 44 C36 22 26 6 14 -6 Z" fill="${f}" opacity=".72"/>
    <path d="M-54 4 L-80 8 M-50 -10 L-74 -20 M54 4 L80 8 M50 -10 L74 -20" stroke="${line}" stroke-width=".8" opacity=".45"/>
    <path d="M0 -26 C9 -26 13 -16 12 -6 L20 34 L-20 34 L-12 -6 C-13 -16 -9 -26 0 -26Z" fill="${f}" stroke="${line}" stroke-width=".7"/>
    <circle cx="0" cy="-40" r="13" fill="${f}" stroke="${line}" stroke-width=".7"/>
    <path d="M-13 -42 C-20 -58 -8 -64 -2 -52 C2 -46 -6 -40 -13 -42Z" fill="${f}"/>
    <path d="M-13 -44 C-26 -56 -40 -50 -34 -38 C-28 -30 -18 -36 -13 -44Z" fill="${f}" opacity=".9"/>
    <circle cx="-4" cy="-42" r="1.7" fill="#7ff6ff"/><circle cx="4" cy="-42" r="1.7" fill="#7ff6ff"/>
    <path d="M-5 -34 C-2 -32 2 -32 5 -34" stroke="${line}" stroke-width=".7" fill="none"/>
    <path d="M-12 -18 C-24 -10 -28 4 -24 18 M12 -18 C24 -10 28 4 24 18" stroke="${f}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M-20 34 L-26 50 L-8 42 M20 34 L26 50 L8 42" fill="${f}" opacity=".7"/>
  </g>`;
}

function artBeast(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 85%)`;
  return `<g transform="translate(100 78)">
    <ellipse cx="0" cy="0" rx="48" ry="42" fill="${g}" opacity=".38"/>
    <path d="M0 -54 L16 -46 L30 -54 L34 -36 L50 -30 L42 -16 L54 -6 L40 2 L46 18 L30 20 L28 38 L12 30 L0 44 L-12 30 L-28 38 L-30 20 L-46 18 L-40 2 L-54 -6 L-42 -16 L-50 -30 L-34 -36 L-30 -54 L-16 -46 Z" fill="${f}" opacity=".45"/>
    <path d="M0 -40 C24 -40 36 -22 34 2 C32 22 18 36 0 40 C-18 36 -32 22 -34 2 C-36 -22 -24 -40 0 -40Z" fill="${f}" stroke="${line}" stroke-width=".9"/>
    <path d="M-30 -30 L-24 -58 L-8 -40 M30 -30 L24 -58 L8 -40" fill="${f}" stroke="${line}" stroke-width=".8"/>
    <path d="M-24 -14 L-10 -8 M24 -14 L10 -8" stroke="#ffcf5e" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M-13 6 L0 -2 L13 6 L7 20 L-7 20 Z" fill="url(#dk${u})"/>
    <circle cx="0" cy="14" r="3" fill="#120a08"/>
    <path d="M-7 20 L-5 30 L-1 21 M7 20 L5 30 L1 21" fill="#fff" opacity=".92"/>
    <path d="M-34 8 L-46 2 M34 8 L46 2" stroke="${line}" stroke-width="1.4" opacity=".55"/>
  </g>`;
}

function artRock(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 82%)`;
  return `<g transform="translate(100 80)">
    <ellipse cx="0" cy="8" rx="52" ry="40" fill="${g}" opacity=".3"/>
    <path d="M-52 44 L-58 6 L-34 -20 L-8 -30 L20 -26 L46 -6 L54 24 L36 46 Z" fill="${f}" stroke="${line}" stroke-width=".9"/>
    <path d="M-30 44 L-30 10 L-6 0 L18 8 L24 44 Z" fill="url(#dk${u})" opacity=".55"/>
    <path d="M-14 -44 L0 -58 L14 -44 L10 -28 L-10 -28 Z" fill="${f}" stroke="${line}" stroke-width=".8"/>
    <circle cx="-4" cy="-38" r="1.6" fill="${line}"/><circle cx="4" cy="-38" r="1.6" fill="${line}"/>
    <path d="M-40 10 L-24 18 M32 0 L44 12 M-20 34 L-10 26 M28 32 L36 24" stroke="${line}" stroke-width="1" opacity=".55"/>
    <circle cx="0" cy="20" r="9" fill="${g}" opacity=".75"/><path d="M0 14 L3 20 L0 26 L-3 20 Z" fill="#fff" opacity=".8"/>
    <path d="M-58 6 L-70 2 M54 24 L66 20" stroke="${line}" stroke-width="1" opacity=".5"/>
  </g>`;
}

function artMachine(u, hue) {
  const f = `url(#mt${u})`, g = `url(#gl${u})`, line = `hsl(${hue} 100% 84%)`;
  return `<g transform="translate(100 80)">
    <ellipse cx="0" cy="0" rx="50" ry="40" fill="${g}" opacity=".38"/>
    <path d="M0 -50 L26 -38 L38 -14 L60 -4 L44 10 L48 34 L20 26 L0 40 L-20 26 L-48 34 L-44 10 L-60 -4 L-38 -14 L-26 -38 Z" fill="${f}" stroke="${line}" stroke-width=".9"/>
    <path d="M0 -34 L18 -22 L22 2 L0 18 L-22 2 L-18 -22 Z" fill="url(#dk${u})" stroke="${line}" stroke-width="1.1"/>
    <circle cx="0" cy="-6" r="10" fill="${g}"/><circle cx="0" cy="-6" r="3.8" fill="#fff"/>
    <path d="M-34 -20 L-48 -28 M34 -20 L48 -28 M-30 20 L-44 28 M30 20 L44 28" stroke="${line}" stroke-width="2" stroke-linecap="round" opacity=".75"/>
    <path d="M-10 34 L0 44 L10 34" fill="none" stroke="${line}" stroke-width="1.2" opacity=".6"/>
    <path d="M-52 2 L-60 -2 M52 2 L60 -2" stroke="${line}" stroke-width="1.2" opacity=".5"/>
  </g>`;
}

const MONSTER_ART = {
  dragon: artDragon, mage: artMage, demon: artDemon, warrior: artWarrior,
  harpy: artHarpy, beast: artBeast, rock: artRock, machine: artMachine
};
