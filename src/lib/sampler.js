// Draws the next drill for a level from the bundled real-game pool.
// Difficulty stays constant (same pool all the time); only the *mix* of sub-types
// tilts, mildly, toward whatever you've been slow or wrong on.

import drills from '../data/drills.json'
import { subWeights } from './stats'

// Pre-index every level's drills by sub-type once, at module load.
const bySub = {}
for (const [lvl, items] of Object.entries(drills)) {
  bySub[lvl] = {}
  for (const it of items) {
    ;(bySub[lvl][it.sub] ||= []).push(it)
  }
}

export function levelCount(levelId) {
  return (drills[levelId] || []).length
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
