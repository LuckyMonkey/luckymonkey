# Lucky Monkey

Isometric jungle-network game, live at **https://go.fridge.run/luckymonkey**
(fridge.run/luckymonkey forwards there). It runs on **fridge**.

The game is a [Bevy](https://bevyengine.org) 0.20 app (Rust → WebAssembly) in
`game/`. Next.js 14 on the shared [fridge-next runtime](:git:next-runtime:start)
only serves the page that hosts its canvas (`app/page.tsx`) and the built
`public/game/` files. Pixi.js (v0.2) is in git history.

**Full documentation: [docs/index.md](docs/index.md)** (also in the wiki under
`git:luckymonkey`): how to play, every failure type, the engine, the world, the
simulation, the interface, build/deploy/test, outside assets and licences,
decisions and known issues, and how to extend it.

## Build and deploy

```sh
tools/deploy.sh          # export world, bake textures, build wasm on fridge, deploy, restart
tools/deploy.sh build    # build only
```

Freezer doesn't have enough free disk for a Bevy build, so `deploy.sh` rsyncs the
repo to `fridge:~/build/luckymonkey` and builds there as user `fridge`
(rustup toolchain + `wasm32-unknown-unknown` + `wasm-bindgen-cli` 0.2.129 in
`~fridge/.cargo`). The wasm-bindgen CLI version must match the `wasm-bindgen`
crate in `game/Cargo.lock`.

Container control: `sudo fridge-next luckymonkey up|down|restart|build|logs`.

## Gameplay: on-call shifts

You are the on-call monkey 🐒. Nodes are wired by their API connections, with
data frames streaming along every link (and down both rivers). Press **Enter**
to start a shift, 09:00 to 17:00 on the clock (8 minutes); survive it with SLA
left to win.

- **Incidents** (🚨, reactive) break a node now and carry a TTL countdown. When
  it runs out the node goes down; worms crawl to a neighbour, stampedes spill over.
- **Forecasts** (🔮, proactive) come from the Canopy Watchtower: a cert
  expiring, a deploy scheduled, a disk filling, a worm signature. Act before the
  countdown and it never happens. If the Watchtower is down you fly blind.
- Every fix takes time and is done where the monkey stands. Pick a fix on any node
  (click it or press 1-4) and the monkey walks the links there, routing around
  down nodes (or hiking overland, slowly, when there's no route), then works.
- Wrong fixes cost SLA and time. Down and degraded nodes drain the SLA.

Keys: **Space** most urgent alert · **1-4** fix · **G** send the monkey · **F** find the monkey · **Esc** close.

| Incident | Fix | Forecast (prevent with) |
|---|---|---|
| 🐘 DDoS stampede | Rate-limit at the firewall | |
| 🐛 Worm | Quarantine the node | 🧬 worm signature: Patch |
| ⚖️ Replica disparity (data stores) | Resync replicas from primary | |
| 📦 Bad deploy, no schema change | Roll back | 📅 deploy scheduled: Canary |
| 📦 Bad deploy + migration | Fall forward (hotfix) | 📅 deploy scheduled: Canary |
| ⚡ Lightning strike (storm clouds) | Fail over to standby | |
| 🔐 Expired certificate | Rotate the certificate | 🔐 expiring: Rotate |
| 🍌 Memory leak | Restart the service | |
| 💾 Disk full (data stores) | Clean up old snapshots | 💾 filling: Clean up |

## Layout

- `game/src/world.rs` - terrain (one mesh per iso row, so depth sorting is exact), decorations, edge islands, node cards
- `game/src/ops.rs` - the game: on-call shifts (see below)
- `game/src/water.rs` - waterfall streams, lagoon bubbles, river glints
- `game/src/npc.rs` - critters; logic ticks every 80 ms, sprites glide and stand on the terrain
- `game/src/clouds.rs` - clouds drift on one wind across the map and wrap; ground shadows, rain, lightning
- `game/src/view.rs` - camera pan/zoom (mouse, wheel, touch pinch, arrows/WASD, +/-), node picking
- `game/src/ui.rs` - welcome gate, zoom HUD, hint bar, node panel (Esc closes)
- `game/assets/` - generated: `world.json`/`npcs.json` (by `tools/export-world.cjs` from
  `lib/world-data.ts` + `lib/npc-data.ts`), `tiles.png`/`card*.png`
  (by `tools/make-textures.py` from `public/sprites/`). Everything is compiled into the wasm.
- `art/` - unused source art from the original export (not served)

Fonts: DejaVu Sans Mono (Bitstream Vera licence), Noto Sans Mono CJK JP subset
(SIL Open Font License 1.1) and Twemoji Mozilla (graphics CC-BY 4.0,
© Twitter / X Corp. and contributors; font MPL/Apache). Details and every other
outside dependency: [docs/assets.md](docs/assets.md).

Tools: `tools/browser-test.sh` (headless Firefox playthrough with screenshots),
`tools/subset-fonts.py` (re-subset fonts after adding emoji or text).
