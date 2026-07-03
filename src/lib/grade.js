// Grading written algebraic notation against a canonical SAN. Shared by the
// single-move writing practice and the sequence-writing mode so the two stay in
// lockstep on what counts as right.

// Strip the check/mate marker + any !? annotations, normalise 0-0 -> O-O.
export function core(s) {
  return s.trim().replace(/[+#]$/, '').replace(/0/g, 'O').replace(/[!?]+$/, '')
}

// Grade a written move against the canonical SAN. Case-insensitive on the move itself
// (mobile keyboards fight uppercase piece letters); the only "almost" is a right move
// with the check/mate marker left off — which we still credit but teach.
export function gradeWritten(input, canonical) {
  const raw = (input || '').trim()
  if (!raw) return { verdict: 'empty' }
  if (core(raw).toLowerCase() === core(canonical).toLowerCase()) {
    const canonMark = (canonical.match(/[+#]$/) || [''])[0]
    const inMark = (raw.match(/[+#]$/) || [''])[0]
    if (canonMark && inMark !== canonMark) {
      return {
        verdict: 'almost',
        note: canonMark === '#' ? 'that’s checkmate' : 'that gives check',
        correct: canonical,
      }
    }
    return { verdict: 'correct', correct: canonical }
  }
  return { verdict: 'wrong', correct: canonical }
}

// A written move counts as right if it's exactly correct or only missing the
// check/mate marker.
export function isRight(verdict) {
  return verdict === 'correct' || verdict === 'almost'
}

// Split a hand-typed move sequence into individual move tokens. Tolerates move
// numbers ("1.", "1...", "12."), the result token, and any whitespace/newlines —
// so "1. e4 e5 2. Nf3" and "e4 e5 Nf3" both parse to the same list.
export function parseMoveSequence(text) {
  return (text || '')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.(\.\.)?/, '').trim()) // strip leading "12." / "12..."
    .filter((t) => t && !/^\d+\.*$/.test(t)) // drop bare move numbers
    .filter((t) => !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) // drop the result token
}
