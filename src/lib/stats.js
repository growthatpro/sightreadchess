// Per-level progress, persisted to browser localStorage.
// Tracks: round history (median decode latency + accuracy), best streaks, and
// per-sub-type attempt/error/latency data that drives the light within-level weighting.

import { LEVELS } from './levels'

const KEY = 'sightread.v1'

function blankLevel() {
  return { rounds: [], bestStreak: 0, bestMedianMs: null, bestAccuracy: 0, subs: {} }
}

function defaults() {
  return {
    settings: { coords: 'on', orientation: 'white', notation: 'san', boardTheme: 'green', pieceSet: 'neo' },
    levels: {},
  }
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
export function getBoardTheme() {
  return read().settings.boardTheme || 'green'
}
export function setBoardTheme(v) {
  read().settings.boardTheme = v
  write()
}
export function getPieceSet() {
  return read().settings.pieceSet || 'neo'
}
export function setPieceSet(v) {
  read().settings.pieceSet = v
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

// ---- cross-level aggregation (feeds the progress dashboard) ----

// Local YYYY-MM-DD key for a timestamp.
export function dayKey(ts) {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Every round across every level, tagged with its level id, oldest first.
export function allRounds() {
  const s = read()
  const out = []
  for (const [id, l] of Object.entries(s.levels || {})) {
    for (const r of l.rounds || []) out.push({ ...r, levelId: id })
  }
  return out.sort((a, b) => a.ts - b.ts)
}

// Map of dayKey -> { rounds, moves } (moves = correct moves that day).
export function dailyActivity() {
  const map = new Map()
  for (const r of allRounds()) {
    const k = dayKey(r.ts)
    const cur = map.get(k) || { rounds: 0, moves: 0 }
    cur.rounds += 1
    cur.moves += r.correct || 0
    map.set(k, cur)
  }
  return map
}

// Consecutive days practiced, counting back from today (today not-yet-played
// doesn't break a streak that's still alive — we start from yesterday then).
export function dailyStreak() {
  const map = dailyActivity()
  if (map.size === 0) return 0
  const d = new Date()
  if (!map.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (map.has(dayKey(d.getTime()))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// Headline totals across the whole app.
export function overallStats() {
  const rounds = allRounds()
  const moves = rounds.reduce((a, r) => a + (r.correct || 0), 0)
  const attempts = rounds.reduce((a, r) => a + (r.attempts || 0), 0)
  return {
    rounds: rounds.length,
    moves,
    attempts,
    accuracy: attempts ? moves / attempts : 0,
    days: dailyActivity().size,
    streak: dailyStreak(),
    firstTs: rounds.length ? rounds[0].ts : null,
    lastTs: rounds.length ? rounds[rounds.length - 1].ts : null,
  }
}

// Per-sub-type performance across every level, weakest first. This is the
// "which move-types are still slowest / wrongest" breakdown.
export function moveTypeStats() {
  const s = read()
  const out = []
  for (const lvl of LEVELS) {
    if (!lvl.subs || !lvl.subs.length) continue
    const l = s.levels[lvl.id]
    if (!l || !l.subs) continue
    for (const sub of lvl.subs) {
      const st = l.subs[sub]
      if (!st || !st.attempts) continue
      const med = median(st.latencies)
      const errRate = st.errors / st.attempts
      const latPenalty = med == null ? 0 : Math.max(0, Math.min(1, (med - 1500) / 3000))
      const weakness = 0.6 * errRate + 0.4 * latPenalty
      out.push({
        levelId: lvl.id,
        levelName: lvl.name,
        sub,
        label: (lvl.subLabels && lvl.subLabels[sub]) || sub,
        attempts: st.attempts,
        errors: st.errors,
        errRate,
        accuracy: 1 - errRate,
        medianMs: med,
        weakness,
      })
    }
  }
  return out.sort((a, b) => b.weakness - a.weakness)
}

// Per-day latency + accuracy for one level (a round's median stands in for its
// day; multiple rounds in a day are averaged). Oldest first.
export function levelDailySeries(levelId) {
  const l = level(levelId)
  const byDay = new Map()
  for (const r of l.rounds || []) {
    const k = dayKey(r.ts)
    const cur = byDay.get(k) || { lat: [], acc: [] }
    if (r.medianMs != null) cur.lat.push(r.medianMs)
    if (r.accuracy != null) cur.acc.push(r.accuracy)
    byDay.set(k, cur)
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({
      date,
      medianMs: v.lat.length ? median(v.lat) : null,
      accuracy: v.acc.length ? v.acc.reduce((a, b) => a + b, 0) / v.acc.length : null,
    }))
}
