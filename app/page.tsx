"use client"

import { useEffect, useState } from "react"
import { asset } from "@/lib/asset"

// The whole game is a Bevy (Rust -> WebAssembly) app in public/game/, built by
// tools/deploy.sh. This page only hosts its canvas.
let started = false

export default function Home() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started) return
    started = true
    if (!document.createElement("canvas").getContext("webgl2")) {
      setError("This browser has no WebGL2, which Lucky Monkey needs.")
      return
    }
    import(/* webpackIgnore: true */ asset("/game/luckymonkey.js"))
      .then((game) => game.default({ module_or_path: asset("/game/luckymonkey_bg.wasm") }))
      .catch((e: unknown) => {
        // winit hands the event loop to the browser by throwing on purpose.
        if (!String(e).includes("Using exceptions for control flow")) setError(String(e))
      })
  }, [])

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-black font-mono">
      <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
        <div>
          <div className="text-2xl mb-2 text-green-400">{error ? "Could not start" : "Generating World"}</div>
          <div className="text-sm text-green-300 max-w-sm px-4">{error ?? "Initializing Lucky Monkey Network..."}</div>
        </div>
      </div>
      <canvas id="lm-canvas" className="absolute inset-0 w-full h-full outline-none" style={{ touchAction: "none" }} />
    </main>
  )
}
