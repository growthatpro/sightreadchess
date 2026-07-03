import { useState } from 'react'
import Replay from './Replay'
import annotated from '../data/annotated.json'

// Annotated reading mode — "read a chess book." Pick one of the famous annotated
// games, then play through it move by move while the written commentary follows along
// beneath the board. It reuses the whole-game Replay engine; the only extra is the
// per-move notes passed in as `annotations`.

function resultLabel(r) {
  if (r === '1-0') return { txt: 'White won', cls: 'win-w' }
  if (r === '0-1') return { txt: 'Black won', cls: 'win-b' }
  if (r === '1/2-1/2') return { txt: 'Draw', cls: 'draw' }
  return { txt: '', cls: '' }
}

function year(date) {
  const y = (date || '').split('.')[0]
  return /^\d{4}$/.test(y) ? y : ''
}

export default function AnnotatedReading({
  coordMode = 'on',
  orientation = 'white',
  notation = 'san',
  onExit,
}) {
  const [pickId, setPickId] = useState(null)
  const game = annotated.find((g) => g.id === pickId)

  if (game) {
    return (
      <Replay
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        fixedGame={game}
        annotations={game.comments}
        titlePill="📖"
        titleName="Annotated game"
        statKey="READ"
        onExit={() => setPickId(null)}
      />
    )
  }

  return (
    <div className="reading-picker">
      <div className="round-top">
        <button className="link-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="round-title">📖 Read an annotated game</div>
        <div className="spacer" />
      </div>

      <p className="reading-intro">
        Play through a legendary game move by move — its commentary follows along beneath the board,
        the way an annotated chess book reads. You still read every move in notation and play it; the
        notes tell you the story.
      </p>

      <div className="reading-list">
        {annotated.map((g) => {
          const res = resultLabel(g.result)
          const moves = Math.ceil(g.sans.length / 2)
          return (
            <button key={g.id} className="reading-card" onClick={() => setPickId(g.id)}>
              <div className="reading-card-top">
                <span className="reading-title">{g.title}</span>
                {res.txt && <span className={'reading-result ' + res.cls}>{res.txt}</span>}
              </div>
              <div className="reading-matchup">
                {g.matchup}
                {year(g.date) && <span className="reading-year"> · {year(g.date)}</span>}
                <span className="reading-len"> · {moves} moves</span>
              </div>
              {g.blurb && <p className="reading-blurb">{g.blurb}</p>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
