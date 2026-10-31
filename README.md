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

# ARCTIC DUEL — 北極決闘

北極を舞台にした、オンライン専用の攻守カードデュエル。4×2のフィールドで、2人が交互にモンスターを召喚・攻撃して相手のLPを削ります。画像素材やアイコンは使わず、文字と漢字の透かしだけで構成しています。

## 遊び方

1. ページを開くと、自分のルームが自動で作成されます。
2. 「招待する」からルームコードまたは招待リンクを相手に共有します。
3. 相手がリンクを開くと、自動でデュエルが始まります。
4. 手札のカードをタップして、召喚・セット・魔法の発動を選びます。
5. 自分のターンに「バトルへ」を押し、相手モンスターか相手プレイヤーをタップして攻撃します。
6. 攻撃が終わったら「ターン終了」で相手にターンを渡します。

相手のLPを0にするか、相手の山札を尽きさせれば勝利です。降参すると相手の勝利になります。デュエル終了後、ホストは「再戦する」で同じメンバーと再開できます。

## ルール

- ライフポイント: 4000
- デッキ: 20枚 / 開始時手札5枚 / 毎ターン1枚ドロー
- 召喚・セット: 1ターンに1回
- Lv5・6は生贄1体、Lv7以上は生贄2体
- 魔法カード: 1ターンに1回
- 攻撃表示同士はATK差、守備表示にはDEFとの差がダメージ
- 相手フィールドが空なら直接攻撃
- 先攻1ターン目はバトル不可
- 山札切れ・LP0・降参で敗北

## 操作

- スマートフォン / タブレットのタッチ操作に対応
- メニューからサウンドのON/OFF、デュエルログ、ルール確認が可能
- 「傾き操作」をONにすると、端末の傾きで盤面がわずかに動きます
- iOSでは傾き操作の初回ON時にモーションアクセスの許可が必要です

## オンライン接続

バックエンドを持たない静的サイトです。公開MQTTブローカー（EMQX / HiveMQ）のWebSocket接続を利用し、ルームコードごとのトピックで対戦状態を同期します。ホストがゲーム状態の権威となり、ゲストの操作を受け取って配信します。

- 招待リンクの `?room=CODE&b=emqx` でルームとブローカーを指定
- 接続できない場合は自動でフォールバックブローカーを試行
- オフライン対戦はありません

## ローカルで動かす

静的ファイルのみで動作します。任意の静的サーバーでリポジトリ直下を配信してください。

```bash
./start.sh
```

`index.html`、`styles.css`、`js/`、`vendor/` が配信対象です。

