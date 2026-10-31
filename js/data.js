/* Card catalogue — every card is rendered from text and CSS. No images. */

export const ELEMENTS = {
  frost:   { label: '氷',   en: 'FROST' },
  aurora:  { label: '極光', en: 'AURORA' },
  night:   { label: '夜',   en: 'NIGHT' },
  glacier: { label: '氷河', en: 'GLACIER' },
  snow:    { label: '雪',   en: 'SNOW' },
};

export const CARDS = {
  m01: { kind: 'monster', name: '氷晶の仔狐', sub: 'FROSTFOX', el: 'frost', level: 3, atk: 1200, def: 900 },
  m02: { kind: 'monster', name: 'オーロラ・サーペント', sub: 'AURORA SERPENT', el: 'aurora', level: 4, atk: 1600, def: 1000 },
  m03: { kind: 'monster', name: 'セイバートゥース・ベア', sub: 'SABERTOOTH BEAR', el: 'snow', level: 4, atk: 1800, def: 1200 },
  m04: { kind: 'monster', name: 'ブリザード・ゴーレム', sub: 'BLIZZARD GOLEM', el: 'glacier', level: 5, atk: 2100, def: 1800 },
  m05: { kind: 'monster', name: '極夜のワイバーン', sub: 'POLAR WYVERN', el: 'night', level: 6, atk: 2300, def: 1600 },
  m06: { kind: 'monster', name: 'ナイト・オウル', sub: 'NIGHT OWL', el: 'night', level: 3, atk: 1000, def: 1400 },
  m07: { kind: 'monster', name: 'クリスタル・スタッグ', sub: 'CRYSTAL STAG', el: 'frost', level: 3, atk: 800, def: 1700 },
  m08: { kind: 'monster', name: 'フロスト・ウルフ', sub: 'FROST WOLF', el: 'frost', level: 4, atk: 1700, def: 1100 },
  m09: { kind: 'monster', name: 'アイス・メイデン', sub: 'ICE MAIDEN', el: 'glacier', level: 4, atk: 1500, def: 1600 },
  m10: { kind: 'monster', name: 'グレイシャル・タイタン', sub: 'GLACIAL TITAN', el: 'glacier', level: 7, atk: 2600, def: 2200 },
  m11: { kind: 'monster', name: 'スノー・ハイドラ', sub: 'SNOW HYDRA', el: 'snow', level: 5, atk: 2000, def: 1500 },
  m12: { kind: 'monster', name: 'ペンギン・ガード', sub: 'PENGUIN GUARD', el: 'snow', level: 2, atk: 600, def: 1900 },
  m13: { kind: 'monster', name: 'ノーザン・ドレイク', sub: 'NORTHERN DRAKE', el: 'aurora', level: 6, atk: 2400, def: 1800 },
  m14: { kind: 'monster', name: 'オーロラ・フェニックス', sub: 'AURORA PHOENIX', el: 'aurora', level: 5, atk: 1900, def: 1600 },
  m15: { kind: 'monster', name: 'スノーフレーク・フェアリー', sub: 'SNOWFLAKE FAIRY', el: 'snow', level: 2, atk: 900, def: 700 },
  m16: { kind: 'monster', name: '氷牙のリンクス', sub: 'ICE FANG LYNX', el: 'frost', level: 4, atk: 1750, def: 1300 },

  t01: { kind: 'tactic', name: 'オーロラ・ブースト', sub: 'AURORA BOOST', el: 'tactic', effect: 'boost', target: 'ownMonster', text: '自軍モンスター1体の攻撃力を、ターン終了時まで1000上げる。' },
  t02: { kind: 'tactic', name: 'ポーラー・ヒール', sub: 'POLAR HEAL', el: 'tactic', effect: 'heal', target: null, text: 'ライフポイントを1200回復する。' },
  t03: { kind: 'tactic', name: '極光の裁き', sub: 'AURORA JUDGMENT', el: 'tactic', effect: 'judgment', target: null, text: '相手の攻撃力が最も高いモンスター1体を破壊する。' },
  t04: { kind: 'tactic', name: 'フリーズ・バインド', sub: 'FREEZE BIND', el: 'tactic', effect: 'freeze', target: 'enemyMonster', text: '相手モンスター1体を守備表示にし、凍結する。' },
  t05: { kind: 'tactic', name: 'メテオ・ブレイク', sub: 'METEOR BREAK', el: 'tactic', effect: 'meteor', target: null, text: '相手に800ポイントのダメージを与える。' },
  t06: { kind: 'tactic', name: 'オーロラ・ドロー', sub: 'AURORA DRAW', el: 'tactic', effect: 'draw2', target: null, text: 'カードを2枚ドローする。' },
  t07: { kind: 'tactic', name: 'ブリザード・ウォール', sub: 'BLIZZARD WALL', el: 'tactic', effect: 'wall', target: null, text: '次に受けるダメージを0にする。' },
  t08: { kind: 'tactic', name: 'グレイシャル・スパイク', sub: 'GLACIAL SPIKE', el: 'tactic', effect: 'spike', target: null, text: '相手に500ポイントのダメージを与え、カードを1枚ドローする。' },
};

export const DECK_LIST = [
  'm01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08',
  'm09', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16',
  't01', 't02', 't03', 't04', 't05', 't06', 't07', 't08',
];

export const MONSTER_IDS = DECK_LIST.filter(id => CARDS[id].kind === 'monster');

export function cardDef(id) {
  return CARDS[id] || null;
}

export function tributeCost(card) {
  if (card.kind !== 'monster') return 0;
  if (card.level >= 7) return 2;
  if (card.level >= 5) return 1;
  return 0;
}

export function elementOf(card) {
  return ELEMENTS[card.el] || ELEMENTS.frost;
}
