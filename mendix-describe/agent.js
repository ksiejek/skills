#!/usr/bin/env node
/* The mendix-describe skill's way into an MxScout project. No dependencies — Node only.
 *
 * Two ways, the same commands:
 *
 *  1. The project's folder (the first way). MxScout keeps a project in a folder the person chose and
 *     writes it as they work: project.json, model.json, descriptions.json, documentation.md, ai-pack.md,
 *     README.md and inbox/. These commands read those files, and `send` writes the descriptions file
 *     into inbox/, which MxScout takes while the project is open. Nothing has to be running to read.
 *     --folder <dir>, or MXSCOUT_FOLDER, or simply run it inside the folder (it finds project.json).
 *
 *  2. The agent channel. MxScout, when the person presses "Share with an agent" in a project's
 *     Documentation, holds the AI pack in memory and gives out a token — and, when the project has
 *     descriptions, the documentation as Markdown beside it. MXSCOUT_TOKEN and MXSCOUT_URL in the
 *     environment, or --token and --url.
 *
 *   node agent.js status                    what the project is: its modules with their counts, the language
 *                                           its content is written in, which version of the app the model is and
 *                                           which one the descriptions describe (from the Mendix project's git),
 *                                           whether there is documentation (how much of it is out of date), and
 *                                           what waits for the person
 *   node agent.js docs [--out docs.md]      the documentation as Markdown: what an agent understood earlier.
 *                                           Read it first, as the map; check what matters in the pack.
 *   node agent.js module <Name> [--out f]   one module's section of the pack (to stdout, or to a file)
 *   node agent.js pack <file>               the whole pack, to a FILE — for check-descriptions.js todo/check.
 *                                           Never read it whole; read it by module.
 *   node agent.js send <descriptions.json>  hand the finished descriptions to MxScout; the person accepts them there
 *
 * Channel: prefer the environment for the token: an argument is visible to every process on the machine
 * (ps) and stays in the shell's history. The url defaults to http://127.0.0.1:4288. The person gets both
 * from MxScout ("Copy for the agent"). It refuses any address that is not this machine and follows no
 * redirect: the token and the descriptions go nowhere else. A call that has no answer within 30 seconds
 * is given up (MXSCOUT_TIMEOUT_MS to change it).
 */
'use strict';
const fs = require('fs');
const path = require('path');

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

const folderArg = take('--folder') || process.env.MXSCOUT_FOLDER || null;
const urlArg = take('--url');
const tokenArg = take('--token');
const out = take('--out');
const [cmd, arg] = args;

const LAYOUT = 1;
function isProjectFolder(dir) {
  try { const p = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')); return !!p && p.format === 'mxscout-project'; } catch (e) { return false; }
}
// The folder: given, or the one this runs in (or above it) when no token says "the channel".
function findFolder() {
  if (folderArg) return path.resolve(folderArg.replace(/^~(?=$|\/)/, process.env.HOME || '~'));
  if (tokenArg || process.env.MXSCOUT_TOKEN) return null;
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (isProjectFolder(dir)) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const folder = findFolder();

// The pack's own index: "module | from-to | microflows | nanoflows | pages | entities", 1-based, inclusive.
function parseIndex(lines) {
  const at = lines.indexOf('## index');
  if (at < 0) return null;
  const modules = [];
  for (let i = at + 2; i < lines.length && lines[i].trim() !== ''; i++) {
    const m = /^(.+?) \| (\d+)-(\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+)$/.exec(lines[i]);
    if (!m) return null;
    modules.push({ name: m[1], from: Number(m[2]), to: Number(m[3]), microflows: Number(m[4]), nanoflows: Number(m[5]), pages: Number(m[6]), entities: Number(m[7]) });
  }
  return modules;
}
function header(text, key) {
  const l = String(text).split('\n').slice(0, 24).find((x) => x.startsWith(key + ': '));
  return l ? l.slice(key.length + 2) : null;
}
// Which version of the app the model is, and which one the descriptions describe — from the pack's and the
// documentation's headers (MxScout reads both from the Mendix project's git). With both commits known and
// different, the way to see what changed: git log in the Mendix project, locally, read-only.
function versionLines(model, modelCommit, describedAt, describedCommit, since) {
  const out = ['model: ' + (model || 'version unknown')];
  if (describedAt) {
    out.push('described at: ' + describedAt);
    if (since) out.push('since then: ' + since);
    if (modelCommit && describedCommit && modelCommit !== describedCommit) {
      out.push('what changed: in the Mendix project directory, git log --oneline ' + describedCommit.slice(0, 12) + '..' + modelCommit.slice(0, 12) +
        ' — local and read-only (never fetch or pull); combine it with check-descriptions.js todo, and describe only what changed');
    }
  }
  return out;
}
// The project's language of written content, as MxScout names it: "pl" → "Polish (pl)".
const NAMES = { en: 'English', pl: 'Polish', de: 'German', nl: 'Dutch', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese', cs: 'Czech', sk: 'Slovak', sv: 'Swedish', da: 'Danish', nb: 'Norwegian', fi: 'Finnish', hu: 'Hungarian', ro: 'Romanian', uk: 'Ukrainian', lt: 'Lithuanian' };
function languageLine(code) {
  return code ? 'language: ' + (NAMES[code] || code) + ' (' + code + ') — write everything in it; do not ask again'
    : 'language: not set yet — ask the person once "In which language should I write? (default: English)"; the answer is kept for the project';
}

// ---------- the folder ----------
function inFolder() {
  const read = (f, need) => {
    const p = path.join(folder, f);
    if (!fs.existsSync(p)) { if (need) fail('No ' + f + ' in ' + folder + (f === 'ai-pack.md' ? ' — open the project in MxScout once: it writes ai-pack.md while the project is open.' : '.')); return null; }
    return fs.readFileSync(p, 'utf8');
  };
  let project;
  try { project = JSON.parse(read('project.json', true)); } catch (e) { fail('project.json in ' + folder + ' is not valid JSON.'); }
  if (!project || project.format !== 'mxscout-project') fail(folder + ' is not an MxScout project folder (its project.json does not say "format": "mxscout-project").');
  if (project.layout > LAYOUT) fail(folder + ' was written by a newer MxScout (layout ' + project.layout + '); update the skill.');

  if (cmd === 'status') {
    const pack = read('ai-pack.md', false), docs = read('documentation.md', false);
    console.log('project: ' + project.name + (project.model && project.model.mendix ? ' (Mendix ' + project.model.mendix + ')' : '') + ' — folder ' + folder);
    console.log(languageLine(project.contentLanguage || null));
    const modules = pack ? parseIndex(pack.split('\n')) : null;
    const v = project.model && project.model.version;
    versionLines(header(pack || '', 'model') || (v && v.commit ? (v.branch ? v.branch + ' @ ' : '') + v.short : null), header(pack || '', 'model commit') || (v && v.commit) || null,
      header(docs || '', 'described at'), header(docs || '', 'described commit'), header(docs || '', 'since then')).forEach((l) => console.log(l));
    if (modules) {
      console.log('pack: ai-pack.md' + (header(pack, 'generated') ? ' · model read ' + header(pack, 'generated') : ''));
      console.log('module | lines | microflows | nanoflows | pages | entities');
      modules.forEach((m) => console.log(m.name + ' | ' + m.from + '-' + m.to + ' | ' + m.microflows + ' | ' + m.nanoflows + ' | ' + m.pages + ' | ' + m.entities));
    } else console.log('pack: none yet — open the project in MxScout once; it writes ai-pack.md while the project is open.');
    const described = /^(\d+) of (\d+)$/.exec(header(docs || '', 'flows described') || '');
    if (docs && described && Number(described[1]) > 0) {
      const stale = parseInt(header(docs, 'out of date') || '0', 10) || 0;
      console.log('documentation: yes — ' + described[1] + ' of ' + described[2] + ' flows described, ' + (stale ? stale + ' out of date (the flow changed since)' : 'none out of date') + '. Read it first: ' + path.join(folder, 'documentation.md'));
    } else console.log('documentation: none yet — this project has no descriptions; the pack is all there is.');
    console.log('descriptions: ' + (fs.existsSync(path.join(folder, 'descriptions.json')) ? path.join(folder, 'descriptions.json') + ' (for check-descriptions.js todo --folder)' : 'none yet'));
    const ib = path.join(folder, 'inbox');
    const waiting = fs.existsSync(ib) ? fs.readdirSync(ib).filter((f) => /\.json$/i.test(f) && f[0] !== '.') : [];
    console.log('inbox: ' + (waiting.length ? waiting.length + ' file(s) waiting for MxScout to take them: ' + waiting.join(', ') + ' — MxScout takes them while the project is open in it' : 'empty'));
  } else if (cmd === 'docs') {
    const docs = read('documentation.md', false);
    if (!docs) { console.log('No documentation.md yet: open the project in MxScout once. The AI pack is all there is — read it by module.'); return; }
    if (out) { fs.writeFileSync(out, docs); console.log('Wrote ' + out + ' (' + docs.split('\n').length + ' lines) — what an agent understood earlier; verify against the pack.'); } else process.stdout.write(docs);
  } else if (cmd === 'module' && arg) {
    const pack = read('ai-pack.md', true);
    const lines = pack.split('\n');
    const mod = (parseIndex(lines) || []).find((m) => m.name === arg);
    if (!mod) fail('No module ' + arg + ' in ' + path.join(folder, 'ai-pack.md') + ' (its ## index lists the modules).');
    const text = lines.slice(mod.from - 1, mod.to).join('\n') + '\n';
    if (out) { fs.writeFileSync(out, text); console.log('Wrote ' + out + ' (' + text.split('\n').length + ' lines).'); } else process.stdout.write(text);
  } else if (cmd === 'pack' && arg) {
    fs.writeFileSync(arg, read('ai-pack.md', true));
    console.log('Wrote ' + arg + ' — for the checker, not for reading whole. (The folder\'s own ' + path.join(folder, 'ai-pack.md') + ' does as well.)');
  } else if (cmd === 'send' && arg) {
    let body;
    try { body = fs.readFileSync(arg, 'utf8'); } catch (e) { fail('Cannot read ' + arg + '.'); }
    let json;
    try { json = JSON.parse(body); } catch (e) { fail('Cannot read ' + arg + ' as JSON.'); }
    if (!json || json.format !== 'mxscout-descriptions') fail(arg + ' is not a descriptions file (it should say "format": "mxscout-descriptions").');
    const ib = path.join(folder, 'inbox');
    fs.mkdirSync(ib, { recursive: true });
    // Written whole: a hidden temporary file first, renamed into place — MxScout never reads half of it.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.basename(arg).replace(/\.json$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60) || 'descriptions';
    const name = stamp + '-' + base + '.json';
    const tmp = path.join(ib, '.' + name + '.tmp');
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, path.join(ib, name));
    console.log('Written to ' + path.join(ib, name) + '. MxScout takes it while the project is open — saved at once, with Undo, unless the person turned that off, or it is a whole file that would replace the descriptions kept: then it waits for them to press Import them.');
  } else usage();
}

// ---------- the channel ----------
function viaChannel() {
  const base = String(urlArg || process.env.MXSCOUT_URL || 'http://127.0.0.1:4288').replace(/\/+$/, '');
  const token = tokenArg || process.env.MXSCOUT_TOKEN;
  let host;
  try { host = new URL(base).hostname; } catch (e) { fail('Not an address: ' + base); }
  if (host !== '127.0.0.1' && host !== 'localhost') fail('Refusing ' + base + ': MxScout is on this machine, at 127.0.0.1.');
  if (!token) fail('No project folder and no token. Give the MxScout project folder (--folder <dir>, or run this inside it) — or, for the channel: in MxScout, Documentation → Agent channel → Share with an agent → Copy for the agent, then set MXSCOUT_TOKEN (or pass --token).');
  const waitMs = Number(process.env.MXSCOUT_TIMEOUT_MS) > 0 ? Number(process.env.MXSCOUT_TIMEOUT_MS) : 30000;
  const gaveUp = () => 'MxScout at ' + base + ' did not answer within ' + (waitMs / 1000) + ' s — is it busy, or stopped? (MXSCOUT_TIMEOUT_MS sets the wait.)';

  async function call(p, opts, quiet) {
    // Given up after waitMs, the answer's body included; the timer does not keep a finished command waiting.
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), waitMs).unref();
    let res;
    try { res = await fetch(base + p, Object.assign({ headers: { Authorization: 'Bearer ' + token } }, opts, { redirect: 'error', signal: ctl.signal })); }
    catch (e) {
      if (ctl.signal.aborted) fail(gaveUp());
      // MxScout never redirects; whatever does is not MxScout, and the token does not follow it.
      if (/redirect/i.test(String((e && e.cause && e.cause.message) || (e && e.message) || ''))) fail('Refusing a redirect from ' + base + p + ': the token goes to MxScout on this machine only.');
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

  return (async function () {
    if (cmd === 'status') {
      const s = await (await call('/api/agent/status')).json();
      console.log('project: ' + s.project + (s.mendix ? ' (Mendix ' + s.mendix + ')' : ''));
      console.log(languageLine(s.language || null));
      // The commits themselves are in the documentation's header (node agent.js docs): model commit, described commit.
      versionLines(s.model || null, null, s.documentation && s.documentation.describedAt, null, null).forEach((l) => console.log(l));
      if (s.documentation && s.documentation.describedAt) console.log('the commits, and what moved since: the header of node agent.js docs (model commit, described commit, since then)');
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
    } else usage();
  })().catch((e) => fail(e && e.name === 'AbortError' ? gaveUp() : 'agent.js: ' + ((e && e.message) || e)));
}

function usage() {
  console.error('Usage: node agent.js status | docs [--out file] | module <Name> [--out file] | pack <file> | send <descriptions.json>\n' +
    '  in a project folder: --folder <dir> (or MXSCOUT_FOLDER, or run it inside the folder)\n' +
    '  through the agent channel: MXSCOUT_TOKEN, MXSCOUT_URL (or --token T, --url U)');
  process.exit(2);
}

if (folder) {
  if (!fs.existsSync(path.join(folder, 'project.json'))) fail('No project.json in ' + folder + ' — that is not an MxScout project folder. In MxScout: Documentation → Folder shows where the project is kept.');
  inFolder();
} else viaChannel();
