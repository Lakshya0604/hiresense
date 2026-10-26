import { useEffect, useState } from 'react';
import { api, getToken, setToken, download } from './api.js';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#/, '') || '/';
}

const go = (p) => { window.location.hash = p; };

function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [sent, setSent] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'forgot') {
        await api('/auth/forgot', { method: 'POST', body: { email: f.email } });
        setSent(true);
      } else {
        const data = await api(`/auth/${mode}`, { method: 'POST', body: f });
        setToken(data.token);
        onAuth(data.user);
      }
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }
  if (mode === 'forgot') return (
    <div className="card auth">
      <h2>Reset your password</h2>
      <p className="auth-note">Enter your account email. We will send a link to choose a new password.</p>
      {sent ? <p className="muted">If an account exists for that email, a reset link is on its way. It works for 30 minutes. Check spam too.</p> : (
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
          {err && <p className="error">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Please wait...' : 'Send reset link'}</button>
        </form>
      )}
      <p className="muted"><a href="#/" onClick={(e) => { e.preventDefault(); setMode('login'); setErr(''); setSent(false); }}>Back to log in</a></p>
    </div>
  );
  return (
    <div className="card auth">
      <h2>{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
      <p className="auth-note">{mode === 'login' ? 'Your next application starts here.' : 'A workspace for your next opportunity.'}</p>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Name<input value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>Email<input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
      {mode === 'login' && <p className="muted"><a href="#/" onClick={(e) => { e.preventDefault(); setMode('forgot'); setErr(''); }}>Forgot password?</a></p>}
      <p className="muted">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <a href="#/" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </a>
      </p>
    </div>
  );
}

function ResetForm({ token, onAuth }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const data = await api('/auth/reset', { method: 'POST', body: { token, password } });
      setToken(data.token);
      onAuth(data.user);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }
  return (
    <div className="card auth" style={{ margin: '48px auto' }}>
      <h2>Choose a new password</h2>
      {token ? (
        <form onSubmit={submit}>
          <label>New password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></label>
          {err && <p className="error">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Please wait...' : 'Save new password'}</button>
        </form>
      ) : <p className="error">This reset link is invalid. Ask for a new one from the log in page.</p>}
    </div>
  );
}

const resumeGuides = [
  ['resume-job-description-match', 'Match a resume to a job'],
  ['resume-keywords', 'Use keywords honestly'],
  ['resume-pdf-checklist', 'PDF upload checklist'],
  ['tailor-resume', 'Tailor without inventing experience'],
  ['job-posting-links', 'Use a job posting link'],
  ['match-score-explained', 'Understand your match score']
];
function PublicGuideLinks() {
  return <section className="stack" style={{ marginTop: 32 }}><h2>Resume and job-match guides</h2><p className="muted">Read these without creating an account. Learn what to check before you upload, and how to use results without overstating your experience.</p><div className="grid2">{resumeGuides.map(([slug, name]) => <a className="card" key={slug} href={'/guides/' + slug + '/'}>{name}</a>)}</div><section className="card"><h2>Common questions</h2><details><summary>Is this a certified ATS score?</summary><p>No. It is a custom estimate based on keyword coverage and a generated fit review. It does not predict whether an employer will interview you.</p></details><details><summary>Do I need an account?</summary><p>Public guides need no account. Analysis and saved history require login.</p></details><details><summary>What is stored?</summary><p>The uploaded PDF is not retained. Extracted resume text, job text and results are saved to your account for tailoring and history. Analyses can be deleted from History.</p></details></section></section>;
}

function Landing({ onAuth }) {
  return <section className="landing-shell">
    <div className="hero">
      <div className="hero-copy">
        <span className="eyebrow">A clearer path to your next role</span>
        <h1>Your experience.<br />Your next move.<br /><em>A better match.</em></h1>
        <p className="lead">A resume job-description matcher that turns a long posting into a clear plan. Check keyword coverage, find the gaps, and tailor your resume with evidence you can stand behind.</p>
        <div className="hero-actions"><button className="btn" type="button" onClick={() => { document.getElementById('start')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); document.querySelector('#start input')?.focus({ preventScroll: true }); }}>Start your resume review <span aria-hidden="true">↗</span></button><a className="text-action" href="/guides/resume-job-description-match/">See how it works <span aria-hidden="true">→</span></a></div>
        <p className="hero-disclaimer">Free to use · PDF upload · No invented experience</p>
        <div className="career-art"><img src="/images/career-workspace.svg" width="780" height="390" alt="Illustration of a resume and job brief connected by a path, with a reminder to use real evidence." /><span className="art-orbit orbit-one" aria-hidden="true">✦</span><span className="art-orbit orbit-two" aria-hidden="true">+</span></div>
        <div className="workflow" aria-label="How HireSense works"><div><span>01</span><strong>Bring your resume</strong><small>Upload a readable PDF.</small></div><div><span>02</span><strong>Add the opportunity</strong><small>Paste a job or its public link.</small></div><div><span>03</span><strong>Make it count</strong><small>Review, tailor, then download.</small></div></div>
      </div>
      <div id="start" className="start-panel"><div className="workspace-label"><span className="status-dot" /> YOUR APPLICATION WORKSPACE <span aria-hidden="true">↗</span></div><AuthForm onAuth={onAuth} /><p className="workspace-caption">Your story stays yours. Every edit needs your review.</p></div>
    </div>
    <div className="feature-grid" aria-label="What you can do"><article className="feature-card"><img className="feature-picture" src="/images/match-illustration.svg" width="260" height="130" alt="" loading="lazy" /><span className="feature-kicker">UNDERSTAND THE FIT</span><h2>Less guesswork.<br /> More evidence.</h2><p>Compare the job requirements with your resume. See matched and missing keywords, with a custom match estimate.</p><a href="/guides/match-score-explained/">Understand the score <span aria-hidden="true">↗</span></a></article><article className="feature-card"><img className="feature-picture" src="/images/edit-illustration.svg" width="260" height="130" alt="" loading="lazy" /><span className="feature-kicker">MAKE HONEST EDITS</span><h2>Better wording.<br /> Still your work.</h2><p>Review bullet suggestions, add only skills you can support, and download your tailored resume as PDF or DOCX.</p><a href="/guides/tailor-resume/">Tailor without inventing <span aria-hidden="true">↗</span></a></article><article className="feature-card feature-dark"><img className="feature-picture" src="/images/workspace-illustration.svg" width="260" height="130" alt="" loading="lazy" /><span className="feature-kicker">KEEP THE CONTEXT</span><h2>Your applications.<br /> One workspace.</h2><p>Return to saved analyses in History. The uploaded PDF is not retained; extracted text and results can be deleted.</p><a href="/guides/resume-pdf-checklist/">Prepare your PDF <span aria-hidden="true">↗</span></a></article></div>
  </section>;
}

const BANDS = [
  { max: 3, label: 'Poor match', color: '#dc2626', tip: 'Big gaps. Apply only if you can close them first.' },
  { max: 5, label: 'Weak match', color: '#ea580c', tip: 'Fix the top gaps below before applying.' },
  { max: 7.5, label: 'Partial match', color: '#d97706', tip: 'Decent base. Tailor the resume, then apply.' },
  { max: 9, label: 'Strong match', color: '#16a34a', tip: 'Good fit. Apply with a tailored resume.' },
  { max: 10.01, label: 'Excellent match', color: '#15803d', tip: 'Near perfect. Apply now.' }
];
const bandFor = (out10) => BANDS.find((b) => out10 < b.max) || BANDS[BANDS.length - 1];

function ScoreRing({ score }) {
  const out10 = Math.round(score) / 10;
  const band = bandFor(out10);
  return (
    <div className="scorebox">
      <div className="ring" style={{ '--p': score, '--c': band.color }}>
        <div className="ring-inner"><strong>{out10.toFixed(1)}<small>/10</small></strong><span>{band.label}</span></div>
      </div>
    </div>
  );
}

function ScoreScale({ score }) {
  const out10 = Math.round(score) / 10;
  const band = bandFor(out10);
  return (
    <div className="scale" aria-label={`Match scale: ${out10.toFixed(1)} out of 10`}>
      <div className="scale-bar">
        {BANDS.map((b, i) => <span key={b.label} style={{ background: b.color, width: `${(b.max > 10 ? 10 : b.max) * 10 - (i ? BANDS[i - 1].max * 10 : 0)}%` }} />)}
        <i style={{ left: `${Math.min(99, Math.max(1, score))}%` }} />
      </div>
      <div className="scale-ticks">{[0, 3, 5, 7.5, 9, 10].map((t) => <span key={t} style={{ left: `${t * 10}%` }}>{t}</span>)}</div>
      <p className="small"><strong style={{ color: band.color }}>{score}% ({out10.toFixed(1)}/10) - {band.label}.</strong> {band.tip}</p>
      <p className="muted small">Bands: under 3 poor, 3 to 5 weak, 5 to 7.5 partial, 7.5 to 9 strong, 9+ excellent. These bands are guidance only. No score guarantees passing an employer's first screen.</p>
    </div>
  );
}

function Analyze() {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [note, setNote] = useState('');
  async function fetchJd() {
    setErr(''); setNote('');
    if (!url.trim()) return setErr('Paste the job link first.');
    setFetching(true);
    try {
      const job = await api('/fetch-jd', { method: 'POST', body: { url: url.trim() } });
      setJd(job.text);
      if (!title && job.title) setTitle(job.title.slice(0, 120));
      setNote(`Fetched ${job.text.length.toLocaleString()} characters from ${job.host}. Check the text below, edit if needed, then analyze.`);
    } catch (e2) {
      if (e2.status === 401) { setToken(null); window.location.reload(); }
      setErr(e2.message);
    }
    setFetching(false);
  }
  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!file) return setErr('Choose your resume PDF.');
    const form = new FormData();
    form.append('resume', file);
    form.append('jd', jd);
    form.append('jdUrl', url.trim());
    if (!jd.trim() && !url.trim()) return setErr('Enter a job link or paste the job description.');
    form.append('jobTitle', title);
    setBusy(true);
    try {
      const doc = await api('/analyze', { method: 'POST', form });
      go(`/result/${doc._id}`);
    } catch (e2) {
      if (e2.status === 401) { setToken(null); window.location.reload(); }
      setErr(e2.message);
    }
    setBusy(false);
  }
  return (
    <form className="card" onSubmit={submit}>
      <h2>New analysis</h2>
      <label>Job title (optional)<input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full Stack Developer at Acme" /></label>
      <label>Resume (PDF, max 4 MB)
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
      </label>
      <label>Job posting link
        <div className="urlrow">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://company.com/careers/job-123" />
          <button type="button" className="btn ghost" disabled={fetching} onClick={fetchJd}>{fetching ? 'Fetching...' : 'Fetch job text'}</button>
        </div>
      </label>
      <p className="muted small">Give either the link or the pasted description. With only a link, the job text is fetched when you analyze. LinkedIn, Indeed and some other sites block reading; then paste the description.</p>
      {note && <p className="okmsg">{note}</p>}
      <label>Job description (or just use the link above)
        <textarea rows={12} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job description here, or fetch it from a link above..." />
      </label>
      <p className="muted">{jd.length.toLocaleString()} / 12,000 characters</p>
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Analyzing... this takes 10 to 20 seconds' : 'Analyze my resume'}</button>
    </form>
  );
}

function Chips({ items, kind }) {
  if (!items?.length) return <p className="muted">None found.</p>;
  return <div className="chips">{items.map((t) => <span key={t} className={`chip ${kind}`}>{t}</span>)}</div>;
}

function ResumePreview({ t }) {
  return <article className="resume-preview" aria-label="Improved resume preview">
    <h2>{t.name || 'Resume'}</h2>
    {t.contact?.length > 0 && <p>{t.contact.join(' | ')}</p>}
    {t.summary && <section><h3>Summary</h3><p>{t.summary}</p></section>}
    {t.skills?.length > 0 && <section><h3>Skills</h3>{t.skills.map((g,i) => <p key={i}><strong>{g.group ? g.group + ': ' : ''}</strong>{g.items.join(', ')}</p>)}</section>}
    {t.experience?.length > 0 && <section><h3>Experience</h3>{t.experience.map((e,i) => <div key={i}><h4>{[e.title,e.org,e.dates].filter(Boolean).join(' | ')}</h4><ul>{e.bullets.map((b,j) => <li key={j}>{b}</li>)}</ul></div>)}</section>}
    {t.projects?.length > 0 && <section><h3>Projects</h3>{t.projects.map((p,i) => <div key={i}><h4>{[p.name,p.tech].filter(Boolean).join(' | ')}</h4><ul>{p.bullets.map((b,j) => <li key={j}>{b}</li>)}</ul></div>)}</section>}
    {t.education?.length > 0 && <section><h3>Education</h3>{t.education.map((e,i) => <div key={i}><h4>{[e.degree,e.org,e.dates].filter(Boolean).join(' | ')}</h4>{e.details && <p>{e.details}</p>}</div>)}</section>}
    {(t.other || []).map((o,i) => <section key={i}><h3>{o.heading}</h3>{o.items.map((v,j) => <p key={j}>{v}</p>)}</section>)}
  </article>;
}

function TailorCard({ d, setD }) {
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [err, setErr] = useState('');
  const [message, setMessage] = useState('');
  const t = d.tailored;
  const [additions, setAdditions] = useState(d.tailored?.additions?.map(a => ({ ...a, confirmed: true })) || []);
  const [selected, setSelected] = useState('');
  const [evidence, setEvidence] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const draftDirty = JSON.stringify(additions.map(a => ({ skill: a.skill, text: a.text }))) !== JSON.stringify(t?.additions || []);
  async function make() {
    setErr(''); setMessage(''); setBusy(true);
    try {
      const tailored = await api(`/analyses/${d._id}/tailor`, { method: 'POST', body: { additions } });
      setD({ ...d, tailored });
      setMessage('Your improved draft is ready. Review it below, then download.');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function dl(ext) {
    setErr(''); setMessage(''); setDownloading(ext);
    try { await download(`/analyses/${d._id}/tailored?format=${ext}`, `improved_resume.${ext}`); setMessage(`${ext.toUpperCase()} download started.`); } catch (e) { setErr(e.message); }
    setDownloading('');
  }
  return <section className="card improved-card" id="improved-resume" aria-labelledby="improved-title">
    <span className="eyebrow">Resume builder</span>
    <h2 id="improved-title">Build your improved resume</h2>
    <p>Create a clean, readable resume from your uploaded PDF and any true details you add below. No invented skills, experience or numbers.</p>
    <p className="muted small">The draft improves layout and structure while keeping your wording. New details appear only when you type and confirm them yourself.</p>
    <section className="builder-requirements"><h3>Your resume against this job</h3><p><strong>{d.jobTitle || 'The job description you provided'}</strong></p><p className="muted small">Original review match: {(d.score / 10).toFixed(1)}/10. This uses keyword coverage and the generated fit review. The separate readiness estimate below uses only counted keywords and text-format checks.</p>{(d.jdText || d.jdPreview) && <details><summary>Job description used for this analysis</summary><p style={{ whiteSpace: 'pre-wrap' }}>{d.jdText || d.jdPreview}</p></details>}<h4>Missing job keywords</h4><p className="muted small">Add evidence only for skills you really have. A missing skill is a gap to learn, not something to pretend you know.</p><div className="requirement-list">{(d.missing || []).map(skill => <div className="requirement-row" key={skill}><span>{skill}</span><button type="button" className="btn ghost" onClick={() => { setSelected(skill); setEvidence(''); setConfirmed(false); }}>{additions.some(a => a.skill === skill) ? 'Edit details' : 'Add true details'}</button></div>)}</div>{!d.missing?.length && <p className="muted">No missing counted job keywords.</p>}
    {selected && <form className="evidence-form" onSubmit={e => { e.preventDefault(); if (!confirmed || !evidence.trim()) return; setAdditions([...additions.filter(a => a.skill !== selected), { skill: selected, text: evidence.trim(), confirmed: true }]); setSelected(''); setMessage('Detail added to your working draft. Generate or regenerate to update the preview and estimate.'); }}><h4>Your actual evidence for {selected}</h4><label>What did you really do or learn?<textarea required minLength={12} maxLength={600} rows={4} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Write a real project, course or work example in your own words." /></label><label className="truth-check"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />This is true and I can support it. Do not add anything beyond this text.</label><div className="row2"><button className="btn">Add to working draft</button><button type="button" className="btn ghost" onClick={() => setSelected('')}>Cancel</button></div></form>}
    {additions.length > 0 && <section className="draft-additions"><h4>Your added details</h4>{additions.map(a => <div key={a.skill}><p><strong>{a.skill}</strong>: {a.text}</p><button className="link" onClick={() => setAdditions(additions.filter(x => x.skill !== a.skill))}>Remove</button></div>)}<p className="muted small">These are your statements, not facts verified by HireSense. They will be included as Additional details when you generate the resume.</p></section>}</section>
    {!d.canTailor && !t && <p className="muted">The original text is not available for this older analysis. <a href="#/new">Upload your resume and run a new analysis</a> to generate a draft.</p>}
    {d.canTailor && !t && <button className="btn" disabled={busy} onClick={make}>{busy ? 'Creating your resume...' : 'Generate improved resume'}</button>}
    {t && <>
      {draftDirty && <p className="okmsg" role="status">Your working details changed. Use Update preview and score before downloading. The preview and estimate below still show the saved draft.</p>}
      {!t.sourceOnly && <p className="error">This is an older generated draft. Regenerate a source-only version before using it.</p>}
      {t.readiness && <section className="readiness-panel" aria-label="ATS readiness estimate"><h4>ATS-readiness estimate</h4>{t.originalReadiness && <p className="muted small">Original readiness: {t.originalReadiness.score === null ? 'not available' : `${t.originalReadiness.score}/100`} · Updated draft:</p>}<p className="readiness-score">{t.readiness.score === null ? 'Not enough job keywords to score' : `${t.readiness.score}/100`}</p><p className="muted small">{t.readiness.method}</p><p>Job keyword coverage: {t.readiness.keywordCoverage === null ? 'not available' : `${t.readiness.keywordCoverage}%`} · Text-format checks: {t.readiness.formatScore}%</p><ul className="checks">{t.readiness.checks.map((c,i) => <li key={i} className={c.ok ? 'ok' : 'no'}>{c.ok ? 'OK' : 'Check'}: {c.ok ? c.label : c.tip}</li>)}</ul>{t.readiness.missing.length > 0 && <><h4>Still missing from the original</h4><Chips items={t.readiness.missing} kind="bad" /><p className="muted small">These are not added to the draft. Add them yourself only when they are true for you.</p></>}</section>}
      <details className="preview-details" open><summary>Review the full resume</summary><ResumePreview t={t} /></details>
      {t.changes?.length > 0 && <><h4>What changed</h4><ul>{t.changes.map((c,i) => <li key={i}>{c}</li>)}</ul></>}
      <p className="muted small">Check the extracted text and contact details before sending. Scanned or unusual PDFs can extract in the wrong order.</p>
      <div className="row2">
        {t.sourceOnly && <><button className="btn" disabled={Boolean(downloading) || busy || draftDirty} onClick={() => dl('pdf')}>{downloading === 'pdf' ? 'Preparing PDF...' : 'Download PDF'}</button><button className="btn ghost" disabled={Boolean(downloading) || busy || draftDirty} onClick={() => dl('docx')}>{downloading === 'docx' ? 'Preparing DOCX...' : 'Download DOCX (editable)'}</button></>}
        {d.canTailor && <button className="btn ghost" disabled={busy || Boolean(downloading)} onClick={make}>{busy ? 'Creating...' : 'Update preview and score'}</button>}
      </div>
    </>}
    {message && <p className="okmsg" role="status">{message}</p>}
    {err && <p className="error" role="alert">{err}</p>}
  </section>;
}

function ResourcesCard({ items }) {
  if (!items?.length) return null;
  return (
    <div className="card">
      <h3>Prepare for the gaps</h3>
      <p className="muted small">Free videos and docs for the skills this job wants and your resume lacks. Links marked "search" open a search for that topic because no hand-picked resource is listed for it.</p>
      {items.map((r) => (
        <div className="res" key={r.skill}>
          <h4>{r.skill}</h4>
          <ul>
            {r.videos.map((v) => <li key={v.url}><a href={v.url} target="_blank" rel="noopener noreferrer">{r.curated ? 'Video: ' : ''}{v.title}</a>{v.by && r.curated ? <span className="muted small"> - {v.by}</span> : null}</li>)}
            {r.docs.map((v) => <li key={v.url}><a href={v.url} target="_blank" rel="noopener noreferrer">Docs: {v.title}</a></li>)}
            {(r.search || []).map((v) => <li key={v.url}><a href={v.url} target="_blank" rel="noopener noreferrer">{v.title}</a></li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Result({ id }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/analyses/${id}`).then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="card"><p className="error">{err}</p></div>;
  if (!d) return <div className="card"><p>Loading...</p></div>;
  const r = d.review || {};
  return (
    <div className="stack">
      <div className="card row">
        <ScoreRing score={d.score} />
        <div>
          <h2>{d.jobTitle || 'Match result'}</h2>
          <p className="muted">{d.resumeFile} - {new Date(d.createdAt).toLocaleString()}</p>
          <p>{r.summary}</p>
          <ScoreScale score={d.score} />
          <p className="muted small">Score = 50% keyword coverage ({d.keywordCoverage}%, counted in code) + 50% AI fit rating ({d.llmScore}).</p>
        </div>
      </div>
      <div className="card">
        <h3>Top fixes</h3>
        <p className="muted small">Review suggestions are ideas, not verified facts. Do not add missing skills or achievements unless they are true for you.</p><ol>{(r.top_fixes || []).map((t, i) => <li key={i}>{t}</li>)}</ol>
      </div>
      <section className="card improved-card"><span className="eyebrow">Next step</span><h3>Build a resume from this review</h3><p>See missing job keywords, add only true details, review the new draft and compare the readiness estimate before downloading.</p><a className="btn" href={`#/resume/${d._id}`}>Open resume builder</a></section>
      <div className="grid2">
        <div className="card"><h3>Missing keywords</h3><Chips items={d.missing} kind="bad" /></div>
        <div className="card"><h3>Keywords you already have</h3><Chips items={d.matched} kind="good" /></div>
      </div>
      {r.missing_skills?.length > 0 && <div className="card"><h3>Skills the AI says the job wants</h3><Chips items={r.missing_skills} kind="warn" /></div>}
      <div className="card">
        <h3>Bullets to rewrite</h3>
        {(r.weak_bullets || []).map((b, i) => (
          <div className="bullet" key={i}>
            <p className="was">{b.original}</p>
            <p className="why">{b.problem}</p>
            <p className="now">Edit this line using only your real work. Add a tool, team size or result only if you can verify it. The source-only draft keeps the original wording.</p>
          </div>
        ))}
        <p className="muted small">Suggestions identify areas to improve, not facts you should add. Do not invent a number, skill or achievement.</p>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Strengths</h3>
          <ul>{(r.strengths || []).map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Formatting checks</h3>
          <ul className="checks">
            {d.formatting?.checks?.map((c, i) => <li key={i} className={c.ok ? 'ok' : 'no'}>{c.ok ? 'OK' : 'Fix'}: {c.ok ? c.label : c.tip}</li>)}
          </ul>
          {(r.formatting || []).map((t, i) => <p key={i} className="small">- {t}</p>)}
        </div>
      </div>
      <ResourcesCard items={d.resources} />
      <p><a href="#/new" className="btn">Analyze another</a></p>
    </div>
  );
}

function ResumeBuilder({ id }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/analyses/${id}`).then(setD).catch(e => setErr(e.message)); }, [id]);
  return <div className="stack"><p><a href={`#/result/${id}`}>← Back to analysis</a></p>{err ? <section className="card"><p className="error">{err}</p></section> : !d ? <section className="card">Loading your resume builder...</section> : <TailorCard d={d} setD={setD} />}</div>;
}

function History() {
  const [items, setItems] = useState(null);
  const load = () => api('/analyses').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  async function del(id) {
    if (!window.confirm('Delete this analysis?')) return;
    await api(`/analyses/${id}`, { method: 'DELETE' });
    load();
  }
  if (!items) return <div className="card"><p>Loading...</p></div>;
  return (
    <div className="card">
      <h2>Your analyses</h2>
      {items.length === 0 && <p className="muted">Nothing yet. <a href="#/new">Run your first analysis.</a></p>}
      <ul className="history">
        {items.map((i) => (
          <li key={i._id}>
            <a href={`#/result/${i._id}`}><strong>{(i.score / 10).toFixed(1)}/10</strong> <span>{i.jobTitle || i.jdPreview?.slice(0, 60) || 'Untitled'}</span><em>{new Date(i.createdAt).toLocaleDateString()}</em></a>
            <button className="link" onClick={() => del(i._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const route = useHashRoute();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    const privateRoute = route !== '/' || Boolean(user);
    document.title = privateRoute ? 'Your workspace | HireSense' : 'Resume Job Description Matcher & Keyword Check | HireSense';
    document.querySelector('meta[name="robots"]')?.setAttribute('content', privateRoute ? 'noindex,follow' : 'index,follow');
  }, [route, user]);
  function logout() { setToken(null); setUser(null); go('/'); }
  if (!ready) return <div className="wrap"><p>Loading...</p></div>;
  let page;
  if (route.startsWith('/reset')) page = <ResetForm token={new URLSearchParams(route.split('?')[1] || '').get('token') || ''} onAuth={(u) => { setUser(u); go('/new'); }} />;
  else if (!user) page = <Landing onAuth={(u) => { setUser(u); go('/new'); }} />;
  else if (route.startsWith('/resume/')) page = <ResumeBuilder id={route.split('/')[2]} />;
  else if (route.startsWith('/result/')) page = <Result id={route.split('/')[2]} />;
  else if (route === '/history') page = <History />;
  else page = <Analyze />;
  return (
    <>
      <a className="skip-link" href="#main-content" onClick={(e) => { e.preventDefault(); const main = document.getElementById('main-content'); main?.focus(); main?.scrollIntoView(); }}>Skip to content</a>
      <header className="nav">
        <a className="brand" href="#/">Hire<span>Sense</span></a>
        {!user && <nav><a href="/guides/">Resume guides</a></nav>}
        {user && (
          <nav>
            <a href="#/new">New</a>
            <a href="#/history">History</a>
            <button className="link" onClick={logout}>Log out ({user.name || user.email})</button>
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1} className="wrap">{page}{!user && <PublicGuideLinks />}</main>
      <footer className="foot">HireSense - built by Lakshya Yadav. Your resume PDF is not kept. The extracted text and results are saved to your account so you can tailor later, and you can delete any analysis from History.</footer>
    </>
  );
}
