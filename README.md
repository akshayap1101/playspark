# PlaySpark

A minimalist, AI-assisted app that suggests screen-free activities for kids
(ages 0.6–15), using items already at home. Pick an age, a type (educational
or fun), and whether you're able to help — get one idea, try it, and give a
thumbs up or down. It learns which ideas your child liked and shows those more.

Two screens total: filters, and the idea itself. No accounts, no sign-up.

## How it works

- **56 curated ideas** ship with the app, covering every age band from 0.6 to
  15, tagged by type and whether a parent needs to help. This is the default
  source and works with zero setup.
- **Feedback loop**: thumbs up/down are stored in the browser (`localStorage`)
  and used to weight future picks for that child. Optionally also logged to
  Firebase Firestore if you connect a project, so feedback isn't lost if
  the browser storage is cleared.
- **AI top-up**: if every curated idea for a given filter combination has
  already been shown, the app calls a small Netlify serverless function that
  asks Claude, GPT, or Gemini (whichever key you've set) for one new idea in
  the same age/type/assistance shape. This is entirely optional — without a
  key, the app just keeps reusing the curated set.
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

## Connect an AI provider (optional, for fresh ideas)

Pick one — you don't need all three:

- **Claude**: get a key at [console.anthropic.com](https://console.anthropic.com)
- **GPT**: get a key at [platform.openai.com](https://platform.openai.com)
- **Gemini**: get a key at [aistudio.google.com](https://aistudio.google.com)

These are used server-side only (in the Netlify function), never exposed to
the browser. Set them in Netlify's dashboard, not in `.env` — see deploy
steps below.

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
