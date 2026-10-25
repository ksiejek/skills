#!/usr/bin/env node
/* MxCraft theme-scss — turns a Mendix theme's own CSS files into SCSS partials without changing what
 * the browser gets (recipe: SKILL.md next to this file; first used on Service Desk, story SD-12).
 *
 * What it does, per CSS file listed in the theme's settings.json (cssFiles, without theme.compiled.css):
 *   - the file that holds the :root palette is cut at top-level rule boundaries into partials, imported in
 *     the original order, so the cascade stays the same;
 *   - its :root custom properties become Sass maps (tone scales such as --gray-100…900) and variables, and
 *     :root is generated from them (the same custom properties, the same values);
 *   - hard-coded colours that equal a palette tone (or #fff / #000) are replaced by the palette function or
 *     variable — only in declaration values, never in selectors, strings, comments or custom properties;
 *   - in the dark-mode file, rules of the form `.darkMode X {…}` are nested under `.darkMode { … }`
 *     (consecutive rules only, so their order does not change);
 *   - any other file becomes one partial as it is.
 * The output is <out>/<name>/_*.scss plus the aggregator <out>/_<name>.scss, which theme/web/main.scss imports.
 *
 *   node convert.js --plan --in <dir with the css files and settings.json> [--name x --prefix y --app "App"]
 *       prints a config (JSON) worked out from the files: edit titles and cut lines, save it
 *   node convert.js --config <config.json> --in <dir> --out <dir>
 *       writes the partials; examples/servicedesk.json is the config used for Service Desk
 *
 * compare.js then proves the result: it compiles both with the dart-sass bundled in Studio Pro and checks
 * rule by rule that nothing changed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const css = require('./css.js');

const HEX = /(?<![\w#&-])#[0-9a-fA-F]{3,8}\b/g;
const COLOUR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\(.*\)|var\(--[\w-]+\)|transparent|currentcolor)$/i;
const SCALE = /^([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)-(\d+)$/;

// A hex colour in one spelling (#abc -> #aabbcc, lower case), or null when it is not a colour length.
function hexKey(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  return h.length === 6 || h.length === 8 ? `#${h}` : null;
}

// A value that is safe to move into a Sass variable: Sass would print it back unchanged in meaning.
// Slashes (division), calc-like functions, interpolation and !important stay literal in :root.
function safeForSass(value) {
  return value !== '' && !/!important|#\{|\/|\b(calc|min|max|clamp)\(/i.test(value);
}

// 1-based line number of a character offset.
function lineOf(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') n++;
  return n;
}

// Offset of the first character of a 1-based line.
function offsetOfLine(lines, line) {
  let off = 0;
  for (let i = 0; i < line - 1; i++) off += lines[i].length + 1;
  return off;
}

// Splits a selector list on top-level commas (not inside :not(...) or [attr="a,b"]).
function splitSelectors(prelude) {
  const parts = [];
  let depth = 0, from = 0;
  for (let i = 0; i < prelude.length; i++) {
    const c = prelude[i];
    if (c === '"' || c === "'") { const q = c; i++; while (i < prelude.length && prelude[i] !== q) i++; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(prelude.slice(from, i)); from = i + 1; }
  }
  parts.push(prelude.slice(from));
  return parts.map((s) => s.trim());
}

// "a, b i c" — a Polish list of names for comments.
function polishList(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`;
}

// The palette: { scales: [{name, title, tones:[[tone, value]]}], vars: [[name, value, group]], decls, hexmap }.
function buildPalette(rootBody, opts, prefix) {
  const decls = css.declarations(rootBody).filter(([k]) => k.startsWith('--')).map(([k, v]) => [k.slice(2), v]);
  const seen = new Set(), literal = new Set();
  decls.forEach(([k, v], i) => { if (seen.has(k) || !safeForSass(v)) literal.add(i); seen.add(k); });
  const scaleNames = opts.scales ? Object.keys(opts.scales) : (() => {
    const count = {};
    decls.forEach(([k], i) => { const m = SCALE.exec(k); if (m && !literal.has(i)) count[m[1]] = (count[m[1]] || 0) + 1; });
    return Object.keys(count).filter((n) => count[n] >= 3);
  })();
  const scaleOf = (k) => { const m = SCALE.exec(k); return m && scaleNames.includes(m[1]) ? m : null; };
  const scales = scaleNames.map((name) => ({
    name, title: (opts.scales && opts.scales[name]) || `Skala ${name}`,
    tones: decls.filter(([k], i) => !literal.has(i) && scaleOf(k) && scaleOf(k)[1] === name).map(([k, v]) => [scaleOf(k)[2], v]),
  }));
  const colourNames = opts.colors ? new Set(opts.colors) : null;
  const vars = decls.filter(([k], i) => !literal.has(i) && !scaleOf(k)).map(([k, v]) => [k, v, (colourNames ? colourNames.has(k) : COLOUR.test(v)) ? 'colors' : 'other']);
  const hexmap = new Map();
  for (const s of scales) for (const [tone, v] of s.tones) { const key = /^#[0-9a-f]+$/i.test(v) && hexKey(v); if (key && !hexmap.has(key)) hexmap.set(key, `${prefix}-${s.name}(${tone})`); }
  if (!hexmap.has('#ffffff')) hexmap.set('#ffffff', `$${prefix}-white`);
  if (!hexmap.has('#000000')) hexmap.set('#000000', `$${prefix}-black`);
  return { decls, literal, scales, vars, hexmap, scaleOf };
}

// The generated :root block: every custom property in its original order, from the palette.
function rootBlock(pal, prefix) {
  const lines = [':root {'];
  pal.decls.forEach(([k, v], i) => {
    const m = pal.scaleOf(k);
    if (pal.literal.has(i)) lines.push(`  --${k}: ${v};`);
    else if (m) lines.push(`  --${k}: #{${prefix}-${m[1]}(${m[2]})};`);
    else lines.push(`  --${k}: #{$${prefix}-${k}};`);
  });
  lines.push('}');
  return lines.join('\n');
}

// The _palette.scss text (Sass definitions; with :root at the end when :root came first in the file).
function paletteText(pal, opts, prefix, app, withRoot, darkName) {
  const first = pal.decls[0] ? pal.decls[0][0] : 'color';
  const p = [`// ${app} – paleta kolorów (źródło prawdy).`, '// Z niej generowane są zmienne CSS w :root, z których korzysta reszta motywu',
    `// (var(--${opts.example || first}) itd.)${darkName ? `, a tryb ciemny (_${darkName}.scss) nadpisuje część z nich.` : '.'}`, '',
    `$${prefix}-white: #fff;`, `$${prefix}-black: #000;`, ''];
  for (const s of pal.scales) p.push(`// ${s.title}`, `$${prefix}-${s.name}: (`, ...s.tones.map(([t, v]) => `  ${t}: ${v},`), ');', '');
  for (const s of pal.scales) p.push(`@function ${prefix}-${s.name}($tone) { @return map-get($${prefix}-${s.name}, $tone); }`);
  if (pal.scales.length) p.push('');
  p.push(`// ${opts.colorsTitle || 'Kolory'}`);
  for (const [k, v, g] of pal.vars) if (g === 'colors') p.push(`$${prefix}-${k}: ${v};`);
  p.push('', `// ${opts.otherTitle || 'Rozmiary i układ'}`);
  for (const [k, v, g] of pal.vars) if (g === 'other') p.push(`$${prefix}-${k}: ${v};`);
  if (withRoot) p.push('', rootBlock(pal, prefix));
  p.push('');
  return p.join('\n');
}

// Replaces hard-coded palette colours in declaration values; counts what it replaced in `counts`.
function replaceColours(text, hexmap, counts, inBlock = false) {
  return css.mapValues(text, (prop, value) => css.outsideLiterals(value, (chunk) => chunk.replace(HEX, (hex) => {
    const to = hexmap.get(hexKey(hex));
    if (!to) return hex;
    counts[to] = (counts[to] || 0) + 1;
    return to;
  })), inBlock);
}

// The dark-mode partial: consecutive `<cls> X {…}` rules nested under `<cls> { … }`, everything else kept.
function darkText(text, cls, hexmap, counts) {
  const out = [];
  let run = null, from = 0, nested = 0;
  const flushTop = (to) => {
    const seg = replaceColours(text.slice(from, to), hexmap, counts).replace(/^\n+/, '').replace(/\s+$/, '');
    if (seg) out.push(seg);
  };
  const closeRun = () => { if (run) { out.push(`${cls} {\n${run.join('\n')}\n}`); run = null; } };
  for (const it of css.topLevel(text)) {
    if (it.type === 'comment' && run) { run.push(`  ${it.text}`); from = it.end; continue; }
    const sels = it.type === 'rule' ? splitSelectors(it.prelude) : [];
    const nestable = sels.length && sels.every((s) => s.startsWith(`${cls} `) && s.slice(cls.length + 1).trim());
    if (!nestable) { closeRun(); continue; }
    if (!run) { flushTop(it.start); run = []; }
    const inner = sels.map((s) => s.slice(cls.length + 1).trim()).join(', ');
    const body = replaceColours(it.body, hexmap, counts, true);
    if (!body.includes('\n')) run.push(`  ${inner} {${body.trimEnd()}}`);
    else run.push(`  ${inner} {`, ...body.replace(/^\s*\n|\n\s*$/g, '').split('\n').map((l) => `  ${l}`), '  }');
    from = it.end; nested++;
  }
  if (run) closeRun(); else flushTop(text.length);
  return { text: out.join('\n\n') + '\n', nested };
}

// Cut points for the palette file when the config gives none: at top-level comments, at least minLines apart.
function autoParts(text, startOffset, minLines = 60) {
  const items = css.topLevel(text).filter((it) => it.start >= startOffset);
  const parts = [];
  let last = -Infinity;
  for (const it of items) {
    const line = lineOf(text, it.start);
    if (!parts.length || (it.type === 'comment' && line - last >= minLines)) {
      const title = it.type === 'comment' ? it.text.replace(/^\/\*+|\*+\/$/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
      parts.push({ name: `part-${String(parts.length + 1).padStart(2, '0')}`, title: title || `Część ${parts.length + 1}`, from: line });
      last = line;
    }
  }
  return parts;
}

// The theme's own CSS files from settings.json, in cascade order (theme.compiled.css left out).
function cssFilesOf(dir) {
  const settings = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  return (settings.cssFiles || []).filter((f) => f !== 'theme.compiled.css');
}

// Works out a config from the files alone (convert.js --plan); a starting point to edit.
function plan(read, files, { name = 'custom', prefix = 'th', app = 'Aplikacja' } = {}) {
  const cfg = { app, name, prefix, eol: 'auto', files: [] };
  for (const file of files) {
    const text = read(file).replace(/\r\n/g, '\n');
    const items = css.topLevel(text);
    const root = items.find((it) => it.type === 'rule' && it.prelude.trim() === ':root');
    const base = path.basename(file, '.css');
    if (root && !cfg.files.some((f) => f.palette)) {
      cfg.files.push({ file, palette: { example: null, colorsTitle: 'Kolory', otherTitle: 'Rozmiary i układ' }, parts: autoParts(text, root.end) });
    } else if (/dark/i.test(file)) {
      const counts = {};
      for (const it of items) if (it.type === 'rule') for (const s of splitSelectors(it.prelude)) { const m = /^(\.[\w-]+)\s/.exec(s); if (m) counts[m[1]] = (counts[m[1]] || 0) + 1; }
      const cls = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || null;
      cfg.files.push({ file, partial: base, title: 'Tryb ciemny', note: cls ? `poprawki pod ${cls}.` : '', dark: cls });
    } else {
      cfg.files.push({ file, partial: base, title: base });
    }
  }
  return cfg;
}

// Runs the conversion. read(file) returns the text of an input CSS file. Returns { files: {relPath: text}, report }.
function convert(cfg, read) {
  const { app, name, prefix } = cfg;
  const counts = {};
  const out = {};
  const report = { partials: 0, nested: 0, replacements: 0, warnings: [] };
  const texts = Object.fromEntries(cfg.files.map((f) => [f.file, read(f.file)]));
  const crlf = cfg.eol === 'crlf' || (cfg.eol !== 'lf' && Object.values(texts).some((t) => t.includes('\r\n')));
  const darkFile = cfg.files.find((f) => f.dark);
  const imports = [`// ${app} – własne style motywu, w kolejności, w jakiej były w ${polishList(cfg.files.map((f) => f.file))}.`,
    '// Importowane z theme/web/main.scss (po Atlasie), więc kaskada jest taka sama jak przy plikach CSS.', ''];
  const emit = (partial, text) => { out[`${name}/_${partial}.scss`] = text; imports.push(`@import '${name}/${partial}';`); report.partials++; };

  // Palette first: its functions and variables must exist before any partial uses them.
  const palFile = cfg.files.find((f) => f.palette);
  let pal = null, palPlan = null;
  if (palFile) {
    const text = texts[palFile.file].replace(/\r\n/g, '\n');
    const root = css.topLevel(text).find((it) => it.type === 'rule' && it.prelude.trim() === ':root');
    if (!root) throw new Error(`${palFile.file}: brak reguły :root na najwyższym poziomie`);
    pal = buildPalette(root.body, palFile.palette, prefix);
    const lines = text.split('\n');
    const parts = palFile.parts && palFile.parts.length ? palFile.parts : autoParts(text, root.end);
    const items = css.topLevel(text);
    parts.forEach((p, i) => {
      const off = offsetOfLine(lines, p.from);
      const inside = items.find((it) => it.start < off && off < it.end && text.slice(it.start, off).trim());
      if (inside) throw new Error(`${palFile.file}: linia ${p.from} (${p.name}) wypada w środku reguły z linii ${lineOf(text, inside.start)}`);
      if (i && p.from <= parts[i - 1].from) throw new Error(`${palFile.file}: części muszą iść po kolei (${p.name})`);
    });
    const firstOff = offsetOfLine(lines, parts[0].from);
    const rootFirst = root.end <= firstOff;
    if (rootFirst) {
      const before = css.topLevel(text.slice(0, firstOff)).filter((it) => it.type !== 'comment' && it.start !== root.start);
      if (before.length) throw new Error(`${palFile.file}: przed pierwszą częścią są reguły inne niż :root`);
    }
    palPlan = { text, lines, parts, root, rootFirst };
  }

  for (const f of cfg.files) {
    if (f === palFile) {
      const { text, lines, parts, root, rootFirst } = palPlan;
      emit('palette', paletteText(pal, palFile.palette, prefix, app, rootFirst, darkFile && darkFile.partial));
      parts.forEach((p, i) => {
        const a = p.from, b = i + 1 < parts.length ? parts[i + 1].from - 1 : lines.length;
        const from = offsetOfLine(lines, a), to = i + 1 < parts.length ? offsetOfLine(lines, b + 1) : text.length;
        let body;
        if (!rootFirst && root.start >= from && root.end <= to) {
          body = replaceColours(text.slice(from, root.start), pal.hexmap, counts) + rootBlock(pal, prefix) + replaceColours(text.slice(root.end, to), pal.hexmap, counts);
        } else body = replaceColours(text.slice(from, to), pal.hexmap, counts);
        emit(p.name, `// ${p.title}\n// (dawniej ${f.file}, linie ${a}–${b})\n\n${body.replace(/^\n+|\n+$/g, '')}\n`);
      });
      continue;
    }
    const text = texts[f.file].replace(/\r\n/g, '\n');
    const head = `// ${f.title} (dawniej ${f.file})${f.note ? `: ${f.note}` : '.'}\n\n`;
    if (f.dark) {
      const d = darkText(text, f.dark, pal ? pal.hexmap : new Map(), counts);
      report.nested += d.nested;
      emit(f.partial, head + d.text);
    } else {
      emit(f.partial, head + (pal ? replaceColours(text, pal.hexmap, counts) : text));
    }
  }
  out[`_${name}.scss`] = imports.join('\n') + '\n';
  if (pal && pal.literal.size) report.warnings.push(`${pal.literal.size} wartości :root zostaje dosłownie (powtórzone albo niebezpieczne dla Sass)`);
  report.replacements = Object.values(counts).reduce((a, b) => a + b, 0);
  report.byColour = counts;
  if (crlf) for (const k of Object.keys(out)) out[k] = out[k].replace(/\n/g, '\r\n');
  return { files: out, report };
}

// Command line: --plan prints a config, otherwise writes the partials.
function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plan') args.plan = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  if (!args.in) { console.error('Użycie: node convert.js --plan --in <katalog z CSS> | --config <plik.json> --in <katalog> --out <katalog>'); return 2; }
  const read = (file) => fs.readFileSync(path.join(args.in, file), 'utf8');
  if (args.plan) {
    console.log(JSON.stringify(plan(read, cssFilesOf(args.in), args), null, 2));
    return 0;
  }
  if (!args.config || !args.out) { console.error('Brak --config albo --out.'); return 2; }
  const cfg = JSON.parse(fs.readFileSync(args.config, 'utf8'));
  const { files, report } = convert(cfg, read);
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(args.out, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  console.log(`Partiali: ${report.partials} (+ _${cfg.name}.scss), reguł trybu ciemnego zagnieżdżonych: ${report.nested}, podmienionych kolorów: ${report.replacements}`);
  for (const [to, n] of Object.entries(report.byColour).sort((a, b) => b[1] - a[1])) console.log(`  ${to}: ${n}`);
  for (const w of report.warnings) console.log(`Uwaga: ${w}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { convert, plan, buildPalette, darkText, replaceColours, splitSelectors, hexKey, safeForSass, cssFilesOf };
