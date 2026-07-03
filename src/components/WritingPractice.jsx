import { useEffect, useRef, useState } from 'react'
import Board from './Board'
import { nextWritingDrill } from '../lib/sampler'
import { recordAttempt, recordRound, median, levelSummary } from '../lib/stats'
import { useBoardWidth } from '../lib/useBoardWidth'
import { usePeek } from '../lib/usePeek'
import PeekButton from './PeekButton'

// Skill B — writing practice (the reverse of the reading levels). A move is shown on
// the board as an arrow; you WRITE its algebraic notation, graded against chess.js's
// canonical SAN. Trains the notation you need for blindfold / over-the-board scoring.

const ROUND_MOVES = 15
const ARROW = 'rgb(56, 189, 248)'

function resolveOrientation(setting) {
  if (setting === 'black') return 'black'
  if (setting === 'random') return Math.random() < 0.5 ? 'white' : 'black'
  return 'white'
}

// Strip the check/mate marker + any !? annotations, normalise 0-0 -> O-O.
function core(s) {
  return s.trim().replace(/[+#]$/, '').replace(/0/g, 'O').replace(/[!?]+$/, '')
}

// Grade a written move against the canonical SAN. Case-insensitive on the move itself
// (mobile keyboards fight uppercase piece letters); the only "almost" is a right move
// with the check/mate marker left off — which we still credit but teach.
export function gradeWritten(input, canonical) {
  const raw = input.trim()
  if (!raw) return { verdict: 'empty' }
  if (core(raw).toLowerCase() === core(canonical).toLowerCase()) {
    const canonMark = (canonical.match(/[+#]$/) || [''])[0]
    const inMark = (raw.match(/[+#]$/) || [''])[0]
    if (canonMark && inMark !== canonMark) {
      return {
        verdict: 'almost',
        note: canonMark === '#' ? 'that’s checkmate' : 'that gives check',
        correct: canonical,
      }
    }
    return { verdict: 'correct', correct: canonical }
  }
  return { verdict: 'wrong', correct: canonical }
}

export default function WritingPractice({ coordMode = 'on', orientation = 'white', onExit }) {
  const boardWidth = useBoardWidth()
  const { showCoords, isPeek, peeking, peekHandlers } = usePeek(coordMode)

  const acc = useRef(null)
  const drillRef = useRef(null)
  const startMsRef = useRef(0)
  const inputRef = useRef(null)

  const [drill, setDrill] = useState(null)
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState('writing') // 'writing' | 'feedback'
  const [feedback, setFeedback] = useState(null)
  const [hud, setHud] = useState({ streak: 0, correct: 0, attempts: 0 })
  const [boardSide, setBoardSide] = useState('white')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function start() {
    acc.current = { attempts: 0, correct: 0, latencies: [], streak: 0, bestStreak: 0 }
    setSummary(null)
    setHud({ streak: 0, correct: 0, attempts: 0 })
    setBoardSide(resolveOrientation(orientation))
    loadDrill(null)
  }

  function loadDrill(avoidFen) {
    const d = nextWritingDrill(avoidFen)
    if (!d) {
      finish()
      return
    }
    drillRef.current = d
    startMsRef.current = performance.now()
    setDrill(d)
    setValue('')
    setFeedback(null)
    setPhase('writing')
    setTimeout(() => inputRef.current && inputRef.current.focus(), 30)
  }

  function submit(e) {
    if (e) e.preventDefault()
    if (phase === 'feedback') {
      next()
      return
    }
    const d = drillRef.current
    const g = gradeWritten(value, d.san)
    if (g.verdict === 'empty') return
    const ms = performance.now() - startMsRef.current
    const ok = g.verdict === 'correct' || g.verdict === 'almost'
    recordAttempt('WRITE', d.sub, ok, ok ? ms : null)
    const a = acc.current
    a.attempts += 1
    if (ok) {
      a.correct += 1
      a.latencies.push(ms)
      a.streak += 1
      if (a.streak > a.bestStreak) a.bestStreak = a.streak
    } else {
      a.streak = 0
    }
    setHud({ streak: a.streak, correct: a.correct, attempts: a.attempts })
    setFeedback(g)
    setPhase('feedback')
  }

  function next() {
    if (acc.current.attempts >= ROUND_MOVES) {
      finish()
      return
    }
    loadDrill(drillRef.current?.fen)
  }

  function finish() {
    const a = acc.current
    const s = {
      medianMs: median(a.latencies),
      accuracy: a.attempts ? a.correct / a.attempts : 0,
      correct: a.correct,
      attempts: a.attempts,
      bestStreak: a.bestStreak,
    }
    recordRound('WRITE', s)
    setSummary(s)
  }

  if (summary) {
    return <WriteScore summary={summary} onAgain={start} onExit={onExit} />
  }

  const d = drill
  const arrows = d ? [[d.from, d.to, ARROW]] : []
  const highlights = d
    ? { [d.from]: { background: 'rgba(56,189,248,0.20)' }, [d.to]: { background: 'rgba(56,189,248,0.20)' } }
    : {}
  const color = d ? d.color : null

  return (
    <div className="round writing">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">✍️ Writing practice</div>
        <div className="spacer" />
      </div>

      <div className="hud">
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
        <span className={'to-move ' + (color === 'w' ? 'white' : 'black')}>
          {color === 'w' ? '○' : '●'} {color === 'w' ? 'White' : 'Black'} played — write it
        </span>
      </div>

      <div className="board-wrap">
        <Board
          fen={d ? d.fen : 'start'}
          orientation={boardSide}
          showCoords={showCoords}
          boardWidth={boardWidth}
          interactionEnabled={false}
          onAttempt={() => {}}
          highlightSquares={highlights}
          arrows={arrows}
        />
      </div>

      <form className="write-form" onSubmit={submit}>
        {phase === 'writing' ? (
          <>
            <input
              ref={inputRef}
              className="write-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Write the move — e.g. Nf3, exd5, O-O"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn primary" type="submit" disabled={!value.trim()}>
              Check
            </button>
          </>
        ) : (
          <>
            <div className={'write-feedback ' + feedback.verdict}>
              {feedback.verdict === 'correct' && (
                <span>
                  ✓ <b>{feedback.correct}</b> — correct
                </span>
              )}
              {feedback.verdict === 'almost' && (
                <span>
                  ✓ Right move — {feedback.note}, so it’s written <b>{feedback.correct}</b>
                </span>
              )}
              {feedback.verdict === 'wrong' && (
                <span>
                  ✗ You wrote “{value.trim()}” — correct: <b>{feedback.correct}</b>
                </span>
              )}
            </div>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <button className="btn primary" type="submit" autoFocus>
              Next →
            </button>
          </>
        )}
      </form>

      <div className="under-board">
        <PeekButton isPeek={isPeek} peeking={peeking} peekHandlers={peekHandlers} />
        <p className="hint">The arrow shows the move that was played. Write its notation.</p>
      </div>
    </div>
  )
}

function WriteScore({ summary, onAgain, onExit }) {
  const ls = levelSummary('WRITE')
  const pct = (x) => Math.round(x * 100) + '%'
  const fmt = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(2) + 's')
  return (
    <div className="scorecard">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">✍️ Writing practice</div>
        <div className="spacer" />
      </div>
      <h2 className="sc-head">Round complete</h2>
      <div className="sc-headline">
        <div className="sc-metric">
          <div className="sc-value">{pct(summary.accuracy)}</div>
          <div className="sc-cap">accuracy</div>
          <div className="sc-sub">
            {summary.correct} of {summary.attempts} written right
          </div>
        </div>
        <div className="sc-metric">
          <div className="sc-value">{fmt(summary.medianMs)}</div>
          <div className="sc-cap">write time</div>
          <div className="sc-sub">median per correct move</div>
        </div>
      </div>
      <div className="sc-row">
        <div className="sc-chip">
          <span className="sc-chip-num">🔥 {summary.bestStreak}</span>
          <span className="sc-chip-lbl">best streak</span>
        </div>
        <div className="sc-chip">
          <span className="sc-chip-num">{pct(ls.bestAccuracy)}</span>
          <span className="sc-chip-lbl">best ever</span>
        </div>
        <div className="sc-chip">
          <span className="sc-chip-num">{ls.played}</span>
          <span className="sc-chip-lbl">rounds</span>
        </div>
      </div>
      <div className="sc-actions">
        <button className="btn primary" onClick={onAgain}>
          Again
        </button>
        <button className="btn" onClick={onExit}>
          Menu
        </button>
      </div>
    </div>
  )
}
