import { useCallback, useMemo, useReducer, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { occupiedSquares, BOARD_THEMES, PIECE_CODES } from '../lib/board'
import { getBoardTheme, getPieceSet } from '../lib/stats'

// The board. Two ways to move: drag a piece, or click source then destination.
// Deliberately NO legal-move highlighting and NO legal-only constraint — that would
// leak the answer. The only highlight is your selected source square, plus whatever
// feedback squares the round passes in (the correct move, flashed on a miss).
//
// react-chessboard memoizes its squares and can keep calling a stale onSquareClick
// closure, so the handlers have STABLE identities (useCallback []) and read every
// live value — interaction, fen, onAttempt — out of a ref. Selection also lives in a
// ref (read synchronously; two fast clicks can't race a state flush) and is reset
// synchronously the instant the position changes.
export default function Board({
  fen,
  orientation = 'white',
  showCoords,
  boardWidth,
  interactionEnabled,
  onAttempt,
  highlightSquares,
  theme,
  pieceSet,
  arrows,
  hidePieces = false, // blindfold mode — pieces invisible, squares still clickable
  animationMs = 140, // 140 to slide a played move; 0 to snap a fresh position (no teleport)
}) {
  const live = useRef({})
  live.current = { fen, interactionEnabled, onAttempt }
  const t = BOARD_THEMES[theme || getBoardTheme()] || BOARD_THEMES.green

  const setKey = pieceSet || getPieceSet()
  const customPieces = useMemo(() => {
    const cp = {}
    for (const code of PIECE_CODES) {
      const src = `/pieces/${setKey}/${code}.svg`
      cp[code] = ({ squareWidth }) => (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: squareWidth,
            height: squareWidth,
            pointerEvents: 'none',
            opacity: hidePieces ? 0 : 1,
          }}
        />
      )
    }
    return cp
  }, [setKey, hidePieces])

  const selectedRef = useRef(null)
  const prevFen = useRef(fen)
  const [, force] = useReducer((x) => x + 1, 0)

  // Position changed (new drill, or the feedback swap) -> drop any stale selection.
  // Done during render so it can never fire after a later click.
  if (prevFen.current !== fen) {
    prevFen.current = fen
    selectedRef.current = null
  }

  const handleDrop = useCallback((source, target) => {
    const { interactionEnabled, onAttempt } = live.current
    if (!interactionEnabled) return false
    selectedRef.current = null
    force()
    onAttempt(source, target)
    return false // we drive the board purely from state; never let it self-mutate
  }, [])

  const handleSquareClick = useCallback((...args) => {
    const { fen, interactionEnabled, onAttempt } = live.current
    if (!interactionEnabled) return
    const sq = /^[a-h][1-8]$/.test(args[0]) ? args[0] : args[1]
    if (!sq) return
    const cur = selectedRef.current
    if (!cur) {
      if (!occupiedSquares(fen)[sq]) return // a move has to start from a piece
      selectedRef.current = sq
      force()
    } else if (cur === sq) {
      selectedRef.current = null
      force()
    } else {
      selectedRef.current = null
      onAttempt(cur, sq)
      force()
    }
  }, [])

  const sel = selectedRef.current
  const squareStyles = { ...(highlightSquares || {}) }
  if (sel) {
    squareStyles[sel] = {
      ...(squareStyles[sel] || {}),
      boxShadow: 'inset 0 0 0 4px rgba(56, 189, 248, 0.95)',
    }
  }

  return (
    <Chessboard
      id="sightread-board"
      position={fen}
      boardWidth={boardWidth}
      showBoardNotation={showCoords}
      boardOrientation={orientation}
      arePiecesDraggable={interactionEnabled}
      arePremovesAllowed={false}
      autoPromoteToQueen={true}
      onPieceDrop={handleDrop}
      onSquareClick={handleSquareClick}
      customSquareStyles={squareStyles}
      customBoardStyle={{ borderRadius: '8px', boxShadow: '0 10px 34px rgba(2, 12, 27, 0.45)' }}
      customDarkSquareStyle={{ backgroundColor: t.dark }}
      customLightSquareStyle={{ backgroundColor: t.light }}
      customPieces={customPieces}
      customArrows={arrows}
      animationDuration={animationMs}
    />
  )
}
