import { LEVELS } from '../lib/levels'
import { levelSummary, weakestSub } from '../lib/stats'
import { levelCount } from '../lib/sampler'
import InstallHint from './InstallHint'

const fmtSecs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(2) + 's')
const pct = (x) => Math.round(x * 100) + '%'

const COORD_NOTES = {
  on: 'Edge labels always visible — training wheels while you learn.',
  peek: 'Labels hidden — press & hold “Peek” in a round to check when you’re stuck.',
  off: 'Labels never shown — pure recall. Knowing where e4 is without looking is the goal.',
}

export default function LevelSelect({
  coordMode,
  onChooseCoordMode,
  orientation,
  onChooseOrientation,
  notation,
  onChooseNotation,
  onPick,
  onOpenGuide,
  onOpenDashboard,
  onReset,
}) {
  return (
    <div className="menu">
      <InstallHint />
      <header className="hero">
        <h1>
          Sight<span>read</span> Chess
        </h1>
        <p className="tag">Read chess notation at a glance. See the move, play it, get faster.</p>
        <div className="hero-btns">
          <button className="guide-link" onClick={onOpenGuide}>
            📖 Notation guide
          </button>
          <button className="guide-link" onClick={onOpenDashboard}>
            📊 Progress
          </button>
        </div>
      </header>

      <div className="settings-row">
        <div className="seg-group">
          <span className="seg-label">Coordinates</span>
          <Segmented
            value={coordMode}
            onChange={onChooseCoordMode}
            options={[
              ['on', 'On'],
              ['peek', 'Peek'],
              ['off', 'Off'],
            ]}
          />
        </div>

        <div className="seg-group">
          <span className="seg-label">Board side</span>
          <Segmented
            value={orientation}
            onChange={onChooseOrientation}
            options={[
              ['white', 'White'],
              ['black', 'Black'],
              ['random', 'Random'],
            ]}
          />
        </div>

        <div className="seg-group">
          <span className="seg-label">Notation</span>
          <Segmented
            value={notation}
            onChange={onChooseNotation}
            options={[
              ['san', 'Letters'],
              ['figurine', '♞ Figurine'],
            ]}
          />
        </div>

        <span className="settings-note full">{COORD_NOTES[coordMode] || COORD_NOTES.on}</span>
      </div>

      <div className="grid">
        {LEVELS.map((lvl) => {
          const s = levelSummary(lvl.id)
          const focus =
            lvl.kind === 'move' ? weakestSub(lvl.id, lvl.subs, lvl.subLabels) : null
          const count = lvl.kind === 'move' ? levelCount(lvl.id) : null
          const thin = count != null && count < 120
          return (
            <button key={lvl.id} className="card" onClick={() => onPick(lvl.id)}>
              <div className="card-top">
                <span className="pill">{lvl.id}</span>
                <span className="card-name">{lvl.name}</span>
              </div>
              <div className="examples">
                {lvl.examples.map((e) => (
                  <code key={e}>{e}</code>
                ))}
              </div>
              <div className="card-blurb">{lvl.blurb}</div>

              <div className="card-stats">
                {s.played === 0 ? (
                  <span className="muted">not played yet</span>
                ) : (
                  <>
                    <span title="best median decode latency">⏱ {fmtSecs(s.bestMedianMs)}</span>
                    <span title="best accuracy">🎯 {pct(s.bestAccuracy)}</span>
                    <span title="best streak">🔥 {s.bestStreak}</span>
                  </>
                )}
              </div>
              {focus && <div className="focus">focus: {focus}</div>}
              {thin && <div className="thin">only {count} positions in the pool</div>}
            </button>
          )
        })}
      </div>

      <footer className="menu-foot">
        <details>
          <summary>How it works</summary>
          <ul>
            <li>Each round is 30 moves or 60 seconds — whichever comes first.</li>
            <li>
              Your headline score is <b>decode latency</b> (median time per correct move) and{' '}
              <b>accuracy</b>, tracked per level so you can watch both improve.
            </li>
            <li>Wrong move? The correct one flashes on the board, then you move on. Streak resets.</li>
            <li>
              Within a level, the mix tilts a little toward the move-types you’ve been slow or wrong
              on. Difficulty itself stays constant, so day-to-day runs compare fairly.
            </li>
            <li>Positions are real — sampled from 990 world-championship games.</li>
          </ul>
        </details>
        <button className="link-btn guide-foot-link" onClick={onOpenGuide}>
          📖 Notation guide — every rule on one page
        </button>
        <button className="link-btn danger" onClick={onReset}>
          Reset all progress
        </button>
      </footer>
    </div>
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([val, label]) => (
        <button
          key={val}
          className={'seg-btn' + (value === val ? ' on' : '')}
          onClick={() => onChange(val)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
