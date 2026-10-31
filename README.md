# PlayGround

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

## 北極デュエル / Arctic Duel

北極を舞台にした、オンライン対戦の攻守カードデュエルです。画像・アイコン素材は使わず、カードと背景はすべて CSS と DOM で描画しています。

### 起動

静的ファイルのみで動きます。ビルドは不要です。

```bash
python3 -m http.server 3002
```

`http://localhost:3002/` を開くと、自分のルームが自動で作成されます。表示された招待リンクを相手に送ると、同じルームで対戦できます。ホストのタブは開いたままにしてください。

### 操作

- 手札をタップ → 光っているゾーンをタップで召喚・セット・発動
- 自分のモンスターをタップ → 相手モンスターをタップで攻撃
- 相手モンスターがいないときは「直接攻撃」
- メニューからルール、ログ、音、傾き操作、降参、退出
- スマートフォンでは端末を傾けて盤面を軽く動かせます（iOS は許可が必要）

### ルール概要

- 各プレイヤー 4 列 × 2 段（モンスター 4 + 魔法・罠 4）
- ライフ 4000、山札 33 枚、初期手札 5 枚
- 相手のライフを 0 にするか、相手の山札切れで勝利
- 召喚は 1 ターン 1 体、攻撃表示・守備表示、魔法・罠、直接攻撃に対応
