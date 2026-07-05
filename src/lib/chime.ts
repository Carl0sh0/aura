// Aura's signature intro sound — a soft pad swell that rises and falls like a
// breath (matching the logo's "breathe" animation), with one faint bell on top.
// Synthesized with the Web Audio API so it ships no audio assets and, like
// everything else in Aura, never touches the network.

const SWELL_SECONDS = 3.6

/**
 * Plays the intro chime once. If the browser blocks autoplay (no user gesture
 * yet), the swell plays alongside the user's first tap/keypress instead.
 * Returns a stop function that fades the sound out and releases the AudioContext.
 */
export function playIntroChime(): () => void {
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
