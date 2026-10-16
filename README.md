# Lucky Monkey

Isometric jungle-network game, live at **https://go.fridge.run/luckymonkey**
(fridge.run/luckymonkey forwards there). It runs on **fridge**.

The game is a [Bevy](https://bevyengine.org) 0.20 app (Rust → WebAssembly) in
`game/`. Next.js 14 on the shared [fridge-next runtime](../fridge-next-runtime)
only serves the page that hosts its canvas (`app/page.tsx`) and the built
`public/game/` files. Pixi.js (v0.2) is in git history.

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

Nodes are wired by their API connections (vines with packets). Press **Enter**
to start a shift. Each turn new incidents hit healthy nodes; **Space** jumps to
the oldest alert, **1-4** (or click) applies a fix. Faster fixes score more, wrong
fixes cost SLA and make it worse. Anything unfixed when the turn timer runs out
escalates (degraded -> down), worms crawl to a neighbour, stampedes spill over.
Turns get shorter and busier; the shift ends when the SLA hits 0.

| Incident | Fix |
|---|---|
| 🐘 DDoS stampede | Rate-limit at the firewall |
| 🐛 Worm | Quarantine the node |
| ⚖️ Replica disparity (data stores) | Resync replicas from primary |
| 📦 Bad deploy, no schema change | Roll back |
| 📦 Bad deploy + migration | Fall forward (hotfix) |
| ⚡ Lightning strike (storm clouds) | Fail over to standby |
| 🔐 Expired certificate | Rotate the certificate |
| 🍌 Memory leak | Restart the service |

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

Fonts: DejaVu Sans Mono (Bitstream Vera licence) and Twemoji Mozilla
(graphics CC-BY 4.0, © Twitter / X Corp.; font MPL/Apache).
