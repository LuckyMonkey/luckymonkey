---
title: Lucky Monkey - the engine (Bevy)
---

# The engine: Bevy

## What Bevy is

[Bevy](https://bevyengine.org) is a free, open-source game engine written in
[Rust](https://www.rust-lang.org). Lucky Monkey uses **Bevy 0.20.0**. Rust code
is compiled to [WebAssembly](https://webassembly.org) (wasm, a compact binary
format browsers run at near-native speed), and Bevy draws with
[WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
in the browser, via its graphics layer [wgpu](https://wgpu.rs).

Useful references: the [Bevy book and examples](https://bevyengine.org/learn/),
the [API docs for 0.20](https://docs.rs/bevy/0.20.0/bevy/), and the
unofficial [Bevy Cheat Book](https://bevy-cheatbook.github.io) (good
explanations, but check that a page matches 0.20; Bevy changes a lot between versions).

## ECS in five minutes

Bevy is built on **ECS: Entity, Component, System.** Once these click, the code reads easily.

- An **entity** is just an ID: a "thing" in the game (a node card, a cloud, a
  data frame, a button).
- A **component** is a piece of data attached to an entity. `Transform`
  (position), `Sprite` (a picture), `Text2d`, and our own like `Cloud`,
  `LinkFrame`, `Badge(usize)`. An entity is whatever its components make it.
- A **system** is an ordinary Rust function that Bevy runs every frame (or once).
  Its parameters declare what it needs: `Query<(&Cloud, &mut Transform)>`
  means "every entity that has a Cloud and a Transform, let me change the Transform".
- A **resource** is a single global value: `World` (the map), `Net` (network
  state), `Shift`, `Monkey`, `Art` (fonts/textures), `Rng`.
- A **message** (called an *event* in older Bevy) is a one-frame notice from one
  system to another. Used for `ZoomBy` (HUD button → camera) and `Strike`
  (lightning → game).
- **States** switch groups of systems on and off. Lucky Monkey has `Screen::Welcome`
  and `Screen::Playing`.

**Why ECS fits:** the game has thousands of small similar things (about 1,500
data frames, 700 decorations, 400 water effects) each updated by one tiny
system. ECS stores same-shaped data together, so this is fast, and adding a
behaviour means adding a system rather than editing a class hierarchy.

## How the app is assembled (`main.rs`)

```rust
App::new()
    .add_plugins(DefaultPlugins.set(WindowPlugin { /* canvas "#lm-canvas", fit to parent */ }))
    .insert_resource(ClearColor(Color::BLACK))
    .insert_resource(Rng(0x9e37_79b9_7f4a_7c15))
    .init_state::<Screen>()
    .add_systems(PreStartup, load_art)
    .add_plugins((world::plugin, water::plugin, npc::plugin, clouds::plugin,
                  view::plugin, ui::plugin, ops::plugin))
    .run();
```

Each module is a **plugin**: a function that registers its resources and
systems. `main.rs` also defines:

- **`Art`**: handles to every font and texture, shared by all modules.
  `Art::text(bold, size)` returns a font *list*: DejaVu Sans Mono, then the
  Japanese subset, then emoji, so one string can mix all three (Bevy falls back
  glyph by glyph).
- **Procedural textures**, drawn pixel by pixel at start-up so no file is needed:
  `dot` (soft white circle: bubbles, glints, glow), `frame` (a 24×14 data frame
  with a header bar and two payload lines), `pill` and `pill_border` (the cloud body
  and its outline, anti-aliased).
- **`Rng`**: a tiny [xorshift64*](https://en.wikipedia.org/wiki/Xorshift) random
  generator. Why not the `rand` crate: on the web, `rand` needs `getrandom`,
  which needs JavaScript glue and feature flags. The game does not need secure
  randomness, so twelve lines of maths avoid all that. A fixed seed means the same
  sequence each load (fine for now; see [Decisions](decisions.md)).

**Window settings:** `canvas: "#lm-canvas"` attaches to the page's canvas,
`fit_canvas_to_parent` follows its size, `prevent_default_event_handling` stops
the browser scrolling or zooming the page on wheel and touch, and
`composite_alpha_mode: Opaque` tells the browser the canvas has no transparency
(see the UI trap in [Interface](interface.md)).

## Schedules: when each system runs

Bevy runs systems in **schedules**. Start-up ones run once, in order
`PreStartup` → `Startup` → `PostStartup`; then `Update` runs every frame.

| Schedule | Systems | Why there |
|---|---|---|
| PreStartup | `load_art` | Everything else needs fonts and textures |
| Startup | world: terrain, islands, backdrop, decorations, nodes · water: spawn · npc: first critters · clouds: spawn · view: camera · ui: welcome screen · ops: `setup_net` | Build the world once |
| PostStartup | ops: `spawn_overlay` (links, frames, badges, the monkey) | Needs the node cards spawned in Startup to exist so it can attach badges to them |
| OnEnter(Playing) | ui: zoom buttons + hint bar · ops: shift HUD | UI that only exists after the welcome screen |
| Update, always | water animation + river frames · critters (tick, place) · clouds (drift, rain, storm) · ops visuals (links, frames, cards, popups, monkey token) | The world stays alive behind the welcome screen |
| Update, Welcome | ui: progress bar, proceed | |
| Update, Playing | view: mouse, touch, keys, zoom buttons, camera follow · ui: pointer-over-UI, buttons, zoom label, panel · ops (chained, in this order): `controls → walk → work → clock → strikes → hud → alert_list → live_ttls` | Input and game logic |

The ops systems are **chained** so a frame is deterministic: read input, move
the monkey, finish work, advance the clock and spawn trouble, apply lightning,
then draw the HUD from the final state.

## Rendering: how depth works in a 2D isometric game

There is one 2D camera (`Camera2d`, orthographic: no perspective). In 2D, Bevy
sorts what it draws by the **z** of each entity's position: higher z is drawn
later, on top. Getting isometric overlap right is entirely about choosing z.

| z | What |
|---|---|
| −100 | the tiled grid backdrop (the "void") |
| −50 | translucent edge islands |
| x + y (about −10 to 90) | terrain: **one mesh per diagonal row** |
| row + 0.5 / ± small offsets | things standing on a cell: decorations, critters, water effects, river frames |
| 150 | ghosts (float above everything on the ground) |
| 198 / 199 | link lines / link frames |
| 200 + (x+y)/100 | node cards (+ badges as children) |
| 230 | the monkey |
| 250 | score popups |
| 300+ | clouds |

**Why one mesh per diagonal row:** in an isometric view, a cell at grid (x, y)
is in front of everything with a smaller x + y. Putting each row's tiles into one
mesh at z = x + y, and anything standing on that row at z = x + y + 0.5, makes a tall
block in front correctly hide a critter behind it. Per-tile sprites would work
too, but 1,700 tiles as ~90 meshes is far cheaper to draw. See [The world](world.md).

The **UI** (HUD, panels, buttons) is a separate system, `bevy_ui`, drawn in its
own pass after the world, using a flexbox layout engine ([Taffy](https://github.com/DioxusLabs/taffy)).

## Bevy 0.20 specifics worth knowing

- `Button` is deprecated in 0.20 in favour of picking + `ui_widgets`. The code
  attaches `Interaction::default()` to clickable nodes instead and reads
  `Changed<Interaction>`. That is why `ui.rs` and `ops.rs` start with
  `#![allow(deprecated)]`. Migration is on the [roadmap](decisions.md).
- `Single<...>` is a query that expects exactly one match (the camera, the HUD).
- Messages are registered with `add_message::<T>()` and used through
  `MessageWriter` / `MessageReader`.
- Fonts are `FontSource::List` for fallback chains; sizes are `FontSize::Px`.
- Only the Bevy features the game needs are compiled in (see `game/Cargo.toml`):
  2D, UI, PNG, mouse/touch/keyboard, WebGL2, default font. Dropping 3D, audio
  and the rest keeps the wasm smaller and compiles faster.

Next: [The world](world.md)
