import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJdKeywords, matchKeywords, formattingChecks, groundStrengths } from './keywords.js';

const jd = 'We need a MERN developer with React, Node.js, MongoDB and REST APIs. Docker and AWS are a plus. React experience required.';

test('extracts tech terms from a job description', () => {
  const terms = extractJdKeywords(jd).map((k) => k.term);
  assert.ok(terms.includes('react'));
  assert.ok(terms.includes('node.js'));
  assert.ok(terms.includes('mongodb'));
  assert.ok(terms.includes('docker'));
  assert.ok(!terms.includes('the'));
});

test('matches and flags missing keywords', () => {
  const m = matchKeywords('Built apps with React and Node.js and MongoDB.', jd);
  assert.ok(m.matched.includes('react'));
  assert.ok(m.matched.includes('mongodb'));
  assert.ok(m.missing.includes('docker'));
  assert.ok(m.missing.includes('aws'));
  assert.ok(m.coverage > 0 && m.coverage < 100);
});

test('does not match inside other words', () => {
  const m = matchKeywords('I like javascript', 'java developer java java');
  assert.ok(m.missing.includes('java'));
});

test('formatting checks read basic signals', () => {
  const f = formattingChecks('Jane Doe jane@x.com +91 98765 43210 github.com/jane Education B.Tech Skills React Projects Experience Internship improved speed 40%');
  assert.ok(f.checks.find((c) => c.label.startsWith('Email')).ok);
  assert.ok(!f.checks.find((c) => c.label.startsWith('Enough content')).ok);
});

test('plural and tool wording counts as the same skill', () => {
  const jd2 = 'Requirements: REST API design, unit testing, code review, React, Node.js.';
  const m = matchKeywords('Created REST APIs and wrote basic Jest tests. Helped review pull requests. React, Node.js.', jd2);
  assert.ok(m.matched.includes('rest api'));
  assert.ok(m.matched.includes('unit testing'));
  assert.ok(m.matched.includes('code review'));
  assert.ok(!m.missing.includes('testing'));
});

test('aliases do not create false matches', () => {
  const m = matchKeywords('I enjoy rest and testing my patience.', 'REST API design and unit testing and Docker');
  assert.ok(m.missing.includes('rest api'));
  assert.ok(m.missing.includes('unit testing'));
});

test('bare testing is not counted twice with unit testing', () => {
  const terms = extractJdKeywords('Unit testing required. Testing mindset.').map((k) => k.term);
  assert.ok(terms.includes('unit testing'));
  assert.ok(!terms.includes('testing'));
});

test('AI strengths that claim unsupported deployment are dropped', () => {
  const resume = 'Built a note sharing web app with login and search. Created REST APIs.';
  const out = groundStrengths(['Built and deployed a full-stack app with MongoDB', 'Created REST APIs', 'Led a team of 4'], resume);
  assert.deepEqual(out, ['Created REST APIs']);
  assert.deepEqual(groundStrengths(['Deployed the app on Render'], 'Deployed the app on Render.'), ['Deployed the app on Render']);
});
