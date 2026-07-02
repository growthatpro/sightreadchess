// Build-time drill generator.
//
// Reads the bundled world-championship PGN files, replays every game with
// chess.js, and turns each half-move into an isolated drill: the position
// BEFORE the move (what you see) + the move to execute (what you read) +
// the position AFTER (shown briefly when you get it wrong).
//
// Output: src/data/drills.json  ->  { L1:[...], L2:[...], ... }
//
// Run with:  npm run drills

import { Chess } from 'chess.js'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { classifyMove, MOVE_LEVEL_IDS } from '../src/lib/levels.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PGN_DIR = join(__dirname, '..', 'src', 'pgn')
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'drills.json')
const GAMES_FILE = join(__dirname, '..', 'src', 'data', 'games.json')

const MAX_PER_LEVEL = 1000 // plenty of day-to-day variety; keeps the bundle small
const MAX_GAMES = 500 // whole-game replay library
const REPLAY_MIN_PLIES = 20 // skip miniatures
const REPLAY_MAX_PLIES = 120 // skip marathon draws — keeps a replay session sane

// Deterministic PRNG (mulberry32) so regenerating gives a stable file / clean diffs.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260702)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Split a multi-game PGN file into individual game strings (each starts at [Event ).
function splitGames(text) {
  return text
    .split(/\n(?=\[Event )/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

const buckets = Object.fromEntries(MOVE_LEVEL_IDS.map((id) => [id, []]))
const seen = new Set() // dedup key: fen|san
const replayGames = [] // whole games (SAN lists) for the replay mode
let games = 0
let badGames = 0
let plies = 0

const files = readdirSync(PGN_DIR).filter((f) => f.endsWith('.pgn')).sort()
for (const file of files) {
  const raw = readFileSync(join(PGN_DIR, file), 'utf8')
  for (const gameText of splitGames(raw)) {
    // Pull the SAN move list out of the recorded game...
    let sans
    let headers = {}
    try {
      const loader = new Chess()
      loader.loadPgn(gameText, { sloppy: true })
      sans = loader.history()
      try {
        headers = loader.header() || {}
      } catch {
        headers = {}
      }
    } catch {
      badGames++
      continue
    }
    if (!sans || sans.length < 4) continue
    games++

    // Keep the full game for replay mode if it's a reasonable length.
    if (sans.length >= REPLAY_MIN_PLIES && sans.length <= REPLAY_MAX_PLIES) {
      replayGames.push({
        w: headers.White || '?',
        b: headers.Black || '?',
        event: headers.Event || '',
        date: headers.Date || '',
        result: headers.Result || '',
        sans,
      })
    }

    // ...then replay it move by move to capture before/after FEN + verbose data.
    const g = new Chess()
    for (const san of sans) {
      let mv
      const before = g.fen()
      try {
        mv = g.move(san)
      } catch {
        break // corrupt movetext mid-game; keep what we already gathered
      }
      if (!mv) break
      const after = g.fen()
      plies++

      const { level, sub } = classifyMove(mv)
      if (!buckets[level]) continue

      const key = `${before}|${mv.san}`
      if (seen.has(key)) continue
      seen.add(key)

      buckets[level].push({
        fen: before,
        after,
        san: mv.san,
        from: mv.from,
        to: mv.to,
        piece: mv.piece,
        color: mv.color, // 'w' | 'b'  (drives the "to move" indicator)
        sub,
      })
    }
  }
}

// Shuffle (so eras are mixed) then cap each level.
const out = {}
const summary = {}
for (const id of MOVE_LEVEL_IDS) {
  shuffle(buckets[id])
  out[id] = buckets[id].slice(0, MAX_PER_LEVEL)
  // per-sub counts for the summary
  const bySub = {}
  for (const d of out[id]) bySub[d.sub] = (bySub[d.sub] || 0) + 1
  summary[id] = { total: out[id].length, pool: buckets[id].length, bySub }
}

writeFileSync(OUT_FILE, JSON.stringify(out))

// Shuffle + cap the replay library.
shuffle(replayGames)
const gamesOut = replayGames.slice(0, MAX_GAMES)
writeFileSync(GAMES_FILE, JSON.stringify(gamesOut))

console.log(`Parsed ${games} games (${badGames} skipped), ${plies} half-moves.`)
console.log(`Wrote ${OUT_FILE}`)
for (const id of MOVE_LEVEL_IDS) {
  const s = summary[id]
  const subs = Object.entries(s.bySub)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
  console.log(`  ${id}  kept ${s.total} / ${s.pool}  (${subs})`)
}
console.log(`Wrote ${GAMES_FILE}`)
console.log(`  L8  kept ${gamesOut.length} / ${replayGames.length} games (replay, ${REPLAY_MIN_PLIES}-${REPLAY_MAX_PLIES} plies)`)
