import { memo, type CSSProperties } from "react"
import type { CloudData } from "@/lib/cloud-types"

const SIZES = {
  small: { w: 80, h: 40, text: "text-2xl", r: 20 },
  medium: { w: 120, h: 55, text: "text-3xl", r: 30 },
  large: { w: 160, h: 75, text: "text-4xl", r: 40 },
}
const PERIOD = { slow: 40, medium: 22, fast: 11 } // seconds per sweep

/** Decorative cloud; all motion is CSS so it costs nothing per frame in React. */
export const FloatingCloud = memo(function FloatingCloud({ id, x, y, size, speed, direction, type, emoji }: CloudData) {
  const s = SIZES[size]
  const period = PERIOD[speed]
  // Stable per-cloud offset so they don't all move in lockstep.
  const phase = -([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % period)
  const dir = direction === "clockwise" ? "alternate" : "alternate-reverse"

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        ["--r" as string]: `${s.r}px`,
        animation: `cloud-drift-x ${period}s ease-in-out ${phase}s infinite ${dir}`,
      } as CSSProperties}
    >
      <div style={{ animation: `cloud-drift-y ${period * 0.7}s ease-in-out ${phase}s infinite ${dir}` }}>
        <div
          className={`relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border ${
            type === "normal" ? "bg-white/20 border-white/30" : type === "rain" ? "bg-blue-400/20 border-blue-300/30" : "border-gray-400/40"
          }`}
          style={{
            width: s.w,
            height: s.h,
            boxShadow: "0 0 20px rgba(255,255,255,0.1)",
            animation: type === "storm" ? `cloud-flash ${5 + (-phase % 3)}s linear ${phase}s infinite` : undefined,
          }}
        >
          <span className={`${s.text} opacity-90`}>{emoji}</span>
          {type === "storm" && (
            <span
              className="absolute text-3xl"
              style={{
                bottom: -24,
                filter: "drop-shadow(0 0 10px rgba(250,204,21,0.8))",
                animation: `cloud-bolt ${5 + (-phase % 3)}s linear ${phase}s infinite`,
              }}
            >
              ⚡
            </span>
          )}
          {type === "rain" && (
            <div className="absolute w-full overflow-hidden" style={{ top: "100%", height: 25 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-4 bg-blue-300/60 rounded-full"
                  style={{ left: `${15 + i * 18}%`, animation: `rain-drop 1s linear ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
