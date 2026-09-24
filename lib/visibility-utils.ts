import { isoToScreen } from "./iso-helpers"

// Check if a tile is visible in the viewport with a buffer
export function isTileVisible(
  tileX: number,
  tileY: number,
  tileHeight: number,
  viewportPosition: { x: number; y: number },
  viewportSize: { width: number; height: number },
  bufferSize = 3, // Buffer size in tiles
) {
  // Convert tile position to screen coordinates
  const screenPos = isoToScreen(tileX, tileY, tileHeight)

  // Add viewport position
  const screenX = screenPos.x + viewportPosition.x
  const screenY = screenPos.y + viewportPosition.y

  // Calculate buffer in pixels (approximate tile size)
  const bufferPixelsX = bufferSize * 128 // Tile width is 128px
  const bufferPixelsY = bufferSize * 64 // Tile height is 64px

  // Check if the tile is within the viewport + buffer
  return (
    screenX > -bufferPixelsX &&
    screenX < viewportSize.width + bufferPixelsX &&
    screenY > -bufferPixelsY &&
    screenY < viewportSize.height + bufferPixelsY
  )
}

// Check if a chunk is visible in the viewport with a buffer
export function isChunkVisible(
  chunkCenterX: number,
  chunkCenterY: number,
  viewportPosition: { x: number; y: number },
  viewportSize: { width: number; height: number },
  bufferSize = 2, // Buffer size in chunks
) {
  // Convert chunk center to screen coordinates
  const screenPos = isoToScreen(chunkCenterX, chunkCenterY, 0)

  // Add viewport position
  const screenX = screenPos.x + viewportPosition.x
  const screenY = screenPos.y + viewportPosition.y

  // Calculate buffer in pixels (approximate chunk size)
  const chunkSizeX = 5 * 128 // 5 tiles per chunk, 128px per tile
  const chunkSizeY = 5 * 64 // 5 tiles per chunk, 64px per tile
  const bufferPixelsX = bufferSize * chunkSizeX
  const bufferPixelsY = bufferSize * chunkSizeY

  // Check if the chunk is within the viewport + buffer
  return (
    screenX > -bufferPixelsX &&
    screenX < viewportSize.width + bufferPixelsX &&
    screenY > -bufferPixelsY &&
    screenY < viewportSize.height + bufferPixelsY
  )
}
