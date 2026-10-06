// Curated free learning resources. Every link below was opened and checked.
// Skills without an entry get a YouTube search link, which always resolves, and is labelled as a search.
const yt = (id, title, by) => ({ title, by, url: `https://www.youtube.com/watch?v=${id}` });

const R = {
  docker: { docs: [['Docker: Get started', 'https://docs.docker.com/get-started/']], videos: [yt('9zUHg7xjIqQ', 'Learn Docker - DevOps with Node.js & Express', 'freeCodeCamp.org'), yt('kTp5xUtcalw', 'Docker Containers and Kubernetes Fundamentals', 'freeCodeCamp.org')] },
  kubernetes: { docs: [['Kubernetes tutorials', 'https://kubernetes.io/docs/tutorials/']], videos: [yt('d6WC5n9G_sM', 'Kubernetes Course - Full Beginners Tutorial', 'freeCodeCamp.org')] },
  aws: { docs: [['AWS documentation', 'https://docs.aws.amazon.com/']], videos: [yt('1vHMVndbSMM', 'AWS Tutorial For Beginners | AWS Full Course', 'Simplilearn')] },
  typescript: { docs: [['TypeScript handbook', 'https://www.typescriptlang.org/docs/']], videos: [yt('SpwzRDUQ1GI', 'Learn TypeScript - Full Course for Beginners', 'freeCodeCamp.org')] },
  javascript: { docs: [['MDN JavaScript guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript']], videos: [yt('EfAl9bwzVZk', 'JavaScript Full Course for Beginners', 'Dave Gray')] },
  python: { docs: [['Python tutorial', 'https://docs.python.org/3/tutorial/']], videos: [yt('4F2m91eKmts', 'Python Tutorial for Beginners - Full Course', 'Clever Programmer')] },
  java: { docs: [['dev.java: Learn Java', 'https://dev.java/learn/']], videos: [yt('A74TOX803D0', 'Java Programming for Beginners - Full Course', 'freeCodeCamp.org')] },
  'spring boot': { docs: [['Spring guides', 'https://spring.io/guides']], videos: [yt('vtPkZShrvXQ', 'Spring Boot Tutorial for Beginners', 'freeCodeCamp.org')] },
  react: { docs: [['React: Learn', 'https://react.dev/learn']], videos: [yt('RVFAyFWO4go', 'React JS Full Course for Beginners', 'Dave Gray'), yt('DLX62G4lc44', 'Learn React JS - Full Course for Beginners', 'freeCodeCamp.org')] },
  redux: { docs: [['Redux Toolkit quick start', 'https://redux-toolkit.js.org/tutorials/quick-start']], videos: [yt('NqzdVN2tyvQ', 'React Redux Full Course for Beginners', 'Dave Gray')] },
  'next.js': { docs: [['Next.js docs', 'https://nextjs.org/docs']], videos: [yt('k7o9R6eaSes', 'Next.js Full Tutorial - Beginner to Advanced', 'Codevolution')] },
  node: { docs: [['Node.js API docs', 'https://nodejs.org/docs/latest/api/']], videos: [yt('G8uL0lFFoN0', 'Express.js & Node.js Course for Beginners', 'freeCodeCamp.org')] },
  express: { docs: [['Express docs', 'https://expressjs.com/']], videos: [yt('L72fhGm1tfE', 'Express JS Crash Course', 'Traversy Media')] },
  mongodb: { docs: [['MongoDB manual', 'https://www.mongodb.com/docs/manual/']], videos: [yt('Www6cTUymCY', 'MongoDB Tutorial For Beginners | Full Course', 'Amigoscode')] },
  sql: { docs: [['W3Schools SQL tutorial', 'https://www.w3schools.com/sql/']], videos: [yt('q_JsgpiuY98', 'SQL Full Course For Beginners', 'edureka!')] },
  postgresql: { docs: [['PostgreSQL tutorial', 'https://www.postgresql.org/docs/current/tutorial.html']], videos: [yt('SpfIwlAYaKk', 'PostgreSQL Tutorial for Beginners', 'freeCodeCamp.org')] },
  redis: { docs: [['Redis docs', 'https://redis.io/docs/latest/']], videos: [yt('jgpVdJB2sKQ', 'Redis Crash Course', 'Web Dev Simplified')] },
  graphql: { docs: [['GraphQL: Learn', 'https://graphql.org/learn/']], videos: [yt('5199E50O7SI', 'GraphQL Course for Beginners', 'freeCodeCamp.org')] },
  git: { docs: [['Git documentation', 'https://git-scm.com/doc']], videos: [yt('RGOj5yH7evk', 'Git and GitHub for Beginners - Crash Course', 'freeCodeCamp.org')] },
  'github actions': { docs: [['GitHub Actions docs', 'https://docs.github.com/en/actions']], videos: [yt('0PbxpIao_EU', 'GitHub Actions Tutorial for Beginners', 'Thetips4you')] },
  'system design': { docs: [['System Design Primer', 'https://github.com/donnemartin/system-design-primer']], videos: [yt('i7twT3x5yv8', 'System Design Interview: A Step-By-Step Guide', 'ByteByteGo')] },
  'rest api': { docs: [['REST API tutorial', 'https://restfulapi.net/']], videos: [yt('Rrd6xkyjPB8', 'How to Design APIs Like a Senior Engineer', 'Hayk Simonyan')] },
  scrum: { docs: [['Atlassian: Scrum guide', 'https://www.atlassian.com/agile/scrum']], videos: [yt('XU0llRltyFM', 'Intro to Scrum in Under 10 Minutes', 'Axosoft')] },
  'data structures': { docs: [['GeeksforGeeks: Data structures', 'https://www.geeksforgeeks.org/data-structures/']], videos: [yt('pkYVOmU3MgA', 'Data Structures and Algorithms in Python', 'freeCodeCamp.org')] },
  html: { docs: [['MDN: Learn web development', 'https://developer.mozilla.org/en-US/docs/Learn_web_development']], videos: [yt('a_iQb1lnAEQ', 'Learn HTML & CSS - Full Course for Beginners', 'freeCodeCamp.org')] },
  tailwind: { docs: [['Tailwind CSS docs', 'https://tailwindcss.com/docs']], videos: [yt('UBOj6rqRUME', 'Tailwind CSS Crash Course', 'Traversy Media')] },
  jest: { docs: [['Jest: Getting started', 'https://jestjs.io/docs/getting-started']], videos: [yt('IPiUDhwnZxA', 'JavaScript Testing with Jest - Crash Course', 'freeCodeCamp.org')] },
  linux: { docs: [['Linux man pages', 'https://man7.org/linux/man-pages/index.html']], videos: [yt('SjQmo5tJB4c', 'Linux Command Line Full Course', 'ProgrammingKnowledge')] },
  'machine learning': { docs: [['Google Machine Learning Crash Course', 'https://developers.google.com/machine-learning/crash-course']], videos: [yt('i_LwzRVP7bg', 'Machine Learning for Everybody - Full Course', 'freeCodeCamp.org')] }
};

const ALIAS = {
  'react.js': 'react', 'next': 'next.js', 'nextjs': 'next.js', 'node.js': 'node', 'nodejs': 'node', 'express.js': 'express',
  'postgres': 'postgresql', 'ci/cd': 'github actions', 'agile': 'scrum', 'css': 'html', 'sass': 'html', 'algorithms': 'data structures',
  'rest': 'rest api', 'rest apis': 'rest api', 'restful': 'rest api', 'api': 'rest api', 'apis': 'rest api', 'spring': 'spring boot',
  'unit testing': 'jest', 'testing': 'jest', 'integration testing': 'jest', 'tdd': 'jest', 'mongoose': 'mongodb', 'deep learning': 'machine learning',
  'tensorflow': 'machine learning', 'pytorch': 'machine learning', 'scikit-learn': 'machine learning', 'pandas': 'python', 'numpy': 'python',
  'github': 'git', 'gitlab': 'git', 'nosql': 'mongodb', 'oop': 'java', 'object oriented': 'java', 'bootstrap': 'html'
};

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const q = (s) => encodeURIComponent(s);

export function resourcesFor(skills, limit = 8) {
  const out = [];
  const seen = new Set();
  for (const raw of skills) {
    const name = norm(raw);
    if (!name || name.length > 60) continue;
    const key = R[name] ? name : ALIAS[name];
    const dedupe = key || name;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    if (key && R[key]) {
      out.push({ skill: raw, curated: true, docs: R[key].docs.map(([title, url]) => ({ title, url })), videos: R[key].videos });
    } else {
      out.push({
        skill: raw, curated: false, docs: [],
        videos: [{ title: `YouTube search: ${raw} tutorial for beginners`, by: 'search results', url: `https://www.youtube.com/results?search_query=${q(raw + ' tutorial for beginners')}` }],
        search: [{ title: `Search: ${raw} documentation`, url: `https://www.google.com/search?q=${q(raw + ' official documentation')}` }]
      });
    }
    if (out.length >= limit) break;
  }
  return out;
}
