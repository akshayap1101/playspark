export default function FeedbackButtons({ onFeedback, given }) {
  if (given !== null) {
    return (
      <p className="feedback-thanks">
        {given ? 'Nice! Saved for next time. 🎉' : 'Got it — noted, thanks.'}
      </p>
    )
  }
  return (
    <div className="feedback-row">
      <span className="feedback-prompt">Did it work?</span>
      <div className="feedback-buttons">
        <button className="feedback-btn up" onClick={() => onFeedback(true)}>
          👍 Loved it
        </button>
        <button className="feedback-btn down" onClick={() => onFeedback(false)}>
          👎 Not this time
        </button>
      </div>
    </div>
  )
}
