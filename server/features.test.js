import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTailored } from './tailor.js';
import { resourcesFor } from './resources.js';
import { isPrivateIp, fetchJobPosting, htmlToText } from './jdfetch.js';

const resume = 'Jane Doe jane@x.com Skills: JavaScript, React, Node.js, MongoDB. Built a chat app used by 200 students. Experience: Intern at Acme 2023.';

test('tailored output drops skills and numbers that are not in the resume', () => {
  const out = sanitizeTailored({
    name: 'Jane Doe', contact: ['jane@x.com'], summary: 's',
    skills: [{ group: 'Tech', items: ['React', 'Docker', 'Node.js'] }],
    experience: [{ title: 'Intern', org: 'Acme', dates: '2023', bullets: ['Built a chat app used by 200 students', 'Cut load time by 70%'] }],
    projects: [], education: [], other: []
  }, resume);
  assert.deepEqual(out.skills[0].items, ['React', 'Node.js']);
  assert.equal(out.experience[0].bullets.length, 1);
  assert.equal(out.removedUnsupported, 2);
});

test('resources: curated, aliased and search fallback', () => {
  const r = resourcesFor(['Docker', 'node.js', 'Snowflake', 'docker']);
  assert.equal(r.length, 3);
  assert.ok(r[0].curated && r[0].videos[0].url.startsWith('https://www.youtube.com/watch?v='));
  assert.ok(r[1].curated);
  assert.equal(r[2].curated, false);
  assert.ok(r[2].videos[0].url.includes('search_query=Snowflake'));
});

test('private addresses are blocked', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '169.254.169.254', '172.16.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) assert.ok(isPrivateIp(ip), ip);
  assert.ok(!isPrivateIp('8.8.8.8'));
  await assert.rejects(fetchJobPosting('http://127.0.0.1/'), { code: 'blocked_address' });
  await assert.rejects(fetchJobPosting('file:///etc/passwd'), { code: 'bad_url' });
});

test('html to text keeps list items and drops scripts', () => {
  const t = htmlToText('<script>x=1</script><h1>Job</h1><ul><li>React</li><li>Node &amp; SQL</li></ul>');
  assert.match(t, /- React/);
  assert.match(t, /Node & SQL/);
  assert.doesNotMatch(t, /x=1/);
});

import { buildImprovedResume, assessReadiness } from './tailor.js';
import { toDocx, toPdf } from './export.js';
test('source-only resume preserves text and never imports job requirements', () => {
  const original = 'Jane Doe\njane@example.com\nSkills\nReact, JavaScript\nProjects\nBuilt a chat app for 200 students.\nEducation\nBachelor of Science, Example College, 2023';
  const out = buildImprovedResume(original, 'Docker Kubernetes AWS React JavaScript developer.');
  const candidateText = [out.name, ...out.other.flatMap(s => s.items)].join('\n');
  for (const line of candidateText.split('\n')) assert.ok(original.includes(line));
  assert.ok(out.sourceOnly);
  assert.doesNotMatch(candidateText, /Docker|Kubernetes|AWS/);
  assert.ok(out.readiness.score < 100);
  assert.ok(out.readiness.missing.includes('docker'));
});
test('readiness is transparent and unavailable without job keywords', () => {
  assert.equal(assessReadiness('Jane Doe', '').score, null);
});
test('source-only resume exports readable PDF and editable DOCX', async () => {
  const r = buildImprovedResume('Jane Doe\njane@example.com\nSkills\nJavaScript and React\nProjects\nBuilt a chat app.');
  const pdf = await toPdf(r), docx = await toDocx(r);
  assert.equal(pdf.subarray(0,5).toString(), '%PDF-');
  assert.equal(docx.subarray(0,2).toString(), 'PK');
});
