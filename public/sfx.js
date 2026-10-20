// Lucky Monkey sound: tiny synthesized "tech noises" in the spirit of Spybotics:
// square-wave blips, bit-crushed crunches and quick arpeggios, over jungle music
// (a warm drone and birds that grow into bongos, cuica and marimba as the threat rises). No audio files. The game calls:
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

  // Music: jungle at night. A warm low drone is the bed (with birds calling
  // now and then); as the threat rises it grows into a groove: shaker, then
  // bongos, a friction drum (cuica) and soft marimba, then a low tom pulse.
  // Notes are scheduled a little ahead on the audio clock.
  let level = 0, step = 0, nextAt = 0, timer = null, bed = null, nextBird = 0
  // Am - F - C - G, as roots for the marimba.
  const CHORDS = [[220, 262, 330], [175, 220, 262], [262, 330, 392], [196, 247, 294]]
  const MARIMBA = [0, null, 2, null, 1, null, 2, 0]
  const BONGO = [1, 0, 0, 2, 0, 1, 2, 0, 1, 0, 2, 0, 0, 1, 2, 2]   // 1 low, 2 high
  function env(g, t, vol, dur, attack = 0.004) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  }
  function osc(type, f, t, dur, vol, to = null, toAt = dur) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type; o.frequency.setValueAtTime(f, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + toAt)
    env(g, t, vol, dur)
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05)
  }
  function noiseAt(t, dur, vol, freq, type = "bandpass", q = 1) {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    s.buffer = b; f.type = type; f.frequency.value = freq; f.Q.value = q
    env(g, t, vol, dur, 0.003)
    s.connect(f).connect(g).connect(master); s.start(t)
  }
  // Bongo: a skin is a sine that drops in pitch fast, plus a slap of noise.
  const bongo = (t, high, vol) => { osc("sine", high ? 420 : 280, t, 0.18, vol, high ? 300 : 190, 0.06); noiseAt(t, 0.03, vol * 0.5, high ? 2500 : 1500) }
  // Cuica: the friction drum's "whoop", a pitch glide up then down.
  function cuica(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter()
    o.type = "triangle"; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 2
    o.frequency.setValueAtTime(380, t)
    o.frequency.exponentialRampToValueAtTime(760, t + 0.09)
    o.frequency.exponentialRampToValueAtTime(420, t + 0.24)
    env(g, t, vol, 0.26, 0.02)
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.3)
  }
  // Marimba: a soft sine with a quiet, faster-dying 4th harmonic.
  const marimba = (t, f, vol) => { osc("sine", f, t, 0.5, vol); osc("sine", f * 4, t, 0.09, vol * 0.25) }
  const tom = (t, vol) => osc("sine", 110, t, 0.35, vol, 50, 0.25)
  // Birds: a few chirps that slide up or trill.
  function bird(t) {
    const base = 1800 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4), trill = Math.random() < 0.4
    for (let k = 0; k < n; k++) {
      const at = t + k * (trill ? 0.06 : 0.14)
      osc("sine", base * (trill ? 1 : 0.8), at, trill ? 0.05 : 0.11, 0.025, base * (trill ? 1.15 : 1.3), trill ? 0.04 : 0.09)
    }
  }
  function ensureBed() {
    if (bed) return bed
    const g = ctx.createGain(); g.gain.value = 0
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220; lp.Q.value = 0.7
    const a = ctx.createOscillator(), b = ctx.createOscillator(), c = ctx.createOscillator()
    a.type = "sawtooth"; a.frequency.value = 55
    b.type = "sawtooth"; b.frequency.value = 55.3
    c.type = "sine"; c.frequency.value = 82.4   // a fifth above, soft
    const cg = ctx.createGain(); cg.gain.value = 0.4
    a.connect(lp); b.connect(lp); c.connect(cg).connect(lp)
    // Slow breathing in the filter so it isn't static.
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 60
    lfo.connect(lg).connect(lp.frequency)
    lp.connect(g).connect(master)
    ;[a, b, c, lfo].forEach((o) => o.start())
    bed = { g, lp }
    return bed
  }
  function schedule() {
    if (!ctx || level <= 0) return
    const l = level, now = ctx.currentTime
    const b = ensureBed()
    b.g.gain.setTargetAtTime(on ? 0.05 + l * 0.02 : 0, now, 1.2)
    b.lp.frequency.setTargetAtTime(200 + l * 320, now, 1.5)
    if (!on) return
    if (now >= nextBird) {
      bird(now + 0.05)
      nextBird = now + (l > 0.8 ? 9 : 4) + Math.random() * 7
    }
    const bpm = 92 + Math.min(l, 1.4) * 20, sixteenth = 60 / bpm / 4
    if (nextAt < now) nextAt = now + 0.05
    while (nextAt < now + 0.25) {
      const s16 = step % 16, chord = CHORDS[Math.floor(step / 16) % 4], t = nextAt
      if (l > 0.3 && s16 % 2 === 0) noiseAt(t, 0.05, s16 % 4 === 2 ? 0.02 : 0.012, 6500, "highpass")
      if (l > 0.45 && BONGO[s16] && (l > 0.8 || s16 % 4 !== 3)) bongo(t, BONGO[s16] === 2, 0.09)
      if (l > 0.6 && s16 % 2 === 0) {
        const k = MARIMBA[(s16 / 2) % 8]
        if (k !== null) marimba(t, chord[k] * 2, 0.05)
      }
      if (l > 0.7 && (s16 === 6 || (l > 1 && s16 === 14))) cuica(t, 0.05)
      if (l > 0.9 && s16 % 8 === 0) tom(t, 0.12)
      step++
      nextAt += sixteenth
    }
  }
  window.lmAmbient = (x) => {
    level = Math.max(0, Math.min(1.5, x || 0))
    if (!ctx || ctx.state !== "running") return
    if (!timer) timer = setInterval(schedule, 60)
    if (level <= 0 && bed) bed.g.gain.setTargetAtTime(0, ctx.currentTime, 0.6)
  }
  window.lmSfxToggle = () => {
    on = !on
    window.lmSfxOn = on
    try { localStorage.setItem(KEY, on ? "1" : "0") } catch (e) {}
    if (audio()) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05)
    if (on) CUES.select()
    return on
  }
})()
