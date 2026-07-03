// Build-time annotated-game compiler.
//
// Reads the hand-picked annotated PGNs in src/annotated-pgn/ (famous games with
// commentary written into the movetext as {comments}), validates every move with
// chess.js, and pairs each comment with the half-move it follows.
//
// Output: src/data/annotated.json  ->  [{ id, title, matchup, w, b, event, date,
//   result, blurb, sans:[...], comments:[...] }]  where comments[i] is the note shown
//   on ply i (empty string when a move has no note).
//
// Run with:  npm run annotated

import { Chess } from 'chess.js'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PGN_DIR = join(__dirname, '..', 'src', 'annotated-pgn')
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'annotated.json')

// "Tal, Mihail" / "Paul Morphy" -> a short label for the matchup line.
function shortName(n) {
  if (!n || n === '?') return 'Unknown'
  return n.includes(',') ? n.split(',')[0].trim() : n.trim()
}

const files = readdirSync(PGN_DIR)
  .filter((f) => f.endsWith('.pgn'))
  .sort()

const out = []
let failed = 0

for (const file of files) {
  const id = basename(file, '.pgn')
  const raw = readFileSync(join(PGN_DIR, file), 'utf8')

  const chess = new Chess()
  try {
    chess.loadPgn(raw, { sloppy: true }) // throws on any illegal move
  } catch (err) {
    failed++
    console.error(`✗ ${file}: ${err.message}`)
    continue
  }

  const headers = chess.header() || {}
  const sans = chess.history()

  // Replay to map each resulting FEN -> ply index (comments are keyed by the FEN
  // that follows the move they annotate).
  const fenToPly = new Map()
  const replay = new Chess()
  sans.forEach((san, i) => {
    replay.move(san)
    fenToPly.set(replay.fen(), i)
  })

  const comments = new Array(sans.length).fill('')
  for (const { fen, comment } of chess.getComments()) {
    const ply = fenToPly.get(fen)
    if (ply != null) comments[ply] = comment.trim()
  }

  // Blurb is a custom header; fall back to a direct regex in case the parser drops it.
  const blurb =
    headers.Blurb || (raw.match(/\[Blurb\s+"([^"]*)"\]/) || [])[1] || ''

  const w = headers.White || '?'
  const b = headers.Black || '?'

  out.push({
    id,
    title: headers.Event || `${shortName(w)} — ${shortName(b)}`,
    matchup: `${shortName(w)} vs ${shortName(b)}`,
    w,
    b,
    event: headers.Event || '',
    date: headers.Date || '',
    result: headers.Result || '',
    blurb,
    sans,
    comments,
  })

  const noted = comments.filter(Boolean).length
  console.log(`✓ ${id}  ${sans.length} plies, ${noted} notes  (${shortName(w)} vs ${shortName(b)})`)
}

if (failed) {
  console.error(`\n${failed} game(s) failed to parse — fix the movetext above. Nothing written.`)
  process.exit(1)
}

writeFileSync(OUT_FILE, JSON.stringify(out))
console.log(`\nWrote ${OUT_FILE}  (${out.length} annotated games)`)
