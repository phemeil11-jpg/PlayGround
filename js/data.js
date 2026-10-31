// Card definitions. No images: every card is rendered from this data.
export const CARDS = {
  fox:      { n: "氷晶の子狐",       t: "m", lv: 2, atk: 800,  def: 600,  el: "water", txt: "小さな氷の狐。群れで吹雪を呼び寄せる。" },
  wolf:     { n: "雪原の白狼",       t: "m", lv: 3, atk: 1400, def: 1000, el: "water", txt: "雪原を駆ける白い狼。獲物を決して逃さない。" },
  guardian: { n: "氷河の守護者",     t: "m", lv: 4, atk: 1600, def: 1800, el: "water", txt: "氷河の底で眠る番人。侵入者を凍らせる。" },
  aurora:   { n: "オーロラ・ドラゴン", t: "m", lv: 4, atk: 1800, def: 1200, el: "light", txt: "極光をまとって空を舞う竜。その鱗は七色に輝く。" },
  owl:      { n: "極夜の梟",         t: "m", lv: 3, atk: 1200, def: 1600, el: "dark",  txt: "光の届かない極夜に棲む梟。静かに獲物を狙う。" },
  shell:    { n: "流氷の甲羅獣",     t: "m", lv: 4, atk: 1000, def: 2000, el: "water", txt: "流氷に身を寄せる甲羅獣。その守りは厚い。" },
  spirit:   { n: "吹雪の精霊",       t: "m", lv: 2, atk: 900,  def: 900,  el: "wind",  txt: "吹雪とともに現れる精霊。小さな嵐を起こす。" },
  giant:    { n: "凍てつく巨人",     t: "m", lv: 4, atk: 1900, def: 1500, el: "earth", txt: "凍土を踏みしめる巨人。その一撃は大地を割る。" },
  hawk:     { n: "北風の鷹",         t: "m", lv: 3, atk: 1500, def: 800,  el: "wind",  txt: "北風に乗って舞い降りる鷹。急降下が得意。" },
  serpent:  { n: "氷柱の蛇",         t: "m", lv: 3, atk: 1300, def: 1200, el: "water", txt: "氷柱に姿を変えて獲物を待つ蛇。" },
  bear:     { n: "白熊の戦士",       t: "m", lv: 4, atk: 1700, def: 1400, el: "earth", txt: "厚い毛皮と豪腕を持つ白熊の戦士。" },
  rabbit:   { n: "雪兎",             t: "m", lv: 1, atk: 400,  def: 500,  el: "light", txt: "雪の下に隠れ住む小さな兎。素早い。" },
  miko:     { n: "極光の巫女",       t: "m", lv: 3, atk: 1100, def: 1500, el: "light", txt: "極光を読み、仲間を守る巫女。" },
  fish:     { n: "深海の氷魚",       t: "m", lv: 2, atk: 700,  def: 1000, el: "water", txt: "凍えた海の底を泳ぐ魚。硬い鱗を持つ。" },
  warden:   { n: "凍土の番人",       t: "m", lv: 4, atk: 1500, def: 1900, el: "earth", txt: "凍土の境界を守る番人。容易には退かない。" },

  greed:    { n: "強欲な氷晶",       t: "s", el: "spell", fx: "draw2",   txt: "山札から2枚ドローする。" },
  heal:     { n: "極光の加護",       t: "s", el: "spell", fx: "heal",    txt: "自分のライフを1000回復する。" },
  crush:    { n: "砕氷の一撃",       t: "s", el: "spell", fx: "destroy", txt: "相手モンスター1体を破壊する。対象をタップして発動。" },
  boost:    { n: "猛吹雪の号令",     t: "s", el: "spell", fx: "boost",   txt: "自分のモンスター全員のATKを500上げる。" },
  revive:   { n: "北極の蘇生",       t: "s", el: "spell", fx: "revive",  txt: "自分の墓地のモンスター1体を守備表示で特殊召喚する。空きモンスターゾーンをタップ。" },

  mirror:   { n: "氷鏡の罠",         t: "tr", el: "trap", fx: "mirror", txt: "相手の攻撃を無効にし、攻撃モンスターを破壊する。" },
  wall:     { n: "吹雪の防壁",       t: "tr", el: "trap", fx: "wall",   txt: "相手の攻撃を無効にし、そのターンの攻撃を終了させる。" },
  pit:      { n: "雪崩の落とし穴",   t: "tr", el: "trap", fx: "pit",    txt: "相手がATK1500以上のモンスターを召喚した時、それを破壊する。" }
};

export const DECK_LIST = [
  "fox", "fox",
  "wolf", "wolf",
  "guardian", "guardian",
  "aurora", "aurora",
  "owl",
  "shell",
  "spirit",
  "giant",
  "hawk",
  "serpent",
  "bear",
  "rabbit",
  "miko",
  "fish",
  "warden",

  "greed", "greed",
  "heal", "heal",
  "crush", "crush",
  "boost", "boost",
  "revive",

  "mirror", "mirror",
  "wall", "wall",
  "pit"
];

export function card(cid) {
  return CARDS[cid] || { n: "???", t: "m", lv: 0, atk: 0, def: 0, el: "none", txt: "" };
}

export function isMonster(cid) { return card(cid).t === "m"; }
export function isSpell(cid) { return card(cid).t === "s"; }
export function isTrap(cid) { return card(cid).t === "tr"; }
