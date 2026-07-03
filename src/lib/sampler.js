// Draws the next drill for a level from the bundled real-game pool.
// Difficulty stays constant (same pool all the time); only the *mix* of sub-types
// tilts, mildly, toward whatever you've been slow or wrong on.

import drills from '../data/drills.json'
import { subWeights } from './stats'
import { MOVE_LEVEL_IDS } from './levels'

// Pre-index every level's drills by sub-type once, at module load.
const bySub = {}
for (const [lvl, items] of Object.entries(drills)) {
  bySub[lvl] = {}
  for (const it of items) {
    ;(bySub[lvl][it.sub] ||= []).push(it)
  }
}

export function levelCount(levelId) {
  if (levelId === 'MIX') return MOVE_LEVEL_IDS.reduce((n, id) => n + (drills[id] || []).length, 0)
  return (drills[levelId] || []).length
}

// Draw a drill from a random move level — the shared engine behind the Mixed level
// and Writing practice (both span every notation type).
function nextAnyMoveDrill(avoidFen) {
  const ids = MOVE_LEVEL_IDS.filter((id) => (drills[id] || []).length > 0)
  if (!ids.length) return null
  const levelId = ids[Math.floor(Math.random() * ids.length)]
  return nextDrill(levelId, avoidFen)
}

export function subsPresent(levelId) {
  return Object.keys(bySub[levelId] || {})
}

function weightedPick(subs, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < subs.length; i++) {
    r -= weights[i]
    if (r <= 0) return subs[i]
  }
  return subs[subs.length - 1]
}

export function nextDrill(levelId, avoidFen) {
  if (levelId === 'MIX') return nextAnyMoveDrill(avoidFen)
  const subs = subsPresent(levelId)
  if (!subs.length) return null
  const sub = weightedPick(subs, subWeights(levelId, subs))
  const pool = bySub[levelId][sub]
  let d = pool[Math.floor(Math.random() * pool.length)]
  if (avoidFen && pool.length > 1) {
    let tries = 0
    while (d.fen === avoidFen && tries < 6) {
      d = pool[Math.floor(Math.random() * pool.length)]
      tries += 1
    }
  }
  return d
}

// A drill for writing practice — mixed across every move level so it spans all the
// notation types (pawn, piece, capture, castle, promotion, disambiguation).
export function nextWritingDrill(avoidFen) {
  const ids = MOVE_LEVEL_IDS.filter((id) => levelCount(id) > 0)
  if (!ids.length) return null
  const levelId = ids[Math.floor(Math.random() * ids.length)]
  const d = nextDrill(levelId, avoidFen)
  return d ? { ...d, levelId } : null
}
