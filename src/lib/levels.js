// The curriculum. Shared by the build-time drill generator and the app.
// Ladder (easiest first): learn the grid itself, then coordinates, then moves of
// rising complexity, then whole games. Each move level lists the sub-types it drills;
// light within-level weighting nudges reps toward whatever you've been slow/wrong on.

export const LEVELS = [
  {
    id: 'L0',
    kind: 'filerank',
    name: 'Files & ranks',
    blurb: 'Learn where each file and rank lives',
    examples: ['e-file', 'rank 4'],
    subs: ['file', 'rank'],
    subLabels: { file: 'files', rank: 'ranks' },
  },
  {
    id: 'L1',
    kind: 'coords',
    name: 'Coordinate warm-up',
    blurb: 'Click the named square',
    examples: ['f6', 'c3', 'h7'],
    subs: ['square'],
  },
  {
    id: 'L2',
    kind: 'move',
    name: 'Pawn moves',
    blurb: 'Simple pawn pushes',
    examples: ['e4', 'd5', 'c6'],
    subs: ['pawn-push'],
    subLabels: { 'pawn-push': 'pawn push' },
  },
  {
    id: 'L3',
    kind: 'move',
    name: 'Piece moves',
    blurb: 'Knights, bishops, rooks, queen, king',
    examples: ['Nf3', 'Bb5', 'Qd2'],
    subs: ['N', 'B', 'R', 'Q', 'K'],
    subLabels: { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' },
  },
  {
    id: 'L4',
    kind: 'move',
    name: 'Captures',
    blurb: 'Piece captures and pawn captures',
    examples: ['Nxe5', 'exd5', 'Bxf7'],
    subs: ['piece-capture', 'pawn-capture'],
    subLabels: { 'piece-capture': 'piece capture', 'pawn-capture': 'pawn capture' },
  },
  {
    id: 'L5',
    kind: 'move',
    name: 'Castling',
    blurb: 'Move the king two squares',
    examples: ['O-O', 'O-O-O'],
    subs: ['O-O', 'O-O-O'],
    subLabels: { 'O-O': 'kingside', 'O-O-O': 'queenside' },
  },
  {
    id: 'L6',
    kind: 'move',
    name: 'Promotion & en passant',
    blurb: 'Promote a pawn, or capture en passant',
    examples: ['e8=Q', 'exd6', 'a1=N'],
    subs: ['promotion', 'en-passant'],
    subLabels: { promotion: 'promotion', 'en-passant': 'en passant' },
  },
  {
    id: 'L7',
    kind: 'move',
    name: 'Disambiguation',
    blurb: 'Two pieces can reach the same square',
    examples: ['Nbd7', 'R1e2', 'Qh4e1'],
    subs: ['disambiguation'],
    subLabels: { disambiguation: 'disambiguation' },
  },
  {
    id: 'MIX',
    kind: 'mixed',
    name: 'Mixed drills',
    blurb: 'Every move type, shuffled together — rapid fire',
    examples: ['e4', 'Nxe5', 'O-O', 'Nbd7'],
    subs: [],
  },
  {
    id: 'L8',
    kind: 'replay',
    name: 'Whole game',
    blurb: 'Read a real game, move by move',
    examples: ['e4', 'c6', 'd4'],
    subs: [],
  },
]

export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]))

// Levels that pull drills from the bundled PGN games (the move levels).
export const MOVE_LEVEL_IDS = LEVELS.filter((l) => l.kind === 'move').map((l) => l.id)

// Classify one chess.js verbose move into a level id + sub-type.
// Order matters: castle > promotion > en passant > pawn capture > pawn push >
// (piece) disambiguation > piece capture > plain piece move.
// Check/mate (+ / #) are deliberately NOT a level — they ride along passively.
export function classifyMove(move) {
  const flags = move.flags || ''
  const piece = move.piece // p n b r q k
  const san = (move.san || '').replace(/[+#]$/, '')

  if (flags.includes('k')) return { level: 'L5', sub: 'O-O' }
  if (flags.includes('q')) return { level: 'L5', sub: 'O-O-O' }
  if (flags.includes('p')) return { level: 'L6', sub: 'promotion' }
  if (flags.includes('e')) return { level: 'L6', sub: 'en-passant' }

  if (piece === 'p') {
    if (flags.includes('c')) return { level: 'L4', sub: 'pawn-capture' }
    return { level: 'L2', sub: 'pawn-push' }
  }

  // Piece move (N/B/R/Q/K). Detect a file/rank disambiguator in the SAN.
  const letter = piece.toUpperCase()
  let rest = san.slice(1).replace('x', '') // strip piece letter + capture marker
  const disambig = rest.slice(0, -2) // whatever sits before the 2-char destination
  if (disambig.length > 0) return { level: 'L7', sub: 'disambiguation' }
  if (flags.includes('c')) return { level: 'L4', sub: 'piece-capture' }
  return { level: 'L3', sub: letter }
}
