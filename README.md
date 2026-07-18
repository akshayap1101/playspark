# PlaySpark

A minimalist, AI-assisted app that suggests screen-free activities for kids
(ages 0.6–15), using items already at home. Pick an age, a type (educational
or fun), and whether you're able to help — get one idea, try it, and give a
thumbs up or down. It learns which ideas your child liked and shows those more.

Two screens total: filters, and the idea itself. No accounts, no sign-up.

## How it works

- **AI-first idea generation**: every "Get an idea" click calls a small
  Netlify serverless function that asks Claude, GPT, or Gemini (whichever key
  you've set) for a brand-new idea matching the current age, type, and
  assistance filters — so ideas stay varied instead of repeating. It's told
  what's been shown recently and asked to avoid repeating it.
- **56 curated ideas ship as a safety net**: if no AI key is set yet, or a
  request fails for any reason, the app silently falls back to the curated
  library instead of showing an error. Nothing breaks without a key — you
  just get curated ideas until you add one.
- **Feedback loop**: thumbs up/down are stored in the browser (`localStorage`)
  and used to weight future curated picks for that child. Optionally also
  logged to Firebase Firestore if you connect a project, so feedback isn't
  lost if the browser storage is cleared.
- Gender is included as a filter per the original request, but it doesn't
  change which ideas are shown — the dataset is intentionally gender-neutral.
  It's there in case you want to extend it later.

## Run it locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Works immediately with no keys — you're
using the curated dataset and local-only feedback.

## Connect Firebase (optional, for cloud-backed feedback)

1. Go to [console.firebase.google.com](https://console.firebase.google.com),
   create a project (free Spark plan is enough).
2. In the project, go to **Build > Firestore Database > Create database**,
   start in test mode (or use the rules below).
3. Go to **Project settings > General**, scroll to "Your apps", add a **Web
   app**, and copy the config values.
4. Copy `.env.example` to `.env` and fill in the six `VITE_FIREBASE_*` values.
5. Restart `npm run dev`.

Suggested Firestore rules (write-only from the app, no reads needed):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ideaFeedback/{doc} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

## Connect an AI provider (recommended — this is what makes ideas feel varied)

Without a key, the app quietly falls back to the 56 curated ideas on every
click. Adding one of these turns on live generation, so ideas stop repeating:

- **Claude**: get a key at [console.anthropic.com](https://console.anthropic.com) — cheapest/fastest option used here is `claude-3-5-haiku`, a few tenths of a cent per idea
- **GPT**: get a key at [platform.openai.com](https://platform.openai.com) — uses `gpt-4o-mini`
- **Gemini**: get a key at [aistudio.google.com](https://aistudio.google.com) — uses `gemini-1.5-flash`, and Google's free tier is generous enough to run this app on for free

Pick one — you don't need all three. These are used server-side only (in the
Netlify function), never exposed to the browser. Set them in Netlify's
dashboard, not in `.env` — see deploy steps below.

Every "Get an idea" click now makes one API call, so cost scales with usage —
for a single family clicking a few times a day, all three options land well
under a dollar a month.

## Deploy to Netlify

1. Push this folder to a GitHub repo.
2. In [app.netlify.com](https://app.netlify.com), **Add new site > Import an
   existing project**, connect the repo. Build command and publish directory
   are already set via `netlify.toml` (`npm run build`, `dist`).
3. Under **Site settings > Environment variables**, add:
   - The six `VITE_FIREBASE_*` variables (if using Firebase)
   - One of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` (if
     using AI top-up)
4. Deploy. Netlify automatically picks up `netlify/functions/generate-idea.js`
   as a serverless function at `/.netlify/functions/generate-idea`.

## Project structure

```
src/
  data/ideas.json          curated activity library
  lib/recommend.js         filtering, weighted selection, feedback scoring
  lib/aiFetch.js           calls the AI top-up function
  components/              FilterPanel, IdeaCard, FeedbackButtons
  firebase.js              optional Firestore logging, no-ops without config
  App.jsx                  two-step state machine (filter -> idea)
netlify/functions/
  generate-idea.js         serverless function, tries Claude -> GPT -> Gemini
```

## Extending the idea library

Add entries to `src/data/ideas.json` following the existing shape:

```json
{
  "id": "unique-id",
  "title": "Short title",
  "description": "1-3 sentences of instructions",
  "materials": ["item1", "item2"],
  "ageMin": 2, "ageMax": 4,
  "type": "educational",
  "assistance": false,
  "duration": "15 min",
  "gender": "neutral"
}
```
