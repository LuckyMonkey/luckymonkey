"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
  onProceed: () => void
}

export function WelcomeScreen({ onProceed }: WelcomeScreenProps) {
  const [progress, setProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Simulate loading assets in background
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15
        if (next >= 100) {
          clearInterval(interval)
          setIsReady(true)
          return 100
        }
        return next
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-black z-50 overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="max-w-xl w-full bg-black/80 border border-green-500/30 rounded-xl backdrop-blur-sm">
          <div className="p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 p-1 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <div className="text-3xl sm:text-4xl">🐵</div>
                </div>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-green-400 font-mono mb-2">LUCKY MONKEY MEDIA</h1>

            <p className="text-xs sm:text-sm text-green-300 mb-4 font-mono">
              IT&apos;S ALL IN YOUR HEAD | システムアクセス
            </p>

            <div className="bg-black/50 p-3 sm:p-4 rounded-md mb-4 border border-red-500/40">
              <h2 className="text-lg sm:text-xl font-bold text-red-500 mb-2 font-mono">WARNING</h2>
              <p className="text-red-400 text-xs sm:text-sm font-mono mb-2">
                THE NODE YOU ARE ATTEMPTING TO ACCESS IS THE PROPERTY OF LUCKY MONKEY MEDIA. UNAUTHORIZED ACCESS BEYOND
                THIS POINT IS STRICTLY PROHIBITED.
              </p>
              <p className="text-red-400 text-xs sm:text-sm font-mono">
                IF YOU PROCEED YOU WILL BE IN VIOLATION OF INTERNATIONAL CORPORATE STATUTE TUF G3UTF9 AND WILL BE
                FORCIBLY DISCONNECTED BY THIS NODE&apos;S ANTI-INTRUSION SECURITY SOFTWARE.
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-green-400/70 font-mono mb-1">
                <span>Initializing System...</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-black border border-green-500/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed button at bottom */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-xl mx-auto">
          <Button
            onClick={onProceed}
            disabled={!isReady}
            className={`px-8 py-3 text-sm font-mono rounded-full w-full transition-all ${
              isReady
                ? "bg-green-900/50 hover:bg-green-800/70 text-green-400 border border-green-500/50"
                : "bg-gray-900/50 text-gray-500 border border-gray-700/50 cursor-not-allowed"
            }`}
          >
            {isReady ? "PROCEED" : "LOADING..."}
          </Button>
        </div>
      </div>
    </div>
  )
}
