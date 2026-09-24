"use client"

import { useState, memo } from "react"
import { cn } from "@/lib/utils"

interface IsometricObjectProps {
  id: string
  type: string
  emoji: string
  screenX: number
  screenY: number
  height: number
  name: string
  ipAddress: string
  onClick: () => void
}

// Using React.memo to prevent unnecessary re-renders
export const IsometricObject = memo(function IsometricObject({
  id,
  type,
  emoji,
  screenX,
  screenY,
  height,
  name,
  ipAddress,
  onClick,
}: IsometricObjectProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Get object style based on type
  const getObjectStyle = () => {
    switch (type) {
      case "monkey":
        return {
          width: 64,
          height: 96,
          className: "bg-gradient-to-br from-green-500/80 to-green-700/80 rounded-xl border border-green-400/50",
          zOffset: -48,
          glow: "0 0 20px rgba(74, 222, 128, 0.5)",
        }
      case "banana":
        return {
          width: 48,
          height: 64,
          className: "bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 rounded-xl border border-yellow-300/50",
          zOffset: -32,
          glow: "0 0 20px rgba(250, 204, 21, 0.5)",
        }
      case "temple":
        return {
          width: 80,
          height: 96,
          className: "bg-gradient-to-br from-green-600/80 to-green-800/80 rounded-xl border border-green-500/50",
          zOffset: -48,
          glow: "0 0 20px rgba(74, 222, 128, 0.5)",
        }
      case "server":
        return {
          width: 64,
          height: 64,
          className: "bg-gradient-to-br from-gray-600/80 to-gray-800/80 rounded-xl border border-gray-500/50",
          zOffset: -32,
          glow: "0 0 20px rgba(156, 163, 175, 0.5)",
        }
      case "river":
        return {
          width: 80,
          height: 48,
          className: "bg-gradient-to-br from-cyan-500/80 to-cyan-700/80 rounded-xl border border-cyan-400/50",
          zOffset: -24,
          glow: "0 0 20px rgba(14, 165, 233, 0.5)",
        }
      case "router":
        return {
          width: 56,
          height: 56,
          className: "bg-gradient-to-br from-purple-500/80 to-purple-700/80 rounded-xl border border-purple-400/50",
          zOffset: -28,
          glow: "0 0 20px rgba(168, 85, 247, 0.5)",
        }
      case "firewall":
        return {
          width: 56,
          height: 56,
          className: "bg-gradient-to-br from-red-500/80 to-red-700/80 rounded-xl border border-red-400/50",
          zOffset: -28,
          glow: "0 0 20px rgba(239, 68, 68, 0.5)",
        }
      case "database":
        return {
          width: 56,
          height: 56,
          className: "bg-gradient-to-br from-blue-500/80 to-blue-700/80 rounded-xl border border-blue-400/50",
          zOffset: -28,
          glow: "0 0 20px rgba(59, 130, 246, 0.5)",
        }
      default:
        return {
          width: 48,
          height: 48,
          className: "bg-gradient-to-br from-gray-500/80 to-gray-700/80 rounded-xl border border-gray-400/50",
          zOffset: -24,
          glow: "0 0 20px rgba(156, 163, 175, 0.5)",
        }
    }
  }

  const style = getObjectStyle()

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: `${screenX - style.width / 2 + 32}px`,
        top: `${screenY - style.height + style.zOffset}px`,
        zIndex: Number.isFinite(screenY) ? Math.floor(screenY) + 100 : 100,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center transition-all duration-200",
          style.className,
          isHovered && "scale-105",
        )}
        style={{
          width: `${style.width}px`,
          height: `${style.height}px`,
          boxShadow: isHovered ? style.glow : "none",
        }}
      >
        <span className="text-4xl mb-1">{emoji}</span>
        <span className="text-xs text-white/90 font-mono text-center px-1 truncate max-w-full">{name}</span>
      </div>

      {/* Always show name below the node */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 px-3 py-1.5 rounded-lg border border-green-500/30 whitespace-nowrap z-50">
        <div className="text-green-400 text-xs font-mono">{name}</div>
        <div className="text-green-300 text-[10px] font-mono">{ipAddress}</div>
      </div>
    </div>
  )
})
