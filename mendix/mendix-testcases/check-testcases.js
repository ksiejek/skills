#!/usr/bin/env node
/* mendix-testcases — the helper beside SKILL.md. Node's standard library only; it never writes a file.
 *
 *   node check-testcases.js rules <brief.md>                       list the brief's rules (BR-n) the cases must cover
 *   node check-testcases.js check <testcases.json> [<brief.md>]    check the cases against MxScout's format
 *                                                                  (testcase-format.js, the same file MxScout reads
 *                                                                  them with) and, with the brief, that every rule
 *                                                                  has a case; exit code 1 on an error
 *   node check-testcases.js markdown <testcases.json> [<brief.md>] print them as the Markdown MxScout exports
 */
'use strict';
const fs = require('fs');
const F = require('./testcase-format.js');

function fail(msg) { console.error(msg); process.exit(1); }
function read(file) { try { return fs.readFileSync(file, 'utf8'); } catch (e) { fail('Cannot read ' + file + '.'); } }

// The rules of a brief, from brief.md as MxScout writes it ("- **BR-3** text — process *(S1)*") or from a
// brief.json → { rules: [{ id, text }] }.
function briefOf(file) {
  if (!file) return null;
  const text = read(file);
  if (/^\s*\{/.test(text)) { try { const j = JSON.parse(text); return { rules: (j.rules || []).map((r) => ({ id: r.id, text: r.text })) }; } catch (e) { fail('Cannot read ' + file + ' as JSON.'); } }
  const rules = [];
  const re = /^- \*\*(BR-[1-9][0-9]{0,3})\*\* (.*)$/gm;
  let m;
  while ((m = re.exec(text))) rules.push({ id: m[1], text: m[2].replace(/\s*\*\([^)]*\)\*\s*$/, '') });
  if (!rules.length) fail(file + ' has no business rules (lines "- **BR-1** …") — is it the brief.md MxScout writes?');
  return { rules };
}

function check(file, briefFile) {
  if (!file) fail('Usage: node check-testcases.js check <testcases.json> [<brief.md>]');
  const r = F.check(read(file), briefOf(briefFile));
  r.errors.forEach((e) => console.log('error: ' + e));
  r.warnings.forEach((w) => console.log('warning: ' + w));
  if (r.errors.length) process.exit(1);
  const rules = {};
  r.value.cases.forEach((c) => { rules[c.rule] = true; });
  console.log('OK: ' + r.value.cases.length + ' case(s) for ' + Object.keys(rules).length + ' rule(s)' + (briefFile ? ', every rule of the brief covered' : ' (no brief given: coverage not checked)') + '.');
}

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'rules') { const b = briefOf(args[0]); b.rules.forEach((r) => console.log(r.id + '  ' + r.text)); console.log(b.rules.length + ' rule(s).'); }
  else if (cmd === 'check') check(args[0], args[1]);
  else if (cmd === 'markdown') { const r = F.check(read(args[0]), null); if (!r.value) fail(r.errors.join('\n')); process.stdout.write(F.markdown(r.value, { brief: briefOf(args[1]) })); }
  else fail('Usage: node check-testcases.js rules <brief.md> | check <testcases.json> [<brief.md>] | markdown <testcases.json> [<brief.md>]');
}
module.exports = { check: F.check, briefOf };
