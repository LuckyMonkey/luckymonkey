"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { worldObjects } from "@/lib/world-objects"

interface InfoPanelProps {
  nodeId: string
  onClose: () => void
}

export function InfoPanel({ nodeId, onClose }: InfoPanelProps) {
  const node = worldObjects.find((obj) => obj.id === nodeId)

  if (!node) return null

  return (
    <div className="absolute bottom-4 left-4 z-50 w-80 bg-green-900/90 border border-lime-400 rounded-md overflow-hidden font-mono">
      <div className="flex items-center justify-between p-3 bg-green-950">
        <h3 className="text-lime-300 font-bold">{node.name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-lime-300 h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <p className="text-lime-300 text-sm mb-3">{node.description}</p>

        {node.status && (
          <div className="mb-3">
            <div className="text-xs text-lime-300/70 mb-1">Status</div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${node.status === "online" ? "bg-green-400" : node.status === "unstable" ? "bg-yellow-400" : "bg-red-400"}`}
              ></div>
              <span className="text-lime-300 text-sm capitalize">{node.status}</span>
            </div>
          </div>
        )}

        {node.connections && node.connections.length > 0 && (
          <div>
            <div className="text-xs text-lime-300/70 mb-1">Connections</div>
            <ul className="text-sm text-lime-300">
              {node.connections.map((connId) => {
                const connNode = worldObjects.find((obj) => obj.id === connId)
                return connNode ? (
                  <li key={connId} className="mb-1">
                    • {connNode.name}
                  </li>
                ) : null
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
