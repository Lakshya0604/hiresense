// Deterministic keyword matching. No AI involved, so this part is always reproducible.
const STOP = new Set(`a about above across after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up us very was we were what when where which while who whom why will with would you your
ability able including include etc experience experienced work working years year strong good great excellent knowledge understanding responsible responsibilities role team teams company looking join candidate candidates required requirements preferred plus skills skill related relevant using use used within across new should must may will ensure support help like well`.split(/\s+/));

// Short or symbol-heavy tech terms that normal tokenizing would break.
const TECH = [
  'c++', 'c#', '.net', 'node.js', 'next.js', 'react.js', 'vue.js', 'express.js', 'nest.js',
  'ci/cd', 'rest api', 'rest apis', 'restful', 'machine learning', 'deep learning', 'data structures',
  'system design', 'object oriented', 'unit testing', 'version control', 'problem solving',
  'natural language processing', 'computer vision', 'github actions', 'react native', 'spring boot',
  'power bi', 'google cloud', 'rag', 'llm', 'llms', 'sql', 'nosql', 'aws', 'gcp', 'api', 'apis',
  'ui', 'ux', 'qa', 'ml', 'ai', 'nlp', 'go', 'r'
];

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9+#./'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsTerm(haystackNorm, term) {
  const re = new RegExp('(^|[^a-z0-9+#])' + escapeRe(term) + '($|[^a-z0-9+#])');
  return re.test(haystackNorm);
}

function tokens(norm) {
  return norm
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/']+|[.\-/']+$/g, ''))
    .filter(Boolean);
}

// Known skills and tools. Terms found in the job description are the primary keywords.
const VOCAB = `javascript typescript python java kotlin swift php ruby rust scala dart c++ c# .net
react react.js next.js vue vue.js angular svelte redux tailwind bootstrap html css sass webpack vite jquery
node node.js express express.js nest.js fastapi flask django spring spring boot laravel rails graphql rest restful rest api rest apis grpc websocket websockets socket.io
mongodb mongoose mysql postgresql postgres sqlite redis elasticsearch dynamodb firebase supabase sql nosql prisma sequelize
docker kubernetes terraform ansible jenkins ci/cd github actions gitlab git github linux nginx aws gcp azure ec2 s3 lambda vercel netlify heroku render
jest mocha cypress selenium playwright unit testing integration testing tdd
machine learning deep learning nlp natural language processing computer vision llm llms rag langchain openai prompt engineering tensorflow pytorch scikit-learn pandas numpy
android ios react native flutter figma
agile scrum jira microservices system design data structures algorithms oop object oriented design patterns authentication oauth jwt security
kafka rabbitmq airflow spark hadoop tableau power bi excel
communication leadership collaboration problem solving code review code reviews`.split(/\n/).join(' ');
const VOCAB_TERMS = [...new Set(
  VOCAB.replace(/\s+/g, ' ').trim().split(' ')
)];
const MULTI = [
  'rest api', 'rest apis', 'machine learning', 'deep learning', 'natural language processing', 'computer vision',
  'prompt engineering', 'github actions', 'spring boot', 'react native', 'power bi', 'unit testing',
  'integration testing', 'system design', 'data structures', 'object oriented', 'design patterns',
  'problem solving', 'code review', 'code reviews', 'ci/cd'
];
const SINGLE = VOCAB_TERMS.filter((t) => !['rest', 'api', 'apis', 'design', 'deep', 'machine', 'learning', 'natural', 'language', 'processing', 'computer', 'vision', 'prompt', 'engineering', 'github', 'actions', 'spring', 'boot', 'react', 'native', 'power', 'bi', 'unit', 'testing', 'integration', 'system', 'data', 'structures', 'object', 'oriented', 'patterns', 'problem', 'solving', 'code', 'review', 'reviews'].includes(t) || ['react'].includes(t));
const SINGLE_SET = new Set([...SINGLE, 'api', 'apis', 'github', 'testing']);

// Pull the most important terms out of a job description: known skills first, then repeated words.
export function extractJdKeywords(jd, limit = 30) {
  const norm = normalize(jd);
  const counts = new Map();
  for (const phrase of MULTI) {
    if (containsTerm(norm, phrase)) counts.set(phrase, 3);
  }
  const toks = tokens(norm);
  for (const t of toks) {
    if (SINGLE_SET.has(t)) counts.set(t, (counts.get(t) || 0) + 1);
  }
  // "rest api" already covers "rest" and "apis"
  if (counts.has('rest api') || counts.has('rest apis')) {
    counts.delete('rest');
    counts.delete('apis');
    counts.delete('api');
  }
  const found = [...counts.entries()].map(([term, count]) => ({ term, count: count + (counts.get(term) > 1 ? 1 : 0) }));
  // Fill with words repeated at least twice if the JD names very few known skills.
  if (found.length < 8) {
    const rep = new Map();
    for (const t of toks) {
      if (STOP.has(t) || t.length < 3 || /^\d+$/.test(t) || counts.has(t)) continue;
      rep.set(t, (rep.get(t) || 0) + 1);
    }
    for (const [term, count] of [...rep.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8 - found.length)) {
      found.push({ term, count });
    }
  }
  return found.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term)).slice(0, limit);
}

export function matchKeywords(resumeText, jd, limit = 30) {
  const resumeNorm = normalize(resumeText);
  const kws = extractJdKeywords(jd, limit);
  const matched = [];
  const missing = [];
  for (const k of kws) {
    (containsTerm(resumeNorm, k.term) ? matched : missing).push(k);
  }
  const total = kws.length;
  const coverage = total === 0 ? 0 : matched.length / total;
  return {
    matched: matched.map((k) => k.term),
    missing: missing.map((k) => k.term),
    coverage: Math.round(coverage * 100)
  };
}

// Simple, checkable formatting signals from the raw resume text.
export function formattingChecks(resumeText) {
  const text = String(resumeText || '');
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const checks = [];
  const add = (ok, label, tip) => checks.push({ ok, label, tip: ok ? '' : tip });
  add(/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text), 'Email address found', 'Add a professional email address at the top.');
  add(/(\+?\d[\d\s().-]{8,}\d)/.test(text), 'Phone number found', 'Add a phone number recruiters can call.');
  add(/linkedin\.com|github\.com/.test(lower), 'LinkedIn or GitHub link found', 'Link your GitHub or LinkedIn profile.');
  add(/experience|internship|work history|employment/.test(lower), 'Experience section found', 'Add a clearly titled Experience or Internships section.');
  add(/education|b\.?\s?tech|bachelor|degree|university|college/.test(lower), 'Education section found', 'Add a clearly titled Education section.');
  add(/skills|technologies|tech stack/.test(lower), 'Skills section found', 'Add a Skills section that lists your tools.');
  add(/projects?/.test(lower), 'Projects section found', 'Add a Projects section with 2 to 3 strong projects.');
  add(/\d+\s?%|\d+\+|\$\s?\d|\b\d{2,}\b/.test(text), 'Numbers or metrics present', 'Add numbers to your bullets (users, speed-up, percent, count).');
  add(words >= 150, 'Enough content (' + words + ' words)', 'The resume text looks very short (' + words + ' words). Scanned image PDFs cannot be read by ATS systems.');
  add(words <= 1100, 'Length is reasonable', 'The resume is long (' + words + ' words). Aim for one page for freshers, two at most.');
  return { words, checks };
}
