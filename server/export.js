import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';
import PDFDocument from 'pdfkit';

const heading = (t) => new Paragraph({ spacing: { before: 200, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888', space: 1 } }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 22 })] });
const line = (runs, opts = {}) => new Paragraph({ spacing: { after: 40 }, ...opts, children: runs });
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text: t, size: 21 })] });

export async function toDocx(r) {
  const c = [];
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.name || 'Resume', bold: true, size: 36 })] }));
  if (r.contact.length) c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: r.contact.join('  |  '), size: 19 })] }));
  if (r.summary) { c.push(heading('Summary')); c.push(line([new TextRun({ text: r.summary, size: 21 })])); }
  if (r.skills.length) { c.push(heading('Skills')); r.skills.forEach((g) => c.push(line([new TextRun({ text: g.group ? g.group + ': ' : '', bold: true, size: 21 }), new TextRun({ text: g.items.join(', '), size: 21 })]))); }
  if (r.experience.length) { c.push(heading('Experience')); r.experience.forEach((e) => { c.push(line([new TextRun({ text: e.title, bold: true, size: 21 }), new TextRun({ text: (e.org ? ', ' + e.org : '') + (e.dates ? '  (' + e.dates + ')' : ''), size: 21 })])); e.bullets.forEach((b) => c.push(bullet(b))); }); }
  if (r.projects.length) { c.push(heading('Projects')); r.projects.forEach((p) => { c.push(line([new TextRun({ text: p.name, bold: true, size: 21 }), new TextRun({ text: p.tech ? '  |  ' + p.tech : '', italics: true, size: 20 })])); p.bullets.forEach((b) => c.push(bullet(b))); }); }
  if (r.education.length) { c.push(heading('Education')); r.education.forEach((e) => { c.push(line([new TextRun({ text: e.degree, bold: true, size: 21 }), new TextRun({ text: (e.org ? ', ' + e.org : '') + (e.dates ? '  (' + e.dates + ')' : ''), size: 21 })])); if (e.details) c.push(line([new TextRun({ text: e.details, size: 20 })])); }); }
  r.other.forEach((o) => { c.push(heading(o.heading)); o.items.forEach((i) => c.push(bullet(i))); });
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 850, right: 850 } } }, children: c }] });
  return Packer.toBuffer(doc);
}

// pdfkit's built-in fonts only cover Latin-1, so map common typographic characters first.
const latin = (s) => String(s).replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2022/g, '-').replace(/\u2026/g, '...').replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '');

export function toPdf(r) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 46, right: 46 }, info: { Title: (r.name || 'Resume') + ' - Resume' } });
    const bufs = [];
    doc.on('data', (b) => bufs.push(b));
    doc.on('end', () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);
    const W = doc.page.width - 92;
    const head = (t) => { doc.moveDown(0.5); doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#000').text(latin(t.toUpperCase()), { width: W }); const y = doc.y + 1; doc.moveTo(46, y).lineTo(46 + W, y).lineWidth(0.6).strokeColor('#888').stroke(); doc.moveDown(0.3); };
    const row = (bold, rest) => { doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(latin(bold), { continued: Boolean(rest), width: W }); if (rest) doc.font('Helvetica').text(latin(rest)); };
    const bul = (t) => { doc.font('Helvetica').fontSize(9.8).fillColor('#111').text('-  ' + latin(t), { indent: 8, width: W, lineGap: 1 }); };
    doc.font('Helvetica-Bold').fontSize(18).text(latin(r.name || 'Resume'), { align: 'center', width: W });
    if (r.contact.length) doc.font('Helvetica').fontSize(9).fillColor('#333').text(latin(r.contact.join('  |  ')), { align: 'center', width: W });
    if (r.summary) { head('Summary'); doc.font('Helvetica').fontSize(9.8).fillColor('#111').text(latin(r.summary), { width: W, lineGap: 1 }); }
    if (r.skills.length) { head('Skills'); r.skills.forEach((g) => row(g.group ? g.group + ': ' : '', g.items.join(', '))); }
    if (r.experience.length) { head('Experience'); r.experience.forEach((e) => { row(e.title, (e.org ? ', ' + e.org : '') + (e.dates ? '  (' + e.dates + ')' : '')); e.bullets.forEach(bul); doc.moveDown(0.2); }); }
    if (r.projects.length) { head('Projects'); r.projects.forEach((p) => { row(p.name, p.tech ? '  |  ' + p.tech : ''); p.bullets.forEach(bul); doc.moveDown(0.2); }); }
    if (r.education.length) { head('Education'); r.education.forEach((e) => { row(e.degree, (e.org ? ', ' + e.org : '') + (e.dates ? '  (' + e.dates + ')' : '')); if (e.details) bul(e.details); }); }
    r.other.forEach((o) => { head(o.heading); o.items.forEach(bul); });
    doc.end();
  });
}
