import { useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel.jsx'
import IdeaCard from './components/IdeaCard.jsx'
import FeedbackButtons from './components/FeedbackButtons.jsx'
import { pickIdea, recordFeedback, ideaCountForFilters, addCustomIdea } from './lib/recommend.js'
import { fetchAiIdea } from './lib/aiFetch.js'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedbackGiven, setFeedbackGiven] = useState(null)

  const matchCount = useMemo(() => ideaCountForFilters(filters), [filters])

  async function handleGetIdea() {
    setLoading(true)
    setError(null)
    setFeedbackGiven(null)

    let next = pickIdea(filters)
    if (!next) {
      next = await fetchAiIdea({ ...filters, excludeTitles: [] })
      if (next) addCustomIdea(next)
    }

    setLoading(false)
    if (!next) {
      setError("No ideas match those filters yet — try widening them, or check back after adding an AI key.")
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
            matchCount={matchCount}
          />
        )}

        {step === 'idea' && (
          <div className="idea-view">
            <button className="back-link" onClick={() => setStep('filter')}>
              ← Change filters
            </button>

            {loading && <p className="loading-text">Finding something fun…</p>}
            {!loading && idea && <IdeaCard idea={idea} />}

            {!loading && idea && (
              <div className="idea-actions">
                <FeedbackButtons given={feedbackGiven} onFeedback={handleFeedback} />
                <button className="secondary-btn" onClick={handleGetIdea}>
                  Try another idea
                </button>
              </div>
            )}
          </div>
        )}

        {loading && step === 'filter' && <p className="loading-text">Finding something fun…</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
