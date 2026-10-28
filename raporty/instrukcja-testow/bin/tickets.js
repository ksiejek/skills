#!/usr/bin/env node
// tickets.js: step 2 of the "instrukcja-testow" skill. Lists the tickets of a Tandem project in one line each (key,
// status, type, points, title) with a first guess whether a tester would see the change: „tech” for naming, refactoring,
// pipeline, performance, infrastructure, analysis and test tickets, „drobna” for a small bug fix, „widoczna” otherwise.
// The guess only sorts the list; Claude reads the intent of every „widoczna” ticket and decides. Reads the store through
// Tandem's bin/db.js ($TANDEM_DIR, default ~/Projects/Tandem).
// Usage: node tickets.js <project> [--status done,prod] [--since 2026-10-01] [--json]
'use strict';
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const statuses = (flag('--status') || 'done,prod,autotest').split(',');
const since = flag('--since');
const asJson = args.includes('--json');
const project = args.find(a => !a.startsWith('--'));
if (!project) { console.error('Usage: node tickets.js <project> [--status done,prod] [--since YYYY-MM-DD] [--json]'); process.exit(2); }
const tandemDir = process.env.TANDEM_DIR || path.join(os.homedir(), 'Projects', 'Tandem');

// Words in a title that mark work a tester never sees.
const TECH = /nazw|naming|refaktor|refactor|pipeline|wydajn|performance|infrastru|docker|deploy|wdra|seed|skill|mcp|odata|analiza|analysis|standard|struktur|folder|scss|motyw|theme|backup|harmonogram|stał|konfigur|audyt|audit|test\b|środowisk|konta testowe|obiekty testowe|instrukcj|studio pro|mxcraft|mendix|mikroflow|historyjk|model|indeks|index|log/i;

// One ticket's first guess: tech, drobna or widoczna.
function guess(s) {
  if (s.type === 'test' || s.type === 'task') return 'tech';
  if (TECH.test(s.title || '')) return 'tech';
  if (s.type === 'bug' && (s.points || 1) <= 1) return 'drobna';
  return 'widoczna';
}

const raw = JSON.parse(execFileSync('node', [path.join(tandemDir, 'bin', 'db.js'), 'list', 'projects/' + project + '/stories'], { maxBuffer: 64 << 20 }).toString());
const list = raw.map(x => x.data || x)
  .filter(s => statuses.includes(s.status))
  .filter(s => !since || String(s.updatedAt || s.createdAt || '') >= since)
  .sort((a, b) => (a.num || 0) - (b.num || 0))
  .map(s => ({ key: s.key, status: s.status, type: s.type, points: s.points || null, title: s.title, guess: guess(s),
    intent: String(s.intent || '').split('\n')[0].slice(0, 240) }));
if (asJson) { console.log(JSON.stringify(list, null, 2)); process.exit(0); }
for (const g of ['widoczna', 'drobna', 'tech']) {
  const part = list.filter(s => s.guess === g);
  if (!part.length) continue;
  console.log('\n' + g.toUpperCase() + ' (' + part.length + ')');
  part.forEach(s => console.log('  ' + s.key + ' · ' + s.status + ' · ' + s.type + (s.points ? ' ' + s.points + ' pkt' : '') + ' · ' + s.title));
}
