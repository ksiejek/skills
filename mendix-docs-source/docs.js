#!/usr/bin/env node
/* The mendix-docs skill's reader and report builder. No dependencies — Node only.
 *
 * mendix-describe works with a running MxScout: MxScout reads the model and writes the AI pack, the
 * agent writes the descriptions, MxScout shows them. mendix-docs does the same work with no MxScout
 * running (Karol, 2026-10-14: "exactly the same skill, except that it builds the report itself"):
 * this reads the .mpr with MxScout's own engine — the same files MxScout runs in the browser, loaded
 * here unchanged — and builds the same documentation file MxScout exports.
 *
 *   node docs.js status <app.mpr>                         the application and its modules, with counts
 *   node docs.js module <app.mpr> <Name> [--out f]        one module's section of the pack
 *   node docs.js pack <app.mpr> <file>                    the whole pack, to a FILE — for check-descriptions.js
 *   node docs.js report <app.mpr> [descriptions.json]     the documentation, one HTML file
 *        [--out file.html] [--modules A,B] [--all]        (own modules unless --modules or --all)
 *
 * <app.mpr> is the project's .mpr, or the folder that holds it. A Mendix 10+ project keeps its
 * documents in mprcontents/ beside the .mpr; that is read too, nothing else. Nothing is written into
 * the project: only the files named on the command line, wherever they are.
 *
 * The engine: engine/ beside this file in an installed skill, or public/ of the MxScout repository
 * named by MXSCOUT_DIR when run from the source — the same files either way (pack-skill.js copies them).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ENGINE_FILES = ['sqlite.js', 'bson.js', 'mpr.js', 'docs-data.js', 'describe.js', 'reportdata.js', 'docs-changes.js', 'docs-view.js', 'docs-file.js'];

function fail(message) { console.error(message); process.exit(1); }

function engineDir() {
  const own = path.join(__dirname, 'engine');
  if (fs.existsSync(path.join(own, 'docs-file.js'))) return own;
  const repo = process.env.MXSCOUT_DIR ? path.join(process.env.MXSCOUT_DIR, 'public') : null;
  if (repo && fs.existsSync(path.join(repo, 'docs-file.js'))) return repo;
  fail('The engine is missing: no engine/ beside docs.js. Reinstall the skill.');
}

// MxScout's browser files, each an IIFE that puts one object on window, run in a context of their own.
// The reader (docs-view.js) touches `document` only when it draws, so an empty one is enough to load it.
function engine() {
  const dir = engineDir();
  const ctx = { console, TextDecoder, TextEncoder, document: {} };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  ENGINE_FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  ctx.dir = dir;
  return ctx;
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

const args = process.argv.slice(2);
function take(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1];
  args.splice(i, 2);
  return v === undefined ? null : v;
}
function flag(name) { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; }

(async function () {
  const out = take('--out'), only = take('--modules'), all = flag('--all');
  const [cmd, where, arg] = args;
  if (!/^(status|module|pack|report)$/.test(cmd || '')) {
    console.error('Usage: node docs.js status <app.mpr> | module <app.mpr> <Name> [--out f] | pack <app.mpr> <file> | report <app.mpr> [descriptions.json] [--out f.html] [--modules A,B] [--all]');
    process.exit(2);
  }
  const E = engine();
  const mpr = findMpr(where);
  const model = await readModel(E, mpr);
  const data = E.MxDocsData.build(model, null);

  if (cmd === 'status' || cmd === 'module' || cmd === 'pack') {
    const text = E.MxDescribe.pack(data).text;
    const lines = text.split('\n');
    if (cmd === 'pack') {
      if (!arg) fail('Name the file to write the pack to.');
      fs.writeFileSync(arg, text);
      console.log('Wrote ' + arg + ' — for the checker, not for reading whole.');
      return;
    }
    const mods = indexOf(lines);
    if (cmd === 'status') {
      console.log('project: ' + data.project + (model.meta && model.meta.mendixVersion ? ' (Mendix ' + model.meta.mendixVersion + ')' : ''));
      console.log('read: ' + mpr);
      console.log('module | microflows | nanoflows | pages | entities');
      mods.forEach((m) => console.log(m.name + ' | ' + m.microflows + ' | ' + m.nanoflows + ' | ' + m.pages + ' | ' + m.entities));
      const market = data.modules.filter((m) => m.marketplace).length;
      if (market) console.log('(' + market + ' Marketplace modules left out of the pack; the report leaves them out unless --all)');
      return;
    }
    const mod = mods.find((m) => m.name === arg);
    if (!mod) fail('No module ' + arg + ' in the pack. `status` lists them.');
    const section = lines.slice(mod.from - 1, mod.to).join('\n') + '\n';
    if (out) { fs.writeFileSync(out, section); console.log('Wrote ' + out + ' (' + section.split('\n').length + ' lines).'); } else process.stdout.write(section);
    return;
  }

  // ---- report: the file MxScout's "Export documentation" writes ----
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
  const keep = {};
  const named = only ? only.split(',').map((s) => s.trim()).filter(Boolean) : null;
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
  const html = F.build(doc, css.join('\n'), doc.project, scripts);
  const file = out || F.fileName(doc);
  fs.writeFileSync(file, html);
  console.log('Wrote ' + file + ' — ' + doc.modules.length + ' modules, ' + note + '. Open it in a browser; it needs nothing else.');
})().catch((e) => fail('Could not read the project: ' + ((e && e.message) || e)));
