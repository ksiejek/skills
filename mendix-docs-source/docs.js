#!/usr/bin/env node
/* The mendix-docs skill's reader and report builder. No dependencies — Node only.
 *
 * mendix-describe works with a running MxScout: MxScout reads the model and writes the AI pack, the
 * agent writes the descriptions, MxScout shows them. mendix-docs does the same work with no MxScout
 * running (Karol, 2026-10-14: "exactly the same skill, except that it builds the report itself"):
 * this reads the .mpr with MxScout's own engine — the same files MxScout runs in the browser, loaded
 * here unchanged — and builds the same documentation file MxScout exports.
 *
 *   node docs.js workdir [<app.mpr>]                      the work folder: where everything made while working goes —
 *                                                         the pack, the parts, descriptions.json, notes. $MXSCOUT_WORK,
 *                                                         or <temp>/mxscout-work/<project>; a file named without a path
 *                                                         is there (mendix-describe's rule, its check-descriptions.js)
 *   node docs.js status <app.mpr>                         the application and its modules, with counts
 *   node docs.js module <app.mpr> <Name> [--out f]        one module's section of the pack
 *   node docs.js pack <app.mpr> <file>                    the whole pack, to a FILE — for check-descriptions.js
 *   node docs.js report <app.mpr> [descriptions.json]     the documentation, one HTML file
 *        [--out file.html] [--modules A,B] [--all]        (own modules unless --modules or --all)
 *   node docs.js docs <app.mpr> [descriptions.json]       the documentation as Markdown, own modules, for an
 *        [--out docs.md]                                  agent to read first: what was understood earlier, with
 *                                                         a header and the out-of-date marks — what MxScout gives
 *                                                         an agent it shares a project with (GET /api/agent/docs)
 *
 *   node docs.js send <folder> <descriptions.json>        an MxScout project folder only: the descriptions,
 *                                                         written whole into its inbox/ for MxScout to take
 *
 *   node docs.js repo <MendixProject>                     a project kept INSIDE the Mendix project (mxscout/,
 *                                                         shared through the app's git): mxscout/docs/ — the
 *                                                         documentation by topic, its manifest, the index of the
 *                                                         solved cases in mxscout/knowledge/ — written from the
 *                                                         .mpr beside it and mxscout/descriptions/, byte for byte
 *                                                         as MxScout writes it; nothing when docs/manifest.json
 *                                                         says docs/ is made from these already. The one place
 *                                                         this writes inside a Mendix project: mxscout/docs/.
 *
 * <app.mpr> is the project's .mpr, or the folder that holds it. A Mendix 10+ project keeps its
 * documents in mprcontents/ beside the .mpr; that is read too, nothing else. Nothing is written into
 * the project (Karol, 2026-10-15: the Mendix project stays clean): a file named without a path goes into
 * the work folder, one named inside the .mpr's folder is refused (real paths, links followed) — and the
 * report, which goes where it always did (--out, or its default name here), goes into the work folder
 * instead when that is inside the project, and says so.
 *
 * In place of <app.mpr>, a project folder MxScout keeps (project.json, model.json, descriptions.json,
 * inbox/ …) — named there, or with --model <folder>: the model is read from its model.json, no .mpr
 * needed, and its descriptions.json is the descriptions when none is named. Nothing is written into
 * that folder either, except by `send`, into its inbox/ — MxScout takes the file from there while the
 * project is open in it (saved with Undo), or the next time it is opened. Never into descriptions.json:
 * that file is MxScout's, rewritten on every save, and a file written past it could be lost.
 *
 * The engine: engine/ beside this file in an installed skill, or public/ of the MxScout repository
 * named by MXSCOUT_DIR when run from the source — the same files either way (pack-skill.js copies them).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ENGINE_FILES = ['sqlite.js', 'bson.js', 'mpr.js', 'modelversion.js', 'docs-data.js', 'describe.js', 'reportdata.js', 'docs-changes.js', 'docs-tickets.js', 'docs-view.js', 'docs-file.js', 'repodocs.js'];

function fail(message) { console.error(message); process.exit(1); }

function engineDir() {
  const own = path.join(__dirname, 'engine');
  if (fs.existsSync(path.join(own, 'docs-file.js'))) return own;
  const repo = process.env.MXSCOUT_DIR ? path.join(process.env.MXSCOUT_DIR, 'public') : null;
  if (repo && fs.existsSync(path.join(repo, 'docs-file.js'))) return repo;
  if (process.env.MXSCOUT_DIR) fail('The engine is missing: no engine/ beside docs.js, and MXSCOUT_DIR (' + process.env.MXSCOUT_DIR + ') has no public/docs-file.js — point it at an MxScout repository.');
  fail('The engine is missing: no engine/ beside docs.js. Reinstall the skill (pack-skill.js), or — running it from its source — set MXSCOUT_DIR to an MxScout repository.');
}

// Every file this writes, checked first: never inside the project's folder (the .mpr's, links followed —
// it is somebody's working copy under version control), and a failed write said as one.
let projectDir = null, projectIsMxScout = false;
function realOrSelf(p) { try { return fs.realpathSync(p); } catch (e) { return path.resolve(p); } }
// A file already there is followed to where it really is (a link into the project counts as the project).
function insideProject(full) {
  const target = fs.existsSync(full) ? realOrSelf(full) : path.join(realOrSelf(path.dirname(full)), path.basename(full));
  return !!(projectDir && (target === projectDir || target.startsWith(projectDir + path.sep))) ||
    !!wp().refusedWrite(full, wp().protectedRoots(starts.concat([path.dirname(full)])), false);
}
// → the full path written: a name without a path, in the work folder.
function writeOut(file, text) {
  const full = wp().inWork(file, workDir(), false);
  if (insideProject(full)) {
    fail('Refusing to write ' + full + ': it is inside the ' + (projectIsMxScout ? 'MxScout project folder, whose files are MxScout\'s' : 'Mendix project') + ' (' + (projectDir || path.dirname(full)) + '), which holds only the documentation. Keep working files in the work folder — name them without a path, or see node docs.js workdir' + (projectIsMxScout ? '; results go to MxScout with `node docs.js send`.' : '.'));
  }
  // The work folder is made when first written to; a folder named in full must be there already.
  try { if (full.startsWith(workDir() + path.sep)) fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text); } catch (e) { fail('Could not write ' + full + ': ' + ((e && e.message) || e)); }
  return full;
}

// ---------- the work folder: mendix-describe's rule (its check-descriptions.js, packed beside this file) ----------
let W = null, starts = [process.cwd()], workAt = null;
function wp() { return W || (W = workplace()); }
function workplace() {
  const at = [path.join(__dirname, 'check-descriptions.js'), process.env.MXSCOUT_DIR ? path.join(process.env.MXSCOUT_DIR, 'skills', 'mendix-describe', 'check-descriptions.js') : null];
  for (const f of at) { if (f && fs.existsSync(f)) { const w = require(f).workplace; if (w) return w; } }
  fail('check-descriptions.js, with the work folder in it, is missing beside docs.js: reinstall the skill (pack-skill.js) from an MxScout of 1.14.3 or later.');
}
function workDir(make) {
  if (!workAt) {
    workAt = wp().workFolder(starts);
    if (wp().refusedWrite(path.join(workAt, 'x'), wp().protectedRoots(starts.concat([workAt])), false)) fail('The work folder ' + workAt + ' is inside the project — set MXSCOUT_WORK to a folder outside it.');
  }
  if (make) { try { fs.mkdirSync(workAt, { recursive: true }); } catch (e) { fail('Cannot make the work folder ' + workAt + ': ' + ((e && e.message) || e)); } }
  return workAt;
}

// MxScout's browser files, each an IIFE that puts one object on window, run in a context of their own.
// The reader (docs-view.js) touches `document` only when it draws, so an empty one is enough to load it.
function engine() {
  const dir = engineDir();
  const ctx = { console, TextDecoder, TextEncoder, document: {}, crypto: require('crypto').webcrypto, Blob, Response, DecompressionStream, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  ENGINE_FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  ctx.dir = dir;
  return ctx;
}

// An MxScout project folder: project.json that says so, and a model.json beside it.
function mxscoutFolder(p) {
  try {
    if (!p || !fs.statSync(p).isDirectory()) return null;
    const pj = JSON.parse(fs.readFileSync(path.join(p, 'project.json'), 'utf8'));
    if (!pj || pj.format !== 'mxscout-project') return null;
    if (pj.layout > 1) fail(p + ' was written by a newer MxScout (layout ' + pj.layout + '); update the skill.');
    return { dir: p, project: pj };
  } catch (e) { return null; }
}
function readFolderModel(f) {
  const file = path.join(f.dir, 'model.json');
  if (!fs.existsSync(file)) fail('No model.json in ' + f.dir + ' — open the project in MxScout once, keeping it in that folder.');
  let model;
  try { model = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(file + ' is not valid JSON.'); }
  if (!model || !Array.isArray(model.modules) || !Array.isArray(model.entities)) fail(file + ' is not a Mendix model as MxScout writes it.');
  return model;
}

function findMpr(p) {
  if (!p) fail('Name the project: the .mpr file, or the folder that holds it.');
  let st;
  try { st = fs.statSync(p); } catch (e) { fail('Not found: ' + p); }
  if (st.isFile()) return p;
  const list = fs.readdirSync(p).filter((f) => /\.mpr$/i.test(f));
  if (list.length !== 1) fail(list.length ? 'More than one .mpr in ' + p + ' — name the one you mean.' : 'No .mpr in ' + p + '.');
  return path.join(p, list[0]);
}

async function readModel(E, mprPath) {
  const buf = fs.readFileSync(mprPath);
  const contents = path.join(path.dirname(mprPath), 'mprcontents');
  let asked = 0, found = 0;
  const model = await E.MxMpr.buildModel({
    mprBytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
    appName: path.basename(mprPath).replace(/\.mpr$/i, ''),
    // Mendix 10+ (MPR v2): each document in its own file under mprcontents/; the engine asks for each by its path.
    readContentsFile: (rel) => {
      asked++;
      const f = path.join(contents, rel);
      if (!f.startsWith(contents + path.sep)) return null;
      try { const b = fs.readFileSync(f); found++; return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } catch (e) { return null; }
    }
  });
  // A Mendix 10+ project keeps its documents in mprcontents/ beside the .mpr. Copied without that
  // folder, the .mpr alone reads as an empty model — say so rather than build an empty report.
  if (asked && !found) {
    fail(fs.existsSync(contents)
      ? 'The .mpr names ' + asked + ' documents in mprcontents/, and none of them could be read. Copy the whole project folder again.'
      : 'This is a Mendix 10+ project: its documents are in the mprcontents/ folder beside ' + path.basename(mprPath) + ', which is not there. Copy the .mpr together with mprcontents/.');
  }
  return model;
}

// The pack's own index, as the agent channel reads it (server/routes/agent.js parseIndex).
function indexOf(lines) {
  const at = lines.indexOf('## index');
  if (at < 0) return [];
  const out = [];
  for (let i = at + 2; i < lines.length && lines[i].trim() !== ''; i++) {
    const m = /^(.+?) \| (\d+)-(\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+)$/.exec(lines[i]);
    if (m) out.push({ name: m[1], from: Number(m[2]), to: Number(m[3]), microflows: m[4], nanoflows: m[5], pages: m[6], entities: m[7] });
  }
  return out;
}


// ---------- repo: mxscout/docs/ inside the Mendix project, as MxScout writes it (public/repodocs.js) ----------
// The model from the .mpr, its version from the project's .git (modelversion.js, as the browser reads it: plain
// files), the descriptions joined from mxscout/descriptions/ with the commit mxscout.json says they describe, the
// solved cases from mxscout/knowledge/ — and docs/ written only when what it is made from is not what its
// manifest names; a file only when its text changed; one the manifest listed that is not made any more, removed.
function gitSource(repoDir) {
  const git = path.join(repoDir, '.git');
  let st = null;
  try { st = fs.statSync(git); } catch (e) { return null; }
  if (st.isFile()) return { kind: 'file' };
  const read = (p) => { try { return fs.readFileSync(path.join(git, p)); } catch (e) { return null; } };
  return { kind: 'dir',
    text: (p, tail) => { const b = read(p); return Promise.resolve(b === null ? null : (tail && b.length > tail ? b.subarray(b.length - tail) : b).toString('utf8')); },
    bytes: (p) => { const b = read(p); return Promise.resolve(b === null ? null : new Uint8Array(b)); } };
}
function filesUnder(dir, rel, re) {
  const out = [];
  (function walk(d, at) {
    let list = [];
    try { list = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    list.forEach((n) => {
      if (n.name[0] === '.') return;
      if (n.isDirectory()) { if (re.deep) walk(path.join(d, n.name), at + n.name + '/'); }
      else if (re.test(n.name)) out.push({ path: rel + at + n.name, text: fs.readFileSync(path.join(d, n.name), 'utf8') });
    });
  })(dir, '');
  return out.sort((a, b) => (a.path < b.path ? -1 : 1));
}
async function repoDocs(E, where) {
  const repoDir = path.resolve(where);
  const mx = path.join(repoDir, 'mxscout');
  let pj = null;
  try { pj = JSON.parse(fs.readFileSync(path.join(mx, 'mxscout.json'), 'utf8')); } catch (e) { pj = null; }
  if (!pj || pj.format !== 'mxscout-project' || pj.layout !== 2) fail(repoDir + ' is not a Mendix project with MxScout\'s files in mxscout/ (no mxscout/mxscout.json with "layout": 2).');
  const R = E.MxRepoDocs;
  const jsonRe = /\.json$/i; jsonRe.deep = true;
  const parts = filesUnder(path.join(mx, 'descriptions'), 'descriptions/', jsonRe);
  const bad = parts.filter((p) => R.conflicted(p.text)).map((p) => p.path);
  if (bad.length) fail('mxscout/' + bad[0] + ' has a git conflict: resolve it first.');
  const joined = R.join(parts, pj.describedAt && pj.describedAt.commit ? pj.describedAt : null);
  if (joined.error) fail(joined.error);
  if (!joined.value) { console.log('No descriptions in mxscout/descriptions/: docs/ is made from them, so there is nothing to write.'); return; }
  const value = E.MxDescribe.parse(JSON.stringify(joined.value)).value;
  const cases = filesUnder(path.join(mx, 'knowledge'), 'knowledge/', /\.md$/i);
  const hash = await R.descriptionsHash(R.split(E.MxDescribe.toFile(value)).concat(R.casesOf(cases).map((c) => ({ path: c.path, text: c.text }))), value.describedAt);
  let man = null, manText = null;
  try { manText = fs.readFileSync(path.join(mx, 'docs', 'manifest.json'), 'utf8'); man = JSON.parse(manText); } catch (e) { man = null; }
  if (man && man.descriptions === hash) { console.log('docs/ is current — made from these descriptions and solved cases already; nothing written.'); return; }
  const mprs = fs.readdirSync(repoDir).filter((f) => /\.mpr$/i.test(f));
  if (mprs.length !== 1) fail(mprs.length ? 'More than one .mpr in ' + repoDir + '.' : 'No .mpr in ' + repoDir + '.');
  const model = await readModel(E, path.join(repoDir, mprs[0]));
  model.version = await E.MxModelVersion.readGit(gitSource(repoDir), path.basename(repoDir));
  const data = E.MxDocsData.build(model, { id: pj.id, name: pj.name });
  E.MxDescribe.attach(data, value);
  const own = {};
  data.modules.forEach((m) => { own[m.name] = !m.marketplace; });
  const files = await R.docsFiles(E.MxDocsFile.withDerived(E.MxDocsFile.subset(data, own)), { id: pj.id, app: pj.name, describedAt: value.describedAt || null, descriptions: hash, cases: cases });
  let had = man && Array.isArray(man.files) ? man.files.map((f) => String(f.path || '')) : [];
  if (manText !== null && !man) { const mdRe = /\.md$/i; mdRe.deep = true; had = had.concat(filesUnder(path.join(mx, 'docs'), 'docs/', mdRe).map((f) => f.path)); }
  had = had.filter((p, i, all) => /^docs\/[^/.][^\u0000]*\.(md|json)$/.test(p) && p.indexOf('..') === -1 && all.indexOf(p) === i);
  const now = {};
  let wrote = 0;
  files.forEach((f) => {
    now[f.path] = true;
    // Only ever under mxscout/docs/: the one place this writes inside the Mendix project.
    const full = path.join(mx, f.path);
    if (!/^docs\//.test(f.path) || !full.startsWith(path.join(mx, 'docs') + path.sep)) fail('Refusing to write ' + f.path + ': only mxscout/docs/ is written.');
    let was = null;
    try { was = fs.readFileSync(full, 'utf8'); } catch (e) { was = null; }
    if (was !== f.text) {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      const tmp = path.join(path.dirname(full), '.' + path.basename(full) + '.tmp');
      fs.writeFileSync(tmp, f.text);
      fs.renameSync(tmp, full);
      wrote++;
    }
  });
  const gone = had.filter((p) => !now[p]);
  gone.forEach((p) => { try { fs.unlinkSync(path.join(mx, p)); } catch (e) { /* gone already */ } });
  console.log('docs/ written: ' + wrote + ' of ' + files.length + ' file(s) changed' + (gone.length ? ', ' + gone.length + ' removed' : '') + ' — the same files MxScout writes. Commit mxscout/ with it (this never runs git).');
}

const args = process.argv.slice(2);
function take(name, what) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1];
  if (v === undefined || /^--/.test(v)) fail(name + ' needs ' + what + ' after it.');
  args.splice(i, 2);
  return v;
}
function flag(name) { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; }

(async function () {
  const out = take('--out', 'a file name'), only = take('--modules', 'module names, comma-separated'), all = flag('--all');
  const modelDir = take('--model', 'an MxScout project folder');
  if (modelDir) args.splice(1, 0, modelDir);
  const [cmd, where] = args;
  let arg = args[2];
  starts = [where ? path.resolve(where) : null, process.cwd()];
  if (cmd === 'workdir') { console.log(workDir(true)); return; }
  // A file the person or the agent names without a path — descriptions.json, a part — is in the work folder.
  if (arg && (cmd === 'send' || cmd === 'report' || cmd === 'docs')) arg = wp().inWork(arg, workDir(), true);
  if (cmd === 'repo') {
    if (!where) fail('Name the Mendix project: node docs.js repo <MendixProject> (the folder with the .mpr and mxscout/).');
    await repoDocs(engine(), where);
    return;
  }
  if (!/^(status|module|pack|report|docs|send)$/.test(cmd || '')) {
    console.error('Usage: node docs.js workdir [<app.mpr>] | status <app.mpr> | module <app.mpr> <Name> [--out f] | pack <app.mpr> <file> | report <app.mpr> [descriptions.json] [--out f.html] [--modules A,B] [--all] | docs <app.mpr> [descriptions.json] [--out docs.md] | send <MxScout folder> <descriptions.json> | repo <MendixProject>   (<app.mpr> may be an MxScout project folder, or --model <folder>)');
    process.exit(2);
  }
  const folder = mxscoutFolder(where);
  if (modelDir && !folder) fail(modelDir + ' is not an MxScout project folder (no project.json that says "format": "mxscout-project").');

  // ---- send: into an MxScout project folder's inbox/, whole ----
  if (cmd === 'send') {
    if (!folder) fail('send writes into an MxScout project folder\'s inbox/: name the folder (the one with project.json and inbox/).');
    if (!arg) fail('Name the descriptions file: node docs.js send <folder> descriptions.json.');
    let body;
    try { body = fs.readFileSync(arg, 'utf8'); } catch (e) { fail('Cannot read ' + arg + '.'); }
    let json;
    try { json = JSON.parse(body); } catch (e) { fail('Cannot read ' + arg + ' as JSON.'); }
    if (!json || json.format !== 'mxscout-descriptions') fail(arg + ' is not a descriptions file (it should say "format": "mxscout-descriptions").');
    const ib = path.join(folder.dir, 'inbox');
    fs.mkdirSync(ib, { recursive: true });
    const name = new Date().toISOString().replace(/[:.]/g, '-') + '-' + (path.basename(arg).replace(/\.json$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60) || 'descriptions') + '.json';
    const tmp = path.join(ib, '.' + name + '.tmp');
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, path.join(ib, name));
    console.log('Written to ' + path.join(ib, name) + '. MxScout takes it while the project is open in it — or the next time it is opened — saved with Undo; a whole file that would replace the descriptions kept waits for Import them.');
    return;
  }
  if (cmd === 'module' && !arg) fail('Name the module: node docs.js module <app.mpr> <Name>. `status` lists them.');
  if (cmd === 'pack' && !arg) fail('Name the file to write the pack to: node docs.js pack <app.mpr> <file>.');
  const named = only === null ? null : only.split(',').map((s) => s.trim()).filter(Boolean);
  if (named && !named.length) fail('--modules names no module: give their names, comma-separated (`status` lists them).');
  const E = engine();
  let model, mpr = null;
  if (folder) {
    // The model MxScout read from the .mpr and keeps in the folder: no .mpr needed, and nothing is
    // written into the folder (its files are MxScout's) — `send` aside, into inbox/.
    projectDir = realOrSelf(path.resolve(folder.dir));
    projectIsMxScout = true;
    model = readFolderModel(folder);
    // Its descriptions, when none are named: what MxScout keeps for the project.
    if (!arg && (cmd === 'report' || cmd === 'docs') && fs.existsSync(path.join(folder.dir, 'descriptions.json'))) arg = path.join(folder.dir, 'descriptions.json');
  } else {
    mpr = findMpr(where);
    projectDir = realOrSelf(path.dirname(path.resolve(mpr)));
    model = await readModel(E, mpr);
  }
  const data = E.MxDocsData.build(model, folder ? { id: folder.project.id, name: folder.project.name } : null);

  if (cmd === 'status' || cmd === 'module' || cmd === 'pack') {
    const text = E.MxDescribe.pack(data).text;
    const lines = text.split('\n');
    if (cmd === 'pack') {
      const f = writeOut(arg, text);
      console.log('Wrote ' + f + ' — for the checker, not for reading whole.');
      return;
    }
    const mods = indexOf(lines);
    if (cmd === 'status') {
      console.log('project: ' + data.project + (model.meta && model.meta.mendixVersion ? ' (Mendix ' + model.meta.mendixVersion + ')' : ''));
      console.log('read: ' + (mpr || path.join(folder.dir, 'model.json') + ' (an MxScout project folder)'));
      if (folder) console.log('language: ' + (folder.project.contentLanguage ? folder.project.contentLanguage + ' — write everything in it; do not ask again' : 'not set yet — ask the person once "In which language should I write? (default: English)"'));
      console.log('module | microflows | nanoflows | pages | entities');
      mods.forEach((m) => console.log(m.name + ' | ' + m.microflows + ' | ' + m.nanoflows + ' | ' + m.pages + ' | ' + m.entities));
      const market = data.modules.filter((m) => m.marketplace).length;
      if (market) console.log('(' + market + ' Marketplace modules left out of the pack; the report leaves them out unless --all)');
      console.log('work folder: ' + workDir() + ' — the pack, the parts, descriptions.json and your notes go here, never into the project');
      return;
    }
    const mod = mods.find((m) => m.name === arg);
    if (!mod) fail('No module ' + arg + ' in the pack. `status` lists them.');
    const section = lines.slice(mod.from - 1, mod.to).join('\n') + '\n';
    if (out) { const f = writeOut(out, section); console.log('Wrote ' + f + ' (' + section.split('\n').length + ' lines).'); } else process.stdout.write(section);
    return;
  }

  // ---- the descriptions, for report and docs ----
  let note = 'without descriptions';
  if (arg) {
    let text;
    try { text = fs.readFileSync(arg, 'utf8'); } catch (e) { fail('Cannot read ' + arg + '.'); }
    // Read by MxScout's own parser, as an import: only what it understands is kept, as text.
    const parsed = E.MxDescribe.parse(text);
    if (parsed.error) fail(arg + ': ' + parsed.error);
    const st = E.MxDescribe.attach(data, parsed.value);
    note = st.described + ' flows described' + (st.stale ? ', ' + st.stale + ' out of date' : '') + (st.missing ? ', ' + st.missing + ' not yet' : '');
  } else E.MxDescribe.attach(data, null);

  // ---- docs: the Markdown MxScout gives an agent, built by the same function (docs-file.js forAgent) ----
  if (cmd === 'docs') {
    const lang = folder && folder.project.contentLanguage ? E.MxDescribe.languageName(folder.project.contentLanguage) : undefined;
    const made = E.MxDocsFile.forAgent(E.MxDocsFile.withDerived(data), folder ? { language: lang || null } : undefined);
    if (!made) { console.log('No documentation yet: no descriptions.json was given, so nothing has been understood before. Read the pack by module.'); return; }
    if (out) { const f = writeOut(out, made.text); console.log('Wrote ' + f + ' (' + made.text.split('\n').length + ' lines) — ' + note + '. What an agent understood earlier; verify against the pack.'); }
    else process.stdout.write(made.text);
    return;
  }

  // ---- report: the file MxScout's "Export documentation" writes ----
  const keep = {};
  data.modules.forEach((m) => { keep[m.name] = named ? named.indexOf(m.name) !== -1 : all || !m.marketplace; });
  if (named) named.forEach((n) => { if (!keep[n]) fail('No module ' + n + ' in this project.'); });
  const F = E.MxDocsFile;
  const doc = F.withDerived(F.subset(data, keep));
  let css = F.SHEETS.map((f) => fs.readFileSync(path.join(E.dir, f), 'utf8'));
  F.fontsIn(css[0]).forEach((u) => {
    const b = fs.readFileSync(path.join(E.dir, F.fontPath(u)));
    css[0] = css[0].replace(u, 'url("data:font/woff2;base64,' + b.toString('base64') + '")');
  });
  const scripts = F.SCRIPTS.map((f) => fs.readFileSync(path.join(E.dir, f), 'utf8'));
  // The page in the language the descriptions are written in (docs-file.js keeps English when it is no language tag).
  const html = F.build(doc, css.join('\n'), doc.project, scripts, (doc.ai && doc.ai.language) || undefined);
  // Where it always went — --out, or its default name in the current folder — unless that is inside the project:
  // then into the work folder, said plainly.
  let file = path.resolve(out || F.fileName(doc));
  const moved = insideProject(file);
  if (moved) file = path.join(workDir(), path.basename(file));
  const wrote = writeOut(file, html);
  console.log('Wrote ' + wrote + ' — ' + doc.modules.length + ' modules, ' + note + '. Open it in a browser; it needs nothing else.');
  if (moved) console.log('(Not into the project, where ' + (out ? '--out' : 'its default name') + ' would have put it: the project holds only the documentation. It is in the work folder; move it where the person wants it.)');
})().catch((e) => fail('Could not read the project: ' + ((e && e.message) || e)));
