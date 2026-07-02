import { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import Scorecard from './Scorecard'
import PeekButton from './PeekButton'
import { recordAttempt, recordRound, median } from '../lib/stats'
import { useBoardWidth } from '../lib/useBoardWidth'
import { usePeek } from '../lib/usePeek'
import { EMPTY_FEN } from '../lib/board'

const ROUND_MOVES = 30
const ROUND_SECONDS = 60
const CORRECT_FLASH_MS = 220
const WRONG_FLASH_MS = 900
const GREEN = 'rgba(34, 197, 94, 0.55)'
const AMBER = 'rgba(245, 158, 11, 0.60)'
const FILES = 'abcdefgh'

function randomSquare(avoid) {
  let s
  do {
    s = FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8))
  } while (s === avoid)
  return s
}

// L0: the pure grid drill. A square name appears; click it. Trains the coordinate
// map itself, so everything above it is about reading the move, not hunting squares.
export default function CoordinateWarmup({ coordMode = 'on', orientation = 'white', onExit }) {
  const boardWidth = useBoardWidth()
  const { showCoords, isPeek, peeking, peekHandlers } = usePeek(coordMode)
  const [boardSide] = useState(() =>
    orientation === 'black'
      ? 'black'
      : orientation === 'random'
        ? Math.random() < 0.5
          ? 'white'
          : 'black'
        : 'white'
  )
  const acc = useRef(null)
  const phase = useRef('playing')
  const targetRef = useRef(null)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  const [target, setTarget] = useState('')
  const [highlights, setHighlights] = useState({})
  const [hud, setHud] = useState({ streak: 0, bestStreak: 0, correct: 0, attempts: 0 })
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    start()
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function syncHud() {
    const a = acc.current
    setHud({ streak: a.streak, bestStreak: a.bestStreak, correct: a.correct, attempts: a.attempts })
  }

  function start() {
    clearInterval(intervalRef.current)
    clearTimeout(timeoutRef.current)
    acc.current = {
      attempts: 0,
      correct: 0,
      latencies: [],
      streak: 0,
      bestStreak: 0,
      roundStartMs: performance.now(),
      promptStartMs: 0,
    }
    phase.current = 'playing'
    setSummary(null)
    setTimeLeft(ROUND_SECONDS)
    syncHud()
    loadTarget(null)
    intervalRef.current = setInterval(tick, 200)
  }

  function tick() {
    if (phase.current === 'done') return
    const left = Math.max(0, ROUND_SECONDS - (performance.now() - acc.current.roundStartMs) / 1000)
    setTimeLeft(left)
    if (left <= 0) finishRound()
  }

  function loadTarget(avoid) {
    const t = randomSquare(avoid)
    targetRef.current = t
    acc.current.promptStartMs = performance.now()
    phase.current = 'playing'
    setTarget(t)
    setHighlights({})
  }

  function handleClick(...args) {
    if (phase.current !== 'playing') return
    const sqName = /^[a-h][1-8]$/.test(args[0]) ? args[0] : args[1]
    if (!sqName) return
    const t = targetRef.current
    const isCorrect = sqName === t
    const ms = performance.now() - acc.current.promptStartMs
    recordAttempt('L1', 'square', isCorrect, isCorrect ? ms : null)

    const a = acc.current
    a.attempts += 1
    phase.current = 'feedback'

    if (isCorrect) {
      a.correct += 1
      a.latencies.push(ms)
      a.streak += 1
      if (a.streak > a.bestStreak) a.bestStreak = a.streak
      setHighlights({ [t]: { background: GREEN } })
      syncHud()
      timeoutRef.current = setTimeout(advance, CORRECT_FLASH_MS)
    } else {
      a.streak = 0
      // flash the square they should have clicked
      setHighlights({ [t]: { background: AMBER }, [sqName]: { background: 'rgba(239,68,68,0.4)' } })
      syncHud()
      timeoutRef.current = setTimeout(advance, WRONG_FLASH_MS)
    }
  }

  function advance() {
    if (phase.current === 'done') return
    const a = acc.current
    const elapsed = (performance.now() - a.roundStartMs) / 1000
    if (a.attempts >= ROUND_MOVES || elapsed >= ROUND_SECONDS) {
      finishRound()
      return
    }
    loadTarget(targetRef.current)
  }

  function finishRound() {
    if (phase.current === 'done') return
    phase.current = 'done'
    clearInterval(intervalRef.current)
    clearTimeout(timeoutRef.current)
    const a = acc.current
    const s = {
      levelId: 'L1',
      medianMs: median(a.latencies),
      accuracy: a.attempts ? a.correct / a.attempts : 0,
      correct: a.correct,
      attempts: a.attempts,
      bestStreak: a.bestStreak,
    }
    recordRound('L1', s)
    setSummary(s)
  }

  if (summary) {
    return <Scorecard summary={summary} onAgain={start} onExit={onExit} />
  }

  const timePct = Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100))
  const lowTime = timeLeft <= 10

  return (
    <div className="round">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">
          <span className="pill">L1</span> Coordinate warm-up
        </div>
        <div className="spacer" />
      </div>

      <div className="timebar">
        <div className={'timebar-fill' + (lowTime ? ' low' : '')} style={{ width: `${timePct}%` }} />
      </div>

      <div className="hud">
        <div className="hud-item">
          <div className={'hud-num' + (lowTime ? ' low' : '')}>{Math.ceil(timeLeft)}s</div>
          <div className="hud-label">left</div>
        </div>
        <div className="hud-item">
          <div className="hud-num">
            {hud.attempts}
            <span className="hud-of">/{ROUND_MOVES}</span>
          </div>
          <div className="hud-label">clicks</div>
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
        <span className="to-move">Click this square</span>
        <div className="san">{target}</div>
      </div>

      <div className="board-wrap">
        <Chessboard
          id="warmup-board"
          position={EMPTY_FEN}
          boardWidth={boardWidth}
          boardOrientation={boardSide}
          showBoardNotation={showCoords}
          arePiecesDraggable={false}
          onSquareClick={handleClick}
          customSquareStyles={highlights}
          customBoardStyle={{ borderRadius: '8px', boxShadow: '0 10px 34px rgba(2, 12, 27, 0.45)' }}
          customDarkSquareStyle={{ backgroundColor: '#6f97ad' }}
          customLightSquareStyle={{ backgroundColor: '#e6edf2' }}
        />
      </div>

      <div className="under-board">
        <PeekButton isPeek={isPeek} peeking={peeking} peekHandlers={peekHandlers} />
        <p className="hint">Set coordinate labels to On / Peek / Off on the Levels screen as you improve.</p>
      </div>
    </div>
  )
}
