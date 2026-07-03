import { useState } from 'react'
import { Chess } from 'chess.js'
import Replay from './Replay'

// Drill notation from your OWN games. Pulls recent games from the free public
// Lichess API (no login / key needed), parses each PGN into the same game shape
// the whole-game replay uses, and plays the one you pick through that engine.

const USER_KEY = 'sightread.lichessUser'
const MAX_GAMES = 18
const MAX_PLIES = 200 // keep a single replay sane

function splitGames(text) {
  return text
    .split(/\n(?=\[Event )/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parsePgn(pgnText) {
  const out = []
  for (const chunk of splitGames(pgnText)) {
    try {
      const c = new Chess()
      c.loadPgn(chunk, { sloppy: true })
      const sans = c.history()
      if (!sans || sans.length < 6) continue
      const h = c.header() || {}
      out.push({
        w: h.White || '?',
        b: h.Black || '?',
        event: h.Event || '',
        date: h.UTCDate || h.Date || '',
        result: h.Result || '',
        opening: h.Opening || '',
        sans: sans.slice(0, MAX_PLIES),
      })
    } catch {
      /* skip a game that won't parse */
    }
  }
  return out
}

export default function LichessImport({ coordMode = 'on', orientation = 'white', notation = 'san', onExit }) {
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(USER_KEY) || ''
    } catch {
      return ''
    }
  })
  const [stage, setStage] = useState('input') // input | list | play
  const [games, setGames] = useState([])
  const [chosen, setChosen] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(e) {
    if (e) e.preventDefault()
    const user = username.trim()
    if (!user) return
    setLoading(true)
    setError('')
    try {
      localStorage.setItem(USER_KEY, user)
    } catch {
      /* ignore */
    }
    try {
      const url =
        `https://lichess.org/api/games/user/${encodeURIComponent(user)}` +
        `?max=${MAX_GAMES}&clocks=false&evals=false&opening=true`
      const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
      if (res.status === 404) {
        setError(`No Lichess user “${user}” found.`)
      } else if (res.status === 429) {
        setError('Lichess is rate-limiting — wait a minute and try again.')
      } else if (!res.ok) {
        setError(`Lichess returned an error (${res.status}). Try again shortly.`)
      } else {
        const parsed = parsePgn(await res.text())
        if (!parsed.length) {
          setError('No playable games found — that account may have none public, or only very short ones.')
        } else {
          setGames(parsed)
          setStage('list')
        }
      }
    } catch {
      setError('Could not reach Lichess. Check your connection and try again.')
    }
    setLoading(false)
  }

  if (stage === 'play' && chosen) {
    return (
      <Replay
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        fixedGame={chosen}
        titlePill="⚡"
        titleName="Lichess game"
        onExit={() => setStage('list')}
      />
    )
  }

  return (
    <div className="lichess">
      <div className="round-top">
        <button
          className="link-btn"
          onClick={stage === 'list' ? () => setStage('input') : onExit}
        >
          ← {stage === 'list' ? 'Back' : 'Levels'}
        </button>
        <div className="round-title">⚡ Lichess import</div>
        <div className="spacer" />
      </div>

      {stage === 'input' && (
        <form className="li-form" onSubmit={load}>
          <p className="li-intro">
            Read notation from your <b>own</b> games. Enter a Lichess username and pick a recent
            game to play through, move by move.
          </p>
          <input
            className="li-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Lichess username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="btn primary" type="submit" disabled={loading || !username.trim()}>
            {loading ? 'Loading…' : 'Load recent games'}
          </button>
          {error && <p className="li-error">{error}</p>}
          <p className="li-note">Public games only · no login needed · free Lichess API</p>
        </form>
      )}

      {stage === 'list' && (
        <div className="li-list">
          <p className="li-count">
            {games.length} recent games for <b>{username.trim()}</b>
          </p>
          {games.map((g, i) => (
            <button
              key={i}
              className="li-game"
              onClick={() => {
                setChosen(g)
                setStage('play')
              }}
            >
              <span className="li-players">
                {shortName(g.w)} <span className="li-vs">vs</span> {shortName(g.b)}
              </span>
              <span className="li-meta">
                {[resultLabel(g.result), g.opening ? clip(g.opening) : '', Math.ceil(g.sans.length / 2) + ' moves']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function shortName(n) {
  if (!n || n === '?') return 'Anon'
  return n
}
function resultLabel(r) {
  if (r === '1-0') return 'White won'
  if (r === '0-1') return 'Black won'
  if (r === '1/2-1/2') return 'Draw'
  return r || ''
}
function clip(s) {
  return s.length > 26 ? s.slice(0, 25) + '…' : s
}
