// The hold-to-peek control, shown only in 'peek' coordinate mode. Press and hold to
// reveal the edge labels; release to hide them again.
export default function PeekButton({ isPeek, peeking, peekHandlers }) {
  if (!isPeek) return null
  return (
    <button className={'peek-btn' + (peeking ? ' active' : '')} type="button" {...peekHandlers}>
      {peeking ? '👁 labels showing' : '👁 Hold to peek at labels'}
    </button>
  )
}
