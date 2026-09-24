"use client"

import { memo, useRef, useEffect } from "react"

interface AnimatedWaterProps {
  screenX: number
  screenY: number
  height: number
  isWaterfall?: boolean
  isLagoon?: boolean
}

export const AnimatedWater = memo(function AnimatedWater({
  screenX,
  screenY,
  height,
  isWaterfall = false,
  isLagoon = false,
}: AnimatedWaterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Use canvas for more efficient animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size - increased for larger tiles
    canvas.width = 128
    canvas.height = 64

    // Animation variables
    let animationFrame: number
    let lastTime = 0
    const fps = 30
    const interval = 1000 / fps

    // Water colors
    const waterColor = isLagoon
      ? "rgba(77, 210, 255, 0.7)"
      : isWaterfall
        ? "rgba(77, 210, 255, 0.8)"
        : "rgba(0, 153, 204, 0.7)"
    const rippleColor = "rgba(255, 255, 255, 0.3)"

    // Draw water tile
    const drawWater = (time: number) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw diamond shape
      ctx.beginPath()
      ctx.moveTo(64, 0)
      ctx.lineTo(128, 32)
      ctx.lineTo(64, 64)
      ctx.lineTo(0, 32)
      ctx.closePath()

      // Fill with water color
      ctx.fillStyle = waterColor
      ctx.fill()

      // Draw border
      ctx.strokeStyle = "rgba(0, 204, 255, 0.3)"
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw ripple effect
      const rippleSize = 0.95 + Math.sin(time * 0.002) * 0.05
      ctx.save()
      ctx.translate(64, 32)
      ctx.scale(rippleSize, rippleSize)
      ctx.translate(-64, -32)

      ctx.beginPath()
      ctx.moveTo(64, 2)
      ctx.lineTo(126, 32)
      ctx.lineTo(64, 62)
      ctx.lineTo(2, 32)
      ctx.closePath()

      ctx.fillStyle = rippleColor
      ctx.fill()
      ctx.restore()

      // Draw waterfall effect
      if (isWaterfall) {
        const streamCount = 3
        const streamWidth = 3

        for (let i = 0; i < streamCount; i++) {
          const x = 32 + i * 32
          const offset = (time * 0.1 + i * 100) % 64

          ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
          ctx.fillRect(x - streamWidth / 2, offset, streamWidth, 16)
        }
      }

      // Draw lagoon bubbles
      if (isLagoon) {
        const bubbleCount = 5

        for (let i = 0; i < bubbleCount; i++) {
          const x = 32 + i * 16
          const y = 40 + Math.sin(time * 0.003 + i) * 8
          const size = 3 + Math.sin(time * 0.002 + i * 2) * 1.5

          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
          ctx.fill()
        }
      }
    }

    // Animation loop
    const animate = (time: number) => {
      if (time - lastTime >= interval) {
        drawWater(time)
        lastTime = time
      }

      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [isWaterfall, isLagoon])

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex: Number.isFinite(screenY) ? Math.floor(screenY) + 2 : 2,
      }}
    >
      <canvas
        ref={canvasRef}
        width={128}
        height={64}
        className="transform-gpu"
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        }}
      />
    </div>
  )
})
