import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

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

function ScoreRing({ score }) {
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const label = score >= 75 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match';
  return (
    <div className="ring" style={{ '--p': score, '--c': color }}>
      <div className="ring-inner"><strong>{score}</strong><span>{label}</span></div>
    </div>
  );
}

function Analyze() {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
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
      <label>Job description
        <textarea rows={12} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job description here..." />
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
            <a href={`#/result/${i._id}`}><strong>{i.score}</strong> <span>{i.jobTitle || i.jdPreview?.slice(0, 60) || 'Untitled'}</span><em>{new Date(i.createdAt).toLocaleDateString()}</em></a>
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
      <footer className="foot">HireSense - built by Lakshya Yadav. Resumes are processed in memory and only the analysis result is stored.</footer>
    </>
  );
}
