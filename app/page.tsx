"use client"

import { useState, useEffect } from "react"
import { WelcomeScreen } from "@/components/welcome-screen"
import { NodeInfoPanel } from "@/components/node-info-panel"
import { FloatingCloud } from "@/components/floating-cloud"
import { cloudData } from "@/lib/cloud-types"
import dynamic from "next/dynamic"

const DynamicIsometricWorld = dynamic(() => import("@/components/pixi-renderer").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black text-green-400">
      <div className="text-center">
        <div className="text-2xl mb-2 font-mono">Loading Digital Environment</div>
        <div className="text-sm font-mono">Initializing Lucky Monkey Network...</div>
      </div>
    </div>
  ),
})

export default function Home() {
  const [isWelcomeShown, setIsWelcomeShown] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleProceed = () => {
    setIsWelcomeShown(false)
  }

  const handleMapLoaded = () => {
    setMapLoaded(true)
  }

  const handlePanChange = (offset: { x: number; y: number }) => {
    setPanOffset(offset)
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* Isometric Grid Background - properly aligned for isometric view */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('/images/grid_background.png')`,
          backgroundSize: "128px 64px", // Proper isometric ratio (2:1)
          backgroundPosition: "center center",
          backgroundColor: "#000000",
          opacity: 0.6,
          zIndex: 0,
        }}
      />
      
      {/* Additional grid overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%),
            radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)
          `,
          zIndex: 1,
        }}
      />

      {isWelcomeShown ? (
        <WelcomeScreen onProceed={handleProceed} />
      ) : (
        <div className="relative w-full h-full" style={{ zIndex: 2 }}>
          <DynamicIsometricWorld
            onSelectNode={setSelectedNode}
            onMapLoaded={handleMapLoaded}
            onPositionChange={handlePanChange}
            isMobile={isMobile}
          />

          {/* Clouds - anchored to map via pan offset, only after map loads */}
          {mapLoaded && (
            <div
              className="absolute pointer-events-none overflow-visible"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px))`,
                width: "200%",
                height: "200%",
                zIndex: 100,
              }}
            >
              {cloudData.map((cloud) => (
                <FloatingCloud
                  key={cloud.id}
                  id={cloud.id}
                  screenX={cloud.x}
                  screenY={cloud.y}
                  size={cloud.size}
                  speed={cloud.speed}
                  direction={cloud.direction}
                  type={cloud.type}
                  emoji={cloud.emoji}
                />
              ))}
            </div>
          )}

          {/* Node info panel */}
          {selectedNode && (
            <NodeInfoPanel nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </div>
      )}
    </main>
  )
}
