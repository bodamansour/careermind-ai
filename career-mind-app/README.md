# CareerMind AI — Web App

Backend (Node.js/Express) + Frontend (vanilla HTML/CSS/JS, served by the same server).
The backend orchestrates your 6 AiMicromind chatflows: CV Analyzer, Job Analyzer,
Matching Agent, Skill Gap Agent, Roadmap Agent, and Interview Agent.

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and replace every `REPLACE_ME` with the real flow ID from AiMicromind
(open each chatflow → click **API** → copy the URL). The CV Analyzer URL is already
filled in from what we set up earlier.

If any of your chatflows require an API Key (instead of "No Authorization"), also set
`AIMICROMIND_API_KEY` in `.env`.

## 2. Run

```bash
npm start
```

Open **http://localhost:3000** in your browser.

## 3. How it works

- **Upload page**: user uploads a CV (PDF) and pastes a Job Description.
- Backend extracts text from the PDF (`pdf-parse`), then calls, in order:
  CV Analyzer → Job Analyzer → Matching Agent → Skill Gap Agent → Roadmap Agent.
- **Dashboard**: shows Career Readiness %, Job Match score, matching skills, top gaps.
- **View Career Plan**: shows the week-by-week roadmap.
- **Start Mock Interview**: opens a chat with the Interview Agent. Each answer you send
  keeps the same `sessionId` so the agent's Buffer Memory remembers the conversation.
  When the agent sends back its final JSON evaluation, the app detects it automatically
  and shows the scored results instead of a chat bubble.

## 4. Job search (optional)

The "Find open roles" step uses [Adzuna](https://developer.adzuna.com/)'s free API — a
legitimate alternative to LinkedIn, since LinkedIn does not offer a public API for
personalized job recommendations (that access is limited to approved commercial
partners only). To enable it:

1. Create a free account at developer.adzuna.com.
2. Copy your `app_id` and `app_key` into `.env` as `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`.
3. Set `ADZUNA_COUNTRY` to the closest supported market (gb, us, in, de, fr, ca...).
   Egypt is not directly supported — pick the nearest match or leave it as `gb`.

If you skip this, the app still works fully — you'll just see a message on the Jobs
step instead of results.

## 5. Known limitations (MVP)

- No database — nothing is saved between page reloads. Refreshing the page loses the
  session; add a database (e.g. PostgreSQL) if you want persistence.
- No user accounts/login.
- The `parseModelJSON` helper in `services/aimicromind.js` tries several strategies to
  pull JSON out of a model reply (clean JSON, ```json fences, or the first {...} block
  found). If one of your agents' replies still fails to parse, check its raw text in the
  server logs and adjust the agent's System Message to be even stricter about
  "JSON only, no extra text".
- Flowise/AiMicromind's prediction API sometimes wraps the reply differently
  (`{ "text": "..." }` vs a raw string). `callFlow()` already handles the common shapes,
  but if a specific flow behaves differently, log `response.data` for that call and adjust.
