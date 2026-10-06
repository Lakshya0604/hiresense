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
