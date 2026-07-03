import { useCallback, useEffect, useRef, useState } from 'react'

// Smooths the jump between two unrelated drill positions. Without this, the board
// library tries to *animate* the change and pieces scatter across the board. Instead
// we snap the new position in with no animation (so nothing teleports) and fade it in
// quickly — clean, and still fast. A played move still slides normally.
//
// The two-step fade matters: we snap to invisible with transition OFF (so it's
// instant, not an animated dip), let the position swap happen unseen, then turn the
// transition back on and go to full opacity so it fades in.
//
// Usage:
//   const { anim, style, swapIn, playMove } = useBoardSwap()
//   ...loading a fresh position → swapIn()
//   ...playing the actual move  → playMove()
//   <div className="board-wrap" style={style}><Board animationMs={anim} ... /></div>

const SHOWN = { opacity: 1, transition: 'opacity 0.16s ease' }
const HIDDEN = { opacity: 0, transition: 'none' } // instant → the swap happens unseen

export function useBoardSwap() {
  const [anim, setAnim] = useState(0)
  const [style, setStyle] = useState(SHOWN)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // A fresh, unrelated position: no teleport animation, snap invisible, then fade in.
  const swapIn = useCallback(() => {
    setAnim(0)
    setStyle(HIDDEN)
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      raf.current = requestAnimationFrame(() => setStyle(SHOWN))
    })
  }, [])

  // The actual move being played — let it slide, keep the board visible.
  const playMove = useCallback(() => {
    setAnim(140)
    setStyle(SHOWN)
  }, [])

  return { anim, style, swapIn, playMove }
}
