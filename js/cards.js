// Arctic Duel — card data. No images, no icons: every card is pure type + CSS geometry.

export const CARD_DEFS = {
  glacierBlade: {
    id: 'glacierBlade', name: '氷晶の剣士', en: 'GLACIER BLADE', kanji: '氷',
    level: 4, atk: 1800, def: 1200, element: '氷', hue: 190, rarity: 2,
    effect: null, text: '研ぎ澄まされた氷の刃を携える剣士。'
  },
  polarHound: {
    id: 'polarHound', name: '極夜の猟犬', en: 'POLAR HOUND', kanji: '狼',
    level: 4, atk: 1700, def: 1000, element: '狼', hue: 205, rarity: 2,
    effect: 'directBonus', effectValue: 300, text: '直接攻撃時、300追加ダメージ。'
  },
  frostBear: {
    id: 'frostBear', name: '霜牙のベア', en: 'FROSTFANG BEAR', kanji: '熊',
    level: 5, atk: 1900, def: 1600, element: '霜', hue: 185, rarity: 2,
    effect: 'destroyBurn', effectValue: 300, text: '戦闘破壊時、相手に300ダメージ。'
  },
  auroraMiko: {
    id: 'auroraMiko', name: 'オーロラの巫女', en: 'AURORA SEER', kanji: '巫',
    level: 4, atk: 1200, def: 2000, element: '光', hue: 155, rarity: 2,
    effect: 'summonHeal', effectValue: 400, text: '召喚時、LPを400回復。'
  },
  driftGiant: {
    id: 'driftGiant', name: '流氷の巨人', en: 'DRIFT GIANT', kanji: '巨',
    level: 6, atk: 2400, def: 2000, element: '氷', hue: 195, rarity: 3,
    effect: 'pierce', effectValue: 0, text: '守備表示への攻撃で貫通ダメージ。'
  },
  blizzardSpirit: {
    id: 'blizzardSpirit', name: '吹雪の精霊', en: 'BLIZZARD WISP', kanji: '霊',
    level: 3, atk: 1000, def: 1800, element: '雪', hue: 210, rarity: 1,
    effect: 'summonBurn', effectValue: 300, text: '召喚時、相手に300ダメージ。'
  },
  glacierKnight: {
    id: 'glacierKnight', name: '氷河の騎士', en: 'GLACIER KNIGHT', kanji: '騎',
    level: 5, atk: 2000, def: 1500, element: '氷', hue: 188, rarity: 2,
    effect: 'summonHeal', effectValue: 200, text: '召喚時、LPを200回復。'
  },
  whiteNightWarden: {
    id: 'whiteNightWarden', name: '白夜の番人', en: 'WHITE NIGHT WARDEN', kanji: '夜',
    level: 5, atk: 1500, def: 2100, element: '夜', hue: 225, rarity: 2,
    effect: null, text: '極夜を越えて立ち続ける静かな番人。'
  },
  tundraWyvern: {
    id: 'tundraWyvern', name: '凍土のワイバーン', en: 'TUNDRA WYVERN', kanji: '竜',
    level: 6, atk: 2200, def: 1400, element: '竜', hue: 200, rarity: 2,
    effect: null, text: '凍てつく空を裂いて舞い降りる翼。'
  },
  polarisKing: {
    id: 'polarisKing', name: '北極星の王', en: 'POLARIS KING', kanji: '王',
    level: 7, atk: 2600, def: 2200, element: '極', hue: 45, rarity: 3,
    effect: 'summonBoost', effectValue: 400, text: '召喚時、自身のATK+400。'
  },
  iceGolem: {
    id: 'iceGolem', name: '氷岩のゴーレム', en: 'ICE GOLEM', kanji: '岩',
    level: 4, atk: 1600, def: 1900, element: '岩', hue: 180, rarity: 1,
    effect: null, text: '永久凍土から削り出された守護者。'
  },
  snowFox: {
    id: 'snowFox', name: '雪原の狐', en: 'SNOW FOX', kanji: '狐',
    level: 2, atk: 900, def: 1400, element: '雪', hue: 165, rarity: 1,
    effect: null, text: '雪原を駆ける小さな影。'
  },
  auroraDrake: {
    id: 'auroraDrake', name: '極光の翼竜', en: 'AURORA DRAKE', kanji: '光',
    level: 6, atk: 2100, def: 1700, element: '光', hue: 145, rarity: 3,
    effect: null, text: 'オーロラを纏い、極夜を渡る翼竜。'
  },
  permafrostWolf: {
    id: 'permafrostWolf', name: '永久凍土の狼', en: 'PERMAFROST WOLF', kanji: '霜',
    level: 5, atk: 1800, def: 1700, element: '霜', hue: 215, rarity: 2,
    effect: null, text: '凍土を支配する銀の狼。'
  },
  crystalSage: {
    id: 'crystalSage', name: '水晶の賢者', en: 'CRYSTAL SAGE', kanji: '晶',
    level: 4, atk: 1400, def: 1800, element: '晶', hue: 175, rarity: 2,
    effect: 'summonHeal', effectValue: 300, text: '召喚時、LPを300回復。'
  },
  nightFrost: {
    id: 'nightFrost', name: '夜霜の刺客', en: 'NIGHTFROST', kanji: '刺',
    level: 3, atk: 1500, def: 900, element: '夜', hue: 245, rarity: 1,
    effect: 'directBonus', effectValue: 200, text: '直接攻撃時、200追加ダメージ。'
  }
}

export const RARITY = {
  1: { label: 'COMMON', tone: 'common' },
  2: { label: 'RARE', tone: 'rare' },
  3: { label: 'MYTHIC', tone: 'mythic' }
}

// 24 cards. Fast duels, four slots, one normal summon per turn.
export const DECK_RECIPE = [
  ['glacierBlade', 3],
  ['polarHound', 2],
  ['frostBear', 2],
  ['auroraMiko', 2],
  ['driftGiant', 1],
  ['blizzardSpirit', 2],
  ['glacierKnight', 2],
  ['whiteNightWarden', 1],
  ['tundraWyvern', 1],
  ['polarisKing', 1],
  ['iceGolem', 2],
  ['snowFox', 1],
  ['auroraDrake', 1],
  ['permafrostWolf', 1],
  ['crystalSage', 1],
  ['nightFrost', 1]
]

export function deckList() {
  const out = []
  for (const [id, count] of DECK_RECIPE) {
    for (let i = 0; i < count; i++) out.push(id)
  }
  return out
}

export function cardDef(id) {
  return CARD_DEFS[id]
}
