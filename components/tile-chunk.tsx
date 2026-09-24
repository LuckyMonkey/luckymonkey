"use client"

import { memo, useMemo } from "react"
import { IsometricTile } from "@/components/isometric-tile"
import { AnimatedWater } from "@/components/animated-water"
import { isoToScreen } from "@/lib/iso-helpers"

interface TileData {
  x: number
  y: number
  type: number
  height: number
  isWaterfall?: boolean
  isLagoon?: boolean
}

interface TileChunkProps {
  id: string
  center: { x: number; y: number }
  tiles: TileData[]
  viewportPosition: { x: number; y: number }
  viewportSize: { width: number; height: number }
  bufferSize?: number
}

export const TileChunk = memo(function TileChunk({
  id,
  center,
  tiles,
  viewportPosition,
  viewportSize,
  bufferSize = 3,
}: TileChunkProps) {
  // Simple function to check if a tile is visible
  const isTileVisible = (tile: TileData) => {
    const screenPos = isoToScreen(tile.x, tile.y, tile.height)
    const screenX = screenPos.x + viewportPosition.x
    const screenY = screenPos.y + viewportPosition.y

    // Buffer in pixels
    const bufferPixels = bufferSize * 128 // 128px is tile width

    return (
      screenX > -bufferPixels &&
      screenX < viewportSize.width + bufferPixels &&
      screenY > -bufferPixels &&
      screenY < viewportSize.height + bufferPixels
    )
  }

  // Filter tiles to only those visible in the viewport with buffer
  const visibleTiles = useMemo(() => {
    return tiles.filter(isTileVisible)
  }, [tiles, viewportPosition, viewportSize, bufferSize])

  // Memoize tile rendering to prevent unnecessary re-renders
  const waterTiles = useMemo(() => {
    return visibleTiles
      .filter((tile) => tile.type === 1)
      .map((tile) => {
        const screenPos = isoToScreen(tile.x, tile.y, tile.height)
        return (
          <AnimatedWater
            key={`water-${tile.x}-${tile.y}`}
            screenX={screenPos.x}
            screenY={screenPos.y}
            height={tile.height}
            isWaterfall={tile.isWaterfall}
            isLagoon={tile.isLagoon}
          />
        )
      })
  }, [visibleTiles])

  const regularTiles = useMemo(() => {
    return visibleTiles
      .filter((tile) => tile.type !== 1)
      .map((tile) => {
        const screenPos = isoToScreen(tile.x, tile.y, tile.height)
        return (
          <IsometricTile
            key={`tile-${tile.x}-${tile.y}`}
            type={tile.type}
            screenX={screenPos.x}
            screenY={screenPos.y}
            height={tile.height}
          />
        )
      })
  }, [visibleTiles])

  return (
    <>
      {regularTiles}
      {waterTiles}
    </>
  )
})
