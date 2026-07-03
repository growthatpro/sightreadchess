// How a move is shown in the prompt. Three display styles, all purely cosmetic — the
// correct answer is always the drill's from/to, so nothing about grading changes:
//   • san      — standard: Nf3, exd5, O-O            (the default)
//   • figurine — piece letter → glyph: ♞f3           (the way books print moves)
//   • long     — long algebraic: Ng1-f3, e2-e4, e7-e8=Q  (spells out the from-square)

const GLYPH = { N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' }

export function displaySan(san, notation) {
  if (notation !== 'figurine' || !san) return san
  const first = san[0]
  return GLYPH[first] ? GLYPH[first] + san.slice(1) : san // pawn moves / castling unchanged
}

// Long algebraic needs the move's from-square + piece (a plain SAN string doesn't carry
// them). Castling stays as-is; captures use x, quiet moves use a dash.
export function longAlgebraic({ san, from, to, piece }) {
  if (!san || san.startsWith('O-O')) return san
  const letter = piece && piece !== 'p' ? piece.toUpperCase() : ''
  const sep = san.includes('x') ? 'x' : '-'
  const promo = (san.match(/=[QRBN]/) || [''])[0]
  const mark = (san.match(/[+#]$/) || [''])[0]
  return `${letter}${from}${sep}${to}${promo}${mark}`
}

// Display a move in the chosen notation. Accepts a move object ({san, from, to, piece})
// or a bare SAN string; long algebraic falls back to SAN when from/to aren't available.
export function displayMove(move, notation) {
  if (!move) return ''
  const san = typeof move === 'string' ? move : move.san
  if (notation === 'figurine') return displaySan(san, 'figurine')
  if (notation === 'long' && move && move.from && move.to) return longAlgebraic(move)
  return san
}
