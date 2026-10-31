// カードデータベース — すべてオリジナルカード

export const CARDS = {
  // ── モンスター ─────────────────────────────
  starDragon: {
    name: '星海の守護竜', reading: 'せいかいのしゅごりゅう',
    type: 'monster', attr: 'LIGHT', race: 'ドラゴン族', level: 6,
    atk: 2400, def: 2000, motif: 'dragon',
    text: '星の海を渡る守護竜。その咆哮は次元を震わせ、敵を光の彼方へと消し去る。'
  },
  azureKnight: {
    name: '蒼穹の剣士', reading: 'そうきゅうのけんし',
    type: 'monster', attr: 'LIGHT', race: '戦士族', level: 4,
    atk: 1800, def: 1200, motif: 'warrior',
    text: '蒼い空を切り裂く剣技を持つ騎士。風よりも速く、光よりも鋭い。'
  },
  crimsonMage: {
    name: '紅蓮の魔術師', reading: 'ぐれんのまじゅつし',
    type: 'monster', attr: 'FIRE', race: '魔法使い族', level: 4,
    atk: 1700, def: 1500, motif: 'mage', effect: 'burn400',
    text: '召喚成功時、相手に400ポイントのダメージを与える。'
  },
  abyssKnight: {
    name: '深淵の騎士', reading: 'しんえんのきし',
    type: 'monster', attr: 'DARK', race: '戦士族', level: 4,
    atk: 1800, def: 1000, motif: 'warrior', effect: 'drawOnDestroy',
    text: 'このカードが破壊された時、自分はカードを1枚ドローする。'
  },
  lightPriestess: {
    name: '聖光の司祭', reading: 'せいこうのしさい',
    type: 'monster', attr: 'LIGHT', race: '天使族', level: 4,
    atk: 1200, def: 1900, motif: 'fairy', effect: 'heal1000',
    text: '召喚成功時、自分は1000ライフポイント回復する。'
  },
  ironGuardian: {
    name: '鉄壁のガーディアン', reading: 'てっぺきのがーでぃあん',
    type: 'monster', attr: 'EARTH', race: '岩石族', level: 4,
    atk: 1000, def: 2100, motif: 'rock',
    text: '鉄壁の守りで味方を守る岩石の巨人。その体は幾多の攻撃を跳ね返す。'
  },
  galeHarpy: {
    name: '疾風のハーピー', reading: 'しっぷうのはーぴー',
    type: 'monster', attr: 'WIND', race: '鳥獣族', level: 4,
    atk: 1600, def: 1400, motif: 'beast',
    text: '疾風を纏い、獲物に急降下する鳥獣の戦士。'
  },
  leviathan: {
    name: '深海のリヴァイアサン', reading: 'しんかいのりう゛ぁいあさん',
    type: 'monster', attr: 'WATER', race: '海竜族', level: 5,
    atk: 2200, def: 1800, motif: 'sea',
    text: '深海に眠る巨大な海竜。目覚めれば海は荒れ、船は沈む。'
  },
  thunderBeast: {
    name: '雷鳴の獣', reading: 'らいめいのけもの',
    type: 'monster', attr: 'LIGHT', race: '雷族', level: 3,
    atk: 1400, def: 800, motif: 'thunder',
    text: '雷を喰らい、その咆哮で空を裂く獣。'
  },
  moonFox: {
    name: '月影の狐', reading: 'つきかげのきつね',
    type: 'monster', attr: 'DARK', race: '獣族', level: 3,
    atk: 1200, def: 1600, motif: 'beast',
    text: '月夜にだけ姿を現す妖狐。その尾は幻を紡ぐ。'
  },
  infernoDemon: {
    name: '獄炎のデーモン', reading: 'ごくえんのでーもん',
    type: 'monster', attr: 'DARK', race: '悪魔族', level: 7,
    atk: 2800, def: 2400, motif: 'fiend',
    text: '獄炎の底から現れる悪魔。その一撃は城壁さえも溶かす。'
  },
  mechValga: {
    name: '機械兵ヴァルガ', reading: 'きかいへいゔぁるが',
    type: 'monster', attr: 'EARTH', race: '機械族', level: 4,
    atk: 1500, def: 1800, motif: 'machine',
    text: '古代文明が生み出した戦闘機械。命令に忠実に、敵を排除する。'
  },
  skyHerald: {
    name: '天空の使者', reading: 'てんくうのししゃ',
    type: 'monster', attr: 'LIGHT', race: '天使族', level: 4,
    atk: 1300, def: 2000, motif: 'fairy',
    text: '天空より舞い降りる使者。その翼は傷ついた者を癒す。'
  },
  forestWarden: {
    name: '森の番人', reading: 'もりのばんにん',
    type: 'monster', attr: 'EARTH', race: '植物族', level: 2,
    atk: 800, def: 1200, motif: 'plant',
    text: '森の奥深くで旅人を見守る古き精霊。'
  },
  flameHound: {
    name: '焔獄の番犬', reading: 'えんごくのばんけん',
    type: 'monster', attr: 'FIRE', race: '獣族', level: 3,
    atk: 1500, def: 1000, motif: 'beast',
    text: '灼熱の牙を持つ番犬。逃げ場を求める獲物を追い詰める。'
  },
  stormSerpent: {
    name: '嵐の海蛇', reading: 'あらしのかいだ',
    type: 'monster', attr: 'WATER', race: '海竜族', level: 3,
    atk: 1300, def: 1100, motif: 'sea',
    text: '嵐の中で渦巻く海蛇。船乗りたちはその影を見ると航海を諦める。'
  },
  shadowWitch: {
    name: '影縫いの魔女', reading: 'かげぬいのまじょ',
    type: 'monster', attr: 'DARK', race: '魔法使い族', level: 4,
    atk: 1600, def: 1300, motif: 'mage', effect: 'burn400',
    text: '召喚成功時、相手に400ポイントのダメージを与える。'
  },
  crystalGolem: {
    name: '水晶のゴーレム', reading: 'すいしょうのごーれむ',
    type: 'monster', attr: 'EARTH', race: '岩石族', level: 5,
    atk: 2100, def: 2200, motif: 'rock',
    text: '水晶の鎧を纏うゴーレム。その拳は大地を割る。'
  },

  // ── 魔法カード ─────────────────────────────
  knowledgeFount: {
    name: '知識の泉', type: 'spell', icon: 'draw',
    text: 'カードを2枚ドローする。知恵は力の源となる。'
  },
  destructionStorm: {
    name: '破壊の嵐', type: 'spell', icon: 'destroy',
    text: '相手モンスター1体を破壊する。'
  },
  magicSword: {
    name: '魔力の剣', type: 'spell', icon: 'equip',
    text: '自分モンスター1体の攻撃力を1000ポイントアップする。'
  },
  healingLight: {
    name: '癒しの光', type: 'spell', icon: 'heal',
    text: '自分は1000ライフポイント回復する。'
  },
  revivalRite: {
    name: '蘇生の儀', type: 'spell', icon: 'revive',
    text: '自分の墓地からモンスター1体を守備表示で特殊召喚する。'
  },

  // ── 罠カード ───────────────────────────────
  holyBarrier: {
    name: '聖なる障壁', type: 'trap', icon: 'barrier',
    text: '相手モンスターの攻撃を無効にする。'
  },
  ruinPit: {
    name: '破滅の落とし穴', type: 'trap', icon: 'pit',
    text: '攻撃モンスターを破壊し、その攻撃を無効にする。'
  },
  counterMirror: {
    name: '反撃の鏡', type: 'trap', icon: 'mirror',
    text: '攻撃を無効にし、攻撃力分のダメージを相手に与える。'
  }
}

const PLAYER_DECK = [
  'starDragon', 'starDragon',
  'azureKnight', 'azureKnight', 'azureKnight',
  'crimsonMage', 'crimsonMage',
  'abyssKnight', 'abyssKnight',
  'lightPriestess', 'lightPriestess',
  'ironGuardian', 'ironGuardian',
  'galeHarpy', 'galeHarpy',
  'leviathan',
  'thunderBeast',
  'moonFox',
  'infernoDemon',
  'mechValga', 'mechValga',
  'skyHerald',
  'forestWarden',
  'flameHound',
  'shadowWitch',
  'knowledgeFount', 'knowledgeFount',
  'destructionStorm', 'destructionStorm',
  'magicSword', 'magicSword',
  'healingLight',
  'revivalRite',
  'holyBarrier', 'holyBarrier',
  'ruinPit',
  'counterMirror'
]

const AI_DECK = [
  'starDragon', 'starDragon', 'starDragon',
  'azureKnight', 'azureKnight',
  'crimsonMage',
  'abyssKnight',
  'ironGuardian', 'ironGuardian',
  'galeHarpy', 'galeHarpy',
  'leviathan', 'leviathan',
  'thunderBeast', 'thunderBeast',
  'moonFox',
  'infernoDemon',
  'mechValga',
  'skyHerald',
  'flameHound', 'flameHound',
  'stormSerpent',
  'crystalGolem',
  'knowledgeFount',
  'destructionStorm', 'destructionStorm',
  'magicSword', 'magicSword',
  'healingLight',
  'revivalRite',
  'holyBarrier', 'holyBarrier',
  'ruinPit', 'counterMirror'
]

export const DECKS = { p: PLAYER_DECK, a: AI_DECK }
