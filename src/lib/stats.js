// Per-level progress, persisted to browser localStorage.
// Tracks: round history (median decode latency + accuracy), best streaks, and
// per-sub-type attempt/error/latency data that drives the light within-level weighting.

const KEY = 'sightread.v1'

function blankLevel() {
  return { rounds: [], bestStreak: 0, bestMedianMs: null, bestAccuracy: 0, subs: {} }
}

function defaults() {
  return { settings: { coords: 'on', orientation: 'white', notation: 'san' }, levels: {} }
}

let cache = null

function read() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? { ...defaults(), ...JSON.parse(raw) } : defaults()
  } catch {
    cache = defaults()
  }
  if (!cache.settings) cache.settings = { coords: true }
  if (!cache.levels) cache.levels = {}
  return cache
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage full / disabled — run stays in-memory */
  }
}

function level(id) {
  const s = read()
  if (!s.levels[id]) s.levels[id] = blankLevel()
  const l = s.levels[id]
  if (!l.subs) l.subs = {}
  if (!l.rounds) l.rounds = []
  return l
}

export function median(arr) {
  if (!arr || !arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ---- settings ----
// Coordinate labels: 'on' (always) | 'peek' (hidden, hold-to-reveal) | 'off' (never).
const COORD_MODES = ['on', 'peek', 'off']
export function getCoordMode() {
  const c = read().settings.coords
  if (c === true || c === undefined) return 'on' // migrate old boolean
  if (c === false) return 'off'
  return COORD_MODES.includes(c) ? c : 'on'
}
export function setCoordMode(mode) {
  read().settings.coords = COORD_MODES.includes(mode) ? mode : 'on'
  write()
}
export function getOrientation() {
  return read().settings.orientation || 'white'
}
export function setOrientation(v) {
  read().settings.orientation = v
  write()
}
export function getNotation() {
  return read().settings.notation || 'san'
}
export function setNotation(v) {
  read().settings.notation = v
  write()
}

// ---- per-attempt (feeds the weighting) ----
export function recordAttempt(levelId, sub, correct, ms) {
  const l = level(levelId)
  if (!l.subs[sub]) l.subs[sub] = { attempts: 0, errors: 0, latencies: [] }
  const st = l.subs[sub]
  st.attempts += 1
  if (!correct) st.errors += 1
  if (correct && ms != null) {
    st.latencies.push(Math.round(ms))
    if (st.latencies.length > 30) st.latencies.shift() // keep it recent
  }
  write()
}

// Mild weights (1..3) per sub, biased toward slow/wrong sub-types. Neutral until
// there's enough data. This is the whole "adaptive" story — nothing hidden.
export function subWeights(levelId, subs) {
  const l = level(levelId)
  return subs.map((sub) => {
    const st = l.subs[sub]
    if (!st || st.attempts < 5) return 1
    const errRate = st.errors / st.attempts
    const med = median(st.latencies)
    const latPenalty = med == null ? 0 : Math.max(0, Math.min(1, (med - 1500) / 3000))
    const weakness = 0.6 * errRate + 0.4 * latPenalty
    return 1 + 2 * weakness
  })
}

// The single weakest sub in a level (for the "focus" hint). null if not enough data.
export function weakestSub(levelId, subs, subLabels = {}) {
  const l = level(levelId)
  let worst = null
  let worstScore = 0
  for (const sub of subs) {
    const st = l.subs[sub]
    if (!st || st.attempts < 5) continue
    const errRate = st.errors / st.attempts
    const med = median(st.latencies)
    const latPenalty = med == null ? 0 : Math.max(0, Math.min(1, (med - 1500) / 3000))
    const weakness = 0.6 * errRate + 0.4 * latPenalty
    if (weakness > worstScore + 0.001) {
      worstScore = weakness
      worst = sub
    }
  }
  if (!worst || worstScore < 0.15) return null
  return subLabels[worst] || worst
}

// ---- per-round ----
export function recordRound(levelId, summary) {
  const l = level(levelId)
  l.rounds.push({
    ts: Date.now(),
    medianMs: summary.medianMs,
    accuracy: summary.accuracy,
    correct: summary.correct,
    attempts: summary.attempts,
    bestStreak: summary.bestStreak,
  })
  if (l.rounds.length > 60) l.rounds = l.rounds.slice(-60)
  if (summary.bestStreak > (l.bestStreak || 0)) l.bestStreak = summary.bestStreak
  if (summary.medianMs != null && (l.bestMedianMs == null || summary.medianMs < l.bestMedianMs)) {
    l.bestMedianMs = summary.medianMs
  }
  if (summary.accuracy > (l.bestAccuracy || 0)) l.bestAccuracy = summary.accuracy
  write()
}

export function levelSummary(id) {
  const l = level(id)
  const rounds = l.rounds || []
  return {
    played: rounds.length,
    bestStreak: l.bestStreak || 0,
    bestMedianMs: l.bestMedianMs ?? null,
    bestAccuracy: l.bestAccuracy || 0,
    last: rounds.length ? rounds[rounds.length - 1] : null,
    rounds,
  }
}

export function resetAll() {
  cache = defaults()
  write()
}
