#!/usr/bin/env node
// build.js: turns one document spec (JSON) into the three deliverables of the "dokumentacja" skill:
// <name>.html (MxScout look, one offline file), <name>.md and <name>.docx. Zero npm dependencies;
// the .docx is written as plain OOXML and zipped with the system `zip`.
// Usage: node build.js spec.json [outDir]   (outDir defaults to the spec's folder)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const specFile = process.argv[2];
if (!specFile) { console.error('Usage: node build.js spec.json [outDir]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const outDir = process.argv[3] || path.dirname(path.resolve(specFile));
const baseName = path.basename(specFile).replace(/\.json$/, '');
fs.mkdirSync(outDir, { recursive: true });

// Escapes text for HTML and XML.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Splits inline markup (**bold**, `code`) into typed pieces shared by all three renderers.
function pieces(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { t: m[1], b: true } : { t: m[2], c: true });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
const inlineHtml = (s) => pieces(s).map((p) => p.b ? `<b>${esc(p.t)}</b>` : p.c ? `<code>${esc(p.t)}</code>` : esc(p.t)).join('');
const inlineMd = (s) => String(s);
const plain = (s) => pieces(s).map((p) => p.t).join('');

const sections = spec.sections || [];
const no2 = (i) => String(i + 1).padStart(2, '0');
const ARROW = '<div class="link"><svg viewBox="0 0 28 16" aria-hidden="true"><path d="M2 8h20M17 3l6 5-6 5" fill="none" stroke="#AEB4BD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';

// ---------- HTML ----------
// Renders one block of a section as MxScout-styled HTML.
function blockHtml(b) {
  if (b.p) return `<div class="prose"><p>${inlineHtml(b.p)}</p></div>`;
  if (b.ul) return `<ul>${b.ul.map((x) => `<li>${inlineHtml(x)}</li>`).join('')}</ul>`;
  if (b.ol) return `<ol>${b.ol.map((x) => `<li>${inlineHtml(x)}</li>`).join('')}</ol>`;
  if (b.code) return `<span class="req">${esc(b.code)}</span>`;
  if (b.note) return `<div class="note ${b.note.kind || ''}"><span class="tag ${b.note.kind === 'acc' ? 'acc' : ''}">${esc(b.note.tag || 'Uwaga')}</span><span>${inlineHtml(b.note.text)}</span></div>`;
  if (b.table) {
    const head = b.table.head.map((h) => `<th>${esc(h)}</th>`).join('');
    const rows = b.table.rows.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="name"' : ''}>${inlineHtml(c)}</td>`).join('')}</tr>`).join('');
    return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (b.grid) return `<div class="grid2">${b.grid.map((g) => `<div class="card"${g.accent ? ' style="border-color:color-mix(in srgb, var(--acc) 35%, transparent);background:var(--acc-soft)"' : ''}><p class="cap">${esc(g.cap)}</p><p>${inlineHtml(g.text)}</p></div>`).join('')}</div>`;
  if (b.cards) return b.cards.map((c) => `<div class="card"><h3>${c.no ? `<span class="no">${esc(c.no)}</span>` : ''}${esc(c.title)}</h3>${c.text ? `<p>${inlineHtml(c.text)}</p>` : ''}${c.list ? `<ul>${c.list.map((x) => `<li>${inlineHtml(x)}</li>`).join('')}</ul>` : ''}${c.code ? `<span class="req">${esc(c.code)}</span>` : ''}</div>`).join('');
  if (b.checks) return `<ul class="checks">${b.checks.map((x) => `<li><span class="mk">✓</span><span>${inlineHtml(x)}</span></li>`).join('')}</ul>`;
  if (b.verify) return `<ol class="verify">${b.verify.map((x) => `<li><b>${esc(x.title)}</b><span>${inlineHtml(x.text)}</span></li>`).join('')}</ol>`;
  if (b.steps) return `<ol class="steps">${b.steps.map((x) => `<li><b>${esc(x.title)}</b>${inlineHtml(x.text)}</li>`).join('')}</ol>`;
  if (b.flow) return `<div class="flow">${b.flow.map((x, i) => `${i ? ARROW : ''}<div class="step${x.mx ? ' mx' : ''}"><span class="num">${i + 1}</span><b>${esc(x.title)}</b><span>${inlineHtml(x.text)}</span>${x.src ? `<span class="src">${esc(x.src)}</span>` : ''}</div>`).join('')}</div>`;
  throw new Error('Unknown block: ' + JSON.stringify(Object.keys(b)));
}

function buildHtml() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'szablon.css'), 'utf8');
  const chips = (spec.meta || []).map((m) => `<div class="chip${m.status ? ' status' : ''}"><span class="cap">${esc(m.k)}</span><b>${esc(m.v)}</b></div>`).join('');
  const toc = sections.map((s, i) => `<li><a href="#${esc(s.id)}"><span class="n">${i + 1}</span>${esc(s.title)}</a></li>`).join('');
  const body = sections.map((s, i) => `<section id="${esc(s.id)}">\n  <div class="sec-h"><span class="no">${no2(i)}</span><h2>${esc(s.title)}</h2></div>\n  ${s.blocks.map(blockHtml).join('\n  ')}\n</section>`).join('\n\n');
  return `<!doctype html>
<html lang="${esc(spec.lang || 'pl')}" data-theme="light" data-accent="cobalt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(plain(spec.title))}</title>
<style>
${css}</style>
</head><body>
<main class="island">

<header>
  <div class="eyebrow">${esc(spec.eyebrow || '')}</div>
  <h1>${inlineHtml(spec.title)}</h1>
  <p class="lead">${inlineHtml(spec.lead || '')}</p>
  <div class="chips">${chips}</div>
</header>

<nav class="toc" aria-label="Spis treści">
  <p class="cap">Spis treści</p>
  <ol>${toc}</ol>
</nav>

${body}

<footer><span>${esc(spec.footer && spec.footer[0] || plain(spec.title))}</span><span>${esc(spec.footer && spec.footer[1] || '')}</span></footer>
</main>
</body></html>
`;
}

// ---------- Markdown ----------
// Renders one block as Markdown lines.
function blockMd(b) {
  if (b.p) return inlineMd(b.p);
  if (b.ul) return b.ul.map((x) => `- ${inlineMd(x)}`).join('\n');
  if (b.ol) return b.ol.map((x, i) => `${i + 1}. ${inlineMd(x)}`).join('\n');
  if (b.code) return '```\n' + b.code + '\n```';
  if (b.note) return `> **${b.note.tag || 'Uwaga'}:** ${inlineMd(b.note.text)}`;
  if (b.table) {
    const cell = (c) => inlineMd(c).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    return `| ${b.table.head.map(cell).join(' | ')} |\n| ${b.table.head.map(() => '---').join(' | ')} |\n` + b.table.rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n');
  }
  if (b.grid) return b.grid.map((g) => `**${g.cap}.** ${inlineMd(g.text)}`).join('\n\n');
  if (b.cards) return b.cards.map((c) => `### ${c.no ? c.no + ' ' : ''}${c.title}\n\n${c.text ? inlineMd(c.text) + '\n\n' : ''}${c.list ? c.list.map((x) => `- ${inlineMd(x)}`).join('\n') + '\n\n' : ''}${c.code ? '```\n' + c.code + '\n```' : ''}`.trim()).join('\n\n');
  if (b.checks) return b.checks.map((x) => `- ✓ ${inlineMd(x)}`).join('\n');
  if (b.verify) return b.verify.map((x, i) => `${i + 1}. **${x.title}.** ${inlineMd(x.text)}`).join('\n');
  if (b.steps) return b.steps.map((x, i) => `${i + 1}. **${x.title}.** ${inlineMd(x.text)}`).join('\n');
  if (b.flow) return b.flow.map((x, i) => `${i + 1}. **${x.title}.** ${inlineMd(x.text)}${x.src ? ` _(${x.src})_` : ''}`).join('\n');
  return '';
}

function buildMd() {
  const meta = (spec.meta || []).map((m) => `**${m.k}:** ${m.v}`).join(' · ');
  const out = [`# ${spec.title}`, spec.eyebrow ? `_${spec.eyebrow}_` : '', spec.lead ? `**${spec.lead.replace(/\*\*/g, '')}**` : '', meta, '## Spis treści\n\n' + sections.map((s, i) => `${i + 1}. ${s.title}`).join('\n')];
  sections.forEach((s, i) => out.push(`## ${i + 1}. ${s.title}\n\n` + s.blocks.map(blockMd).join('\n\n')));
  if (spec.footer) out.push('---\n' + spec.footer.join(' · '));
  return out.filter(Boolean).join('\n\n') + '\n';
}

// ---------- DOCX ----------
// One text run per inline piece (bold / monospace kept).
function runs(text, extra = '') {
  return pieces(text).map((p) => `<w:r><w:rPr>${extra}${p.b ? '<w:b/>' : ''}${p.c ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:val="clear" w:fill="F6F7F9"/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(p.t)}</w:t></w:r>`).join('');
}
const para = (text, style, extra) => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}</w:pPr>${runs(text, extra)}</w:p>`;
const bullet = (text) => `<w:p><w:pPr><w:ind w:left="360" w:hanging="260"/></w:pPr>${runs('• ' + text)}</w:p>`;
const numbered = (text, i) => `<w:p><w:pPr><w:ind w:left="360" w:hanging="300"/></w:pPr>${runs(`${i + 1}. ` + text)}</w:p>`;
// A bordered table; the header row is shaded.
function tableXml(head, rows) {
  const cell = (t, h) => `<w:tc><w:tcPr>${h ? '<w:shd w:val="clear" w:fill="F6F7F9"/>' : ''}</w:tcPr>${para(t, '', h ? '<w:b/>' : '')}</w:tc>`;
  const b = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:color="E4E6EA"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${b}</w:tblBorders></w:tblPr><w:tr>${head.map((h) => cell(h, true)).join('')}</w:tr>${rows.map((r) => `<w:tr>${r.map((c) => cell(c)).join('')}</w:tr>`).join('')}</w:tbl><w:p/>`;
}
// Renders one block as WordprocessingML.
function blockDocx(b) {
  if (b.p) return para(b.p);
  if (b.ul) return b.ul.map(bullet).join('');
  if (b.ol) return b.ol.map(numbered).join('');
  if (b.code) return b.code.split('\n').map((l) => para('`' + l + '`')).join('');
  if (b.note) return para(`**${b.note.tag || 'Uwaga'}:** ${b.note.text}`, 'Note');
  if (b.table) return tableXml(b.table.head, b.table.rows);
  if (b.grid) return b.grid.map((g) => para(`**${g.cap}.** ${g.text}`)).join('');
  if (b.cards) return b.cards.map((c) => para(`${c.no ? c.no + ' ' : ''}${c.title}`, 'Heading3') + (c.text ? para(c.text) : '') + (c.list ? c.list.map(bullet).join('') : '') + (c.code ? c.code.split('\n').map((l) => para('`' + l + '`')).join('') : '')).join('');
  if (b.checks) return b.checks.map((x) => bullet('✓ ' + x)).join('');
  if (b.verify) return b.verify.map((x, i) => numbered(`**${x.title}.** ${x.text}`, i)).join('');
  if (b.steps) return b.steps.map((x, i) => numbered(`**${x.title}.** ${x.text}`, i)).join('');
  if (b.flow) return b.flow.map((x, i) => numbered(`**${x.title}.** ${x.text}${x.src ? ` (${x.src})` : ''}`, i)).join('');
  return '';
}

function buildDocx(file) {
  const meta = (spec.meta || []).map((m) => `**${m.k}:** ${m.v}`).join('   ·   ');
  let body = (spec.eyebrow ? para(spec.eyebrow, 'Eyebrow') : '') + para(spec.title, 'Title') + (spec.lead ? para(spec.lead, 'Lead') : '') + (meta ? para(meta) : '');
  sections.forEach((s, i) => { body += para(`${i + 1}. ${s.title}`, 'Heading1') + s.blocks.map(blockDocx).join(''); });
  if (spec.footer) body += para(spec.footer.join(' · '), 'Eyebrow');
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const st = (id, name, rpr, ppr = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="120"/>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="3B4048"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>`
    + st('Title', 'Title', '<w:b/><w:sz w:val="52"/><w:color w:val="121417"/>')
    + st('Lead', 'Lead', '<w:sz w:val="28"/><w:color w:val="121417"/>')
    + st('Eyebrow', 'Eyebrow', '<w:b/><w:caps/><w:sz w:val="18"/><w:color w:val="2148D0"/>')
    + st('Heading1', 'heading 1', '<w:b/><w:sz w:val="36"/><w:color w:val="121417"/>', '<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="E4E6EA"/></w:pBdr><w:spacing w:before="480" w:after="160"/>')
    + st('Heading3', 'heading 3', '<w:b/><w:sz w:val="26"/><w:color w:val="121417"/>', '<w:keepNext/>')
    + st('Note', 'Note', '', '<w:shd w:val="clear" w:fill="EBF0FF"/>')
    + '</w:styles>';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'docx-'));
  const put = (f, c) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), c); };
  put('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  put('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  put('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  put('word/document.xml', doc);
  put('word/styles.xml', styles);
  fs.rmSync(file, { force: true });
  execFileSync('zip', ['-q', '-X', '-r', path.resolve(file), '[Content_Types].xml', '_rels', 'word'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
}

fs.writeFileSync(path.join(outDir, baseName + '.html'), buildHtml());
fs.writeFileSync(path.join(outDir, baseName + '.md'), buildMd());
buildDocx(path.join(outDir, baseName + '.docx'));
console.log(['html', 'md', 'docx'].map((e) => path.join(outDir, baseName + '.' + e)).join('\n'));
