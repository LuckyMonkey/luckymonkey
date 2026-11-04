import { statSync } from "node:fs"

/** @type {import('next').NextConfig} */
const basePath = process.env.LM_BASE_PATH ?? "/luckymonkey"
// The game build's version, from the wasm's size and time: page.tsx puts it on every game file URL, so a browser
// never pairs a cached luckymonkey.js (kept 4 h) with a newer luckymonkey_bg.wasm, which fails to start (black screen).
let gameVersion = Date.now().toString(36)
try {
  const s = statSync(new URL("./public/game/luckymonkey_bg.wasm", import.meta.url))
  gameVersion = `${s.size.toString(36)}${Math.floor(s.mtimeMs / 1000).toString(36)}`
} catch {}

const nextConfig = {
  basePath,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_GAME_V: gameVersion },
}

export default nextConfig
