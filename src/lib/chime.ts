// Aura's signature intro sound — a soft pad swell that rises and falls like a
// breath (matching the logo's "breathe" animation), with one faint bell on top.
// Synthesized with the Web Audio API so it ships no audio assets and, like
// everything else in Aura, never touches the network.

const SWELL_SECONDS = 3.6

function isSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem('aura.settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.soundEffects !== false // default true
    }
  } catch {
    // ignore
  }
  return true
}

/**
 * Plays the intro chime once. If the browser blocks autoplay (no user gesture
 * yet), the swell plays alongside the user's first tap/keypress instead.
 * Returns a stop function that fades the sound out and releases the AudioContext.
 */
export function playIntroChime(): () => void {
  if (!isSoundEnabled()) return () => {}
  const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctx) return () => {}
  let ctx: AudioContext
  try {
    ctx = new Ctx()
  } catch {
    return () => {}
  }

  let master: GainNode | null = null
  let removeGestureListeners = () => {}

  const start = () => {
    if (master || ctx.state === 'closed') return
    removeGestureListeners()
    const now = ctx.currentTime

    master = ctx.createGain()
    master.connect(ctx.destination)

    // A slowly opening low-pass keeps the attack soft, like an inhale.
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(400, now)
    filter.frequency.linearRampToValueAtTime(2400, now + 1.6)
    filter.connect(master)

    const pad = ctx.createGain()
    pad.gain.setValueAtTime(0.0001, now)
    pad.gain.exponentialRampToValueAtTime(0.11, now + 1.3) // breath in
    pad.gain.setValueAtTime(0.11, now + 1.9) // brief hold
    pad.gain.exponentialRampToValueAtTime(0.0001, now + SWELL_SECONDS) // breath out
    pad.connect(filter)

    // Warm A-major voicing; each note doubled slightly detuned for a soft chorus.
    for (const freq of [220, 329.63, 440, 554.37]) {
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        osc.detune.value = detune
        osc.connect(pad)
        osc.start(now)
        osc.stop(now + SWELL_SECONDS)
      }
    }

    // One faint high bell — the "spark" as the logo settles.
    const bellGain = ctx.createGain()
    bellGain.gain.setValueAtTime(0.0001, now + 0.9)
    bellGain.gain.exponentialRampToValueAtTime(0.045, now + 1.05)
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8)
    bellGain.connect(master)
    const bell = ctx.createOscillator()
    bell.type = 'sine'
    bell.frequency.value = 1760 // A6
    bell.connect(bellGain)
    bell.start(now + 0.9)
    bell.stop(now + 2.9)

    // Release the context once the sound has fully died away.
    window.setTimeout(() => ctx.close().catch(() => {}), (SWELL_SECONDS + 0.3) * 1000)
  }

  if (ctx.state === 'suspended') {
    // Autoplay is blocked until the first user interaction — arm a one-shot
    // gesture handler so the swell accompanies that first tap instead.
    const onGesture = () => {
      removeGestureListeners()
      ctx.resume().then(start).catch(() => {})
    }
    removeGestureListeners = () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)
  } else {
    start()
  }

  return () => {
    removeGestureListeners()
    if (ctx.state === 'closed') return
    if (master) {
      // Quick fade instead of a hard cut, so stopping never clicks.
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0.0001, now + 0.15)
      window.setTimeout(() => ctx.close().catch(() => {}), 200)
    } else {
      ctx.close().catch(() => {})
    }
  }
}

/**
 * Plays a fast, soft click/tap sound for buttons and toggles.
 */
export function playTapChime() {
  if (!isSoundEnabled()) return
  const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctx) return
  let ctx: AudioContext
  try {
    ctx = new Ctx()
  } catch {
    return
  }
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now) // A5
  
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.03, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.start(now)
  osc.stop(now + 0.2)
  window.setTimeout(() => ctx.close().catch(() => {}), 250)
}

/**
 * Plays an ascending soft dual-bell chime for page navigation.
 */
export function playNavChime() {
  if (!isSoundEnabled()) return
  const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctx) return
  let ctx: AudioContext
  try {
    ctx = new Ctx()
  } catch {
    return
  }
  const now = ctx.currentTime
  
  // First note: C5 (523.25 Hz)
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(523.25, now)
  gain1.gain.setValueAtTime(0.0001, now)
  gain1.gain.exponentialRampToValueAtTime(0.02, now + 0.01)
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.45)
  
  // Second note: E5 (659.25 Hz) slightly delayed
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(659.25, now + 0.08)
  gain2.gain.setValueAtTime(0.0001, now + 0.08)
  gain2.gain.exponentialRampToValueAtTime(0.02, now + 0.09)
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.48)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.08)
  osc2.stop(now + 0.5)

  window.setTimeout(() => ctx.close().catch(() => {}), 600)
}

/**
 * Plays a warm, descending dual-resonance chime for AI reply completion.
 */
export function playReplyChime() {
  if (!isSoundEnabled()) return
  const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctx) return
  let ctx: AudioContext
  try {
    ctx = new Ctx()
  } catch {
    return
  }
  const now = ctx.currentTime
  
  // High note: G5 (783.99 Hz)
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(783.99, now)
  gain1.gain.setValueAtTime(0.0001, now)
  gain1.gain.exponentialRampToValueAtTime(0.015, now + 0.02)
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.55)
  
  // Low note: C5 (523.25 Hz) slightly delayed
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(523.25, now + 0.12)
  gain2.gain.setValueAtTime(0.0001, now + 0.12)
  gain2.gain.exponentialRampToValueAtTime(0.025, now + 0.14)
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.12)
  osc2.stop(now + 0.75)

  window.setTimeout(() => ctx.close().catch(() => {}), 900)
}
