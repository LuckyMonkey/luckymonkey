"use client"

import { memo } from "react"

interface IsometricPlantProps {
  type: string
  screenX: number
  screenY: number
  height: number
}

// Using React.memo to prevent unnecessary re-renders
export const IsometricPlant = memo(function IsometricPlant({ type, screenX, screenY, height }: IsometricPlantProps) {
  // Get plant style based on type
  const getPlantStyle = () => {
    switch (type) {
      case "tree":
        return {
          width: 40,
          height: 60,
          emoji: "🌴",
          zOffset: -40,
        }
      case "pine":
        return {
          width: 40,
          height: 60,
          emoji: "🌲",
          zOffset: -40,
        }
      case "palm":
        return {
          width: 40,
          height: 60,
          emoji: "🌴",
          zOffset: -40,
        }
      case "flower":
        return {
          width: 24,
          height: 32,
          emoji: "🌸",
          zOffset: -24,
        }
      case "rose":
        return {
          width: 24,
          height: 32,
          emoji: "🌹",
          zOffset: -24,
        }
      case "tulip":
        return {
          width: 24,
          height: 32,
          emoji: "🌷",
          zOffset: -24,
        }
      case "sunflower":
        return {
          width: 24,
          height: 32,
          emoji: "🌻",
          zOffset: -24,
        }
      case "bush":
        return {
          width: 32,
          height: 32,
          emoji: "🌿",
          zOffset: -24,
        }
      case "bamboo":
        return {
          width: 24,
          height: 48,
          emoji: "🎋",
          zOffset: -36,
        }
      case "crystal":
        return {
          width: 24,
          height: 32,
          emoji: "💎",
          zOffset: -24,
        }
      case "mushroom":
        return {
          width: 24,
          height: 32,
          emoji: "🍄",
          zOffset: -24,
        }
      case "lotus":
        return {
          width: 24,
          height: 24,
          emoji: "🪷",
          zOffset: -16,
        }
      default:
        return {
          width: 24,
          height: 32,
          emoji: "🌱",
          zOffset: -24,
        }
    }
  }

  const style = getPlantStyle()

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${screenX - style.width / 2 + 32}px`,
        top: `${screenY - style.height + style.zOffset}px`,
        zIndex: Number.isFinite(screenY) ? Math.floor(screenY) + 50 : 50,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: `${style.width}px`,
          height: `${style.height}px`,
        }}
      >
        <span className="text-2xl">{style.emoji}</span>
      </div>
    </div>
  )
})
