// Arctic Duel — card definitions. Text-only cards (no images, no icons).

export const CARDS = {
  wolf: {
    name: '氷牙の狼', kind: 'monster', race: '獣', lv: 3, atk: 1200, def: 800, glyph: '狼',
    text: '凍てつく牙を持つ狼。群れで獲物を追い詰める。'
  },
  sent: {
    name: '雪原の番人', kind: 'monster', race: '戦士', lv: 4, atk: 1500, def: 1200, glyph: '番',
    text: '雪原を見張る番人。その盾は氷よりも固い。'
  },
  golem: {
    name: '氷晶のゴーレム', kind: 'monster', race: '岩石', lv: 4, atk: 800, def: 2100, glyph: '晶',
    text: '氷の結晶でできた巨躯。守りにおいて無類。'
  },
  bear: {
    name: '北極熊の戦士', kind: 'monster', race: '獣戦士', lv: 4, atk: 1700, def: 1000, glyph: '熊',
    text: '白き毛皮の戦士。豪腕の一撃は氷を砕く。'
  },
  shark: {
    name: '流氷の鮫', kind: 'monster', race: '魚', lv: 4, atk: 1600, def: 900, glyph: '鮫',
    text: '流氷の下を泳ぐ鮫。氷を割って襲いかかる。'
  },
  sprite: {
    name: '吹雪の精霊', kind: 'monster', race: '天使', lv: 3, atk: 1000, def: 1000, glyph: '精',
    text: '吹雪とともに現れる精霊。風を操る。'
  },
  miko: {
    name: '白夜の巫女', kind: 'monster', race: '魔法使い', lv: 3, atk: 900, def: 1400, glyph: '巫',
    text: '白夜に祈る巫女。静かな守りの力を持つ。'
  },
  fenrir: {
    name: 'オーロラ・フェンリル', kind: 'monster', race: '獣', lv: 5, atk: 2000, def: 1500, glyph: '極',
    text: '極光をまといし巨狼。生贄1体を捧げて降臨する。'
  },
  dragon: {
    name: '極光のドラゴン', kind: 'monster', race: 'ドラゴン', lv: 7, atk: 2600, def: 2100, glyph: '龍',
    text: '空を裂いて舞う極光の竜。生贄2体を必要とする。'
  },
  titan: {
    name: '永久凍土のタイタン', kind: 'monster', race: '岩石', lv: 8, atk: 3000, def: 2500, glyph: '凍',
    text: '永久凍土の底から目覚める巨人。生贄2体を必要とする。'
  },
  boost: {
    name: 'ブリザード・ブースト', kind: 'spell', glyph: '風',
    text: '自分モンスター1体のATKをターン終了時まで700アップする。'
  },
  heal: {
    name: 'オーロラ・ヒール', kind: 'spell', glyph: '癒',
    text: '自分のライフポイントを1000回復する。'
  },
  shatter: {
    name: '氷砕き', kind: 'spell', glyph: '砕',
    text: '相手の守備力1500以下のモンスター1体を破壊する。'
  },
  gust: {
    name: '吹雪の突風', kind: 'spell', glyph: '吹',
    text: '相手モンスター1体を手札に戻す。'
  },
  freeze: {
    name: '凍てつく眼差し', kind: 'spell', glyph: '眼',
    text: '相手モンスター1体を表側守備表示にする。'
  }
}

// 20 cards — fixed list, shuffled by the host.
export const DECK = [
  'wolf', 'wolf',
  'sent', 'sent',
  'golem',
  'bear', 'bear',
  'shark',
  'sprite',
  'miko',
  'fenrir',
  'dragon',
  'titan',
  'boost', 'boost',
  'heal', 'heal',
  'shatter',
  'gust',
  'freeze'
]

export const tributeCount = lv => (lv >= 7 ? 2 : lv >= 5 ? 1 : 0)
