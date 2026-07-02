import { useEffect, useState } from 'react'

// Responsive board size: fills the column on phones, caps at a comfy desktop size.
export function useBoardWidth(max = 460) {
  const calc = () => {
    if (typeof window === 'undefined') return max
    return Math.max(288, Math.min(window.innerWidth - 32, max))
  }
  const [w, setW] = useState(calc)
  useEffect(() => {
    const on = () => setW(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}
