/* ==========================================================================
   MILLENNIUM DUEL — card data and procedural card art
   Original cards, original artwork. No third-party assets.
   ========================================================================== */
(function () {
  'use strict';

  const rays = (n, cx, cy, r1, r2, w) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 360) / n;
      return `<path d="M${cx} ${cy - r2} L${cx + w / 2} ${cy - r1} L${cx - w / 2} ${cy - r1} Z" transform="rotate(${a} ${cx} ${cy})" fill="url(#gGold)" opacity=".8"/>`;
    }).join('');

  const legs = (cx, cy, n) =>
    Array.from({ length: n }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const off = 12 + Math.floor(i / 2) * 10;
      const a = side * (34 + Math.floor(i / 2) * 14);
      return `<path d="M${cx + side * 8} ${cy} L${cx + side * off} ${cy + 14} L${cx + side * (off + 6)} ${cy + 20}" transform="rotate(${a} ${cx} ${cy})" stroke="url(#gGold)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    }).join('');

  /* Each entry returns inner SVG markup for a 120x120 viewBox. */
  const ART = {
    lion: `${rays(14, 60, 60, 31, 55, 10)}
      <circle cx="60" cy="60" r="30" fill="#180d06" stroke="url(#gGold)" stroke-width="2.5"/>
      <circle cx="60" cy="60" r="25" fill="url(#gSun)" opacity=".92"/>
      <g fill="#2a1507">
        <ellipse cx="51" cy="56" rx="3.6" ry="4.6"/><ellipse cx="69" cy="56" rx="3.6" ry="4.6"/>
        <path d="M54 66q6 6 12 0q-6 9-12 0z"/>
      </g>
      <path d="M46 47q7-5 12 0M62 47q7-5 12 0" stroke="#2a1507" stroke-width="2" fill="none"/>`,

    falcon: `<circle cx="60" cy="28" r="9" fill="url(#gGold)"/>
      <path d="M68 25l12 4-12 5z" fill="url(#gSun)"/>
      <path d="M56 42q-17-6-34 4 19 2 28 16 5 8 10 8 5 0 10-8 9-14 28-16-17-10-34-4-4-2-8 0z" fill="url(#gGold)" opacity=".93"/>
      <path d="M56 48q-10 14-2 34M64 48q10 14 2 34" stroke="#2a1606" stroke-width="1.6" fill="none" opacity=".6"/>
      <path d="M60 48v38" stroke="#2a1606" stroke-width="1.4" opacity=".5"/>`,

    scarab: `${legs(60, 62, 6)}
      <ellipse cx="60" cy="66" rx="19" ry="24" fill="url(#gGold)" stroke="#2a1606" stroke-width="1.4"/>
      <path d="M41 58q19-16 38 0M60 42v48" stroke="#2a1606" stroke-width="1.6" fill="none" opacity=".65"/>
      <circle cx="60" cy="38" r="9" fill="url(#gGold)" stroke="#2a1606" stroke-width="1.4"/>
      <path d="M55 34l-3-6M65 34l3-6" stroke="url(#gGold)" stroke-width="2.4" stroke-linecap="round"/>`,

    priest: `<circle cx="85" cy="28" r="12" fill="url(#gSun)"/>
      <path d="M85 40v58" stroke="url(#gGold)" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M58 100q0-34 14-50 14 16 14 50z" fill="#1d1029" stroke="url(#gGold)" stroke-width="2"/>
      <circle cx="72" cy="42" r="7.5" fill="url(#gGold)"/>
      <path d="M72 50v28M64 58h16" stroke="url(#gGold)" stroke-width="1.8"/>
      <path d="M40 100h52" stroke="url(#gGold)" stroke-width="1.5" opacity=".6"/>`,

    sphinx: `<path d="M12 92q8-24 28-26h36q20 4 30 26z" fill="#2a1a08" stroke="url(#gGold)" stroke-width="2"/>
      <path d="M20 92h84" stroke="url(#gGold)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M45 66q-4-24 15-30 19 6 15 30z" fill="url(#gGold)"/>
      <path d="M38 62q-12-10-12-28l16 6 8-8 8 8 16-6q0 18-12 28" fill="url(#gGold)" stroke="#2a1606" stroke-width="1.2"/>
      <path d="M46 46h28M48 54h24" stroke="#2a1606" stroke-width="1.4" opacity=".55"/>
      <ellipse cx="54" cy="60" rx="2.6" ry="3" fill="#1a0f07"/><ellipse cx="70" cy="60" rx="2.6" ry="3" fill="#1a0f07"/>
      <path d="M78 90l12-8M30 90l-8-6" stroke="url(#gGold)" stroke-width="2.2" stroke-linecap="round"/>`,

    dragon: `<path d="M22 92q10-34 40-38 22-3 34-22" fill="none" stroke="url(#gGold)" stroke-width="9" stroke-linecap="round"/>
      <path d="M56 54Q36 32 18 28q8 20 26 28z" fill="url(#gGold)" opacity=".9"/>
      <path d="M66 50q4-30 30-38-6 26-22 40z" fill="url(#gGold)" opacity=".9"/>
      <circle cx="99" cy="30" r="7" fill="url(#gGold)"/>
      <path d="M102 24l9-5M102 33l10 3M96 36l-4 8" stroke="url(#gGold)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M30 86l-9 12M44 76l-8 13M58 68l-6 12" stroke="url(#gGold)" stroke-width="2" opacity=".7"/>`,

    hound: `<path d="M37 96l4-44-20-34 30 22 9-8 9 8 30-22-20 34 4 44z" fill="url(#gGold)" stroke="#2a1606" stroke-width="1.5"/>
      <path d="M44 58q8 8 16 8t16-8" fill="none" stroke="#2a1606" stroke-width="1.6"/>
      <circle cx="60" cy="52" r="5.4" fill="#1a0f07"/>
      <path d="M60 64v12M52 82h16" stroke="#2a1606" stroke-width="2" stroke-linecap="round"/>`,

    jackal: `<g transform="translate(-14 6) scale(.72)"><path d="M37 96l4-44-20-34 30 22 9-8 9 8 30-22-20 34 4 44z" fill="url(#gGold)" stroke="#2a1606" stroke-width="1.5"/><circle cx="60" cy="52" r="5" fill="#1a0f07"/></g>
      <g transform="translate(50 6) scale(.72)"><path d="M37 96l4-44-20-34 30 22 9-8 9 8 30-22-20 34 4 44z" fill="url(#gGold)" stroke="#2a1606" stroke-width="1.5"/><circle cx="60" cy="52" r="5" fill="#1a0f07"/></g>`,

    pharaoh: `<path d="M43 92l-3-54q0-22 20-22t20 22l-3 54q-17 9-34 0z" fill="#180d06" stroke="url(#gGold)" stroke-width="2.4"/>
      <path d="M40 36h40M42 46h36M44 56h32" stroke="url(#gGold)" stroke-width="2" opacity=".6"/>
      <ellipse cx="52" cy="62" rx="3" ry="3.6" fill="url(#gGold)"/><ellipse cx="68" cy="62" rx="3" ry="3.6" fill="url(#gGold)"/>
      <path d="M60 68v10M54 82q6 5 12 0" stroke="url(#gGold)" stroke-width="2" fill="none"/>
      <path d="M56 88h8v14h-8z" fill="url(#gGold)"/>`,

    scorpion: `<ellipse cx="54" cy="64" rx="16" ry="10" fill="url(#gGold)"/>
      <path d="M69 60q19-4 19-22 0-14-11-16" fill="none" stroke="url(#gGold)" stroke-width="4" stroke-linecap="round"/>
      <path d="M77 22l-9-6M77 22l9 3" stroke="url(#gGold)" stroke-width="3" stroke-linecap="round"/>
      <path d="M44 56q-14-12-22-6 6 7 16 10zM44 72q-14 12-22 6 6-7 16-10z" fill="url(#gGold)"/>
      <g stroke="url(#gGold)" stroke-width="2" stroke-linecap="round">
        <path d="M42 58L28 48M42 70L28 80M50 54L42 42M60 54L66 42M50 74L42 86M60 74L66 86"/>
      </g>`,

    priestess: `<path d="M82 24a30 30 0 1 0 0 68 24 24 0 1 1 0-68z" fill="url(#gMoon)" opacity=".95"/>
      <path d="M46 102q0-36 14-48 14 12 14 48z" fill="#1d1029" stroke="url(#gGold)" stroke-width="2"/>
      <circle cx="60" cy="46" r="7" fill="url(#gGold)"/>
      <path d="M60 54v26M51 64h18" stroke="url(#gGold)" stroke-width="1.8"/>
      <path d="M40 102h40" stroke="url(#gGold)" stroke-width="1.6" opacity=".6"/>`,

    golem: `<g fill="#352519" stroke="url(#gGold)" stroke-width="2.2">
        <rect x="36" y="22" width="48" height="24" rx="4"/>
        <rect x="26" y="50" width="68" height="28" rx="4"/>
        <rect x="34" y="82" width="52" height="18" rx="4"/>
      </g>
      <circle cx="50" cy="34" r="3" fill="url(#gSun)"/><circle cx="70" cy="34" r="3" fill="url(#gSun)"/>
      <path d="M46 60l10 8-6 12M70 58l-6 10 8 8" stroke="#e7c878" stroke-width="1.6" fill="none" opacity=".8"/>`,

    guardian: `<path d="M60 14l35 14v34q0 26-35 44Q25 88 25 62V28z" fill="#0b2224" stroke="url(#gGold)" stroke-width="3"/>
      <path d="M32 62q14-12 28 0t28 0" fill="none" stroke="url(#gTeal)" stroke-width="3" stroke-linecap="round"/>
      <path d="M34 74q13-10 26 0t26 0" fill="none" stroke="#3fd0b4" stroke-width="2" stroke-linecap="round" opacity=".75"/>
      <path d="M60 26v18M50 34h20" stroke="url(#gGold)" stroke-width="2.2"/>`,

    assassin: `<path d="M84 14L34 86" stroke="url(#gGold)" stroke-width="5" stroke-linecap="round"/>
      <path d="M34 86l-14 8 10-14z" fill="url(#gGold)"/>
      <path d="M58 44l18 12" stroke="url(#gGold)" stroke-width="3" stroke-linecap="round"/>
      <path d="M8 104q22-14 40-8t34 4 30-8" fill="none" stroke="#b98d45" stroke-width="2.2" opacity=".75"/>
      <circle cx="60" cy="30" r="10" fill="none" stroke="url(#gGold)" stroke-width="1.4" opacity=".5"/>`,

    serpent: `<path d="M18 88q28 0 28-22t20-22q20 0 20 16t-18 16" fill="none" stroke="url(#gGold)" stroke-width="12" stroke-linecap="round"/>
      <circle cx="22" cy="88" r="10" fill="url(#gGold)"/>
      <path d="M18 82l-9-7M18 94l-9 7" stroke="url(#gGold)" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="24" cy="86" r="2" fill="#1a0f07"/>
      <path d="M90 58l6-3M90 64l6 3" stroke="#1a0f07" stroke-width="2" stroke-linecap="round"/>`,

    wurm: `<path d="M6 94q12-22 32-12t28-14q10-20 26-10 10 6 20-2" fill="none" stroke="url(#gGold)" stroke-width="16" stroke-linecap="round" opacity=".92"/>
      <circle cx="106" cy="58" r="12" fill="url(#gGold)"/>
      <path d="M112 52l9-5M112 64l9 5" stroke="url(#gGold)" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="110" cy="55" r="2.4" fill="#1a0f07"/>
      <path d="M8 108q26-10 52-2t52-4" fill="none" stroke="#b98d45" stroke-width="2" opacity=".6"/>`,

    flare: `${rays(18, 60, 60, 25, 57, 7)}
      <circle cx="60" cy="60" r="27" fill="url(#gSun)"/>
      <circle cx="60" cy="60" r="13" fill="#fff6cf" opacity=".9"/>
      <circle cx="60" cy="60" r="27" fill="none" stroke="#7c2a0c" stroke-width="1.5" opacity=".5"/>`,

    ankh: `<path d="M60 14c-20 0-23 28 0 35 23-7 20-35 0-35z" fill="none" stroke="url(#gGold)" stroke-width="7" stroke-linecap="round"/>
      <path d="M60 49v48M36 64h48" stroke="url(#gGold)" stroke-width="8" stroke-linecap="round"/>
      <circle cx="60" cy="30" r="20" fill="none" stroke="url(#gGold)" stroke-width="1" opacity=".4"/>
      <path d="M32 96h56" stroke="url(#gGold)" stroke-width="1.4" opacity=".5"/>`,

    shield: `<path d="M60 12l36 15v33q0 27-36 46Q24 87 24 60V27z" fill="#1b1207" stroke="url(#gGold)" stroke-width="3"/>
      <path d="M60 30l22 44H38z" fill="url(#gGold)" opacity=".9"/>
      <path d="M60 30v44M46 62h28" stroke="#1b1207" stroke-width="2"/>
      <path d="M34 84q26 12 52 0" stroke="url(#gGold)" stroke-width="1.4" fill="none" opacity=".5"/>`,

    storm: `<g fill="none" stroke="url(#gGold)" stroke-linecap="round">
        <path d="M12 38q22-20 46-6t40-2" stroke-width="4"/>
        <path d="M18 56q20-16 40-4t38-4" stroke-width="3.4" opacity=".8"/>
        <path d="M24 74q18-12 36-2t34-6" stroke-width="2.8" opacity=".65"/>
        <path d="M32 92q16-8 30 0t28-4" stroke-width="2.2" opacity=".5"/>
      </g>
      <g fill="#e0b25c" opacity=".8">
        <circle cx="26" cy="22" r="2"/><circle cx="96" cy="26" r="2.4"/><circle cx="82" cy="46" r="1.6"/>
        <circle cx="20" cy="70" r="1.8"/><circle cx="104" cy="70" r="2"/><circle cx="60" cy="16" r="1.6"/>
      </g>`,

    offering: `<circle cx="60" cy="38" r="16" fill="url(#gSun)"/>
      ${rays(10, 60, 38, 18, 27, 4)}
      <path d="M24 74q10-16 24-14l10 12h4l10-12q14-2 24 14-12 20-36 20T24 74z" fill="#1b1207" stroke="url(#gGold)" stroke-width="2"/>
      <path d="M48 60q12-10 24 0" fill="none" stroke="url(#gGold)" stroke-width="1.8"/>
      <path d="M40 82q20 10 40 0" fill="none" stroke="url(#gGold)" stroke-width="1.2" opacity=".6"/>`,

    book: `<path d="M60 36Q42 24 20 28v62q22-4 40 6 18-10 40-6V28Q78 24 60 36z" fill="#0b1c19" stroke="url(#gGold)" stroke-width="3"/>
      <path d="M60 36v60" stroke="url(#gGold)" stroke-width="2"/>
      <circle cx="60" cy="20" r="11" fill="none" stroke="url(#gGold)" stroke-width="2"/>
      <circle cx="60" cy="20" r="4" fill="url(#gGold)"/>
      <path d="M30 48h18M30 58h14M72 48h18M72 58h14" stroke="#c9a24a" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,

    eclipse: `${rays(12, 60, 58, 36, 52, 6)}
      <circle cx="60" cy="58" r="31" fill="url(#gGold)"/>
      <circle cx="74" cy="50" r="31" fill="#120a1e"/>
      <circle cx="74" cy="50" r="31" fill="none" stroke="#e7c878" stroke-width="1" opacity=".5"/>`,

    edict: `<path d="M32 16h56q8 0 8 8v70q-16-6-36 2-20-8-36-2V24q0-8 8-8z" fill="#1b1308" stroke="url(#gGold)" stroke-width="3"/>
      <path d="M42 38h36M42 50h36M42 62h24" stroke="#c9a24a" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      <circle cx="74" cy="82" r="11" fill="url(#gGold)"/>
      <path d="M74 75v14M67 82h14" stroke="#1b1308" stroke-width="2.2"/>`,

    mirror: `<ellipse cx="60" cy="58" rx="34" ry="42" fill="#0b1b19" stroke="url(#gGold)" stroke-width="4"/>
      <ellipse cx="60" cy="58" rx="24" ry="33" fill="#173d38"/>
      <path d="M60 30v56M36 58h48" stroke="#4fc8b6" stroke-width="1" opacity=".35"/>
      <circle cx="60" cy="58" r="10" fill="url(#gGold)"/>
      <circle cx="60" cy="58" r="3.4" fill="#0b1b19"/>
      <path d="M38 32l10 10M82 84l-10-10" stroke="#8ff5e5" stroke-width="2" opacity=".7"/>`,

    pit: `<ellipse cx="60" cy="72" rx="42" ry="22" fill="#080510" stroke="url(#gGold)" stroke-width="2.4"/>
      <ellipse cx="60" cy="72" rx="28" ry="12" fill="#000" opacity=".7"/>
      <path d="M30 68q8-24 20-10l4 14M44 58l-6-12M56 56l4-12" fill="none" stroke="#c9a24a" stroke-width="3" stroke-linecap="round"/>
      <path d="M6 96q28-12 54-4t54-2" fill="none" stroke="#b98d45" stroke-width="2.2" opacity=".7"/>
      <path d="M84 62l8-10M88 78l12-4" stroke="url(#gGold)" stroke-width="1.8" opacity=".6"/>`,

    curse: `<path d="M38 92q2-36 22-36t22 36" fill="#1a0f07" stroke="url(#gGold)" stroke-width="2"/>
      <path d="M42 48q0-26 18-26t18 26l10-18 4 24" fill="url(#gGold)" opacity=".92"/>
      <ellipse cx="51" cy="50" rx="3.4" ry="4.4" fill="#1a0f07"/><ellipse cx="69" cy="50" rx="3.4" ry="4.4" fill="#1a0f07"/>
      <path d="M54 62q6 5 12 0" fill="none" stroke="#1a0f07" stroke-width="2"/>
      <path d="M12 30q10-12 22-2M108 30q-10-12-22-2" fill="none" stroke="url(#gRose)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M16 40q8-8 16-2M104 40q-8-8-16-2" fill="none" stroke="url(#gRose)" stroke-width="1.6" opacity=".6"/>`,

    wrath: `<path d="M22 44q14-20 36-12 18-14 38 2 16 12 4 28" fill="none" stroke="url(#gGold)" stroke-width="4" stroke-linecap="round"/>
      <path d="M28 56h64" stroke="url(#gGold)" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
      <path d="M36 64l-12 20M54 66l-6 26M72 66l8 24M90 62l16 18" stroke="url(#gEmber)" stroke-width="4" stroke-linecap="round"/>
      <path d="M12 36l10 6M108 34l-10 6M60 18v8" stroke="url(#gGold)" stroke-width="2" opacity=".6"/>`,
  };

  function artSvg(key) {
    return `<svg class="art-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${ART[key] || ART.ankh}</svg>`;
  }

  const ATTR = {
    light: { label: '光', tone: '#f0cf7a' },
    dark: { label: '闇', tone: '#a688e0' },
    earth: { label: '地', tone: '#c99a62' },
    water: { label: '水', tone: '#5cc9c4' },
    wind: { label: '風', tone: '#8fd8a8' },
    fire: { label: '炎', tone: '#ef8a4a' },
  };

  const CARDS = {
    /* ------------------------------ monsters ------------------------------ */
    'solar-lion': {
      name: 'Solar Lion', jp: '太陽の獅子', type: 'monster', attribute: 'light', race: '獣族', level: 4,
      atk: 1800, def: 1200, art: 'lion', text: '太陽の加護を受けた獅子。その鬣は砂漠を照らす。',
    },
    'anubis-hound': {
      name: 'Anubis Hound', jp: 'アヌビスの猟犬', type: 'monster', attribute: 'dark', race: '悪魔族', level: 4,
      atk: 1900, def: 800, art: 'hound', text: '冥界の門を守る猟犬。逃れた魂を再び連れ戻す。',
    },
    'obsidian-golem': {
      name: 'Obsidian Golem', jp: '黒曜のゴーレム', type: 'monster', attribute: 'earth', race: '岩石族', level: 4,
      atk: 1600, def: 2000, art: 'golem', text: '黒曜石の巨躯。守りは固いが、動きは遅い。',
    },
    'falcon-dawn': {
      name: 'Falcon of Dawn', jp: '暁の隼', type: 'monster', attribute: 'wind', race: '鳥獣族', level: 4,
      atk: 1700, def: 1000, art: 'falcon', text: '夜明けとともに空を裂く隼。その羽音は勝利の前触れ。',
    },
    'twin-jackal': {
      name: 'Twin-Headed Jackal', jp: '双頭のジャッカル', type: 'monster', attribute: 'dark', race: '悪魔族', level: 4,
      atk: 1400, def: 1700, art: 'jackal', text: '二つの頭で前後を警戒する。隙を見せることはない。',
    },
    'river-guardian': {
      name: 'River Guardian', jp: '河の守護者', type: 'monster', attribute: 'water', race: '水族', level: 4,
      atk: 800, def: 2200, art: 'guardian', text: 'ナイルの流れを統べる守護者。その盾は洪水をも防ぐ。',
    },
    'dune-assassin': {
      name: 'Dune Assassin', jp: '砂丘の暗殺者', type: 'monster', attribute: 'earth', race: '戦士族', level: 4,
      atk: 1800, def: 600, art: 'assassin', text: '守備表示モンスターを攻撃した場合、貫通ダメージを与える。',
    },
    'nile-serpent': {
      name: 'Nile Serpent', jp: 'ナイルの大蛇', type: 'monster', attribute: 'water', race: '海竜族', level: 4,
      atk: 1500, def: 1200, art: 'serpent', text: '召喚に成功した時、相手に300ダメージを与える。',
    },
    'golden-scarab': {
      name: 'Golden Scarab', jp: '黄金のスカラベ', type: 'monster', attribute: 'earth', race: '昆虫族', level: 3,
      atk: 1000, def: 1400, art: 'scarab', text: 'このカードが破壊された時、カードを1枚ドローする。',
    },
    'sand-wurm': {
      name: 'Sand Wurm', jp: '砂礫のワーム', type: 'monster', attribute: 'earth', race: '爬虫類族', level: 3,
      atk: 1200, def: 900, art: 'wurm', text: '砂の下を這い回る巨大な虫。足音だけで砂漠が震える。',
    },
    'shadow-priestess': {
      name: 'Shadow Priestess', jp: '影の神官戦士', type: 'monster', attribute: 'dark', race: '魔法使い族', level: 4,
      atk: 1200, def: 1800, art: 'priestess', text: 'リバースした時、カードを1枚ドローする。',
    },
    'high-priest-ra': {
      name: 'High Priest of Ra', jp: 'ラーの大神官', type: 'monster', attribute: 'light', race: '魔法使い族', level: 6,
      atk: 2400, def: 2000, art: 'priest', text: '太陽神の声を聴く者。生贄1体を捧げて召喚する。',
    },
    'sphinx-eclipse': {
      name: 'Sphinx of the Eclipse', jp: '蝕のスフィンクス', type: 'monster', attribute: 'earth', race: '岩石族', level: 6,
      atk: 2300, def: 2400, art: 'sphinx', text: '召喚に成功した時、自分は500ライフポイント回復する。',
    },
    'millennium-dragon': {
      name: 'Millennium Dragon', jp: '千年の竜', type: 'monster', attribute: 'light', race: 'ドラゴン族', level: 8,
      atk: 3000, def: 2500, art: 'dragon', text: '千年の眠りから目覚めた竜。その咆哮は時代を砕く。',
    },
    'void-pharaoh': {
      name: 'Void Pharaoh', jp: '虚無のファラオ', type: 'monster', attribute: 'dark', race: 'アンデッド族', level: 8,
      atk: 2800, def: 3000, art: 'pharaoh', text: '永遠の闇に君臨する王。生贄2体を捧げて召喚する。',
    },

    /* ------------------------------- spells ------------------------------- */
    'solar-flare': {
      name: 'Solar Flare', jp: '太陽の閃光', type: 'spell', art: 'flare', text: '相手に800ダメージを与える。',
    },
    'relic-recovery': {
      name: 'Relic Recovery', jp: '遺物の回収', type: 'spell', art: 'ankh', text: 'カードを2枚ドローする。',
    },
    'pyramid-shield': {
      name: 'Pyramid Shield', jp: 'ピラミッドの加護', type: 'spell', art: 'shield', text: '自分フィールドの表側モンスター1体の攻撃力を、ターン終了時まで700アップする。',
    },
    'sandstorm': {
      name: 'Sandstorm', jp: '砂嵐', type: 'spell', art: 'storm', text: '相手フィールドの表側モンスター全ての攻撃力を、ターン終了時まで500ダウンする。',
    },
    'offering-ra': {
      name: 'Offering to Ra', jp: 'ラーへの捧げ物', type: 'spell', art: 'offering', text: '相手モンスター1体を破壊し、その元々の攻撃力の半分だけLPを回復する。',
    },
    'book-afterlife': {
      name: 'Book of the Afterlife', jp: '冥界の書', type: 'spell', art: 'book', text: '自分の墓地のモンスター1体を守備表示で特殊召喚する。',
    },
    'eclipse-veil': {
      name: 'Eclipse Veil', jp: '蝕の帳', type: 'spell', art: 'eclipse', text: '相手モンスター1体を破壊し、自分は500ダメージを受ける。',
    },
    'golden-edict': {
      name: 'Golden Edict', jp: '黄金の勅令', type: 'spell', art: 'edict', text: '相手のセットされた魔法・罠カード1枚を破壊する。存在しない場合、相手に500ダメージを与える。',
    },

    /* -------------------------------- traps -------------------------------- */
    'mirror-tablet': {
      name: 'Mirror Tablet', jp: '鏡の石板', type: 'trap', art: 'mirror', text: '相手モンスターの攻撃宣言時に発動。攻撃を無効にし、そのモンスターの攻撃力分のダメージを相手に与える。',
    },
    'sand-pit': {
      name: 'Sand Pit', jp: '流砂の罠', type: 'trap', art: 'pit', text: '相手モンスターの攻撃宣言時に発動。攻撃モンスターを破壊する。',
    },
    'curse-sphinx': {
      name: 'Curse of the Sphinx', jp: 'スフィンクスの呪い', type: 'trap', art: 'curse', text: '相手モンスターの攻撃宣言時に発動。そのモンスターの攻撃力を永続で800ダウンする。',
    },
    'wrath-desert': {
      name: 'Wrath of the Desert', jp: '砂漠の怒り', type: 'trap', art: 'wrath', text: '相手がモンスターを召喚・特殊召喚した時に発動。そのモンスターを破壊する。',
    },
  };

  const DECK_LIST = [
    ['solar-lion', 2], ['anubis-hound', 2], ['obsidian-golem', 2], ['falcon-dawn', 2],
    ['twin-jackal', 2], ['river-guardian', 1], ['dune-assassin', 2], ['nile-serpent', 2],
    ['golden-scarab', 1], ['sand-wurm', 1], ['shadow-priestess', 1], ['high-priest-ra', 1],
    ['sphinx-eclipse', 1], ['millennium-dragon', 1], ['void-pharaoh', 1],
    ['solar-flare', 2], ['relic-recovery', 2], ['pyramid-shield', 2], ['sandstorm', 1],
    ['offering-ra', 2], ['book-afterlife', 1], ['eclipse-veil', 1], ['golden-edict', 1],
    ['mirror-tablet', 2], ['sand-pit', 2], ['curse-sphinx', 1], ['wrath-desert', 1],
  ];

  window.MD = window.MD || {};
  window.MD.CARDS = CARDS;
  window.MD.DECK_LIST = DECK_LIST;
  window.MD.ATTR = ATTR;
  window.MD.artSvg = artSvg;
})();
