#!/usr/bin/env node
/* MxCraft theme-scss — proves that the SCSS partials compile to the same CSS as the theme's old CSS files.
 *
 * Both sides are compiled with the dart-sass that Studio Pro bundles (so the same compiler Studio Pro uses
 * for theme.compiled.css), flattened into a list of rules (at-rule context + selector + declarations) and
 * compared one by one: the same number of rules, in the same order, with the same declarations and values.
 * Values are compared after a normalisation that only removes differences of notation a browser reads the
 * same way (spaces after commas, #FFF vs #ffffff, 'x' vs "x"); how many declarations differed only in
 * notation is printed, so nothing is hidden. Sass also rewrites colour functions in SCSS (rgb(0 0 0 / 40%)
 * becomes rgba(0, 0, 0, 0.4), and it clamps rgba(2555, …) to 255 as a browser does): such a value counts as
 * the same colour, but every one of them is listed by name.
 *
 *   node compare.js --before orig/fonts.css orig/ui.css orig/darkmode.css --after out/_helpdesk.scss
 *   node compare.js --before orig --after out/_helpdesk.scss        (orig/settings.json gives the CSS files)
 *       [--sass <path to sass>] [--load-path <dir>] [--dump <dir>] [--json]
 *
 * Exit code 0 = identical, 1 = differences (the first ones are listed), 2 = error.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const css = require('./css.js');

// Where Studio Pro keeps its dart-sass, newest version first (macOS app bundles, Windows install folders).
function findSass() {
  if (process.env.MENDIX_SASS) return process.env.MENDIX_SASS;
  const found = [];
  const scan = (root, test, sub) => {
    let names = [];
    try { names = fs.readdirSync(root); } catch { return; }
    for (const n of names.filter(test)) {
      const dir = path.join(root, n, ...sub);
      let arch = [];
      try { arch = fs.readdirSync(dir); } catch { continue; }
      for (const a of arch) for (const bin of ['sass', 'sass.bat']) {
        const p = path.join(dir, a, bin);
        if (fs.existsSync(p)) found.push(p);
      }
    }
  };
  scan('/Applications', (n) => /^Mendix Studio Pro.*\.app$/.test(n), ['Contents', 'modeler', 'tools', 'sass']);
  scan('C:\\Program Files\\Mendix', () => true, ['modeler', 'tools', 'sass']);
  const version = (p) => (p.match(/(\d+)\.(\d+)\.(\d+)/) || [0, 0, 0, 0]).slice(1).map(Number);
  found.sort((a, b) => { const x = version(a), y = version(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; });
  return found[0] || null;
}

// Compiles one .css or .scss file with dart-sass; returns { css, warnings }.
function compile(sass, file, loadPaths = []) {
  const args = ['--no-source-map', '--style=expanded', ...loadPaths.map((p) => `--load-path=${p}`), file];
  try {
    const out = execFileSync(sass, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
    return { css: out, warnings: 0 };
  } catch (err) {
    throw new Error(`sass nie skompilował ${file}:\n${(err.stderr || err.message).toString().slice(0, 2000)}`);
  }
}

// A selector or at-rule prelude in one spelling.
function normSelector(s) {
  let x = s.replace(/\s+/g, ' ').trim().replace(/\s*([,>+~()])\s*/g, '$1');
  if (x.startsWith('@')) x = x.replace(/\s*:\s*/g, ':'); // (max-width: 640px) = (max-width:640px)
  return x;
}

// A declaration value in one spelling: what a browser reads the same is written the same.
function normValue(v) {
  let s = v.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*!\s*important$/i, ' !important');
  s = s.replace(/\s*,\s*/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/'([^'"]*)'/g, '"$1"');
  s = s.replace(/(?<![\w#&-])#([0-9a-fA-F]{3,8})\b/g, (m, h) => {
    let x = h.toLowerCase();
    if (x.length === 3 || x.length === 4) x = [...x].map((c) => c + c).join('');
    return `#${x}`;
  });
  return s;
}

// rgb()/rgba() with plain numbers -> { rgba: 'rgba(r,g,b,a)', clamped }, the way a browser reads it
// (channels clamped to 0..255, alpha to 0..1); null when an argument is not a plain number.
function rgbaOf(args) {
  const parts = args.includes(',') ? args.split(',') : args.replace('/', ' / ').trim().split(/\s+/).filter((x) => x !== '/');
  if (parts.length < 3 || parts.length > 4) return null;
  const nums = parts.map((x) => x.trim());
  if (!nums.every((x) => /^-?(\d+\.?\d*|\.\d+)%?$/.test(x))) return null;
  let clamped = false;
  const clamp = (n, lo, hi) => { if (n < lo || n > hi) clamped = true; return Math.min(hi, Math.max(lo, n)); };
  const ch = nums.slice(0, 3).map((x) => Math.round(clamp(x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x), 0, 255)));
  const a = nums[3] === undefined ? 1 : clamp(nums[3].endsWith('%') ? parseFloat(nums[3]) / 100 : parseFloat(nums[3]), 0, 1);
  return { rgba: `rgba(${ch.join(',')},${+a.toFixed(4)})`, clamped };
}

// A normalised value with every colour written as rgba(r,g,b,a); also says whether a channel was clamped.
function colourValue(v) {
  let clamped = false;
  let s = v.replace(/\brgba?\(([^()]*)\)/gi, (m, args) => { const c = rgbaOf(args); if (!c) return m; clamped = clamped || c.clamped; return c.rgba; });
  s = s.replace(/(?<![\w#&-])#([0-9a-f]{6}|[0-9a-f]{8})\b/g, (m, h) => {
    const n = h.match(/../g).map((x) => parseInt(x, 16));
    return `rgba(${n.slice(0, 3).join(',')},${n[3] === undefined ? 1 : +(n[3] / 255).toFixed(4)})`;
  });
  return { value: s, clamped };
}

// Rules of a compiled stylesheet, normalised for comparison.
function rulesOf(text) {
  return css.parseRules(text).map((r) => ({
    context: normSelector(r.context),
    selector: normSelector(r.selector),
    decls: r.decls.map(([p, v]) => [p.toLowerCase(), normValue(v), v]),
  }));
}

// One line per rule, for --dump and for showing a difference.
function lineOfRule(r) {
  return `${r.context ? `${r.context} > ` : ''}${r.selector} { ${r.decls.map(([p, v]) => `${p}: ${v}`).join('; ')} }`;
}

// Compares two rule lists; returns { same, before, after, notation, colours, diffs: [{ index, before, after, why }] }.
// colours lists the declarations whose values are the same colour written differently.
function compareRules(a, b, limit = 10) {
  const diffs = [], colours = [];
  let notation = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && diffs.length < limit; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) { diffs.push({ index: i + 1, before: x ? lineOfRule(x) : '(brak)', after: y ? lineOfRule(y) : '(brak)', why: 'inna liczba reguł' }); continue; }
    if (x.context !== y.context || x.selector !== y.selector) { diffs.push({ index: i + 1, before: lineOfRule(x), after: lineOfRule(y), why: 'inny selektor albo inna kolejność' }); continue; }
    if (x.decls.length !== y.decls.length) { diffs.push({ index: i + 1, before: lineOfRule(x), after: lineOfRule(y), why: 'inna liczba deklaracji' }); continue; }
    for (let k = 0; k < x.decls.length; k++) {
      const [p1, v1, raw1] = x.decls[k], [p2, v2, raw2] = y.decls[k];
      if (p1 === p2 && v1 !== v2) {
        const c1 = colourValue(v1), c2 = colourValue(v2);
        if (c1.value === c2.value) { colours.push({ index: i + 1, selector: x.selector, prop: p1, before: raw1.trim(), after: raw2.trim(), clamped: c1.clamped || c2.clamped }); continue; }
      }
      if (p1 !== p2 || v1 !== v2) { diffs.push({ index: i + 1, before: `${x.selector} { ${p1}: ${v1} }`, after: `${y.selector} { ${p2}: ${v2} }`, why: 'inna wartość' }); break; }
      if (raw1.trim() !== raw2.trim()) notation++;
    }
  }
  const declCount = (list) => list.reduce((s, r) => s + r.decls.length, 0);
  return { same: diffs.length === 0, before: { rules: a.length, decls: declCount(a) }, after: { rules: b.length, decls: declCount(b) }, notation, colours, diffs };
}

// The list of files for one side: a directory means "the cssFiles of its settings.json".
function sideFiles(list) {
  if (list.length === 1 && fs.existsSync(list[0]) && fs.statSync(list[0]).isDirectory()) {
    const dir = list[0];
    const settings = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
    return settings.cssFiles.filter((f) => f !== 'theme.compiled.css').map((f) => path.join(dir, f));
  }
  return list;
}

// Command line.
function main(argv) {
  const args = { before: [], after: [], loadPaths: [] };
  let side = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--before' || a === '--after') side = a.slice(2);
    else if (a === '--sass') { args.sass = argv[++i]; side = null; }
    else if (a === '--load-path') { args.loadPaths.push(argv[++i]); side = null; }
    else if (a === '--dump') { args.dump = argv[++i]; side = null; }
    else if (a === '--json') { args.json = true; side = null; }
    else if (side) args[side].push(a);
  }
  if (!args.before.length || !args.after.length) { console.error('Użycie: node compare.js --before <pliki css | katalog> --after <_motyw.scss> [--sass ścieżka] [--dump katalog]'); return 2; }
  const sass = args.sass || findSass();
  if (!sass) { console.error('Nie znalazłem sass ze Studio Pro; podaj --sass albo MENDIX_SASS.'); return 2; }
  const version = execFileSync(sass, ['--version'], { encoding: 'utf8' }).trim();
  const side2 = (files) => rulesOf(sideFiles(files).map((f) => compile(sass, f, args.loadPaths).css).join('\n'));
  const before = side2(args.before), after = side2(args.after);
  const res = compareRules(before, after);
  if (args.dump) {
    fs.mkdirSync(args.dump, { recursive: true });
    fs.writeFileSync(path.join(args.dump, 'before.txt'), before.map(lineOfRule).join('\n') + '\n');
    fs.writeFileSync(path.join(args.dump, 'after.txt'), after.map(lineOfRule).join('\n') + '\n');
  }
  if (args.json) { console.log(JSON.stringify({ sass, version, ...res }, null, 2)); return res.same ? 0 : 1; }
  console.log(`sass ${version} (${sass})`);
  console.log(`Przed: ${res.before.rules} reguł, ${res.before.decls} deklaracji`);
  console.log(`Po:    ${res.after.rules} reguł, ${res.after.decls} deklaracji`);
  if (res.colours.length) {
    console.log(`Ten sam kolor, inny zapis (Sass przepisał funkcję koloru): ${res.colours.length}`);
    for (const c of res.colours) console.log(`  #${c.index} ${c.selector} { ${c.prop} }: ${c.before}  ->  ${c.after}${c.clamped ? '  (wartość poza zakresem, przeglądarka też przycina do 255 – literówka w źródle?)' : ''}`);
  }
  if (res.same) {
    console.log(`Wynik: TAKIE SAME – ta sama liczba reguł, ta sama kolejność, te same wartości (${res.notation} deklaracji różni się tylko zapisem, np. spacją po przecinku; ${res.colours.length} tym samym kolorem zapisanym inaczej).`);
    return 0;
  }
  console.log('Wynik: RÓŻNE. Pierwsze różnice:');
  for (const d of res.diffs) console.log(`  #${d.index} ${d.why}\n    przed: ${d.before}\n    po:    ${d.after}`);
  return 1;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exitCode = 2; }
}

module.exports = { findSass, compile, rulesOf, compareRules, normValue, normSelector, colourValue, lineOfRule };
