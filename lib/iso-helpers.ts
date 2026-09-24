// Convert isometric coordinates to screen coordinates
// Updated for smaller tile size (64x32)
export function isoToScreen(x: number, y: number, height = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { x: 0, y: 0 }
  }
  return {
    x: (x - y) * 32, // Tile width is 64, but we use half for the diamond shape
    y: (x + y) * 16 - (Number.isFinite(height) ? height : 0) * 8, // Tile height is 32, half for the diamond shape
  }
}

// Convert screen coordinates to isometric coordinates
// Updated for smaller tile size (64x32)
export function screenToIso(screenX: number, screenY: number, height = 0) {
  const heightOffset = (Number.isFinite(height) ? height : 0) * 8
  const y = (screenY + heightOffset) / 16 - screenX / 32 / 2
  const x = screenX / 32 + y
  return { x, y }
}

// Check if two nodes are too close to each other
export function areNodesTooClose(node1: { x: number; y: number }, node2: { x: number; y: number }, minDistance = 7) {
  const dx = Math.abs(node1.x - node2.x)
  const dy = Math.abs(node1.y - node2.y)
  return dx < minDistance && dy < minDistance
}

// Check if a node overlaps with a river
export function doesNodeOverlapRiver(
  nodePosition: { x: number; y: number },
  riverPositions: { x: number; y: number }[],
  nodeSize = 2,
) {
  // Create a bounding box for the node
  const nodeMinX = nodePosition.x - nodeSize
  const nodeMaxX = nodePosition.x + nodeSize
  const nodeMinY = nodePosition.y - nodeSize
  const nodeMaxY = nodePosition.y + nodeSize

  // Check if any river tile is within the node's bounding box
  return riverPositions.some(
    (riverPos) => riverPos.x >= nodeMinX && riverPos.x <= nodeMaxX && riverPos.y >= nodeMinY && riverPos.y <= nodeMaxY,
  )
}

// Check if a position is on a valid tile
export function isOnValidTile(
  x: number,
  y: number,
  tiles: { x: number; y: number; type: number }[],
  waterOnly = false,
): boolean {
  return tiles.some((tile) => {
    if (Math.abs(tile.x - x) < 1 && Math.abs(tile.y - y) < 1) {
      if (waterOnly) {
        return tile.type === 1 // Water tile
      }
      return tile.type !== undefined // Any valid tile
    }
    return false
  })
}
