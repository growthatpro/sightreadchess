# Sightread Chess

A typing-tutor for **reading** chess notation. A move appears in standard algebraic
notation — `Nf3`, `exd5`, `O-O`, `Qxe7+`, `e8=Q`, `Nbd7` — and you play it on the
board. Fast, scored, daily reps to make notation-reading automatic. New to notation?
There's a one-page **Notation guide** linked from the menu.

## Run

```bash
npm install          # first time only
npm run dev          # http://localhost:5177/
```

## The idea

Seven fixed levels, easiest to hardest. Each round is **30 moves or 60 seconds**,
then a scorecard with your two headline numbers:

- **decode latency** — median time per correct move (the thing to drive down)
- **accuracy** — % of moves you got right

Both are tracked per level over time, plus a **streak** counter (resets on any miss).
Everything persists in your browser (localStorage) on this device.

- Move by **dragging** a piece, or **clicking** the source square then the
  destination.
- **No legal-move highlighting** and no legal-only constraint — that would leak the
  answer. You have to actually read the move.
- **Coordinate labels** have three modes on the Levels screen — **On** (always
  visible), **Peek** (hidden; hold the peek button to reveal them when stuck), and
  **Off** (never shown). The point is to train the direct `e4 → square` association,
  not to read the edge rails — so wean yourself from On → Peek → Off.
- Wrong move? The correct move flashes on the board, then you move on.

### Levels

| Level | What | Examples |
|-------|------|----------|
| L0 | Files & ranks — click any square on the named file/rank | `e-file`, `rank 4` |
| L1 | Coordinate warm-up — click the named square | `f6`, `c3` |
| L2 | Pawn moves | `e4`, `d5` |
| L3 | Piece moves | `Nf3`, `Bb5` |
| L4 | Captures (piece + pawn) | `Nxe5`, `exd5` |
| L5 | Castling | `O-O`, `O-O-O` |
| L6 | Promotion + en passant | `e8=Q`, `exd6` |
| L7 | Disambiguation | `Nbd7`, `R1e2` |
| L8 | Whole game — read a real game move by move | — |

Check / mate (`+` / `#`) aren't a level — they show up naturally inside the others.

**L8 (whole-game replay)** is different from the drill levels: instead of isolated
positions, you play through one real game from the opening, the board carrying
forward. A wrong move flashes the correct one and gets auto-played anyway, so the
game never falls out of sync. It's untimed — Finish any time and your moves still
score. Also toggle **Board side** (White / Black / Random) and **Notation**
(Letters / Figurine `♞`) on the menu.

Within a level, the mix tilts a little toward the move sub-types you've been slow or
wrong on ("focus: …" on the card). Difficulty itself stays constant so day-to-day
runs compare fairly.

## How it's built

- **Vite + React 18**, `react-chessboard` for the board, `chess.js` (build-time only)
  for parsing PGN and classifying moves.
- Drills are generated **at build time** from real games and bundled as JSON.

### Regenerating the drill set

Positions come from 46 world-championship PGN files in `src/pgn/`. To rebuild both
the drill pool (`src/data/drills.json`) and the replay library
(`src/data/games.json`):

```bash
npm run drills
```

The generator (`scripts/build-drills.mjs`) replays every game, classifies each
half-move into a level (see `src/lib/levels.js`) for the L2–L7 drills, and keeps the
full games (20–120 plies) as compact SAN lists for L8 replay.

## Credit

Forked in spirit from [mattjliu/Notation-Trainer](https://github.com/mattjliu/Notation-Trainer)
(MIT) — its core loop and PGN data — then rebuilt on a current stack.
