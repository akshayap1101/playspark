import ideas from '../data/ideas.json'

const FEEDBACK_KEY = 'playspark_feedback_v1'
const SEEN_KEY = 'playspark_seen_v1'
const CUSTOM_KEY = 'playspark_custom_ideas_v1'

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

// ---- "seen" tracking: no repeats within a filter combo until every ----------
// ---- matching idea has been shown once, then the cycle resets. -------------

function getSeenIds() {
  return readJSON(SEEN_KEY, [])
}

function markSeen(id) {
  const seen = getSeenIds()
  if (!seen.includes(id)) {
    writeJSON(SEEN_KEY, [...seen, id])
  }
}

function clearSeenFor(ids) {
  const seen = getSeenIds()
  writeJSON(SEEN_KEY, seen.filter((id) => !ids.includes(id)))
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
 * Within the set of ideas matching these filters, nothing repeats until every
 * matching idea has been shown at least once — then the cycle resets and
 * repeats become possible again, weighted toward ideas with better feedback.
 * Returns null if nothing matches the filters at all.
 */
export function pickIdea(filters) {
  const pool = filterIdeas(filters)
  if (pool.length === 0) return null

  const feedbackMap = getFeedbackMap()
  const seen = getSeenIds()

  let unseen = pool.filter((idea) => !seen.includes(idea.id))
  if (unseen.length === 0) {
    // Every idea matching this filter combo has been viewed once — reset
    // just this pool's seen status so the cycle can start again.
    clearSeenFor(pool.map((idea) => idea.id))
    unseen = pool
  }

  const chosen = weightedPick(unseen, feedbackMap)
  markSeen(chosen.id)
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
