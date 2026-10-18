#!/usr/bin/env node
/* MxScout's security checks, from the command line. No dependencies — Node only.
 *
 *   node check-security.js [<app.mpr | Mendix project directory | MxScout project folder>] [--json | --md] [--out <file>]
 *
 * Reads the model the way MxScout reads it — the .mpr (and mprcontents/ beside it, Mendix 10 and 11) with
 * MxScout's own engine (engine/, the files MxScout runs in the browser, unchanged), or model.json in a
 * project folder MxScout keeps — and runs the checks MxScout's Security screen runs (engine/secrisks.js):
 * the anonymous role (Mendix's MXS003–MXS010), self-registration, user accounts, what a page hides and the
 * microflow behind it does not check, writes wider than the pages, entity access against what uses it,
 * constants the browser receives, known advisories, and the project's own security settings.
 *
 * Every finding is a risk with a fixed id ('mx-' + the check + what it is about): the same model gives the
 * same ids, every time, here and in MxScout. FINDING → P1 or P2, WORTH KNOWING → P3 ("Worth knowing: …").
 *
 *   --md (the default)  a summary to read: the counts, the findings, what is worth knowing, what was not checked
 *   --json              the risks as a part of the descriptions ("add": true, descriptions-format.md), to hand to
 *                       MxScout with `node agent.js send <file>` or to merge with check-descriptions.js merge.
 *                       With the project's triage.json (what was decided about the risks) and its descriptions,
 *                       each of these risks marked fixed — or still counted — that the model no longer shows gets
 *                       a "verify" entry: { "id", "still": false, "why": "not seen in the model" }; MxScout marks
 *                       the first verified and stops counting the second.
 *   --out <file>        write it to a file instead — a name without a path goes in the work folder (node agent.js
 *                       workdir); nothing is written inside the Mendix project or the project folder.
 *
 * Without a path it looks where it runs, and above: a project folder (project.json), mxscout/ in a Mendix
 * project, or a Mendix project's .mpr. Exit code 0 whatever it finds; 1 when the model cannot be read.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ENGINE = ['sqlite.js', 'bson.js', 'mpr.js', 'anonrole.js', 'accessuse.js', 'accounts.js', 'guards.js', 'editscope.js', 'selfreg.js', 'constants.js', 'advisories.js', 'accessrule.js', 'secrisks.js'];

function fail(message) { console.error(String(message).split('\n')[0]); process.exit(1); }

function engine() {
  const dir = path.join(__dirname, 'engine');
  if (!fs.existsSync(path.join(dir, 'secrisks.js'))) fail('This copy of the skill has no engine/secrisks.js: reinstall the skill.');
  const vm = require('vm');
  const ctx = { console, TextDecoder, TextEncoder, document: {}, crypto: require('crypto').webcrypto, Blob, Response, DecompressionStream, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  ENGINE.forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } }
function projectAt(file) { const p = readJson(file); return p && p.format === 'mxscout-project' ? p : null; }
function mprIn(dir) {
  let list = [];
  try { list = fs.readdirSync(dir).filter((f) => /\.mpr$/i.test(f)); } catch (e) { return null; }
  if (list.length > 1) fail('More than one .mpr in ' + dir + ' — name the one to read.');
  return list.length ? path.join(dir, list[0]) : null;
}

// Where the model is and what goes with it: { mpr | modelJson, triage, kept, project } — triage: what was decided
// about the risks (triage.json); kept: the risks the descriptions hold now.
function locate(given) {
  const start = path.resolve((given || process.cwd()).replace(/^~(?=$|\/)/, process.env.HOME || '~'));
  if (/\.mpr$/i.test(start)) {
    if (!fs.existsSync(start)) fail('No such file: ' + start);
    const dir = path.dirname(start);
    const mx = projectAt(path.join(dir, 'mxscout', 'mxscout.json'));
    return { mpr: start, triage: mx ? path.join(dir, 'mxscout', 'triage.json') : null, kept: mx ? path.join(dir, 'mxscout', 'descriptions', 'risks.json') : null, project: mx };
  }
  if (!fs.existsSync(start) || !fs.statSync(start).isDirectory()) fail('Not a .mpr or a folder: ' + start);
  let dir = start;
  for (let i = 0; i < 8; i++) {
    let p;
    // A project folder MxScout keeps (layout 1): model.json, triage.json beside it.
    if ((p = projectAt(path.join(dir, 'project.json'))) && p.part !== 'local' && fs.existsSync(path.join(dir, 'model.json'))) return { modelJson: path.join(dir, 'model.json'), triage: path.join(dir, 'triage.json'), kept: path.join(dir, 'descriptions.json'), project: p };
    // mxscout/ inside a Mendix project: the .mpr is beside it.
    if ((p = projectAt(path.join(dir, 'mxscout.json')))) { const m = mprIn(path.dirname(dir)); if (m) return { mpr: m, triage: path.join(dir, 'triage.json'), kept: path.join(dir, 'descriptions', 'risks.json'), project: p }; }
    const m = mprIn(dir);
    if (m) { const mx = projectAt(path.join(dir, 'mxscout', 'mxscout.json')); return { mpr: m, triage: mx ? path.join(dir, 'mxscout', 'triage.json') : null, kept: mx ? path.join(dir, 'mxscout', 'descriptions', 'risks.json') : null, project: mx }; }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  fail('No model here: give a .mpr, a Mendix project directory, or a project folder MxScout keeps (with project.json and model.json).');
}

async function readModel(E, at) {
  if (at.modelJson) {
    const m = readJson(at.modelJson);
    if (!m || typeof m !== 'object') fail('Cannot read ' + at.modelJson);
    return m;
  }
  const buf = fs.readFileSync(at.mpr);
  const contents = path.join(path.dirname(at.mpr), 'mprcontents');
  let asked = 0, found = 0;
  const model = await E.MxMpr.buildModel({
    mprBytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), appName: path.basename(at.mpr).replace(/\.mpr$/i, ''),
    readContentsFile: (rel) => {
      asked++;
      const f = path.join(contents, rel);
      if (!f.startsWith(contents + path.sep)) return null;
      try { const b = fs.readFileSync(f); found++; return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } catch (e) { return null; }
    }
  });
  if (asked && !found) fail('The .mpr names ' + asked + ' documents in mprcontents/ and none of them could be read.');
  return model;
}

function markdown(res, part, at, decided) {
  const c = res.counts, L = [];
  const from = at.mpr ? at.mpr : at.modelJson;
  L.push('# Security check' + (at.project && at.project.name ? ' — ' + at.project.name : ''));
  L.push('');
  L.push('Model: ' + from + '. Checked by MxScout\'s engine (engine/secrisks.js), the checks the Security screen runs.');
  L.push('');
  L.push(c.risks + ' risks: ' + c.P1 + ' P1, ' + c.P2 + ' P2, ' + c.P3 + ' P3 — ' + c.findings + ' findings, ' + c.notes + ' worth knowing. ' + res.notChecked.length + ' not checked.');
  L.push('');
  L.push('| check | risks |');
  L.push('|---|---|');
  Object.keys(c.byCheck).forEach((k) => L.push('| ' + k + ' | ' + c.byCheck[k] + ' |'));
  const status = {};
  Object.keys((decided && decided.risks) || {}).forEach((k) => { const e = decided.risks[k]; const id = E_idOf(e); if (id) status[id] = e.status; });
  ['P1', 'P2'].forEach((lv) => {
    const list = res.risks.filter((r) => r.level === lv);
    if (!list.length) return;
    L.push('');
    L.push('## ' + lv);
    list.forEach((r) => {
      L.push('- ' + r.id + (status[r.id] ? ' [' + status[r.id] + ']' : '') + ' — ' + r.title + (r.where.length ? ' (' + r.where.slice(0, 4).join(', ') + (r.where.length > 4 ? ', …' : '') + ')' : ''));
      if (r.fix) L.push('  Fix: ' + r.fix);
    });
  });
  const p3 = res.risks.filter((r) => r.level === 'P3');
  if (p3.length) { L.push(''); L.push('## P3 — worth knowing'); p3.forEach((r) => L.push('- ' + r.id + (status[r.id] ? ' [' + status[r.id] + ']' : '') + ' — ' + r.title.replace(/^Worth knowing: /, ''))); }
  const still = res.risks.filter((r) => status[r.id] === 'fixed');
  if (still.length || (part.verify || []).length) {
    L.push(''); L.push('## Marked fixed');
    still.forEach((r) => L.push('- ' + r.id + ' — still in the model: MxScout reopens it when this is handed in.'));
    (part.verify || []).forEach((v) => L.push('- ' + v.id + ' — ' + v.why + (status[v.id] === 'fixed' ? ': MxScout marks it verified.' : ': MxScout stops counting it.')));
  }
  if (res.notChecked.length) { L.push(''); L.push('## Not checked'); res.notChecked.forEach((n) => L.push('- ' + n.text)); }
  L.push('');
  return L.join('\n');
}
let E_idOf = () => null;

(async function main() {
  const args = process.argv.slice(2);
  const take = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v === undefined ? null : v; };
  const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
  const asJson = flag('--json'); flag('--md');
  const out = take('--out');
  if (args.some((a) => /^--/.test(a))) fail('Usage: node check-security.js [<app.mpr | Mendix project | MxScout project folder>] [--json | --md] [--out <file>]');
  const at = locate(args[0]);
  const E = engine();
  E_idOf = E.MxSecRisks.idOf;
  let model;
  try { model = await readModel(E, at); } catch (e) { fail('Cannot read the model: ' + ((e && e.message) || e)); }
  const tj = at.triage ? readJson(at.triage) : null;
  const decided = tj && tj.format === 'mxscout-triage' && tj.triage ? tj.triage : null;
  // The risks the descriptions hold now: descriptions.json in a project folder, descriptions/risks.json in mxscout/.
  const k = at.kept ? readJson(at.kept) : null;
  const kept = Array.isArray(k) ? k : k && Array.isArray(k.risks) ? k.risks : null;
  const res = E.MxSecRisks.of(model);
  const part = E.MxSecRisks.part(model, { decided, kept, project: at.project && at.project.name ? at.project.name : undefined, written: new Date().toISOString().slice(0, 10) });
  const text = asJson ? JSON.stringify(part, null, 2) + '\n' : markdown(res, part, at, decided);
  if (!out) { process.stdout.write(text); return; }
  // The work folder and the clean Mendix project: check-descriptions.js's rule, shared with agent.js.
  const W = require('./check-descriptions.js').workplace;
  const starts = [at.mpr ? path.dirname(at.mpr) : path.dirname(at.modelJson), process.cwd()];
  const file = W.inWork(out, W.workFolder(starts, at.project && at.project.name), false);
  const refused = W.refusedWrite(file, W.protectedRoots(starts.concat([path.dirname(file)])), false);
  if (refused) fail(refused);
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); } catch (e) { fail('Cannot write ' + file + ': ' + ((e && e.message) || e)); }
  console.log('Wrote ' + file + ' — ' + res.counts.risks + ' risks (' + res.counts.P1 + ' P1, ' + res.counts.P2 + ' P2, ' + res.counts.P3 + ' P3)' + (part.verify ? ', ' + part.verify.length + ' no longer seen in the model' : '') + '.');
})().catch((e) => fail((e && e.message) || e));
