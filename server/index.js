import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { getDocumentProxy, extractText } from 'unpdf';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { User, Analysis } from './models.js';
import { matchKeywords, formattingChecks } from './keywords.js';
import { reviewResume, llmConfigured } from './llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { MONGODB_URI, JWT_SECRET } = process.env;
if (!MONGODB_URI || !JWT_SECRET) {
  console.error('MONGODB_URI and JWT_SECRET must be set');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });
const analyzeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.userId || req.ip, message: { error: 'Hourly limit reached (15 analyses). Please try again later.' } });

const sign = (u) => jwt.sign({ id: u._id.toString() }, JWT_SECRET, { expiresIn: '14d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1, ai: llmConfigured() }));

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });
    const user = await User.create({ name: String(name).slice(0, 80), email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: publicUser(user) });
});

app.post('/api/analyze', auth, analyzeLimiter, upload.single('resume'), async (req, res) => {
  try {
    const jd = String(req.body.jd || '').trim();
    const jobTitle = String(req.body.jobTitle || '').trim().slice(0, 120);
    if (!req.file) return res.status(400).json({ error: 'Upload your resume as a PDF.' });
    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) return res.status(400).json({ error: 'Only PDF files are supported.' });
    if (req.file.buffer.slice(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: 'That file is not a valid PDF.' });
    if (jd.length < 80) return res.status(400).json({ error: 'Paste the full job description (at least a few lines).' });
    if (jd.length > 12000) return res.status(400).json({ error: 'Job description is too long (max 12,000 characters).' });
    if (!llmConfigured()) return res.status(503).json({ error: 'AI is not configured on the server.' });

    let resumeText;
    try {
      const pdf = await getDocumentProxy(new Uint8Array(req.file.buffer));
      if (pdf.numPages > 6) return res.status(400).json({ error: 'That PDF has ' + pdf.numPages + ' pages. Upload a resume of 6 pages or fewer.' });
      const { text } = await extractText(pdf, { mergePages: true });
      resumeText = String(text).replace(/\u0000/g, '').trim();
    } catch {
      return res.status(400).json({ error: 'Could not read this PDF. Try exporting it again from Word or Google Docs.' });
    }
    if (resumeText.length < 100) return res.status(400).json({ error: 'No readable text found. This looks like a scanned image PDF, which ATS systems cannot read either. Export a text PDF.' });

    const kw = matchKeywords(resumeText, jd);
    const fmt = formattingChecks(resumeText);
    let review;
    try {
      review = await reviewResume({ resumeText, jd, matched: kw.matched, missing: kw.missing });
    } catch (e) {
      console.error('LLM failed:', e.message);
      return res.status(502).json({ error: 'The AI service failed. Please try again in a minute.' });
    }
    // Final score: half from the AI's judgment of fit, half from the keyword coverage counted in code.
    const score = Math.round(0.5 * review.fit_score + 0.5 * kw.coverage);
    const doc = await Analysis.create({
      user: req.userId, jobTitle, resumeFile: req.file.originalname.slice(0, 120), jdPreview: jd.slice(0, 200),
      score, keywordCoverage: kw.coverage, llmScore: review.fit_score,
      matched: kw.matched, missing: kw.missing, formatting: fmt, review
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/analyses', auth, async (req, res) => {
  const items = await Analysis.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50).select('jobTitle resumeFile score createdAt jdPreview');
  res.json(items);
});

app.get('/api/analyses/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  const doc = await Analysis.findOne({ _id: req.params.id, user: req.userId });
  if (!doc) return res.status(404).json({ error: 'Not found.' });
  res.json(doc);
});

app.delete('/api/analyses/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  await Analysis.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ ok: true });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'PDF is too large (max 4 MB).' : 'Upload failed.' });
  next(err);
});

const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = process.env.PORT || 3000;
mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => app.listen(port, () => console.log(`HireSense listening on ${port}`)))
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
