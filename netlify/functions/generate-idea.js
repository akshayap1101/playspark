// Netlify serverless function: generates one fresh screen-free activity idea.
// Tries whichever AI provider has a key configured, in this order:
//   ANTHROPIC_API_KEY (Claude) -> OPENAI_API_KEY (GPT) -> GEMINI_API_KEY (Gemini)
// If none are set, returns a 501 so the frontend quietly falls back to the
// curated dataset instead of breaking.

const SYSTEM_PROMPT = `You suggest screen-free, non-digital activities parents can do with their children using items already found around a typical home. You will be given a child's age (in years, can be a decimal like 0.8 or 1.5), a desired type ("educational" or "fun"), and whether parent assistance is available. Respond with ONLY a JSON object, no markdown fences, no extra text, in exactly this shape:
{"title": "short catchy title", "description": "1-3 sentences of clear instructions a busy parent can skim in seconds", "materials": ["item1", "item2"], "duration": "10-15 min", "type": "educational or fun"}
Keep it safe and age-appropriate. Only use common household items. Avoid choking-hazard items for children under 3 unless assistance is true.`

function buildUserPrompt({ age, type, assistance, excludeTitles }) {
  const avoid = Array.isArray(excludeTitles) && excludeTitles.length
    ? ` Avoid repeating or closely resembling these already-suggested ideas: ${excludeTitles.slice(0, 20).join(', ')}.`
    : ''
  return `Child age: ${age} years. Desired type: ${type === 'either' ? 'either educational or fun' : type}. Parent assistance available: ${assistance === 'no' ? 'no, must be independent play' : 'yes'}.${avoid} Give one new idea as the JSON object described.`
}

function extractJson(text) {
  if (!text) return null
  // Strip markdown code fences some models wrap JSON in, e.g. ```json ... ```
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : cleaned
  try {
    return JSON.parse(candidate)
  } catch (err) {
    console.error('Could not parse AI response as JSON. Raw text:', text)
    return null
  }
}

async function callClaude(userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  const text = data?.content?.[0]?.text || ''
  return extractJson(text)
}

async function callOpenAI(userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  return extractJson(text)
}

async function callGemini(userPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return extractJson(text)
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const userPrompt = buildUserPrompt(body)

  try {
    let idea = null
    if (process.env.ANTHROPIC_API_KEY) {
      idea = await callClaude(userPrompt)
    } else if (process.env.OPENAI_API_KEY) {
      idea = await callOpenAI(userPrompt)
    } else if (process.env.GEMINI_API_KEY) {
      idea = await callGemini(userPrompt)
    } else {
      return {
        statusCode: 501,
        body: JSON.stringify({ error: 'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in Netlify env vars.' }),
      }
    }

    if (!idea) {
      return { statusCode: 502, body: JSON.stringify({ error: 'AI response could not be parsed' }) }
    }

    return { statusCode: 200, body: JSON.stringify(idea) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
