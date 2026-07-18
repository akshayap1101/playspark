import ideas from '../data/ideas.json'

const FEEDBACK_KEY = 'playspark_feedback_v1'
const RECENT_KEY = 'playspark_recent_v1'
const CUSTOM_KEY = 'playspark_custom_ideas_v1'
const RECENT_LIMIT = 8

// ---- localStorage helpers -------------------------------------------------

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private browsing etc) - fail silently
  }
}

export function getFeedbackMap() {
  return readJSON(FEEDBACK_KEY, {})
}

function getRecentEntries() {
  return readJSON(RECENT_KEY, [])
}

export function getRecentIds() {
  return getRecentEntries().map((e) => e.id)
}

export function getRecentTitles() {
  return getRecentEntries().map((e) => e.title)
}

/**
 * Records that an idea (curated, custom, or AI-generated) was just shown,
 * so it's deprioritized next pick and excluded from the AI's next prompt.
 */
export function recordShown(idea) {
  const recent = getRecentEntries()
  const next = [{ id: idea.id, title: idea.title }, ...recent.filter((r) => r.id !== idea.id)].slice(0, RECENT_LIMIT)
  writeJSON(RECENT_KEY, next)
}

export function getCustomIdeas() {
  return readJSON(CUSTOM_KEY, [])
}

export function addCustomIdea(idea) {
  const custom = getCustomIdeas()
  writeJSON(CUSTOM_KEY, [...custom, idea])
}

// ---- filtering + scoring ---------------------------------------------------

function allIdeas() {
  return [...ideas, ...getCustomIdeas()]
}

export function filterIdeas({ age, type, assistance }) {
  return allIdeas().filter((idea) => {
    if (age < idea.ageMin || age > idea.ageMax) return false
    if (type && type !== 'either' && idea.type !== type) return false
    if (assistance === 'no' && idea.assistance === true) return false
    if (assistance === 'yes' && idea.assistance === false) return false
    return true
  })
}

function scoreOf(idea, feedbackMap) {
  const fb = feedbackMap[idea.id]
  if (!fb) return 1
  const score = 1 + (fb.up || 0) * 1.5 - (fb.down || 0) * 1.2
  return Math.max(score, 0.15)
}

function weightedPick(list, feedbackMap) {
  const weights = list.map((idea) => scoreOf(idea, feedbackMap))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < list.length; i++) {
    r -= weights[i]
    if (r <= 0) return list[i]
  }
  return list[list.length - 1]
}

/**
 * Pick the next idea to show given the current filters.
 * Prefers ideas not shown recently, weighted by past feedback.
 * Returns null if nothing matches at all (caller can offer an AI-generated idea).
 */
export function pickIdea(filters) {
  const matches = filterIdeas(filters)
  if (matches.length === 0) return null

  const feedbackMap = getFeedbackMap()
  const recent = getRecentIds()

  const fresh = matches.filter((idea) => !recent.includes(idea.id))
  const pool = fresh.length > 0 ? fresh : matches

  const chosen = weightedPick(pool, feedbackMap)
  recordShown(chosen)
  return chosen
}

export function recordFeedback(ideaId, worked) {
  const feedbackMap = getFeedbackMap()
  const existing = feedbackMap[ideaId] || { up: 0, down: 0 }
  if (worked) existing.up += 1
  else existing.down += 1
  feedbackMap[ideaId] = existing
  writeJSON(FEEDBACK_KEY, feedbackMap)
  return feedbackMap
}

export function ideaCountForFilters(filters) {
  return filterIdeas(filters).length
}
