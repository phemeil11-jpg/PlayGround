# 遊戯王 DUEL LEGENDS

星の海を舞台にした、オリジナルカードのブラウザ・カードデュエル。  
HTML / CSS / JavaScript（ES Modules）だけで動く、ビルド不要の静的ゲームです。

## 遊び方

- 「デュエル開始」で対戦開始。ライフポイント 8000、先攻はあなた。
- 手札のモンスターを召喚／セット。レベル5・6は1体、レベル7以上は2体のリリースが必要。
- 攻撃表示のモンスターを選び、相手モンスターか相手プレイヤーへ攻撃。
- 魔法は発動または伏せてセット。伏せた魔法は次のターン以降に発動可能。
- 罠はセットした次のターン以降、相手の攻撃時に発動を選べる。
- 相手のライフを0にするか、山札を尽きさせれば勝利。

スマートフォンでは横画面・縦画面どちらでも操作できます。カードをタップして行動を選択してください。

## 主な機能

- 全カード描き下ろしのプロシージャル SVG アート
- 召喚・攻撃・破壊・罠発動のアニメーションと WebAudio 効果音
- リリース召喚、表示形式変更、装備魔法、蘇生、破壊、カウンター罠
- 相手 AI（召喚・魔法・罠・バトル・リリース召喚）
- デスクトップ／モバイル対応のレスポンシブ盤面
- デュエルログ、墓地確認、カードプレビュー、サウンド ON/OFF

## ファイル構成

```
index.html      画面の骨格
styles.css      盤面・カード・アニメーション・レスポンシブ
js/main.js      起動
js/engine.js    ルールエンジン（召喚・戦闘・魔法・罠）
js/ai.js        相手 AI
js/cards.js     オリジナルカードとデッキ
js/art.js       カードアート生成（SVG）
js/ui.js        描画・操作・演出・サウンド
```

## 起動

静的サーバーで `index.html` を配信するだけです。このリポジトリでは `./start.sh` で起動できます。

> 本作はファンメイドのオリジナルカードゲームです。既存作品のカード画像・カードデータは使用していません。

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
