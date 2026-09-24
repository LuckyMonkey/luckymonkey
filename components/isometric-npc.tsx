"use client"

import { memo, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface IsometricNPCProps {
  id: string
  type: "monkey" | "ghost" | "banana" | "lizard" | "crocodile"
  emoji: string
  screenX: number
  screenY: number
  height: number
  state: "idle" | "moving" | "hopping" | "chasing" | "fleeing" | "swimming"
}

// Using React.memo to prevent unnecessary re-renders
export const IsometricNPC = memo(function IsometricNPC({
  id,
  type,
  emoji,
  screenX,
  screenY,
  height,
  state,
}: IsometricNPCProps) {
  const [isHovered, setIsHovered] = useState(false)
  const animationOffsetRef = useRef(Math.random() * 100)
  const lastRenderTimeRef = useRef(0)

  // Get NPC style based on type
  const getNPCStyle = () => {
    switch (type) {
      case "monkey":
        return {
          width: 32,
          height: 32,
          className: "bg-green-800/70 rounded-full border border-green-400/50",
          zOffset: -24,
          glow: "0 0 15px rgba(74, 222, 128, 0.5)",
        }
      case "ghost":
        return {
          width: 32,
          height: 32,
          className: "bg-blue-800/50 rounded-full border border-blue-400/40",
          zOffset: -24,
          glow: "0 0 15px rgba(96, 165, 250, 0.5)",
        }
      case "banana":
        return {
          width: 32,
          height: 32,
          className: "bg-yellow-800/70 rounded-full border border-yellow-400/50",
          zOffset: -24,
          glow: "0 0 15px rgba(250, 204, 21, 0.5)",
        }
      case "lizard":
        return {
          width: 32,
          height: 32,
          className: "bg-green-700/70 rounded-full border border-green-500/50",
          zOffset: -24,
          glow: "0 0 15px rgba(34, 197, 94, 0.5)",
        }
      case "crocodile":
        return {
          width: 40,
          height: 40,
          className: "bg-green-900/70 rounded-full border border-green-600/50",
          zOffset: -24,
          glow: "0 0 15px rgba(22, 163, 74, 0.5)",
        }
      default:
        return {
          width: 32,
          height: 32,
          className: "bg-gray-800/70 rounded-full border border-gray-400/50",
          zOffset: -24,
          glow: "0 0 15px rgba(156, 163, 175, 0.5)",
        }
    }
  }

  const style = getNPCStyle()

  // Get animation class based on state
  const getAnimationClass = () => {
    switch (state) {
      case "idle":
        return "animate-pulse"
      case "moving":
        return "animate-bounce"
      case "hopping":
        return "animate-bounce"
      case "chasing":
        return "animate-ping"
      case "fleeing":
        return "animate-pulse"
      case "swimming":
        return type === "crocodile" || type === "lizard" ? "animate-swim" : "animate-pulse"
      default:
        return ""
    }
  }

  return (
    <div
      className="absolute cursor-pointer"
      style={{
        left: `${screenX - style.width / 2 + 32}px`,
        top: `${screenY - style.height + style.zOffset}px`,
        zIndex: Number.isFinite(screenY) ? Math.floor(screenY) + 100 : 100,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex items-center justify-center transition-all duration-200",
          style.className,
          getAnimationClass(),
          type === "banana" && "animate-bounce",
          type === "ghost" && "animate-pulse",
          type === "lizard" && state === "swimming" && "animate-swim",
          type === "crocodile" && "animate-swim",
        )}
        style={{
          width: `${style.width}px`,
          height: `${style.height}px`,
          boxShadow: isHovered ? style.glow : "none",
          animationDuration: `${1 + animationOffsetRef.current * 0.01}s`,
        }}
      >
        <span className="text-3xl">{emoji}</span>
      </div>

      {/* Show name on hover */}
      {isHovered && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs text-green-400 whitespace-nowrap z-50">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </div>
      )}
    </div>
  )
})
