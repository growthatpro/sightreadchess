import { useEffect, useRef, useState } from 'react'
import Board from './Board'
import { useBoardWidth } from '../lib/useBoardWidth'
import { usePeek } from '../lib/usePeek'
import PeekButton from './PeekButton'
import { displayMove } from '../lib/notation'
import { playCorrect, playWrong, playFinish } from '../lib/sound'
import { getRating, recordTest } from '../lib/stats'
import {
  pickDrillNear,
  itemDifficulty,
  parMs,
  effectiveDifficulty,
  scoreFor,
  updateRating,
  kForStep,
  bandFor,
  TEST_LENGTH,
  DEFAULT_SEED,
} from '../lib/rating'

// Test Mode — the adaptive Sightreading Elo assessment. ~24 reading drills that ramp:
// read a move fast and right → the next is harder and your rating climbs; miss it or
// stall past the clock → it eases off. Speed is scored (via the rating math), so this
// measures how fast you *read*, not just whether you can. One number out at the end.

const GREEN = 'rgba(34, 197, 94, 0.55)'
const AMBER = 'rgba(245, 158, 11, 0.60)'
const CORRECT_FLASH_MS = 220
const WRONG_FLASH_MS = 950

function resolveOrientation(setting) {
  if (setting === 'black') return 'black'
  if (setting === 'random') return Math.random() < 0.5 ? 'white' : 'black'
  return 'white'
}

// Per-item clock — generous but real. Scales with how hard the read is.
function itemLimitMs(baseDiff) {
  return Math.max(6000, Math.min(14000, 3 * parMs(baseDiff)))
}

export default function TestMode({ coordMode = 'on', orientation = 'white', notation = 'san', onExit }) {
  const boardWidth = useBoardWidth()
  const { showCoords, isPeek, peeking, peekHandlers } = usePeek(coordMode)

  const ratingRef = useRef(DEFAULT_SEED)
  const seedRef = useRef(null) // rating before this test (for the delta)
  const idxRef = useRef(0)
  const curRef = useRef(null) // { drill, baseDiff }
  const phase = useRef('playing') // 'playing' | 'feedback' | 'done'
  const promptStart = useRef(0)
  const deadline = useRef(0)
  const correctRef = useRef(0)
  const flashTimeout = useRef(null)
  const tick = useRef(null)

  const [rating, setRating] = useState(DEFAULT_SEED)
  const [delta, setDelta] = useState(0) // last item's rating change (for the ▲/▼ flash)
  const [idx, setIdx] = useState(0)
  const [drill, setDrill] = useState(null)
  const [fen, setFen] = useState('start')
  const [highlights, setHighlights] = useState({})
  const [interaction, setInteraction] = useState(false)
  const [boardSide, setBoardSide] = useState('white')
  const [limitPct, setLimitPct] = useState(100)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    start()
    return () => {
      clearTimeout(flashTimeout.current)
      clearInterval(tick.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function start() {
    clearTimeout(flashTimeout.current)
    clearInterval(tick.current)
    const seed = getRating().current ?? DEFAULT_SEED
    seedRef.current = getRating().current // null on a first-ever test
    ratingRef.current = seed
    idxRef.current = 0
    correctRef.current = 0
    setRating(seed)
    setDelta(0)
    setSummary(null)
    setBoardSide(resolveOrientation(orientation))
    loadItem()
    tick.current = setInterval(onTick, 100)
  }

  function loadItem() {
    const pick = pickDrillNear(ratingRef.current)
    if (!pick) {
      finish()
      return
    }
    const baseDiff = itemDifficulty(pick.difficulty, coordMode)
    curRef.current = { drill: pick.drill, baseDiff }
    promptStart.current = performance.now()
    deadline.current = promptStart.current + itemLimitMs(baseDiff)
    phase.current = 'playing'
    setIdx(idxRef.current)
    setDrill(pick.drill)
    setFen(pick.drill.fen)
    setHighlights({})
    setInteraction(true)
    setLimitPct(100)
  }

  function onTick() {
    if (phase.current !== 'playing') return
    const now = performance.now()
    const limit = deadline.current - promptStart.current
    const left = Math.max(0, deadline.current - now)
    setLimitPct((left / limit) * 100)
    if (left <= 0) resolve(false, limit) // ran out the clock → counts as a miss
  }

  function handleAttempt(from, to) {
    if (phase.current !== 'playing') return
    const { drill: d } = curRef.current
    const correct = from === d.from && to === d.to
    resolve(correct, performance.now() - promptStart.current)
  }

  function resolve(correct, ms) {
    if (phase.current !== 'playing') return
    phase.current = 'feedback'
    setInteraction(false)
    const { drill: d, baseDiff } = curRef.current

    const effDiff = effectiveDifficulty(correct, baseDiff, ms)
    const k = kForStep(idxRef.current)
    const before = ratingRef.current
    const after = updateRating(before, effDiff, scoreFor(correct), k)
    ratingRef.current = after
    if (correct) correctRef.current += 1

    setFen(d.after)
    setHighlights({ [d.from]: { background: correct ? GREEN : AMBER }, [d.to]: { background: correct ? GREEN : AMBER } })
    setRating(after)
    setDelta(after - before)
    if (correct) playCorrect()
    else playWrong()

    flashTimeout.current = setTimeout(advance, correct ? CORRECT_FLASH_MS : WRONG_FLASH_MS)
  }

  function advance() {
    if (phase.current === 'done') return
    idxRef.current += 1
    if (idxRef.current >= TEST_LENGTH) {
      finish()
      return
    }
    loadItem()
  }

  function finish() {
    if (phase.current === 'done') return
    phase.current = 'done'
    clearTimeout(flashTimeout.current)
    clearInterval(tick.current)
    setInteraction(false)
    const final = ratingRef.current
    const prev = seedRef.current
    recordTest(final)
    playFinish()
    setSummary({
      final,
      band: bandFor(final),
      prev,
      delta: prev == null ? null : final - prev,
      correct: correctRef.current,
      total: TEST_LENGTH,
      history: getRating().history, // includes this test
    })
  }

  if (summary) {
    return <TestResult summary={summary} onAgain={start} onExit={onExit} />
  }

  const color = drill ? drill.color : null
  const lowTime = limitPct <= 25

  return (
    <div className="round test">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">🏁 Sightreading test</div>
        <div className="spacer" />
      </div>

      <div className="timebar">
        <div className={'timebar-fill' + (lowTime ? ' low' : '')} style={{ width: `${limitPct}%` }} />
      </div>

      <div className="hud">
        <div className="hud-item test-rating">
          <div className="hud-num">
            {rating}
            {delta !== 0 && (
              <span className={'rate-delta ' + (delta > 0 ? 'up' : 'down')}>
                {delta > 0 ? '▲' : '▼'}
                {Math.abs(delta)}
              </span>
            )}
          </div>
          <div className="hud-label">rating</div>
        </div>
        <div className="hud-item">
          <div className="hud-num">
            {idx + 1}
            <span className="hud-of">/{TEST_LENGTH}</span>
          </div>
          <div className="hud-label">item</div>
        </div>
        <div className="hud-item">
          <div className="hud-num band">{bandFor(rating)}</div>
          <div className="hud-label">band</div>
        </div>
      </div>

      <div className="prompt">
        <span className={'to-move ' + (color === 'w' ? 'white' : 'black')}>
          {color === 'w' ? '○' : '●'} {color === 'w' ? 'White' : 'Black'} to move — fast
        </span>
        <div className="san">{drill ? displayMove(drill, notation) : ''}</div>
      </div>

      <div className="board-wrap">
        <Board
          fen={fen}
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
        <p className="hint">Play each move as fast as you can read it. Beat the clock — speed counts.</p>
      </div>
    </div>
  )
}

function TestResult({ summary, onAgain, onExit }) {
  const { final, band, prev, delta, correct, total, history } = summary
  return (
    <div className="scorecard">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">🏁 Sightreading test</div>
        <div className="spacer" />
      </div>

      <h2 className="sc-head">Your Sightreading rating</h2>

      <div className="test-rating-hero">
        <div className="tr-number">{final}</div>
        <div className="tr-band">{band}</div>
        {delta == null ? (
          <div className="tr-delta muted">your first rating — take it again to track progress</div>
        ) : (
          <div className={'tr-delta ' + (delta >= 0 ? 'up' : 'down')}>
            {delta >= 0 ? '▲ up ' : '▼ down '}
            {Math.abs(delta)} from last test ({prev})
          </div>
        )}
      </div>

      <div className="sc-row">
        <div className="sc-chip">
          <span className="sc-chip-num">
            {correct}/{total}
          </span>
          <span className="sc-chip-lbl">read correctly</span>
        </div>
        <div className="sc-chip">
          <span className="sc-chip-num">{Math.max(final, ...history.map((h) => h.rating))}</span>
          <span className="sc-chip-lbl">best rating</span>
        </div>
        <div className="sc-chip">
          <span className="sc-chip-num">{history.length}</span>
          <span className="sc-chip-lbl">tests taken</span>
        </div>
      </div>

      <RatingTrend history={history} />

      <div className="sc-actions">
        <button className="btn primary" onClick={onAgain}>
          Take it again
        </button>
        <button className="btn" onClick={onExit}>
          Menu
        </button>
      </div>
      <p className="sc-count">The rating updates each time — read faster to raise it.</p>
    </div>
  )
}

// Rating over the last dozen tests (higher is better — the opposite of the latency trend).
function RatingTrend({ history }) {
  const pts = history.slice(-12)
  if (pts.length < 2) {
    return <p className="sc-trend-empty">Take the test again to see your rating climb over time.</p>
  }
  const w = 320
  const h = 64
  const pad = 6
  const vals = pts.map((p) => p.rating)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => pad + (i * (w - 2 * pad)) / (pts.length - 1)
  const y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad) // higher rating = higher on chart
  const line = pts.map((p, i) => `${x(i)},${y(p.rating)}`).join(' ')
  const first = pts[0].rating
  const last = pts[pts.length - 1].rating
  const improved = last >= first

  return (
    <div className="sc-trend">
      <div className="sc-trend-head">
        <span>rating trend</span>
        <span className={improved ? 'up' : 'down'}>
          {improved ? '▲ rising' : '▼ dipping'} · {first} → {last}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.rating)} r="2.5" />
        ))}
      </svg>
    </div>
  )
}
