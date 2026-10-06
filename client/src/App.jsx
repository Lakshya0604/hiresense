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
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: f });
      setToken(data.token);
      onAuth(data.user);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }
  return (
    <div className="card auth">
      <h2>{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Name<input value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>Email<input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
      <p className="muted">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <a href="#/" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </a>
      </p>
    </div>
  );
}

function Landing({ onAuth }) {
  return (
    <div className="hero">
      <div>
        <h1>Will your resume get past the first screen?</h1>
        <p className="lead">Upload your resume PDF, paste a job description, and get a match score with the exact keywords you are missing, the weak bullets to rewrite, and formatting fixes.</p>
        <ul className="points">
          <li>Keyword match counted in code, so it is checkable</li>
          <li>AI review that only uses what is in your resume</li>
          <li>Your history is saved to your account</li>
        </ul>
      </div>
      <AuthForm onAuth={onAuth} />
    </div>
  );
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
      <div className="scale-ticks"><span>0</span><span>3</span><span>5</span><span>7.5</span><span>9</span><span>10</span></div>
      <p className="small"><strong style={{ color: band.color }}>{score}% ({out10.toFixed(1)}/10) - {band.label}.</strong> {band.tip}</p>
      <p className="muted small">Bands: under 3 poor, 3 to 5 weak, 5 to 7.5 partial, 7.5 to 9 strong, 9+ excellent. Resumes at 7.5/10 or more usually pass a first screen.</p>
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
      <label>Job posting link (optional)
        <div className="urlrow">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://company.com/careers/job-123" />
          <button type="button" className="btn ghost" disabled={fetching} onClick={fetchJd}>{fetching ? 'Fetching...' : 'Fetch job text'}</button>
        </div>
      </label>
      <p className="muted small">Some sites (LinkedIn, Indeed and others) block automatic reading. If the fetch fails, just paste the description below.</p>
      {note && <p className="okmsg">{note}</p>}
      <label>Job description (fetched or pasted)
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

function TailorCard({ d, setD }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const t = d.tailored;
  async function make() {
    setErr(''); setBusy(true);
    try {
      const tailored = await api(`/analyses/${d._id}/tailor`, { method: 'POST' });
      setD({ ...d, tailored });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function dl(ext) {
    setErr('');
    try { await download(`/analyses/${d._id}/tailored?format=${ext}`, `tailored_resume.${ext}`); } catch (e) { setErr(e.message); }
  }
  return (
    <div className="card">
      <h3>Tailored resume for this job</h3>
      <p className="muted small">The AI rewrites your resume for this job using only what is already in it: it rewords, reorders and puts the relevant parts first. It never adds skills you did not list.</p>
      {!d.canTailor && !t && <p className="muted">This analysis was made before tailoring existed. Run a new analysis to use it.</p>}
      {d.canTailor && !t && <button className="btn" disabled={busy} onClick={make}>{busy ? 'Tailoring... 15 to 30 seconds' : 'Tailor my resume to this job'}</button>}
      {t && (
        <>
          <div className="row2">
            <button className="btn" onClick={() => dl('pdf')}>Download PDF</button>
            <button className="btn ghost" onClick={() => dl('docx')}>Download DOCX (editable)</button>
            {d.canTailor && <button className="btn ghost" disabled={busy} onClick={make}>{busy ? 'Redoing...' : 'Redo'}</button>}
          </div>
          {t.summary && <><h4>New summary</h4><p>{t.summary}</p></>}
          {t.changes?.length > 0 && <><h4>What changed</h4><ul>{t.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
          {t.removedUnsupported > 0 && <p className="muted small">{t.removedUnsupported} item(s) the AI tried to add that were not in your original resume were removed automatically.</p>}
          <p className="muted small">Read the file before sending it. Everything in it should be true for you.</p>
        </>
      )}
      {err && <p className="error">{err}</p>}
    </div>
  );
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
            {r.videos.map((v) => <li key={v.url}><a href={v.url} target="_blank" rel="noopener noreferrer">{r.curated ? 'Video' : 'Search'}: {v.title}</a>{v.by && r.curated ? <span className="muted small"> - {v.by}</span> : null}</li>)}
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
        <ol>{(r.top_fixes || []).map((t, i) => <li key={i}>{t}</li>)}</ol>
      </div>
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
            <p className="now">{b.better}</p>
          </div>
        ))}
        <p className="muted small">Replace [X] with a real number. Only use rewrites that are true for you.</p>
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
      <TailorCard d={d} setD={setD} />
      <ResourcesCard items={d.resources} />
      <p><a href="#/new" className="btn">Analyze another</a></p>
    </div>
  );
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
  function logout() { setToken(null); setUser(null); go('/'); }
  if (!ready) return <div className="wrap"><p>Loading...</p></div>;
  let page;
  if (!user) page = <Landing onAuth={(u) => { setUser(u); go('/new'); }} />;
  else if (route.startsWith('/result/')) page = <Result id={route.split('/')[2]} />;
  else if (route === '/history') page = <History />;
  else page = <Analyze />;
  return (
    <>
      <header className="nav">
        <a className="brand" href="#/">Hire<span>Sense</span></a>
        {user && (
          <nav>
            <a href="#/new">New</a>
            <a href="#/history">History</a>
            <button className="link" onClick={logout}>Log out ({user.name || user.email})</button>
          </nav>
        )}
      </header>
      <main className="wrap">{page}</main>
      <footer className="foot">HireSense - built by Lakshya Yadav. Your resume PDF is not kept. The extracted text and results are saved to your account so you can tailor later, and you can delete any analysis from History.</footer>
    </>
  );
}
