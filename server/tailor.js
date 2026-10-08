// Turns the model's tailored resume into a clean structure and removes anything that is not in the original.
import { normalize } from './keywords.js';

const str = (v, n = 300) => (typeof v === 'string' ? v.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ' ').trim().slice(0, n) : '');
const list = (v, n, m = 300) => (Array.isArray(v) ? v.map((x) => str(x, m)).filter(Boolean).slice(0, n) : []);

export function numbersIn(text) {
  return (String(text).match(/\d[\d,.]*/g) || []).map((x) => x.replace(/[,.]+$/, ''));
}

// A skill is kept only if every word of it shows up somewhere in the original resume.
export function inResume(item, resumeNorm) {
  const words = normalize(item).split(' ').filter((w) => w.length > 1 || /[a-z]/.test(w));
  return words.length > 0 && words.every((w) => resumeNorm.includes(w));
}

export function sanitizeTailored(raw, resumeText) {
  const resumeNorm = normalize(resumeText);
  const origNums = new Set(numbersIn(resumeText));
  let dropped = 0;
  const bulletOk = (b) => {
    const bad = numbersIn(b).some((n) => !origNums.has(n));
    if (bad) dropped++;
    return !bad;
  };
  const bullets = (v) => list(v, 8, 400).filter(bulletOk);
  const r = raw || {};
  const skills = (Array.isArray(r.skills) ? r.skills : [])
    .slice(0, 8)
    .map((g) => ({
      group: str(g?.group, 40),
      items: list(g?.items, 30, 60).filter((it) => {
        const ok = inResume(it, resumeNorm);
        if (!ok) dropped++;
        return ok;
      })
    }))
    .filter((g) => g.items.length);
  const out = {
    name: str(r.name, 80),
    contact: list(r.contact, 6, 120),
    summary: str(r.summary, 600),
    skills,
    experience: (Array.isArray(r.experience) ? r.experience : []).slice(0, 8).map((e) => ({ title: str(e?.title, 100), org: str(e?.org, 100), dates: str(e?.dates, 50), bullets: bullets(e?.bullets) })).filter((e) => e.title || e.org),
    projects: (Array.isArray(r.projects) ? r.projects : []).slice(0, 8).map((p) => ({ name: str(p?.name, 100), tech: str(p?.tech, 150), bullets: bullets(p?.bullets) })).filter((p) => p.name),
    education: (Array.isArray(r.education) ? r.education : []).slice(0, 5).map((e) => ({ degree: str(e?.degree, 120), org: str(e?.org, 120), dates: str(e?.dates, 50), details: str(e?.details, 200) })).filter((e) => e.degree || e.org),
    other: (Array.isArray(r.other) ? r.other : []).slice(0, 4).map((o) => ({ heading: str(o?.heading, 40), items: list(o?.items, 8, 200) })).filter((o) => o.heading && o.items.length),
    changes: list(r.changes, 6, 200),
    removedUnsupported: dropped
  };
  if (!out.name && !out.experience.length && !out.projects.length && !out.education.length) throw new Error('Tailored resume came back empty');
  return out;
}

import { matchKeywords, formattingChecks } from './keywords.js';
// Source-only export: every candidate statement is copied from the uploaded text.
// Job descriptions and review suggestions never enter the generated resume.
export function buildImprovedResume(resumeText, jdText = '') {
  const lines = String(resumeText || '').replace(/\u0000/g, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error('No readable resume text');
  const headings = /^(?:professional summary|summary|profile|objective|technical skills|skills|experience|work experience|employment|projects|personal projects|education|certifications|achievements|awards|languages|interests|publications|volunteer experience|additional information|resume details)\s*:?$/i;
  const sections = [];
  let current = { heading: 'Resume details', items: [] };
  for (const line of lines.slice(1)) {
    const headingLine = line.replace(/^[•\-*]\s*/, '');
    if (headings.test(headingLine)) {
      if (current.items.length) sections.push(current);
      current = { heading: headingLine.replace(/:$/, ''), items: [] };
    } else current.items.push(line);
  }
  if (current.items.length) sections.push(current);
  const contact = [];
  if (sections[0]?.heading === 'Resume details') {
    sections[0].items = sections[0].items.filter(line => {
      if (/@|linkedin\.com|github\.com|\+?\d[\d\s().-]{8,}\d/.test(line)) { contact.push(line); return false; }
      return true;
    });
    if (!sections[0].items.length) sections.shift();
  }
  return {
    name: lines[0], contact, summary: '', skills: [], experience: [], projects: [], education: [],
    other: sections,
    changes: ['Created a clean, single-column layout from your uploaded resume.', 'Kept your original facts and wording. No job-description skills, invented achievements or placeholders were added.', 'Review the full draft below before downloading. Missing experience must be earned, not filled in by a generator.'],
    sourceOnly: true, removedUnsupported: 0, readiness: assessReadiness(lines.join('\n'), jdText)
  };
}

export function assessReadiness(text, jd) {
  const kw = matchKeywords(text, jd);
  // Optional links, experience and metrics are not universal ATS requirements.
  const all = formattingChecks(text);
  const checks = all.checks.filter(c => /Email|Education|Skills|Enough content|Length is reasonable/.test(c.label));
  const formatScore = Math.round(100 * checks.filter(c => c.ok).length / checks.length);
  const hasKeywords = kw.matched.length + kw.missing.length > 0;
  return { score: hasKeywords ? Math.round(.7 * kw.coverage + .3 * formatScore) : null, keywordCoverage: hasKeywords ? kw.coverage : null, formatScore, matched: kw.matched, missing: kw.missing, checks, method: '70% job-keyword coverage + 30% text-format checks. Custom estimate, not a certified ATS score or hiring guarantee.' };
}
