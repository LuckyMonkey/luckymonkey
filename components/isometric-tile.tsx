"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface IsometricTileProps {
  type: number
  screenX: number
  screenY: number
  height: number
}

// Using React.memo to prevent unnecessary re-renders
export const IsometricTile = memo(function IsometricTile({ type, screenX, screenY, height }: IsometricTileProps) {
  // Determine tile color based on type
  const getTileStyle = () => {
    switch (type) {
      case 0: // Grass
        return "bg-green-700 border border-green-600/70"
      case 1: // Water
        return "bg-cyan-600 border border-cyan-500/70"
      case 2: // Sand/Desert
        return "bg-yellow-700 border border-yellow-600/70"
      case 3: // Path
        return "bg-green-600 border border-green-500/70"
      case 4: // Platform/Elevated
        return "bg-green-500 border border-green-400/70"
      case 5: // Connection point
        return "bg-purple-600 border border-purple-500/70"
      case 6: // Volcano
        return "bg-red-700 border border-orange-500/70"
      case 7: // Golden temple
        return "bg-yellow-500 border border-yellow-400/70"
      default:
        return "bg-green-700 border border-green-600/70"
    }
  }

  // Add lava effects for volcano tiles
  const renderLavaEffects = () => {
    if (type !== 6) return null

    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* Lava glow */}
        <div className="absolute inset-0 bg-orange-500/20 animate-pulse" style={{ animationDuration: "2s" }} />

        {/* Lava particles */}
        <div
          className="absolute w-2 h-2 bg-yellow-300/70 rounded-full animate-ping"
          style={{ top: "30%", left: "40%", animationDuration: "1.5s" }}
        />
        <div
          className="absolute w-1 h-1 bg-orange-400/70 rounded-full animate-ping"
          style={{ top: "60%", left: "70%", animationDuration: "2s" }}
        />
      </div>
    )
  }

  // Get side colors based on tile type
  const getSideColors = () => {
    switch (type) {
      case 6: // Volcano
        return {
          left: "bg-red-900/70",
          right: "bg-red-800/70",
        }
      case 7: // Golden temple
        return {
          left: "bg-yellow-700/70",
          right: "bg-yellow-600/70",
        }
      default:
        return {
          left: "bg-green-900/70",
          right: "bg-green-800/70",
        }
    }
  }

  const sideColors = getSideColors()

  return (
    <div
      className="absolute"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex: Number.isFinite(screenY) ? Math.floor(screenY) : 0,
      }}
    >
      <div
        className={cn("w-[128px] h-[64px] transform-gpu relative", getTileStyle())}
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        }}
      >
        {renderLavaEffects()}
      </div>

      {/* Side faces for height */}
      {height > 0 && (
        <>
          {/* Left side face */}
          <div
            className={cn("absolute transform-gpu", sideColors.left)}
            style={{
              left: "0",
              top: "32px",
              width: "64px",
              height: `${height * 16}px`,
              clipPath: "polygon(0 0, 100% 50%, 100% 100%, 0% 50%)",
              transformOrigin: "top left",
            }}
          />

          {/* Right side face */}
          <div
            className={cn("absolute transform-gpu", sideColors.right)}
            style={{
              left: "64px",
              top: "32px",
              width: "64px",
              height: `${height * 16}px`,
              clipPath: "polygon(0 50%, 100% 0, 100% 50%, 0% 100%)",
              transformOrigin: "top left",
            }}
          />
        </>
      )}
    </div>
  )
})
