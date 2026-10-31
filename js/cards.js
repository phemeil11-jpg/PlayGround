/* POLARIS — card catalogue. No artwork, no bitmap assets: every card is
   drawn from type, numbers and a single typographic mark. */

export const ELEMENTS = {
  ICE:    { label: 'ICE',    ja: '氷晶', color: '#8ee9ff' },
  AURORA: { label: 'AURORA', ja: '極光', color: '#b8a4ff' },
  STORM:  { label: 'STORM',  ja: '北風', color: '#8bffd9' },
  FROST:  { label: 'FROST',  ja: '凍結', color: '#a9c8ff' },
};

export const CARD_DEFS = {
  /* ── monsters ─────────────────────────────────────────────── */
  frostfox: {
    id: 'frostfox', type: 'monster', name: '氷晶の狐', en: 'Frostfox', mark: '狐',
    element: 'ICE', level: 3, atk: 1200, def: 900,
    text: '氷の結晶をまとう小さな守り手。雪原では姿を見失う。',
  },
  polarKnight: {
    id: 'polarKnight', type: 'monster', name: '極星の騎士', en: 'Polaris Knight', mark: '騎',
    element: 'AURORA', level: 4, atk: 1800, def: 1200,
    text: '北天の星を胸に宿す守護騎士。極夜の刃は決して曇らない。',
  },
  snowHound: {
    id: 'snowHound', type: 'monster', name: '雪原の番犬', en: 'Snow Hound', mark: '犬',
    element: 'ICE', level: 3, atk: 1500, def: 1000,
    text: '吹雪の中でも主人の気配を追い続ける忠実な番犬。',
  },
  auroraMiko: {
    id: 'auroraMiko', type: 'monster', name: '極光の巫女', en: 'Aurora Miko', mark: '巫',
    element: 'AURORA', level: 4, atk: 1500, def: 1600,
    onSummon: 'heal600',
    text: '召喚時、極光の祈りで自分のライフを600回復する。',
  },
  northHawk: {
    id: 'northHawk', type: 'monster', name: '北風の鷹', en: 'North Hawk', mark: '鷹',
    element: 'STORM', level: 3, atk: 1600, def: 800,
    piercing: true,
    text: '守備表示モンスターを攻撃した時、その数値分の貫通ダメージを与える。',
  },
  glacierGiant: {
    id: 'glacierGiant', type: 'monster', name: '氷河の巨人', en: 'Glacier Giant', mark: '巨',
    element: 'ICE', level: 5, atk: 2100, def: 1800,
    text: '氷河を削って生まれた巨人。生贄1体を捧げて召喚する。',
  },
  whiteNightKing: {
    id: 'whiteNightKing', type: 'monster', name: '白夜の王', en: 'White Night King', mark: '王',
    element: 'AURORA', level: 6, atk: 2400, def: 2000,
    onSummon: 'buff300',
    text: '召喚時、自分フィールドの全モンスターの攻撃力を300アップする。生贄1体。',
  },
  frostDragon: {
    id: 'frostDragon', type: 'monster', name: '凍てつく龍', en: 'Frost Dragon', mark: '龍',
    element: 'FROST', level: 7, atk: 2800, def: 2400,
    onSummon: 'burn800',
    text: '召喚時、相手に800ダメージを与える。生贄2体を捧げて召喚する。',
  },
  crystalWarden: {
    id: 'crystalWarden', type: 'monster', name: '結晶の番人', en: 'Crystal Warden', mark: '晶',
    element: 'ICE', level: 4, atk: 900, def: 2100,
    shield: true,
    text: '戦闘で破壊される時、一度だけ結晶の殻が身代わりになる。',
  },
  frostAssassin: {
    id: 'frostAssassin', type: 'monster', name: '霜の刺客', en: 'Frost Assassin', mark: '刺',
    element: 'FROST', level: 2, atk: 800, def: 700,
    onDestroyed: 'draw1',
    text: '破壊された時、山札からカードを1枚ドローする。',
  },

  /* ── spells ───────────────────────────────────────────────── */
  auroraBlessing: {
    id: 'auroraBlessing', type: 'spell', spell: 'equip', name: '極光の加護', en: 'Aurora Blessing', mark: '護',
    element: 'AURORA',
    text: '自分モンスター1体に装備し、攻撃力を800アップする。装備先が破壊されると墓地へ。',
  },
  blizzardBind: {
    id: 'blizzardBind', type: 'spell', spell: 'bind', name: '吹雪の呪縛', en: 'Blizzard Bind', mark: '縛',
    element: 'ICE',
    text: '相手モンスター1体を守備表示にし、2ターンの間表示形式を変更できなくする。',
  },
  iceBurst: {
    id: 'iceBurst', type: 'spell', spell: 'destroy', name: '氷爆', en: 'Ice Burst', mark: '爆',
    element: 'FROST',
    text: '相手モンスター1体を破壊する。',
  },
  stargaze: {
    id: 'stargaze', type: 'spell', spell: 'draw', name: '星読み', en: 'Stargaze', mark: '星',
    element: 'AURORA',
    text: '山札からカードを2枚ドローする。',
  },
  supply: {
    id: 'supply', type: 'spell', spell: 'heal', name: '雪原の補給', en: 'Polar Supply', mark: '補',
    element: 'ICE',
    text: '自分のライフを1200回復する。',
  },
  thaw: {
    id: 'thaw', type: 'spell', spell: 'revive', name: '氷解の儀', en: 'Thaw Rite', mark: '解',
    element: 'STORM',
    text: '自分の墓地のモンスター1体を守備表示で特殊召喚する。空きモンスター枠が必要。',
  },

  /* ── traps ────────────────────────────────────────────────── */
  polarVeil: {
    id: 'polarVeil', type: 'trap', trap: 'negateHeal', name: '極光の帳', en: 'Aurora Veil', mark: '帳',
    element: 'AURORA',
    text: '相手の攻撃宣言時に発動。その攻撃を無効にし、ライフを500回復する。',
  },
  iceWall: {
    id: 'iceWall', type: 'trap', trap: 'weaken', name: '氷の壁', en: 'Ice Wall', mark: '壁',
    element: 'ICE',
    text: '相手の攻撃宣言時に発動。攻撃モンスターの攻撃力を1000ダウンする。',
  },
  mirrorIce: {
    id: 'mirrorIce', type: 'trap', trap: 'reflect', name: '氷鏡', en: 'Mirror Ice', mark: '鏡',
    element: 'FROST',
    text: '相手の攻撃宣言時に発動。攻撃を無効にし、相手に500ダメージを与える。',
  },
  fallingIce: {
    id: 'fallingIce', type: 'trap', trap: 'summonBurn', name: '落氷', en: 'Falling Ice', mark: '落',
    element: 'ICE',
    text: '相手がモンスターを召喚した時に発動。相手に700ダメージを与える。',
  },
  permafrost: {
    id: 'permafrost', type: 'trap', trap: 'destroyAttacker', name: '永久凍土', en: 'Permafrost', mark: '凍',
    element: 'FROST',
    text: '攻撃力2000以下のモンスターの攻撃宣言時に発動。そのモンスターを破壊する。',
  },
};

export const DECK_LIST = [
  ['polarKnight', 3],
  ['frostfox', 2],
  ['snowHound', 2],
  ['auroraMiko', 2],
  ['northHawk', 2],
  ['glacierGiant', 2],
  ['whiteNightKing', 1],
  ['frostDragon', 1],
  ['crystalWarden', 1],
  ['frostAssassin', 1],
  ['auroraBlessing', 2],
  ['blizzardBind', 1],
  ['iceBurst', 2],
  ['stargaze', 1],
  ['supply', 1],
  ['thaw', 1],
  ['polarVeil', 1],
  ['iceWall', 1],
  ['mirrorIce', 1],
  ['fallingIce', 1],
  ['permafrost', 1],
];

export const DECK_SIZE = DECK_LIST.reduce((total, [, n]) => total + n, 0);

export function cardDef(cardOrId) {
  const id = typeof cardOrId === 'string' ? cardOrId : cardOrId?.id;
  return CARD_DEFS[id] || null;
}

export function isMonster(card) { return cardDef(card)?.type === 'monster'; }
export function isSpell(card) { return cardDef(card)?.type === 'spell'; }
export function isTrap(card) { return cardDef(card)?.type === 'trap'; }

export function tributeCount(card) {
  const def = cardDef(card);
  if (!def || def.type !== 'monster') return 0;
  if (def.level >= 7) return 2;
  if (def.level >= 5) return 1;
  return 0;
}
