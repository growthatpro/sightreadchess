import { useState, lazy, Suspense } from 'react'
import LevelSelect from './components/LevelSelect'
import Round from './components/Round'
import CoordinateWarmup from './components/CoordinateWarmup'
import FilesRanks from './components/FilesRanks'
import Onboarding from './components/Onboarding'

// Heavy modes (chess.js, bundled game data, the bigger screens) load on demand — this
// keeps the first paint light on a phone. The core reading loop above stays eager.
const Replay = lazy(() => import('./components/Replay'))
const NotationGuide = lazy(() => import('./components/NotationGuide'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const LichessImport = lazy(() => import('./components/LichessImport'))
const ChessComImport = lazy(() => import('./components/ChessComImport'))
const WritingPractice = lazy(() => import('./components/WritingPractice'))
const AnnotatedReading = lazy(() => import('./components/AnnotatedReading'))
const SequenceWriting = lazy(() => import('./components/SequenceWriting'))
const TestMode = lazy(() => import('./components/TestMode'))
import {
  getCoordMode,
  setCoordMode,
  getOrientation,
  setOrientation,
  getNotation,
  setNotation,
  getBoardTheme,
  setBoardTheme,
  getPieceSet,
  setPieceSet,
  getSound,
  setSound,
  getBlindfold,
  setBlindfold,
  getOnboarded,
  setOnboarded,
  getRating,
  overallStats,
  resetAll,
} from './lib/stats'
import { LEVEL_BY_ID } from './lib/levels'

export default function App() {
  // First run → onboarding; afterwards → straight to the levels. Anyone with existing
  // progress (played a round or taken a test) counts as onboarded, so the intro never
  // reappears for returning users after this update.
  const [view, setView] = useState(() => {
    const seen = getOnboarded() || overallStats().rounds > 0 || getRating().current != null
    return seen ? { name: 'menu' } : { name: 'onboarding' }
  })
  const [coordMode, setCoordModeState] = useState(getCoordMode())
  const [orientation, setOrientationState] = useState(getOrientation())
  const [notation, setNotationState] = useState(getNotation())
  const [boardTheme, setBoardThemeState] = useState(getBoardTheme())
  const [pieceSet, setPieceSetState] = useState(getPieceSet())
  const [sound, setSoundState] = useState(getSound())
  const [blindfold, setBlindfoldState] = useState(getBlindfold())
  const [nonce, setNonce] = useState(0) // forces a fresh mount on "Again"

  function chooseCoordMode(v) {
    setCoordMode(v)
    setCoordModeState(v)
  }
  function chooseOrientation(v) {
    setOrientation(v)
    setOrientationState(v)
  }
  function chooseNotation(v) {
    setNotation(v)
    setNotationState(v)
  }
  function chooseBoardTheme(v) {
    setBoardTheme(v)
    setBoardThemeState(v)
  }
  function choosePieceSet(v) {
    setPieceSet(v)
    setPieceSetState(v)
  }
  function chooseSound(v) {
    setSound(v)
    setSoundState(v)
  }
  function chooseBlindfold(v) {
    setBlindfold(v)
    setBlindfoldState(v)
  }

  function pick(levelId) {
    setNonce((n) => n + 1)
    setView({ name: 'play', levelId })
  }

  function exit() {
    setView({ name: 'menu' })
  }

  function reset() {
    if (confirm('Reset all progress on this device? This can’t be undone.')) {
      resetAll()
      setCoordModeState(getCoordMode())
      setOrientationState(getOrientation())
      setNotationState(getNotation())
      setBoardThemeState(getBoardTheme())
      setPieceSetState(getPieceSet())
      setSoundState(getSound())
      setBlindfoldState(getBlindfold())
      setView({ name: 'menu' })
      setNonce((n) => n + 1)
    }
  }

  function finishOnboarding(dest) {
    setOnboarded(true)
    setView({ name: dest })
  }

  let body
  if (view.name === 'onboarding') {
    body = (
      <Onboarding
        onStartTest={() => finishOnboarding('test')}
        onStartLevels={() => finishOnboarding('menu')}
      />
    )
  } else if (view.name === 'menu') {
    body = (
      <LevelSelect
        coordMode={coordMode}
        onChooseCoordMode={chooseCoordMode}
        orientation={orientation}
        onChooseOrientation={chooseOrientation}
        notation={notation}
        onChooseNotation={chooseNotation}
        boardTheme={boardTheme}
        onChooseBoardTheme={chooseBoardTheme}
        pieceSet={pieceSet}
        onChoosePieceSet={choosePieceSet}
        sound={sound}
        onChooseSound={chooseSound}
        blindfold={blindfold}
        onChooseBlindfold={chooseBlindfold}
        onPick={pick}
        onOpenGuide={() => setView({ name: 'guide' })}
        onOpenDashboard={() => setView({ name: 'dashboard' })}
        onOpenLichess={() => setView({ name: 'lichess' })}
        onOpenChessCom={() => setView({ name: 'chesscom' })}
        onOpenWriting={() => setView({ name: 'writing' })}
        onOpenAnnotated={() => setView({ name: 'annotated' })}
        onOpenSequence={() => setView({ name: 'sequence' })}
        onOpenTest={() => setView({ name: 'test' })}
        onReset={reset}
      />
    )
  } else if (view.name === 'guide') {
    body = <NotationGuide onExit={exit} />
  } else if (view.name === 'dashboard') {
    body = <Dashboard onExit={exit} onOpenTest={() => setView({ name: 'test' })} />
  } else if (view.name === 'test') {
    body = (
      <TestMode
        key={nonce}
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        onExit={exit}
      />
    )
  } else if (view.name === 'lichess') {
    body = (
      <LichessImport
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        onExit={exit}
      />
    )
  } else if (view.name === 'chesscom') {
    body = (
      <ChessComImport
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        onExit={exit}
      />
    )
  } else if (view.name === 'writing') {
    body = <WritingPractice coordMode={coordMode} orientation={orientation} onExit={exit} />
  } else if (view.name === 'annotated') {
    body = (
      <AnnotatedReading
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        blindfold={blindfold}
        onExit={exit}
      />
    )
  } else if (view.name === 'sequence') {
    body = (
      <SequenceWriting
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        onExit={exit}
      />
    )
  } else if (LEVEL_BY_ID[view.levelId].kind === 'filerank') {
    body = <FilesRanks key={nonce} coordMode={coordMode} orientation={orientation} onExit={exit} />
  } else if (LEVEL_BY_ID[view.levelId].kind === 'coords') {
    body = <CoordinateWarmup key={nonce} coordMode={coordMode} orientation={orientation} onExit={exit} />
  } else if (LEVEL_BY_ID[view.levelId].kind === 'replay') {
    body = (
      <Replay
        key={nonce}
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        blindfold={blindfold}
        onExit={exit}
      />
    )
  } else {
    body = (
      <Round
        key={`${view.levelId}-${nonce}`}
        levelId={view.levelId}
        coordMode={coordMode}
        orientation={orientation}
        notation={notation}
        onExit={exit}
      />
    )
  }

  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Loading…</div>}>{body}</Suspense>
    </div>
  )
}
