/**
 * Calls the Netlify serverless function to generate a brand-new idea via
 * whichever AI provider is configured (Claude, GPT, or Gemini — see
 * netlify/functions/generate-idea.js). Returns null on any failure so the
 * UI can fall back to the curated set without breaking.
 */
export async function fetchAiIdea({ age, type, assistance, excludeTitles }) {
  try {
    const res = await fetch('/.netlify/functions/generate-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age, type, assistance, excludeTitles }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.title || !data.description) return null
    return {
      id: `ai-${Date.now()}`,
      title: data.title,
      description: data.description,
      materials: data.materials || [],
      ageMin: age,
      ageMax: age,
      type: type === 'either' ? (data.type || 'fun') : type,
      assistance: assistance === 'yes',
      duration: data.duration || '15-20 min',
      gender: 'neutral',
      aiGenerated: true,
    }
  } catch {
    return null
  }
}
