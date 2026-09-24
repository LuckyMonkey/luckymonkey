"use client"

import { PixiRenderer } from "@/components/pixi-renderer"

interface IsometricWorldProps {
  onSelectNode: (nodeId: string | null) => void
  onMapLoaded?: () => void
  onPositionChange?: (position: { x: number; y: number }) => void
  isMobile?: boolean
}

export function IsometricWorld({ onSelectNode, onMapLoaded, onPositionChange, isMobile }: IsometricWorldProps) {
  return (
    <PixiRenderer
      onSelectNode={onSelectNode}
      onMapLoaded={onMapLoaded || (() => {})}
      onPositionChange={onPositionChange || (() => {})}
      isMobile={isMobile || false}
    />
  )
}
