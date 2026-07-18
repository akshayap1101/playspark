import { useState } from 'react'
import FilterPanel from './components/FilterPanel.jsx'
import IdeaCard from './components/IdeaCard.jsx'
import FeedbackButtons from './components/FeedbackButtons.jsx'
import { pickIdea, recordFeedback } from './lib/recommend.js'
import { logFeedbackToCloud } from './firebase.js'

const DEFAULT_FILTERS = {
  age: 3,
  type: 'either',
  assistance: 'either',
  gender: 'either',
}

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [step, setStep] = useState('filter') // 'filter' | 'idea'
  const [idea, setIdea] = useState(null)
  const [error, setError] = useState(null)
  const [feedbackGiven, setFeedbackGiven] = useState(null)

  function handleGetIdea() {
    setError(null)
    setFeedbackGiven(null)

    // Picks from the 200-idea curated library. Within the current filters,
    // nothing repeats until every matching idea has been shown once — see
    // lib/recommend.js for the cycling logic.
    const next = pickIdea(filters)

    if (!next) {
      setError('No ideas match those filters yet — try widening them.')
      return
    }
    setIdea(next)
    setStep('idea')
  }

  async function handleFeedback(worked) {
    if (!idea) return
    recordFeedback(idea.id, worked)
    setFeedbackGiven(worked)
    logFeedbackToCloud({
      ideaId: idea.id,
      title: idea.title,
      age: filters.age,
      type: filters.type,
      assistance: filters.assistance,
      worked,
    })
  }

  return (
    <div className="app-shell">
      <div className="app-card">
        {step === 'filter' && (
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onSubmit={handleGetIdea}
          />
        )}

        {step === 'idea' && (
          <div className="idea-view">
            <button className="back-link" onClick={() => setStep('filter')}>
              ← Change filters
            </button>

            {idea && <IdeaCard idea={idea} />}

            {idea && (
              <div className="idea-actions">
                <FeedbackButtons given={feedbackGiven} onFeedback={handleFeedback} />
                <button className="secondary-btn" onClick={handleGetIdea}>
                  Try another idea
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
