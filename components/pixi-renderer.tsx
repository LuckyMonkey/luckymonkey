"use client"

import { useEffect, useRef, useState } from "react"
import * as PIXI from "pixi.js"
import { worldData, type TileData } from "@/lib/world-data"
import { isoToScreen, cellHash, tileKey, TILE_WIDTH, TILE_HEIGHT } from "@/lib/iso"
import { SPRITES, spriteUrl } from "@/lib/asset"
import {
  initialNPCs,
  updateNPCs,
  getRandomNPC,
  MAX_ACTIVE_NPCS,
  NPC_SPAWN_CHANCE,
  type NPC,
  type TileIndex,
} from "@/lib/npc-data"

const TILE = { WATER: 1, VOLCANO: 6, TEMPLE: 7 } as const
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const NPC_STEP_MS = 80
const DRAG_THRESHOLD = 6

export interface View {
  x: number
  y: number
  zoom: number
}

interface PixiRendererProps {
  onSelectNode: (nodeId: string | null) => void
  onMapLoaded: () => void
  onViewChange: (view: View) => void
  isMobile?: boolean
}

const NODE_COLORS: Record<string, number> = {
  monkey: 0x22c55e,
  "banana-cache": 0xfacc15,
  temple: 0x15803d,
  server: 0x4b5563,
  river: 0x0ea5e9,
  router: 0xa855f7,
  firewall: 0xef4444,
  database: 0x3b82f6,
  volcano: 0xdc2626,
  "ai-core": 0x8b5cf6,
  vault: 0x6366f1,
  switch: 0x14b8a6,
  terminal: 0x64748b,
  lizard: 0x84cc16,
}

const DECO_EMOJI: Record<string, string> = {
  tree: "🌴", flower: "🌸", bush: "🌿", crystal: "💎",
  bamboo: "🎋", mushroom: "🍄", lotus: "🪷", rock: "🪨",
}

const EDGE_ISLANDS = [
  { cx: -5, cy: 5, radius: 4 }, { cx: -8, cy: 10, radius: 3 },
  { cx: 45, cy: 5, radius: 4 }, { cx: 48, cy: 12, radius: 3 },
  { cx: -6, cy: 35, radius: 4 }, { cx: -3, cy: 42, radius: 3 },
  { cx: 45, cy: 38, radius: 5 }, { cx: 50, cy: 32, radius: 3 },
  { cx: -12, cy: 20, radius: 3 }, { cx: 55, cy: 22, radius: 3 },
]

function diamond(g: PIXI.Graphics, x: number, y: number) {
  g.moveTo(x, y - TILE_HEIGHT / 2)
  g.lineTo(x + TILE_WIDTH / 2, y)
  g.lineTo(x, y + TILE_HEIGHT / 2)
  g.lineTo(x - TILE_WIDTH / 2, y)
  g.closePath()
}

function pickVariant(list: readonly string[], x: number, y: number) {
  return list[Math.floor(cellHash(x, y) * list.length)]
}

/** Glass grid under every tile plus the floating edge islands - two Graphics, not thousands. */
function drawGlass(tiles: TileData[]) {
  const grid = new PIXI.Graphics()
  for (const { x, y } of tiles) {
    const p = isoToScreen(x, y, 0)
    grid.beginFill(0x00ff88, 0.08); diamond(grid, p.x, p.y); grid.endFill()
    grid.beginFill(0x00ff88, 0.04)
    grid.drawPolygon([p.x - 32, p.y, p.x, p.y + 16, p.x, p.y + 24, p.x - 32, p.y + 8])
    grid.endFill()
    grid.beginFill(0x00ff88, 0.06)
    grid.drawPolygon([p.x + 32, p.y, p.x, p.y + 16, p.x, p.y + 24, p.x + 32, p.y + 8])
    grid.endFill()
  }
  grid.lineStyle(0.5, 0x00ff88, 0.2)
  for (const { x, y } of tiles) {
    const p = isoToScreen(x, y, 0)
    diamond(grid, p.x, p.y)
  }

  const islands = new PIXI.Graphics()
  for (const isl of EDGE_ISLANDS) {
    for (let dx = -isl.radius; dx <= isl.radius; dx++) {
      for (let dy = -isl.radius; dy <= isl.radius; dy++) {
        const dist = Math.hypot(dx, dy)
        if (dist > isl.radius) continue
        const p = isoToScreen(isl.cx + dx, isl.cy + dy, 0)
        const alpha = 0.15 - (dist / isl.radius) * 0.1
        islands.lineStyle(0.5, 0x00ffcc, alpha * 2)
        islands.beginFill(0x00ffcc, alpha)
        diamond(islands, p.x, p.y)
        islands.endFill()
      }
    }
  }
  return [grid, islands]
}

function tileTexture(t: TileData, tex: Record<string, PIXI.Texture>) {
  switch (t.type) {
    case TILE.WATER: return tex[pickVariant(SPRITES.water, t.x, t.y)]
    case TILE.VOLCANO: return tex[pickVariant(SPRITES.lava, t.x, t.y)]
    case TILE.TEMPLE: return tex.temple_tile
    default: return tex[pickVariant(SPRITES.grass, t.x, t.y)]
  }
}

/** Tiles painted back-to-front so raised blocks overlap correctly. */
function drawTiles(tiles: TileData[], tex: Record<string, PIXI.Texture>) {
  const layer = new PIXI.Container()
  const sorted = [...tiles].sort((a, b) => a.x + a.y - (b.x + b.y) || a.height - b.height)
  for (const t of sorted) {
    const p = isoToScreen(t.x, t.y, t.height)
    const top = p.y - t.height * (TILE_HEIGHT / 2)
    if (t.height > 0) {
      const color = t.type === TILE.TEMPLE ? 0xfacc15 : t.type === TILE.VOLCANO ? 0xdc2626 : 0x22c55e
      const h = t.height * (TILE_HEIGHT / 2)
      const sides = new PIXI.Graphics()
      sides.beginFill(color, 0.4)
      sides.drawPolygon([-32, 0, 0, 16, 0, 16 + h, -32, h])
      sides.endFill()
      sides.beginFill(color, 0.6)
      sides.drawPolygon([32, 0, 0, 16, 0, 16 + h, 32, h])
      sides.endFill()
      sides.position.set(p.x, top)
      layer.addChild(sides)
    }
    const sprite = new PIXI.Sprite(tileTexture(t, tex))
    sprite.anchor.set(0.5)
    sprite.position.set(p.x, top)
    sprite.width = TILE_WIDTH
    sprite.height = TILE_HEIGHT
    layer.addChild(sprite)
  }
  return layer
}

function drawDecorations(index: TileIndex) {
  const layer = new PIXI.Container()
  const style = new PIXI.TextStyle({ fontSize: 18 })
  for (const { type, position } of worldData.decorations) {
    if (!index.has(tileKey(position.x, position.y))) continue
    const h = position.height || 0
    const p = isoToScreen(position.x, position.y, h)
    const text = new PIXI.Text(DECO_EMOJI[type] || "🌱", style)
    text.anchor.set(0.5, 1)
    text.position.set(p.x, p.y - h * (TILE_HEIGHT / 2) - 5)
    layer.addChild(text)
  }
  return layer
}

function npcSprite(npc: NPC) {
  const text = new PIXI.Text(npc.emoji, { fontSize: 26 })
  text.anchor.set(0.5)
  return text
}

function placeNpc(sprite: PIXI.Text, npc: NPC, now: number) {
  const p = isoToScreen(npc.x, npc.y, npc.height)
  sprite.x = p.x
  sprite.y = p.y - npc.height * (TILE_HEIGHT / 2) - 10
  if (npc.type === "banana") sprite.y += Math.sin(now * 0.01) * 5
  if (npc.type === "ghost") {
    sprite.y += Math.sin(now * 0.003) * 4
    sprite.alpha = 0.7 + Math.sin(now * 0.002) * 0.3
  }
}

export default function PixiRenderer({ onSelectNode, onMapLoaded, onViewChange, isMobile = false }: PixiRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(isMobile ? 0.6 : 1)
  // Handlers are called from Pixi/DOM listeners set up once; keep the latest props in a ref.
  const cb = useRef({ onSelectNode, onMapLoaded, onViewChange })
  cb.current = { onSelectNode, onMapLoaded, onViewChange }
  const zoomBy = useRef<(factor: number, cx?: number, cy?: number) => void>(() => {})

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false

    const app = new PIXI.Application({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: "high-performance",
    })
    const canvas = app.view as HTMLCanvasElement
    canvas.style.touchAction = "none"
    host.appendChild(canvas)

    const world = new PIXI.Container()
    app.stage.addChild(world)
    const tiles = [...new Map(worldData.chunks.flatMap((c) => c.tiles).map((t) => [tileKey(t.x, t.y), t])).values()]
    const index: TileIndex = new Map(tiles.map((t) => [tileKey(t.x, t.y), t.type]))

    // Open centred on the middle of the map, a little further out on phones.
    const pts = tiles.map((t) => isoToScreen(t.x, t.y, t.height))
    const midX = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2
    const midY = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2
    const startZoom = isMobile ? 0.6 : 1
    const view: View = { x: -midX * startZoom, y: -midY * startZoom, zoom: startZoom }

    const applyView = () => {
      world.position.set(app.screen.width / 2 + view.x, app.screen.height / 2 + view.y)
      world.scale.set(view.zoom)
      cb.current.onViewChange({ ...view })
    }
    applyView()
    app.renderer.on("resize", applyView)

    // Zoom about a screen point, so the spot under the cursor/fingers stays put.
    zoomBy.current = (factor, cx = app.screen.width / 2, cy = app.screen.height / 2) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * factor))
      const k = next / view.zoom
      const ox = cx - app.screen.width / 2
      const oy = cy - app.screen.height / 2
      view.x = ox - (ox - view.x) * k
      view.y = oy - (oy - view.y) * k
      view.zoom = next
      setZoom(next)
      applyView()
    }

    // --- Pointer input: one finger/mouse pans, two fingers pinch-zoom. ---
    const pointers = new Map<number, { x: number; y: number }>()
    let moved = 0
    let pinchDist = 0

    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic or already-released pointer */
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) moved = 0
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const cur = { x: e.clientX, y: e.clientY }
      pointers.set(e.pointerId, cur)
      if (pointers.size === 1) {
        view.x += cur.x - prev.x
        view.y += cur.y - prev.y
        moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
        applyView()
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const rect = canvas.getBoundingClientRect()
        if (pinchDist > 0) zoomBy.current(d / pinchDist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
        pinchDist = d
        moved = DRAG_THRESHOLD + 1
      }
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinchDist = 0
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      zoomBy.current(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top)
    }
    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)
    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("contextmenu", (e) => e.preventDefault())


    const names = Object.values(SPRITES).flat()
    PIXI.Assets.load(names.map(spriteUrl)).then((loaded: Record<string, PIXI.Texture>) => {
      if (cancelled) return
      const tex = Object.fromEntries(names.map((n) => [n, loaded[spriteUrl(n)]]))

      world.addChild(...drawGlass(tiles), drawTiles(tiles, tex), drawDecorations(index))

      const nodeLayer = new PIXI.Container()
      const labelStyle = new PIXI.TextStyle({ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: 0xffffff })
      for (const node of worldData.nodes) {
        const h = node.position.height || 0
        const p = isoToScreen(node.position.x, node.position.y, h)
        const el = new PIXI.Container()
        el.position.set(p.x, p.y - h * (TILE_HEIGHT / 2))
        const bg = new PIXI.Graphics()
        bg.lineStyle(2, 0x00ff88, 0.8)
        bg.beginFill(NODE_COLORS[node.type] ?? 0x6b7280, 0.9)
        bg.drawRoundedRect(-40, -40, 80, 80, 8)
        bg.endFill()
        const icon = new PIXI.Text(node.emoji, { fontSize: 32 })
        icon.anchor.set(0.5)
        icon.y = -5
        const label = new PIXI.Text(node.name.length > 12 ? node.name.slice(0, 10) + ".." : node.name, labelStyle)
        label.anchor.set(0.5)
        label.y = 28
        el.addChild(bg, icon, label)
        el.eventMode = "static"
        el.cursor = "pointer"
        // A tap selects; a drag that happens to start on a node just pans.
        el.on("pointertap", () => { if (moved <= DRAG_THRESHOLD) cb.current.onSelectNode(node.id) })
        nodeLayer.addChild(el)
      }

      const npcLayer = new PIXI.Container()
      world.addChild(npcLayer, nodeLayer)

      const sprites = new Map<string, PIXI.Text>()
      const spawn = (npc: NPC) => {
        const s = npcSprite(npc)
        sprites.set(npc.id, s)
        npcLayer.addChild(s)
      }
      let npcs: NPC[] = initialNPCs.slice(0, Math.min(12, MAX_ACTIVE_NPCS)).map((n) => ({ ...n, spawnTime: Date.now() }))
      npcs.forEach(spawn)

      let acc = 0
      app.ticker.add(() => {
        acc += app.ticker.deltaMS
        const now = Date.now()
        if (acc >= NPC_STEP_MS) {
          acc = 0
          npcs = updateNPCs(npcs, index).filter((npc) => {
            if (now - npc.spawnTime < npc.lifespan) return true
            sprites.get(npc.id)?.destroy()
            sprites.delete(npc.id)
            return false
          })
          if (npcs.length < MAX_ACTIVE_NPCS && Math.random() < NPC_SPAWN_CHANCE * 2) {
            const npc = getRandomNPC()
            npcs.push(npc)
            spawn(npc)
          }
        }
        for (const npc of npcs) {
          const s = sprites.get(npc.id)
          if (s) placeNpc(s, npc, now)
        }
      })

      setLoading(false)
      cb.current.onMapLoaded()
    })

    return () => {
      cancelled = true
      zoomBy.current = () => {}
      app.destroy(true, { children: true })
    }
  }, [])

  const btn =
    "w-9 h-9 bg-black/80 border border-green-500/50 text-green-400 rounded flex items-center justify-center hover:bg-green-900/60 text-lg"

  return (
    <div ref={hostRef} className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50 font-mono text-center">
          <div>
            <div className="text-2xl mb-2 text-green-400">Generating World</div>
            <div className="text-sm text-green-300">Initializing Lucky Monkey Network...</div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-[900] flex flex-col items-center gap-2">
        <button aria-label="Zoom in" onClick={() => zoomBy.current(1.2)} className={btn}>+</button>
        <div className="text-green-400 text-xs font-mono">{Math.round(zoom * 100)}%</div>
        <button aria-label="Zoom out" onClick={() => zoomBy.current(1 / 1.2)} className={btn}>−</button>
      </div>

      <div className="absolute bottom-2 left-2 z-[900] text-green-400 font-mono text-xs bg-black/70 px-2 py-1 rounded-md border border-green-500/30 pointer-events-none">
        {isMobile ? "Drag to pan · pinch to zoom" : "Drag to pan · scroll to zoom"} · tap nodes to inspect
      </div>
    </div>
  )
}
