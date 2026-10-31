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

## DUEL LEGENDS — 決闘伝説

A self-contained, original browser card duel game inspired by classic monster-card battles. Lead the Light Legion against the Dark Legion, summon monsters, set traps, and reduce your opponent's 8000 LP to zero.

- **Play:** open `index.html` from the project root (or run `python3 -m http.server` and visit the local URL).
- **Controls:** tap/click a hand card, choose an action, then select a highlighted zone. In the battle phase, select your attacker and then a target. `BATTLE` switches phases and `END` passes the turn.
- **Rules:** one normal summon per turn, tributes for level 5+ monsters, attack/defense battles, targeted spells, and face-down traps with reaction windows.
- **Tech:** vanilla ES modules, procedurally generated SVG card art, local fonts, Web Audio sound effects, and responsive layouts for desktop and mobile. No build step or external image requests.
- **Tests:** `node --test tests/engine.test.mjs`
