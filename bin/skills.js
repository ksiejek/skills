#!/usr/bin/env node
/* Skills — keeps the copies of the skills that other projects carry (MxScout ships its skills, Tandem's code reads
 * its own) equal to their one source here. skills.tsv names them: an "active" row is the source (a folder of this
 * repository), a "copy" row is a folder in another project that this script writes.
 *
 *   node bin/skills.js check              every copy: ok, behind (the source changed), edited (someone changed the copy)
 *   node bin/skills.js publish [names…]   writes the sources over their copies; refuses a copy edited since the last
 *                                         publish (bring the edit here first with pull, or --force to throw it away)
 *   node bin/skills.js pull <name>        takes an edited copy's files back into the source (then publish)
 *
 * Generated parts come from their own home first: mendix-describe's engine/ is MxScout's shared core, refreshed from
 * MxScout's public/ (one file each, same name) before anything is compared or written; edit the engine in MxScout.
 * .published.json keeps, per copy, the hash of what was last written there, so an edit made in the copy is seen.
 * Folders in skills.tsv are relative to the folder holding this repository (~/Projects), or SKILLS_PROJECTS_DIR.
 * No dependencies: Node 18 or later.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HERE = path.resolve(__dirname, '..');
const PROJECTS = process.env.SKILLS_PROJECTS_DIR || path.dirname(HERE);
const MANIFEST = path.join(HERE, 'skills.tsv');
const STAMPS = path.join(HERE, '.published.json');
const SKIP = new Set(['.DS_Store', 'node_modules', '__pycache__', '.installed-by-mxscout']);
// Parts of a skill that live elsewhere: refreshed into the source from there, never edited here.
const GENERATED = { 'mendix-describe': { dir: 'engine', from: 'MxScout/public' } };

// skills.tsv → [{ name, status, dir, note }]
function manifest() {
  return fs.readFileSync(MANIFEST, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'))
    .filter(c => c.length >= 3 && c[0] !== 'name')
    .map(c => ({ name: c[0].trim(), status: c[1].trim(), dir: path.join(PROJECTS, c[2].trim()), note: String(c[3] || '').trim() }));
}
// Every file of a folder, relative and sorted, without the clutter in SKIP.
function files(dir) {
  const out = [];
  (function walk(d, rel) {
    let names = [];
    try { names = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    names.forEach(n => {
      if (SKIP.has(n.name)) return;
      const r = rel ? rel + '/' + n.name : n.name;
      if (n.isDirectory()) walk(path.join(d, n.name), r); else if (n.isFile()) out.push(r);
    });
  })(dir, '');
  return out.sort();
}
// One hash for a folder's files and their bytes; null when it does not exist.
function hashOf(dir) {
  if (!fs.existsSync(dir)) return null;
  const h = crypto.createHash('sha256');
  files(dir).forEach(f => { h.update(f + '\0'); h.update(fs.readFileSync(path.join(dir, f))); h.update('\0'); });
  return h.digest('hex');
}
function readStamps() { try { return JSON.parse(fs.readFileSync(STAMPS, 'utf8')); } catch (e) { return {}; } }
function writeStamps(s) { fs.writeFileSync(STAMPS, JSON.stringify(s, null, 2) + '\n'); }
function rel(dir) { return path.relative(PROJECTS, dir); }

// Brings a generated part of a source up to date from its home (MxScout's engine); → the files it changed.
function refreshGenerated(source, copies) {
  const g = GENERATED[source.name];
  if (!g) return [];
  const into = path.join(source.dir, g.dir), from = path.join(PROJECTS, g.from), changed = [];
  if (!fs.existsSync(from)) return [];
  const names = new Set(files(into).filter(f => !f.includes('/')));
  copies.forEach(c => files(path.join(c.dir, g.dir)).filter(f => !f.includes('/')).forEach(f => names.add(f)));
  fs.mkdirSync(into, { recursive: true });
  names.forEach(f => {
    const src = path.join(from, f), dst = path.join(into, f);
    if (!fs.existsSync(src)) return;
    const a = fs.readFileSync(src);
    if (!fs.existsSync(dst) || !a.equals(fs.readFileSync(dst))) { fs.writeFileSync(dst, a); changed.push(path.join(rel(into), f)); }
  });
  return changed;
}
// Makes dst hold exactly src's files (SKIP aside, and leaving what SKIP names alone in dst).
function mirror(src, dst) {
  const want = new Set(files(src));
  fs.mkdirSync(dst, { recursive: true });
  files(dst).filter(f => !want.has(f)).forEach(f => fs.unlinkSync(path.join(dst, f)));
  want.forEach(f => {
    const a = fs.readFileSync(path.join(src, f)), to = path.join(dst, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (!fs.existsSync(to) || !a.equals(fs.readFileSync(to))) fs.writeFileSync(to, a);
  });
  // folders left empty by the removals
  (function prune(d) {
    fs.readdirSync(d, { withFileTypes: true }).filter(n => n.isDirectory()).forEach(n => {
      const p = path.join(d, n.name); prune(p);
      if (!fs.readdirSync(p).length) fs.rmdirSync(p);
    });
  })(dst);
}

// Each copy with its source and its state: ok, behind, edited, missing, conflict (edited and the source changed too).
function states(only) {
  const rows = manifest(), stamps = readStamps();
  return rows.filter(r => r.status === 'copy' && (!only.length || only.includes(r.name))).map(c => {
    const source = rows.find(r => r.name === c.name && r.status === 'active');
    if (!source) return { copy: c, state: 'no-source' };
    const s = hashOf(source.dir), now = hashOf(c.dir), last = stamps[rel(c.dir)];
    const state = now === null ? 'missing' : now === s ? 'ok' : last && now !== last ? (s === last ? 'edited' : 'conflict') : 'behind';
    return { copy: c, source, state, now, s };
  });
}
const SAY = { ok: 'ok', behind: 'behind: the source changed, publish', edited: 'EDITED in the copy: pull it into the source',
  conflict: 'EDITED in the copy and changed in the source: pull, merge by hand, publish', missing: 'missing: publish', 'no-source': 'no active row for it' };

function main(argv) {
  const cmd = argv[0], force = argv.includes('--force'), names = argv.slice(1).filter(a => !a.startsWith('--'));
  const rows = manifest();
  if (cmd === 'check' || cmd === 'publish') {
    rows.filter(r => r.status === 'active' && GENERATED[r.name]).forEach(src => {
      const changed = refreshGenerated(src, rows.filter(r => r.status === 'copy' && r.name === src.name));
      changed.forEach(f => console.log('refreshed ' + f + ' from ' + GENERATED[src.name].from));
    });
  }
  if (cmd === 'check') {
    const list = states(names);
    list.forEach(x => console.log(x.state.padEnd(8) + ' ' + x.copy.name.padEnd(24) + ' ' + rel(x.copy.dir) + (x.state === 'ok' ? '' : '  — ' + SAY[x.state])));
    return list.every(x => x.state === 'ok') ? 0 : 1;
  }
  if (cmd === 'publish') {
    const stamps = readStamps();
    let refused = 0;
    states(names).forEach(x => {
      if (x.state === 'no-source') { console.log('skip     ' + x.copy.name + ': ' + SAY[x.state]); return; }
      if ((x.state === 'edited' || x.state === 'conflict') && !force) { refused++; console.log('REFUSED  ' + rel(x.copy.dir) + ' — ' + SAY[x.state]); return; }
      if (x.state !== 'ok') { mirror(x.source.dir, x.copy.dir); console.log('wrote    ' + rel(x.copy.dir) + ' <- ' + rel(x.source.dir)); }
      stamps[rel(x.copy.dir)] = hashOf(x.copy.dir);
    });
    writeStamps(stamps);
    if (refused) { console.log('\n' + refused + ' cop' + (refused === 1 ? 'y' : 'ies') + ' refused. node bin/skills.js pull <name>, then publish again.'); return 1; }
    console.log('\nDone. Commit here and in each project whose copy changed.');
    return 0;
  }
  if (cmd === 'pull' && names.length === 1) {
    const x = states(names).find(s => s.state === 'edited' || s.state === 'conflict');
    if (!x) { console.log('Nothing to pull: no copy of ' + names[0] + ' was edited.'); return 0; }
    const g = GENERATED[x.copy.name];
    // the generated part is not taken back: its home is elsewhere
    const keep = g ? path.join(x.source.dir, g.dir) : null, saved = keep && fs.existsSync(keep) ? files(keep).map(f => [f, fs.readFileSync(path.join(keep, f))]) : null;
    mirror(x.copy.dir, x.source.dir);
    if (saved) saved.forEach(([f, b]) => { fs.mkdirSync(path.dirname(path.join(keep, f)), { recursive: true }); fs.writeFileSync(path.join(keep, f), b); });
    console.log('pulled   ' + rel(x.copy.dir) + ' -> ' + rel(x.source.dir) + (x.state === 'conflict' ? '  (the source had changed too: check git diff here)' : '') +
      '\nReview with git diff, then: node bin/skills.js publish ' + x.copy.name);
    return 0;
  }
  console.error('usage: node bin/skills.js check | publish [names…] [--force] | pull <name>');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { manifest, files, hashOf, mirror, states, main };
