// ARCTIC DUEL — card catalogue.
// Every card is pure data. No images are used anywhere in the game.

export const ELEMENTS = {
  frost:  { label: 'FROST',  jp: '氷',   color: '#8fe9ff' },
  tide:   { label: 'TIDE',   jp: '潮',   color: '#79b8ff' },
  aurora: { label: 'AURORA', jp: '極光', color: '#b79cff' },
  beast:  { label: 'BEAST',  jp: '獣',   color: '#7cf5d0' },
  spell:  { label: 'SPELL',  jp: '魔法', color: '#ffd580' },
};

export const MONSTER_CARDS = {
  snow_scout: {
    id: 'snow_scout', name: 'Snow Scout', jp: 'スノウ・スカウト',
    kind: 'monster', element: 'frost', level: 2, atk: 600, def: 500,
    effect: 'summon_draw',
    text: '召喚時、山札から1枚引く。',
  },
  polar_bear: {
    id: 'polar_bear', name: 'Polar Bear', jp: 'ポーラー・ベア',
    kind: 'monster', element: 'beast', level: 4, atk: 1800, def: 1200,
    effect: null,
    text: '氷原を支配する白き巨獣。',
  },
  glacier_turtle: {
    id: 'glacier_turtle', name: 'Glacier Turtle', jp: '氷河亀',
    kind: 'monster', element: 'tide', level: 4, atk: 800, def: 2400,
    effect: null,
    text: '分厚い氷殻に守られた古亀。',
  },
  aurora_serpent: {
    id: 'aurora_serpent', name: 'Aurora Serpent', jp: 'オーロラ・サーペント',
    kind: 'monster', element: 'aurora', level: 4, atk: 1600, def: 1400,
    effect: 'pierce',
    text: '守備表示のモンスターを攻撃した場合、貫通ダメージを与える。',
  },
  frost_giant: {
    id: 'frost_giant', name: 'Frost Giant', jp: '霜の巨人',
    kind: 'monster', element: 'frost', level: 5, atk: 2000, def: 1600,
    effect: 'pierce',
    text: '守備表示のモンスターを攻撃した場合、貫通ダメージを与える。',
  },
  snowfox: {
    id: 'snowfox', name: 'Snowfox', jp: 'スノウフォックス',
    kind: 'monster', element: 'beast', level: 3, atk: 1200, def: 900,
    effect: 'destroy_draw',
    text: 'このカードが破壊された時、山札から1枚引く。',
  },
  frost_king: {
    id: 'frost_king', name: 'Frost King', jp: '霜王',
    kind: 'monster', element: 'frost', level: 7, atk: 2400, def: 1800,
    effect: 'kill_burn',
    text: 'このカードが戦闘でモンスターを破壊した時、相手に300ダメージ。',
  },
  ice_queen: {
    id: 'ice_queen', name: 'Ice Queen', jp: '氷の女王',
    kind: 'monster', element: 'aurora', level: 6, atk: 2100, def: 1900,
    effect: 'summon_chill',
    text: '召喚時、相手の攻撃表示モンスター全ての攻撃力を300下げる。',
  },
  ice_golem: {
    id: 'ice_golem', name: 'Ice Golem', jp: 'アイス・ゴーレム',
    kind: 'monster', element: 'tide', level: 5, atk: 1500, def: 2200,
    effect: null,
    text: '凍りついた岩塊が歩み出す。',
  },
  permafrost_wolf: {
    id: 'permafrost_wolf', name: 'Permafrost Wolf', jp: '永久凍土の狼',
    kind: 'monster', element: 'beast', level: 4, atk: 1700, def: 1100,
    effect: 'destroy_burn',
    text: 'このカードが破壊された時、相手に500ダメージ。',
  },
  crystal_warden: {
    id: 'crystal_warden', name: 'Crystal Warden', jp: '水晶の守護者',
    kind: 'monster', element: 'aurora', level: 4, atk: 1000, def: 2100,
    effect: 'first_shield',
    text: '戦闘で破壊される時、一度だけ破壊を無効にする。',
  },
  tidal_colossus: {
    id: 'tidal_colossus', name: 'Tidal Colossus', jp: '潮汐巨神',
    kind: 'monster', element: 'tide', level: 7, atk: 2300, def: 2100,
    effect: null,
    text: '極海の底から現れる、動く氷山。',
  },
  hoarfrost_mage: {
    id: 'hoarfrost_mage', name: 'Hoarfrost Mage', jp: '白霜の魔術師',
    kind: 'monster', element: 'frost', level: 4, atk: 1500, def: 1300,
    effect: 'summon_burn',
    text: '召喚時、相手に300ダメージ。',
  },
};

export const SPELL_CARDS = {
  glacial_spear: {
    id: 'glacial_spear', name: 'Glacial Spear', jp: '氷槍',
    kind: 'spell', element: 'spell', target: 'none',
    effect: 'burn_700',
    text: '相手に700ダメージを与える。',
  },
  meltwater: {
    id: 'meltwater', name: 'Meltwater', jp: '融雪',
    kind: 'spell', element: 'spell', target: 'none',
    effect: 'heal_800',
    text: '自分のライフを800回復する。',
  },
  frostbite: {
    id: 'frostbite', name: 'Frostbite', jp: '霜噛み',
    kind: 'spell', element: 'spell', target: 'enemyMonster',
    effect: 'enemy_atk_down',
    text: '相手モンスター1体の攻撃力を800下げる。',
  },
  aurora_veil: {
    id: 'aurora_veil', name: 'Aurora Veil', jp: '極光の帳',
    kind: 'spell', element: 'spell', target: 'ownMonster',
    effect: 'own_def_up',
    text: '自分モンスター1体の守備力を1000上げる。',
  },
  blizzard: {
    id: 'blizzard', name: 'Blizzard', jp: '猛吹雪',
    kind: 'spell', element: 'spell', target: 'none',
    effect: 'enemy_to_def',
    text: '相手の攻撃表示モンスター全てを守備表示にする。',
  },
  insight: {
    id: 'insight', name: 'Polar Insight', jp: '極夜の洞察',
    kind: 'spell', element: 'spell', target: 'none',
    effect: 'draw_2',
    text: '山札から2枚引く。',
  },
  avalanche: {
    id: 'avalanche', name: 'Avalanche', jp: '雪崩',
    kind: 'spell', element: 'spell', target: 'enemyMonster',
    effect: 'destroy_small',
    text: '攻撃力1800以下の相手モンスター1体を破壊する。',
  },
  ice_armor: {
    id: 'ice_armor', name: 'Ice Armor', jp: '氷殻',
    kind: 'spell', element: 'spell', target: 'ownMonster',
    effect: 'battle_immune',
    text: '自分モンスター1体はこのターン戦闘で破壊されず、守備力が1200上がる。',
  },
};

export const CARD_POOL = { ...MONSTER_CARDS, ...SPELL_CARDS };

export function cardDef(id) {
  const card = CARD_POOL[id];
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

export const DECK_RECIPE = [
  'snow_scout', 'snow_scout',
  'polar_bear', 'polar_bear',
  'glacier_turtle', 'glacier_turtle',
  'aurora_serpent', 'aurora_serpent',
  'frost_giant',
  'snowfox',
  'frost_king',
  'ice_queen',
  'ice_golem',
  'permafrost_wolf',
  'crystal_warden',
  'tidal_colossus',
  'hoarfrost_mage',
  'glacial_spear',
  'meltwater',
  'frostbite',
  'aurora_veil',
  'blizzard',
  'insight',
  'avalanche',
  'ice_armor',
];
