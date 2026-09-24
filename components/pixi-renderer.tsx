"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import * as PIXI from "pixi.js"
import { worldData } from "@/lib/world-data"
import { isoToScreen } from "@/lib/iso-helpers"
import { initialNPCs, updateNPCs, type NPC, MAX_ACTIVE_NPCS, NPC_SPAWN_CHANCE, getRandomNPC } from "@/lib/npc-data"

const TILE_WIDTH = 64
const TILE_HEIGHT = 32

const TILE_TYPES = {
  GRASS: 0,
  WATER: 1,
  SAND: 2,
  PATH: 3,
  PLATFORM: 4,
  CONNECTION: 5,
  VOLCANO: 6,
  TEMPLE: 7,
}

interface PixiRendererProps {
  onSelectNode: (nodeId: string | null) => void
  onMapLoaded: () => void
  onPositionChange: (offset: { x: number; y: number }) => void
  isMobile?: boolean
}

export function PixiRenderer({ onSelectNode, onMapLoaded, onPositionChange, isMobile = false }: PixiRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const worldContainerRef = useRef<PIXI.Container | null>(null)
  const spritesRef = useRef<{ [key: string]: PIXI.Texture }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Zoom state
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 2
  
  // Track pan offset separately from world container position
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  
  const activeNPCsRef = useRef<NPC[]>([])
  const npcContainerRef = useRef<PIXI.Container | null>(null)
  const npcSpritesMapRef = useRef<Map<string, PIXI.Container>>(new Map())
  const validTilesRef = useRef<{ x: number; y: number; type: number }[]>([])
  const lastUpdateTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const tileGridRef = useRef<Map<string, boolean>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      antialias: true,
      resolution: 2,
      autoDensity: true,
      powerPreference: "high-performance",
    })

    if (containerRef.current && app.view) {
      containerRef.current.appendChild(app.view as HTMLCanvasElement)
    }

    appRef.current = app

    const worldContainer = new PIXI.Container()
    worldContainer.position.set(window.innerWidth / 2, window.innerHeight / 2)
    app.stage.addChild(worldContainer)
    worldContainerRef.current = worldContainer

    validTilesRef.current = worldData.chunks.flatMap((chunk) =>
      chunk.tiles.map((tile) => ({ x: tile.x, y: tile.y, type: tile.type })),
    )

    // Load sprites
    Promise.all([
      PIXI.Assets.load("/sprites/grass1.png"),
      PIXI.Assets.load("/sprites/grass2.png"),
      PIXI.Assets.load("/sprites/grass3.png"),
      PIXI.Assets.load("/sprites/grass4.png"),
      PIXI.Assets.load("/sprites/water.png"),
      PIXI.Assets.load("/sprites/water1.png"),
      PIXI.Assets.load("/sprites/water3.png"),
      PIXI.Assets.load("/sprites/water4.png"),
      PIXI.Assets.load("/sprites/water5.png"),
      PIXI.Assets.load("/sprites/lava1.png"),
      PIXI.Assets.load("/sprites/lava2.png"),
      PIXI.Assets.load("/sprites/lava3.png"),
      PIXI.Assets.load("/sprites/lava4.png"),
      PIXI.Assets.load("/sprites/lava_tile.png"),
      PIXI.Assets.load("/sprites/temple_tile.png"),
    ]).then(([g1, g2, g3, g4, w, w1, w3, w4, w5, l1, l2, l3, l4, lava, temple]) => {
      spritesRef.current = {
        grass1: g1, grass2: g2, grass3: g3, grass4: g4,
        water: w, water1: w1, water3: w3, water4: w4, water5: w5,
        lava1: l1, lava2: l2, lava3: l3, lava4: l4,
        lava, temple,
      }
      renderWorld()
    })

    const handleResize = () => {
      if (appRef.current) {
        appRef.current.renderer.resize(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (appRef.current) {
        appRef.current.destroy(true, true)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const getTileGridKey = (x: number, y: number): string => `${Math.floor(x)},${Math.floor(y)}`

  const renderWorld = async () => {
    if (!appRef.current || !worldContainerRef.current || !spritesRef.current) return

    const worldContainer = worldContainerRef.current
    while (worldContainer.children.length > 0) {
      worldContainer.removeChildAt(0)
    }
    tileGridRef.current.clear()

    // Create containers with proper layering
    const glassGridContainer = new PIXI.Container() // Glass grid underneath tiles
    const glassIslandContainer = new PIXI.Container() // Glass islands on edges
    const tileContainer = new PIXI.Container()
    const decorationContainer = new PIXI.Container()
    const npcContainer = new PIXI.Container()
    const nodeContainer = new PIXI.Container()

    glassGridContainer.zIndex = 0
    glassIslandContainer.zIndex = 1
    tileContainer.zIndex = 2
    decorationContainer.zIndex = 3
    npcContainer.zIndex = 4
    nodeContainer.zIndex = 5

    worldContainer.sortableChildren = true
    worldContainer.addChild(glassGridContainer)
    worldContainer.addChild(glassIslandContainer)
    worldContainer.addChild(tileContainer)
    worldContainer.addChild(decorationContainer)
    worldContainer.addChild(npcContainer)
    worldContainer.addChild(nodeContainer)

    npcContainerRef.current = npcContainer

    // Draw glass grid underneath tiles (3D cube effect)
    const allTilePositions = new Set<string>()
    worldData.chunks.forEach(chunk => {
      chunk.tiles.forEach(tile => {
        allTilePositions.add(`${tile.x},${tile.y}`)
      })
    })

    // Draw glass grid cells for all tile positions
    allTilePositions.forEach(key => {
      const [x, y] = key.split(',').map(Number)
      const screenPos = isoToScreen(x, y, 0)
      
      // Draw glass cube underneath
      const glassCell = new PIXI.Graphics()
      
      // Top face (lighter)
      glassCell.beginFill(0x00ff88, 0.08)
      glassCell.moveTo(0, -TILE_HEIGHT / 2)
      glassCell.lineTo(TILE_WIDTH / 2, 0)
      glassCell.lineTo(0, TILE_HEIGHT / 2)
      glassCell.lineTo(-TILE_WIDTH / 2, 0)
      glassCell.closePath()
      glassCell.endFill()
      
      // Left face (darker)
      glassCell.beginFill(0x00ff88, 0.04)
      glassCell.moveTo(-TILE_WIDTH / 2, 0)
      glassCell.lineTo(0, TILE_HEIGHT / 2)
      glassCell.lineTo(0, TILE_HEIGHT / 2 + 8)
      glassCell.lineTo(-TILE_WIDTH / 2, 8)
      glassCell.closePath()
      glassCell.endFill()
      
      // Right face (medium)
      glassCell.beginFill(0x00ff88, 0.06)
      glassCell.moveTo(TILE_WIDTH / 2, 0)
      glassCell.lineTo(0, TILE_HEIGHT / 2)
      glassCell.lineTo(0, TILE_HEIGHT / 2 + 8)
      glassCell.lineTo(TILE_WIDTH / 2, 8)
      glassCell.closePath()
      glassCell.endFill()
      
      // Grid lines
      glassCell.lineStyle(0.5, 0x00ff88, 0.2)
      glassCell.moveTo(0, -TILE_HEIGHT / 2)
      glassCell.lineTo(TILE_WIDTH / 2, 0)
      glassCell.lineTo(0, TILE_HEIGHT / 2)
      glassCell.lineTo(-TILE_WIDTH / 2, 0)
      glassCell.closePath()
      
      glassCell.x = screenPos.x
      glassCell.y = screenPos.y
      glassGridContainer.addChild(glassCell)
    })

    // Draw glass islands on the edges (opaque floating platforms)
    const edgeIslands = [
      // Top left area
      { cx: -5, cy: 5, radius: 4 },
      { cx: -8, cy: 10, radius: 3 },
      // Top right area  
      { cx: 45, cy: 5, radius: 4 },
      { cx: 48, cy: 12, radius: 3 },
      // Bottom left area
      { cx: -6, cy: 35, radius: 4 },
      { cx: -3, cy: 42, radius: 3 },
      // Bottom right area
      { cx: 45, cy: 38, radius: 5 },
      { cx: 50, cy: 32, radius: 3 },
      // Far edges
      { cx: -12, cy: 20, radius: 3 },
      { cx: 55, cy: 22, radius: 3 },
    ]

    edgeIslands.forEach(island => {
      for (let dx = -island.radius; dx <= island.radius; dx++) {
        for (let dy = -island.radius; dy <= island.radius; dy++) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= island.radius) {
            const x = island.cx + dx
            const y = island.cy + dy
            const screenPos = isoToScreen(x, y, 0)
            
            const glassTile = new PIXI.Graphics()
            const alpha = 0.15 - (dist / island.radius) * 0.1
            
            // Top face
            glassTile.beginFill(0x00ffcc, alpha)
            glassTile.moveTo(0, -TILE_HEIGHT / 2)
            glassTile.lineTo(TILE_WIDTH / 2, 0)
            glassTile.lineTo(0, TILE_HEIGHT / 2)
            glassTile.lineTo(-TILE_WIDTH / 2, 0)
            glassTile.closePath()
            glassTile.endFill()
            
            // Edges
            glassTile.lineStyle(0.5, 0x00ffcc, alpha * 2)
            glassTile.moveTo(0, -TILE_HEIGHT / 2)
            glassTile.lineTo(TILE_WIDTH / 2, 0)
            glassTile.lineTo(0, TILE_HEIGHT / 2)
            glassTile.lineTo(-TILE_WIDTH / 2, 0)
            glassTile.closePath()
            
            glassTile.x = screenPos.x
            glassTile.y = screenPos.y
            glassIslandContainer.addChild(glassTile)
          }
        }
      }
    })

    let renderedChunks = 0
    const totalChunks = worldData.chunks.length
    const batchSize = 5

    for (let batchIndex = 0; batchIndex < Math.ceil(totalChunks / batchSize); batchIndex++) {
      const startIdx = batchIndex * batchSize
      const endIdx = Math.min(startIdx + batchSize, totalChunks)

      for (let i = startIdx; i < endIdx; i++) {
        const chunk = worldData.chunks[i]

        for (const tile of chunk.tiles) {
          const { x, y, type, height } = tile
          const gridKey = getTileGridKey(x, y)
          if (tileGridRef.current.has(gridKey)) continue
          tileGridRef.current.set(gridKey, true)

          const screenPos = isoToScreen(x, y, height)
          let sprite: PIXI.Sprite

          switch (type) {
            case TILE_TYPES.WATER:
              const waterKeys = ["water", "water1", "water3", "water4", "water5"]
              const waterKey = waterKeys[Math.floor(Math.random() * waterKeys.length)]
              sprite = new PIXI.Sprite(spritesRef.current[waterKey])
              break
            case TILE_TYPES.VOLCANO:
              const lavaKeys = ["lava1", "lava2", "lava3", "lava4", "lava"]
              const lavaKey = lavaKeys[Math.floor(Math.random() * lavaKeys.length)]
              sprite = new PIXI.Sprite(spritesRef.current[lavaKey])
              break
            case TILE_TYPES.TEMPLE:
              sprite = new PIXI.Sprite(spritesRef.current.temple)
              break
            default:
              const grassKeys = ["grass1", "grass2", "grass3", "grass4"]
              const grassKey = grassKeys[Math.floor(Math.random() * grassKeys.length)]
              sprite = new PIXI.Sprite(spritesRef.current[grassKey])
              break
          }

          sprite.anchor.set(0.5, 0.5)
          sprite.x = screenPos.x
          sprite.y = screenPos.y - height * (TILE_HEIGHT / 2)
          sprite.width = TILE_WIDTH
          sprite.height = TILE_HEIGHT
          tileContainer.addChild(sprite)
          
          // Draw 3D cube sides for height
          if (height > 0) {
            const cubeGraphics = new PIXI.Graphics()
            const tileColor = type === TILE_TYPES.TEMPLE ? 0xfacc15 : 
                              type === TILE_TYPES.VOLCANO ? 0xdc2626 : 0x22c55e
            
            const cubeHeight = height * (TILE_HEIGHT / 2)
            
            // Left face
            cubeGraphics.beginFill(tileColor, 0.4)
            cubeGraphics.moveTo(-TILE_WIDTH / 2, 0)
            cubeGraphics.lineTo(0, TILE_HEIGHT / 2)
            cubeGraphics.lineTo(0, TILE_HEIGHT / 2 + cubeHeight)
            cubeGraphics.lineTo(-TILE_WIDTH / 2, cubeHeight)
            cubeGraphics.closePath()
            cubeGraphics.endFill()
            
            // Right face
            cubeGraphics.beginFill(tileColor, 0.6)
            cubeGraphics.moveTo(TILE_WIDTH / 2, 0)
            cubeGraphics.lineTo(0, TILE_HEIGHT / 2)
            cubeGraphics.lineTo(0, TILE_HEIGHT / 2 + cubeHeight)
            cubeGraphics.lineTo(TILE_WIDTH / 2, cubeHeight)
            cubeGraphics.closePath()
            cubeGraphics.endFill()
            
            cubeGraphics.x = screenPos.x
            cubeGraphics.y = screenPos.y - height * (TILE_HEIGHT / 2)
            tileContainer.addChild(cubeGraphics)
          }
        }
        renderedChunks++
      }

      setLoadingProgress((renderedChunks / totalChunks) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    // Decorations - only on tiles
    const decoEmojis: Record<string, string> = {
      tree: "🌴", flower: "🌸", bush: "🌿", crystal: "💎",
      bamboo: "🎋", mushroom: "🍄", lotus: "🪷", rock: "🪨",
    }

    for (const decoration of worldData.decorations) {
      const { type, position } = decoration
      const gridKey = getTileGridKey(position.x, position.y)
      if (!tileGridRef.current.has(gridKey)) continue

      const screenPos = isoToScreen(position.x, position.y, position.height || 0)
      const text = new PIXI.Text(decoEmojis[type] || "🌱", {
        fontFamily: "Arial",
        fontSize: 18,
        resolution: 2,
      })
      text.anchor.set(0.5, 1)
      text.x = screenPos.x
      text.y = screenPos.y - (position.height || 0) * (TILE_HEIGHT / 2) - 5
      decorationContainer.addChild(text)
    }

    // Nodes - rendered on top
    for (const node of worldData.nodes) {
      const { position, id, type, emoji, name } = node
      const screenPos = isoToScreen(position.x, position.y, position.height || 0)

      const nodeEl = new PIXI.Container()
      nodeEl.x = screenPos.x
      nodeEl.y = screenPos.y - (position.height || 0) * (TILE_HEIGHT / 2)

      // Node background with border
      const bg = new PIXI.Graphics()
      bg.lineStyle(2, 0x00ff88, 0.8)
      bg.beginFill(getNodeColor(type), 0.9)
      bg.drawRoundedRect(-40, -40, 80, 80, 8)
      bg.endFill()

      const emojiText = new PIXI.Text(emoji, {
        fontFamily: "Arial",
        fontSize: 32,
        fill: 0xffffff,
        resolution: 4,
      })
      emojiText.anchor.set(0.5, 0.5)
      emojiText.y = -5

      // Truncate name for display
      const displayName = name.length > 12 ? name.substring(0, 10) + ".." : name
      const nameText = new PIXI.Text(displayName, {
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: "bold",
        fill: 0xffffff,
        resolution: 4,
      })
      nameText.anchor.set(0.5, 0.5)
      nameText.y = 28

      nodeEl.addChild(bg)
      nodeEl.addChild(emojiText)
      nodeEl.addChild(nameText)

      nodeEl.eventMode = "static"
      nodeEl.cursor = "pointer"
      nodeEl.on("pointerdown", () => onSelectNode(id))

      nodeContainer.addChild(nodeEl)
    }

    // Initialize NPCs - more of them
    const initialActiveNPCs = initialNPCs.slice(0, Math.min(12, MAX_ACTIVE_NPCS)).map((npc) => ({
      ...npc,
      spawnTime: Date.now(),
    }))
    activeNPCsRef.current = initialActiveNPCs

    for (const npc of initialActiveNPCs) {
      createNPCSprite(npc)
    }

    startAnimationLoop()
    setIsLoading(false)
    onMapLoaded()
    onPositionChange({ x: 0, y: 0 })
  }

  const createNPCSprite = (npc: NPC) => {
    if (!npcContainerRef.current) return

    const screenPos = isoToScreen(npc.x, npc.y, npc.height)
    const container = new PIXI.Container()
    container.x = screenPos.x
    container.y = screenPos.y - npc.height * (TILE_HEIGHT / 2) - 10

    const text = new PIXI.Text(npc.emoji, {
      fontFamily: "Arial",
      fontSize: 26,
      resolution: 2,
    })
    text.anchor.set(0.5, 0.5)
    container.addChild(text)

    npcSpritesMapRef.current.set(npc.id, container)
    npcContainerRef.current.addChild(container)
  }

  const updateNPCSprites = () => {
    for (const npc of activeNPCsRef.current) {
      const sprite = npcSpritesMapRef.current.get(npc.id)
      if (sprite) {
        const screenPos = isoToScreen(npc.x, npc.y, npc.height)
        sprite.x = screenPos.x
        sprite.y = screenPos.y - npc.height * (TILE_HEIGHT / 2) - 10

        if (npc.type === "banana") {
          sprite.y += Math.sin(Date.now() * 0.01) * 5
        }
        if (npc.type === "ghost") {
          sprite.y += Math.sin(Date.now() * 0.003) * 4
          sprite.alpha = 0.7 + Math.sin(Date.now() * 0.002) * 0.3
        }
      }
    }
  }

  const startAnimationLoop = () => {
    const updateFrame = (timestamp: number) => {
      const deltaTime = timestamp - lastUpdateTimeRef.current
      if (deltaTime >= 80) {
        const updatedNPCs = updateNPCs(activeNPCsRef.current, validTilesRef.current)
        const now = Date.now()
        
        const filteredNPCs = updatedNPCs.filter((npc) => {
          const age = now - npc.spawnTime
          const shouldKeep = age < npc.lifespan
          if (!shouldKeep) {
            const sprite = npcSpritesMapRef.current.get(npc.id)
            if (sprite && npcContainerRef.current) {
              npcContainerRef.current.removeChild(sprite)
              npcSpritesMapRef.current.delete(npc.id)
            }
          }
          return shouldKeep
        })

        // Spawn new NPCs more frequently
        if (filteredNPCs.length < MAX_ACTIVE_NPCS && Math.random() < NPC_SPAWN_CHANCE * 2) {
          const newNPC = getRandomNPC()
          newNPC.spawnTime = now
          filteredNPCs.push(newNPC)
          createNPCSprite(newNPC)
        }

        activeNPCsRef.current = filteredNPCs
        updateNPCSprites()
        lastUpdateTimeRef.current = timestamp
      }

      animationFrameRef.current = requestAnimationFrame(updateFrame)
    }

    animationFrameRef.current = requestAnimationFrame(updateFrame)
  }

  const getNodeColor = (type: string): number => {
    const colors: Record<string, number> = {
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
    return colors[type] || 0x6b7280
  }

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + delta))
    
    if (worldContainerRef.current) {
      zoomRef.current = newZoom
      worldContainerRef.current.scale.set(newZoom)
      setZoom(newZoom)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 0) {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX - panOffsetRef.current.x,
        y: e.clientY - panOffsetRef.current.y,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && worldContainerRef.current) {
      const newX = e.clientX - dragStartRef.current.x
      const newY = e.clientY - dragStartRef.current.y

      panOffsetRef.current = { x: newX, y: newY }
      worldContainerRef.current.position.x = window.innerWidth / 2 + newX
      worldContainerRef.current.position.y = window.innerHeight / 2 + newY
      onPositionChange({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault()

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = {
        x: touch.clientX - panOffsetRef.current.x,
        y: touch.clientY - panOffsetRef.current.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && worldContainerRef.current && e.touches.length === 1) {
      const touch = e.touches[0]
      const newX = touch.clientX - dragStartRef.current.x
      const newY = touch.clientY - dragStartRef.current.y

      panOffsetRef.current = { x: newX, y: newY }
      worldContainerRef.current.position.x = window.innerWidth / 2 + newX
      worldContainerRef.current.position.y = window.innerHeight / 2 + newY
      onPositionChange({ x: newX, y: newY })
    }
  }

  const handleTouchEnd = () => setIsDragging(false)

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ background: "transparent" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center">
            <div className="text-2xl mb-2 text-green-400 font-mono">Generating World</div>
            <div className="w-64 h-2 bg-green-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="text-sm mt-2 text-green-300 font-mono">Initializing Lucky Monkey Network...</div>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-20 right-4 z-[900] flex flex-col gap-2">
        <button
          onClick={() => {
            const newZoom = Math.min(MAX_ZOOM, zoomRef.current + 0.2)
            zoomRef.current = newZoom
            if (worldContainerRef.current) worldContainerRef.current.scale.set(newZoom)
            setZoom(newZoom)
          }}
          className="w-8 h-8 bg-black/70 border border-green-500/50 text-green-400 rounded flex items-center justify-center hover:bg-green-900/50"
        >
          +
        </button>
        <div className="text-green-400 text-xs text-center font-mono">{Math.round(zoom * 100)}%</div>
        <button
          onClick={() => {
            const newZoom = Math.max(MIN_ZOOM, zoomRef.current - 0.2)
            zoomRef.current = newZoom
            if (worldContainerRef.current) worldContainerRef.current.scale.set(newZoom)
            setZoom(newZoom)
          }}
          className="w-8 h-8 bg-black/70 border border-green-500/50 text-green-400 rounded flex items-center justify-center hover:bg-green-900/50"
        >
          -
        </button>
      </div>

      <div className="absolute bottom-2 left-2 z-[900] text-green-400 font-mono text-xs bg-black/50 px-2 py-1 rounded-md border border-green-500/30">
        {isMobile ? "Drag to pan" : "Drag to pan | Scroll to zoom"} | Click nodes to inspect
      </div>
    </div>
  )
}

export default function IsometricWorld(props: PixiRendererProps) {
  return <PixiRenderer {...props} />
}
