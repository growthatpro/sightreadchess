import { LEVELS } from '../lib/levels'
import {
  overallStats,
  moveTypeStats,
  dailyActivity,
  levelSummary,
  getRating,
  dayKey,
} from '../lib/stats'
import { bandFor } from '../lib/rating'

const fmtSecs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(2) + 's')
const pct = (x) => Math.round(x * 100) + '%'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Dashboard({ onExit, onOpenTest }) {
  const stats = overallStats()
  const moveTypes = moveTypeStats()

  return (
    <div className="dash">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">📊 Progress</div>
        <div className="spacer" />
      </div>

      <RatingCard onOpenTest={onOpenTest} />

      {stats.rounds === 0 ? (
        <p className="sc-trend-empty">
          No practice rounds yet. Play a level and your streak, trends, and weak spots show up here.
        </p>
      ) : (
        <>
          <div className="dash-summary">
            <Summary value={stats.streak} label="day streak" accent="streak" prefix="🔥 " />
            <Summary value={stats.days} label={stats.days === 1 ? 'day played' : 'days played'} />
            <Summary value={stats.moves.toLocaleString()} label="moves read" />
            <Summary value={pct(stats.accuracy)} label="accuracy" />
          </div>

          <StreakCalendar />

          <MoveTypeBreakdown rows={moveTypes} />

          <LevelTrends />
        </>
      )}
    </div>
  )
}

// ---- Sightreading rating card ----
function RatingCard({ onOpenTest }) {
  const r = getRating()
  return (
    <div className="dash-card rating-card">
      <div className="dash-card-head">
        <span>🏁 Sightreading rating</span>
        {r.current != null && <span className="rc-best">best {r.best}</span>}
      </div>
      {r.current == null ? (
        <div className="rc-empty">
          <p>One number for how fast you read notation. Take the ~2-minute adaptive test to get yours.</p>
          <button className="btn primary" onClick={onOpenTest}>
            Take the Sightreading test →
          </button>
        </div>
      ) : (
        <div className="rc-body">
          <div className="rc-now">
            <span className="rc-num">{r.current}</span>
            <span className="rc-band">{bandFor(r.current)}</span>
          </div>
          <div className="rc-side">
            <RatingSpark history={r.history} />
            <button className="btn rc-retake" onClick={onOpenTest}>
              Retake →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RatingSpark({ history }) {
  const pts = history.slice(-14)
  if (pts.length < 2) {
    return <span className="rc-spark-empty">Take it again to track your rating over time.</span>
  }
  const w = 200
  const h = 34
  const pad = 4
  const vals = pts.map((p) => p.rating)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => pad + (i * (w - 2 * pad)) / (pts.length - 1)
  const y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad)
  const line = pts.map((p, i) => `${x(i)},${y(p.rating)}`).join(' ')
  const up = pts[pts.length - 1].rating >= pts[0].rating
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={'rc-spark ' + (up ? 'good' : 'warn')} preserveAspectRatio="none">
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function Summary({ value, label, accent, prefix = '' }) {
  return (
    <div className="dash-stat">
      <div className={'dash-stat-num' + (accent ? ' ' + accent : '')}>
        {prefix}
        {value}
      </div>
      <div className="dash-stat-lbl">{label}</div>
    </div>
  )
}

// ---- streak calendar (GitHub-style heatmap of the last 14 weeks) ----
function StreakCalendar() {
  const activity = dailyActivity()
  const weeks = 14
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay())) // Saturday of this week
  const start = new Date(end)
  start.setDate(start.getDate() - (weeks * 7 - 1)) // Sunday, weeks ago

  const cols = []
  const monthLabels = []
  const cur = new Date(start)
  for (let w = 0; w < weeks; w++) {
    const col = []
    let labelForCol = ''
    for (let d = 0; d < 7; d++) {
      const k = dayKey(cur.getTime())
      const act = activity.get(k)
      const future = cur.getTime() > today.getTime()
      if (d === 0 && cur.getDate() <= 7) labelForCol = MONTHS[cur.getMonth()]
      col.push({ date: k, moves: act ? act.moves : 0, future })
      cur.setDate(cur.getDate() + 1)
    }
    cols.push(col)
    monthLabels.push(labelForCol)
  }

  const tier = (moves) => {
    if (moves <= 0) return 0
    if (moves < 10) return 1
    if (moves < 20) return 2
    if (moves < 40) return 3
    return 4
  }

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <span>Daily practice</span>
        <span className="dash-legend">
          less
          <i className="cell t0" />
          <i className="cell t1" />
          <i className="cell t2" />
          <i className="cell t3" />
          <i className="cell t4" />
          more
        </span>
      </div>
      <div className="cal-scroll">
        <div className="cal">
          <div className="cal-months">
            {monthLabels.map((m, i) => (
              <span key={i} className="cal-month">
                {m}
              </span>
            ))}
          </div>
          <div className="cal-grid">
            {cols.map((col, wi) => (
              <div key={wi} className="cal-col">
                {col.map((cell, di) => (
                  <i
                    key={di}
                    className={'cell t' + (cell.future ? 0 : tier(cell.moves)) + (cell.future ? ' future' : '')}
                    title={cell.future ? '' : `${cell.date}: ${cell.moves} moves`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- slowest / weakest move types ----
function MoveTypeBreakdown({ rows }) {
  if (!rows.length) {
    return (
      <div className="dash-card">
        <div className="dash-card-head">
          <span>Move types</span>
        </div>
        <p className="dash-empty">Play the move levels (L2+) to see which types are slowest.</p>
      </div>
    )
  }
  const maxLat = Math.max(...rows.map((r) => r.medianMs || 0), 1)
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <span>Move types — slowest first</span>
      </div>
      <div className="mt-list">
        {rows.map((r, i) => (
          <div className="mt-row" key={r.levelId + r.sub}>
            <div className="mt-label">
              <span className="mt-name">{r.label}</span>
              <span className="mt-lvl">{r.levelId}</span>
            </div>
            <div className="mt-bar-wrap">
              <div
                className={'mt-bar' + (i === 0 ? ' worst' : '')}
                style={{ width: Math.max(6, ((r.medianMs || 0) / maxLat) * 100) + '%' }}
              />
            </div>
            <div className="mt-vals">
              <span className="mt-lat">{fmtSecs(r.medianMs)}</span>
              <span className="mt-acc">{pct(r.accuracy)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="dash-hint-line">Bars = median decode latency. The mix tilts reps toward these.</p>
    </div>
  )
}

// ---- per-level latency trends ----
function LevelTrends() {
  const played = LEVELS.map((lvl) => ({ lvl, s: levelSummary(lvl.id) })).filter(
    (x) => x.s.played > 0
  )
  if (!played.length) return null
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <span>By level</span>
      </div>
      <div className="lt-list">
        {played.map(({ lvl, s }) => (
          <div className="lt-row" key={lvl.id}>
            <div className="lt-head">
              <span className="pill">{lvl.id}</span>
              <span className="lt-name">{lvl.name}</span>
              <span className="lt-best">
                ⏱ {fmtSecs(s.bestMedianMs)} · 🎯 {pct(s.bestAccuracy)} · 🔥 {s.bestStreak}
              </span>
            </div>
            <MiniTrend rounds={s.rounds} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTrend({ rounds }) {
  const pts = rounds.filter((r) => r.medianMs != null).slice(-14)
  if (pts.length < 2) {
    return <div className="lt-spark-empty">{pts.length ? 'one round so far' : 'no timed rounds yet'}</div>
  }
  const w = 300
  const h = 34
  const pad = 4
  const vals = pts.map((p) => p.medianMs)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => pad + (i * (w - 2 * pad)) / (pts.length - 1)
  const y = (v) => pad + ((v - min) / span) * (h - 2 * pad)
  const line = pts.map((p, i) => `${x(i)},${y(p.medianMs)}`).join(' ')
  const improved = pts[pts.length - 1].medianMs <= pts[0].medianMs
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={'lt-spark ' + (improved ? 'good' : 'warn')} preserveAspectRatio="none">
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
