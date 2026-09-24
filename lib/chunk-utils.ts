import type { ChunkData } from "@/lib/world-data"

// Check if a chunk is visible in the viewport
export function isChunkVisible(
  chunk: ChunkData,
  position: { x: number; y: number },
  viewportSize: { width: number; height: number },
  buffer = 2, // Number of chunks to load beyond viewport
) {
  // Convert chunk center to screen coordinates
  const screenX = (chunk.center.x - chunk.center.y) * 40 // Tile width
  const screenY = (chunk.center.x + chunk.center.y) * 20 // Tile height/2
  const chunkSize = 5 * 40 // Approximate chunk width in pixels

  // Add buffer around viewport
  const bufferSize = buffer * chunkSize

  return (
    screenX + position.x > -bufferSize &&
    screenX + position.x < viewportSize.width + bufferSize &&
    screenY + position.y > -bufferSize &&
    screenY + position.y < viewportSize.height + bufferSize
  )
}

// Sort chunks by priority (lower number = higher priority)
export function sortChunksByPriority(chunks: ChunkData[]): ChunkData[] {
  // First, check if the chunk contains river or node tiles
  const enhancedChunks = chunks.map((chunk) => {
    // Check if chunk contains river tiles
    const hasRiver = chunk.tiles.some((tile) => tile.type === 1)

    // Check if chunk contains node platform tiles
    const hasNodePlatform = chunk.tiles.some((tile) => tile.type === 4 || tile.type === 7)

    // Assign priority based on content
    let priority = chunk.priority
    if (hasRiver) priority -= 5 // Higher priority for river chunks
    if (hasNodePlatform) priority -= 3 // Higher priority for node platform chunks

    return {
      ...chunk,
      enhancedPriority: priority,
    }
  })

  return enhancedChunks.sort((a, b) => a.enhancedPriority - b.enhancedPriority)
}

// Batch chunks for progressive loading with smarter batching
export function batchChunks(chunks: ChunkData[], batchSize = 10): ChunkData[][] {
  const sortedChunks = sortChunksByPriority(chunks)
  const batches: ChunkData[][] = []

  // First batch: river chunks
  const riverChunks = sortedChunks.filter((chunk) => chunk.tiles.some((tile) => tile.type === 1))

  // Second batch: node platform chunks
  const nodePlatformChunks = sortedChunks.filter(
    (chunk) =>
      !chunk.tiles.some((tile) => tile.type === 1) && chunk.tiles.some((tile) => tile.type === 4 || tile.type === 7),
  )

  // Remaining chunks
  const remainingChunks = sortedChunks.filter(
    (chunk) =>
      !chunk.tiles.some((tile) => tile.type === 1) && !chunk.tiles.some((tile) => tile.type === 4 || tile.type === 7),
  )

  // Add river chunks as first batch
  if (riverChunks.length > 0) {
    batches.push(riverChunks)
  }

  // Add node platform chunks as second batch
  if (nodePlatformChunks.length > 0) {
    batches.push(nodePlatformChunks)
  }

  // Add remaining chunks in batches
  for (let i = 0; i < remainingChunks.length; i += batchSize) {
    batches.push(remainingChunks.slice(i, i + batchSize))
  }

  return batches
}
