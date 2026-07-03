// Tiny sound + haptic feedback. All tones are generated with the Web Audio API —
// no audio files to download, nothing to bundle. Everything is gated on the sound
// setting and wrapped so a missing/blocked AudioContext just no-ops silently.

import { getSound } from './stats'

let ctx = null

// Lazily create (and resume) the AudioContext. Browsers require a user gesture before
// audio can start; every drill begins after a tap/click, so by the time we play a
// tone the context is unlocked.
function audio() {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

// Play one enveloped tone. gain fades in and out so there's no click.
function tone(freq, start, dur, { type = 'sine', gain = 0.14 } = {}) {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime + start
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* unsupported — ignore */
  }
}

const on = () => getSound() === 'on'

// A bright two-note lift on a correct move.
export function playCorrect() {
  if (!on()) return
  tone(660, 0, 0.09, { type: 'triangle' })
  tone(988, 0.06, 0.11, { type: 'triangle' })
}

// A short low buzz + a phone tap on a miss.
export function playWrong() {
  if (!on()) return
  tone(180, 0, 0.16, { type: 'sawtooth', gain: 0.1 })
  tone(150, 0.06, 0.18, { type: 'sawtooth', gain: 0.09 })
  vibrate(40)
}

// A little ascending arpeggio when a round/test finishes.
export function playFinish() {
  if (!on()) return
  const notes = [523, 659, 784, 1047] // C E G C
  notes.forEach((f, i) => tone(f, i * 0.1, 0.16, { type: 'triangle', gain: 0.13 }))
}

// A soft tick for milestones (e.g., a new personal best mid-test). Optional callers.
export function playTick() {
  if (!on()) return
  tone(880, 0, 0.05, { type: 'sine', gain: 0.08 })
}
