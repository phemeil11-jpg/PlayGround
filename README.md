# PlayGround — 遊戯王 DUEL ARENA

ブラウザで遊べる、カードデュエルゲームのオマージュ作品です。
独自カード・独自ルールで、LP8000の1対1デュエルを楽しめます（ビルド不要の静的サイト）。

## 遊び方

1. `index.html` をブラウザで開く（または静的サーバーで配信する）
2. 手札のカードをクリック → 「召喚」「発動」「セット」を選択
3. メインフェイズでカードを出し、**バトルフェイズ** へ
4. 自分のモンスター → 相手モンスター（相手が空なら相手のLP）をクリックして攻撃
5. 「ターン終了」で相手のターンへ

## ルール（簡略版）

- 勝利条件は相手のLPを0にするか、相手のデッキを尽きさせる
- 通常召喚は1ターンに1体。レベル5・6は1体、レベル7以上は2体のリリースが必要
- 守備セットしたモンスターは裏向きになり、攻撃された時に表になる
- 裏向きモンスターはメインフェイズにクリックで反転召喚（1ターンに1回）
- 魔法は手札から即発動、またはセット。罠はセットして攻撃・召喚時に発動
- セットしたカードは次の自分のターンから発動可能
- 攻撃 vs 守備はDEFと比較。DEFを下回る攻撃は自分がダメージを受ける
- 機械兵エクスは守備モンスターへの攻撃で貫通ダメージ

## 構成

```
index.html      画面
css/style.css   デザイン・レスポンシブ・アニメーション
js/cards.js     カードデータとデッキ
js/game.js      ゲームエンジン・UI・CPU
```

スマートフォン・タブレットのタッチ操作にも対応しています。

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/phemeil11-jpg/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/phemeil11-jpg/PlayGround)

- 🎮 [Open the project](https://omgithub.com/phemeil11-jpg/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=phemeil11-jpg%2FPlayGround).
- 💻 [Explore the source](https://github.com/phemeil11-jpg/PlayGround).
- 🛠️ [Check build runs](https://github.com/phemeil11-jpg/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/phemeil11-jpg/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/phemeil11-jpg).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->
