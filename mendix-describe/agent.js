#!/usr/bin/env node
/* The mendix-describe skill's connection to a running MxScout. No dependencies — Node only.
 *
 * MxScout, when the person presses "Share with an agent" in a project's Documentation, holds the AI pack
 * in memory and gives out a token. This reads it from there — one module at a time — and sends the
 * descriptions back, so nobody carries a file in either direction.
 *
 *   node agent.js status                    what is shared: the project, and its modules with their counts
 *   node agent.js module <Name> [--out f]   one module's section of the pack (to stdout, or to a file)
 *   node agent.js pack <file>               the whole pack, to a FILE — for check-descriptions.js todo/check.
 *                                           Never read it whole; read it by module.
 *   node agent.js send <descriptions.json>  hand the finished descriptions to MxScout; the person accepts them there
 *
 * Where: --url and --token, or MXSCOUT_URL and MXSCOUT_TOKEN. The url defaults to http://127.0.0.1:4289.
 * The person gets both from MxScout ("Copy for the agent"). It refuses any address that is not this machine:
 * the token and the descriptions go nowhere else.
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
function fail(message) { console.error(message); process.exit(1); }

const base = String(take('--url') || process.env.MXSCOUT_URL || 'http://127.0.0.1:4289').replace(/\/+$/, '');
const token = take('--token') || process.env.MXSCOUT_TOKEN;
const out = take('--out');
const [cmd, arg] = args;

let host;
try { host = new URL(base).hostname; } catch (e) { fail('Not an address: ' + base); }
if (host !== '127.0.0.1' && host !== 'localhost') fail('Refusing ' + base + ': MxScout is on this machine, at 127.0.0.1.');
if (!token) fail('No token. In MxScout: Documentation → Share with an agent → Copy for the agent, then pass --token or set MXSCOUT_TOKEN.');

async function call(path, opts) {
  let res;
  try { res = await fetch(base + path, Object.assign({ headers: { Authorization: 'Bearer ' + token } }, opts)); }
  catch (e) { fail('Could not reach MxScout at ' + base + ' — is it running?'); }
  if (!res.ok) {
    let msg = res.status + '';
    try { msg = (await res.json()).error || msg; } catch (e) { /* not JSON */ }
    fail('MxScout says: ' + msg);
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
    if (s.descriptions) console.log('waiting in MxScout for the person to accept: descriptions sent ' + s.descriptions.receivedAt);
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
    console.log('Sent. In MxScout, Documentation shows an "Import them" button; nothing is kept until the person presses it.');
  } else {
    console.error('Usage: node agent.js status | module <Name> [--out file] | pack <file> | send <descriptions.json>   [--url U] [--token T]');
    process.exit(2);
  }
})();
