"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface IsometricPathProps {
  type: string
  screenX: number
  screenY: number
  height: number
}

// Using React.memo to prevent unnecessary re-renders
export const IsometricPath = memo(function IsometricPath({ type, screenX, screenY, height }: IsometricPathProps) {
  // Determine path style based on type
  const getPathStyle = () => {
    switch (type) {
      case "data":
        return "bg-gradient-to-br from-green-500/30 to-green-600/30 border border-green-400/50"
      case "secure":
        return "bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 border border-cyan-400/50"
      case "corrupted":
        return "bg-gradient-to-br from-red-500/30 to-red-600/30 border border-red-400/50"
      default:
        return "bg-gradient-to-br from-green-500/30 to-green-600/30 border border-green-400/50"
    }
  }

  // Add side faces for height
  const renderSides = () => {
    if (height <= 0) return null

    return (
      <>
        {/* Left side */}
        <div
          className="absolute w-[32px] bg-green-950/50 transform-gpu"
          style={{
            left: 0,
            top: "100%",
            transformOrigin: "top left",
            transform: "skewX(45deg)",
            height: `${height * 8}px`,
          }}
        />
        {/* Right side */}
        <div
          className="absolute w-[32px] bg-green-900/50 transform-gpu"
          style={{
            left: "100%",
            top: "100%",
            transformOrigin: "top left",
            transform: "skewX(-45deg)",
            height: `${height * 8}px`,
          }}
        />
      </>
    )
  }

  return (
    <div
      className="absolute"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex: Math.floor(screenY) + 1,
      }}
    >
      <div
        className={cn("w-[64px] h-[32px] transform-gpu relative", getPathStyle())}
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        }}
      >
        {renderSides()}
      </div>
    </div>
  )
})
