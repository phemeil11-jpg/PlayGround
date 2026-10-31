'use strict';

/* ============================================================
   遊戯王 DUEL ARENA — card database
   ============================================================ */

const CARD_DB = {
  bwd:   { id:'bwd',   name:'青眼の白龍', en:'Blue-Eyes White Dragon', kind:'monster', level:8, attr:'光', race:'ドラゴン', atk:3000, def:2500, tribute:2, art:'dragon',  hue:205, text:'高い攻撃力を誇る伝説のドラゴン。その咆哮は世界を震わせる。' },
  red:   { id:'red',   name:'真紅眼の黒竜', en:'Red-Eyes Black Dragon', kind:'monster', level:7, attr:'闇', race:'ドラゴン', atk:2400, def:2000, tribute:2, art:'dragon',  hue:352, text:'真紅の瞳を持つ黒竜。灼熱のブレスで全てを焼き払う。' },
  dm:    { id:'dm',    name:'ブラック・マジシャン', en:'Dark Magician', kind:'monster', level:7, attr:'闇', race:'魔法使い', atk:2500, def:2100, tribute:2, art:'mage', hue:272, text:'闇の魔術を極めた最高の魔法使い。その魔力は計り知れない。' },
  skull: { id:'skull', name:'デーモンの召喚', en:'Summoned Skull', kind:'monster', level:6, attr:'闇', race:'悪魔', atk:2500, def:1200, tribute:1, art:'demon', hue:288, text:'闇の力で召喚された悪魔。稲妻を操り、敵を焼き尽くす。' },
  cyber: { id:'cyber', name:'サイバー・ドラゴン', en:'Cyber Dragon', kind:'monster', level:5, attr:'光', race:'機械', atk:2100, def:1600, tribute:1, art:'machine', hue:190, text:'未来の技術で生まれた機械竜。光の牙が敵を貫く。' },
  vorse: { id:'vorse', name:'ブラッド・ヴォルス', en:'Vorse Raider', kind:'monster', level:4, attr:'闇', race:'戦士', atk:1900, def:1200, tribute:0, art:'warrior', hue:345, text:'血に飢えた戦士。戦場に響く叫び声が勝利を呼び込む。' },
  jerry: { id:'jerry', name:'ジェリービーンズマン', en:'Jerry Beans Man', kind:'monster', level:4, attr:'地', race:'植物', atk:1750, def:0, tribute:0, art:'beast', hue:105, text:'意外なほど強い。豆のくせにやる男。' },
  mino:  { id:'mino',  name:'ミノタウルス', en:'Minotaur', kind:'monster', level:4, attr:'地', race:'獣戦士', atk:1700, def:1000, tribute:0, art:'beast', hue:24, text:'迷宮を守る牛頭の戦士。斧の一振りは岩をも砕く。' },
  elf:   { id:'elf',   name:'エルフの剣士', en:'Celtic Guardian', kind:'monster', level:4, attr:'地', race:'戦士', atk:1400, def:1200, tribute:0, art:'warrior', hue:140, text:'剣術を極めたエルフの戦士。森の平和を守る。' },
  rock:  { id:'rock',  name:'岩石の巨兵', en:'Giant Soldier of Stone', kind:'monster', level:4, attr:'地', race:'岩石', atk:1300, def:2000, tribute:0, art:'rock', hue:32, text:'動く岩の巨人。その巨体が壁となり、味方を守る。' },
  harpy: { id:'harpy', name:'ハーピィ・レディ', en:'Harpie Lady', kind:'monster', level:4, attr:'風', race:'鳥獣', atk:1300, def:1400, tribute:0, art:'harpy', hue:318, text:'美しい翼を持つ鳥女。舞い降りる爪は鋭い。' },

  pot:   { id:'pot',   name:'強欲な壺', en:'Pot of Greed', kind:'spell', type:'NORMAL', hue:42, symbol:'壺', art:'spell', text:'デッキからカードを2枚ドローする。' },
  hole:  { id:'hole',  name:'ブラックホール', en:'Dark Hole', kind:'spell', type:'NORMAL', hue:265, symbol:'虚', art:'spell', text:'フィールド上のモンスターを全て破壊する。' },
  bolt:  { id:'bolt',  name:'サンダー・ボルト', en:'Raigeki', kind:'spell', type:'NORMAL', hue:52, symbol:'雷', art:'spell', text:'相手フィールド上のモンスターを全て破壊する。' },
  storm: { id:'storm', name:'大嵐', en:'Heavy Storm', kind:'spell', type:'NORMAL', hue:198, symbol:'嵐', art:'spell', text:'フィールド上の魔法・罠カードを全て破壊する。' },
  cyclon:{ id:'cyclon',name:'サイクロン', en:'Mystical Space Typhoon', kind:'spell', type:'QUICK', hue:158, symbol:'旋', art:'spell', text:'相手の魔法・罠カード1枚を破壊する。' },
  reborn:{ id:'reborn',name:'死者蘇生', en:'Monster Reborn', kind:'spell', type:'NORMAL', hue:46, symbol:'生', art:'spell', text:'自分の墓地からモンスター1体を攻撃表示で特殊召喚する。' },
  axe:   { id:'axe',   name:'デーモンの斧', en:'Axe of Despair', kind:'spell', type:'EQUIP', hue:12, symbol:'斧', art:'spell', text:'自分のモンスター1体の攻撃力を1000ポイントアップする。' },

  mirror:{ id:'mirror',name:'聖なるバリア -ミラーフォース-', en:'Mirror Force', kind:'trap', type:'NORMAL', hue:44, symbol:'鏡', art:'trap', text:'相手モンスターの攻撃宣言時に発動。相手の攻撃表示モンスターを全て破壊する。' },
  cylind:{ id:'cylind',name:'魔法の筒', en:'Magic Cylinder', kind:'trap', type:'NORMAL', hue:276, symbol:'筒', art:'trap', text:'相手の攻撃を無効にし、そのモンスターの攻撃力分のダメージを相手に与える。' },
  blast: { id:'blast', name:'炸裂装甲', en:'Sakuretsu Armor', kind:'trap', type:'NORMAL', hue:352, symbol:'鎧', art:'trap', text:'相手モンスターの攻撃宣言時に発動。攻撃モンスター1体を破壊する。' },
  pit:   { id:'pit',   name:'落とし穴', en:'Trap Hole', kind:'trap', type:'NORMAL', hue:195, symbol:'穴', art:'trap', text:'相手が攻撃力1000以上のモンスターを召喚した時に発動。そのモンスターを破壊する。' }
};

const DECK_IDS = [
  'vorse','vorse','jerry','jerry','mino','mino','elf','elf','rock','rock','harpy',
  'cyber','cyber','skull','dm','bwd','red',
  'pot','pot','hole','bolt','storm','cyclon','reborn','axe',
  'mirror','mirror','cylind','blast','pit'
];
