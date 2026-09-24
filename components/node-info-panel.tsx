"use client"

import { useEffect, useState } from "react"
import { worldData } from "@/lib/world-data"

interface NodeInfoPanelProps {
  nodeId: string
  onClose: () => void
}

export function NodeInfoPanel({ nodeId, onClose }: NodeInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<"info" | "assets">("info")
  const node = worldData.nodes.find((obj) => obj.id === nodeId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!node) return null

  return (
    <div className="absolute bottom-10 left-4 z-[1000] w-[calc(100vw-2rem)] max-w-sm max-h-[70vh] overflow-y-auto bg-black/95 border border-green-500/30 rounded-xl font-mono">
      <div className="flex items-center justify-between p-3 border-b border-green-500/20">
        <div>
          <h3 className="text-green-400 font-bold flex items-center gap-1 text-sm">
            <span className="text-xl">{node.emoji}</span> {node.name}
          </h3>
          <p className="text-green-300 text-[10px]">{node.ipAddress}</p>
        </div>
        <button aria-label="Close" onClick={onClose} className="text-green-400 hover:text-green-200 w-8 h-8 text-xl leading-none">
          ×
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-green-500/20">
        <button
          className={`flex-1 py-1 text-[10px] font-bold ${
            activeTab === "info" ? "bg-green-900/30 text-green-400" : "text-green-500/70"
          }`}
          onClick={() => setActiveTab("info")}
        >
          INFO
        </button>
        <button
          className={`flex-1 py-1 text-[10px] font-bold ${
            activeTab === "assets" ? "bg-green-900/30 text-green-400" : "text-green-500/70"
          }`}
          onClick={() => setActiveTab("assets")}
        >
          ASSETS
        </button>
      </div>

      {activeTab === "info" && (
        <div className="p-3">
          <p className="text-green-300 text-xs mb-3 min-h-[60px] leading-relaxed">
            {node.description || "No description available."}
          </p>

          {node.status && (
            <div className="mb-3">
              <div className="text-[10px] text-green-400/70 mb-1">ステータス Status</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    node.status === "online"
                      ? "bg-green-400"
                      : node.status === "unstable"
                        ? "bg-yellow-400"
                        : node.status === "erupting"
                          ? "bg-orange-400"
                          : "bg-red-400"
                  }`}
                ></div>
                <span className="text-green-300 text-xs capitalize">{node.status}</span>
              </div>
            </div>
          )}

          {node.connections && node.connections.length > 0 && (
            <div>
              <div className="text-[10px] text-green-400/70 mb-1">接続 Connections</div>
              <ul className="text-xs text-green-300 grid grid-cols-2 gap-x-2 gap-y-1">
                {node.connections.map((connId: string) => {
                  const connNode = worldData.nodes.find((obj) => obj.id === connId)
                  return connNode ? (
                    <li key={connId} className="flex items-center gap-1 truncate">
                      <span className="text-sm">{connNode.emoji}</span>
                      <span className="truncate">{connNode.name}</span>
                    </li>
                  ) : null
                })}
              </ul>
            </div>
          )}

          {node.securityLevel !== undefined && (
            <div className="mt-3">
              <div className="text-[10px] text-green-400/70 mb-1">セキュリティ Security</div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm mr-0.5 ${
                        i < (node.securityLevel ?? 0) ? "bg-green-500" : "bg-green-900/50"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-green-300 text-xs">Level {node.securityLevel}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "assets" && (
        <div className="p-3">
          <div className="text-[10px] text-green-400/70 mb-1">ファイル Files</div>
          {node.assets && node.assets.length > 0 ? (
            <ul className="text-xs text-green-300 space-y-2">
              {node.assets.map((asset: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center bg-green-900/50 rounded-sm border border-green-500/30 flex-shrink-0">
                    {asset.endsWith(".json") && "{}"}
                    {asset.endsWith(".bin") && "01"}
                    {asset.endsWith(".dat") && "📊"}
                    {asset.endsWith(".sys") && "⚙️"}
                    {asset.endsWith(".log") && "📝"}
                    {asset.endsWith(".txt") && "📄"}
                    {asset.endsWith(".js") && "JS"}
                    {asset.endsWith(".gif") && "🎞️"}
                  </div>
                  <span className="truncate">{asset}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-500/50 text-xs italic">No assets found</p>
          )}
        </div>
      )}
    </div>
  )
}
