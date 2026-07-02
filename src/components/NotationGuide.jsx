// The one-page reference: everything Sightread tests, explained. This is the "learn"
// half — read it once, then the drills are the test.
export default function NotationGuide({ onExit }) {
  return (
    <div className="guide">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">Notation guide</div>
        <div className="spacer" />
      </div>

      <p className="guide-intro">
        Standard algebraic notation (SAN) is how nearly every book, website, and game
        score records chess moves. Learn these rules once — then every level here is
        practice at reading them fast.
      </p>

      <Section title="The board">
        <p>
          Eight <b>files</b> (columns), lettered <Code>a</Code>–<Code>h</Code> left to
          right from White’s side. Eight <b>ranks</b> (rows), numbered <Code>1</Code>–
          <Code>8</Code> from White’s side up to Black’s. Every square is a file + a
          rank: <Code>e4</Code> is the e-file, 4th rank. White’s back rank is 1, Black’s
          is 8.
        </p>
      </Section>

      <Section title="The pieces">
        <table className="guide-table">
          <tbody>
            <tr><td><Code>K</Code></td><td>King</td></tr>
            <tr><td><Code>Q</Code></td><td>Queen</td></tr>
            <tr><td><Code>R</Code></td><td>Rook</td></tr>
            <tr><td><Code>B</Code></td><td>Bishop</td></tr>
            <tr><td><Code>N</Code></td><td>Knight (N, because K is taken)</td></tr>
            <tr><td>—</td><td>A pawn has <b>no</b> letter</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="A move">
        <p>
          Piece letter + the square it lands on. <Code>Nf3</Code> = knight to f3.{' '}
          <Code>Be2</Code> = bishop to e2. A pawn move is just the destination square:{' '}
          <Code>e4</Code> = the pawn goes to e4.
        </p>
      </Section>

      <Section title="Captures — x">
        <p>
          An <Code>x</Code> means a capture. <Code>Nxe5</Code> = knight takes whatever is
          on e5. For a pawn capture, the pawn’s starting <i>file</i> comes first:{' '}
          <Code>exd5</Code> = the e-pawn captures on d5.
        </p>
      </Section>

      <Section title="Check & checkmate — + and #">
        <p>
          <Code>+</Code> means the move gives check; <Code>#</Code> means checkmate.
          They’re just flags on the end — <Code>Qh5+</Code> is still “queen to h5”, and{' '}
          <Code>Qh7#</Code> is still “queen to h7”. They don’t change the piece or square
          you play.
        </p>
      </Section>

      <Section title="Castling — O-O and O-O-O">
        <p>
          <Code>O-O</Code> = castle kingside (short). <Code>O-O-O</Code> = castle
          queenside (long). Either way you move the <b>king two squares</b> toward the
          rook; the rook jumps over. (Those are capital O’s, not zeros.)
        </p>
      </Section>

      <Section title="Promotion — =">
        <p>
          When a pawn reaches the far end it promotes. <Code>e8=Q</Code> = pawn to e8,
          becomes a queen. You’ll almost always see <Code>=Q</Code>, but{' '}
          <Code>=N</Code>, <Code>=R</Code>, <Code>=B</Code> are legal too.
        </p>
      </Section>

      <Section title="En passant">
        <p>
          A special pawn capture: if an enemy pawn just moved two squares and landed
          beside yours, you can capture it as if it had moved one — landing on the{' '}
          <i>empty</i> square behind it. It’s written like a normal pawn capture:{' '}
          <Code>exd6</Code>, even though d6 looks empty.
        </p>
      </Section>

      <Section title="Disambiguation">
        <p>
          When <i>two</i> identical pieces could reach the same square, the notation adds
          which one is moving:
        </p>
        <ul className="guide-list">
          <li><Code>Nbd7</Code> — the knight on the <b>b</b>-file goes to d7 (add the file).</li>
          <li><Code>R1e2</Code> — the rook on the <b>1st</b> rank goes to e2 (add the rank).</li>
          <li><Code>Qh4e1</Code> — the queen on <b>h4</b> goes to e1 (add the whole square, when file or rank alone isn’t enough).</li>
        </ul>
      </Section>

      <p className="guide-foot">
        Want the exhaustive reference?{' '}
        <a href="https://en.wikipedia.org/wiki/Algebraic_notation_(chess)" target="_blank" rel="noreferrer">
          Wikipedia: Algebraic notation
        </a>{' '}
        ·{' '}
        <a href="https://www.chess.com/terms/chess-notation" target="_blank" rel="noreferrer">
          chess.com: Chess notation
        </a>
      </p>

      <div className="sc-actions">
        <button className="btn primary" onClick={onExit}>
          Start training
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="guide-section">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function Code({ children }) {
  return <code className="guide-code">{children}</code>
}
