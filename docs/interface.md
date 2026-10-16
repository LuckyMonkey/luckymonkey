---
title: Lucky Monkey - interface
---

# Interface

The interface is Bevy UI (`bevy_ui`): nodes laid out with flexbox, drawn on top
of the world. Code: `game/src/ui.rs` (welcome, zoom, hint bar, node panel) and
`game/src/ops.rs` (shift HUD, alert list, the panel's alert box).

The look follows the original v0 design: black panels, green monospace text
(DejaVu Sans Mono), thin green borders, Japanese section labels (ステータス Status,
接続 Connections, セキュリティ Security, ファイル Files) for the cyber-jungle mood.

## Screens

- **Welcome** (`Screen::Welcome`): the "LUCKY MONKEY MEDIA / WARNING" gate from
  the original. The progress bar is a 0.9 s boot animation (everything is already
  loaded; it is there for feel). PROCEED or Enter moves to `Screen::Playing`. The
  world is already alive behind it.
- **Playing**: everything else.

## Layout (wide screen)

    ┌─ shift HUD ──────────────┐                        ┌─[+]
    │ 🕘 10:24 SLA 93% ★ 340 🚨2 🔮1                   │ 100%
    │ ▓▓▓▓▓░░░░ (shift progress)│                        └─[−]
    │ 🐒 → DNS Shrine (3s), then 🔑 Rotate the certificate
    └──────────────────────────┘
     ⏳12s 🐘 DDoS stampede · Banana Cache      ┌─ node panel ─────────┐
     in 52s 🔐 forecast · Auth Gate             │ ⛩️ DNS Shrine   ×    │
     (log: last 15 s of events)                 │ INCIDENT · Worm · ⏳31s│
                                                │ symptoms…            │
                                                │ 1 🚧 Quarantine · 2s │
                                                │ 2 …                  │
     [hint bar: keys]                           └──────────────────────┘

- **Shift HUD** (top left): clock, SLA, score, counts, a shift-progress bar
  (turns red under 30% SLA), what the monkey is doing, and START / NEW SHIFT.
- **Alert list** (under it): up to seven rows, incidents first, then by
  shortest countdown. Each row is clickable (select + fly camera there). Rebuilt
  only when `Net.version` changes; the countdown text is updated every frame
  separately (`PanelTtl` components), so rebuilding never happens per frame.
- **Log**: the last five events, shown for 15 s each (all of them when the shift ends).
- **Zoom** (top right): + / − and the zoom percentage.
- **Hint bar** (bottom left): the keys.
- **Node panel**: on the **right** on screens 900 px and wider (the left is the
  HUD), full width at the bottom on narrow screens. Tabs INFO and ASSETS. INFO
  starts with the alert box (or a "Send the monkey here" button), then description,
  live status, connections and security level. ASSETS lists the node's fictional
  files with type icons. The panel is rebuilt when the selection, the tab or
  `Net.version` changes.

## Camera (`view.rs`)

- Pan: drag (mouse, any button), one-finger drag, arrows/WASD (600 px/s).
- Zoom 50%-250%: wheel (zooms about the cursor), pinch (about the midpoint),
  buttons and +/− keys (about the screen centre). Narrow screens start at 60%.
- **Picking:** a click that moved less than 6 px selects the topmost node card
  under the pointer (80×80 box test, highest z wins).
- **Pointer over UI:** any UI element marked `Blocks` that the pointer is over
  stops the press from panning or selecting the map underneath.
- **Follow:** `ViewState.focus` makes the camera glide to a point (Space, alert
  rows, F). It aims 80 px above the node so the panel does not cover it, and is
  cancelled by any drag or keyboard pan.

## Traps found while building it (Bevy 0.20 in Firefox)

These cost real time; they are why some code looks the way it does.

1. **UI box shadows broke the HUD.** When the clouds were UI nodes with
   `BoxShadow` glows, the HUD and panels rendered see-through, and a cloud with a
   *lower* z-index drew over the node panel. Moving the clouds into the world as
   sprites fixed it. **Avoid `BoxShadow` in this project.**
2. **UI background alpha renders much more transparent than set.** A black
   panel at alpha 0.85 looked about 50% transparent. Values are now 0.92-0.995. If
   you want a panel to look 85% opaque, set about 0.96.
3. **Nothing may sit behind the canvas.** With translucent UI, Firefox
   composited the page behind the canvas (and stale frames) into the panels. The
   host page now removes its "Generating World" text once the game starts, the
   canvas has a black background, and the window uses `composite_alpha_mode: Opaque`.
4. **Do not pre-create the WebGL context with `alpha: false`** before Bevy
   starts (a common trick). It made the transparency worse here; it was reverted.
5. **Emoji need the font subset.** Text only renders glyphs present in the
   embedded fonts. A new emoji in code shows as a box until the fonts are
   re-subset (see [Extending](extending.md)).

Next: [Build, deploy and test](build-deploy.md)
