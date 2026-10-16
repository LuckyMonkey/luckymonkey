---
title: Lucky Monkey source code
---

# Source code

The whole game, readable in the wiki. Each Rust file has a heading for every function, struct and impl, so the articles link straight to the lines they talk about. Generated from the code by `tools/wiki-source.py` (last: 609ba07 2026-10-15). Back to the [documentation](../index.md).

**Where to start reading:** [main.rs](main.md) (how the app is put together), then [ops.rs](ops.md) (the game), starting at [the plugin](ops.md#fn_plugin) and [fn clock](ops.md#fn_clock).

## The game (Rust, compiled to WebAssembly)

| File | What it does | Size |
|---|---|---|
| [game/src/main.rs](main.md) | App setup: the window and canvas, shared fonts and textures (`Art`), procedural textures, the random generator, screens. | 8 functions, 24 items |
| [game/src/link.rs](link.md) | Deep links: reads the URL hash (`#node=…&incident=…`) so a link can open the game at a place with something staged. | 3 functions, 5 items |
| [game/src/world.rs](world.md) | The map: loading world.json, the pyramid and bank fixes, the terrain meshes, edge islands, the void, decorations, node cards. | 17 functions, 45 items |
| [game/src/water.rs](water.md) | Living water: waterfall streams, lagoon bubbles, glints, and data frames floating down the rivers. | 4 functions, 14 items |
| [game/src/npc.rs](npc.md) | Wandering critters: monkeys, ghosts, bananas, lizards, crocodiles. | 5 functions, 21 items |
| [game/src/clouds.rs](clouds.md) | Clouds drawn like the original divs; rain; storms that flash and send lightning strikes. | 8 functions, 21 items |
| [game/src/view.rs](view.md) | The camera: pan, zoom, touch, picking nodes, following, deep-link zoom. | 11 functions, 21 items |
| [game/src/ui.rs](ui.md) | Welcome screen, zoom buttons, hint bar, the node panel. | 18 functions, 38 items |
| [game/src/ops.rs](ops.md) | The game itself: failures and fixes, the network model, the shift clock, the monkey, routing, alerts, the HUD. | 38 functions, 88 items |

## Around it: data, build, hosting

| File | What it is |
|---|---|
| [game/Cargo.toml](cargo-toml.md) | The Rust crate: Bevy features, dependencies, the size-optimised release profile. |
| [tools/deploy.sh](deploy-sh.md) | Build on fridge and deploy. |
| [tools/export-world.cjs](export-world.md) | Runs the TypeScript map generators and writes world.json / npcs.json. |
| [tools/make-textures.py](make-textures.md) | Packs the tile sprites into the atlas; draws the node card textures. |
| [tools/subset-fonts.py](subset-fonts.md) | Re-subsets the embedded fonts to the characters in use. |
| [tools/browser-test.sh](browser-test.md) | Plays the game in headless Firefox and saves screenshots. |
| [tools/wiki-source.py](wiki-source.md) | This generator. |
| [app/page.tsx](page-tsx.md) | The host page: one canvas, a loader, and the dynamic import of the game. |
| [compose.yml](compose.md) | The container on the shared fridge-next runtime. |
| [next.config.mjs](next-config.md) | Next.js settings: the /luckymonkey base path. |
| [lib/world-data.ts](world-data.md) | THE MAP SOURCE: nodes, rivers, terrain and decoration generators. |
| [lib/npc-data.ts](npc-data.md) | The critter roster. |
