import { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import Scorecard from './Scorecard'
import PeekButton from './PeekButton'
import { recordAttempt, recordRound, median } from '../lib/stats'
import { useBoardWidth } from '../lib/useBoardWidth'
import { usePeek } from '../lib/usePeek'
import { playCorrect, playWrong, playFinish } from '../lib/sound'
import { EMPTY_FEN } from '../lib/board'

const ROUND_MOVES = 30
const ROUND_SECONDS = 60
const CORRECT_FLASH_MS = 220
const WRONG_FLASH_MS = 900
const GREEN = 'rgba(34, 197, 94, 0.55)'
const AMBER = 'rgba(245, 158, 11, 0.55)'
const FILES = 'abcdefgh'
const RANKS = '12345678'

function randomTarget(avoid) {
  let t
  do {
    t =
      Math.random() < 0.5
        ? { type: 'file', val: FILES[Math.floor(Math.random() * 8)] }
        : { type: 'rank', val: RANKS[Math.floor(Math.random() * 8)] }
  } while (avoid && t.type === avoid.type && t.val === avoid.val)
  return t
}

// All 8 squares of a file (e -> e1..e8) or a rank (4 -> a4..h4).
function squaresOf(target) {
  if (target.type === 'file') return RANKS.split('').map((r) => target.val + r)
  return FILES.split('').map((f) => f + target.val)
}

function label(target) {
  return target.type === 'file' ? `${target.val}-file` : `rank ${target.val}`
}

// L0 — the most basic drill: know where each file and rank is. A file letter or a
// rank number appears; click ANY square on it. This turns a–h and 1–8 into muscle
// memory, so full coordinates (L1) and everything above become fast.
export default function FilesRanks({ coordMode = 'on', orientation = 'white', onExit }) {
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

  const [target, setTarget] = useState(null)
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
    const t = randomTarget(avoid)
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
    const hit = t.type === 'file' ? sqName[0] === t.val : sqName[1] === t.val
    const ms = performance.now() - acc.current.promptStartMs
    recordAttempt('L0', t.type, hit, hit ? ms : null)

    const a = acc.current
    a.attempts += 1
    phase.current = 'feedback'

    if (hit) {
      a.correct += 1
      a.latencies.push(ms)
      a.streak += 1
      if (a.streak > a.bestStreak) a.bestStreak = a.streak
      setHighlights({ [sqName]: { background: GREEN } })
      playCorrect()
      syncHud()
      timeoutRef.current = setTimeout(advance, CORRECT_FLASH_MS)
    } else {
      a.streak = 0
      // light up the whole correct file/rank so you see where it was
      const hl = {}
      for (const s of squaresOf(t)) hl[s] = { background: AMBER }
      hl[sqName] = { background: 'rgba(239,68,68,0.45)' }
      setHighlights(hl)
      playWrong()
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
      levelId: 'L0',
      medianMs: median(a.latencies),
      accuracy: a.attempts ? a.correct / a.attempts : 0,
      correct: a.correct,
      attempts: a.attempts,
      bestStreak: a.bestStreak,
    }
    recordRound('L0', s)
    playFinish()
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
          <span className="pill">L0</span> Files &amp; ranks
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
        <span className="to-move">Click any square on the…</span>
        <div className="san">{target ? label(target) : ''}</div>
      </div>

      <div className="board-wrap">
        <Chessboard
          id="filerank-board"
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
        <p className="hint">Files are the columns a–h. Ranks are the rows 1–8. Any square on the named one counts.</p>
      </div>
    </div>
  )
}
