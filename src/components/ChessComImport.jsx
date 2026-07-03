import { useState } from 'react'
import { Chess } from 'chess.js'
import Replay from './Replay'

// Drill notation from your OWN Chess.com games. The free public Chess.com API (no
// login / key needed) serves games by month, newest last. We pull the most recent
// months, keep standard-chess games, parse each PGN into the same shape the whole-game
// replay uses, and play the one you pick through that engine.

const USER_KEY = 'sightread.chesscomUser'
const MAX_GAMES = 18
const MAX_PLIES = 200
const MAX_MONTHS = 6 // how far back to look for recent games

// One Chess.com game object -> our replay game shape (or null to skip).
function gameFrom(obj) {
  if (!obj || obj.rules !== 'chess') return null // standard chess only (no 960 / variants)
  try {
    const c = new Chess()
    c.loadPgn(obj.pgn, { sloppy: true })
    const sans = c.history()
    if (!sans || sans.length < 6) return null
    const h = c.header() || {}
    return {
      w: (obj.white && obj.white.username) || h.White || '?',
      b: (obj.black && obj.black.username) || h.Black || '?',
      date: h.UTCDate || h.Date || '',
      result: h.Result || '',
      timeClass: obj.time_class || '',
      sans: sans.slice(0, MAX_PLIES),
    }
  } catch {
    return null
  }
}

export default function ChessComImport({ coordMode = 'on', orientation = 'white', notation = 'san', onExit }) {
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
      // 1. list the player's monthly archives (oldest -> newest)
      const arcRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user)}/games/archives`)
      if (arcRes.status === 404) {
        setError(`No Chess.com user “${user}” found.`)
        setLoading(false)
        return
      }
      if (!arcRes.ok) {
        setError(`Chess.com returned an error (${arcRes.status}). Try again shortly.`)
        setLoading(false)
        return
      }
      const { archives } = await arcRes.json()
      if (!archives || !archives.length) {
        setError(`“${user}” has no public games on Chess.com.`)
        setLoading(false)
        return
      }

      // 2. walk the most recent months (newest first) until we have enough games
      const months = archives.slice(-MAX_MONTHS).reverse()
      let collected = []
      for (const url of months) {
        if (collected.length >= MAX_GAMES) break
        const r = await fetch(url)
        if (!r.ok) continue
        const j = await r.json()
        const monthGames = (j.games || [])
          .map(gameFrom)
          .filter(Boolean)
          .reverse() // newest game of the month first
        collected = collected.concat(monthGames)
      }

      const top = collected.slice(0, MAX_GAMES)
      if (!top.length) {
        setError('No recent standard games found — try a different username, or that account only has variants / very short games.')
      } else {
        setGames(top)
        setStage('list')
      }
    } catch {
      setError('Could not reach Chess.com. Check your connection and try again.')
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
        titlePill="♟"
        titleName="Chess.com game"
        onExit={() => setStage('list')}
      />
    )
  }

  return (
    <div className="lichess">
      <div className="round-top">
        <button className="link-btn" onClick={stage === 'list' ? () => setStage('input') : onExit}>
          ← {stage === 'list' ? 'Back' : 'Levels'}
        </button>
        <div className="round-title">♟ Chess.com import</div>
        <div className="spacer" />
      </div>

      {stage === 'input' && (
        <form className="li-form" onSubmit={load}>
          <p className="li-intro">
            Read notation from your <b>own</b> games. Enter a Chess.com username and pick a recent
            game to play through, move by move.
          </p>
          <input
            className="li-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Chess.com username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="btn primary" type="submit" disabled={loading || !username.trim()}>
            {loading ? 'Loading…' : 'Load recent games'}
          </button>
          {error && <p className="li-error">{error}</p>}
          <p className="li-note">Public games only · no login needed · free Chess.com API</p>
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
                {[resultLabel(g.result), g.timeClass, Math.ceil(g.sans.length / 2) + ' moves']
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
