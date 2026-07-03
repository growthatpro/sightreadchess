// Sightreading Elo — the math behind Test Mode.
//
// The whole app is about reading notation FAST, so the rating rewards speed, not
// just accuracy. Every drill has a difficulty in rating points (a pawn push is easy,
// a disambiguation is hard) and a "par time." Beat par on a correct move → you score
// above 1; slow-but-correct → below 1; wrong → 0. An iterative Elo update with a
// shrinking K converges on one number over a ~24-item adaptive test. Nothing hidden.

import drills from '../data/drills.json'

export const TEST_LENGTH = 24
export const DEFAULT_SEED = 800

// Base difficulty (rating points) per move sub-type — the reading-difficulty ladder.
export const SUB_DIFFICULTY = {
  'pawn-push': 550,
  'O-O': 700,
  'O-O-O': 820,
  N: 950,
  B: 1000,
  R: 1080,
  Q: 1150,
  K: 1250,
  'pawn-capture': 1350,
  'piece-capture': 1480,
  promotion: 1700,
  'en-passant': 2000,
  disambiguation: 2200,
}

// Bands — a plain-language label for a rating.
const BANDS = [
  [600, 'Beginner'],
  [1000, 'Novice'],
  [1400, 'Casual'],
  [1800, 'Club'],
  [2200, 'Advanced'],
  [2600, 'Expert'],
  [Infinity, 'Master'],
]
export function bandFor(rating) {
  for (const [ceil, label] of BANDS) if (rating < ceil) return label
  return 'Master'
}

// Flatten every drill into pools keyed by sub-type, each tagged with its difficulty.
const POOL = (() => {
  const bySub = {}
  for (const items of Object.values(drills)) {
    for (const d of items) {
      const diff = SUB_DIFFICULTY[d.sub]
      if (diff == null) continue
      ;(bySub[d.sub] ||= { sub: d.sub, difficulty: diff, items: [] }).items.push(d)
    }
  }
  return Object.values(bySub).sort((a, b) => a.difficulty - b.difficulty)
})()

// Pick a drill whose difficulty sits near the current rating. A little jitter (drawing
// from the 2-3 nearest sub-types) keeps consecutive items varied.
export function pickDrillNear(rating) {
  if (!POOL.length) return null
  const ranked = [...POOL].sort(
    (a, b) => Math.abs(a.difficulty - rating) - Math.abs(b.difficulty - rating)
  )
  const near = ranked.slice(0, 3)
  const weights = near.map((_, i) => (i === 0 ? 0.6 : i === 1 ? 0.3 : 0.1))
  let r = Math.random()
  let pick = near[0]
  for (let i = 0; i < near.length; i++) {
    r -= weights[i]
    if (r <= 0) {
      pick = near[i]
      break
    }
  }
  const drill = pick.items[Math.floor(Math.random() * pick.items.length)]
  return { drill, difficulty: pick.difficulty, sub: pick.sub }
}

// Hidden labels make the same read harder, so the item counts for more.
export function itemDifficulty(baseDifficulty, coordMode) {
  if (coordMode === 'off') return baseDifficulty + 140
  if (coordMode === 'peek') return baseDifficulty + 60
  return baseDifficulty
}

// Par time (ms) for a read of the given difficulty — harder notation earns more time.
export function parMs(difficulty) {
  return 900 + difficulty * 0.75
}

// The score of an item is binary — you either read the move or you didn't.
export function scoreFor(correct) {
  return correct ? 1 : 0
}

// Speed folds into the DIFFICULTY, not the score: reading a move fast means you
// effectively beat a harder item (that's what separates a 2200 reader from a 3000
// one — both are correct, one is quicker). A wrong answer just counts as the base
// item. Beating par 2× → +500; 4× → +1000 (capped). Slow-correct dips a little.
export function effectiveDifficulty(correct, baseDifficulty, ms) {
  if (!correct) return baseDifficulty
  const bonus = Math.max(-300, Math.min(1100, 500 * Math.log2(parMs(baseDifficulty) / ms)))
  return baseDifficulty + bonus
}

// Expected score of a `rating` player against an item — standard logistic.
export function expectedScore(rating, difficulty) {
  return 1 / (1 + Math.pow(10, (difficulty - rating) / 400))
}

// K shrinks across the test (110 → 32) so early items move the needle and it converges.
export function kForStep(i, n = TEST_LENGTH) {
  const t = n > 1 ? i / (n - 1) : 1
  return 110 - 78 * t
}

// One rating update.
export function updateRating(rating, difficulty, score, k) {
  const next = rating + k * (score - expectedScore(rating, difficulty))
  return Math.max(100, Math.round(next))
}
