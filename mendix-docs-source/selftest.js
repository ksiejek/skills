#!/usr/bin/env node
/* The mendix-docs skill checked on MxScout's own test fixture, in Node — no browser, no dependencies:
 *   node selftest.js [--mxscout <MxScout repository>]   (or MXSCOUT_DIR; default ~/Projects/MxScout)
 *
 * It puts an installable copy together, then runs it the way the skill does: status, module, pack,
 * mendix-describe's checker on that pack, and a report with descriptions on it. MxScout's own suite
 * keeps the file this builds the same as its export (public/docs-file.js is shared by both); this
 * checks the skill's side of it. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const at = args.indexOf('--mxscout');
const MX = at >= 0 ? args[at + 1] : (process.env.MXSCOUT_DIR || path.join(os.homedir(), 'Projects', 'MxScout'));
let passed = 0, failed = 0;
function ok(cond, what) { if (cond) { passed++; console.log('  ok   ' + what); } else { failed++; console.log('  FAIL ' + what); } }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mxdocs-self-'));
try {
  const skill = path.join(tmp, 'skill');
  execFileSync(process.execPath, [path.join(__dirname, 'pack-skill.js'), skill, '--mxscout', MX], { encoding: 'utf8' });
  ok(['SKILL.md', 'docs.js', 'check-descriptions.js', 'reference/business-narrative.md', 'engine/mpr.js', 'engine/docs-file.js', 'engine/fonts/InstrumentSans.woff2'].every((f) => fs.existsSync(path.join(skill, f))),
    'the installable copy has its own files, mendix-describe’s checker and references, and the engine');
  ok(fs.readFileSync(path.join(skill, 'engine', 'docs-view.js'), 'utf8') === fs.readFileSync(path.join(MX, 'public', 'docs-view.js'), 'utf8'), 'the engine is MxScout’s files, unchanged');

  const proj = path.join(tmp, 'Sales');
  fs.mkdirSync(proj);
  fs.copyFileSync(path.join(MX, 'test', 'fixtures', 'mpr-v1.db'), path.join(proj, 'Sales.mpr'));
  const run = (a) => execFileSync(process.execPath, [path.join(skill, 'docs.js')].concat(a), { encoding: 'utf8' });

  const status = run(['status', proj]);
  ok(/^project: Sales \(Mendix /.test(status) && /\nSales \| 2 \| 0 \| 2 \| 3/.test(status), 'status names the project and its modules');
  const pack = path.join(tmp, 'pack.md');
  run(['pack', path.join(proj, 'Sales.mpr'), pack]);
  const packText = fs.readFileSync(pack, 'utf8');
  ok(/## index/.test(packText) && /#[0-9a-f]{8}/.test(packText), 'pack writes the AI pack, index and fingerprints');
  ok(/^## module Sales\n/.test(run(['module', proj, 'Sales'])), 'module gives one module’s section');
  const todo = execFileSync(process.execPath, [path.join(skill, 'check-descriptions.js'), 'todo', pack], { encoding: 'utf8' });
  ok(/flows to describe/.test(todo), 'mendix-describe’s checker reads that pack');

  const fp = (packText.match(/CreateOrder[^\n]*#([0-9a-f]{8})/) || [])[1];
  const desc = { format: 'mxscout-descriptions', version: 1, language: 'en',
    app: { summary: 'Sales keeps orders.', story: 'Orders are opened.\n\nThey are numbered.',
      processes: [{ name: 'Taking an order', summary: 'A clerk opens an order.', story: 'A clerk opens it.\n\nIt is saved.', steps: ['A clerk opens a new order'], flows: ['Sales.CreateOrder'],
        diagram: [{ step: 'Opens an order', who: 'Clerk' }, { decision: 'Known customer?', ways: [{ label: 'no', end: 'Waits' }, { label: 'yes' }] }, { end: 'Saved' }] }] },
    microflows: { 'Sales.CreateOrder': { hash: fp, text: 'Opens a fresh order.' } } };
  fs.writeFileSync(path.join(tmp, 'descriptions.json'), JSON.stringify(desc));
  const out = path.join(tmp, 'report.html');
  const said = run(['report', proj, path.join(tmp, 'descriptions.json'), '--out', out]);
  const html = fs.readFileSync(out, 'utf8');
  ok(/1 flows described/.test(said) && /^<!doctype html>/i.test(html) && (html.match(/url\("data:font\/woff2;base64,/g) || []).length === 2 && !/url\("fonts\//.test(html),
    'report writes one self-contained file, fonts inside');
  ok(html.indexOf('Taking an order') !== -1 && html.indexOf('Known customer?') !== -1 && html.indexOf('window.MxDocsView=') !== -1 && html.indexOf('MxFlowGraph') !== -1,
    'with the descriptions, the process and its diagram as data, the reader and the flow drawing');

  // Mendix 10+: the documents are in mprcontents/ beside the .mpr. With the folder the project reads;
  // without it the skill says what is missing instead of building an empty report.
  const v2 = path.join(tmp, 'Sales10');
  fs.mkdirSync(v2);
  fs.copyFileSync(path.join(MX, 'test', 'fixtures', 'mpr-v2.db'), path.join(v2, 'Sales.mpr'));
  const sidecar = JSON.parse(fs.readFileSync(path.join(MX, 'test', 'fixtures', 'mpr-v2-contents.json'), 'utf8'));
  let bare = null;
  try { run(['status', v2]); } catch (e) { bare = e; }
  ok(bare && bare.status === 1 && /mprcontents/.test(String(bare.stderr)), 'a Mendix 10+ .mpr without mprcontents/ fails and says what is missing');
  Object.keys(sidecar).forEach((rel) => {
    const f = path.join(v2, 'mprcontents', rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(sidecar[rel], 'base64'));
  });
  ok(/\nSales \| /.test(run(['status', v2])), 'with mprcontents/ beside it, the same project reads');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
