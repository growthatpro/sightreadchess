// How a move is shown in the prompt. SAN is the default; figurine swaps the piece
// letter for its chess glyph (♞f3) — the way annotated books print moves. This is
// display only: the correct answer is still the drill's from/to, so nothing about
// grading changes.

const GLYPH = { N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' }

export function displaySan(san, notation) {
  if (notation !== 'figurine' || !san) return san
  const first = san[0]
  return GLYPH[first] ? GLYPH[first] + san.slice(1) : san // pawn moves / castling unchanged
}
