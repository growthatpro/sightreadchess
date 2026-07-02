import { LEVEL_BY_ID } from '../lib/levels'
import { levelSummary } from '../lib/stats'

const fmtSecs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(2) + 's')
const pct = (x) => Math.round(x * 100) + '%'

// End-of-round scorecard. Headline = median decode latency + accuracy. Below it,
// how this round sits against your history for the level, and a latency trend line.
export default function Scorecard({ summary, onAgain, onExit }) {
  const level = LEVEL_BY_ID[summary.levelId]
  const ls = levelSummary(summary.levelId) // already includes this round
  const rounds = ls.rounds
  const played = ls.played

  const newBestLatency =
    summary.medianMs != null && summary.medianMs === ls.bestMedianMs && played > 1
  const newBestAccuracy = summary.accuracy === ls.bestAccuracy && played > 1 && summary.accuracy > 0
  const newBestStreak = summary.bestStreak === ls.bestStreak && summary.bestStreak > 0 && played > 1

  return (
    <div className="scorecard">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">
          <span className="pill">{level.id}</span> {level.name}
        </div>
        <div className="spacer" />
      </div>

      <h2 className="sc-head">Round complete</h2>

      <div className="sc-headline">
        <div className="sc-metric">
          <div className="sc-value">{fmtSecs(summary.medianMs)}</div>
          <div className="sc-cap">decode latency{newBestLatency && <span className="best"> · best</span>}</div>
          <div className="sc-sub">median time per correct move</div>
        </div>
        <div className="sc-metric">
          <div className="sc-value">{pct(summary.accuracy)}</div>
          <div className="sc-cap">accuracy{newBestAccuracy && <span className="best"> · best</span>}</div>
          <div className="sc-sub">
            {summary.correct} of {summary.attempts} correct
          </div>
        </div>
      </div>

      <div className="sc-row">
        <div className="sc-chip">
          <span className="sc-chip-num">🔥 {summary.bestStreak}</span>
          <span className="sc-chip-lbl">best streak{newBestStreak && ' · record'}</span>
        </div>
        <div className="sc-chip">
          <span className="sc-chip-num">{fmtSecs(ls.bestMedianMs)}</span>
          <span className="sc-chip-lbl">best ever latency</span>
        </div>
        <div className="sc-chip">
          <span className="sc-chip-num">{pct(ls.bestAccuracy)}</span>
          <span className="sc-chip-lbl">best ever accuracy</span>
        </div>
      </div>

      <Trend rounds={rounds} />

      <div className="sc-actions">
        <button className="btn primary" onClick={onAgain}>
          Again
        </button>
        <button className="btn" onClick={onExit}>
          Pick a level
        </button>
      </div>
      <p className="sc-count">Round {played} at this level</p>
    </div>
  )
}

// Latency trend across recent rounds (lower is better).
function Trend({ rounds }) {
  const pts = rounds.filter((r) => r.medianMs != null).slice(-12)
  if (pts.length < 2) {
    return <p className="sc-trend-empty">Play a few rounds to see your latency trend.</p>
  }
  const w = 320
  const h = 64
  const pad = 6
  const vals = pts.map((p) => p.medianMs)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => pad + (i * (w - 2 * pad)) / (pts.length - 1)
  const y = (v) => pad + ((v - min) / span) * (h - 2 * pad)
  const line = pts.map((p, i) => `${x(i)},${y(p.medianMs)}`).join(' ')
  const first = pts[0].medianMs
  const last = pts[pts.length - 1].medianMs
  const improved = last < first

  return (
    <div className="sc-trend">
      <div className="sc-trend-head">
        <span>latency trend</span>
        <span className={improved ? 'up' : 'down'}>
          {improved ? '▼ faster' : '▲ slower'} · {fmtSecs(first)} → {fmtSecs(last)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.medianMs)} r="2.5" />
        ))}
      </svg>
    </div>
  )
}
