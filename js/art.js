// Procedural card artwork. Each illustration is generated as inline SVG so the
// game stays fully self-contained (no external image requests, no copyrighted art).

const cache = new Map();

const hsla = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

function mix(h1, h2, t) {
  const dh = ((h2 - h1 + 540) % 360) - 180;
  return (h1 + dh * t + 360) % 360;
}

function sparkles(seed, hue, count = 16) {
  let out = '';
  let x = seed * 9301 + 49297;
  const rnd = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  for (let i = 0; i < count; i++) {
    const px = 12 + rnd() * 276;
    const py = 12 + rnd() * 276;
    const r = 0.8 + rnd() * 2.2;
    const o = 0.25 + rnd() * 0.6;
    out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${hsla(hue, 100, 82, o)}"/>`;
  }
  return out;
}

function hexSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h + 7;
}

function frameShell(id, hue, hue2, seed) {
  return `
    <defs>
      <radialGradient id="bg-${id}" cx="50%" cy="30%" r="78%">
        <stop offset="0%" stop-color="${hsla(hue, 70, 46)}"/>
        <stop offset="48%" stop-color="${hsla(hue, 64, 21)}"/>
        <stop offset="100%" stop-color="${hsla(hue, 70, 6)}"/>
      </radialGradient>
      <linearGradient id="glow-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${hsla(hue, 100, 78)}"/>
        <stop offset="55%" stop-color="${hsla(mix(hue, hue2, 0.5), 100, 66)}"/>
        <stop offset="100%" stop-color="${hsla(hue2, 100, 60)}"/>
      </linearGradient>
      <radialGradient id="orb-${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${hsla(hue, 100, 92, 0.95)}"/>
        <stop offset="45%" stop-color="${hsla(hue, 100, 70, 0.55)}"/>
        <stop offset="100%" stop-color="${hsla(hue2, 100, 50, 0)}"/>
      </radialGradient>
      <linearGradient id="body-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hsla(hue, 38, 17)}"/>
        <stop offset="100%" stop-color="${hsla(hue, 58, 4)}"/>
      </linearGradient>
      <filter id="blur-${id}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
      <filter id="soft-${id}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.4"/>
      </filter>
    </defs>
    <rect width="300" height="300" fill="url(#bg-${id})"/>
    <g opacity="0.5">
      <circle cx="150" cy="132" r="108" fill="none" stroke="${hsla(hue, 90, 70, 0.18)}" stroke-width="1"/>
      <circle cx="150" cy="132" r="86" fill="none" stroke="${hsla(hue2, 90, 70, 0.14)}" stroke-width="1" stroke-dasharray="3 7"/>
      <circle cx="150" cy="132" r="122" fill="none" stroke="${hsla(hue, 90, 70, 0.08)}" stroke-width="7"/>
    </g>
    <path d="M0 248 Q 75 224 150 246 T 300 242 L300 300 L0 300 Z" fill="${hsla(hue, 60, 5, 0.88)}"/>
    <g opacity="0.5" filter="url(#blur-${id})">
      <ellipse cx="150" cy="150" rx="86" ry="86" fill="${hsla(hue, 100, 60, 0.35)}"/>
    </g>
    ${sparkles(seed, hue, 18)}
  `;
}

function dragon(id, hue, hue2) {
  const body = 'M46 246 C 70 252 92 238 112 220 C 134 200 136 178 156 164 C 178 148 202 150 218 162';
  const neck = 'M152 166 C 184 146 210 144 224 126 C 232 116 236 106 238 96';
  return `
    <circle cx="232" cy="66" r="40" fill="${hsla(hue2, 100, 82, 0.92)}"/>
    <circle cx="232" cy="66" r="56" fill="${hsla(hue2, 100, 70, 0.16)}" filter="url(#soft-${id})"/>
    <g opacity="0.95">
      <path d="M156 152 C 126 122 88 108 40 112 C 56 134 68 154 76 178 C 98 162 122 158 146 170 Z"
        fill="${hsla(mix(hue, hue2, 0.28), 70, 17)}" stroke="${hsla(hue, 100, 76, 0.85)}" stroke-width="1.5"/>
      <path d="M168 150 C 198 118 238 102 284 108 C 266 128 254 150 250 174 C 228 158 202 154 180 164 Z"
        fill="${hsla(mix(hue, hue2, 0.55), 68, 15)}" stroke="${hsla(hue2, 100, 76, 0.85)}" stroke-width="1.5"/>
      <g stroke="${hsla(hue, 100, 82, 0.36)}" stroke-width="1.2" fill="none">
        <path d="M72 120 Q 102 142 132 160"/><path d="M52 124 Q 90 150 118 168"/>
        <path d="M262 120 Q 232 140 204 158"/><path d="M276 124 Q 242 148 220 164"/>
      </g>
    </g>
    <path d="${body}" fill="none" stroke="${hsla(hue, 55, 6)}" stroke-width="38" stroke-linecap="round"/>
    <path d="${body}" fill="none" stroke="${hsla(mix(hue, hue2, 0.22), 72, 24)}" stroke-width="30" stroke-linecap="round"/>
    <path d="${body}" fill="none" stroke="${hsla(hue, 100, 74, 0.55)}" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round"/>
    <path d="${neck}" fill="none" stroke="${hsla(hue, 55, 6)}" stroke-width="34" stroke-linecap="round"/>
    <path d="${neck}" fill="none" stroke="${hsla(mix(hue, hue2, 0.22), 72, 24)}" stroke-width="26" stroke-linecap="round"/>
    <g fill="${hsla(hue2, 100, 72, 0.72)}">
      <path d="M96 232 l -10 -18 l 20 7 Z"/><path d="M120 216 l -5 -19 l 17 11 Z"/>
      <path d="M146 194 l 0 -20 l 16 14 Z"/><path d="M174 178 l 6 -19 l 11 18 Z"/>
    </g>
    <g stroke="${hsla(mix(hue, hue2, 0.35), 66, 18)}" stroke-width="9" stroke-linecap="round" fill="none">
      <path d="M112 222 C 110 244 122 252 138 246"/>
      <path d="M158 182 C 154 202 166 210 180 204"/>
    </g>
    <g fill="${hsla(hue2, 100, 82, 0.9)}">
      <path d="M40 246 L 20 238 L 29 251 L 19 264 L 44 259 Z"/>
    </g>
    <g>
      <path d="M224 122 C 224 100 238 82 258 78 L 272 76 L 278 62 L 274 82 L 294 86 L 300 96 L 284 104 L 270 104 C 268 124 248 138 228 134 Z"
        fill="${hsla(mix(hue, hue2, 0.34), 68, 20)}" stroke="${hsla(hue, 100, 82, 0.95)}" stroke-width="1.7"/>
      <path d="M248 78 C 238 62 238 44 250 32 C 250 50 256 64 264 74 Z"
        fill="${hsla(hue2, 70, 18)}" stroke="${hsla(hue2, 100, 78, 0.85)}" stroke-width="1.3"/>
      <path d="M264 76 C 264 56 272 42 286 34 C 280 50 278 64 278 78 Z"
        fill="${hsla(hue2, 70, 20)}" stroke="${hsla(hue2, 100, 78, 0.85)}" stroke-width="1.3"/>
      <path d="M240 112 C 250 104 266 104 276 112 C 264 118 252 120 240 112 Z" fill="${hsla(hue, 100, 78)}"/>
      <circle cx="258" cy="96" r="4.2" fill="${hsla(hue2, 100, 94)}"/>
      <path d="M274 104 L 292 106 M276 112 L 290 118" stroke="${hsla(hue2, 100, 84, 0.85)}" stroke-width="2" stroke-linecap="round"/>
    </g>
    <g fill="none" stroke="${hsla(hue2, 100, 82, 0.45)}" stroke-width="1.4">
      <path d="M24 216 Q 72 196 118 210"/><path d="M174 206 Q 218 188 266 202"/>
    </g>
  `;
}

function knight(id, hue, hue2) {
  return `
    <g>
      <path d="M86 262 C 84 208 96 172 120 158 L 180 158 C 204 172 216 210 214 262 Z" fill="url(#body-${id})" stroke="${hsla(hue, 100, 70, 0.75)}" stroke-width="1.4"/>
      <path d="M150 156 C 136 184 128 216 130 262 L 170 262 C 172 218 164 184 150 156 Z" fill="${hsla(hue, 90, 55, 0.28)}"/>
      <path d="M118 168 C 100 190 94 220 96 250 L 126 250 C 122 220 126 190 136 172 Z" fill="${hsla(mix(hue, hue2, 0.45), 80, 60, 0.25)}"/>
      <path d="M150 78 C 128 78 116 94 116 116 C 116 134 130 148 150 148 C 170 148 184 134 184 116 C 184 94 172 78 150 78 Z" fill="${hsla(mix(hue, hue2, 0.3), 55, 26)}" stroke="${hsla(hue, 100, 74, 0.9)}" stroke-width="1.6"/>
      <path d="M128 112 C 138 106 162 106 172 112 C 170 120 162 124 150 124 C 138 124 130 120 128 112 Z" fill="${hsla(hue, 100, 80)}"/>
      <path d="M146 74 L150 54 L156 74 Z" fill="${hsla(hue2, 100, 72)}"/>
    </g>
    <g>
      <path d="M196 250 L 214 106 L 224 106 L 210 250 Z" fill="${hsla(hue2, 95, 76)}" stroke="${hsla(hue2, 100, 92, 0.9)}" stroke-width="1"/>
      <path d="M188 116 L 238 116 L 224 136 L 202 136 Z" fill="${hsla(hue2, 100, 68)}"/>
      <path d="M204 106 L 222 106 L 218 88 L 208 88 Z" fill="${hsla(hue2, 90, 50)}"/>
      <path d="M204 88 L 213 64 L 222 88 Z" fill="${hsla(hue2, 100, 82)}"/>
    </g>
    <ellipse cx="150" cy="244" rx="76" ry="12" fill="${hsla(hue, 100, 60, 0.18)}"/>
    <path d="M92 186 Q 60 196 48 230" stroke="${hsla(hue, 100, 70, 0.35)}" stroke-width="3" fill="none"/>
    <path d="M204 186 Q 240 196 252 224" stroke="${hsla(hue2, 100, 70, 0.35)}" stroke-width="3" fill="none"/>
  `;
}

function warrior(id, hue, hue2) {
  return `
    <g>
      <path d="M92 262 C 92 210 106 176 126 162 L 174 162 C 194 176 208 210 208 262 Z" fill="url(#body-${id})" stroke="${hsla(hue, 100, 70, 0.7)}" stroke-width="1.4"/>
      <circle cx="150" cy="116" r="32" fill="${hsla(mix(hue, hue2, 0.3), 55, 24)}" stroke="${hsla(hue, 100, 74, 0.85)}" stroke-width="1.5"/>
      <path d="M136 112 Q 150 102 164 112" stroke="${hsla(hue, 100, 80)}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M126 166 L 118 224 L 138 224 L 144 170 Z" fill="${hsla(hue2, 85, 55, 0.4)}"/>
      <path d="M174 166 L 182 224 L 162 224 L 156 170 Z" fill="${hsla(hue2, 85, 55, 0.4)}"/>
    </g>
    <g stroke-linecap="round">
      <path d="M74 246 L 206 92" stroke="${hsla(hue2, 100, 80)}" stroke-width="6"/>
      <path d="M74 246 L 206 92" stroke="${hsla(hue2, 100, 96)}" stroke-width="2"/>
      <path d="M84 220 L 106 242" stroke="${hsla(hue2, 90, 55)}" stroke-width="9"/>
      <path d="M226 246 L 94 92" stroke="${hsla(hue, 100, 80)}" stroke-width="6"/>
      <path d="M226 246 L 94 92" stroke="${hsla(hue, 100, 96)}" stroke-width="2"/>
      <path d="M216 220 L 194 242" stroke="${hsla(hue, 90, 55)}" stroke-width="9"/>
    </g>
    <g fill="${hsla(hue2, 100, 82, 0.9)}">
      <circle cx="70" cy="250" r="4"/><circle cx="230" cy="250" r="4"/>
      <circle cx="196" cy="88" r="3"/><circle cx="104" cy="88" r="3"/>
    </g>
  `;
}

function mage(id, hue, hue2) {
  return `
    <g>
      <path d="M96 262 C 96 208 112 176 132 160 L 168 160 C 188 176 204 208 204 262 Z" fill="url(#body-${id})" stroke="${hsla(hue, 100, 70, 0.75)}" stroke-width="1.4"/>
      <path d="M150 158 L 130 262 L 170 262 Z" fill="${hsla(hue, 100, 62, 0.22)}"/>
      <path d="M150 84 C 128 84 118 104 120 124 L 180 124 C 182 104 172 84 150 84 Z" fill="${hsla(mix(hue, hue2, 0.3), 50, 20)}" stroke="${hsla(hue, 100, 74, 0.8)}" stroke-width="1.4"/>
      <path d="M112 124 Q 150 140 188 124 L 196 148 Q 150 162 104 148 Z" fill="${hsla(hue, 95, 52, 0.5)}"/>
    </g>
    <g>
      <path d="M206 262 L 202 136 L 212 136 L 216 262 Z" fill="${hsla(hue2, 90, 62)}"/>
      <circle cx="209" cy="112" r="28" fill="url(#orb-${id})"/>
      <circle cx="209" cy="112" r="14" fill="${hsla(hue, 100, 88)}"/>
      <circle cx="209" cy="112" r="36" fill="none" stroke="${hsla(hue, 100, 76, 0.7)}" stroke-width="1.4" stroke-dasharray="4 6"/>
    </g>
    <path d="M96 214 Q 66 196 56 166" stroke="${hsla(hue, 100, 72, 0.6)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <g fill="none" stroke="${hsla(hue2, 100, 80, 0.55)}" stroke-width="1.3">
      <path d="M60 90 l 8 8 l -8 8 l -8 -8 Z"/>
      <path d="M244 196 l 7 7 l -7 7 l -7 -7 Z"/>
      <circle cx="78" cy="128" r="5"/>
    </g>
  `;
}

function angel(id, hue, hue2) {
  return `
    <g opacity="0.95">
      <path d="M126 158 C 88 130 62 142 44 178 C 76 172 100 184 116 208 C 118 190 120 174 126 158 Z" fill="${hsla(hue, 80, 70, 0.32)}" stroke="${hsla(hue, 100, 82, 0.7)}" stroke-width="1.4"/>
      <path d="M174 158 C 212 130 238 142 256 178 C 224 172 200 184 184 208 C 182 190 180 174 174 158 Z" fill="${hsla(hue, 80, 70, 0.32)}" stroke="${hsla(hue, 100, 82, 0.7)}" stroke-width="1.4"/>
      <path d="M126 166 C 100 152 80 160 68 186 C 92 180 108 190 118 212 Z" fill="${hsla(hue2, 80, 66, 0.28)}"/>
      <path d="M174 166 C 200 152 220 160 232 186 C 208 180 192 190 182 212 Z" fill="${hsla(hue2, 80, 66, 0.28)}"/>
    </g>
    <g>
      <path d="M108 262 C 108 214 122 184 138 168 L 162 168 C 178 184 192 214 192 262 Z" fill="url(#body-${id})" stroke="${hsla(hue, 100, 78, 0.8)}" stroke-width="1.4"/>
      <circle cx="150" cy="126" r="26" fill="${hsla(45, 70, 78)}" stroke="${hsla(hue, 100, 90, 0.9)}" stroke-width="1.2"/>
      <path d="M128 124 Q 150 138 172 124 L 172 146 Q 150 158 128 146 Z" fill="${hsla(hue, 90, 55, 0.4)}"/>
    </g>
    <ellipse cx="150" cy="72" rx="34" ry="9" fill="none" stroke="${hsla(48, 100, 78, 0.9)}" stroke-width="3"/>
    <g stroke="${hsla(48, 100, 82, 0.5)}" stroke-width="1.2">
      <path d="M150 42 L150 22"/><path d="M116 56 L104 38"/><path d="M184 56 L196 38"/>
    </g>
  `;
}

function guardian(id, hue, hue2) {
  return `
    <g>
      <path d="M150 62 L 216 92 L 208 196 C 202 232 180 252 150 264 C 120 252 98 232 92 196 L 84 92 Z"
        fill="url(#body-${id})" stroke="${hsla(hue, 100, 72, 0.85)}" stroke-width="2"/>
      <path d="M150 88 L 194 108 L 188 190 C 184 216 168 232 150 242 C 132 232 116 216 112 190 L 106 108 Z"
        fill="none" stroke="${hsla(hue2, 100, 76, 0.55)}" stroke-width="1.4"/>
      <g fill="none" stroke="${hsla(hue, 100, 80, 0.9)}" stroke-width="2.4" stroke-linecap="round">
        <path d="M150 120 L 150 200"/><path d="M122 150 L 178 150"/>
        <path d="M128 128 L 150 148 L 172 128"/>
      </g>
      <circle cx="150" cy="168" r="10" fill="${hsla(hue2, 100, 78, 0.8)}"/>
    </g>
    <path d="M84 92 L 60 74 L 72 112 Z" fill="${hsla(hue, 90, 50, 0.7)}"/>
    <path d="M216 92 L 240 74 L 228 112 Z" fill="${hsla(hue, 90, 50, 0.7)}"/>
    <g opacity="0.65">
      <rect x="30" y="224" width="34" height="14" fill="${hsla(hue, 80, 45)}"/>
      <rect x="236" y="224" width="34" height="14" fill="${hsla(hue, 80, 45)}"/>
      <rect x="44" y="208" width="18" height="12" fill="${hsla(hue, 80, 55)}"/>
      <rect x="238" y="208" width="18" height="12" fill="${hsla(hue, 80, 55)}"/>
    </g>
  `;
}

function aquatic(id, hue, hue2) {
  return `
    <g opacity="0.55" fill="none" stroke="${hsla(hue, 100, 72)}" stroke-width="2">
      <path d="M16 222 Q 60 202 104 222 T 192 222 T 284 222"/>
      <path d="M10 244 Q 54 224 98 244 T 186 244 T 278 244"/>
      <path d="M22 200 Q 66 180 110 200 T 198 200 T 290 200" opacity="0.6"/>
    </g>
    <g>
      <path d="M96 172 C 66 160 42 168 30 186 C 54 192 72 204 88 220 C 90 202 92 186 96 172 Z" fill="${hsla(hue, 90, 62, 0.5)}" stroke="${hsla(hue, 100, 80, 0.7)}" stroke-width="1.2"/>
      <path d="M104 166 C 134 126 190 122 228 152 C 250 170 250 202 228 220 C 196 246 142 240 112 204 C 102 192 100 178 104 166 Z"
        fill="url(#body-${id})" stroke="${hsla(hue, 100, 76, 0.85)}" stroke-width="1.6"/>
      <path d="M120 178 C 152 152 198 154 220 178 C 200 204 156 208 124 192 Z" fill="${hsla(hue, 100, 68, 0.24)}"/>
      <circle cx="206" cy="166" r="9" fill="${hsla(hue, 100, 86)}"/>
      <circle cx="208" cy="164" r="4" fill="${hsla(hue2, 100, 20)}"/>
      <path d="M160 130 L 150 104 L 176 122 Z" fill="url(#glow-${id})" opacity="0.9"/>
      <path d="M140 238 Q 150 258 168 262 L 152 240 Z" fill="${hsla(hue, 100, 70, 0.6)}"/>
    </g>
    <g fill="${hsla(hue, 100, 84, 0.55)}">
      <circle cx="78" cy="120" r="6"/><circle cx="64" cy="96" r="3.5"/>
      <circle cx="246" cy="110" r="4.5"/><circle cx="236" cy="88" r="2.5"/>
    </g>
  `;
}

function beast(id, hue, hue2) {
  return `
    <circle cx="214" cy="64" r="34" fill="${hsla(hue2, 85, 78, 0.28)}"/>
    <g fill="${hsla(mix(hue, hue2, 0.45), 75, 16)}" stroke="${hsla(hue, 100, 76, 0.7)}" stroke-width="1.2">
      <path d="M114 100 L 82 36 L 140 76 Z"/>
      <path d="M186 100 L 218 36 L 160 76 Z"/>
      <path d="M106 148 L 70 136 L 92 164 L 62 170 L 100 184 Z"/>
      <path d="M194 148 L 230 136 L 208 164 L 238 170 L 200 184 Z"/>
    </g>
    <path d="M112 92 C 112 148 122 184 142 202 L 104 262 L 196 262 L 158 202 C 178 182 188 148 188 92 L 150 108 Z"
      fill="url(#body-${id})" stroke="${hsla(hue, 100, 76, 0.9)}" stroke-width="1.7"/>
    <path d="M118 112 C 132 100 168 100 182 112 C 198 132 198 158 184 176 C 170 194 130 194 116 176 C 102 158 102 132 118 112 Z"
      fill="${hsla(mix(hue, hue2, 0.3), 52, 26)}" stroke="${hsla(hue, 100, 80, 0.55)}" stroke-width="1.2"/>
    <path d="M128 150 C 134 142 166 142 172 150 L 164 196 C 158 210 142 210 136 196 Z"
      fill="${hsla(mix(hue, hue2, 0.25), 46, 15)}" stroke="${hsla(hue, 100, 78, 0.45)}" stroke-width="1"/>
    <path d="M140 188 L 150 178 L 160 188 L 150 200 Z" fill="${hsla(hue2, 100, 52)}"/>
    <g fill="${hsla(hue2, 100, 86)}">
      <path d="M116 128 Q 132 114 146 124 Q 130 136 116 128 Z"/>
      <path d="M184 128 Q 168 114 154 124 Q 170 136 184 128 Z"/>
    </g>
    <g fill="${hsla(hue2, 100, 56)}">
      <circle cx="132" cy="124" r="3.4"/><circle cx="168" cy="124" r="3.4"/>
    </g>
    <g fill="${hsla(hue, 100, 90, 0.9)}">
      <path d="M136 196 L 140 214 L 146 198 Z"/><path d="M154 198 L 160 214 L 164 196 Z"/>
    </g>
    <path d="M132 104 Q 150 88 168 104" fill="none" stroke="${hsla(hue2, 100, 72, 0.55)}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M150 198 L 150 242" stroke="${hsla(hue, 100, 70, 0.45)}" stroke-width="1.4"/>
    <g fill="none" stroke="${hsla(hue2, 100, 80, 0.55)}" stroke-width="2" stroke-linecap="round">
      <path d="M84 198 Q 52 180 38 148"/>
      <path d="M216 198 Q 248 180 262 148"/>
      <path d="M108 232 Q 82 246 62 242"/>
    </g>
    <g fill="${hsla(hue2, 100, 80, 0.7)}">
      <path d="M48 66 l 4 12 l 12 4 l -12 4 l -4 12 l -4 -12 l -12 -4 l 12 -4 Z"/>
      <circle cx="262" cy="106" r="3"/><circle cx="74" cy="120" r="2.4"/>
    </g>
  `;
}

function fox(id, hue, hue2) {
  return `
    <circle cx="218" cy="64" r="35" fill="${hsla(hue2, 90, 82, 0.28)}"/>
    <path d="M214 42 C 236 44 250 60 250 78 C 228 76 214 60 214 42 Z" fill="${hsla(hue2, 100, 84, 0.55)}"/>
    <g fill="none" stroke="${hsla(hue2, 100, 74, 0.55)}" stroke-width="11" stroke-linecap="round">
      <path d="M176 238 C 232 246 260 208 248 164 C 240 134 218 118 200 126"/>
      <path d="M180 226 C 236 218 252 174 234 136 C 224 116 208 108 194 114"/>
      <path d="M182 248 C 246 268 278 230 270 182 C 264 150 246 132 228 134"/>
    </g>
    <g fill="${hsla(hue2, 100, 86, 0.75)}">
      <path d="M248 163 L 258 148 L 252 166 Z"/><path d="M234 136 L 242 120 L 238 140 Z"/>
      <path d="M270 182 L 282 170 L 274 188 Z"/>
    </g>
    <ellipse cx="150" cy="256" rx="62" ry="9" fill="${hsla(hue, 100, 55, 0.18)}"/>
    <path d="M116 260 C 112 226 124 196 150 180 C 176 196 188 226 184 260 Z"
      fill="url(#body-${id})" stroke="${hsla(hue, 100, 80, 0.8)}" stroke-width="1.4"/>
    <path d="M150 194 C 138 214 134 236 136 258 L 164 258 C 166 236 162 214 150 194 Z" fill="${hsla(hue, 100, 78, 0.26)}"/>
    <g>
      <path d="M112 100 L 94 36 L 140 82 L 150 92 L 160 82 L 206 36 L 188 100 C 202 122 200 150 184 166 C 174 178 160 184 150 184 C 140 184 126 178 116 166 C 100 150 98 122 112 100 Z"
        fill="${hsla(mix(hue, hue2, 0.28), 58, 25)}" stroke="${hsla(hue, 100, 82, 0.9)}" stroke-width="1.6"/>
      <path d="M112 100 C 122 92 138 92 150 100 C 162 92 178 92 188 100 C 182 124 170 140 150 150 C 130 140 118 124 112 100 Z"
        fill="${hsla(mix(hue, hue2, 0.15), 50, 15)}"/>
      <path d="M136 142 C 142 136 158 136 164 142 L 158 188 C 154 198 146 198 142 188 Z" fill="${hsla(hue, 100, 84, 0.85)}"/>
      <path d="M144 186 L 150 178 L 156 186 L 150 194 Z" fill="${hsla(hue2, 100, 66)}"/>
      <g fill="${hsla(hue2, 100, 82)}">
        <path d="M118 120 Q 130 112 140 122 Q 128 130 118 120 Z"/>
        <path d="M182 120 Q 170 112 160 122 Q 172 130 182 120 Z"/>
      </g>
      <g fill="${hsla(hue2, 100, 58)}">
        <circle cx="131" cy="120" r="2.8"/><circle cx="169" cy="120" r="2.8"/>
      </g>
      <g stroke="${hsla(hue2, 100, 82, 0.65)}" stroke-width="1.2" fill="none">
        <path d="M112 156 L 72 148"/><path d="M112 166 L 76 172"/>
        <path d="M188 156 L 228 148"/><path d="M188 166 L 224 172"/>
      </g>
    </g>
    <g fill="${hsla(hue2, 100, 82, 0.8)}">
      <path d="M62 226 l 4 11 l 11 4 l -11 4 l -4 11 l -4 -11 l -11 -4 l 11 -4 Z"/>
      <circle cx="230" cy="228" r="4"/><circle cx="78" cy="112" r="2.6"/>
    </g>
  `;
}

function demon(id, hue, hue2) {
  return `
    <g opacity="0.75">
      <path d="M96 262 C 70 242 62 210 74 182 C 88 208 104 222 122 230 Z" fill="${hsla(hue, 100, 55, 0.5)}"/>
      <path d="M204 262 C 230 242 238 210 226 182 C 212 208 196 222 178 230 Z" fill="${hsla(hue2, 100, 55, 0.5)}"/>
      <path d="M130 250 C 118 222 120 200 132 186 L 168 186 C 180 200 182 222 170 250 Z" fill="${hsla(hue, 100, 50, 0.35)}"/>
    </g>
    <g>
      <path d="M112 108 C 92 84 84 56 90 34 C 108 52 124 74 130 94 Z" fill="${hsla(mix(hue, hue2, 0.3), 60, 18)}" stroke="${hsla(hue, 100, 70, 0.8)}" stroke-width="1.4"/>
      <path d="M188 108 C 208 84 216 56 210 34 C 192 52 176 74 170 94 Z" fill="${hsla(mix(hue, hue2, 0.3), 60, 18)}" stroke="${hsla(hue, 100, 70, 0.8)}" stroke-width="1.4"/>
      <path d="M150 70 C 116 70 96 96 96 130 C 96 164 116 190 150 214 C 184 190 204 164 204 130 C 204 96 184 70 150 70 Z"
        fill="url(#body-${id})" stroke="${hsla(hue, 100, 74, 0.9)}" stroke-width="1.6"/>
      <path d="M114 118 Q 130 108 142 118 Q 128 126 114 118 Z" fill="${hsla(hue, 100, 82)}"/>
      <path d="M186 118 Q 170 108 158 118 Q 172 126 186 118 Z" fill="${hsla(hue, 100, 82)}"/>
      <path d="M122 158 Q 150 148 178 158 L 168 182 Q 150 192 132 182 Z" fill="${hsla(hue2, 100, 55, 0.6)}"/>
      <g fill="${hsla(hue, 100, 88)}">
        <path d="M134 160 L 138 172 L 142 160 Z"/><path d="M146 160 L 150 174 L 154 160 Z"/>
        <path d="M158 160 L 162 172 L 166 160 Z"/>
      </g>
      <path d="M150 214 L 138 262 L 150 250 L 162 262 Z" fill="${hsla(hue2, 100, 48, 0.7)}"/>
    </g>
    <g fill="${hsla(hue2, 100, 62, 0.5)}" filter="url(#soft-${id})">
      <ellipse cx="80" cy="130" rx="16" ry="30"/><ellipse cx="220" cy="130" rx="16" ry="30"/>
    </g>
  `;
}

function queen(id, hue, hue2) {
  return `
    <g opacity="0.9">
      <path d="M150 70 L 168 42 L 150 54 L 132 42 Z" fill="${hsla(hue, 100, 82)}"/>
      <path d="M116 78 L 126 46 L 138 72 Z" fill="${hsla(hue, 100, 72)}"/>
      <path d="M184 78 L 174 46 L 162 72 Z" fill="${hsla(hue, 100, 72)}"/>
      <path d="M112 90 L 188 90 L 182 108 L 118 108 Z" fill="${hsla(hue2, 80, 60)}"/>
    </g>
    <g>
      <path d="M150 98 C 126 98 112 116 112 138 C 112 156 124 170 150 178 C 176 170 188 156 188 138 C 188 116 174 98 150 98 Z"
        fill="${hsla(mix(hue, hue2, 0.25), 50, 84)}" stroke="${hsla(hue, 100, 92, 0.8)}" stroke-width="1.2"/>
      <path d="M104 262 C 102 208 116 178 136 166 L 164 166 C 184 178 198 208 196 262 Z" fill="url(#body-${id})" stroke="${hsla(hue, 100, 80, 0.8)}" stroke-width="1.4"/>
      <path d="M136 166 L 150 204 L 164 166 Z" fill="${hsla(hue, 100, 78, 0.4)}"/>
      <g fill="${hsla(hue, 100, 88)}">
        <path d="M130 130 Q 140 122 148 130 Q 140 138 130 130 Z"/>
        <path d="M170 130 Q 160 122 152 130 Q 160 138 170 130 Z"/>
      </g>
      <path d="M144 150 Q 150 144 156 150 Q 150 156 144 150 Z" fill="${hsla(hue2, 100, 62)}"/>
    </g>
    <g opacity="0.6" fill="${hsla(hue, 100, 86)}">
      <path d="M68 230 L 78 200 L 88 230 L 78 244 Z"/>
      <path d="M212 244 L 222 212 L 232 244 L 222 258 Z"/>
      <path d="M44 180 L 52 160 L 60 180 L 52 190 Z"/>
    </g>
    <g opacity="0.5" fill="none" stroke="${hsla(hue, 100, 80)}" stroke-width="1.2">
      <circle cx="64" cy="132" r="22" stroke-dasharray="3 5"/>
      <circle cx="236" cy="132" r="22" stroke-dasharray="3 5"/>
    </g>
  `;
}

function serpent(id, hue, hue2) {
  return `
    <g>
      <path d="M150 262 C 80 262 60 212 92 182 C 120 156 180 174 196 142 C 206 120 194 100 172 96 C 148 92 132 110 136 130 C 140 148 160 154 172 146"
        fill="none" stroke="url(#body-${id})" stroke-width="34" stroke-linecap="round"/>
      <path d="M150 262 C 80 262 60 212 92 182 C 120 156 180 174 196 142 C 206 120 194 100 172 96 C 148 92 132 110 136 130 C 140 148 160 154 172 146"
        fill="none" stroke="${hsla(hue, 100, 62, 0.5)}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14"/>
      <path d="M166 74 C 148 76 138 92 144 108 C 150 122 168 128 184 120 C 198 112 200 92 188 82 C 180 76 174 74 166 74 Z"
        fill="${hsla(mix(hue, hue2, 0.3), 60, 20)}" stroke="${hsla(hue, 100, 76, 0.9)}" stroke-width="1.6"/>
      <g fill="${hsla(hue2, 100, 78)}">
        <ellipse cx="166" cy="94" rx="5" ry="3.4" transform="rotate(-20 166 94)"/>
        <ellipse cx="184" cy="98" rx="5" ry="3.4" transform="rotate(20 184 98)"/>
      </g>
      <path d="M150 112 L 152 134 L 162 140" fill="none" stroke="${hsla(hue2, 100, 62)}" stroke-width="2"/>
    </g>
    <g fill="${hsla(hue, 100, 80, 0.5)}">
      <circle cx="70" cy="120" r="4"/><circle cx="240" cy="180" r="5"/><circle cx="86" cy="80" r="2.6"/>
    </g>
  `;
}

function imp(id, hue, hue2) {
  return `
    <g>
      <path d="M150 96 C 116 96 96 122 96 154 C 96 190 120 216 150 216 C 180 216 204 190 204 154 C 204 122 184 96 150 96 Z"
        fill="url(#body-${id})" stroke="${hsla(hue, 100, 74, 0.9)}" stroke-width="1.6"/>
      <path d="M118 96 C 98 78 92 52 100 32 C 116 48 128 70 132 88 Z" fill="${hsla(hue2, 70, 18)}" stroke="${hsla(hue, 100, 70, 0.8)}" stroke-width="1.3"/>
      <path d="M182 96 C 202 78 208 52 200 32 C 184 48 172 70 168 88 Z" fill="${hsla(hue2, 70, 18)}" stroke="${hsla(hue, 100, 70, 0.8)}" stroke-width="1.3"/>
      <g fill="${hsla(48, 100, 82)}">
        <path d="M120 138 Q 134 130 144 138 Q 132 146 120 138 Z"/>
        <path d="M180 138 Q 166 130 156 138 Q 168 146 180 138 Z"/>
      </g>
      <path d="M124 176 Q 150 166 176 176 L 168 194 Q 150 202 132 194 Z" fill="${hsla(hue2, 100, 55, 0.7)}"/>
      <g fill="${hsla(48, 100, 88)}">
        <path d="M136 178 L 140 190 L 145 178 Z"/><path d="M155 178 L 160 190 L 164 178 Z"/>
      </g>
      <path d="M96 154 C 70 158 54 180 58 206 C 74 190 92 184 108 188 Z" fill="${hsla(hue, 90, 48, 0.55)}"/>
      <path d="M204 154 C 230 158 246 180 242 206 C 226 190 208 184 192 188 Z" fill="${hsla(hue, 90, 48, 0.55)}"/>
    </g>
    <g opacity="0.7" fill="${hsla(hue, 100, 60)}">
      <path d="M72 236 Q 84 210 96 236 Q 84 252 72 236 Z"/>
      <path d="M204 232 Q 216 206 228 232 Q 216 248 204 232 Z"/>
    </g>
  `;
}

function spellSigil(effect, id, hue, hue2) {
  switch (effect) {
    case 'draw2':
      return `
        <g transform="translate(0 8)">
          <path d="M-50 -18 C -46 52 46 52 50 -18 Z" fill="${hsla(hue2, 72, 16)}" stroke="${hsla(hue, 100, 78, 0.9)}" stroke-width="2"/>
          <path d="M-44 0 C -36 40 36 40 44 0" fill="none" stroke="${hsla(hue, 100, 72, 0.35)}" stroke-width="2"/>
          <ellipse cx="0" cy="-18" rx="50" ry="14" fill="${hsla(hue, 72, 36)}" stroke="${hsla(hue, 100, 84, 0.9)}" stroke-width="1.6"/>
          <ellipse cx="0" cy="-20" rx="37" ry="8" fill="${hsla(hue2, 70, 9)}"/>
          <g stroke="${hsla(hue, 100, 90, 0.9)}" stroke-width="1">
            <rect x="-35" y="-80" width="30" height="42" rx="3" fill="${hsla(hue2, 85, 54)}" transform="rotate(-18 -20 -59)"/>
            <rect x="-12" y="-92" width="30" height="42" rx="3" fill="${hsla(hue, 100, 78)}" transform="rotate(1 -10 -70)"/>
            <rect x="12" y="-78" width="30" height="42" rx="3" fill="${hsla(hue2, 85, 62)}" transform="rotate(20 30 -56)"/>
          </g>
          <g fill="${hsla(48, 100, 82)}">
            <circle cx="-30" cy="20" r="4"/><circle cx="-12" cy="30" r="3"/>
            <circle cx="12" cy="28" r="3.5"/><circle cx="32" cy="18" r="2.6"/>
          </g>
          <circle cx="0" cy="-38" r="24" fill="url(#orb-${id})" opacity="0.45"/>
        </g>`;
    case 'draw2pay':
      return `
        <g transform="translate(0 8)">
          <path d="M-58 52 H58 L42 30 H-42 Z" fill="${hsla(hue2, 70, 16)}" stroke="${hsla(hue, 100, 82, 0.9)}" stroke-width="1.8"/>
          <ellipse cx="0" cy="30" rx="42" ry="9" fill="${hsla(hue, 90, 54)}" opacity="0.75"/>
          <path d="M0 30 V -12" stroke="${hsla(hue2, 80, 36)}" stroke-width="6" stroke-linecap="round"/>
          <g fill="none" stroke="${hsla(hue, 100, 86, 0.88)}" stroke-width="2.2" stroke-linecap="round">
            <path d="M0 -12 C -46 -22 -60 -48 -38 -64 C -24 -74 -6 -64 0 -44 C 6 -64 24 -74 38 -64 C 60 -48 46 -22 0 -12"/>
            <path d="M0 -44 C -26 -52 -34 -68 -18 -78 C -8 -84 0 -72 0 -60 C 0 -72 8 -84 18 -78 C 34 -68 26 -52 0 -44"/>
          </g>
          <path d="M-30 30 C -26 18 26 18 30 30" fill="none" stroke="${hsla(hue, 100, 84, 0.6)}" stroke-width="1.4"/>
          <g fill="${hsla(hue, 100, 90, 0.9)}">
            <circle cx="-54" cy="-30" r="3.4"/><circle cx="56" cy="-18" r="4"/>
            <circle cx="-38" cy="-66" r="2.4"/><circle cx="34" cy="-82" r="2.3"/>
          </g>
          <g fill="none" stroke="${hsla(hue2, 100, 82, 0.55)}" stroke-width="1.4" stroke-dasharray="3 6">
            <path d="M-62 0 Q -76 -26 -58 -42"/><path d="M62 0 Q 76 -22 60 -38"/>
          </g>
        </g>`;
    case 'heal':
      return `
        <g>
          <circle r="52" fill="url(#orb-${id})" opacity="0.8"/>
          <circle r="36" fill="${hsla(48, 100, 86, 0.92)}"/>
          <circle r="28" fill="${hsla(45, 100, 66)}"/>
          <g stroke="${hsla(44, 100, 94, 0.95)}" stroke-width="10" stroke-linecap="round">
            <path d="M0 -19 V 19"/><path d="M-19 0 H 19"/>
          </g>
          <g stroke="${hsla(hue, 100, 82, 0.6)}" stroke-width="2" stroke-linecap="round">
            <path d="M0 -62 V -48"/><path d="M0 62 V 48"/><path d="M-62 0 H -48"/><path d="M62 0 H 48"/>
            <path d="M-44 -44 L -34 -34"/><path d="M44 -44 L 34 -34"/><path d="M-44 44 L -34 34"/><path d="M44 44 L 34 34"/>
          </g>
          <g fill="${hsla(hue2, 100, 82, 0.75)}">
            <circle cx="-54" cy="-18" r="3"/><circle cx="54" cy="18" r="3.6"/><circle cx="42" cy="-52" r="2.4"/>
          </g>
        </g>`;
    case 'destroyMonster':
      return `
        <g>
          <circle r="62" fill="${hsla(hue2, 100, 66, 0.12)}"/>
          <path d="M16 -76 L -38 -8 L -10 -8 L -24 76 L 40 -20 L 8 -20 Z"
            fill="url(#glow-${id})" stroke="${hsla(hue, 100, 92, 0.95)}" stroke-width="2"/>
          <path d="M16 -76 L -38 -8 L -10 -8 L -24 76 L 40 -20 L 8 -20 Z"
            fill="none" stroke="${hsla(hue2, 100, 82, 0.6)}" stroke-width="5"/>
          <g fill="none" stroke="${hsla(hue, 100, 84, 0.7)}" stroke-width="2" stroke-linecap="round">
            <path d="M-66 -46 L -48 -38"/><path d="M-72 4 L -54 4"/><path d="M-58 50 L -44 40"/>
            <path d="M62 -30 L 46 -22"/><path d="M68 22 L 50 18"/>
          </g>
          <circle cx="-50" cy="-64" r="3" fill="${hsla(hue, 100, 90)}"/>
          <circle cx="58" cy="52" r="4" fill="${hsla(hue2, 100, 80)}"/>
        </g>`;
    case 'buff':
      return `
        <g>
          <circle r="58" fill="url(#orb-${id})" opacity="0.42"/>
          <path d="M0 -80 L 22 -18 L 10 -2 L 0 -14 L -10 -2 L -22 -18 Z"
            fill="url(#glow-${id})" stroke="${hsla(hue, 100, 90, 0.9)}" stroke-width="1.8"/>
          <path d="M0 -14 V 54" stroke="${hsla(hue, 100, 84, 0.9)}" stroke-width="7" stroke-linecap="round"/>
          <path d="M-28 24 H 28" stroke="${hsla(hue2, 100, 78, 0.9)}" stroke-width="6" stroke-linecap="round"/>
          <circle cx="0" cy="58" r="7" fill="${hsla(hue2, 100, 72)}"/>
          <g fill="none" stroke="${hsla(hue, 100, 84, 0.65)}" stroke-width="2.4" stroke-linecap="round">
            <path d="M-48 -40 L -34 -28"/><path d="M48 -40 L 34 -28"/><path d="M-58 4 L -42 4"/><path d="M58 4 L 42 4"/>
          </g>
        </g>`;
    case 'destroySet':
      return `
        <g>
          <path d="M0 -62 L 54 -31 L 54 31 L 0 62 L -54 31 L -54 -31 Z"
            fill="${hsla(hue2, 60, 12)}" stroke="${hsla(hue, 100, 82, 0.8)}" stroke-width="2"/>
          <path d="M-8 -60 L 8 -22 L -14 -4 L 12 12 L -4 50" fill="none" stroke="${hsla(hue, 100, 92, 0.9)}" stroke-width="3"/>
          <g fill="none" stroke="${hsla(hue2, 100, 78, 0.7)}" stroke-width="3" stroke-linecap="round">
            <path d="M-84 -34 Q -58 -52 -34 -44"/><path d="M84 34 Q 58 52 34 44"/>
            <path d="M-70 6 Q -50 -4 -32 2"/><path d="M70 -6 Q 50 4 32 -2"/>
          </g>
          <g fill="${hsla(hue, 100, 88, 0.7)}">
            <circle cx="-62" cy="-54" r="3"/><circle cx="62" cy="54" r="3"/><circle cx="58" cy="-64" r="2.2"/>
          </g>
        </g>`;
    case 'bounce':
      return `
        <g>
          <ellipse cx="0" cy="0" rx="52" ry="68" fill="${hsla(hue2, 70, 10, 0.7)}" stroke="${hsla(hue, 100, 82, 0.9)}" stroke-width="2"/>
          <ellipse cx="0" cy="0" rx="36" ry="52" fill="none" stroke="${hsla(hue, 100, 80, 0.65)}" stroke-width="1.4" stroke-dasharray="4 7"/>
          <ellipse cx="0" cy="0" rx="18" ry="32" fill="url(#orb-${id})" opacity="0.7"/>
          <path d="M-30 10 C -30 -26 -4 -38 20 -24 C 42 -12 40 18 18 26 C 0 32 -12 20 -8 6 C -4 -4 8 -4 12 4"
            fill="none" stroke="${hsla(hue, 100, 92, 0.86)}" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M-10 -22 L 10 -32 L 4 -12 Z" fill="${hsla(hue, 100, 88)}"/>
          <g fill="${hsla(hue2, 100, 78, 0.8)}">
            <circle cx="-72" cy="-30" r="3"/><circle cx="70" cy="-8" r="2.4"/><circle cx="-58" cy="52" r="2.6"/>
          </g>
        </g>`;
    default:
      return '';
  }
}

function spellArt(id, hue, hue2, def = {}) {
  return `
    <g transform="translate(150 150)" opacity="0.9">
      <circle r="94" fill="none" stroke="${hsla(hue, 100, 78, 0.34)}" stroke-width="1.2" stroke-dasharray="2 10"/>
      <circle r="80" fill="none" stroke="${hsla(hue, 100, 78, 0.5)}" stroke-width="1.4"/>
      <circle r="70" fill="none" stroke="${hsla(hue2, 100, 74, 0.6)}" stroke-width="2"/>
      <g stroke="${hsla(hue, 100, 82, 0.55)}" stroke-width="1.6" fill="none">
        <path d="M0 -80 V -70"/><path d="M0 80 V 70"/><path d="M-80 0 H -70"/><path d="M80 0 H 70"/>
        <path d="M-57 -57 L -50 -50"/><path d="M57 -57 L 50 -50"/><path d="M-57 57 L -50 50"/><path d="M57 57 L 50 50"/>
      </g>
      <g fill="${hsla(hue, 100, 84, 0.7)}">
        <circle cx="0" cy="-80" r="3"/><circle cx="0" cy="80" r="3"/>
        <circle cx="-80" cy="0" r="3"/><circle cx="80" cy="0" r="3"/>
      </g>
    </g>
    <g transform="translate(150 148)">${spellSigil(def.effect, id, hue, hue2)}</g>
    <g fill="${hsla(hue, 100, 84, 0.75)}">
      <path d="M34 228 l 5 12 l 12 5 l -12 5 l -5 12 l -5 -12 l -12 -5 l 12 -5 Z"/>
      <path d="M256 92 l 4 9 l 9 4 l -9 4 l -4 9 l -4 -9 l -9 -4 l 9 -4 Z"/>
    </g>
    <g fill="none" stroke="${hsla(hue2, 100, 78, 0.35)}" stroke-width="1.2">
      <path d="M24 62 Q 62 22 110 26"/><path d="M276 238 Q 238 278 190 274"/>
    </g>
  `;
}

function trapSigil(effect, id, hue, hue2) {
  switch (effect) {
    case 'barrier':
      return `
        <g>
          <path d="M0 -70 L 56 -42 L 52 12 C 48 42 28 62 0 74 C -28 62 -48 42 -52 12 L -56 -42 Z"
            fill="${hsla(hue2, 55, 14)}" stroke="${hsla(hue, 100, 86, 0.95)}" stroke-width="2.2"/>
          <path d="M0 -52 L 38 -32 L 35 8 C 32 30 18 44 0 54 C -18 44 -32 30 -35 8 L -38 -32 Z"
            fill="none" stroke="${hsla(hue, 100, 82, 0.7)}" stroke-width="1.4"/>
          <path d="M0 -30 L 0 24 M -22 0 L 22 0" stroke="${hsla(hue, 100, 95, 0.95)}" stroke-width="6" stroke-linecap="round"/>
          <g stroke="${hsla(hue, 100, 82, 0.6)}" stroke-width="2.4" stroke-linecap="round">
            <path d="M-76 -46 L -58 -34"/><path d="M76 -46 L 58 -34"/><path d="M-82 6 L -64 6"/><path d="M82 6 L 64 6"/>
          </g>
          <g fill="${hsla(hue, 100, 86, 0.8)}">
            <circle cx="-68" cy="46" r="3"/><circle cx="68" cy="46" r="3.4"/><circle cx="52" cy="-62" r="2.4"/>
          </g>
        </g>`;
    case 'cylinder':
      return `
        <g>
          <ellipse cx="0" cy="-50" rx="42" ry="17" fill="${hsla(hue2, 80, 58)}" stroke="${hsla(hue, 100, 88, 0.9)}" stroke-width="1.8"/>
          <path d="M-42 -50 V 42 C -42 52 42 52 42 42 V -50" fill="${hsla(hue2, 65, 13)}" stroke="${hsla(hue, 100, 82, 0.85)}" stroke-width="2"/>
          <ellipse cx="0" cy="42" rx="42" ry="17" fill="${hsla(hue2, 80, 42)}" stroke="${hsla(hue, 100, 88, 0.9)}" stroke-width="1.8"/>
          <ellipse cx="0" cy="0" rx="30" ry="12" fill="url(#orb-${id})" opacity="0.8"/>
          <path d="M0 -12 V 20 M -8 12 L 0 22 L 8 12" fill="none" stroke="${hsla(hue, 100, 94)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <g fill="none" stroke="${hsla(hue2, 100, 80, 0.65)}" stroke-width="2" stroke-linecap="round">
            <path d="M-62 -26 C -78 -10 -78 16 -62 32"/><path d="M62 -26 C 78 -10 78 16 62 32"/>
          </g>
          <g fill="${hsla(hue, 100, 86, 0.8)}">
            <circle cx="-68" cy="-46" r="3"/><circle cx="68" cy="-46" r="3"/><circle cx="0" cy="74" r="3.4"/>
          </g>
        </g>`;
    case 'peace':
      return `
        <g>
          <circle r="50" fill="url(#orb-${id})" opacity="0.6"/>
          <path d="M-56 26 Q -18 -22 50 -28 Q 30 -6 20 10 Q 6 30 -20 38 Q -42 42 -56 26 Z"
            fill="${hsla(hue, 100, 92, 0.92)}" stroke="${hsla(hue, 100, 98, 0.8)}" stroke-width="1.2"/>
          <path d="M-4 8 L 48 -22" stroke="${hsla(hue2, 100, 76)}" stroke-width="3" stroke-linecap="round"/>
          <path d="M-34 64 Q 2 34 54 26" fill="none" stroke="${hsla(hue, 100, 84, 0.85)}" stroke-width="3" stroke-linecap="round"/>
          <g fill="${hsla(hue, 100, 84, 0.85)}">
            <ellipse cx="-18" cy="52" rx="13" ry="5" transform="rotate(-30 -18 52)"/>
            <ellipse cx="2" cy="40" rx="13" ry="5" transform="rotate(-18 2 40)"/>
            <ellipse cx="24" cy="32" rx="12" ry="5" transform="rotate(-10 24 32)"/>
          </g>
          <circle cx="40" cy="-10" r="4" fill="${hsla(45, 100, 74)}"/>
          <g fill="${hsla(hue, 100, 86, 0.7)}"><circle cx="-62" cy="-54" r="3"/><circle cx="2" cy="-62" r="2.4"/></g>
        </g>`;
    case 'pitfall':
      return `
        <g>
          <ellipse cx="0" cy="40" rx="80" ry="32" fill="${hsla(hue2, 60, 7)}" stroke="${hsla(hue, 100, 82, 0.9)}" stroke-width="2"/>
          <ellipse cx="0" cy="36" rx="62" ry="21" fill="${hsla(hue2, 70, 2)}"/>
          <ellipse cx="0" cy="32" rx="44" ry="12" fill="#010207"/>
          <g stroke="${hsla(hue, 100, 78, 0.7)}" stroke-width="1.6" fill="none">
            <path d="M-80 40 Q -62 26 -46 36"/><path d="M80 40 Q 62 26 46 36"/>
            <path d="M-44 58 Q -20 48 0 56 Q 20 48 44 58"/>
            <path d="M-22 68 L -12 54 L -4 70 L 8 54 L 18 68"/>
          </g>
          <g transform="translate(4 -38) rotate(16)">
            <path d="M0 -24 C -16 -24 -24 -12 -24 2 C -24 14 -14 24 0 24 C 14 24 24 14 24 2 C 24 -12 16 -24 0 -24 Z"
              fill="${hsla(hue, 55, 16)}" stroke="${hsla(hue, 100, 80, 0.85)}" stroke-width="1.4"/>
            <path d="M-18 -18 L -30 -30 L -8 -26 Z"/><path d="M18 -18 L 30 -30 L 8 -26 Z" fill="${hsla(hue2, 60, 14)}"/>
            <path d="M-14 -2 L -4 4 L -14 8 M14 -2 L 4 4 L 14 8" fill="none" stroke="${hsla(hue, 100, 92, 0.9)}" stroke-width="2" stroke-linecap="round"/>
            <path d="M-18 20 L -30 34 M18 20 L 30 34 M-8 54 L -4 30 M 8 54 L 4 30"
              stroke="${hsla(hue, 100, 82, 0.65)}" stroke-width="2.6" stroke-linecap="round"/>
          </g>
          <g stroke="${hsla(hue, 100, 92, 0.9)}" stroke-width="3" stroke-linecap="round" fill="none">
            <path d="M-54 -52 L -54 -21 M -61 -29 L -54 -19 L -47 -29"/>
            <path d="M54 -68 L 54 -37 M 47 -45 L 54 -35 L 61 -45"/>
          </g>
          <g fill="${hsla(hue, 100, 86, 0.75)}">
            <circle cx="-68" cy="-62" r="2.6"/><circle cx="70" cy="-54" r="3.2"/><circle cx="74" cy="18" r="2.2"/>
          </g>
        </g>`;
    default:
      return '';
  }
}

function trapArt(id, hue, hue2, def = {}) {
  return `
    <g transform="translate(150 150)">
      <path d="M0 -98 L 86 -49 L 86 49 L 0 98 L -86 49 L -86 -49 Z" fill="none" stroke="${hsla(hue, 100, 72, 0.5)}" stroke-width="2"/>
      <path d="M0 -76 L 66 -38 L 66 38 L 0 76 L -66 38 L -66 -38 Z" fill="none" stroke="${hsla(hue2, 100, 72, 0.45)}" stroke-width="1.2" stroke-dasharray="4 6"/>
      <g stroke="${hsla(hue2, 100, 76, 0.6)}" stroke-width="1.4">
        <path d="M0 -54 L 0 -42"/><path d="M0 54 L 0 42"/>
        <path d="M-60 0 L -48 0"/><path d="M60 0 L 48 0"/>
      </g>
      <g fill="${hsla(hue, 100, 84, 0.7)}">
        <circle cx="-62" cy="-62" r="3"/><circle cx="62" cy="-62" r="3"/>
        <circle cx="-62" cy="62" r="3"/><circle cx="62" cy="62" r="3"/>
      </g>
    </g>
    <g transform="translate(150 148)">${trapSigil(def.effect, id, hue, hue2)}</g>
    <g opacity="0.5" fill="none" stroke="${hsla(hue2, 100, 80, 0.5)}" stroke-width="1.2">
      <path d="M18 74 Q 58 34 102 44"/><path d="M282 226 Q 242 266 198 256"/>
    </g>
  `;
}

const RENDERERS = {
  dragon, knight, warrior, mage, angel, guardian, aquatic,
  beast, fox, demon, queen, serpent, imp,
  spell: spellArt, trap: trapArt
};

export function artFor(def) {
  const key = `${def.id}:${def.kind}`;
  if (cache.has(key)) return cache.get(key);
  const id = `${def.id}-${hexSeed(def.id)}`;
  const hue = def.hue ?? 200;
  const hue2 = def.hue2 ?? (hue + 40) % 360;
  const seed = hexSeed(def.id);
  const renderer = RENDERERS[def.art] || spellArt;
  const svg = `<svg viewBox="0 0 300 300" role="img" aria-label="${def.name}" preserveAspectRatio="xMidYMid slice">
    ${frameShell(id, hue, hue2, seed)}
    ${renderer(id, hue, hue2, def)}
    <rect x="0" y="0" width="300" height="300" fill="none" stroke="${hsla(hue, 100, 80, 0.14)}" stroke-width="8"/>
  </svg>`;
  cache.set(key, svg);
  return svg;
}

export function cardBackMarkup() {
  return `<svg viewBox="0 0 300 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="back-bg" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="#23306b"/>
        <stop offset="60%" stop-color="#0d1230"/>
        <stop offset="100%" stop-color="#05060f"/>
      </radialGradient>
      <linearGradient id="back-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffe6a6"/><stop offset="50%" stop-color="#c9962f"/><stop offset="100%" stop-color="#ffe6a6"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#back-bg)"/>
    <circle cx="150" cy="150" r="104" fill="none" stroke="url(#back-gold)" stroke-width="3" opacity="0.8"/>
    <circle cx="150" cy="150" r="94" fill="none" stroke="#6f81ff" stroke-width="1" opacity="0.5" stroke-dasharray="4 6"/>
    <g fill="none" stroke="url(#back-gold)" stroke-width="2.4" opacity="0.9">
      <circle cx="150" cy="150" r="58"/>
      <path d="M150 74 L 186 108 L 208 150 L 186 192 L 150 226 L 114 192 L 92 150 L 114 108 Z"/>
      <path d="M150 96 L 150 204 M 108 150 L 192 150"/>
    </g>
    <path d="M150 104 C 128 104 116 124 122 142 C 128 158 146 166 162 158 C 176 150 180 132 170 120 C 164 112 158 108 150 104 Z" fill="#101838" stroke="url(#back-gold)" stroke-width="1.6"/>
    <circle cx="150" cy="150" r="8" fill="#9fd8ff"/>
    <g fill="#ffe6a6" opacity="0.55">
      <circle cx="150" cy="150" r="4"/><circle cx="42" cy="42" r="2"/><circle cx="258" cy="42" r="2"/>
      <circle cx="42" cy="258" r="2"/><circle cx="258" cy="258" r="2"/>
    </g>
  </svg>`;
}
