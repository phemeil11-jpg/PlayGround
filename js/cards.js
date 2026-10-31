'use strict';

/* =========================================================
 *  CARD DATABASE — original cards inspired by classic
 *  monster-duel card games. No official assets are used.
 * ========================================================= */

const ATTR_COLORS = {
  '光': ['#ffe9a8', '#8a6420'],
  '闇': ['#c3a6ff', '#2a1a45'],
  '炎': ['#ffb066', '#7d1414'],
  '水': ['#8adcff', '#0f3a70'],
  '風': ['#c7f7a4', '#1f5c37'],
  '地': ['#e3c49a', '#57351a'],
};

const CARDS = {
  /* ---------------- MONSTERS ---------------- */
  ryuki: {
    id: 'ryuki', name: '蒼火の竜騎兵', kind: 'monster', level: 4,
    atk: 1800, def: 1200, attr: '炎', race: '竜', art: '🐲',
    text: '蒼い炎をまといし竜の騎兵。その突進は城壁をも穿つ。',
  },
  seikai: {
    id: 'seikai', name: '星海の守護者', kind: 'monster', level: 4,
    atk: 1200, def: 2000, attr: '水', race: '戦士', art: '🛡️',
    text: '星の海を守り続ける静かなる番人。守りに徹すれば鉄壁。',
  },
  raiden: {
    id: 'raiden', name: '雷鳴の剣士ライデン', kind: 'monster', level: 4,
    atk: 1700, def: 1000, attr: '光', race: '戦士', art: '⚡',
    text: '雷を刃に変える剣士。先手を取る速さに長ける。',
  },
  morgana: {
    id: 'morgana', name: '深緑の魔女モルガ', kind: 'monster', level: 3,
    atk: 1000, def: 1600, attr: '風', race: '魔法使い', art: '🔮',
    text: '召喚に成功した時、デッキからカードを1枚ドローする。',
    summonEffect: 'draw1',
  },
  golem: {
    id: 'golem', name: '岩塊のゴーレム', kind: 'monster', level: 4,
    atk: 1500, def: 1900, attr: '地', race: '岩石', art: '🗿',
    text: '古代の岩が意思を得た守護像。その拳は大地を砕く。',
  },
  luna: {
    id: 'luna', name: '影狼ルナ', kind: 'monster', level: 3,
    atk: 1400, def: 800, attr: '闇', race: '獣', art: '🐺',
    text: '月影に溶け込む黒狼。気配を消して獲物に迫る。',
  },
  hakugin: {
    id: 'hakugin', name: '白銀の翼獣', kind: 'monster', level: 5,
    atk: 2100, def: 1600, attr: '光', race: '獣族', art: '🦅',
    text: '白銀の羽を広げ空を裂く聖獣。高い攻撃力を誇る。',
  },
  guren: {
    id: 'guren', name: '紅蓮の巨人グラン', kind: 'monster', level: 6,
    atk: 2400, def: 2000, attr: '炎', race: '戦士', art: '🔥',
    text: '灼熱の拳を持つ巨人。その一撃は戦場を焦土と化す。',
  },
  rivai: {
    id: 'rivai', name: '深海の王リヴァイア', kind: 'monster', level: 7,
    atk: 2600, def: 2200, attr: '水', race: '海竜', art: '🐙',
    text: '深海を統べる古の王。渦潮とともに現れ、すべてを呑む。',
  },
  volog: {
    id: 'volog', name: '冥界の竜王ヴォルグ', kind: 'monster', level: 8,
    atk: 3000, def: 2500, attr: '闇', race: 'ドラゴン', art: '🐉',
    text: '冥界の頂点に君臨する竜王。その咆哮は魂を震わせる。',
  },
  leaf: {
    id: 'leaf', name: '妖精リーフ', kind: 'monster', level: 2,
    atk: 800, def: 1200, attr: '風', race: '植物', art: '🌿',
    text: '召喚に成功した時、自分のLPを500回復する。',
    summonEffect: 'heal500',
  },
  ex: {
    id: 'ex', name: '機械兵エクス', kind: 'monster', level: 4,
    atk: 1600, def: 1400, attr: '地', race: '機械', art: '⚙️',
    text: '守備表示モンスターを攻撃した時、貫通ダメージを与える。',
    pierce: true,
  },
  sera: {
    id: 'sera', name: '天空の騎士セラ', kind: 'monster', level: 5,
    atk: 1900, def: 1900, attr: '光', race: '戦士', art: '✨',
    text: '召喚に成功した時、相手に500のダメージを与える。',
    summonEffect: 'burn500',
  },
  chaos: {
    id: 'chaos', name: '混沌の魔導士', kind: 'monster', level: 6,
    atk: 2300, def: 2000, attr: '闇', race: '魔法使い', art: '🌀',
    text: '召喚に成功した時、デッキからカードを1枚ドローする。',
    summonEffect: 'draw1',
  },

  /* ---------------- SPELLS ---------------- */
  hoshi: {
    id: 'hoshi', name: '星読みの杯', kind: 'spell', effect: 'draw2',
    art: '🏆', text: 'デッキからカードを2枚ドローする。',
  },
  danzai: {
    id: 'danzai', name: '断罪の雷', kind: 'spell', effect: 'destroyMonster', target: 'enemyMonster',
    art: '🌩️', text: '相手モンスター1体を破壊する。',
  },
  goei: {
    id: 'goei', name: '戦士の号令', kind: 'spell', effect: 'buff', target: 'ownMonster',
    art: '📢', text: '自分モンスター1体のATKを、このターンの間700アップする。',
  },
  shizuku: {
    id: 'shizuku', name: '癒しの雫', kind: 'spell', effect: 'heal',
    art: '💧', text: '自分のLPを1200回復する。',
  },
  sosei: {
    id: 'sosei', name: '蘇生の儀', kind: 'spell', effect: 'revive', target: 'ownGrave',
    art: '🕯️', text: '自分の墓地のモンスター1体を攻撃表示で特殊召喚する。',
  },
  toppu: {
    id: 'toppu', name: '突風の護符', kind: 'spell', effect: 'destroyST', target: 'enemyST',
    art: '🌪️', text: '相手の魔法・罠カード1枚を破壊する。',
  },
  niju: {
    id: 'niju', name: '二重の刻印', kind: 'spell', effect: 'extraSummon',
    art: '🔯', text: 'このターン、もう1度モンスターを召喚できる。',
  },

  /* ---------------- TRAPS ---------------- */
  barrier: {
    id: 'barrier', name: '聖域の障壁', kind: 'trap', effect: 'negateAttack', trigger: 'attack',
    art: '🔰', text: '相手モンスターの攻撃宣言時に発動。その攻撃を無効にする。',
  },
  ibara: {
    id: 'ibara', name: '反撃の茨', kind: 'trap', effect: 'destroyAttacker', trigger: 'attack',
    art: '🌵', text: '相手モンスターの攻撃宣言時に発動。そのモンスターを破壊し、ATK分のダメージを相手に与える。',
  },
  naraku: {
    id: 'naraku', name: '奈落の落とし穴', kind: 'trap', effect: 'hole', trigger: 'summon',
    art: '🕳️', text: '相手がATK1500以上のモンスターを召喚した時、そのモンスターを破壊する。',
  },
  sajin: {
    id: 'sajin', name: '砂塵の旋風', kind: 'trap', effect: 'destroyST', target: 'enemyST',
    art: '🏜️', text: '相手の魔法・罠カード1枚を破壊する。',
  },
  taikyo: {
    id: 'taikyo', name: '強制退去', kind: 'trap', effect: 'bounce', target: 'enemyMonster',
    art: '🚪', text: '相手モンスター1体を持ち主の手札に戻す。',
  },
};

/* Starter deck list (34 cards) */
const DECKLIST = [
  ['ryuki', 2], ['seikai', 2], ['raiden', 2], ['morgana', 2],
  ['golem', 2], ['luna', 1], ['hakugin', 1], ['guren', 1],
  ['rivai', 1], ['volog', 1], ['leaf', 1], ['ex', 1],
  ['sera', 1], ['chaos', 1],
  ['hoshi', 2], ['danzai', 2], ['goei', 1], ['shizuku', 1],
  ['sosei', 1], ['toppu', 1], ['niju', 1],
  ['barrier', 2], ['ibara', 1], ['naraku', 1], ['sajin', 1], ['taikyo', 1],
];

/* Slots used by targeted effects */
const TARGET_SPEC = {
  enemyMonster: { row: 'mon', enemy: true },
  ownMonster: { row: 'mon', enemy: false },
  enemyST: { row: 'st', enemy: true },
  ownGrave: { grave: true },
};
