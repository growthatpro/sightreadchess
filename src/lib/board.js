// Tiny FEN helpers — no chess engine needed at runtime.

// Map of occupied squares -> 'w' | 'b', parsed from a FEN's placement field.
export function occupiedSquares(fen) {
  const placement = fen.split(' ')[0]
  const rows = placement.split('/')
  const occ = {}
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r
    let file = 0
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        file += parseInt(ch, 10)
      } else {
        const sq = 'abcdefgh'[file] + rank
        occ[sq] = ch === ch.toUpperCase() ? 'w' : 'b'
        file += 1
      }
    }
  }
  return occ
}

export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'
