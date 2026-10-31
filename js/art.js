import { ATTRIBUTES } from './data.js';

const hash = (value) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

function defs(c, u) {
  return `<defs>
    <linearGradient id="sky${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.deep}"/><stop offset=".52" stop-color="#0a0817"/><stop offset="1" stop-color="#030208"/>
    </linearGradient>
    <radialGradient id="orb${u}" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${c.glow}" stop-opacity=".95"/>
      <stop offset=".45" stop-color="${c.color}" stop-opacity=".32"/>
      <stop offset="1" stop-color="${c.color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".55" stop-color="${c.color}" stop-opacity="0"/>
      <stop offset="1" stop-color="${c.color}" stop-opacity=".32"/>
    </linearGradient>
    <filter id="blur${u}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4.2"/></filter>
    <filter id="soft${u}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.7"/></filter>
  </defs>`;
}

function stars(seed, c) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < 18; i++) {
    out += `<circle cx="${(r() * 196 + 2).toFixed(1)}" cy="${(r() * 140 + 6).toFixed(1)}" r="${(r() * 1.3 + .35).toFixed(2)}" opacity="${(r() * .6 + .15).toFixed(2)}"/>`;
  }
  return out;
}

function base(c, u, seed, ox = 148, oy = 46, orad = 30) {
  return `<rect width="200" height="200" fill="url(#sky${u})"/>
    <circle cx="${ox}" cy="${oy}" r="${orad * 2.8}" fill="url(#orb${u})"/>
    <circle cx="${ox}" cy="${oy}" r="${orad}" fill="${c.glow}" opacity=".14"/>
    <circle cx="${ox}" cy="${oy}" r="${orad * .78}" fill="none" stroke="${c.color}" stroke-opacity=".35"/>
    <g fill="${c.glow}">${stars(seed, c)}</g>
    <g opacity=".16" fill="none" stroke="${c.color}" stroke-width=".7">
      <ellipse cx="100" cy="122" rx="92" ry="42"/>
      <ellipse cx="100" cy="122" rx="68" ry="30"/>
      <path d="M8 122 H192 M100 80 V164"/>
    </g>
    <path d="M0 158 Q36 142 74 154 T132 150 T200 158 V200 H0Z" fill="#04030a" opacity=".86"/>
    <path d="M0 158 Q36 142 74 154 T132 150 T200 158" fill="none" stroke="${c.color}" stroke-opacity=".3"/>`;
}

function glowLine(c, u, d, width = 2) {
  return `<path d="${d}" fill="none" stroke="${c.glow}" stroke-width="${width}" stroke-linecap="round" filter="url(#soft${u})" opacity=".85"/>`;
}

const ART = {
  paladin: (c, u) => `
    <path d="M48 104 C40 66 62 34 100 34 C138 34 160 66 152 104 L142 92 C142 60 126 48 100 48 C74 48 58 60 58 92Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M100 54 C85 54 77 66 79 82 L68 154 L92 154 L96 124 L104 124 L108 154 L132 154 L121 82 C123 66 115 54 100 54Z" fill="#07060d" stroke="${c.color}" stroke-width="1.4"/>
    <path d="M100 58 C90 58 85 66 85 75 L88 93 L112 93 L115 75 C115 66 110 58 100 58Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M100 36 L100 55" stroke="${c.glow}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M100 24 C93 34 93 42 100 50 C107 42 107 34 100 24Z" fill="${c.glow}" opacity=".9"/>
    <circle cx="100" cy="73" r="4.5" fill="${c.glow}"/>
    <path d="M83 96 L74 124 M117 96 L126 124" stroke="${c.color}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <path d="M138 32 L145 128 L138 144 L131 128Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="1.6"/>
    <path d="M138 18 L143 32 L133 32Z" fill="${c.glow}"/>
    <path d="M120 101 L136 114 L124 120" fill="none" stroke="${c.color}" stroke-width="2"/>
    <circle cx="100" cy="112" r="8" fill="none" stroke="${c.glow}" stroke-opacity=".7"/>
    <path d="M100 105 V119 M93 112 H107" stroke="${c.glow}" stroke-width="1.4"/>
    ${glowLine(c, u, 'M76 150 L124 150', 1.4)}
    <path d="M20 176 L44 164 L52 170 L28 184Z" fill="${c.deep}" opacity=".5"/>`,

  dragon: (c, u) => `
    <path d="M80 104 C58 68 28 46 10 54 C28 66 32 86 44 104 C54 120 66 126 80 120Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".7"/>
    <path d="M120 100 C144 62 174 42 190 50 C172 64 166 84 154 102 C144 118 132 122 118 116Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".7"/>
    <path d="M30 166 C58 158 54 132 76 120 C94 110 88 88 106 78 C122 70 138 82 138 100 C138 116 122 122 112 110 C105 101 112 91 122 96" fill="none" stroke="${c.color}" stroke-width="10" stroke-linecap="round"/>
    <path d="M118 96 L142 84 L154 92 L136 106Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="1.6"/>
    <path d="M131 84 L136 68 L145 86Z" fill="${c.deep}" stroke="${c.color}"/>
    <circle cx="144" cy="91" r="3.2" fill="${c.glow}"/>
    <path d="M112 118 L100 145 L110 138 L104 158" fill="none" stroke="${c.color}" stroke-width="4" stroke-linecap="round"/>
    <path d="M58 122 L64 108 M70 128 L78 114" stroke="${c.glow}" stroke-width="1.2" opacity=".55"/>
    ${glowLine(c, u, 'M154 92 L178 86', 1.4)}
    <circle cx="156" cy="84" r="2" fill="${c.glow}" opacity=".8"/>`,

  mage: (c, u) => `
    <circle cx="100" cy="94" r="60" fill="none" stroke="${c.color}" stroke-opacity=".18" stroke-dasharray="2 6"/>
    <circle cx="100" cy="94" r="46" fill="none" stroke="${c.color}" stroke-opacity=".28"/>
    <path d="M100 46 C86 46 78 58 78 72 L65 152 L135 152 L122 72 C122 58 114 46 100 46Z" fill="#07060e" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M100 48 C90 48 84 58 85 70 C88 80 94 84 100 84 C106 84 112 80 115 70 C116 58 110 48 100 48Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M91 70 Q100 78 109 70" fill="none" stroke="${c.glow}" stroke-width="1.8"/>
    <circle cx="100" cy="66" r="3" fill="${c.glow}"/>
    <path d="M87 94 L72 120 M113 94 L128 120" stroke="${c.color}" stroke-width="3.4" stroke-linecap="round"/>
    <line x1="148" y1="38" x2="136" y2="170" stroke="${c.color}" stroke-width="4.4" stroke-linecap="round"/>
    <circle cx="149" cy="34" r="11" fill="${c.glow}" opacity=".35" filter="url(#blur${u})"/>
    <circle cx="149" cy="34" r="7" fill="${c.glow}"/>
    <circle cx="149" cy="34" r="12" fill="none" stroke="${c.glow}" stroke-opacity=".6"/>
    <g fill="none" stroke="${c.glow}" opacity=".5">
      <rect x="32" y="62" width="8" height="8" transform="rotate(45 36 66)"/>
      <rect x="156" y="120" width="6" height="6" transform="rotate(45 159 123)"/>
      <rect x="44" y="130" width="5" height="5" transform="rotate(45 46 132)"/>
    </g>
    <path d="M70 152 H130" stroke="${c.glow}" stroke-width="1.2" opacity=".5"/>`,

  golem: (c, u) => `
    <g fill="#0a0710" stroke="${c.color}" stroke-width="1.7">
      <rect x="68" y="80" width="64" height="68" rx="9"/>
      <rect x="58" y="94" width="13" height="48" rx="5"/>
      <rect x="129" y="94" width="13" height="48" rx="5"/>
      <rect x="75" y="44" width="50" height="40" rx="7"/>
      <rect x="75" y="144" width="19" height="22" rx="4"/>
      <rect x="106" y="144" width="19" height="22" rx="4"/>
    </g>
    <circle cx="88" cy="64" r="3.1" fill="${c.glow}"/>
    <circle cx="112" cy="64" r="3.1" fill="${c.glow}"/>
    <path d="M84 72 H116" stroke="${c.glow}" stroke-width="1.4" opacity=".6"/>
    <g fill="none" stroke="${c.glow}" stroke-width="1.3" opacity=".75">
      <path d="M92 84 L86 104 L96 120 L88 142"/>
      <path d="M112 86 L120 104 L110 122 L118 140"/>
      <path d="M74 100 L64 108 M126 100 L136 108"/>
    </g>
    <path d="M100 92 L94 104 L106 104Z" fill="${c.color}" opacity=".7"/>
    <path d="M54 150 Q100 166 146 150" fill="none" stroke="${c.color}" stroke-opacity=".3"/>
    <path d="M30 176 L52 166 L60 172 L38 184Z" fill="${c.deep}" opacity=".6"/>`,

  falcon: (c, u) => `
    <path d="M98 94 C74 62 40 48 12 58 C40 70 56 92 72 112Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M102 94 C126 62 160 48 188 58 C160 70 144 92 128 112Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M100 76 L111 108 L104 152 L96 152 L89 108Z" fill="#07060d" stroke="${c.color}" stroke-width="1.5"/>
    <circle cx="100" cy="82" r="9" fill="${c.deep}" stroke="${c.color}"/>
    <circle cx="103" cy="80" r="2.4" fill="${c.glow}"/>
    <path d="M108 85 L122 91 L108 94Z" fill="${c.glow}" opacity=".8"/>
    <path d="M92 110 L80 132 M108 110 L120 132" stroke="${c.color}" stroke-width="2" opacity=".7"/>
    <path d="M100 58 L90 38 M100 58 L110 38 M100 58 L100 34" stroke="${c.glow}" stroke-width="1.4" opacity=".65"/>
    ${glowLine(c, u, 'M28 148 Q66 130 100 144 Q134 158 174 140', 2)}
    <path d="M18 174 L42 162 L50 168 L26 182Z" fill="${c.deep}" opacity=".5"/>`,

  siren: (c, u) => `
    <g fill="none" stroke="${c.color}" stroke-width="2" opacity=".55">
      <path d="M4 160 Q28 146 52 160 T100 160 T148 160 T196 160"/>
      <path d="M4 172 Q28 158 52 172 T100 172 T148 172 T196 172" opacity=".7"/>
      <path d="M4 184 Q28 170 52 184 T100 184 T148 184 T196 184" opacity=".4"/>
    </g>
    <path d="M100 72 C88 72 82 82 84 92 L78 152 L122 152 L116 92 C118 82 112 72 100 72Z" fill="#07060e" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M100 50 C90 50 85 58 85 68 C85 78 92 84 100 84 C108 84 115 78 115 68 C115 58 110 50 100 50Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M86 62 C76 66 72 80 78 92 M114 62 C124 66 128 80 122 92" fill="none" stroke="${c.color}" stroke-width="2" opacity=".8"/>
    <path d="M86 96 Q100 108 114 96" fill="none" stroke="${c.glow}" stroke-width="1.5" opacity=".6"/>
    <circle cx="93" cy="67" r="1.7" fill="${c.glow}"/><circle cx="107" cy="67" r="1.7" fill="${c.glow}"/>
    <circle cx="56" cy="120" r="3" fill="none" stroke="${c.glow}" opacity=".5"/>
    <circle cx="146" cy="98" r="5" fill="none" stroke="${c.glow}" opacity=".35"/>
    <circle cx="156" cy="116" r="2" fill="${c.glow}" opacity=".5"/>
    ${glowLine(c, u, 'M72 148 Q100 138 128 148', 1.2)}`,

  djinn: (c, u) => `
    <path d="M100 170 C62 156 58 120 84 102 C72 82 86 54 110 46 C100 68 120 72 126 92 C136 116 130 144 100 170Z" fill="${c.deep}" stroke="${c.color}" stroke-width="1.8"/>
    <path d="M100 154 C82 144 80 124 94 112 C88 98 98 82 112 78 C106 92 118 98 118 110 C120 128 114 142 100 154Z" fill="${c.color}" opacity=".22"/>
    <circle cx="92" cy="94" r="3" fill="${c.glow}"/><circle cx="108" cy="92" r="3" fill="${c.glow}"/>
    <path d="M88 106 Q100 112 112 104" fill="none" stroke="${c.glow}" stroke-width="1.4" opacity=".7"/>
    <path d="M82 138 C70 134 62 124 62 112 M118 138 C130 134 138 124 138 112" fill="none" stroke="${c.color}" stroke-width="2" opacity=".5"/>
    <path d="M58 66 C66 54 78 50 86 56 C78 58 74 66 74 74" fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".45"/>
    <path d="M140 54 C132 44 122 42 114 48" fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".35"/>
    <path d="M70 176 L92 164 L100 170 L78 184Z" fill="${c.deep}" opacity=".5"/>`,

  jackal: (c, u) => `
    <path d="M56 164 C56 128 72 110 100 110 C128 110 144 128 144 164Z" fill="#07060e" stroke="${c.color}" stroke-width="1.6"/>
    <path d="M71 70 L77 30 L90 62 L88 100 L70 112Z" fill="${c.deep}" stroke="${c.color}" stroke-width="1.4"/>
    <path d="M129 70 L123 30 L110 62 L112 100 L130 112Z" fill="${c.deep}" stroke="${c.color}" stroke-width="1.4"/>
    <path d="M79 84 L88 92 L78 98Z" fill="${c.glow}"/><path d="M121 84 L112 92 L122 98Z" fill="${c.glow}"/>
    <path d="M86 112 L82 132 M114 112 L118 132" stroke="${c.color}" stroke-width="3" opacity=".65"/>
    <path d="M62 128 L48 140 L54 148 M138 128 L152 140 L146 148" fill="none" stroke="${c.color}" stroke-width="3" opacity=".6"/>
    <circle cx="100" cy="122" r="9" fill="none" stroke="${c.glow}" opacity=".55"/>
    <path d="M94 122 H106 M100 116 V128" stroke="${c.glow}" stroke-width="1" opacity=".7"/>
    <path d="M100 166 L100 186" stroke="${c.color}" stroke-width="3" opacity=".3"/>`,

  anubis: (c, u) => `
    <circle cx="100" cy="68" r="42" fill="${c.color}" opacity=".16" filter="url(#blur${u})"/>
    <circle cx="100" cy="68" r="33" fill="none" stroke="${c.glow}" stroke-width="1.4" opacity=".8"/>
    <circle cx="100" cy="68" r="28" fill="${c.deep}" opacity=".55"/>
    <path d="M92 106 C56 68 22 46 8 56 C28 74 36 102 56 124Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M108 106 C144 68 178 46 192 56 C172 74 164 102 144 124Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M84 108 L86 58 L95 78 L105 78 L114 58 L116 108 L108 138 L92 138Z" fill="#07060e" stroke="${c.glow}" stroke-width="1.6"/>
    <path d="M83 64 L74 26 L91 54Z" fill="${c.deep}" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M117 64 L126 26 L109 54Z" fill="${c.deep}" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M92 94 L97 99 L103 99 L108 94" fill="none" stroke="${c.glow}" stroke-width="2"/>
    <circle cx="92" cy="88" r="2.6" fill="${c.glow}"/><circle cx="108" cy="88" r="2.6" fill="${c.glow}"/>
    <path d="M92 112 L86 128 M108 112 L114 128" stroke="${c.color}" stroke-width="2.6" opacity=".7"/>
    <path d="M100 108 V136" stroke="${c.glow}" stroke-width=".8" opacity=".5"/>
    <path d="M60 150 Q100 164 140 150" fill="none" stroke="${c.color}" stroke-opacity=".3"/>
    <g fill="${c.glow}" opacity=".55"><circle cx="34" cy="54" r="1.5"/><circle cx="164" cy="48" r="2"/><circle cx="178" cy="88" r="1.2"/></g>`,

  fairy: (c, u) => `
    <g fill="none" stroke="${c.glow}" stroke-width="1.6" opacity=".8">
      <path d="M96 96 C72 76 48 68 36 78 C52 92 62 112 82 118Z"/>
      <path d="M104 96 C128 76 152 68 164 78 C148 92 138 112 118 118Z"/>
      <path d="M94 110 C74 106 58 116 54 130 C72 132 86 140 96 128Z" opacity=".65"/>
      <path d="M106 110 C126 106 142 116 146 130 C128 132 114 140 104 128Z" opacity=".65"/>
    </g>
    <path d="M100 92 L108 112 L100 134 L92 112Z" fill="${c.deep}" stroke="${c.color}" stroke-width="1.4"/>
    <circle cx="100" cy="94" r="8" fill="${c.deep}" stroke="${c.color}"/>
    <circle cx="100" cy="94" r="2" fill="${c.glow}"/>
    <circle cx="100" cy="78" r="14" fill="none" stroke="${c.glow}" stroke-opacity=".45"/>
    <path d="M74 138 L86 130 M126 138 L114 130" stroke="${c.glow}" stroke-width="1.2" opacity=".6"/>
    <g fill="${c.glow}" opacity=".6"><circle cx="56" cy="146" r="1.6"/><circle cx="144" cy="150" r="1.2"/></g>`,

  warrior: (c, u) => `
    <path d="M100 48 C86 48 78 60 79 76 L68 152 L90 152 L95 118 L105 118 L110 152 L132 152 L121 76 C122 60 114 48 100 48Z" fill="#07060d" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M100 50 C90 50 84 60 85 72 L88 88 L112 88 L115 72 C116 60 110 50 100 50Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M85 68 Q100 78 115 68" fill="none" stroke="${c.glow}" stroke-width="1.5"/>
    <circle cx="100" cy="66" r="2.4" fill="${c.glow}"/>
    <path d="M132 34 L144 112 L137 132 L128 110Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="1.5"/>
    <path d="M132 20 L139 34 L125 34Z" fill="${c.glow}"/>
    <path d="M128 120 L150 146" stroke="${c.color}" stroke-width="4" stroke-linecap="round"/>
    <path d="M84 96 L72 122 M116 96 L128 122" stroke="${c.color}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    <path d="M70 60 L56 74 M130 62 L142 78" stroke="${c.glow}" stroke-width="1" opacity=".4"/>
    <path d="M78 150 H122" stroke="${c.glow}" stroke-width="1.2" opacity=".5"/>`,

  warlord: (c, u) => `
    <path d="M100 44 C82 44 72 58 74 76 L60 154 L88 154 L94 120 L106 120 L112 154 L140 154 L126 76 C128 58 118 44 100 44Z" fill="#08050b" stroke="${c.color}" stroke-width="1.7"/>
    <path d="M100 46 C87 46 79 58 81 72 L85 90 L115 90 L119 72 C121 58 113 46 100 46Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M82 64 L76 48 L90 58Z M118 64 L124 48 L110 58Z" fill="${c.color}" opacity=".8"/>
    <path d="M88 72 L94 78 L88 82Z M112 72 L106 78 L112 82Z" fill="${c.glow}"/>
    <path d="M62 94 L38 108 L44 124 L68 112Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M138 94 L162 108 L156 124 L132 112Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M44 146 L60 116 L76 124 L60 154Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M50 118 L28 102 L22 110 L42 128Z" fill="${c.color}" opacity=".8"/>
    <circle cx="100" cy="104" r="9" fill="none" stroke="${c.glow}" opacity=".6"/>
    <path d="M92 104 H108 M100 96 V112" stroke="${c.glow}" stroke-width="1.2"/>
    <g fill="${c.glow}" opacity=".5"><circle cx="32" cy="92" r="1.5"/><circle cx="170" cy="84" r="2"/><circle cx="156" cy="150" r="1.4"/></g>`,

  colossus: (c, u) => `
    <g fill="#08070e" stroke="${c.color}" stroke-width="1.7">
      <path d="M72 82 L60 68 L46 78 L54 104 L58 140 L76 152 L84 126Z"/>
      <path d="M128 82 L140 68 L154 78 L146 104 L142 140 L124 152 L116 126Z"/>
      <rect x="72" y="82" width="56" height="58" rx="7"/>
      <rect x="80" y="52" width="40" height="34" rx="6"/>
      <rect x="74" y="142" width="20" height="26" rx="4"/>
      <rect x="106" y="142" width="20" height="26" rx="4"/>
    </g>
    <circle cx="100" cy="108" r="10" fill="${c.color}" opacity=".22"/>
    <circle cx="100" cy="108" r="4" fill="${c.glow}"/>
    <path d="M100 98 V118 M90 108 H110" stroke="${c.glow}" stroke-width="1.2" opacity=".8"/>
    <circle cx="90" cy="68" r="2.6" fill="${c.glow}"/><circle cx="110" cy="68" r="2.6" fill="${c.glow}"/>
    <path d="M86 58 L82 42 L94 52Z M114 58 L118 42 L106 52Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M64 88 L48 96 M136 88 L152 96" stroke="${c.glow}" stroke-width="1" opacity=".5"/>
    <path d="M100 126 L100 140" stroke="${c.color}" stroke-width="2" opacity=".5"/>`,

  panther: (c, u) => `
    <path d="M52 148 C52 118 66 100 92 96 L96 72 L104 72 L108 96 C134 100 148 118 148 148Z" fill="#07060e" stroke="${c.color}" stroke-width="1.6"/>
    <path d="M82 70 L74 38 L94 60Z M118 70 L126 38 L106 60Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M86 94 L94 100 L86 106Z M114 94 L106 100 L114 106Z" fill="${c.glow}"/>
    <path d="M100 104 V112" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M92 116 Q100 121 108 116" fill="none" stroke="${c.glow}" stroke-width="1" opacity=".5"/>
    <path d="M148 146 C168 140 174 120 162 108" fill="none" stroke="${c.color}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <path d="M66 148 L60 172 M134 148 L140 172" stroke="${c.color}" stroke-width="3" opacity=".6"/>
    <path d="M74 132 L60 138 L64 146" fill="none" stroke="${c.color}" stroke-width="2" opacity=".5"/>
    <circle cx="100" cy="122" r="8" fill="none" stroke="${c.glow}" opacity=".35"/>
    <g fill="${c.glow}" opacity=".5"><circle cx="42" cy="80" r="1.5"/><circle cx="160" cy="66" r="1.2"/></g>`,

  voidmage: (c, u) => `
    <circle cx="100" cy="96" r="64" fill="none" stroke="${c.color}" stroke-opacity=".15" stroke-dasharray="3 8"/>
    <circle cx="100" cy="96" r="50" fill="none" stroke="${c.color}" stroke-opacity=".3"/>
    <path d="M100 48 C86 48 78 60 78 74 L66 154 L134 154 L122 74 C122 60 114 48 100 48Z" fill="#07060e" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M100 50 C90 50 84 60 85 72 C88 82 94 86 100 86 C106 86 112 82 115 72 C116 60 110 50 100 50Z" fill="${c.deep}" stroke="${c.color}"/>
    <circle cx="94" cy="70" r="2" fill="${c.glow}"/><circle cx="106" cy="70" r="2" fill="${c.glow}"/>
    <path d="M86 98 L70 122 M114 98 L130 122" stroke="${c.color}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="100" cy="106" r="16" fill="#030208" stroke="${c.color}"/>
    <circle cx="100" cy="106" r="10" fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".8"/>
    <circle cx="100" cy="106" r="4" fill="${c.glow}" opacity=".7"/>
    <path d="M100 90 V122 M84 106 H116" stroke="${c.glow}" stroke-width=".8" opacity=".5"/>
    <g fill="none" stroke="${c.glow}" opacity=".45">
      <rect x="40" y="60" width="8" height="8" transform="rotate(45 44 64)"/>
      <rect x="152" y="132" width="6" height="6" transform="rotate(45 155 135)"/>
    </g>`,

  seaserpent: (c, u) => `
    <g fill="none" stroke="${c.color}" stroke-width="2" opacity=".5">
      <path d="M4 168 Q28 156 52 168 T100 168 T148 168 T196 168"/>
      <path d="M4 180 Q28 168 52 180 T100 180 T148 180 T196 180" opacity=".65"/>
    </g>
    <path d="M40 166 C62 150 56 132 78 126 C98 120 94 102 112 96 C130 90 144 102 142 118 C140 132 126 138 118 128 C112 120 118 110 128 114" fill="none" stroke="${c.color}" stroke-width="10" stroke-linecap="round"/>
    <path d="M128 114 L148 102 L160 110 L142 122Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="1.4"/>
    <path d="M150 102 L154 86 L162 104Z" fill="${c.deep}" stroke="${c.color}"/>
    <circle cx="151" cy="108" r="2.8" fill="${c.glow}"/>
    <path d="M60 132 L52 118 M76 138 L72 122" stroke="${c.glow}" stroke-width="1.1" opacity=".45"/>
    <path d="M36 158 L22 146 L28 140 L44 152Z" fill="${c.deep}" opacity=".7"/>
    ${glowLine(c, u, 'M148 120 L176 114', 1.2)}`,

  hound: (c, u) => `
    <path d="M48 160 C48 132 62 114 88 110 L88 84 L112 84 L112 110 C138 114 152 132 152 160Z" fill="#07060e" stroke="${c.color}" stroke-width="1.6"/>
    <path d="M86 86 L78 58 L94 76Z M114 86 L122 58 L106 76Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M90 112 L98 118 L90 124Z M110 112 L102 118 L110 124Z" fill="${c.glow}"/>
    <path d="M100 126 Q108 130 114 124" fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".6"/>
    <path d="M152 150 C170 142 174 120 162 108" fill="none" stroke="${c.color}" stroke-width="3" stroke-linecap="round"/>
    <path d="M66 160 L60 180 M134 160 L140 180" stroke="${c.color}" stroke-width="3" opacity=".6"/>
    <g fill="none" stroke="${c.glow}" opacity=".65">
      <path d="M46 132 C38 122 40 108 52 102"/>
      <path d="M154 132 C162 122 160 108 148 100"/>
      <path d="M100 70 C94 58 102 46 112 44" stroke-width="1.4"/>
    </g>
    <g fill="${c.glow}" opacity=".5"><circle cx="40" cy="94" r="1.5"/><circle cx="160" cy="88" r="2"/><circle cx="118" cy="50" r="1.2"/></g>`,

  herald: (c, u) => `
    <path d="M98 100 C74 76 46 66 30 76 C50 90 62 112 82 122Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M102 100 C126 76 154 66 170 76 C150 90 138 112 118 122Z" fill="${c.deep}" stroke="${c.color}" stroke-opacity=".8"/>
    <path d="M100 72 C88 72 82 84 84 96 L78 154 L122 154 L116 96 C118 84 112 72 100 72Z" fill="#07060e" stroke="${c.color}" stroke-width="1.5"/>
    <path d="M100 54 C91 54 86 62 86 70 C86 80 92 86 100 86 C108 86 114 80 114 70 C114 62 109 54 100 54Z" fill="${c.deep}" stroke="${c.color}"/>
    <circle cx="94" cy="68" r="1.8" fill="${c.glow}"/><circle cx="106" cy="68" r="1.8" fill="${c.glow}"/>
    <path d="M100 40 L100 20" stroke="${c.glow}" stroke-width="2"/>
    <path d="M100 22 L116 18 L108 34 L124 30" fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".65"/>
    <path d="M142 44 L150 148" stroke="${c.color}" stroke-width="3" stroke-linecap="round"/>
    <path d="M142 38 L138 52 L147 52Z" fill="${c.glow}"/>
    <path d="M74 154 L96 142 L100 150 L82 166Z" fill="${c.deep}" opacity=".7"/>
    ${glowLine(c, u, 'M30 146 Q68 130 100 144 Q132 158 170 142', 1.2)}`,

  titan: (c, u) => `
    <g fill="#08070e" stroke="${c.color}" stroke-width="1.8">
      <path d="M70 80 L54 62 L34 76 L46 108 L52 144 L74 156 L84 126Z"/>
      <path d="M130 80 L146 62 L166 76 L154 108 L148 144 L126 156 L116 126Z"/>
      <rect x="70" y="78" width="60" height="62" rx="8"/>
      <rect x="79" y="44" width="42" height="38" rx="6"/>
      <rect x="73" y="140" width="22" height="30" rx="4"/>
      <rect x="105" y="140" width="22" height="30" rx="4"/>
    </g>
    <circle cx="100" cy="108" r="13" fill="${c.color}" opacity=".18"/>
    <circle cx="100" cy="108" r="6" fill="${c.glow}"/>
    <path d="M100 94 V122 M86 108 H114" stroke="${c.glow}" stroke-width="1.4" opacity=".75"/>
    <circle cx="89" cy="62" r="3" fill="${c.glow}"/><circle cx="111" cy="62" r="3" fill="${c.glow}"/>
    <path d="M84 50 L76 24 L94 42Z M116 50 L124 24 L106 42Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M46 86 L26 94 M154 86 L174 94" stroke="${c.glow}" stroke-width="1.1" opacity=".5"/>
    <path d="M100 126 L100 140" stroke="${c.color}" stroke-width="2.4" opacity=".6"/>`,

  warden: (c, u) => `
    <path d="M100 48 C84 48 74 62 76 82 L64 156 L136 156 L124 82 C126 62 116 48 100 48Z" fill="#07060e" stroke="${c.color}" stroke-width="1.6"/>
    <path d="M100 50 C90 50 84 60 85 72 L90 88 L110 88 L115 72 C116 60 110 50 100 50Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M84 72 Q100 82 116 72" fill="none" stroke="${c.glow}" stroke-width="1.4"/>
    <circle cx="95" cy="68" r="1.8" fill="${c.glow}"/><circle cx="105" cy="68" r="1.8" fill="${c.glow}"/>
    <path d="M86 96 L68 120 M114 96 L132 120" stroke="${c.color}" stroke-width="3" stroke-linecap="round"/>
    <path d="M132 116 L132 150" stroke="${c.color}" stroke-width="2"/>
    <rect x="122" y="132" width="20" height="24" rx="3" fill="${c.deep}" stroke="${c.glow}" stroke-width="1.2"/>
    <circle cx="132" cy="144" r="5" fill="${c.glow}" opacity=".8" filter="url(#blur${u})"/>
    <circle cx="132" cy="144" r="3" fill="${c.glow}"/>
    <path d="M70 154 H130" stroke="${c.glow}" stroke-width="1" opacity=".4"/>`,

  knight: (c, u) => `
    <path d="M100 44 C86 44 78 56 79 72 L70 154 L94 154 L98 122 L102 122 L106 154 L130 154 L121 72 C122 56 114 44 100 44Z" fill="#08070e" stroke="${c.color}" stroke-width="1.6" opacity=".95"/>
    <path d="M100 46 C91 46 85 55 86 67 L89 86 L111 86 L114 67 C115 55 109 46 100 46Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M89 70 L95 74 L89 78Z M111 70 L105 74 L111 78Z" fill="${c.glow}"/>
    <path d="M138 38 L144 118" stroke="${c.glow}" stroke-width="2" opacity=".8"/>
    <path d="M130 50 L160 70 L154 78 L126 60Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M72 96 L54 120 L66 130 L82 108Z" fill="${c.deep}" stroke="${c.color}"/>
    <path d="M100 108 L100 140" stroke="${c.color}" stroke-width="1" opacity=".4"/>
    <g fill="${c.glow}" opacity=".28">
      <circle cx="76" cy="60" r="6"/><circle cx="126" cy="96" r="4"/><circle cx="66" cy="142" r="5"/>
    </g>
    ${glowLine(c, u, 'M64 154 Q100 166 136 154', 1)}`,

  chalice: (c, u) => `
    <path d="M74 62 L78 102 C78 122 90 132 100 132 C110 132 122 122 122 102 L126 62Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="2"/>
    <path d="M78 68 L82 100 C82 116 92 125 100 125 C108 125 118 116 118 100 L122 68Z" fill="${c.color}" opacity=".22"/>
    <ellipse cx="100" cy="64" rx="26" ry="7" fill="none" stroke="${c.glow}" stroke-width="1.6"/>
    <path d="M100 132 V154 M82 160 H118" stroke="${c.glow}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="100" cy="52" r="4" fill="${c.glow}" filter="url(#blur${u})"/>
    <g fill="${c.glow}" opacity=".8">
      <circle cx="72" cy="48" r="2"/><circle cx="128" cy="42" r="1.5"/><circle cx="116" cy="34" r="1.2"/><circle cx="84" cy="30" r="1.4"/>
    </g>
    <path d="M58 160 Q100 174 142 160" fill="none" stroke="${c.color}" stroke-opacity=".4"/>`,

  cyclone: (c, u) => `
    <g fill="none" stroke="${c.color}" stroke-width="3" stroke-linecap="round">
      <path d="M34 66 C74 40 146 44 168 78 C184 106 156 132 120 130 C92 128 72 112 76 92 C80 74 104 66 122 76 C136 84 136 100 126 106"/>
      <path d="M52 128 C80 144 132 148 158 126" opacity=".55"/>
    </g>
    <path d="M100 96 C108 82 130 80 140 92 C150 106 138 122 122 120" fill="none" stroke="${c.glow}" stroke-width="2" opacity=".7"/>
    <g fill="${c.glow}" opacity=".6">
      <path d="M44 112 L56 104 L60 112Z"/><path d="M146 58 L158 52 L160 62Z"/><path d="M120 144 L132 140 L130 150Z"/>
    </g>
    <circle cx="100" cy="98" r="4" fill="${c.glow}" opacity=".6" filter="url(#blur${u})"/>`,

  rebirth: (c, u) => `
    <ellipse cx="100" cy="100" rx="48" ry="62" fill="none" stroke="${c.color}" stroke-width="2.4"/>
    <ellipse cx="100" cy="100" rx="38" ry="52" fill="${c.deep}" opacity=".7"/>
    <ellipse cx="100" cy="100" rx="30" ry="44" fill="#030208" opacity=".8"/>
    <path d="M100 68 V134 M84 84 H116 M90 108 H110" stroke="${c.glow}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="100" cy="68" r="7" fill="none" stroke="${c.glow}" stroke-width="2"/>
    <g fill="${c.glow}" opacity=".55"><circle cx="52" cy="70" r="2"/><circle cx="148" cy="82" r="1.5"/><circle cx="150" cy="134" r="2"/><circle cx="50" cy="138" r="1.2"/></g>
    <path d="M66 156 Q100 170 134 156" fill="none" stroke="${c.color}" stroke-opacity=".4"/>`,

  inferno: (c, u) => `
    <path d="M100 174 C58 158 56 118 84 96 C76 74 96 44 122 36 C112 62 136 70 140 94 C144 118 130 154 100 174Z" fill="${c.deep}" stroke="${c.color}" stroke-width="2"/>
    <path d="M100 154 C78 144 78 122 94 108 C90 94 104 76 118 72 C112 90 126 98 124 116 C122 134 112 146 100 154Z" fill="${c.color}" opacity=".25"/>
    <path d="M100 140 C90 134 90 122 98 114 C96 106 104 98 112 96 C108 106 116 110 114 120 C112 132 106 136 100 140Z" fill="${c.glow}" opacity=".55"/>
    <g fill="${c.glow}" opacity=".6"><circle cx="62" cy="56" r="1.5"/><circle cx="142" cy="48" r="2"/><circle cx="152" cy="106" r="1.2"/></g>
    <path d="M32 166 Q64 152 100 164 Q136 176 168 160" fill="none" stroke="${c.color}" stroke-opacity=".35"/>`,

  rune: (c, u) => `
    <circle cx="100" cy="100" r="56" fill="none" stroke="${c.color}" stroke-width="1.6" stroke-dasharray="3 5"/>
    <circle cx="100" cy="100" r="44" fill="none" stroke="${c.color}" stroke-width="2"/>
    <path d="M100 62 L100 138 M100 86 L124 74 M100 110 L76 122" stroke="${c.glow}" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 116 L82 98 M100 116 L118 98" stroke="${c.glow}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <circle cx="100" cy="54" r="4" fill="${c.glow}"/>
    <g fill="none" stroke="${c.glow}" opacity=".5">
      <path d="M54 58 L66 54 L64 66Z"/><path d="M146 58 L134 54 L136 66Z"/><path d="M54 142 L66 146 L64 134Z"/><path d="M146 142 L134 146 L136 134Z"/>
    </g>
    <g fill="${c.glow}" opacity=".55"><circle cx="100" cy="24" r="1.5"/><circle cx="100" cy="176" r="1.5"/><circle cx="24" cy="100" r="1.5"/><circle cx="176" cy="100" r="1.5"/></g>`,

  shield: (c, u) => `
    <path d="M100 42 L148 60 L144 112 C142 142 122 158 100 168 C78 158 58 142 56 112 L52 60Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="2"/>
    <path d="M100 52 L138 66 L134 110 C132 134 118 148 100 156 C82 148 68 134 66 110 L62 66Z" fill="none" stroke="${c.color}" stroke-width="1.4"/>
    <path d="M70 94 Q100 80 130 94 Q100 108 70 94Z" fill="none" stroke="${c.glow}" stroke-width="2.2"/>
    <circle cx="100" cy="94" r="9" fill="none" stroke="${c.glow}" stroke-width="2"/>
    <circle cx="100" cy="94" r="3" fill="${c.glow}"/>
    <path d="M100 104 L96 128 L104 128Z" fill="${c.glow}" opacity=".55"/>
    <g fill="${c.glow}" opacity=".5"><circle cx="42" cy="74" r="1.5"/><circle cx="158" cy="92" r="2"/></g>`,

  barrier: (c, u) => `
    <path d="M100 38 L152 58 L146 116 C142 146 122 160 100 170 C78 160 58 146 54 116 L48 58Z" fill="${c.deep}" stroke="${c.glow}" stroke-width="2"/>
    <path d="M100 50 L140 66 L134 112 C130 136 116 150 100 158 C84 150 70 136 66 112 L60 66Z" fill="${c.color}" opacity=".14"/>
    <g fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".8">
      <path d="M100 52 V156 M64 76 L136 132 M136 76 L64 132 M60 104 H140"/>
      <path d="M78 62 L122 146 M122 62 L78 146" opacity=".35"/>
    </g>
    <circle cx="100" cy="104" r="24" fill="none" stroke="${c.glow}" stroke-width="1.6"/>
    <circle cx="100" cy="104" r="4" fill="${c.glow}"/>
    <g fill="${c.glow}" opacity=".5"><circle cx="38" cy="64" r="1.5"/><circle cx="162" cy="72" r="1.2"/><circle cx="154" cy="140" r="1.6"/></g>`,

  reflector: (c, u) => `
    <circle cx="100" cy="100" r="58" fill="none" stroke="${c.color}" stroke-width="1.5" stroke-dasharray="4 6"/>
    <circle cx="100" cy="100" r="44" fill="${c.deep}" opacity=".6" stroke="${c.color}" stroke-width="2"/>
    <path d="M64 98 Q100 74 136 98 Q100 122 64 98Z" fill="#030208" stroke="${c.glow}" stroke-width="2"/>
    <circle cx="100" cy="98" r="13" fill="none" stroke="${c.color}" stroke-width="2"/>
    <circle cx="100" cy="98" r="5" fill="${c.glow}"/>
    <path d="M100 112 L96 130 L104 130Z" fill="${c.glow}" opacity=".5"/>
    <g fill="none" stroke="${c.glow}" opacity=".45">
      <path d="M42 54 L58 70 M142 54 L126 70 M42 146 L58 130 M142 146 L126 130"/>
    </g>
    <g fill="${c.glow}" opacity=".55"><circle cx="34" cy="104" r="1.6"/><circle cx="166" cy="96" r="1.2"/></g>`,

  hole: (c, u) => `
    <ellipse cx="100" cy="118" rx="58" ry="38" fill="${c.deep}" stroke="${c.color}" stroke-width="2"/>
    <ellipse cx="100" cy="118" rx="44" ry="27" fill="#020107"/>
    <ellipse cx="100" cy="118" rx="26" ry="15" fill="#000"/>
    <path d="M58 110 C72 92 128 92 142 110" fill="none" stroke="${c.glow}" stroke-width="1.4" opacity=".5"/>
    <path d="M64 118 C76 132 124 132 136 118" fill="none" stroke="${c.glow}" stroke-width="1.2" opacity=".35"/>
    <g fill="${c.glow}" opacity=".55">
      <path d="M72 128 L78 140 L84 128Z"/><path d="M116 128 L122 140 L128 128Z"/><path d="M94 134 L100 146 L106 134Z"/>
    </g>
    <g fill="none" stroke="${c.color}" opacity=".5">
      <path d="M56 164 Q100 178 144 164"/><path d="M44 174 Q100 190 156 174"/>
    </g>
    <g fill="${c.glow}" opacity=".45"><circle cx="52" cy="64" r="1.6"/><circle cx="150" cy="70" r="2"/><circle cx="162" cy="118" r="1.2"/></g>`,

  ward: (c, u) => `
    <path d="M60 46 H140 M100 46 V164" stroke="${c.glow}" stroke-width="2" opacity=".5"/>
    <path d="M60 46 C60 76 72 96 100 104 C128 96 140 76 140 46Z" fill="${c.deep}" stroke="${c.color}" stroke-width="2"/>
    <path d="M72 56 C72 78 82 92 100 98 C118 92 128 78 128 56Z" fill="${c.color}" opacity=".15"/>
    <path d="M100 104 V158 M76 158 H124" stroke="${c.color}" stroke-width="2.4"/>
    <circle cx="100" cy="72" r="12" fill="none" stroke="${c.glow}" stroke-width="1.6"/>
    <circle cx="100" cy="72" r="4" fill="${c.glow}"/>
    <g fill="${c.glow}" opacity=".45"><circle cx="48" cy="92" r="1.5"/><circle cx="152" cy="88" r="1.2"/><circle cx="100" cy="34" r="1.8"/></g>`,

  default: (c, u) => `
    <circle cx="100" cy="96" r="52" fill="none" stroke="${c.color}" stroke-width="2"/>
    <path d="M100 60 V132 M78 82 L122 118 M122 82 L78 118" stroke="${c.glow}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="100" cy="96" r="8" fill="${c.glow}"/>`,
};

export function cardArt(card, uid = 'card') {
  const c = ATTRIBUTES[card.attribute] || ATTRIBUTES.SPELL;
  const u = `${String(uid).replace(/[^a-zA-Z0-9]/g, '')}${hash(card.id).toString(36).slice(0, 4)}`;
  const seed = hash(`${card.id}:${uid}`);
  const draw = ART[card.art] || ART.default;
  const ox = 138 + (seed % 40);
  const oy = 40 + (seed % 24);
  return `<svg class="art-svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${card.name} artwork">
    ${defs(c, u)}${base(c, u, seed, ox, oy, 26 + (seed % 12))}
    ${draw(c, u)}
    <rect x=".6" y=".6" width="198.8" height="198.8" rx="4" fill="none" stroke="${c.glow}" stroke-opacity=".18"/>
  </svg>`;
}

export function cardBackSVG(uid = 'back') {
  const u = `${String(uid).replace(/[^a-zA-Z0-9]/g, '')}b`;
  return `<svg class="card-back-svg" viewBox="0 0 140 196" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="bk${u}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#171034"/><stop offset=".5" stop-color="#080714"/><stop offset="1" stop-color="#1e1236"/>
      </linearGradient>
      <radialGradient id="bkg${u}" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#e8c36a" stop-opacity=".2"/><stop offset="1" stop-color="#e8c36a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="140" height="196" rx="7" fill="url(#bk${u})"/>
    <rect x="3" y="3" width="134" height="190" rx="5" fill="none" stroke="#c9a24d" stroke-opacity=".55"/>
    <circle cx="70" cy="98" r="46" fill="url(#bkg${u})" stroke="#e8c36a" stroke-opacity=".5"/>
    <circle cx="70" cy="98" r="38" fill="none" stroke="#e8c36a" stroke-opacity=".25" stroke-dasharray="2 4"/>
    <path d="M42 92 Q70 72 98 92 Q70 108 42 92Z" fill="none" stroke="#f4d67d" stroke-width="2"/>
    <circle cx="70" cy="90" r="7" fill="none" stroke="#f4d67d" stroke-width="1.5"/>
    <circle cx="70" cy="90" r="2.2" fill="#f4d67d"/>
    <path d="M70 102 L67 118 L73 118Z" fill="#f4d67d" opacity=".65"/>
    <path d="M26 26 L34 26 M30 22 L30 30 M106 170 L114 170 M110 166 L110 174" stroke="#f4d67d" stroke-opacity=".55"/>
  </svg>`;
}

export function eyeSVG(uid = 'eye', cls = '') {
  const u = String(uid).replace(/[^a-zA-Z0-9]/g, '');
  return `<svg class="eye-svg ${cls}" viewBox="0 0 120 100" aria-hidden="true">
    <defs><linearGradient id="eg${u}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff2bd"/><stop offset=".55" stop-color="#e8c36a"/><stop offset="1" stop-color="#8a5c16"/>
    </linearGradient></defs>
    <g fill="none" stroke="url(#eg${u})" stroke-width="2.4" stroke-linecap="round">
      <path d="M12 46 Q60 12 108 46 Q60 72 12 46Z"/>
      <path d="M8 34 Q56 6 110 32" stroke-width="1.2" opacity=".7"/>
      <path d="M60 66 V86 L48 94" stroke-width="2.2"/>
      <path d="M72 68 L84 82 L96 88" stroke-width="1.6" opacity=".8"/>
      <path d="M34 72 L24 86" stroke-width="1.4" opacity=".55"/>
    </g>
    <circle cx="60" cy="45" r="14" fill="none" stroke="url(#eg${u})" stroke-width="2"/>
    <circle cx="60" cy="45" r="6" fill="url(#eg${u})"/>
    <circle cx="60" cy="45" r="2" fill="#08060f"/>
  </svg>`;
}

export function avatarSVG(kind = 'player', uid = 'av') {
  const u = String(uid).replace(/[^a-zA-Z0-9]/g, '');
  if (kind === 'ai') {
    return `<svg viewBox="0 0 100 100" class="avatar-svg" aria-hidden="true">
      <defs><radialGradient id="av${u}" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#3c2a6f"/><stop offset="1" stop-color="#090715"/></radialGradient>
      <linearGradient id="avg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9c3ff"/><stop offset="1" stop-color="#7a4bff"/></linearGradient></defs>
      <circle cx="50" cy="50" r="48" fill="url(#av${u})" stroke="#b07cff" stroke-opacity=".5"/>
      <path d="M26 66 C36 48 38 30 54 28 C70 26 76 40 74 56 C80 58 84 64 82 70 L74 66 L76 78 L66 74 L62 84 L50 76 L38 82 L40 68 L30 76Z" fill="#0a0714" stroke="url(#avg${u})" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="58" cy="44" r="3" fill="#e2ccff"/><path d="M58 47 L58 58 L49 62" fill="none" stroke="#e2ccff" stroke-width="1.2" opacity=".6"/>
      <path d="M30 20 L38 30 M70 20 L62 30" stroke="#b07cff" stroke-width="1.2" opacity=".4"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 100 100" class="avatar-svg" aria-hidden="true">
    <defs><radialGradient id="av${u}" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#5c4516"/><stop offset="1" stop-color="#0a0814"/></radialGradient>
    <linearGradient id="avg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2bd"/><stop offset="1" stop-color="#b98a2c"/></linearGradient></defs>
    <circle cx="50" cy="50" r="48" fill="url(#av${u})" stroke="#e8c36a" stroke-opacity=".55"/>
    <path d="M24 48 Q50 26 76 48 Q50 66 24 48Z" fill="none" stroke="url(#avg${u})" stroke-width="2.4"/>
    <circle cx="50" cy="47" r="9" fill="none" stroke="url(#avg${u})" stroke-width="1.6"/>
    <circle cx="50" cy="47" r="3" fill="url(#avg${u})"/>
    <path d="M50 64 V78 L42 84 M58 64 L66 76" fill="none" stroke="url(#avg${u})" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M22 58 Q50 40 78 58" fill="none" stroke="#e8c36a" stroke-opacity=".2"/>
  </svg>`;
}

export function zoneGlyph(kind) {
  if (kind === 'monster') {
    return `<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 4 V40 M8 18 H32 M20 8 C10 8 6 20 10 28 C14 36 20 40 20 44 C20 40 26 36 30 28 C34 20 30 8 20 8Z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`;
  }
  return `<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 4 L34 16 L28 40 H12 L6 16Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 12 L26 20 L20 32 L14 20Z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;
}

export function attributeIcon(attr) {
  const glyphs = {
    LIGHT: '☀', DARK: '☾', WATER: '≋', FIRE: '▲', EARTH: '◆', WIND: '❧', SPELL: '✧', TRAP: '⌘',
  };
  return glyphs[attr] || '✧';
}
