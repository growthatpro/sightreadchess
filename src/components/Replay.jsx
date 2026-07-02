import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board'
import Scorecard from './Scorecard'
import PeekButton from './PeekButton'
import games from '../data/games.json'
import { recordAttempt, recordRound, median } from '../lib/stats'
import { useBoardWidth } from '../lib/useBoardWidth'
import { usePeek } from '../lib/usePeek'
import { displaySan } from '../lib/notation'

const CORRECT_FLASH_MS = 240
const WRONG_FLASH_MS = 1150
const GREEN = 'rgba(34, 197, 94, 0.55)'
const AMBER = 'rgba(245, 158, 11, 0.60)'

function resolveOrientation(setting) {
  if (setting === 'black') return 'black'
  if (setting === 'random') return Math.random() < 0.5 ? 'white' : 'black'
  return 'white'
}

// L8 — whole-game replay. You read a real game move by move; the board carries
// forward. A wrong move flashes the correct one and is auto-played anyway (error
// recovery), so the game stays in sync no matter what. Untimed — go at your pace,
// exit whenever; whatever you did is scored.
export default function Replay({ coordMode = 'on', orientation = 'white', notation = 'san', onExit }) {
  const boardWidth = useBoardWidth()
  const { showCoords, isPeek, peeking, peekHandlers } = usePeek(coordMode)

  const gameRef = useRef(null)
  const chessRef = useRef(null)
  const plyRef = useRef(0)
  const curRef = useRef(null) // { san, from, to, after, color }
  const acc = useRef(null)
  const phase = useRef('playing') // 'playing' | 'feedback' | 'done'
  const timeoutRef = useRef(null)

  const [header, setHeader] = useState(null)
  const [prompt, setPrompt] = useState(null) // { san, color }
  const [boardFen, setBoardFen] = useState('start')
  const [highlights, setHighlights] = useState({})
  const [interaction, setInteraction] = useState(false)
  const [hud, setHud] = useState({ streak: 0, correct: 0, attempts: 0 })
  const [ply, setPly] = useState(0)
  const [total, setTotal] = useState(0)
  const [boardSide, setBoardSide] = useState('white')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    start()
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function syncHud() {
    const a = acc.current
    setHud({ streak: a.streak, correct: a.correct, attempts: a.attempts })
  }

  function start() {
    clearTimeout(timeoutRef.current)
    const game = games[Math.floor(Math.random() * games.length)]
    gameRef.current = game
    chessRef.current = new Chess()
    plyRef.current = 0
    acc.current = { attempts: 0, correct: 0, latencies: [], streak: 0, bestStreak: 0, promptStartMs: 0 }
    phase.current = 'playing'
    setSummary(null)
    setHeader({ w: game.w, b: game.b, date: cleanDate(game.date), result: game.result })
    setTotal(game.sans.length)
    setBoardSide(resolveOrientation(orientation))
    syncHud()
    loadPly()
  }

  function loadPly() {
    const game = gameRef.current
    const chess = chessRef.current
    const i = plyRef.current
    if (i >= game.sans.length) {
      finishGame()
      return
    }
    const before = chess.fen()
    let mv
    try {
      mv = chess.move(game.sans[i]) // peek...
    } catch {
      finishGame()
      return
    }
    if (!mv) {
      finishGame()
      return
    }
    const after = chess.fen()
    chess.undo() // ...and rewind, so the board still shows the position to solve
    curRef.current = { san: mv.san, from: mv.from, to: mv.to, after, color: mv.color }
    acc.current.promptStartMs = performance.now()
    phase.current = 'playing'
    setPrompt({ san: mv.san, color: mv.color })
    setBoardFen(before)
    setHighlights({})
    setInteraction(true)
    setPly(i)
  }

  function handleAttempt(from, to) {
    if (phase.current !== 'playing') return
    const cur = curRef.current
    const isCorrect = from === cur.from && to === cur.to
    const ms = performance.now() - acc.current.promptStartMs
    recordAttempt('L8', 'game', isCorrect, isCorrect ? ms : null)

    const a = acc.current
    a.attempts += 1
    phase.current = 'feedback'
    setInteraction(false)

    // Play the real move regardless (keeps the game in sync), then advance the index.
    try {
      chessRef.current.move(gameRef.current.sans[plyRef.current])
    } catch {
      /* shouldn't happen — game is pre-validated */
    }
    plyRef.current += 1

    if (isCorrect) {
      a.correct += 1
      a.latencies.push(ms)
      a.streak += 1
      if (a.streak > a.bestStreak) a.bestStreak = a.streak
      setBoardFen(cur.after)
      setHighlights({ [cur.from]: { background: GREEN }, [cur.to]: { background: GREEN } })
      syncHud()
      timeoutRef.current = setTimeout(advance, CORRECT_FLASH_MS)
    } else {
      a.streak = 0
      setBoardFen(cur.after) // show the correct move actually played
      setHighlights({ [cur.from]: { background: AMBER }, [cur.to]: { background: AMBER } })
      syncHud()
      timeoutRef.current = setTimeout(advance, WRONG_FLASH_MS)
    }
  }

  function advance() {
    if (phase.current === 'done') return
    loadPly()
  }

  // Leaving mid-game: if you've played anything, score it (the moves count) and show
  // the card; otherwise just go back.
  function leave() {
    if (phase.current !== 'done' && acc.current && acc.current.attempts > 0) {
      clearTimeout(timeoutRef.current)
      finishGame()
    } else {
      onExit()
    }
  }

  function finishGame() {
    if (phase.current === 'done') return
    phase.current = 'done'
    clearTimeout(timeoutRef.current)
    setInteraction(false)
    const a = acc.current
    const s = {
      levelId: 'L8',
      medianMs: median(a.latencies),
      accuracy: a.attempts ? a.correct / a.attempts : 0,
      correct: a.correct,
      attempts: a.attempts,
      bestStreak: a.bestStreak,
    }
    recordRound('L8', s)
    setSummary(s)
  }

  if (summary) {
    return <Scorecard summary={summary} onAgain={start} onExit={onExit} />
  }

  const color = prompt ? prompt.color : null
  const pct = total ? Math.max(0, Math.min(100, (ply / total) * 100)) : 0

  return (
    <div className="round">
      <div className="round-top">
        <button className="link-btn" onClick={leave}>
          ← Finish
        </button>
        <div className="round-title">
          <span className="pill">L8</span> Whole game
        </div>
        <div className="spacer" />
      </div>

      {header && (
        <div className="game-head">
          <span className="players">
            {shortName(header.w)} — {shortName(header.b)}
          </span>
          <span className="game-meta">
            {[header.date, header.result].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      <div className="timebar">
        <div className="timebar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="hud">
        <div className="hud-item">
          <div className="hud-num">
            {ply}
            <span className="hud-of">/{total}</span>
          </div>
          <div className="hud-label">move</div>
        </div>
        <div className="hud-item">
          <div className="hud-num streak">{hud.streak > 0 ? `🔥${hud.streak}` : hud.streak}</div>
          <div className="hud-label">streak</div>
        </div>
        <div className="hud-item">
          <div className="hud-num">{hud.correct}</div>
          <div className="hud-label">correct</div>
        </div>
      </div>

      <div className="prompt">
        <span className={'to-move ' + (color === 'w' ? 'white' : 'black')}>
          {color === 'w' ? '○' : '●'} {color === 'w' ? 'White' : 'Black'} to move
        </span>
        <div className="san">{prompt ? displaySan(prompt.san, notation) : ''}</div>
      </div>

      <div className="board-wrap">
        <Board
          fen={boardFen}
          orientation={boardSide}
          showCoords={showCoords}
          boardWidth={boardWidth}
          interactionEnabled={interaction}
          onAttempt={handleAttempt}
          highlightSquares={highlights}
        />
      </div>

      <div className="under-board">
        <PeekButton isPeek={isPeek} peeking={peeking} peekHandlers={peekHandlers} />
        <p className="hint">Play the game move by move. Finish any time — what you did still counts.</p>
      </div>
    </div>
  )
}

function cleanDate(d) {
  if (!d) return ''
  const y = d.split('.')[0]
  return /^\d{4}$/.test(y) ? y : ''
}

// "Tal, Mihail" -> "Tal"
function shortName(n) {
  if (!n || n === '?') return 'Unknown'
  return n.split(',')[0].trim()
}
