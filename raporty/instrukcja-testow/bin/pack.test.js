// Self-test of the pack (MXS-171): builds the cloud example into a temp folder and checks what testers rely on.
// node --test bin/pack.test.js   (no browser; the browser walk of the pack is described in SKILL.md)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build } = require('./pack.js');

const guide = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'przyklad', 'paczka-chmura', 'instrukcja.json'), 'utf8'));
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-test-'));
const r = build(guide, null, out);
const read = (f) => fs.readFileSync(path.join(r.dir, f), 'utf8');
const scenarios = r.files.filter(f => /scenariusz/.test(f));
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);

test('fonts are in the pack once, linked from every page', () => {
  for (const f of r.files) {
    assert.ok(!/base64,/.test(read(f)), f + ' inlines a font');
    if (fs.existsSync(path.join(r.dir, 'fonts.css'))) assert.ok(read(f).includes('<link rel="stylesheet" href="fonts.css">'), f);
  }
});

test('the zip testers get stays under 300 KB', () => {
  assert.ok(fs.statSync(r.zip).size < 300 * 1024, 'zip ' + fs.statSync(r.zip).size + ' B, folder ' + size(r.dir) + ' B');
});

test('every scenario ends with the result form and points to the list for the recipient', () => {
  assert.strictEqual(scenarios.length, guide.scenarios.length);
  for (const f of scenarios) {
    const h = read(f);
    for (const n of ['name="verdict" value="OK"', 'value="NIE OK"', 'name="date"', 'name="initials"', 'name="notes"', 'Skopiuj wynik', 'localStorage', 'href="index.html#raport"', 'do osoby ze spisu'])
      assert.ok(h.includes(n), f + ' lacks ' + n);
  }
});

test('the recipient is named in the list only', () => {
  assert.deepStrictEqual(r.warnings, []);
  assert.ok(read('index.html').includes('id="raport"') && read('index.html').includes('<b>' + guide.report.to + '</b>'));
});

test('kept: accounts, steps table, notes, back link, footer, print css, lang', () => {
  const h = read(scenarios[0]);
  for (const n of ['<th>Rola</th>', 'class="steps-t"', '<th>Co zrobić</th><th>Co powinno się stać</th>', '← Wszystkie instrukcje', 'Stan na ', '@media print', 'lang="pl"'])
    assert.ok(h.includes(n), 'lacks ' + n);
  assert.ok(/Ważne/.test(read(r.files[1])) && /Blokada/.test(read(r.files[1])) && scenarios.some(f => /Znany błąd/.test(read(f))));
});

test.after(() => fs.rmSync(out, { recursive: true, force: true }));
