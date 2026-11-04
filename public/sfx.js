// Lucky Monkey sound: tiny synthesized "tech noises" in the spirit of Spybotics:
// square-wave blips, bit-crushed crunches and quick arpeggios, over jungle music
// (fridge.run's shared music engine, song lucky-monkey-jungle, growing with the threat level). No audio files. The game calls:
//   lmSfx(name)       one-shot cue (list in CUES below)
//   lmAmbient(level)  music: 0 = silence .. ~1.5 = cyberstorm (faster, fuller)
//   lmSfxToggle()     mute/unmute, remembered in this browser; returns true if on
;(function () {
  const KEY = "luckymonkey-sound"
  let on = true
  try { on = localStorage.getItem(KEY) !== "0" } catch (e) {}
  window.lmSfxOn = on

  let ctx = null, master = null
  function audio() {
    if (ctx) return ctx
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = on ? 0.5 : 0
    master.connect(comp)
    return ctx
  }
  // Browsers only allow sound after a click or key press.
  const unlock = () => { const c = audio(); if (c && c.state === "suspended") c.resume() }
  addEventListener("pointerdown", unlock, true)
  addEventListener("keydown", unlock, true)

  function tone(f, dur, type = "square", vol = 0.08, to = null, at = 0) {
    const c = audio(); if (!c || !on) return
    const t = c.currentTime + at
    const o = c.createOscillator(), g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master)
    o.start(t); o.stop(t + dur + 0.02)
  }
  // Noise, sample-and-held every `crush` samples for that 8-bit grit.
  function noise(dur, vol = 0.06, freq = 2000, at = 0, crush = 1, type = "bandpass", to = null) {
    const c = audio(); if (!c || !on) return
    const t = c.currentTime + at
    const n = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0)
    let v = 0
    for (let i = 0; i < n; i++) { if (i % crush === 0) v = Math.random() * 2 - 1; d[i] = v }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = buf
    f.type = type; f.frequency.setValueAtTime(freq, t)
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(master)
    s.start(t)
  }
  const arp = (notes, step, type = "square", vol = 0.07, len = 1.6) =>
    notes.forEach((f, i) => tone(f, step * len, type, vol, null, i * step))

  const CUES = {
    click: () => tone(1500, 0.03, "square", 0.04),
    select: () => { tone(660, 0.045, "square", 0.05); tone(990, 0.05, "square", 0.05, null, 0.045) },
    key: () => noise(0.018, 0.05, 2600 + Math.random() * 2400, 0, 3, "highpass"),
    open: () => { tone(400, 0.12, "triangle", 0.07, 900); noise(0.12, 0.03, 800, 0, 4, "bandpass", 4000) },
    shift: () => { noise(0.5, 0.05, 300, 0, 6, "bandpass", 6000); arp([262, 330, 392, 523, 659, 784], 0.07, "square", 0.06) },
    alarm: () => { [0, 0.16, 0.32].forEach((d) => { tone(880, 0.07, "sawtooth", 0.05, null, d); tone(660, 0.07, "sawtooth", 0.05, null, d + 0.08) }); noise(0.1, 0.04, 1200, 0, 8) },
    warn: () => { tone(1175, 0.12, "triangle", 0.07); tone(1568, 0.16, "triangle", 0.05, null, 0.1) },
    spread: () => { noise(0.3, 0.07, 3000, 0, 10, "bandpass", 300); tone(320, 0.28, "square", 0.04, 110) },
    critical: () => { tone(140, 0.45, "square", 0.07, 70); noise(0.4, 0.06, 500, 0, 12, "lowpass"); arp([440, 415, 370], 0.11, "sawtooth", 0.04) },
    fix: () => { arp([523, 659, 784, 1047, 1319], 0.055, "square", 0.06); noise(0.08, 0.025, 6000, 0.27, 2, "highpass") },
    mitigate: () => { tone(523, 0.1, "triangle", 0.08); tone(659, 0.14, "triangle", 0.07, null, 0.09) },
    fail: () => { tone(220, 0.26, "square", 0.06, 120); noise(0.22, 0.05, 700, 0, 16, "lowpass") },
    recover: () => tone(420, 0.16, "sine", 0.08, 1300),
    learn: () => { tone(1568, 0.1, "triangle", 0.05); tone(2093, 0.16, "triangle", 0.05, null, 0.08) },
    hint: () => arp([1319, 1760, 2349], 0.06, "triangle", 0.06),
    dispatch: () => tone(240, 0.12, "square", 0.025, 900),
    notice: () => tone(990, 0.06, "sine", 0.04),
    pause: () => { tone(784, 0.08, "square", 0.05); tone(523, 0.12, "square", 0.05, null, 0.08) },
    resume: () => { tone(523, 0.08, "square", 0.05); tone(784, 0.12, "square", 0.05, null, 0.08) },
    complete: () => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.09, "square", 0.06),
    gameover: () => { arp([392, 370, 349, 330], 0.16, "sawtooth", 0.05); noise(0.8, 0.05, 2000, 0.2, 14, "lowpass", 100) },
  }
  window.lmSfx = (name) => { try { CUES[name] && CUES[name]() } catch (e) {} }

  // Music: the song "lucky-monkey-jungle" on fridge.run's shared music engine (fridge-music.js) - one engine for
  // fridge.run, go.fridge.run/music (where this song can be played and edited) and this game. The threat level is
  // the song's intensity: a drone and birds at first, then shaker, bongos, marimba over Am-F-C-G, a cuica and a low
  // tom, a little faster as it rises. Loaded from fridge.run, with a bundled copy (public/fridge-music.js) offline.
  const SONG = "lucky-monkey-jungle", VOL = 0.4
  const BASE = ((document.currentScript && document.currentScript.src) || "").replace(/sfx\.js[^/]*$/, "")
  let level = 0, loading = null, starting = false
  function withEngine(fn) {
    if (window.FridgeMusic) return fn(window.FridgeMusic)
    if (!loading) loading = new Promise((done) => {
      const add = (src, otherwise) => {
        const s = document.createElement("script")
        s.src = src; s.setAttribute("data-engine-only", "")
        s.onload = () => done(); s.onerror = otherwise
        document.head.appendChild(s)
      }
      add("https://fridge.run/fridge-music.js?v=20261103b", () => add(BASE + "fridge-music.js", () => done()))
    })
    loading.then(() => { if (window.FridgeMusic) fn(window.FridgeMusic) })
  }
  function apply(M) {
    M.setVolume(VOL, !on)
    M.setLevel(level)
    if (level <= 0) { if (M.playing) M.stop(); return }
    if (starting || (M.playing && M.song && M.song.id === SONG)) return
    starting = true            // the browser may hold audio until the first click: start once, not once per call
    M.start(M.songById(SONG)).catch(() => {}).then(() => { starting = false })
  }
  window.lmAmbient = (x) => {
    level = Math.max(0, Math.min(1.5, x || 0))
    withEngine(apply)
  }
  window.lmSfxToggle = () => {
    on = !on
    window.lmSfxOn = on
    try { localStorage.setItem(KEY, on ? "1" : "0") } catch (e) {}
    if (audio()) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05)
    if (window.FridgeMusic) window.FridgeMusic.setVolume(VOL, !on)
    if (on) CUES.select()
    return on
  }
})()
