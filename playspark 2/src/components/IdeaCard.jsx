export default function IdeaCard({ idea }) {
  if (!idea) return null
  return (
    <div className="idea-card">
      {idea.aiGenerated && <span className="ai-badge">✦ AI-generated, just for you</span>}
      <h2>{idea.title}</h2>
      <p className="idea-description">{idea.description}</p>

      {idea.materials?.length > 0 && (
        <div className="materials">
          <span className="materials-label">You'll need</span>
          <div className="chip-row">
            {idea.materials.map((m) => (
              <span className="chip" key={m}>{m}</span>
            ))}
          </div>
        </div>
      )}

      <div className="badge-row">
        <span className="badge">{idea.type === 'educational' ? '🧠 Educational' : '🎈 Fun'}</span>
        <span className="badge">{idea.assistance ? '🤝 Needs a parent' : '🧍 Can do solo'}</span>
        {idea.duration && <span className="badge">⏱ {idea.duration}</span>}
      </div>
    </div>
  )
}
