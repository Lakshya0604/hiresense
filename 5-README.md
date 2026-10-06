# HireSense

Upload your resume (PDF), paste a job description, and get a match score with concrete fixes: missing keywords, weak bullets to rewrite, and formatting checks.

## How the score works
- 50%: keyword coverage, counted in plain code (`server/keywords.js`, covered by tests).
- 50%: an LLM rating of how well the resume fits the job (Groq Llama 3.3 70B, or Gemini as a fallback).
- The LLM is told to use only facts in the resume.

## Stack
MongoDB (Atlas) + Express + React (Vite) + Node. JWT auth with bcrypt-hashed passwords. Rate limits on login and analysis.

## Run locally
```
cp .env.example .env   # fill MONGODB_URI, JWT_SECRET and GROQ_API_KEY
npm install
npm run build
npm start              # http://localhost:3000
npm test
```

## Deploy (Render)
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Env vars: `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY` (or `GEMINI_API_KEY`)

## Privacy
The PDF is parsed in memory and not stored. Only the analysis result is saved to your account.
