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

// Board colour themes. 'green' matches Chess.com's signature board; the rest are the
// other common looks. Light/dark are the two square colours.
export const BOARD_THEMES = {
  green: { light: '#ebecd0', dark: '#739552', label: 'Green' },
  brown: { light: '#f0d9b5', dark: '#b58863', label: 'Wood' },
  blue: { light: '#dee3e6', dark: '#8ca2ad', label: 'Blue' },
  slate: { light: '#e6edf2', dark: '#6f97ad', label: 'Slate' },
}
export const DEFAULT_BOARD_THEME = 'green'

// Piece sets. Bundled SVGs live in public/pieces/{key}/{code}.svg. 'neo' is the
// closest free set to Chess.com's look (their actual pieces are proprietary).
export const PIECE_SETS = {
  neo: { label: 'Neo' },
  classic: { label: 'Classic' },
  modern: { label: 'Modern' },
}
export const DEFAULT_PIECE_SET = 'neo'
export const PIECE_CODES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']
