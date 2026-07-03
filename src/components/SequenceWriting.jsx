import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board'
import games from '../data/games.json'
import { recordRound, levelSummary } from '../lib/stats'
import { useBoardWidth } from '../lib/useBoardWidth'
import { gradeWritten, isRight, parseMoveSequence } from '../lib/grade'
import { displaySan } from '../lib/notation'

// Sequence-writing practice — the hard variant of writing mode. You step through the
// first N moves of a real game, then reproduce the WHOLE sequence in notation from
// memory. We diff your line against the real one and show exactly where it broke.
// Trains blindfold recall + over-the-board scoring at once.

const LENGTHS = [6, 10, 14]
const DEFAULT_LEN = 10
const LAST = 'rgba(56, 189, 248, 0.45)'

function resolveOrientation(setting) {
  if (setting === 'black') return 'black'
  if (setting === 'random') return Math.random() < 0.5 ? 'white' : 'black'
  return 'white'
}

// Replay the first `len` plies of a random game into a stepper-friendly shape.
function buildSequence(len) {
  const game = games[Math.floor(Math.random() * games.length)]
  const chess = new Chess()
  const plies = []
  for (let i = 0; i < len && i < game.sans.length; i++) {
    const mv = chess.move(game.sans[i])
    if (!mv) break
    plies.push({ san: mv.san, from: mv.from, to: mv.to, color: mv.color, fen: chess.fen() })
  }
  return { game, plies }
}

// "1. e4 e5 2. Nf3 Nc6" — number the SANs in pairs for the study strip.
function numbered(sans, notation) {
  const out = []
  for (let i = 0; i < sans.length; i += 2) {
    out.push({
      no: i / 2 + 1,
      white: displaySan(sans[i], notation),
      black: sans[i + 1] ? displaySan(sans[i + 1], notation) : null,
    })
  }
  return out
}

export default function SequenceWriting({ coordMode = 'on', orientation = 'white', notation = 'san', onExit }) {
  const boardWidth = useBoardWidth(420)

  const [len, setLen] = useState(DEFAULT_LEN)
  const [seq, setSeq] = useState(() => buildSequence(DEFAULT_LEN))
  const [phase, setPhase] = useState('study') // 'study' | 'recall' | 'result'
  const [step, setStep] = useState(0) // study/result stepper position (0..len)
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const [boardSide, setBoardSide] = useState(() => resolveOrientation(orientation))
  const inputRef = useRef(null)

  const plies = seq.plies
  const sans = useMemo(() => plies.map((p) => p.san), [plies])

  // Fresh game — reset everything.
  function newSequence(nextLen = len) {
    setSeq(buildSequence(nextLen))
    setPhase('study')
    setStep(0)
    setValue('')
    setResult(null)
    setBoardSide(resolveOrientation(orientation))
  }

  function chooseLen(n) {
    setLen(n)
    newSequence(n)
  }

  // Focus the textarea when the recall phase opens.
  useEffect(() => {
    if (phase === 'recall') setTimeout(() => inputRef.current && inputRef.current.focus(), 30)
  }, [phase])

  function toRecall() {
    setPhase('recall')
    setStep(0)
  }

  function grade() {
    const tokens = parseMoveSequence(value)
    const rows = plies.map((p, i) => {
      const you = tokens[i] || ''
      return { n: i, you, correct: p.san, g: gradeWritten(you, p.san) }
    })
    const extra = tokens.slice(plies.length)
    const correct = rows.filter((r) => isRight(r.g.verdict)).length

    // Longest run of consecutive correct moves anywhere in the line.
    let best = 0
    let run = 0
    for (const r of rows) {
      if (isRight(r.g.verdict)) {
        run += 1
        if (run > best) best = run
      } else run = 0
    }

    recordRound('SEQ', {
      medianMs: null,
      accuracy: rows.length ? correct / rows.length : 0,
      correct,
      attempts: rows.length,
      bestStreak: best,
    })

    setResult({ rows, extra, correct, total: rows.length, bestStreak: best })
    setStep(plies.length) // show the final position
    setPhase('result')
  }

  function onRecallKey(e) {
    // Cmd/Ctrl+Enter submits (plain Enter is a newline, so a per-line list still works).
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (value.trim()) grade()
    }
  }

  const fen = step === 0 ? 'start' : plies[step - 1].fen
  const lastMove = step > 0 ? plies[step - 1] : null
  const highlights = lastMove
    ? { [lastMove.from]: { background: LAST }, [lastMove.to]: { background: LAST } }
    : {}

  // ---- STUDY ----
  if (phase === 'study') {
    const revealed = numbered(sans.slice(0, step), notation)
    return (
      <div className="round sequence">
        <div className="round-top">
          <button className="link-btn" onClick={onExit}>
            ← Levels
          </button>
          <div className="round-title">🧠 Sequence memory</div>
          <div className="spacer" />
        </div>

        <div className="seq-lenrow">
          <span className="seg-label">Length</span>
          <div className="seg">
            {LENGTHS.map((n) => (
              <button key={n} className={'seg-btn' + (len === n ? ' on' : '')} onClick={() => chooseLen(n)}>
                {n}
              </button>
            ))}
          </div>
          <button className="link-btn" onClick={() => newSequence()}>
            ↻ New game
          </button>
        </div>

        <p className="seq-instruction">
          Step through <b>{plies.length} moves</b> and commit them to memory. When you’re ready, hide
          the board and write the whole line back.
        </p>

        <div className="board-wrap">
          <Board
            fen={fen}
            orientation={boardSide}
            showCoords={coordMode === 'on'}
            boardWidth={boardWidth}
            interactionEnabled={false}
            onAttempt={() => {}}
            highlightSquares={highlights}
          />
        </div>

        <div className="seq-stepper">
          <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ◀ Back
          </button>
          <span className="seq-count">
            {step} / {plies.length}
          </span>
          <button
            className="btn"
            onClick={() => setStep((s) => Math.min(plies.length, s + 1))}
            disabled={step === plies.length}
          >
            Next ▶
          </button>
        </div>

        <div className="seq-movelist">
          {revealed.length === 0 ? (
            <span className="muted">Press “Next ▶” to reveal the moves one at a time.</span>
          ) : (
            revealed.map((r) => (
              <span key={r.no} className="seq-move">
                <span className="seq-no">{r.no}.</span> {r.white} {r.black || ''}
              </span>
            ))
          )}
        </div>

        <button className="btn primary seq-go" onClick={toRecall}>
          Hide &amp; write from memory →
        </button>
      </div>
    )
  }

  // ---- RECALL ----
  if (phase === 'recall') {
    return (
      <div className="round sequence">
        <div className="round-top">
          <button className="link-btn" onClick={() => setPhase('study')}>
            ← Study again
          </button>
          <div className="round-title">🧠 Write it from memory</div>
          <div className="spacer" />
        </div>

        <p className="seq-instruction">
          Write all <b>{plies.length} moves</b> in order, from the start. Separate them with spaces or
          new lines — move numbers are optional (<code>e4 e5 Nf3</code> or <code>1. e4 e5 2. Nf3</code>).
        </p>

        <div className="board-wrap seq-hidden-board">
          <Board
            fen="start"
            orientation={boardSide}
            showCoords={coordMode === 'on'}
            boardWidth={boardWidth}
            interactionEnabled={false}
            onAttempt={() => {}}
            highlightSquares={{}}
          />
          <div className="seq-hidden-veil">
            <span>Board reset — recall the moves</span>
          </div>
        </div>

        <textarea
          ref={inputRef}
          className="seq-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onRecallKey}
          placeholder="e4 e5 Nf3 Nc6 Bb5 a6 …"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          rows={3}
        />
        <div className="seq-actions">
          <button className="btn primary" onClick={grade} disabled={!value.trim()}>
            Check my recall <span className="key-hint">⌘/Ctrl + ↵</span>
          </button>
        </div>
      </div>
    )
  }

  // ---- RESULT ----
  const r = result
  const pct = Math.round((r.correct / Math.max(1, r.total)) * 100)
  const viewed = step > 0 ? r.rows[step - 1] : null
  return (
    <div className="round sequence">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">🧠 Sequence memory</div>
        <div className="spacer" />
      </div>

      <div className="seq-headline">
        <div className="sc-metric">
          <div className="sc-value">
            {r.correct}
            <span className="hud-of"> / {r.total}</span>
          </div>
          <div className="sc-cap">moves recalled</div>
        </div>
        <div className="sc-metric">
          <div className="sc-value">{pct}%</div>
          <div className="sc-cap">accuracy</div>
        </div>
        <div className="sc-metric">
          <div className="sc-value">🔥 {r.bestStreak}</div>
          <div className="sc-cap">best run</div>
        </div>
      </div>

      <div className="board-wrap">
        <Board
          fen={fen}
          orientation={boardSide}
          showCoords={coordMode === 'on'}
          boardWidth={boardWidth}
          interactionEnabled={false}
          onAttempt={() => {}}
          highlightSquares={highlights}
        />
      </div>

      <div className="seq-stepper">
        <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          ◀ Back
        </button>
        <span className="seq-count">
          {viewed ? (
            <>
              <b>{Math.floor(viewed.n / 2) + 1}{viewed.n % 2 === 0 ? '.' : '…'} {viewed.correct}</b>
              {isRight(viewed.g.verdict) ? (
                <span className="seq-ok"> ✓ you had it</span>
              ) : (
                <span className="seq-bad"> ✗ you wrote “{viewed.you || '—'}”</span>
              )}
            </>
          ) : (
            'Start — step ▶ through the real game'
          )}
        </span>
        <button
          className="btn"
          onClick={() => setStep((s) => Math.min(plies.length, s + 1))}
          disabled={step === plies.length}
        >
          Next ▶
        </button>
      </div>

      <div className="seq-diff">
        <div className="seq-diff-head">
          <span>#</span>
          <span>You wrote</span>
          <span>Real move</span>
        </div>
        {r.rows.map((row) => {
          const ok = isRight(row.g.verdict)
          return (
            <div key={row.n} className={'seq-diff-row ' + (ok ? 'ok' : 'bad')}>
              <span className="seq-diff-n">
                {Math.floor(row.n / 2) + 1}
                {row.n % 2 === 0 ? '.' : '…'}
              </span>
              <span className="seq-diff-you">{row.you || '—'}</span>
              <span className="seq-diff-real">
                {displaySan(row.correct, notation)} {ok ? '✓' : '✗'}
              </span>
            </div>
          )
        })}
        {r.extra.length > 0 && (
          <div className="seq-diff-extra">+{r.extra.length} extra move(s) written past the sequence: {r.extra.join(' ')}</div>
        )}
      </div>

      <div className="seq-actions">
        <button className="btn primary" onClick={() => newSequence()}>
          New sequence
        </button>
        <button
          className="btn"
          onClick={() => {
            setValue('')
            setResult(null)
            setStep(0)
            setPhase('study')
          }}
        >
          Study this again
        </button>
        <button className="btn" onClick={onExit}>
          Menu
        </button>
      </div>
      <p className="sc-count">Sequence rounds played: {levelSummary('SEQ').played}</p>
    </div>
  )
}
