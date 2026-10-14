#!/usr/bin/env node
/* The mendix-describe skill's connection to a running MxScout. No dependencies — Node only.
 *
 * MxScout, when the person presses "Share with an agent" in a project's Documentation, holds the AI pack
 * in memory and gives out a token — and, when the project has descriptions, the documentation as
 * Markdown beside it. This reads them from there — the pack one module at a time — and sends the
 * descriptions back, so nobody carries a file in either direction.
 *
 *   node agent.js status                    what is shared: the project, its modules with their counts,
 *                                           and whether there is documentation (how much of it is out of date)
 *   node agent.js docs [--out docs.md]      the documentation as Markdown: what an agent understood earlier.
 *                                           Read it first, as the map; check what matters in the pack.
 *   node agent.js module <Name> [--out f]   one module's section of the pack (to stdout, or to a file)
 *   node agent.js pack <file>               the whole pack, to a FILE — for check-descriptions.js todo/check.
 *                                           Never read it whole; read it by module.
 *   node agent.js send <descriptions.json>  hand the finished descriptions to MxScout; the person accepts them there
 *
 * Where: MXSCOUT_TOKEN and MXSCOUT_URL in the environment, or --token and --url. Prefer the environment for
 * the token: an argument is visible to every process on the machine (ps) and stays in the shell's history.
 * The url defaults to http://127.0.0.1:4288. The person gets both from MxScout ("Copy for the agent").
 * It refuses any address that is not this machine and follows no redirect: the token and the descriptions
 * go nowhere else. A call that has no answer within 30 seconds is given up (MXSCOUT_TIMEOUT_MS to change it).
 */
'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
function take(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1];
  args.splice(i, 2);
  return v === undefined ? null : v;
}
// One line on stderr and exit code 1 — never a stack trace: the person reads it, not a debugger.
function fail(message) { console.error(String(message).split('\n')[0]); process.exit(1); }

const base = String(take('--url') || process.env.MXSCOUT_URL || 'http://127.0.0.1:4288').replace(/\/+$/, '');
const token = take('--token') || process.env.MXSCOUT_TOKEN;
const out = take('--out');
const [cmd, arg] = args;

let host;
try { host = new URL(base).hostname; } catch (e) { fail('Not an address: ' + base); }
if (host !== '127.0.0.1' && host !== 'localhost') fail('Refusing ' + base + ': MxScout is on this machine, at 127.0.0.1.');
if (!token) fail('No token. In MxScout: Documentation → Share with an agent → Copy for the agent, then set MXSCOUT_TOKEN (or pass --token).');
const waitMs = Number(process.env.MXSCOUT_TIMEOUT_MS) > 0 ? Number(process.env.MXSCOUT_TIMEOUT_MS) : 30000;
const gaveUp = () => 'MxScout at ' + base + ' did not answer within ' + (waitMs / 1000) + ' s — is it busy, or stopped? (MXSCOUT_TIMEOUT_MS sets the wait.)';

async function call(path, opts, quiet) {
  // Given up after waitMs, the answer's body included; the timer does not keep a finished command waiting.
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), waitMs).unref();
  let res;
  try { res = await fetch(base + path, Object.assign({ headers: { Authorization: 'Bearer ' + token } }, opts, { redirect: 'error', signal: ctl.signal })); }
  catch (e) {
    if (ctl.signal.aborted) fail(gaveUp());
    // MxScout never redirects; whatever does is not MxScout, and the token does not follow it.
    if (/redirect/i.test(String((e && e.cause && e.cause.message) || (e && e.message) || ''))) fail('Refusing a redirect from ' + base + path + ': the token goes to MxScout on this machine only.');
    fail('Could not reach MxScout at ' + base + ' — is it running?');
  }
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch (e) { /* not JSON */ }
    // No documentation yet is an answer, not an error: the caller says so plainly.
    if (quiet && body.documentation === false) return null;
    fail('MxScout says: ' + (body.error || res.status));
  }
  return res;
}

(async function () {
  if (cmd === 'status') {
    const s = await (await call('/api/agent/status')).json();
    console.log('project: ' + s.project + (s.mendix ? ' (Mendix ' + s.mendix + ')' : ''));
    console.log('shared: ' + s.sharedAt + (s.generated ? ' · model read ' + s.generated : ''));
    console.log('module | microflows | nanoflows | pages | entities');
    s.modules.forEach((m) => console.log(m.name + ' | ' + m.microflows + ' | ' + m.nanoflows + ' | ' + m.pages + ' | ' + m.entities));
    const d = s.documentation;
    if (d) console.log('documentation: yes — ' + d.described + ' of ' + d.flows + ' flows described, ' + (d.stale ? d.stale + ' out of date (the flow changed since)' : 'none out of date') + '; generated ' + d.generatedAt + '. Read it first: node agent.js docs --out docs.md');
    else console.log('documentation: none yet — this project has no descriptions; the pack is all there is.');
    if (s.descriptions) console.log('waiting in MxScout for the person to accept: descriptions sent ' + s.descriptions.receivedAt);
  } else if (cmd === 'docs') {
    const res = await call('/api/agent/docs', undefined, true);
    if (!res) { console.log('No documentation yet: this project has no descriptions. The AI pack is all there is — read it by module.'); return; }
    const text = await res.text();
    if (out) { fs.writeFileSync(out, text); console.log('Wrote ' + out + ' (' + text.split('\n').length + ' lines) — what an agent understood earlier; verify against the pack.'); } else process.stdout.write(text);
  } else if (cmd === 'module' && arg) {
    const text = await (await call('/api/agent/module?name=' + encodeURIComponent(arg))).text();
    if (out) { fs.writeFileSync(out, text); console.log('Wrote ' + out + ' (' + text.split('\n').length + ' lines).'); } else process.stdout.write(text);
  } else if (cmd === 'pack' && arg) {
    const text = await (await call('/api/agent/pack')).text();
    fs.writeFileSync(arg, text);
    console.log('Wrote ' + arg + ' — for the checker, not for reading whole.');
  } else if (cmd === 'send' && arg) {
    let body;
    try { body = fs.readFileSync(arg, 'utf8'); JSON.parse(body); } catch (e) { fail('Cannot read ' + arg + ' as JSON.'); }
    await call('/api/agent/descriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body });
    console.log('Sent. MxScout saves it at once, with Undo — unless the person turned that off, or it is a whole file that would replace the descriptions kept: then it waits for them to press Import them.');
  } else {
    console.error('Usage: node agent.js status | docs [--out file] | module <Name> [--out file] | pack <file> | send <descriptions.json>   (MXSCOUT_TOKEN, MXSCOUT_URL; or --token T, --url U)');
    process.exit(2);
  }
})().catch((e) => fail(e && e.name === 'AbortError' ? gaveUp() : 'agent.js: ' + ((e && e.message) || e)));
