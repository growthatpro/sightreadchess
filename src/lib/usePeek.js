import { useState } from 'react'

// Turns the coordinate-label mode into a concrete "show labels?" boolean plus the
// hold-to-peek button wiring. In 'peek' mode the labels are hidden until you press
// and hold the peek button (a quick tap flashes them; releasing hides them) — the
// friction is the point, so you only lean on the labels when genuinely stuck.
export function usePeek(coordMode) {
  const [peeking, setPeeking] = useState(false)
  const showCoords = coordMode === 'on' || (coordMode === 'peek' && peeking)
  const isPeek = coordMode === 'peek'
  const peekHandlers = {
    onPointerDown: (e) => {
      e.preventDefault()
      setPeeking(true)
    },
    onPointerUp: () => setPeeking(false),
    onPointerLeave: () => setPeeking(false),
    onPointerCancel: () => setPeeking(false),
  }
  return { showCoords, isPeek, peeking, peekHandlers }
}
