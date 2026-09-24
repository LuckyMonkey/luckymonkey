# Lucky Monkey

Isometric jungle-network proof of concept (Next.js 14 + Pixi.js 7), live at
**https://go.fridge.run/luckymonkey** (fridge.run/luckymonkey forwards there).

Started as a v0.dev export; see git history for the original.

## Run it

It has **no dependencies of its own** - it runs on the shared
[fridge-next runtime](../fridge-next-runtime), in its own container.

```sh
sudo fridge-next luckymonkey down      # shut it off (Caddy shows the "resting" page)
sudo fridge-next luckymonkey up        # bring it back
sudo fridge-next luckymonkey build     # after deploying code changes, then restart
```

Local dev on freezer:

```sh
ln -sfn ../fridge-next-runtime/node_modules node_modules
node_modules/.bin/next dev             # http://localhost:3000/luckymonkey
```

`LM_BASE_PATH` overrides the `/luckymonkey` base path.

## Layout

- `app/page.tsx` - welcome screen -> world, cloud layer, node panel
- `components/pixi-renderer.tsx` - the world: tiles, glass grid, nodes, NPCs, pan/pinch/wheel zoom
- `lib/world-data.ts` - seeded world generation (same map every visit)
- `lib/npc-data.ts` - NPC roster and movement
- `art/` - unused source art from the export (not served)
