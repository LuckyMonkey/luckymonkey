"use client"

import { memo, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FloatingCloudProps {
  id: string
  screenX: number
  screenY: number
  size: "small" | "medium" | "large"
  speed: "slow" | "medium" | "fast"
  direction: "clockwise" | "counterclockwise"
  type: "normal" | "storm" | "rain"
  emoji: string
}

export const FloatingCloud = memo(function FloatingCloud({
  screenX,
  screenY,
  size,
  speed,
  direction,
  type,
  emoji,
}: FloatingCloudProps) {
  const [isFlashing, setIsFlashing] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Flash effect for storm clouds
  useEffect(() => {
    if (type === "storm") {
      const flashInterval = setInterval(
        () => {
          setIsFlashing(true)
          setTimeout(() => setIsFlashing(false), 150)
        },
        Math.random() * 4000 + 2000,
      )
      return () => clearInterval(flashInterval)
    }
  }, [type])

  // Slow drift animation - clouds gently float
  useEffect(() => {
    const speedFactor = speed === "fast" ? 0.0003 : speed === "medium" ? 0.00015 : 0.00008
    const radius = size === "large" ? 40 : size === "medium" ? 30 : 20

    const moveInterval = setInterval(() => {
      const time = Date.now() * speedFactor
      const angle = direction === "clockwise" ? time : -time

      setOffset({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle * 0.7) * (radius * 0.5), // Slower vertical movement
      })
    }, 50)

    return () => clearInterval(moveInterval)
  }, [speed, direction, size])

  const cloudSize = {
    small: { width: 80, height: 40, emoji: "text-2xl" },
    medium: { width: 120, height: 55, emoji: "text-3xl" },
    large: { width: 160, height: 75, emoji: "text-4xl" },
  }[size]

  const cloudStyle = {
    normal: "bg-white/20 border-white/30",
    storm: isFlashing
      ? "bg-yellow-300/50 border-yellow-400/60 shadow-yellow-300/60 shadow-xl"
      : "bg-gray-500/30 border-gray-400/40",
    rain: "bg-blue-400/20 border-blue-300/30",
  }[type]

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `calc(50% + ${screenX + offset.x}px)`,
        top: `calc(50% + ${screenY + offset.y}px)`,
        transform: "translate(-50%, -50%)",
        transition: "left 0.1s ease-out, top 0.1s ease-out",
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-200",
          cloudStyle
        )}
        style={{
          width: `${cloudSize.width}px`,
          height: `${cloudSize.height}px`,
          boxShadow: isFlashing 
            ? "0 0 40px rgba(250, 204, 21, 0.7), 0 0 80px rgba(250, 204, 21, 0.3)" 
            : "0 0 20px rgba(255, 255, 255, 0.1)",
        }}
      >
        <span className={cn(cloudSize.emoji, "opacity-90")}>{emoji}</span>

        {/* Lightning bolt for storm clouds */}
        {type === "storm" && isFlashing && (
          <span 
            className="absolute text-3xl animate-pulse" 
            style={{ bottom: "-24px", filter: "drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))" }}
          >
            ⚡
          </span>
        )}

        {/* Rain drops for rain clouds */}
        {type === "rain" && (
          <div className="absolute w-full overflow-hidden" style={{ top: "100%", height: "25px" }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-4 bg-blue-300/60 rounded-full"
                style={{
                  left: `${15 + i * 18}%`,
                  animation: `rain-drop 1s infinite linear`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes rain-drop {
          0% { transform: translateY(-5px); opacity: 0; }
          30% { opacity: 0.8; }
          100% { transform: translateY(20px); opacity: 0; }
        }
      `}</style>
    </div>
  )
})
