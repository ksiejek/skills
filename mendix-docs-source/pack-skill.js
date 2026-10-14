#!/usr/bin/env node
/* Puts the mendix-docs skill together as it is installed:
 *   node pack-skill.js <folder> [--mxscout <MxScout repository>]   (or MXSCOUT_DIR; default ~/Projects/MxScout)
 *
 * The skill is private (Karol, 2026-10-14), so its source lives here, in the private ksiejek/skills
 * repository (mendix-docs-source/), and only what
 * is its own — SKILL.md, docs.js, README.md, CHANGELOG.md. Everything else it uses is a file of the
 * public MxScout repository, taken from there so it cannot drift:
 *  - check-descriptions.js and reference/ from mendix-describe: one checker and one set of rules for
 *    both skills (Karol, 2026-10-14: "exactly the same skill");
 *  - engine/ from public/: the files MxScout runs to read a .mpr and draw the documentation, unchanged.
 * The folder is emptied first. No dependencies — Node only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const os = require('os');
const args = process.argv.slice(2);
const at = args.indexOf('--mxscout');
const ROOT = at >= 0 ? args.splice(at, 2)[1] : (process.env.MXSCOUT_DIR || path.join(os.homedir(), 'Projects', 'MxScout'));
const dest = args[0];
if (!dest) { console.error('Usage: node pack-skill.js <folder> [--mxscout <MxScout repository>]   (e.g. ~/.claude/skills/mendix-docs)'); process.exit(2); }
if (!fs.existsSync(path.join(ROOT, 'public', 'docs-file.js'))) { console.error('No MxScout repository at ' + ROOT + ' — pass --mxscout or set MXSCOUT_DIR.'); process.exit(1); }
const PUBLIC = path.join(ROOT, 'public');
const DESCRIBE = path.join(ROOT, 'skills', 'mendix-describe');

function copy(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }

// What the report needs besides the engine's scripts, as docs-file.js lists it.
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(PUBLIC, 'docs-file.js'), 'utf8'), ctx);
const F = ctx.window.MxDocsFile;
const ENGINE = ['sqlite.js', 'bson.js', 'mpr.js', 'docs-data.js', 'describe.js', 'reportdata.js', 'docs-view.js', 'docs-file.js']
  .concat(Array.from(F.SHEETS), Array.from(F.SCRIPTS));
const fonts = F.fontsIn(fs.readFileSync(path.join(PUBLIC, 'tokens.css'), 'utf8')).map((u) => F.fontPath(u));
const licences = fs.readdirSync(path.join(PUBLIC, 'fonts')).filter((f) => /^OFL-.*\.txt$/.test(f)).map((f) => 'fonts/' + f);

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
['SKILL.md', 'docs.js', 'README.md', 'CHANGELOG.md'].forEach((f) => copy(path.join(__dirname, f), path.join(dest, f)));
copy(path.join(DESCRIBE, 'check-descriptions.js'), path.join(dest, 'check-descriptions.js'));
fs.readdirSync(path.join(DESCRIBE, 'reference')).forEach((f) => copy(path.join(DESCRIBE, 'reference', f), path.join(dest, 'reference', f)));
ENGINE.concat(fonts, licences).forEach((f) => copy(path.join(PUBLIC, f), path.join(dest, 'engine', f)));
const version = (fs.readFileSync(path.join(__dirname, 'CHANGELOG.md'), 'utf8').match(/^## (\d+\.\d+\.\d+)/m) || [])[1] || '?';
fs.writeFileSync(path.join(dest, 'VERSION'), version + '\n');
console.log('mendix-docs ' + version + ' in ' + dest + ' — ' + ENGINE.length + ' engine files, ' + fonts.length + ' fonts.');
