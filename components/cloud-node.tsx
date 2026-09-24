"use client"

import { memo, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CloudNodeProps {
  id: string
  screenX: number
  screenY: number
  size: "small" | "medium" | "large"
  speed: "slow" | "medium" | "fast"
  direction: "clockwise" | "counterclockwise"
  type: "normal" | "storm" | "rain"
  emoji: string
}

export const CloudNode = memo(function CloudNode({
  id,
  screenX,
  screenY,
  size,
  speed,
  direction,
  type,
  emoji,
}: CloudNodeProps) {
  const [isFlashing, setIsFlashing] = useState(false)

  // Flash effect for storm clouds
  useEffect(() => {
    if (type === "storm") {
      const flashInterval = setInterval(
        () => {
          setIsFlashing(true)
          setTimeout(() => setIsFlashing(false), 100)
        },
        Math.random() * 5000 + 3000,
      ) // Random interval between 3-8 seconds

      return () => clearInterval(flashInterval)
    }
  }, [type])

  // Determine cloud size
  const getCloudSize = () => {
    switch (size) {
      case "small":
        return {
          width: 80,
          height: 40,
          emojiSize: "text-2xl",
        }
      case "medium":
        return {
          width: 120,
          height: 60,
          emojiSize: "text-3xl",
        }
      case "large":
        return {
          width: 160,
          height: 80,
          emojiSize: "text-4xl",
        }
    }
  }

  // Determine animation speed
  const getAnimationClass = () => {
    const baseClass = direction === "clockwise" ? "animate-float-clockwise" : "animate-float-counterclockwise"

    switch (speed) {
      case "slow":
        return `${baseClass}-slow`
      case "medium":
        return `${baseClass}-medium`
      case "fast":
        return `${baseClass}-fast`
    }
  }

  const cloudSize = getCloudSize()
  const animationClass = getAnimationClass()

  // Get cloud style based on type
  const getCloudStyle = () => {
    switch (type) {
      case "normal":
        return "bg-white/10 backdrop-blur-sm border border-white/20"
      case "storm":
        return isFlashing
          ? "bg-yellow-300/30 backdrop-blur-sm border border-yellow-400/40 shadow-yellow-300/50 shadow-lg"
          : "bg-gray-700/20 backdrop-blur-sm border border-gray-600/30"
      case "rain":
        return "bg-blue-500/10 backdrop-blur-sm border border-blue-400/20"
      default:
        return "bg-white/10 backdrop-blur-sm border border-white/20"
    }
  }

  return (
    <div
      className={cn("absolute pointer-events-none z-[1000]", animationClass)}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
      }}
    >
      <div
        className={cn("flex items-center justify-center rounded-full", getCloudStyle())}
        style={{
          width: `${cloudSize.width}px`,
          height: `${cloudSize.height}px`,
          boxShadow: isFlashing ? "0 0 30px rgba(250, 204, 21, 0.5)" : "0 0 20px rgba(255, 255, 255, 0.1)",
          transition: "all 0.1s ease-in-out",
        }}
      >
        <span className={cn(cloudSize.emojiSize, "opacity-80")}>{emoji}</span>

        {/* Rain drops for rain clouds */}
        {type === "rain" && (
          <div className="absolute w-full h-full overflow-hidden">
            <div
              className="absolute w-1 h-4 bg-blue-300/40 rounded-full animate-rain-1"
              style={{ left: "20%", top: "100%" }}
            ></div>
            <div
              className="absolute w-1 h-3 bg-blue-300/40 rounded-full animate-rain-2"
              style={{ left: "40%", top: "100%" }}
            ></div>
            <div
              className="absolute w-1 h-5 bg-blue-300/40 rounded-full animate-rain-3"
              style={{ left: "60%", top: "100%" }}
            ></div>
            <div
              className="absolute w-1 h-4 bg-blue-300/40 rounded-full animate-rain-4"
              style={{ left: "80%", top: "100%" }}
            ></div>
          </div>
        )}
      </div>
    </div>
  )
})
