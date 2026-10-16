---
title: Lucky Monkey - the world
---

# The world

## Data pipeline: TypeScript in, JSON in the wasm

The map is still *defined* in the original TypeScript, `lib/world-data.ts` (and
the critter roster in `lib/npc-data.ts`). Rather than rewriting the generators in
Rust, `tools/export-world.cjs` runs them and writes JSON:

    lib/world-data.ts ──(TypeScript compiler, in memory)──▶ run ──▶ game/assets/world.json
    lib/npc-data.ts   ─────────────────────────────────────────────▶ game/assets/npcs.json

The export uses the TypeScript compiler from the shared fridge-next runtime's
`node_modules` to transpile each file and evaluates it in Node. `world.json` holds:

- `tiles`: every cell `{x, y, type, height}` plus `fall` (waterfall) and `lagoon` flags
- `nodes`: the 28 nodes (id, name, type, IP, emoji, description, position, connections, status, security level, assets)
- `decorations`: trees, flowers, crystals... `{type, position}`
- `streams`: the two river centrelines (main river, Digital River), upstream first

Rust reads them with [serde](https://serde.rs) at start-up from
`include_str!`, which embeds the file in the binary at compile time.

**Why keep TypeScript as the source:** it was the existing, working map with a
seeded generator. Porting it would have risked changing the world for no gain;
the export keeps one source of truth and the generators stay readable.

The world is generated from a **fixed seed (8675309)**, so it is identical every time.

## Isometric maths

Grid coordinates (x, y, height) become screen coordinates with:

    screen_x = (x − y) × 64 / 2
    screen_y = −(x + y) × 32 / 2 + height × 16

(`iso()` in `world.rs`; Bevy's y axis points up, hence the minus.) A tile's top
is a 64×32 diamond; each unit of height lifts it 16 px. A classic explanation:
[Isometric tiles math](https://clintbellanger.net/articles/isometric_math/).

## Tiles and the alignment fix

The tile pictures (`public/sprites/*.png`) are **32×32 isometric blocks**: the
top diamond occupies rows 8-24 and an 8 px side "skirt" hangs below.
`tools/make-textures.py` packs the 15 sprites plus a white cell into one 4×4
texture atlas (`game/assets/tiles.png`), padding each 32 px cell to 34 px by
copying edge pixels outwards. That padding stops neighbouring sprites bleeding
in when the GPU samples at a cell's edge.

They are drawn **at 2×** (64×64), so the diamond lands exactly on the 64×32 grid
cell. **The old Pixi.js version squashed them into 64×32 rectangles**, which
distorted the diamond so tiles never lined up. That was the "tile alignment"
problem the owner disliked.

Tile kinds: 0 grass (4 variants), 1 water (5), 4 platform (grass, tinted),
5 scorched (tinted), 6 volcano/lava (5), 7 temple gold. A per-cell hash
(`cell_hash`) picks the variant, so the choice is stable across reloads.

## Terrain mesh (`spawn_terrain`)

For each diagonal row (x + y) one mesh is built with:

- **Front walls** for the two visible sides of each cell, dropping to the
  neighbour in front, or down to the bottom of the island slab (1 unit below the
  ground) if there is no neighbour. Walls are vertex-coloured by kind (dark
  green, blue, red-brown, gold); the left wall is drawn darker, which reads as light from the right.
- **The top sprite** quad using the atlas.
- Taller tiles are tinted slightly brighter (2.5% per height unit) so terraces read.

## Clean-ups applied when loading (`world::plugin`)

- **Duplicates:** several generators write the same cell. The **tallest** wins,
  so stacked platforms read as solid ground. Water keeps its waterfall/lagoon flags.
- **The pyramid was upside down.** The original generator stacked the temple
  layers with the widest layer highest. The loader rebuilds it as a stepped
  pyramid: height = 6 − (lowest layer covering the cell), so the centre, where the
  Guardian sits, is the summit.
- **River banks.** The river was generated alone and looked like it floated in
  the void. Every water cell gets a full ring of grass around it (at the water's
  height) plus a *ragged* second ring (45% of cells, chosen by hash) so the edge is
  not a ruler line. 22% of new bank cells get a bush, tree, flower, bamboo or rock.
  It deliberately stops there: the owner wants the void visible.

## The rivers

The main river runs from a **waterfall** at the top (x 20, y −5, height 5,
stepping down to 0) south through bends to a delta at y 45. A lagoon (the Logical
Lagoon) joins at (17, 7).

The **Digital River** leaves the small lagoon at (7, 12), runs down the west
edge (x = 1) and bends east into the **Data Lake** at (11, 38). It also includes
the channel from the main river at y = 12. Both rivers are three tiles wide.

## Water effects (`water.rs`)

Restored from the original v0 canvas animation:

- **Waterfall streams:** three white streaks per waterfall tile pour down once a second.
- **Lagoon bubbles:** on 60% of lagoon tiles, two bubbles rise 20 px and pop over
  3 s (the original CSS `bubble` keyframes), wobbling slightly.
- **Glints:** small white flashes on 30% of river tiles, each with its own rhythm.
- **Data frames on the rivers:** frames spaced every 46 px of river length float
  downstream at 38 px/s, bob gently, fade in at the source and out at the mouth.
  Their depth (z) is recomputed every frame from the grid cell they are over, so
  they slip behind banks correctly.

## Decorations

From `world.json` plus the banks. Each is an emoji rendered as text: 🌴 tree,
🌸 flower, 🌿 bush, 💎 crystal, 🎋 bamboo, 🍄 mushroom, 🪷 lotus, 🪨 rock.
Lotus only on water, everything else only on land. A small jitter (by hash)
stops them sitting in a perfect grid.

## Edge islands and the void

Ten faint teal diamond clusters float at the map edges (`EDGE_ISLANDS`),
suggesting more network beyond. Behind everything, `grid_background.png` is tiled
across the whole area at 35% opacity: the "void" between islands.

## Node cards

Each node is an 80×80 rounded card (`card.png`, tinted by node type) with a
green outline (`card_border.png`), its emoji and a name label (cut to 10
characters + ".."). It stands at the node's ground height. Cards also carry the
game's alert badge and countdown (see [Simulation](simulation.md)). Card colour
changes with health: normal, pulsing amber (unstable), dark red-brown (down).

## Critters (`npc.rs`)

A roster of 26 critters (from `npc-data.ts`). Logic ticks every **80 ms** like
the original: each moves one step in one of eight directions, turns around at the
map edge (5..35) or impassable terrain, and sometimes picks a new heading (monkeys
2%, lizards 3%, ghosts/bananas 5%, crocodiles 1% per tick). Lizards and crocodiles
stay on water; bananas go anywhere. Between ticks the sprite glides toward the
logical position, so motion looks smooth. They fade in, live 30/60/90 s, fade out,
with up to 20 at once (new spawn chance 16% per tick). Ghosts bob and pulse
translucent; bananas bounce.

## Clouds (`clouds.rs`)

Ten clouds: fair (☁️), rain (🌧️) and storm (⛈️). They are drawn like the
original HTML divs the owner liked: a translucent rounded **pill** with a 1 px
border and the emoji inside, in three sizes (80×40, 120×55, 160×75).

- They drift on one wind (right and slightly down) at 10-24 px/s and wrap around
  the map edges, so the sky never empties.
- Rain clouds drop five streaks (the original `rain-drop` keyframes).
- Storm clouds flash every 4-9 s: over 0.6 s the pill ramps to yellow, a yellow
  glow swells behind it and ⚡ appears, then it fades. At the peak a `Strike`
  message goes out (see [How to play](gameplay.md), lightning).

**History:** the original divs were replaced in the port by "realistic" textured
clouds with ground shadows. The owner said they lost the charm, so the pill style
came back, first as Bevy UI nodes and then as world sprites, because the UI
version broke the HUD (see [Decisions](decisions.md)).

Next: [The network simulation](simulation.md)
