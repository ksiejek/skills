#!/usr/bin/env node
/* The mendix-docs skill checked on MxScout's own test fixture, in Node — no browser, no dependencies:
 *   node selftest.js [--mxscout <MxScout repository>]   (or MXSCOUT_DIR; default ~/Projects/MxScout)
 *
 * It puts an installable copy together, then runs it the way the skill does: status, module, pack,
 * mendix-describe's checker on that pack, a report with descriptions on it, and the documentation as
 * Markdown (docs). MxScout's own suite
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
  ok(/^\d+\.\d+\.\d+ \(MxScout (?:[0-9a-f]{4,}|\?)\)\n$/.test(fs.readFileSync(path.join(skill, 'VERSION'), 'utf8')), 'VERSION says the skill’s version and the MxScout commit it was packed from: ' + fs.readFileSync(path.join(skill, 'VERSION'), 'utf8').trim());
  const pack2 = (dest) => { try { execFileSync(process.execPath, [path.join(__dirname, 'pack-skill.js'), dest, '--mxscout', MX], { encoding: 'utf8', stdio: 'pipe' }); return null; } catch (e) { return e; } };
  ok(pack2(skill) === null && fs.existsSync(path.join(skill, 'SKILL.md')), 'packing again into the skill’s own folder empties and refills it');
  const precious = path.join(tmp, 'precious');
  fs.mkdirSync(precious); fs.writeFileSync(path.join(precious, 'notes.txt'), 'keep me');
  const refusedPack = pack2(precious);
  ok(refusedPack && refusedPack.status === 1 && /Refusing to empty/.test(String(refusedPack.stderr)) && fs.readFileSync(path.join(precious, 'notes.txt'), 'utf8') === 'keep me',
    'a folder that is not empty and is not the skill is refused, and left as it was');

  const proj = path.join(tmp, 'Sales');
  fs.mkdirSync(proj);
  fs.copyFileSync(path.join(MX, 'test', 'fixtures', 'mpr-v1.db'), path.join(proj, 'Sales.mpr'));
  const run = (a, opts) => execFileSync(process.execPath, [path.join(skill, 'docs.js')].concat(a), Object.assign({ encoding: 'utf8', stdio: 'pipe' }, opts || {}));
  // A run that must fail: its exit code and what it said.
  const refuse = (a, opts) => { try { run(a, opts); return { status: 0, said: '' }; } catch (e) { return { status: e.status, said: String(e.stderr) }; } };

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

  // docs: the documentation as Markdown, what MxScout gives an agent it shares a project with.
  ok(/^No documentation yet/.test(run(['docs', proj])), 'docs without descriptions says plainly there is none yet');
  const md = run(['docs', proj, path.join(tmp, 'descriptions.json')]);
  ok(md.startsWith('# MxScout documentation — Sales\n') && /^flows described: 1 of 2$/m.test(md) && /^out of date: 0$/m.test(md) &&
    md.indexOf('> This is what an agent understood earlier; verify against the AI pack before concluding.') !== -1 && md.indexOf('## Processes') !== -1 && md.indexOf('Opens a fresh order.') !== -1,
    'docs writes the documentation as Markdown: the header, then the pages, the descriptions in them');
  const old = Object.assign({}, desc, { microflows: { 'Sales.CreateOrder': { hash: '00000000', text: 'Opens a fresh order.' } } });
  fs.writeFileSync(path.join(tmp, 'old.json'), JSON.stringify(old));
  const mdOut = path.join(tmp, 'docs.md');
  ok(/^Wrote /.test(run(['docs', proj, path.join(tmp, 'old.json'), '--out', mdOut])) && /^out of date: 1 /m.test(fs.readFileSync(mdOut, 'utf8')) &&
    fs.readFileSync(mdOut, 'utf8').indexOf('Opens a fresh order. (out of date — the microflow changed since this was written)') !== -1,
    'a description whose flow changed since is marked out of date, and --out writes it to a file');
  const todoDocs = execFileSync(process.execPath, [path.join(skill, 'check-descriptions.js'), 'todo', pack, mdOut, '--list'], { encoding: 'utf8' });
  ok(/Sales \(pack line \d+\): \d+ new, 1 changed/.test(todoDocs) && /^ {4}Sales\.CreateOrder$/m.test(todoDocs), 'the checker’s todo reads that Markdown in place of a descriptions file');

  // Nothing is written into the project's folder: --out, the pack's file, the report's default name run from
  // inside it, and a path through a link into it — all refused before anything is written.
  const link = path.join(tmp, 'link-to-project');
  fs.symlinkSync(proj, link);
  const inside = [
    ['report', proj, '--out', path.join(proj, 'report.html')],
    ['pack', proj, path.join(proj, 'pack.md')],
    ['docs', proj, path.join(tmp, 'descriptions.json'), '--out', path.join(link, 'docs.md')],
    ['module', proj, 'Sales', '--out', path.join(proj, 'sub', '..', 'm.md')]
  ].map((a) => refuse(a));
  const byDefault = refuse(['report', '.'], { cwd: proj });
  ok(inside.concat([byDefault]).every((r) => r.status === 1 && /Refusing to write .* inside the Mendix project's folder/.test(r.said)) &&
    fs.readdirSync(proj).join() === 'Sales.mpr',
    'a file inside the project’s folder is refused — --out, the pack, the report’s default name, a link into it — and nothing is written there');
  const noOut = refuse(['report', proj, '--out']), noOut2 = refuse(['module', proj, 'Sales', '--out', '--all']);
  ok(noOut.status === 1 && /--out needs a file name/.test(noOut.said) && noOut2.status === 1 && /--out needs a file name/.test(noOut2.said), '--out with no file name after it fails and says so');
  const noName = refuse(['module', proj]);
  ok(noName.status === 1 && /Name the module/.test(noName.said), 'module with no name asks for one');
  const noMods = refuse(['report', proj, '--modules', ',', '--out', path.join(tmp, 'none.html')]);
  ok(noMods.status === 1 && /--modules names no module/.test(noMods.said) && !fs.existsSync(path.join(tmp, 'none.html')), '--modules that names nothing fails instead of building an empty report');
  const badWrite = refuse(['docs', proj, path.join(tmp, 'descriptions.json'), '--out', path.join(tmp, 'no', 'such', 'dir', 'docs.md')]);
  ok(badWrite.status === 1 && /^Could not write /.test(badWrite.said) && !/could not read the project/i.test(badWrite.said), 'a write that fails is reported as a write error, not as the project unreadable: ' + badWrite.said.trim());
  const noEngine = (() => { try { execFileSync(process.execPath, [path.join(__dirname, 'docs.js'), 'status', proj], { encoding: 'utf8', stdio: 'pipe', env: Object.assign({}, process.env, { MXSCOUT_DIR: '' }) }); return { status: 0, said: '' }; } catch (e) { return { status: e.status, said: String(e.stderr) }; } })();
  ok(noEngine.status === 1 && /engine is missing/.test(noEngine.said) && /MXSCOUT_DIR/.test(noEngine.said), 'run from its source with no engine, it says to set MXSCOUT_DIR');
  fs.writeFileSync(path.join(tmp, 'polish.json'), JSON.stringify(Object.assign({}, desc, { language: 'pl' })));
  run(['report', proj, path.join(tmp, 'polish.json'), '--out', path.join(tmp, 'pl.html')]);
  ok(/<html lang="en">/.test(html) && /<html lang="pl">/.test(fs.readFileSync(path.join(tmp, 'pl.html'), 'utf8')), 'the report’s page is in the descriptions’ language');

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

  // An MxScout project folder in place of the .mpr: the model from its model.json, its descriptions,
  // its language — and results only into its inbox/, with send.
  const mxf = path.join(tmp, 'mxscout-folder');
  fs.mkdirSync(path.join(mxf, 'inbox'), { recursive: true });
  const model = execFileSync(process.execPath, ['-e', `
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const ctx = { console, TextDecoder, TextEncoder, document: {} }; ctx.window = ctx; vm.createContext(ctx);
    ['sqlite.js', 'bson.js', 'mpr.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(${JSON.stringify(path.join(skill, 'engine'))}, f), 'utf8'), ctx));
    const b = fs.readFileSync(${JSON.stringify(path.join(proj, 'Sales.mpr'))});
    ctx.MxMpr.buildModel({ mprBytes: b.buffer.slice(b.byteOffset, b.byteOffset + b.length), appName: 'Sales', readContentsFile: () => null }).then((m) => process.stdout.write(JSON.stringify(m)));`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(mxf, 'model.json'), model);
  fs.writeFileSync(path.join(mxf, 'project.json'), JSON.stringify({ format: 'mxscout-project', layout: 1, id: 'self', name: 'Sales', contentLanguage: 'pl' }));
  fs.writeFileSync(path.join(mxf, 'descriptions.json'), JSON.stringify(desc));
  const fstatus = run(['status', mxf]);
  ok(/^project: Sales/.test(fstatus) && /model\.json \(an MxScout project folder\)/.test(fstatus) && /language: pl/.test(fstatus) && /\nSales \| 2 \| 0 \| 2 \| 3/.test(fstatus),
    'an MxScout project folder reads in place of the .mpr: its model.json, its language');
  const fdocs = run(['docs', '--model', mxf]);
  ok(/flows described: 1 of/.test(fdocs) && /Write in: Polish \(pl\)/.test(fdocs), 'docs --model <folder> takes its descriptions.json, and says the language');
  run(['report', mxf, '--out', path.join(tmp, 'folder.html')]);
  ok(/Opens a fresh order\./.test(fs.readFileSync(path.join(tmp, 'folder.html'), 'utf8')), 'and the report is built from it, with its descriptions');
  const intoFolder = refuse(['report', mxf, '--out', path.join(mxf, 'r.html')]);
  ok(intoFolder.status === 1 && /MxScout project folder/.test(intoFolder.said) && !fs.existsSync(path.join(mxf, 'r.html')), 'nothing else is written into that folder');
  run(['send', mxf, path.join(tmp, 'descriptions.json')]);
  const sent = fs.readdirSync(path.join(mxf, 'inbox'));
  ok(sent.length === 1 && /-descriptions\.json$/.test(sent[0]) && fs.readFileSync(path.join(mxf, 'inbox', sent[0]), 'utf8') === fs.readFileSync(path.join(tmp, 'descriptions.json'), 'utf8'),
    'send writes the descriptions whole into its inbox/: ' + sent.join(','));
  const notDesc = refuse(['send', mxf, pack]);
  ok(notDesc.status === 1 && /as JSON|not a descriptions file/.test(notDesc.said), 'and refuses what is not a descriptions file');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
