import { useEffect, useRef, useState } from 'react'
import Board from './Board'
import Scorecard from './Scorecard'
import { nextDrill } from '../lib/sampler'
import { recordAttempt, recordRound, median } from '../lib/stats'
import { LEVEL_BY_ID } from '../lib/levels'
import { useBoardWidth } from '../lib/useBoardWidth'
import { useBoardSwap } from '../lib/useBoardSwap'
import { displayMove } from '../lib/notation'
import { usePeek } from '../lib/usePeek'
import { playCorrect, playWrong, playFinish } from '../lib/sound'
import PeekButton from './PeekButton'

// Resolve the orientation setting to a concrete side, held constant for the whole
// round so the board never flips mid-round (that would wreck comparability).
function resolveOrientation(setting) {
  if (setting === 'black') return 'black'
  if (setting === 'random') return Math.random() < 0.5 ? 'white' : 'black'
  return 'white'
}

const ROUND_MOVES = 30
const ROUND_SECONDS = 60
const CORRECT_FLASH_MS = 240
const WRONG_FLASH_MS = 1150

const GREEN = 'rgba(34, 197, 94, 0.55)'
const AMBER = 'rgba(245, 158, 11, 0.60)'

// One timed round of a move-based level (everything except L0). 30 moves or 60
// seconds, whichever comes first, then a scorecard.
export default function Round({ levelId, coordMode = 'on', orientation = 'white', notation = 'san', onExit }) {
  const level = LEVEL_BY_ID[levelId]
  const boardWidth = useBoardWidth()
  const { anim, style: boardStyle, swapIn, playMove } = useBoardSwap()
  const { showCoords, isPeek, peeking, peekHandlers } = usePeek(coordMode)

  // Mutable round accumulators — read by the timer + the feedback timeout, so they
  // live in a ref to dodge stale closures.
  const acc = useRef(null)
  const phase = useRef('playing') // 'playing' | 'feedback' | 'done'
  const drillRef = useRef(null)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  const [drill, setDrill] = useState(null)
  const [boardFen, setBoardFen] = useState('start')
  const [highlights, setHighlights] = useState({})
  const [interaction, setInteraction] = useState(false)
  const [hud, setHud] = useState({ streak: 0, bestStreak: 0, correct: 0, attempts: 0 })
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [summary, setSummary] = useState(null)
  const [boardSide, setBoardSide] = useState('white')

  useEffect(() => {
    start()
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId])

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
    setBoardSide(resolveOrientation(orientation))
    syncHud()
    loadDrill(null)
    intervalRef.current = setInterval(tick, 200)
  }

  function tick() {
    if (phase.current === 'done') return
    const elapsed = (performance.now() - acc.current.roundStartMs) / 1000
    const left = Math.max(0, ROUND_SECONDS - elapsed)
    setTimeLeft(left)
    if (left <= 0) finishRound()
  }

  function loadDrill(avoidFen) {
    const d = nextDrill(levelId, avoidFen)
    if (!d) {
      finishRound()
      return
    }
    drillRef.current = d
    acc.current.promptStartMs = performance.now()
    phase.current = 'playing'
    setDrill(d)
    setBoardFen(d.fen)
    setHighlights({})
    setInteraction(true)
    swapIn() // snap the fresh position in + fade — no chaotic piece teleport
  }

  function handleAttempt(from, to) {
    if (phase.current !== 'playing') return
    const d = drillRef.current
    const isCorrect = from === d.from && to === d.to
    const ms = performance.now() - acc.current.promptStartMs
    recordAttempt(levelId, d.sub, isCorrect, isCorrect ? ms : null)

    const a = acc.current
    a.attempts += 1
    phase.current = 'feedback'
    setInteraction(false)
    playMove() // let the played move slide (not snap)

    if (isCorrect) {
      a.correct += 1
      a.latencies.push(ms)
      a.streak += 1
      if (a.streak > a.bestStreak) a.bestStreak = a.streak
      setBoardFen(d.after)
      setHighlights({ [d.from]: sq(GREEN), [d.to]: sq(GREEN) })
      playCorrect()
      syncHud()
      timeoutRef.current = setTimeout(advance, CORRECT_FLASH_MS)
    } else {
      a.streak = 0
      setBoardFen(d.after) // show the correct move actually played
      setHighlights({ [d.from]: sq(AMBER), [d.to]: sq(AMBER) })
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
    loadDrill(drillRef.current?.fen)
  }

  function finishRound() {
    if (phase.current === 'done') return
    phase.current = 'done'
    clearInterval(intervalRef.current)
    clearTimeout(timeoutRef.current)
    setInteraction(false)
    const a = acc.current
    const med = median(a.latencies)
    const accuracy = a.attempts ? a.correct / a.attempts : 0
    const s = {
      levelId,
      medianMs: med,
      accuracy,
      correct: a.correct,
      attempts: a.attempts,
      bestStreak: a.bestStreak,
    }
    recordRound(levelId, s)
    playFinish()
    setSummary(s)
  }

  if (summary) {
    return <Scorecard summary={summary} onAgain={start} onExit={onExit} />
  }

  const lastMove = drill ? drill.color : null
  const timePct = Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100))
  const lowTime = timeLeft <= 10

  return (
    <div className="round">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">
          <span className="pill">{level.id}</span> {level.name}
        </div>
        <div className="spacer" />
      </div>

      <div className="timebar">
        <div
          className={'timebar-fill' + (lowTime ? ' low' : '')}
          style={{ width: `${timePct}%` }}
        />
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
          <div className="hud-label">moves</div>
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
        <span className={'to-move ' + (lastMove === 'w' ? 'white' : 'black')}>
          {lastMove === 'w' ? '○' : '●'} {lastMove === 'w' ? 'White' : 'Black'} to move
        </span>
        <div className="san">{drill ? displayMove(drill, notation) : ''}</div>
      </div>

      <div className="board-wrap" style={boardStyle}>
        <Board
          fen={boardFen}
          orientation={boardSide}
          showCoords={showCoords}
          boardWidth={boardWidth}
          interactionEnabled={interaction}
          onAttempt={handleAttempt}
          highlightSquares={highlights}
          animationMs={anim}
        />
      </div>

      <div className="under-board">
        <PeekButton isPeek={isPeek} peeking={peeking} peekHandlers={peekHandlers} />
        <p className="hint">Drag the piece, or click the square it’s on then the square it goes to.</p>
      </div>
    </div>
  )
}

function sq(color) {
  return { background: color }
}
