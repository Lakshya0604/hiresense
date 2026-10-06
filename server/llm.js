// Calls Groq (preferred) or Gemini free tier and returns parsed JSON.
const SYSTEM = `You are a strict, honest resume reviewer and ATS expert. You compare a resume to a job description.
Rules:
- Only use facts that are in the resume text. Never invent experience, employers, numbers or skills.
- Suggested rewrites must stay truthful: reword and add structure, but mark any number the candidate must fill in as [X].
- Be specific and short. No flattery.
Return ONLY valid JSON with this exact shape:
{
 "fit_score": <integer 0-100, how well the resume fits THIS job>,
 "summary": "<2 sentences: overall fit and the single biggest gap>",
 "strengths": ["<up to 4 short items>"],
 "missing_skills": ["<important skills/tools in the JD that the resume lacks, max 10>"],
 "weak_bullets": [ {"original": "<exact bullet or line from the resume>", "problem": "<why it is weak>", "better": "<truthful rewrite>"} ],
 "formatting": ["<up to 5 concrete formatting or structure fixes>"],
 "top_fixes": ["<the 5 most valuable changes, ordered by impact>"]
}
Give 3 to 5 weak_bullets, taken verbatim from the resume.`;

function clip(s, n) {
  return String(s).length > n ? String(s).slice(0, n) : String(s);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Model did not return JSON');
  }
}

async function groq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${clip(await res.text(), 200)}`);
  const data = await res.json();
  return parseJson(data.choices[0].message.content);
}

async function gemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${clip(await res.text(), 200)}`);
  const data = await res.json();
  return parseJson(data.candidates[0].content.parts[0].text);
}

export function llmConfigured() {
  return Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
}

export async function reviewResume({ resumeText, jd, matched, missing }) {
  const prompt = `JOB DESCRIPTION:\n${clip(jd, 6000)}\n\nRESUME TEXT:\n${clip(resumeText, 9000)}\n\nKeyword check already done in code (use as a hint, verify yourself):\nFound in resume: ${matched.join(', ') || 'none'}\nNot found in resume: ${missing.join(', ') || 'none'}`;
  const raw = process.env.GROQ_API_KEY ? await groq(prompt) : await gemini(prompt);
  const arr = (v, n) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, n) : []);
  return {
    fit_score: Math.max(0, Math.min(100, Math.round(Number(raw.fit_score) || 0))),
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    strengths: arr(raw.strengths, 4),
    missing_skills: arr(raw.missing_skills, 10),
    weak_bullets: (Array.isArray(raw.weak_bullets) ? raw.weak_bullets : [])
      .filter((b) => b && typeof b.original === 'string' && typeof b.better === 'string')
      .slice(0, 5)
      .map((b) => ({ original: b.original, problem: String(b.problem || ''), better: b.better })),
    formatting: arr(raw.formatting, 5),
    top_fixes: arr(raw.top_fixes, 5)
  };
}
