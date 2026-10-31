// Card data for DUEL LEGENDS — an original, fan-made card battler.
// Every card here is original; the game is inspired by classic duel card games.

export const CARD_POOL = {
  /* ---------------- PLAYER / LIGHT MONSTERS ---------------- */
  aurora_dragon: {
    id: 'aurora_dragon', name: '蒼穹の白龍', kind: 'monster', level: 8,
    atk: 3000, def: 2500, attribute: '光', race: 'ドラゴン', rarity: 'secret',
    text: '天空を統べる白き竜。その咆哮は次元さえも切り裂く。',
    art: 'dragon', hue: 198, hue2: 52, stars: true
  },
  ancient_guard_dragon: {
    id: 'ancient_guard_dragon', name: '古の守護竜', kind: 'monster', level: 6,
    atk: 2400, def: 2000, attribute: '光', race: 'ドラゴン', rarity: 'rare',
    text: '古の都を守り続ける守護竜。翼は聖なる光を纏う。',
    art: 'dragon', hue: 168, hue2: 45
  },
  white_mage: {
    id: 'white_mage', name: '白魔導の術師', kind: 'monster', level: 6,
    atk: 2300, def: 2000, attribute: '光', race: '魔法使い', rarity: 'rare',
    text: '光の理を操る術師。その杖は未来を照らす。',
    art: 'mage', hue: 192, hue2: 55
  },
  storm_knight: {
    id: 'storm_knight', name: '疾風の騎士', kind: 'monster', level: 4,
    atk: 1800, def: 1200, attribute: '風', race: '戦士', rarity: 'rare',
    text: '疾風と共に駆ける騎士。その剣閃は風をも断つ。',
    art: 'knight', hue: 165, hue2: 190
  },
  twin_mercenary: {
    id: 'twin_mercenary', name: '双剣の傭兵', kind: 'monster', level: 4,
    atk: 1600, def: 1000, attribute: '地', race: '戦士', rarity: 'common',
    text: '二振りの剣を操る傭兵。報酬のためなら何処へでも。',
    art: 'warrior', hue: 28, hue2: 45
  },
  light_angel: {
    id: 'light_angel', name: '聖光の天使', kind: 'monster', level: 4,
    atk: 1700, def: 1600, attribute: '光', race: '天使', rarity: 'rare',
    text: '聖なる光を纏う天使。傷ついた魂を癒す。',
    art: 'angel', hue: 46, hue2: 190
  },
  iron_guardian: {
    id: 'iron_guardian', name: '鉄壁の守護者', kind: 'monster', level: 4,
    atk: 900, def: 2200, attribute: '地', race: '岩石', rarity: 'common',
    text: '鋼鉄の身体で全てを防ぐ。その守りは揺るがない。',
    art: 'guardian', hue: 24, hue2: 200
  },
  abyss_fish: {
    id: 'abyss_fish', name: '深淵の魔魚', kind: 'monster', level: 3,
    atk: 1500, def: 800, attribute: '水', race: '魚', rarity: 'common',
    text: '深淵より現れる魔魚。青き焔をまとって泳ぐ。',
    art: 'aquatic', hue: 190, hue2: 210
  },
  thunder_wolf: {
    id: 'thunder_wolf', name: '電光の狼', kind: 'monster', level: 3,
    atk: 1400, def: 700, attribute: '光', race: '獣', rarity: 'common',
    text: '雷を纏う狼。その遠吠えは空を震わせる。',
    art: 'beast', hue: 54, hue2: 200
  },
  moon_fox: {
    id: 'moon_fox', name: '月影の狐', kind: 'monster', level: 2,
    atk: 800, def: 1400, attribute: '光', race: '獣', rarity: 'common',
    text: '月夜に現れる霊狐。幻の焔で敵を惑わす。',
    art: 'fox', hue: 208, hue2: 48
  },

  /* ---------------- AI / DARK MONSTERS ---------------- */
  inferno_demon: {
    id: 'inferno_demon', name: '灼熱の魔王', kind: 'monster', level: 8,
    atk: 2900, def: 2300, attribute: '炎', race: '悪魔', rarity: 'secret',
    text: '灼熱の玉座に座す魔王。その一振りで大地は熔ける。',
    art: 'demon', hue: 8, hue2: 35, stars: true
  },
  crimson_dragon: {
    id: 'crimson_dragon', name: '紅蓮の黒竜', kind: 'monster', level: 7,
    atk: 2800, def: 2400, attribute: '炎', race: 'ドラゴン', rarity: 'ultra',
    text: '紅蓮の焔を吐く黒竜。その翼は夜を焼き払う。',
    art: 'dragon', hue: 350, hue2: 20
  },
  dark_mage: {
    id: 'dark_mage', name: '黒魔導の術師', kind: 'monster', level: 7,
    atk: 2500, def: 2100, attribute: '闇', race: '魔法使い', rarity: 'ultra',
    text: '闇の理を極めた術師。禁断の呪文を詠唱する。',
    art: 'mage', hue: 282, hue2: 320
  },
  frost_queen: {
    id: 'frost_queen', name: '氷結の女王', kind: 'monster', level: 6,
    atk: 2300, def: 2600, attribute: '水', race: '魔法使い', rarity: 'rare',
    text: '氷の玉座に君臨する女王。息吹は全てを凍らせる。',
    art: 'queen', hue: 185, hue2: 210
  },
  shadow_serpent: {
    id: 'shadow_serpent', name: '影蛇のナーガ', kind: 'monster', level: 5,
    atk: 2000, def: 1700, attribute: '闇', race: '爬虫類', rarity: 'rare',
    text: '影から這い出す大蛇。その牙は毒を宿す。',
    art: 'serpent', hue: 300, hue2: 265
  },
  dark_knight: {
    id: 'dark_knight', name: '闇騎士', kind: 'monster', level: 4,
    atk: 1750, def: 1300, attribute: '闇', race: '戦士', rarity: 'common',
    text: '闇に堕ちた騎士。行く先には死の香りが漂う。',
    art: 'knight', hue: 285, hue2: 330
  },
  bone_golem: {
    id: 'bone_golem', name: '骸骨の巨人', kind: 'monster', level: 4,
    atk: 1100, def: 2100, attribute: '闇', race: '岩石', rarity: 'common',
    text: '無数の骨で編まれた巨人。破壊されても笑う。',
    art: 'guardian', hue: 285, hue2: 40
  },
  flame_imp: {
    id: 'flame_imp', name: '灼熱の小鬼', kind: 'monster', level: 3,
    atk: 1300, def: 1000, attribute: '炎', race: '悪魔', rarity: 'common',
    text: '焔を弄ぶ小鬼。悪戯のつもりで街を焼く。',
    art: 'imp', hue: 14, hue2: 330
  },
  night_wolf: {
    id: 'night_wolf', name: '夜影の狼', kind: 'monster', level: 3,
    atk: 1450, def: 900, attribute: '闇', race: '獣', rarity: 'common',
    text: '夜の闇に溶け込む狼。獲物の喉元を狙う。',
    art: 'beast', hue: 270, hue2: 315
  },
  venom_fish: {
    id: 'venom_fish', name: '毒棘の魔魚', kind: 'monster', level: 3,
    atk: 1500, def: 900, attribute: '水', race: '魚', rarity: 'common',
    text: '毒の棘を持つ魔魚。深き海の底に潜む。',
    art: 'aquatic', hue: 148, hue2: 180
  },

  /* ---------------- SPELLS ---------------- */
  greed_pot: {
    id: 'greed_pot', name: '強欲の宝壺', kind: 'spell', rarity: 'ultra',
    effect: 'draw2', hue: 45, hue2: 20, art: 'spell',
    text: '自分のデッキからカードを２枚ドローする。'
  },
  mana_spring: {
    id: 'mana_spring', name: '魔力の泉', kind: 'spell', rarity: 'rare',
    effect: 'draw2pay', hue: 195, hue2: 260, art: 'spell',
    text: 'ライフを１０００支払い、デッキからカードを２枚ドローする。'
  },
  holy_light: {
    id: 'holy_light', name: '癒しの聖光', kind: 'spell', rarity: 'common',
    effect: 'heal', hue: 50, hue2: 150, art: 'spell',
    text: '自分のライフを１５００回復する。'
  },
  thunder_bolt: {
    id: 'thunder_bolt', name: '破壊の雷撃', kind: 'spell', rarity: 'rare',
    effect: 'destroyMonster', hue: 210, hue2: 55, art: 'spell',
    text: '相手フィールドのモンスター１体を破壊する。'
  },
  warrior_awaken: {
    id: 'warrior_awaken', name: '戦士の覚醒', kind: 'spell', rarity: 'rare',
    effect: 'buff', hue: 20, hue2: 45, art: 'spell',
    text: '自分フィールドのモンスター１体の攻撃力を７００アップする。'
  },
  seal_wind: {
    id: 'seal_wind', name: '魔封じの風', kind: 'spell', rarity: 'common',
    effect: 'destroySet', hue: 155, hue2: 190, art: 'spell',
    text: '相手フィールドにセットされた魔法・罠カード１枚を破壊する。'
  },
  dimension_gate: {
    id: 'dimension_gate', name: '時空の歪み', kind: 'spell', rarity: 'ultra',
    effect: 'bounce', hue: 270, hue2: 200, art: 'spell',
    text: '相手フィールドのモンスター１体を持ち主の手札に戻す。'
  },

  /* ---------------- TRAPS ---------------- */
  holy_barrier: {
    id: 'holy_barrier', name: '聖光の結界', kind: 'trap', rarity: 'ultra',
    effect: 'barrier', hue: 48, hue2: 195, art: 'trap',
    text: '相手モンスターの攻撃宣言時に発動。相手の攻撃表示モンスターを全て破壊する。'
  },
  magic_cylinder: {
    id: 'magic_cylinder', name: '魔力の筒', kind: 'trap', rarity: 'ultra',
    effect: 'cylinder', hue: 280, hue2: 45, art: 'trap',
    text: '相手の直接攻撃時に発動。その攻撃を無効にし、攻撃力分のダメージを相手に与える。'
  },
  peaceful_envoy: {
    id: 'peaceful_envoy', name: '和睦の使者', kind: 'trap', rarity: 'rare',
    effect: 'peace', hue: 150, hue2: 190, art: 'trap',
    text: '相手モンスターの攻撃宣言時に発動。その攻撃を無効にする。'
  },
  pitfall: {
    id: 'pitfall', name: '落とし穴', kind: 'trap', rarity: 'rare',
    effect: 'pitfall', hue: 25, hue2: 300, art: 'trap',
    text: '相手が攻撃力１５００以上のモンスターを召喚した時に発動。そのモンスターを破壊する。'
  }
};

export const PLAYER_DECK = [
  'aurora_dragon', 'ancient_guard_dragon', 'white_mage',
  'storm_knight', 'storm_knight',
  'twin_mercenary', 'twin_mercenary',
  'light_angel',
  'iron_guardian', 'iron_guardian',
  'abyss_fish', 'abyss_fish',
  'thunder_wolf', 'moon_fox',
  'greed_pot', 'mana_spring', 'holy_light', 'holy_light',
  'thunder_bolt', 'warrior_awaken', 'seal_wind',
  'holy_barrier', 'magic_cylinder', 'peaceful_envoy'
];

export const AI_DECK = [
  'inferno_demon', 'crimson_dragon', 'dark_mage', 'frost_queen', 'shadow_serpent',
  'dark_knight', 'dark_knight',
  'bone_golem', 'bone_golem',
  'flame_imp', 'flame_imp', 'flame_imp',
  'night_wolf',
  'venom_fish', 'venom_fish',
  'greed_pot', 'mana_spring', 'holy_light',
  'thunder_bolt', 'warrior_awaken', 'seal_wind', 'dimension_gate',
  'holy_barrier', 'magic_cylinder', 'pitfall'
];

export const DECK_THEMES = {
  player: { name: '光の軍勢', leader: '光の決闘者', color: '#5fe7ff' },
  ai: { name: '闇の軍勢', leader: '闇の決闘者', color: '#ff4d86' }
};

export const KIND_LABEL = {
  monster: 'モンスター',
  spell: '魔法カード',
  trap: '罠カード'
};

export const ATTRIBUTE_COLOR = {
  '光': '#ffe58a',
  '闇': '#c58bff',
  '炎': '#ff8a5c',
  '水': '#6fd3ff',
  '地': '#d8a56a',
  '風': '#7dffb0'
};

export function tributeCount(level) {
  if (level >= 7) return 2;
  if (level >= 5) return 1;
  return 0;
}

export function cardById(id) {
  const card = CARD_POOL[id];
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}
