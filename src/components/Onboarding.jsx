// First-run welcome. Explains what the app is in three lines, then offers two ways in:
// take the placement test (sets a starting Sightreading rating) or go straight to the
// levels. Shown once — dismissed by either choice.

export default function Onboarding({ onStartTest, onStartLevels }) {
  return (
    <div className="onboard">
      <div className="onboard-hero">
        <div className="onboard-logo">♞</div>
        <h1>
          Sight<span>read</span> Chess
        </h1>
        <p className="onboard-tag">Get fast at reading chess notation.</p>
      </div>

      <div className="onboard-cards">
        <div className="onboard-card">
          <span className="oc-emoji">📖</span>
          <div>
            <b>See a move written down</b>
            <p>Like Nf3, exd5, O-O or Qxe7+ — the shorthand every chess book, app and coach uses.</p>
          </div>
        </div>
        <div className="onboard-card">
          <span className="oc-emoji">♟️</span>
          <div>
            <b>Play it on the board, fast</b>
            <p>Drag the piece, or tap the two squares. Right → next move. Wrong → the answer flashes.</p>
          </div>
        </div>
        <div className="onboard-card">
          <span className="oc-emoji">📈</span>
          <div>
            <b>Watch yourself get quicker</b>
            <p>Every round tracks your speed and accuracy. Two minutes a day is enough to improve.</p>
          </div>
        </div>
      </div>

      <div className="onboard-actions">
        <button className="btn primary" onClick={onStartTest}>
          🏁 Take the 2-minute placement test
        </button>
        <button className="btn" onClick={onStartLevels}>
          Start from the levels →
        </button>
      </div>
      <p className="onboard-foot">
        The test gives you a starting rating. New to notation? Start from the levels and build up.
      </p>
    </div>
  )
}
