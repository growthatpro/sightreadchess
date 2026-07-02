import { useState } from 'react'
import LevelSelect from './components/LevelSelect'
import Round from './components/Round'
import CoordinateWarmup from './components/CoordinateWarmup'
import FilesRanks from './components/FilesRanks'
import Replay from './components/Replay'
import NotationGuide from './components/NotationGuide'
import {
  getCoordMode,
  setCoordMode,
  getOrientation,
  setOrientation,
  getNotation,
  setNotation,
  resetAll,
} from './lib/stats'
import { LEVEL_BY_ID } from './lib/levels'

export default function App() {
  const [view, setView] = useState({ name: 'menu' }) // {name:'menu'} | {name:'play', levelId}
  const [coordMode, setCoordModeState] = useState(getCoordMode())
  const [orientation, setOrientationState] = useState(getOrientation())
  const [notation, setNotationState] = useState(getNotation())
  const [nonce, setNonce] = useState(0) // forces a fresh Round mount on "Again"

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
      setView({ name: 'menu' })
      setNonce((n) => n + 1)
    }
  }

  let body
  if (view.name === 'menu') {
    body = (
      <LevelSelect
        coordMode={coordMode}
        onChooseCoordMode={chooseCoordMode}
        orientation={orientation}
        onChooseOrientation={chooseOrientation}
        notation={notation}
        onChooseNotation={chooseNotation}
        onPick={pick}
        onOpenGuide={() => setView({ name: 'guide' })}
        onReset={reset}
      />
    )
  } else if (view.name === 'guide') {
    body = <NotationGuide onExit={exit} />
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

  return <div className="app">{body}</div>
}
