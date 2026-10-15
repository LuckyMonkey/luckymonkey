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

## Layout

- `game/src/world.rs` - terrain (one mesh per iso row, so depth sorting is exact), decorations, edge islands, node cards
- `game/src/npc.rs` - critters; logic ticks every 80 ms, sprites glide and stand on the terrain
- `game/src/clouds.rs` - clouds drift on one wind across the map and wrap; ground shadows, rain, lightning
- `game/src/view.rs` - camera pan/zoom (mouse, wheel, touch pinch, arrows/WASD, +/-), node picking
- `game/src/ui.rs` - welcome gate, zoom HUD, hint bar, node panel (Esc closes)
- `game/assets/` - generated: `world.json`/`npcs.json` (by `tools/export-world.cjs` from
  `lib/world-data.ts` + `lib/npc-data.ts`), `tiles.png`/`card*.png`/`cloud.png`
  (by `tools/make-textures.py` from `public/sprites/`). Everything is compiled into the wasm.
- `art/` - unused source art from the original export (not served)

Fonts: DejaVu Sans Mono (Bitstream Vera licence) and Twemoji Mozilla
(graphics CC-BY 4.0, © Twitter / X Corp.; font MPL/Apache).
