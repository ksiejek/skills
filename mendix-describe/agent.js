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
 *     Or the project is kept INSIDE the Mendix project, in mxscout/, and shared through the app's own git
 *     (layout 2): mxscout.json, descriptions/ (small files), docs/ (Markdown), AGENTS.md — committed — and
 *     .local/ with documentation.md, ai-pack.md, inbox/ and assist/ — this machine only. --folder takes the
 *     Mendix project's directory or its mxscout/; run inside either and it finds mxscout/. There, `write`
 *     puts the descriptions straight into descriptions/ (MxScout need not be open; when it is, it takes
 *     them within seconds, with Undo) and stamps them with the commit HEAD names; `send` still hands a file
 *     to .local/inbox/. This never runs git: committing mxscout/ is the person's.
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
 *   node agent.js write <descriptions.json> inside the Mendix project only: the descriptions written into
 *                                           mxscout/descriptions/ directly ("add": true lays them over what is there)
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

const LAYOUT = 2;
function readProject(file) {
  try { const p = JSON.parse(fs.readFileSync(file, 'utf8')); return p && p.format === 'mxscout-project' ? p : null; } catch (e) { return null; }
}
function isProjectFolder(dir) { return !!readProject(path.join(dir, 'project.json')) || !!readProject(path.join(dir, 'mxscout.json')); }
// A Mendix project's directory with MxScout's files in it: its mxscout/.
function inRepo(dir) { return readProject(path.join(dir, 'mxscout', 'mxscout.json')) ? path.join(dir, 'mxscout') : null; }
// The folder: given, or the one this runs in (or above it) when no token says "the channel".
function findFolder() {
  if (folderArg) {
    const given = path.resolve(folderArg.replace(/^~(?=$|\/)/, process.env.HOME || '~'));
    return inRepo(given) || given;
  }
  if (tokenArg || process.env.MXSCOUT_TOKEN) return null;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (isProjectFolder(dir)) return dir;
    if (inRepo(dir)) return inRepo(dir);
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const folder = findFolder();
// Layout 2: mxscout/ inside the Mendix project. What stays on this machine is in its .local/.
const repo = !!(folder && readProject(path.join(folder, 'mxscout.json')));
const local = folder ? (repo ? path.join(folder, '.local') : folder) : null;

// ---------- layout 2: the files MxScout writes, the same way (repodocs.js, MxScout's own) ----------
function repoDocs() {
  const vm = require('vm');
  const ctx = { console, TextEncoder, crypto: require('crypto').webcrypto };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'repodocs.js'), 'utf8'), ctx, { filename: 'repodocs.js' });
  return ctx.MxRepoDocs;
}
function descriptionFiles() {
  const dir = path.join(folder, 'descriptions'), out = [];
  (function walk(d, rel) {
    let names = [];
    try { names = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    names.forEach((n) => {
      if (n.name[0] === '.') return;
      if (n.isDirectory()) walk(path.join(d, n.name), rel + n.name + '/');
      else if (/\.json$/i.test(n.name)) out.push({ path: 'descriptions/' + rel + n.name, text: fs.readFileSync(path.join(d, n.name), 'utf8') });
    });
  })(dir, '');
  return out.sort((a, b) => (a.path < b.path ? -1 : 1));
}
// Which commit the Mendix project's HEAD names, read from its .git as files (no git program): { commit, short,
// branch, date, message } — the date and message from the reflog's line for it, when there is one.
function gitHead(repoDir) {
  let git = path.join(repoDir, '.git');
  try {
    if (fs.statSync(git).isFile()) { const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(git, 'utf8')); if (!m) return null; git = path.resolve(repoDir, m[1].trim()); }
    const head = fs.readFileSync(path.join(git, 'HEAD'), 'utf8').trim();
    const ref = /^ref:\s*(refs\/\S+)$/.exec(head);
    let commit = ref ? null : head;
    if (ref) {
      const common = fs.existsSync(path.join(git, 'commondir')) ? path.resolve(git, fs.readFileSync(path.join(git, 'commondir'), 'utf8').trim()) : git;
      try { commit = fs.readFileSync(path.join(common, ref[1]), 'utf8').trim(); } catch (e) {
        try { const l = fs.readFileSync(path.join(common, 'packed-refs'), 'utf8').split('\n').find((x) => x.endsWith(' ' + ref[1])); commit = l ? l.split(' ')[0] : null; } catch (e2) { commit = null; }
      }
    }
    if (!/^[0-9a-f]{40,64}$/.test(commit || '')) return null;
    let date = null, message = null;
    try {
      const lines = fs.readFileSync(path.join(git, 'logs', 'HEAD'), 'utf8').trim().split('\n').reverse();
      const hit = lines.map((l) => /^[0-9a-f]+ ([0-9a-f]+) .*? (\d+) [+-]\d{4}\t(.*)$/.exec(l)).find((m) => m && m[1] === commit);
      if (hit) { date = new Date(Number(hit[2]) * 1000).toISOString(); message = hit[3].replace(/^commit[^:]*:\s*/, '').slice(0, 200) || null; }
    } catch (e) { /* no reflog */ }
    return { commit, short: commit.slice(0, 7), branch: ref ? ref[1].replace(/^refs\/heads\//, '') : null, date, message };
  } catch (e) { return null; }
}
// Written whole: a hidden temporary file beside it, renamed into place — a reader never sees half of one.
function writeWhole(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), '.' + path.basename(file) + '.tmp');
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
// A descriptions file in the shape MxScout keeps it (describe.js toFile), so what MxScout reads back and
// writes again is the same file: a flow's sentence as { text, hash, story, notes }.
function shaped(f) {
  const out = { format: 'mxscout-descriptions', version: 1, project: f.project || null, language: f.language || null, by: f.by || null, written: f.written || null };
  const s = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  if (f.app && typeof f.app === 'object') {
    out.app = { summary: s(f.app.summary), story: s(f.app.story), audience: f.app.audience === undefined ? null : f.app.audience,
      processes: (Array.isArray(f.app.processes) ? f.app.processes : []).filter((p) => p && s(p.name)).map((p) => ({ name: s(p.name), summary: s(p.summary), story: s(p.story),
        steps: Array.isArray(p.steps) ? p.steps : [], flows: Array.isArray(p.flows) ? p.flows : [], diagram: Array.isArray(p.diagram) ? p.diagram : [] })) };
  }
  ['modules', 'microflows', 'nanoflows', 'pages', 'entities'].forEach((k) => {
    out[k] = {};
    Object.keys(f[k] || {}).sort().forEach((q) => {
      const v = f[k][q];
      const text = typeof v === 'string' ? s(v) : v && typeof v === 'object' ? s(v.text) || s(v.summary) : null;
      const obj = v && typeof v === 'object' ? v : {};
      if (text || obj.notes) out[k][q] = { text, hash: s(obj.hash), story: s(obj.story), notes: Array.isArray(obj.notes) ? obj.notes : null };
    });
  });
  if (f.c4) out.c4 = f.c4;
  // MxScout Dev keeps a risk's id (reference/risk-levels.md): the triage follows a risk by it.
  out.risks = Array.isArray(f.risks) ? f.risks.map((r) => ({ id: typeof r.id === 'string' ? r.id : null, level: r.level, title: s(r.title), detail: s(r.detail), fix: s(r.fix), theme: r.theme || null, where: Array.isArray(r.where) ? r.where : [] })) : [];
  if (f.context) out.context = f.context;
  return out;
}

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
  // documentation.md, ai-pack.md and inbox/ are in .local/ inside the Mendix project (layout 2).
  const read = (f, need) => {
    const p = path.join(/^(documentation\.md|ai-pack\.md)$/.test(f) ? local : folder, f);
    if (!fs.existsSync(p)) { if (need) fail('No ' + (repo && f !== 'mxscout.json' ? '.local/' : '') + f + ' in ' + folder + (f === 'ai-pack.md' ? ' — open the project in MxScout once on this machine: it writes ' + (repo ? '.local/' : '') + 'ai-pack.md while the project is open.' : '.')); return null; }
    return fs.readFileSync(p, 'utf8');
  };
  const pjName = repo ? 'mxscout.json' : 'project.json';
  let project;
  try { project = JSON.parse(read(pjName, true)); } catch (e) { fail(pjName + ' in ' + folder + ' is not valid JSON' + (/^[<=>]{7}/m.test(read(pjName, false) || '') ? ' — it has a git conflict; resolve it first.' : '.')); }
  if (!project || project.format !== 'mxscout-project') fail(folder + ' is not an MxScout project folder (its ' + pjName + ' does not say "format": "mxscout-project").');
  if (project.layout > LAYOUT) fail(folder + ' was written by a newer MxScout (layout ' + project.layout + '); update the skill.');
  const inbox = path.join(local, 'inbox');
  if (repo) return inRepoFolder(project, read, inbox);

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
    const waiting = fs.existsSync(inbox) ? fs.readdirSync(inbox).filter((f) => /\.json$/i.test(f) && f[0] !== '.') : [];
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
    sendTo(inbox);
  } else usage();
}
// A descriptions (or Assist) file into the inbox MxScout reads while the project is open.
function sendTo(ib) {
  {
    let body;
    try { body = fs.readFileSync(arg, 'utf8'); } catch (e) { fail('Cannot read ' + arg + '.'); }
    let json;
    try { json = JSON.parse(body); } catch (e) { fail('Cannot read ' + arg + ' as JSON.'); }
    if (!json || json.format !== 'mxscout-descriptions') fail(arg + ' is not a descriptions file (it should say "format": "mxscout-descriptions").');
    fs.mkdirSync(ib, { recursive: true });
    // Written whole: a hidden temporary file first, renamed into place — MxScout never reads half of it.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.basename(arg).replace(/\.json$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60) || 'descriptions';
    const name = stamp + '-' + base + '.json';
    const tmp = path.join(ib, '.' + name + '.tmp');
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, path.join(ib, name));
    console.log('Written to ' + path.join(ib, name) + '. MxScout takes it while the project is open — saved at once, with Undo, unless the person turned that off, or it is a whole file that would replace the descriptions kept: then it waits for them to press Import them.');
  }
}

// ---------- layout 2: inside the Mendix project ----------
function inRepoFolder(project, read, inbox) {
  const R = repoDocs();
  const repoDir = path.dirname(folder);
  const head = gitHead(repoDir);
  const parts = descriptionFiles();
  const conflicted = parts.filter((p) => R.conflicted(p.text)).map((p) => p.path);
  const at = project.describedAt && project.describedAt.commit ? project.describedAt : null;
  if (cmd === 'status') {
    const pack = read('ai-pack.md', false), docs = read('documentation.md', false);
    console.log('project: ' + project.name + ' — kept in the Mendix project, ' + folder + ' (layout 2: mxscout/ is committed with the app; .local/ is this machine\'s)');
    console.log(languageLine(project.contentLanguage || null));
    console.log('model in the repository: ' + (head ? (head.branch ? head.branch + ' @ ' : '') + head.short + (head.message ? ' · ' + head.message : '') : 'unknown — no readable .git beside mxscout/'));
    if (!parts.length) console.log('descriptions: none yet in mxscout/descriptions/');
    else if (conflicted.length) console.log('descriptions: GIT CONFLICT in ' + conflicted.join(', ') + ' — resolve it (or keep one side in MxScout) before anything else');
    else if (!at) console.log('descriptions: ' + parts.length + ' files in mxscout/descriptions/, describing a version that is not known');
    else if (head && head.commit === at.commit) console.log('descriptions: describe HEAD (' + at.short + ') — up to date. Nothing to update unless the person asks for more.');
    else console.log('descriptions: describe ' + at.short + (at.date ? ' (' + at.date.slice(0, 10) + ')' : '') + '; HEAD is ' + (head ? head.short : 'unknown') +
      ' — what changed: git log --oneline ' + at.short + '..HEAD in ' + repoDir + ' (local, read-only); combine it with check-descriptions.js todo --folder and describe only that');
    let docsState = 'none yet';
    try {
      const man = JSON.parse(fs.readFileSync(path.join(folder, 'docs', 'manifest.json'), 'utf8'));
      docsState = man.descriptions ? 'made from ' + (man.described ? man.described.slice(0, 7) : 'an unknown version') : 'unknown';
    } catch (e) { docsState = fs.existsSync(path.join(folder, 'docs')) ? 'docs/manifest.json unreadable (a git conflict?) — MxScout writes docs/ again' : 'none yet'; }
    console.log('docs: ' + docsState + ' — committed Markdown, docs/index.md is the map; MxScout writes docs/ from the descriptions');
    if (pack) console.log('pack: .local/ai-pack.md' + (header(pack, 'model') ? ' · model ' + header(pack, 'model') : '') + (header(pack, 'generated') ? ' · read ' + header(pack, 'generated') : ''));
    else console.log('pack: none on this machine — open the project in MxScout once (it writes .local/ai-pack.md); until then read docs/ and the model in Studio Pro');
    const modules = pack ? parseIndex(pack.split('\n')) : null;
    if (modules) { console.log('module | lines | microflows | nanoflows | pages | entities'); modules.forEach((m) => console.log(m.name + ' | ' + m.from + '-' + m.to + ' | ' + m.microflows + ' | ' + m.nanoflows + ' | ' + m.pages + ' | ' + m.entities)); }
    if (docs) console.log('documentation: ' + path.join(local, 'documentation.md') + ' (the whole documentation; read it first, as the map)');
    const waiting = fs.existsSync(inbox) ? fs.readdirSync(inbox).filter((f) => /\.json$/i.test(f) && f[0] !== '.') : [];
    console.log('inbox: ' + (waiting.length ? waiting.length + ' file(s) waiting in .local/inbox/: ' + waiting.join(', ') : 'empty'));
    console.log('commit: MxScout never runs git. When the descriptions are updated, the person commits mxscout/ on its own ("Update documentation").');
  } else if (cmd === 'docs') {
    const docs = read('documentation.md', false);
    const text = docs || (fs.existsSync(path.join(folder, 'docs', 'index.md')) ? null : '');
    if (text === null) { console.log('No .local/documentation.md on this machine. Read ' + path.join(folder, 'docs', 'index.md') + ' — the map — and the files it links: the same documentation, by topic.'); return; }
    if (!text) { console.log('No documentation yet: this project has no descriptions. The AI pack is all there is — read it by module.'); return; }
    if (out) { fs.writeFileSync(out, text); console.log('Wrote ' + out + ' (' + text.split('\n').length + ' lines) — what an agent understood earlier; verify against the pack.'); } else process.stdout.write(text);
  } else if (cmd === 'module' && arg) {
    const pack = read('ai-pack.md', true);
    const lines = pack.split('\n');
    const mod = (parseIndex(lines) || []).find((m) => m.name === arg);
    if (!mod) fail('No module ' + arg + ' in .local/ai-pack.md (its ## index lists the modules).');
    const text = lines.slice(mod.from - 1, mod.to).join('\n') + '\n';
    if (out) { fs.writeFileSync(out, text); console.log('Wrote ' + out + ' (' + text.split('\n').length + ' lines).'); } else process.stdout.write(text);
  } else if (cmd === 'pack' && arg) {
    fs.writeFileSync(arg, read('ai-pack.md', true));
    console.log('Wrote ' + arg + ' — for the checker, not for reading whole.');
  } else if (cmd === 'send' && arg) {
    sendTo(inbox);
  } else if (cmd === 'write' && arg) {
    if (conflicted.length) fail('mxscout/' + conflicted[0] + ' has a git conflict: resolve it first (or keep one side in MxScout), then write.');
    let given;
    try { given = JSON.parse(fs.readFileSync(arg, 'utf8')); } catch (e) { fail('Cannot read ' + arg + ' as JSON.'); }
    if (!given || given.format !== 'mxscout-descriptions') fail(arg + ' is not a descriptions file (it should say "format": "mxscout-descriptions").');
    if (Array.isArray(given.tickets) || Array.isArray(given.changes)) console.log('Note: tickets and changes are not descriptions — the mendix-assist skill keeps them as Assist items. Left out.');
    const joined = R.join(parts, at);
    if (joined.error) fail(joined.error + ' — fix it before writing.');
    const merged = given.add === true && joined.value ? require('./check-descriptions.js').merge([joined.value, given]) : given;
    const file = shaped(merged);
    const next = R.split(file), now = {};
    let wrote = 0, removed = 0;
    next.forEach((p) => {
      now[p.path] = true;
      const full = path.join(folder, p.path);
      let was = null;
      try { was = fs.readFileSync(full, 'utf8'); } catch (e) { was = null; }
      if (was !== p.text) { writeWhole(full, p.text); wrote++; }
    });
    parts.forEach((p) => { if (!now[p.path]) { fs.unlinkSync(path.join(folder, p.path)); removed++; } });
    // mxscout.json: the version they describe is HEAD now; the language, when the file sets it.
    const lang = given.setLanguage === true && typeof given.language === 'string' ? given.language.trim().toLowerCase().slice(0, 20) : project.contentLanguage || null;
    const pj = R.projectJson({ id: project.id, name: project.name, contentLanguage: lang }, head);
    if (read('mxscout.json', false) !== pj) writeWhole(path.join(folder, 'mxscout.json'), pj);
    console.log('Wrote ' + wrote + ' file(s) in ' + path.join(folder, 'descriptions') + (removed ? ', removed ' + removed : '') + (wrote || removed ? '' : ' — nothing changed') +
      '; they describe ' + (head ? (head.branch ? head.branch + ' @ ' : '') + head.short : 'a version that is not known (no readable .git)') + '.');
    console.log('docs/ is made from them by MxScout: while the project is open in MxScout it takes them within seconds (with Undo) and writes docs/; otherwise ask the person to open it there once before committing, so the commit carries docs/ that match.');
    console.log('Then the person commits mxscout/ on its own: git add mxscout && git commit -m "Update documentation" (MxScout never runs git).');
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
  console.error('Usage: node agent.js status | docs [--out file] | module <Name> [--out file] | pack <file> | send <descriptions.json> | write <descriptions.json>\n' +
    '  in a project folder: --folder <dir> (or MXSCOUT_FOLDER, or run it inside the folder); inside a Mendix project: its directory or its mxscout/\n' +
    '  through the agent channel: MXSCOUT_TOKEN, MXSCOUT_URL (or --token T, --url U)');
  process.exit(2);
}

if (folder) {
  if (!fs.existsSync(path.join(folder, 'project.json')) && !repo) fail('No project.json or mxscout.json in ' + folder + ' — that is not an MxScout project folder, nor a Mendix project with MxScout\'s files in mxscout/. In MxScout: Documentation → Folder shows where the project is kept.');
  if (cmd === 'write' && !repo) fail('write is for a project kept inside the Mendix project (mxscout/); in a project folder of its own, use send — MxScout takes it from inbox/.');
  inFolder();
} else viaChannel();
