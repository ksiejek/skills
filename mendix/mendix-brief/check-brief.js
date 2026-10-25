#!/usr/bin/env node
/* mendix-brief — the helper beside SKILL.md. Node's standard library only; it never writes a file.
 *
 *   node check-brief.js sources <folder or file …>   list the documents to read, numbered S1, S2 …, and how
 *                                                      to read each (text here, a PDF with your own reader)
 *   node check-brief.js text <file>                    print a document's text: .md .txt .csv .json .html .xml
 *                                                      as they are, .docx from inside its zip (headings as #)
 *   node check-brief.js check <brief.json>             check a brief against MxScout's format (brief-format.js,
 *                                                      the same file MxScout reads it with); exit code 1 on an error
 *   node check-brief.js markdown <brief.json>          print it as the Markdown MxScout writes (brief.md)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const F = require('./brief-format.js');

const TEXT = /\.(md|markdown|txt|csv|tsv|json|html?|xml|ya?ml|feature)$/i;
const OWN = /\.(pdf)$/i;
const SKIP_DIRS = /^(\.|node_modules$|mxscout$|deployment$|javasource$|theme$|themesource$|widgets$|userlib$|vendorlib$|resources$)/;

function fail(msg) { console.error(msg); process.exit(1); }

// ---------- sources ----------
function walk(p, out, depth) {
  let st;
  try { st = fs.statSync(p); } catch (e) { return; }
  if (st.isDirectory()) {
    if (depth > 6) return;
    fs.readdirSync(p).sort().forEach((n) => { if (!SKIP_DIRS.test(n)) walk(path.join(p, n), out, depth + 1); });
  } else if (st.isFile() && !/^\./.test(path.basename(p)) && !/\.mpr(\.lock)?$/i.test(p)) out.push({ file: p, bytes: st.size });
}
function how(file) {
  if (/\.docx$/i.test(file)) return 'text (Word)';
  if (TEXT.test(file)) return 'text';
  if (OWN.test(file)) return 'read it with your own PDF reader';
  if (/\.(doc|rtf|odt|pages)$/i.test(file)) return 'cannot read — ask for it as .docx, .pdf or .md';
  if (/\.(xlsx|xls|ods)$/i.test(file)) return 'cannot read — ask for it exported as .csv';
  return 'skip unless the person says it matters';
}
function sources(args) {
  if (!args.length) fail('Usage: node check-brief.js sources <folder or file …>');
  const out = [];
  args.forEach((a) => walk(path.resolve(a), out, 0));
  if (!out.length) fail('No files there.');
  out.forEach((s, i) => console.log('S' + (i + 1) + '\t' + s.file + '\t' + Math.max(1, Math.round(s.bytes / 1024)) + ' KB\t' + how(s.file)));
  console.log('\n' + out.length + ' file(s). Give each one you use its S-number in "sources"; leave out what says nothing about the application.');
}

// ---------- text ----------
// A .docx is a zip: its text is word/document.xml. Read through the central directory, inflated with zlib.
function unzipEntry(buf, want) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('a damaged zip directory');
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === want) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return zlib.inflateRawSync(data);
      throw new Error('compression method ' + method + ' is not one Node reads');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
function entities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
}
function docxText(file) {
  const xml = unzipEntry(fs.readFileSync(file), 'word/document.xml');
  if (!xml) throw new Error('no word/document.xml inside — is it a Word document?');
  const body = xml.toString('utf8');
  const out = [];
  (body.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) || []).forEach((p) => {
    const style = /<w:pStyle w:val="([^"]+)"/.exec(p);
    const heading = style && /^(?:heading|title|nagwek|berschrift|titre)\s*(\d)?$/i.exec(style[1]);
    const list = /<w:numPr[\s>/]/.test(p);
    const runs = p.replace(/<w:tab\/>/g, '<w:t>\t</w:t>').replace(/<w:br\/>/g, '<w:t>\n</w:t>').match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g) || [];
    const text = entities(runs.map((r) => r.replace(/^<w:t[^>]*>|<\/w:t>$/g, '')).join('')).trim();
    if (!text) { if (out.length && out[out.length - 1] !== '') out.push(''); return; }
    if (heading) out.push('', '#'.repeat(Math.min(6, Number(heading[1] || 1))) + ' ' + text, '');
    else out.push((list ? '- ' : '') + text);
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function text(file) {
  if (!file) fail('Usage: node check-brief.js text <file>');
  if (!fs.existsSync(file)) fail('Cannot read ' + file + '.');
  if (/\.docx$/i.test(file)) {
    try { process.stdout.write(docxText(file)); } catch (e) { fail(file + ': ' + e.message); }
    return;
  }
  if (/\.html?$/i.test(file)) { process.stdout.write(entities(fs.readFileSync(file, 'utf8').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n')); return; }
  if (TEXT.test(file)) { process.stdout.write(fs.readFileSync(file, 'utf8')); return; }
  fail(file + ': ' + how(file) + '.');
}

// ---------- check ----------
function readBrief(file) {
  if (!file) fail('Usage: node check-brief.js check <brief.json>');
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { fail('Cannot read ' + file + '.'); }
  return raw;
}
function check(file) {
  const r = F.check(readBrief(file));
  r.errors.forEach((e) => console.log('error: ' + e));
  r.warnings.forEach((w) => console.log('warning: ' + w));
  if (r.errors.length) fail(file + ': ' + r.errors.length + ' error(s) — MxScout would refuse it whole.');
  const v = r.value;
  console.log('ok: ' + v.title + ' — ' + [v.roles.length + ' roles', v.processes.length + ' processes', v.rules.length + ' rules', v.data.length + ' data', v.open.length + ' open questions', v.sources.length + ' sources'].join(', ') + (r.warnings.length ? '; ' + r.warnings.length + ' warning(s)' : '') + '.');
}
function markdown(file) {
  const r = F.check(readBrief(file));
  if (r.errors.length) fail(r.errors[0]);
  process.stdout.write(F.markdown(r.value, {}));
}

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'sources') sources(args);
  else if (cmd === 'text') text(args[0]);
  else if (cmd === 'check') check(args[0]);
  else if (cmd === 'markdown') markdown(args[0]);
  else fail('Usage: node check-brief.js sources <folder …> | text <file> | check <brief.json> | markdown <brief.json>');
}
module.exports = { check: F.check, docxText, unzipEntry };
