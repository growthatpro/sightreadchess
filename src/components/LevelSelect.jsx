import { LEVELS } from '../lib/levels'
import { levelSummary, weakestSub } from '../lib/stats'
import { levelCount } from '../lib/sampler'
import { BOARD_THEMES, PIECE_SETS } from '../lib/board'
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
  boardTheme,
  onChooseBoardTheme,
  pieceSet,
  onChoosePieceSet,
  onPick,
  onOpenGuide,
  onOpenDashboard,
  onOpenLichess,
  onOpenWriting,
  onOpenAnnotated,
  onOpenSequence,
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

        <div className="seg-group">
          <span className="seg-label">Board</span>
          <Segmented
            value={boardTheme}
            onChange={onChooseBoardTheme}
            options={Object.entries(BOARD_THEMES).map(([k, v]) => [k, v.label])}
            renderSwatch={(val) => (
              <span
                className="seg-swatch"
                style={{
                  background: `linear-gradient(135deg, ${BOARD_THEMES[val].light} 0 50%, ${BOARD_THEMES[val].dark} 50% 100%)`,
                }}
              />
            )}
          />
        </div>

        <div className="seg-group">
          <span className="seg-label">Pieces</span>
          <Segmented
            value={pieceSet}
            onChange={onChoosePieceSet}
            options={Object.entries(PIECE_SETS).map(([k, v]) => [k, v.label])}
            renderSwatch={(val) => (
              <img className="seg-piece" src={`/pieces/${val}/wN.svg`} alt="" />
            )}
          />
        </div>

        <div className="settings-help full">
          <p>
            <b>Coordinates</b> — the letters (a–h) and numbers (1–8) along the board’s edges.{' '}
            {COORD_NOTES[coordMode] || COORD_NOTES.on}
          </p>
          <p>
            <b>Board side</b> — which side you sit on. Notation never changes when the board flips;
            from Black’s side it’s just the mirror image.
          </p>
          <p>
            <b>Notation</b> — how a move is written. Letters (Nf3) are the standard; figurines (♞f3)
            can be easier to start with. Recommended: stick with Letters.
          </p>
          <p>
            <b>Board &amp; Pieces</b> — pure personal preference; pick whatever looks best to you.
          </p>
        </div>
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

      <button className="li-cta write-cta" onClick={onOpenWriting}>
        ✍️ Writing practice — see the move, write the notation →
      </button>

      <button className="li-cta seq-cta" onClick={onOpenSequence}>
        🧠 Sequence memory — study a line, then write it all from memory →
      </button>

      <button className="li-cta read-cta" onClick={onOpenAnnotated}>
        📖 Read an annotated game — a real game with commentary, move by move →
      </button>

      <button className="li-cta" onClick={onOpenLichess}>
        ⚡ Play your own Lichess games →
      </button>

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

function Segmented({ value, onChange, options, renderSwatch }) {
  return (
    <div className="seg">
      {options.map(([val, label]) => (
        <button
          key={val}
          className={'seg-btn' + (value === val ? ' on' : '')}
          onClick={() => onChange(val)}
        >
          {renderSwatch && renderSwatch(val)}
          {label}
        </button>
      ))}
    </div>
  )
}
