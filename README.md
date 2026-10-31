# ARCTIC DUEL — 北極双対戦

A small online-only Yu-Gi-Oh-style ATK/DEF table duel set on an animated arctic
field. Everything is drawn with CSS and canvas — no cards, icons, or image
assets. Japanese-first UI, touch controls for phones/tablets, and optional
device-tilt parallax.

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

## Play

1. Open the site. A personal room is created and joined automatically.
2. Send the room link (`?room=CODE`) or the 6-character code to a friend.
3. Your friend opens the link (or enters the code under **ROOM JOIN**) and the
   duel starts automatically when they connect.
4. Tap a hand card, choose **ATK 表側** or **SET 裏側**, then tap an empty zone
   on your side of the board.
5. Tap your monster to select it; tap an opponent monster (or any opponent zone
   when their field is empty) to attack.
6. Use **表示形式 / POSITION** to switch ATK/DEF, **ターン終了 / END TURN** to
   pass, and double-tap **降参 / SURRENDER** to concede.

The site is online-only. It uses the public EMQX MQTT broker over secure
WebSocket (`wss://broker.emqx.io:8084/mqtt`), and the room host is authoritative
for game state. Room codes are short and not secret — anyone with the code can
spectate/join if the table is free, and messages are not end-to-end encrypted.
Do not send personal or sensitive information in player names.

### Rules in brief

- 4000 LP, 20-card decks, 4-card opening hands, 4 zones per player.
- One summon/set per turn. A monster may attack once per turn, in ATK position.
- ATK vs ATK: higher ATK wins; the difference is dealt as damage. Equal ATK
  destroys both.
- ATK vs DEF (including face-downs, which flip up): higher wins; a defending
  monster that survives deals no damage, and an attacking monster that loses
  deals nothing to the defender.
- Empty opponent field allows a direct attack for the attacker's ATK.
- Win by reducing the opponent to 0 LP, deck-out, or surrender.
- First player cannot attack on turn 1. Rematch swaps who starts.

## Controls

- **Touch / mouse:** tap cards, zones, and buttons.
- **Tilt (optional):** the **TILT** button enables device orientation. On iOS,
  permission is requested from that tap. Tilt moves the background parallax;
  it does not change game state.
- **Sound:** synthesized WebAudio SFX, unlocked by the first tap.
- **Room link:** tap the room code or **LINK** to copy the invite URL.

## Run locally

```bash
PORT=3002 ./start.sh
# http://localhost:3002
```

`start.sh` expects the OMGithub runtime (`RUNTIME_DIR`) used by the hosted
environment. Any static file server works too, because the site is plain
`index.html` + CSS + JS:

```bash
python3 -m http.server 3002
```

Open two different rooms in separate browser profiles (or separate devices) to
test a full duel locally. Tabs in the same browser share `localStorage`, so
their "personal room" will be the same; use `?room=CODE` or a private window for
the second player.

## Files

- `index.html` — board, HUD, lobby, result overlays.
- `styles.css` — arctic scene, card geometry, animations, responsive layout.
- `app.js` — rules engine, host/guest sync, UI, FX, audio, tilt.
- `mqtt.min.js` — vendored MQTT.js browser client (MIT).
