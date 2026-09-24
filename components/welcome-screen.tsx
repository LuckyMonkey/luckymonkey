"use client"

import { useEffect, useState } from "react"
import { ALL_SPRITE_URLS } from "@/lib/asset"

interface WelcomeScreenProps {
  onProceed: () => void
}

/** Real preload: the renderer bundle plus every sprite, so the world opens instantly. */
function preload(onStep: () => void) {
  const jobs: Promise<unknown>[] = [
    import("@/components/pixi-renderer"),
    ...ALL_SPRITE_URLS.map(
      (src) =>
        new Promise<void>((done) => {
          const img = new Image()
          img.onload = img.onerror = () => done()
          img.src = src
        }),
    ),
  ]
  jobs.forEach((j) => j.then(onStep, onStep))
  return jobs.length
}

export function WelcomeScreen({ onProceed }: WelcomeScreenProps) {
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(1)
  const ready = done >= total

  useEffect(() => {
    let live = true
    setTotal(preload(() => live && setDone((d) => d + 1)))
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && onProceed()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ready, onProceed])

  const pct = Math.min(100, Math.round((done / total) * 100))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black overflow-y-auto font-mono">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-black border border-green-500/30 rounded-xl p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 p-1">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-3xl sm:text-4xl">🐵</div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-green-400 mb-2">LUCKY MONKEY MEDIA</h1>
          <p className="text-xs sm:text-sm text-green-300 mb-4">IT&apos;S ALL IN YOUR HEAD | システムアクセス</p>

          <div className="bg-black/50 p-3 sm:p-4 rounded-md mb-4 border border-red-500/40 text-xs sm:text-sm text-red-400">
            <h2 className="text-lg sm:text-xl font-bold text-red-500 mb-2">WARNING</h2>
            <p className="mb-2">
              THE NODE YOU ARE ATTEMPTING TO ACCESS IS THE PROPERTY OF LUCKY MONKEY MEDIA. UNAUTHORIZED ACCESS BEYOND
              THIS POINT IS STRICTLY PROHIBITED.
            </p>
            <p>
              IF YOU PROCEED YOU WILL BE IN VIOLATION OF INTERNATIONAL CORPORATE STATUTE TUF G3UTF9 AND WILL BE
              FORCIBLY DISCONNECTED BY THIS NODE&apos;S ANTI-INTRUSION SECURITY SOFTWARE.
            </p>
          </div>

          <div className="flex justify-between text-xs text-green-400/70 mb-1">
            <span>{ready ? "System ready" : "Initializing System..."}</span>
            <span>{pct}%</span>
          </div>
          <div
            className="w-full h-2 bg-black border border-green-500/30 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-200" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <button
          onClick={onProceed}
          disabled={!ready}
          className={`block max-w-xl mx-auto w-full px-8 py-3 text-sm rounded-full border transition-colors ${
            ready
              ? "bg-green-900/50 hover:bg-green-800/70 text-green-400 border-green-500/50"
              : "bg-gray-900/50 text-gray-500 border-gray-700/50 cursor-not-allowed"
          }`}
        >
          {ready ? "PROCEED" : "LOADING..."}
        </button>
      </div>
    </div>
  )
}
