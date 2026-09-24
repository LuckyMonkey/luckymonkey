"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { WelcomeScreen } from "@/components/welcome-screen"
import { NodeInfoPanel } from "@/components/node-info-panel"
import { FloatingCloud } from "@/components/floating-cloud"
import type { View } from "@/components/pixi-renderer"
import { cloudData } from "@/lib/cloud-types"
import { asset } from "@/lib/asset"

// Pixi touches window/WebGL, so it only ever loads in the browser.
const World = dynamic(() => import("@/components/pixi-renderer"), { ssr: false })

export default function Home() {
  const [started, setStarted] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px), (pointer: coarse)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const closePanel = useCallback(() => setSelectedNode(null), [])
  const onMapLoaded = useCallback(() => setMapLoaded(true), [])

  return (
    <main className="relative w-full h-dvh overflow-hidden">
      {/* Isometric grid backdrop (2:1) with a soft vignette */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `url('${asset("/images/grid_background.png")}')`,
          backgroundSize: "128px 64px",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%), radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {!started ? (
        <WelcomeScreen onProceed={() => setStarted(true)} />
      ) : (
        <div className="relative w-full h-full">
          <World onSelectNode={setSelectedNode} onMapLoaded={onMapLoaded} onViewChange={setView} isMobile={isMobile} />

          {/* Clouds ride along with the map's pan and zoom */}
          {mapLoaded && (
            <div
              className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none z-[100]"
              style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
            >
              {cloudData.map((cloud) => (
                <FloatingCloud key={cloud.id} {...cloud} />
              ))}
            </div>
          )}

          {selectedNode && <NodeInfoPanel nodeId={selectedNode} onClose={closePanel} />}
        </div>
      )}
    </main>
  )
}
