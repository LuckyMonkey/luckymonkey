"use client"

import { memo, useState } from "react"
import { cn } from "@/lib/utils"
import { isoToScreen } from "@/lib/iso-helpers"

export type NodeType =
  | "ai-core"
  | "vault"
  | "firewall"
  | "switch"
  | "banana-cache"
  | "terminal"
  | "monkey"
  | "river"
  | "temple"
  | "server"
  | "volcano"
  | "database"
  | "router"
  | "lizard"

interface NetworkNodeProps {
  id: string
  name: string
  type: NodeType
  ipAddress: string
  emoji: string
  description: string
  position: { x: number; y: number; height: number }
  connections?: string[]
  onClick: () => void
}

export const NetworkNode = memo(function NetworkNode({
  id,
  name,
  type,
  ipAddress,
  emoji,
  description,
  position,
  connections,
  onClick,
}: NetworkNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const screenPos = isoToScreen(position.x, position.y, position.height)

  // Get node style based on type - increased sizes for better visibility
  const getNodeStyle = () => {
    switch (type) {
      case "ai-core":
        return {
          width: 80,
          height: 100,
          className: "bg-gradient-to-br from-purple-500/80 to-purple-700/80 rounded-xl border border-purple-400/50",
          glow: "0 0 20px rgba(168, 85, 247, 0.5)",
        }
      case "vault":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-blue-500/80 to-blue-700/80 rounded-xl border border-blue-400/50",
          glow: "0 0 20px rgba(59, 130, 246, 0.5)",
        }
      case "firewall":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-red-500/80 to-red-700/80 rounded-xl border border-red-400/50",
          glow: "0 0 20px rgba(239, 68, 68, 0.5)",
        }
      case "switch":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-cyan-500/80 to-cyan-700/80 rounded-xl border border-cyan-400/50",
          glow: "0 0 20px rgba(14, 165, 233, 0.5)",
        }
      case "banana-cache":
        return {
          width: 80,
          height: 100,
          className: "bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 rounded-xl border border-yellow-300/50",
          glow: "0 0 20px rgba(250, 204, 21, 0.5)",
        }
      case "terminal":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-green-500/80 to-green-700/80 rounded-xl border border-green-400/50",
          glow: "0 0 20px rgba(74, 222, 128, 0.5)",
        }
      case "monkey":
        return {
          width: 80,
          height: 100,
          className: "bg-gradient-to-br from-green-500/80 to-green-700/80 rounded-xl border border-green-400/50",
          glow: "0 0 20px rgba(74, 222, 128, 0.5)",
        }
      case "river":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-cyan-500/80 to-cyan-700/80 rounded-xl border border-cyan-400/50",
          glow: "0 0 20px rgba(14, 165, 233, 0.5)",
        }
      case "temple":
        return {
          width: 80,
          height: 100,
          className: "bg-gradient-to-br from-green-600/80 to-green-800/80 rounded-xl border border-green-500/50",
          glow: "0 0 20px rgba(74, 222, 128, 0.5)",
        }
      case "server":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-gray-600/80 to-gray-800/80 rounded-xl border border-gray-500/50",
          glow: "0 0 20px rgba(156, 163, 175, 0.5)",
        }
      case "volcano":
        return {
          width: 80,
          height: 100,
          className: "bg-gradient-to-br from-red-600/80 to-red-800/80 rounded-xl border border-orange-400/50",
          glow: "0 0 20px rgba(239, 68, 68, 0.5)",
        }
      case "database":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-blue-500/80 to-blue-700/80 rounded-xl border border-blue-400/50",
          glow: "0 0 20px rgba(59, 130, 246, 0.5)",
        }
      case "router":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-purple-500/80 to-purple-700/80 rounded-xl border border-purple-400/50",
          glow: "0 0 20px rgba(168, 85, 247, 0.5)",
        }
      case "lizard":
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-green-600/80 to-green-800/80 rounded-xl border border-green-500/50",
          glow: "0 0 20px rgba(74, 222, 128, 0.5)",
        }
      default:
        return {
          width: 80,
          height: 80,
          className: "bg-gradient-to-br from-gray-500/80 to-gray-700/80 rounded-xl border border-gray-400/50",
          glow: "0 0 20px rgba(156, 163, 175, 0.5)",
        }
    }
  }

  const style = getNodeStyle()

  // Render node-specific effects
  const renderNodeEffects = () => {
    switch (type) {
      case "ai-core":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute w-full h-full rounded-full bg-purple-500/10 animate-pulse"
              style={{ animationDuration: "3s" }}
            ></div>
            <div
              className="absolute w-3/4 h-3/4 rounded-full bg-purple-500/20 animate-pulse"
              style={{ animationDuration: "2s" }}
            ></div>
            <div
              className="absolute w-1/2 h-1/2 rounded-full bg-purple-500/30 animate-pulse"
              style={{ animationDuration: "1.5s" }}
            ></div>
          </div>
        )
      case "firewall":
        return (
          <div className="absolute top-0 left-0 right-0 h-1/3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-3 bg-orange-500/70 rounded-full animate-flame"
                style={{
                  left: `${15 + i * 25}%`,
                  bottom: "0",
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${0.8 + Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        )
      case "volcano":
        return (
          <div className="absolute inset-0 overflow-hidden">
            {/* Lava glow */}
            <div className="absolute inset-0 bg-orange-500/20 animate-pulse" style={{ animationDuration: "2s" }} />

            {/* Lava particles */}
            <div
              className="absolute w-1.5 h-1.5 bg-yellow-300/70 rounded-full animate-ping"
              style={{ top: "30%", left: "40%", animationDuration: "1.5s" }}
            />
            <div
              className="absolute w-1 h-1 bg-orange-400/70 rounded-full animate-ping"
              style={{ top: "60%", left: "70%", animationDuration: "2s" }}
            />
            <div
              className="absolute w-1 h-1 bg-yellow-500/70 rounded-full animate-ping"
              style={{ top: "50%", left: "30%", animationDuration: "1.8s" }}
            />

            {/* Eruption effect */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 overflow-hidden">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-6 bg-orange-500/70 rounded-full animate-flame"
                  style={{
                    left: `${i * 10 + 5}px`,
                    bottom: "0",
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: `${1.2 + Math.random() * 0.6}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )
      case "lizard":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute w-full h-1/4 bottom-0 bg-green-500/10 animate-pulse"
              style={{ animationDuration: "1.5s" }}
            ></div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: `${screenPos.x - style.width / 2 + 40}px`,
        top: `${screenPos.y - style.height}px`,
        zIndex: Number.isFinite(screenPos.y) ? Math.floor(screenPos.y) + 100 : 100,
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
        {renderNodeEffects()}
        <span className="text-4xl mb-2">{emoji}</span>
        <span className="text-sm text-white/90 font-mono text-center px-2 leading-tight max-w-full">{name}</span>
      </div>

      {/* Show description on hover */}
      {isHovered && (
        <div className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 bg-black/90 px-4 py-2 rounded-lg border border-green-500/30 whitespace-normal z-50 min-w-[200px] max-w-[250px]">
          <div className="text-green-400 text-xs font-mono mb-1">{name}</div>
          <div className="text-green-300 text-[10px] font-mono mb-1">{ipAddress}</div>
          <div className="text-green-200 text-[9px] font-mono line-clamp-2">{description}</div>
        </div>
      )}
    </div>
  )
})
