#!/usr/bin/env node
/* The mendix-describe skill's checker. No dependencies — Node only.
 *
 *   node check-descriptions.js todo  <pack.md> [descriptions.json] [--list]
 *       What is left to describe, per module: new flows, flows that changed
 *       since they were described (their fingerprint moved), whether the
 *       application overview is there, which modules have no long
 *       description yet, and whether risks and the developers' context are
 *       written. Run it first; describe only that.
 *
 *   node check-descriptions.js check <pack.md> <descriptions.json>
 *       Whether MxScout will accept the file, and whether it says what it
 *       should: the format, every name exists in the pack, every fingerprint
 *       matches, no description is empty or overlong, and the application,
 *       its processes and its modules each have both layers of
 *       reference/business-narrative.md; every risk has a level of
 *       reference/risk-levels.md, its places and a fix; every change (SKILL.md,
 *       "A change, when the person asks") has an id, how it works now traced
 *       through flows that exist, a proposal and model changes that name what
 *       is there, unless they add it; every ticket (skills/mendix-ticket-check)
 *       a verdict, its reasoning, evidence that names what is in the pack, and
 *       for a bug the change that fixes it. Exit code 1 on errors.
 *
 *   node check-descriptions.js merge <out.json> <part.json> [<part.json> …]
 *       One file from several, later parts winning per name (a change or a ticket per id) —
 *       for describing module by module, or in parallel, one part per batch.
 *
 * The format it checks is the one public/describe.js in MxScout parses. If the
 * two ever disagree, MxScout is the one that is right: it is what the person
 * imports the file into.
 */
'use strict';
const fs = require('fs');

const DESC_FORMAT = 'mxscout-descriptions';
const KINDS = { MF: 'microflows', NF: 'nanoflows', PG: 'pages' };
const TABLES = ['modules', 'microflows', 'nanoflows', 'pages', 'entities'];
// A summary is two to four sentences; a story is several paragraphs (reference/business-narrative.md).
const LIMITS = { flow: 400, entity: 300, module: 600, summary: 900, story: 12000, storyMin: 300 };

// ---------- reading the pack ----------
function readPack(text) {
  const lines = String(text).split(/\r?\n/);
  if (!/^format: mxscout-ai-pack 1\b/m.test(text)) throw new Error('This is not an MxScout AI pack (no "format: mxscout-ai-pack 1" line).');
  const pack = { project: null, modules: {}, microflows: {}, nanoflows: {}, pages: {}, entities: {}, triage: [] };
  const project = /^project: (.+)$/m.exec(text);
  pack.project = project ? project[1].trim() : null;
  let module = null, inTriage = false;
  lines.forEach((line, i) => {
    // What a person decided about risks (reference/pack-format.md, "Risk triage"): id | level | status | who | title …
    if (line === '## risk triage') { inTriage = true; return; }
    if (/^## /.test(line)) inTriage = false;
    if (inTriage) {
      const t = /^- (\S+) \| (P[123]) \| ([a-z-]+) \| (ai|raised by [^|]*?) \| ([^|]*?)(?: \| where: [^|]*)?(?: \| note: (.*))?$/.exec(line);
      if (t) pack.triage.push({ id: t[1], level: t[2], status: t[3], person: t[4] !== 'ai', title: t[5], note: t[6] || null });
      return;
    }
    let m = /^## module (\S+)/.exec(line);
    if (m) { module = m[1]; pack.modules[module] = { line: i + 1, flows: 0 }; return; }
    m = /^### (MF|NF|PG) (\S+) #([0-9a-f]{8})/.exec(line);
    if (m) { pack[KINDS[m[1]]][m[2]] = { hash: m[3], module, line: i + 1 }; if (m[1] !== 'PG' && module) pack.modules[module].flows++; return; }
    m = /^E (\S+) #([0-9a-f]{8})/.exec(line);
    if (m && module) pack.entities[module + '.' + m[1]] = { hash: m[2], module, line: i + 1 };
  });
  return pack;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new Error(file + ': ' + e.message); }
}
// A flow's description is a string or { text }; a module's is a string or { summary, story }.
function textOf(v) {
  if (typeof v === 'string') return v;
  if (!v || typeof v !== 'object') return null;
  return typeof v.text === 'string' ? v.text : typeof v.summary === 'string' ? v.summary : null;
}
function storyOf(v) { return v && typeof v === 'object' && typeof v.story === 'string' && v.story.trim() ? v.story : null; }
// The layers are plain prose: a blank line between paragraphs, and nothing a renderer would have to read
// as markup — it is shown as text, so a list or a heading would arrive as stray characters.
function markupIn(text) {
  return /^\s*(?:[-*•]\s|#{1,6}\s|\d+[.)]\s|\|)|\*\*|<\/?[a-z][^>]*>|\]\(/im.test(text);
}
function hashOf(v) { return v && typeof v === 'object' && typeof v.hash === 'string' ? v.hash : null; }

// ---------- todo ----------
function todo(pack, desc) {
  desc = desc || {};
  const per = {};
  Object.keys(pack.modules).forEach((m) => { per[m] = { module: m, line: pack.modules[m].line, fresh: [], changed: [] }; });
  ['microflows', 'nanoflows'].forEach((kind) => {
    Object.keys(pack[kind]).forEach((qn) => {
      const p = pack[kind][qn];
      const d = (desc[kind] || {})[qn];
      const row = per[p.module];
      if (!row) return;
      if (!textOf(d)) row.fresh.push(qn);
      else if (hashOf(d) !== p.hash) row.changed.push(qn);
    });
  });
  const modules = Object.keys(per).map((k) => per[k]).filter((r) => r.fresh.length + r.changed.length);
  const missingModules = Object.keys(pack.modules).filter((m) => !textOf((desc.modules || {})[m]));
  const shortModules = Object.keys(pack.modules).filter((m) => textOf((desc.modules || {})[m]) && !storyOf((desc.modules || {})[m]));
  const app = desc.app && typeof desc.app === 'object' ? desc.app : null;
  // Notes on a module (reference/module-notes.md): wanted for a module that has flows.
  const noNotes = Object.keys(pack.modules).filter((m) => {
    const v = (desc.modules || {})[m];
    return !(v && typeof v === 'object' && Array.isArray(v.notes) && v.notes.length);
  });
  return {
    modules: modules,
    flows: modules.reduce((n, r) => n + r.fresh.length + r.changed.length, 0),
    overview: !(app && typeof app.summary === 'string' && app.summary.trim()),
    overviewStory: !!app && !storyOf(app),
    missingModules: missingModules,
    shortModules: shortModules,
    risks: !Array.isArray(desc.risks),
    context: !(desc.context && typeof desc.context === 'object'),
    noNotes: noNotes,
    c4: !(desc.c4 && typeof desc.c4 === 'object' && (desc.c4.context || desc.c4.containers)),
    // Risk triage (SKILL.md): fixed risks to check again, false positives not to raise again, a person's fixed risks to answer in "verify".
    recheck: pack.triage.filter((r) => !r.person && r.status === 'fixed').map((r) => r.id),
    falsePositives: pack.triage.filter((r) => !r.person && r.status === 'false-positive').map((r) => r.id),
    verify: pack.triage.filter((r) => r.person && r.status === 'fixed').map((r) => r.id)
  };
}

// ---------- check ----------
function check(pack, desc) {
  const problems = [];
  const err = (text) => problems.push({ level: 'error', text });
  const warn = (text) => problems.push({ level: 'warning', text });
  // The two layers of reference/business-narrative.md, on the application, a process or a module.
  // min: the fewest words a story of this kind should have (reference/business-narrative.md, "Where the two layers apply").
  function layers(what, v, min) {
    const summary = typeof v === 'string' ? v : v && typeof v.summary === 'string' ? v.summary : null;
    const story = storyOf(v);
    if (summary && summary.length > LIMITS.summary) warn(what + ': the summary is ' + summary.length + ' characters — a summary is two to four sentences; the rest belongs in "story".');
    if (summary && markupIn(summary)) warn(what + ': the summary carries markup or a list — it is shown as plain text.');
    if (!story) { warn(what + ': no "story" — the long description is half of the business layer (reference/business-narrative.md).'); return; }
    const words = story.split(/\s+/).filter(Boolean).length;
    if (story.length < LIMITS.storyMin) warn(what + ': the story is ' + story.length + ' characters — a description is several paragraphs, not a second summary.');
    else if (min && words < min.words) warn(what + ': the story is ' + words + ' words — ' + min.why);
    if (story.length > LIMITS.story) warn(what + ': the story is ' + story.length + ' characters; aim for under ' + LIMITS.story + '.');
    if (markupIn(story)) warn(what + ': the story carries markup, a list or a heading — it is shown as text; write paragraphs, a blank line between them.');
  }
  // Notes on a module: sections of text, lines and one small table (reference/module-notes.md).
  function notes(what, list) {
    if (!Array.isArray(list)) { err(what + ': "notes" must be a list of sections.'); return; }
    if (list.length > 16) warn(what + ': ' + list.length + ' sections — MxScout keeps the first 16.');
    list.forEach((s, i) => {
      const w = what + ' notes[' + i + ']' + (s && typeof s.title === 'string' ? ' "' + s.title + '"' : '');
      if (!s || typeof s !== 'object' || typeof s.title !== 'string' || !s.title.trim()) { err(w + ': a section needs a "title" — MxScout drops it otherwise.'); return; }
      const t = s.table;
      const hasTable = t && typeof t === 'object' && Array.isArray(t.columns) && t.columns.length && Array.isArray(t.rows) && t.rows.length;
      if (!(typeof s.text === 'string' && s.text.trim()) && !(Array.isArray(s.items) && s.items.length) && !hasTable) warn(w + ': nothing in it — "text", "items" or a "table"; MxScout drops an empty section.');
      if (s.items !== undefined && (!Array.isArray(s.items) || s.items.some((x) => typeof x !== 'string'))) err(w + ': "items" must be a list of sentences.');
      if (t !== undefined) {
        if (!t || typeof t !== 'object' || !Array.isArray(t.columns) || !Array.isArray(t.rows)) err(w + ': a "table" needs "columns" and "rows" (lists).');
        else {
          if (t.columns.length > 6) warn(w + ': ' + t.columns.length + ' columns — MxScout keeps six.');
          t.rows.forEach((r, j) => { if (!Array.isArray(r)) err(w + ' row ' + j + ' is not a list of cells.'); else if (r.length !== t.columns.length) warn(w + ' row ' + j + ' has ' + r.length + ' cells for ' + t.columns.length + ' columns.'); });
        }
      }
    });
  }
  // The architecture (reference/c4.md): nodes and links; MxScout drops a link to a node that is not there.
  const C4_KINDS = ['person', 'system', 'app', 'store', 'part'];
  function diagram(what, d) {
    if (d === undefined) return;
    if (!d || typeof d !== 'object' || !Array.isArray(d.nodes) || !d.nodes.length) { err(what + ': needs a non-empty "nodes" list.'); return; }
    // Bounds sized on a large application (a large application, 2026-10-14: a dozen systems around it, five groups
    // of people, the runtime's parts) with room to spare — the import keeps this many and drops the rest.
    if (d.nodes.length > 100) warn(what + ': ' + d.nodes.length + ' nodes — MxScout keeps 100; group like systems together.');
    if (Array.isArray(d.links) && d.links.length > 250) warn(what + ': ' + d.links.length + ' links — MxScout keeps 250.');
    const ids = {};
    d.nodes.forEach((n, i) => {
      const w = what + ' nodes[' + i + ']';
      if (!n || typeof n.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(n.id) || typeof n.name !== 'string' || !n.name.trim()) { err(w + ': "id" (letters, digits, _ and -) and "name" are required — MxScout drops the node.'); return; }
      if (ids[n.id]) err(w + ': id "' + n.id + '" is used twice.');
      ids[n.id] = true;
      if (n.kind !== undefined && C4_KINDS.indexOf(n.kind) === -1) warn(w + ': kind "' + n.kind + '" is not one of ' + C4_KINDS.join(', ') + ' — drawn as a system.');
    });
    (Array.isArray(d.links) ? d.links : []).forEach((l, i) => {
      if (!l || !ids[l.from] || !ids[l.to] || l.from === l.to) warn(what + ' links[' + i + ']: "from" and "to" must be two different node ids — MxScout drops the link.');
    });
  }
  // A process's simplified diagram, and a change's two (reference/descriptions-format.md, "diagram"):
  // steps, decisions with their ways, ends. `who` names what it belongs to in the messages.
  function flowDiagram(who, diagram, name) {
    let decisions = 0;
    const walk = (list, where) => {
      if (!Array.isArray(list)) { err(who + ': ' + where + ' must be a list.'); return; }
      list.forEach((x, i) => {
        const w = where + '[' + i + ']';
        if (x && typeof x.decision === 'string' && x.decision.trim()) {
          decisions++;
          if (!Array.isArray(x.ways) || x.ways.length < 2) warn(who + ': ' + w + ' is a decision with fewer than two ways.');
          (Array.isArray(x.ways) ? x.ways : []).forEach((y, j) => { if (y && y.then !== undefined) walk(y.then, w + '.ways[' + j + '].then'); });
        } else if (!(x && ((typeof x.step === 'string' && x.step.trim()) || (typeof x.end === 'string' && x.end.trim())))) {
          err(who + ': ' + w + ' is neither a "step", a "decision" nor an "end" — MxScout drops it.');
        }
      });
    };
    walk(diagram, name);
    const texts = {};
    (function names(list) { (Array.isArray(list) ? list : []).forEach((x) => { if (x && typeof x.step === 'string') texts[x.step.trim()] = true; if (x && Array.isArray(x.ways)) x.ways.forEach((y) => names(y && y.then)); }); })(diagram);
    (function joins(list) { (Array.isArray(list) ? list : []).forEach((x) => { if (x && Array.isArray(x.ways)) x.ways.forEach((y) => { if (y && typeof y.join === 'string' && !texts[y.join.trim()]) warn(who + ': a way joins "' + y.join + '", which is no step of its ' + name + ' — drawn as if it rejoined the main path.'); joins(y && y.then); }); }); })(diagram);
    if (Array.isArray(diagram) && !decisions) warn(who + ': its ' + name + ' has no decision — a straight line, which the steps already say; leave the ' + name + ' out.');
  }
  if (!desc || typeof desc !== 'object') { err('The file is not a JSON object.'); return problems; }
  if (desc.format !== DESC_FORMAT) err('"format" must be "' + DESC_FORMAT + '" — MxScout refuses the file without it.');
  if (desc.version !== 1) err('"version" must be 1.');
  if (pack.project && desc.project && desc.project !== pack.project) warn('"project" is "' + desc.project + '" but the pack is for "' + pack.project + '".');
  TABLES.forEach((k) => {
    const table = desc[k];
    if (table === undefined) return;
    if (!table || typeof table !== 'object' || Array.isArray(table)) { err('"' + k + '" must be an object keyed by qualified name.'); return; }
    Object.keys(table).forEach((name) => {
      const v = table[name];
      const text = textOf(v);
      if (!text || !text.trim()) { err(k + ' ' + name + ': empty description.'); return; }
      const limit = k === 'modules' ? LIMITS.module : k === 'entities' ? LIMITS.entity : LIMITS.flow;
      if (text.length > limit) warn(k + ' ' + name + ': ' + text.length + ' characters; aim for under ' + limit + ' — it is shown in lists.');
      if (k === 'modules') {
        if (!pack.modules[name]) warn('modules ' + name + ': no such module in the pack.');
        layers('modules ' + name, v);
        if (v && typeof v === 'object' && v.notes !== undefined) notes('modules ' + name, v.notes);
        return;
      }
      const known = pack[k][name];
      if (!known) { err(k + ' ' + name + ': not in the pack — a misspelt or invented name never shows in MxScout.'); return; }
      if (k !== 'pages' && !hashOf(v)) warn(k + ' ' + name + ': no "hash" — copy the #fingerprint from the pack, or MxScout cannot tell when it goes out of date.');
      else if (hashOf(v) && hashOf(v) !== known.hash) warn(k + ' ' + name + ': hash ' + hashOf(v) + ' does not match the pack (' + known.hash + ') — the flow changed; describe it again.');
    });
  });
  // Risks by reference/risk-levels.md; MxScout drops a risk without a level or a title.
  const inPack = (qn) => !!(pack.microflows[qn] || pack.nanoflows[qn] || pack.pages[qn] || pack.entities[qn]);
  if (desc.risks !== undefined) {
    const ids = {};
    if (!Array.isArray(desc.risks)) err('"risks" must be a list.');
    else desc.risks.forEach((r, i) => {
      const what = 'risks[' + i + ']' + (r && typeof r.title === 'string' ? ' "' + r.title + '"' : '');
      if (!r || typeof r !== 'object') { err(what + ' is not an object.'); return; }
      // The id is how MxScout knows a risk again on the next update, and keeps what a person decided about it.
      if (r.id === undefined || r.id === null) warn(what + ': no "id" — give it a short slug (p1-anon-delete-ticket) and keep it on every update, or MxScout knows it only by its level and title.');
      else if (typeof r.id !== 'string' || !RISK_ID.test(r.id) || r.id.length > 80) err(what + ': "id" "' + r.id + '" must be a slug — lower-case letters, digits and single hyphens, at most 80 characters; MxScout drops it otherwise.');
      else if (ids[r.id]) err(what + ': id "' + r.id + '" is used by risks[' + ids[r.id].i + '] too — one id, one risk.');
      else ids[r.id] = { i: i };
      if (!/^P[123]$/.test(r.level)) err(what + ': "level" must be "P1", "P2" or "P3" — MxScout drops it otherwise.');
      if (typeof r.title !== 'string' || !r.title.trim()) err(what + ': no "title" — MxScout drops it.');
      if (typeof r.fix !== 'string' || !r.fix.trim()) warn(what + ': no "fix" — every risk says what to do (reference/risk-levels.md).');
      if (r.theme === undefined) warn(what + ': no "theme" — MxScout guesses the pattern from the title; name it (reference/risk-levels.md, Patterns).');
      else if (THEMES.indexOf(r.theme) === -1) warn(what + ': "theme" "' + r.theme + '" is not one of ' + THEMES.join(', ') + ' — MxScout drops it and guesses from the title.');
      const where = Array.isArray(r.where) ? r.where : [];
      if (!where.length) warn(what + ': no "where" — every risk names the flows, pages or entities it is in.');
      where.forEach((qn) => { if (!inPack(qn)) warn(what + ' names ' + qn + ', which is not in the pack — it shows as plain text, not a link.'); });
    });
  }
  // Risk triage (SKILL.md): a false positive comes back only with a reason; a person's risk is never the agent's to write.
  if (Array.isArray(desc.risks)) {
    const fp = {}, person = {};
    (pack.triage || []).forEach((r) => { if (r.person) person[r.id] = r; else if (r.status === 'false-positive') fp[r.id] = r; });
    desc.risks.forEach((r, i) => {
      if (!r || typeof r.id !== 'string') return;
      if (fp[r.id]) warn('risks[' + i + '] "' + r.id + '" was marked a false positive (' + (fp[r.id].note || 'no reason given') + ') — report it again only if the model changed so the reason no longer holds, and say why in its detail.');
      if (person[r.id]) err('risks[' + i + '] "' + r.id + '" is a risk a person raised — answer for it in "verify", not in "risks".');
    });
  }
  if (desc.verify !== undefined) {
    if (!Array.isArray(desc.verify)) err('"verify" must be a list of { "id", "still", "why" }.');
    else desc.verify.forEach((v, i) => {
      if (!v || typeof v.id !== 'string' || !/^c-[A-Za-z0-9_-]{1,80}$/.test(v.id) || typeof v.still !== 'boolean') err('verify[' + i + '] needs "id" (the c-… id from the pack\'s risk triage) and "still": true or false — MxScout drops it otherwise.');
      else if (pack.triage && pack.triage.length && !pack.triage.some((r) => r.person && r.id === v.id)) warn('verify[' + i + '] "' + v.id + '" is not a risk a person raised in this pack.');
    });
  }
  if (desc.context !== undefined) {
    const c = desc.context;
    if (!c || typeof c !== 'object' || Array.isArray(c)) err('"context" must be an object with "where", "conventions" and "pitfalls".');
    else {
      [['where', 'topic', 'place'], ['conventions', 'pattern', 'meaning']].forEach(([k, a, b]) => {
        if (c[k] === undefined) return;
        if (!Array.isArray(c[k])) { err('context.' + k + ' must be a list.'); return; }
        c[k].forEach((x, i) => { if (!x || typeof x[a] !== 'string' || typeof x[b] !== 'string') err('context.' + k + '[' + i + '] needs "' + a + '" and "' + b + '" — MxScout drops it otherwise.'); });
      });
      if (c.pitfalls !== undefined && (!Array.isArray(c.pitfalls) || c.pitfalls.some((p) => typeof p !== 'string'))) err('context.pitfalls must be a list of sentences.');
    }
  }
  if (desc.c4 !== undefined) {
    const c = desc.c4;
    if (!c || typeof c !== 'object' || Array.isArray(c)) err('"c4" must be an object with "context" and "containers".');
    else {
      if (!c.context && !c.containers) err('"c4" has neither "context" nor "containers" — MxScout drops it.');
      diagram('c4.context', c.context); diagram('c4.containers', c.containers);
      // The overview draws the context's groups around the application (reference/c4.md).
      if (c.context && Array.isArray(c.context.nodes)) {
        const g = {};
        c.context.nodes.forEach((n) => { if (n && n.group) g[n.group] = true; });
        if (Object.keys(g).length > 5) warn('c4.context has ' + Object.keys(g).length + ' groups — the overview draws five at most around the application; merge some.');
      }
      if (c.open !== undefined && (!Array.isArray(c.open) || c.open.some((x) => typeof x !== 'string'))) err('c4.open must be a list of sentences.');
    }
  }
  if (desc.app !== undefined) {
    const a = desc.app;
    if (!a || typeof a !== 'object') err('"app" must be an object.');
    else {
      // A file that adds (one more process, say) to what MxScout keeps leaves the application's own layers as they are.
      if (desc.add !== true || (Array.isArray(desc.replace) && desc.replace.indexOf('app') !== -1)) {
        if (typeof a.summary !== 'string' || !a.summary.trim()) warn('app.summary is empty — it is the first thing a business reader sees.');
        layers('app', a, { words: 300, why: 'the application\'s description is about 400–1,200 words: what it is for, who works in it, how a case goes, how it connects.' });
      }
      // Who uses it: groups of { who, what } (reference/descriptions-format.md); one sentence is still read.
      if (Array.isArray(a.audience)) {
        a.audience.forEach((u, i) => { if (!u || typeof u.who !== 'string' || !u.who.trim()) err('app.audience[' + i + '] has no "who" — MxScout drops the group.'); });
        if (a.audience.length > 30) warn('app.audience has ' + a.audience.length + ' groups — MxScout keeps 30.');
      } else if (typeof a.audience === 'string') warn('app.audience is one sentence — write it as a list of { "who", "what" }, so the overview can show each group on its own line.');
      else if (a.audience !== undefined) err('app.audience must be a list of { "who", "what" }.');
      (Array.isArray(a.processes) ? a.processes : []).forEach((p, i) => {
        if (!p || typeof p.name !== 'string' || !p.name.trim()) { err('app.processes[' + i + '] has no name.'); return; }
        layers('process "' + p.name + '"', p, { words: 150, why: 'a process follows one case stage by stage, about 200–400 words, naming statuses, roles and messages. Trace it through its flows (SKILL.md, step 4), do not summarise it.' });
        if (!Array.isArray(p.flows) || p.flows.length < 2) warn('process "' + p.name + '": ' + (Array.isArray(p.flows) ? p.flows.length : 0) + ' flow' + ((Array.isArray(p.flows) && p.flows.length === 1) ? '' : 's') + ' listed — a process is carried by the flows on its way; list each one you followed.');
        // Steps a reader follows, each saying who does what (reference/business-narrative.md, "A process"):
        // as many as the case has (Karol, 2026-10-14: a count here only cut real processes short).
        const steps = Array.isArray(p.steps) ? p.steps.filter((x) => typeof x === 'string' && x.trim()) : [];
        if (steps.length < 2) warn('process "' + p.name + '": ' + steps.length + ' step' + (steps.length === 1 ? '' : 's') + ' — a reader follows the case by its steps; write each one, naming who does what.');
        // The diagram, when there is one: steps, decisions with ways, ends (reference/descriptions-format.md).
        if (p.diagram !== undefined) flowDiagram('process "' + p.name + '"', p.diagram, 'diagram');
        const bare = steps.filter((x) => x.trim().split(/\s+/).length < 4);
        if (bare.length) warn('process "' + p.name + '": ' + bare.length + ' step' + (bare.length === 1 ? ' is a label' : 's are labels') + ' ("' + bare[0] + '") — write who does what, in one sentence.');
        (Array.isArray(p.flows) ? p.flows : []).forEach((qn) => {
          if (!pack.microflows[qn] && !pack.nanoflows[qn] && !pack.pages[qn]) warn('process "' + p.name + '" names ' + qn + ', which is not in the pack — it shows as plain text, not a link.');
        });
      });
    }
  }
  const flowInPack = (qn) => !!(pack.microflows[qn] || pack.nanoflows[qn] || pack.pages[qn]);
  // Whether a model change's or a ticket's target is in the pack: flows and pages by kind, an entity, and an
  // attribute or an association by the entity or module it belongs to. The other kinds the pack does not list.
  const targetInPack = (kind, qn) => {
    const parts = String(qn).split('.');
    if (kind === 'microflow' || kind === 'nanoflow' || kind === 'page') return !!pack[kind + 's'][qn];
    if (kind === 'entity') return !!pack.entities[qn];
    if (kind === 'attribute') return parts.length === 3 && !!pack.entities[parts[0] + '.' + parts[1]];
    if (kind === 'association') return !!pack.modules[parts[0]];
    return null;
  };
  // Changes (SKILL.md, "A change, when the person asks"): how it works now, traced like a process, and the
  // proposal with the model changes it needs. MxScout drops a change without a slug id or a title, and a
  // model change without a target or with an action other than add, change or remove.
  if (desc.changes !== undefined) {
    if (!Array.isArray(desc.changes)) err('"changes" must be a list.');
    else {
      if (desc.changes.length > 100) warn('"changes" has ' + desc.changes.length + ' entries — MxScout keeps 100.');
      const ids = {};
      desc.changes.forEach((c, i) => {
        const what = 'change ' + (c && typeof c.id === 'string' ? '"' + c.id + '"' : '[' + i + ']');
        if (!c || typeof c !== 'object') { err(what + ' is not an object.'); return; }
        if (typeof c.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)) err(what + ': "id" must be a slug — lower-case letters, digits and hyphens ("cancel-order") — MxScout drops the change otherwise.');
        else if (ids[c.id]) err(what + ': the id is used twice — MxScout keeps the first.');
        ids[c.id] = true;
        if (typeof c.title !== 'string' || !c.title.trim()) err(what + ': no "title" — MxScout drops the change.');
        if (typeof c.asked !== 'string' || !c.asked.trim()) warn(what + ': no "asked" — the request in the person\'s own words is what the page opens with.');
        if (c.status !== undefined && CHANGE_STATUS.indexOf(c.status) === -1) warn(what + ': "status" "' + c.status + '" is not one of ' + CHANGE_STATUS.join(', ') + ' — shown as proposed.');
        const now = c.now, pr = c.proposal;
        if (!now || typeof now !== 'object') err(what + ': "now" must be an object — how it works today is half of a change.');
        else {
          layers(what + ' now', now, { words: 120, why: 'how it works now follows one case through its flows, stage by stage, about 150–400 words (SKILL.md, "A change", step 2). Trace it, do not summarise it.' });
          const steps = Array.isArray(now.steps) ? now.steps.filter((x) => typeof x === 'string' && x.trim()) : [];
          if (steps.length < 2) warn(what + ' now: ' + steps.length + ' step' + (steps.length === 1 ? '' : 's') + ' — write each step of how it works today, naming who does what.');
          const flows = Array.isArray(now.flows) ? now.flows : [];
          if (!flows.length) warn(what + ' now: no flows listed — name the flows you followed; they become links.');
          flows.forEach((qn) => { if (!flowInPack(qn)) warn(what + ' now names ' + qn + ', which is not in the pack — it shows as plain text, not a link.'); });
          if (now.diagram !== undefined) flowDiagram(what + ' now', now.diagram, 'diagram');
        }
        if (!pr || typeof pr !== 'object') err(what + ': "proposal" must be an object — the solution is the other half of a change.');
        else {
          layers(what + ' proposal', pr, { words: 60, why: 'the proposal says in plain words how the solution works for the people using it.' });
          if (!Array.isArray(pr.steps) || !pr.steps.length) warn(what + ' proposal: no steps — write how the case goes once the change is made.');
          if (pr.diagram !== undefined) flowDiagram(what + ' proposal', pr.diagram, 'diagram');
          if (!Array.isArray(pr.changes) || !pr.changes.length) warn(what + ' proposal: no "changes" — list what to add, change or remove in the model.');
          else {
            if (pr.changes.length > 60) warn(what + ' proposal: ' + pr.changes.length + ' model changes — MxScout keeps 60.');
            pr.changes.forEach((x, j) => {
              const w = what + ' proposal.changes[' + j + ']';
              if (!x || typeof x !== 'object') { err(w + ' is not an object.'); return; }
              if (typeof x.target !== 'string' || !x.target.trim()) err(w + ': no "target" — MxScout drops it.');
              if (CHANGE_ACTIONS.indexOf(x.action) === -1) err(w + ': "action" must be one of ' + CHANGE_ACTIONS.join(', ') + ' — MxScout drops it otherwise.');
              if (CHANGE_KINDS.indexOf(x.kind) === -1) warn(w + ': "kind" "' + x.kind + '" is not one of ' + CHANGE_KINDS.join(', ') + ' — shown under other.');
              if (typeof x.what !== 'string' || !x.what.trim()) warn(w + ': no "what" — say in a sentence what the change is.');
              if (x.action !== 'add' && typeof x.target === 'string' && targetInPack(x.kind, x.target) === false) warn(w + ': ' + x.target + ' is not in the pack — to change or remove it, name it as the pack does; for something new the action is "add".');
            });
          }
        }
        const im = c.impact;
        if (im !== undefined) {
          if (!im || typeof im !== 'object') err(what + ': "impact" must be an object with "flows", "roles" and "data".');
          else (Array.isArray(im.flows) ? im.flows : []).forEach((qn) => { if (!flowInPack(qn)) warn(what + ' impact names ' + qn + ', which is not in the pack — it shows as plain text, not a link.'); });
        }
        if (c.risks !== undefined) {
          if (!Array.isArray(c.risks)) err(what + ': "risks" must be a list.');
          else c.risks.forEach((r, j) => {
            const w = what + ' risks[' + j + ']';
            if (!r || !/^P[123]$/.test(r.level)) err(w + ': "level" must be "P1", "P2" or "P3" — MxScout drops it otherwise.');
            if (!r || typeof r.title !== 'string' || !r.title.trim()) err(w + ': no "title" — MxScout drops it.');
            else if (typeof r.fix !== 'string' || !r.fix.trim()) warn(w + ': no "fix" — every risk says what to do.');
          });
        }
        if (c.open !== undefined && (!Array.isArray(c.open) || c.open.some((x) => typeof x !== 'string'))) err(what + ': "open" must be a list of questions.');
      });
    }
  }
  // Tickets (skills/mendix-ticket-check): a ticket reported on the application, checked against the model.
  // MxScout drops a ticket without an id, a title, a verdict it knows or a summary, and an evidence row
  // without a target; the rest it shows as it is, so the rest is a warning.
  if (desc.tickets !== undefined) {
    if (!Array.isArray(desc.tickets)) err('"tickets" must be a list.');
    else {
      if (desc.tickets.length > 200) warn('"tickets" has ' + desc.tickets.length + ' entries — MxScout keeps 200.');
      const ids = {};
      const changeIds = {};
      (Array.isArray(desc.changes) ? desc.changes : []).forEach((c) => { if (c && typeof c.id === 'string') changeIds[c.id] = true; });
      desc.tickets.forEach((t, i) => {
        const what = 'ticket ' + (t && typeof t.id === 'string' ? '"' + t.id + '"' : '[' + i + ']');
        if (!t || typeof t !== 'object') { err(what + ' is not an object.'); return; }
        if (typeof t.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(t.id.trim()) || t.id.length > 80) err(what + ': "id" must be the ticket\'s key as given ("PROJ-12") or a slug — letters, digits, dots, hyphens and underscores — MxScout drops the ticket otherwise.');
        else if (ids[t.id]) err(what + ': the id is used twice — MxScout keeps the first.');
        ids[t.id] = true;
        if (typeof t.title !== 'string' || !t.title.trim()) err(what + ': no "title" — MxScout drops the ticket.');
        if (TICKET_VERDICTS.indexOf(t.verdict) === -1) err(what + ': "verdict" must be one of ' + TICKET_VERDICTS.join(', ') + ' — MxScout drops the ticket otherwise.');
        if (t.confidence === undefined) warn(what + ': no "confidence" — shown as low; say how sure the model lets you be.');
        else if (CONFIDENCE.indexOf(t.confidence) === -1) warn(what + ': "confidence" "' + t.confidence + '" is not one of ' + CONFIDENCE.join(', ') + ' — shown as low.');
        if (typeof t.reported !== 'string' || !t.reported.trim()) warn(what + ': no "reported" — the ticket as it was pasted is what the page opens with.');
        else if (t.reported.length > 8000) warn(what + ': "reported" is ' + t.reported.length + ' characters — MxScout keeps 8,000.');
        if (typeof t.summary !== 'string' || !t.summary.trim()) err(what + ': no "summary" — the answer in one to three sentences; MxScout drops the ticket without it.');
        else {
          if (t.summary.length > LIMITS.summary) warn(what + ': the summary is ' + t.summary.length + ' characters — the answer in one to three sentences; the reasoning belongs in "story".');
          if (markupIn(t.summary)) warn(what + ': the summary carries markup or a list — it is shown as plain text.');
        }
        if (typeof t.story !== 'string' || !t.story.trim()) err(what + ': no "story" — the reasoning (what the ticket expects, what the model does, why that is or is not a fault) is what makes the verdict checkable.');
        else {
          const words = t.story.split(/\s+/).filter(Boolean).length;
          if (words < 80) warn(what + ': the story is ' + words + ' words — say what the ticket expects, what the model does instead, and why that is or is not a fault, with the names.');
          if (markupIn(t.story)) warn(what + ': the story carries markup, a list or a heading — it is shown as text; write paragraphs, a blank line between them.');
        }
        const tr = t.traced;
        if (tr !== undefined) {
          if (!tr || typeof tr !== 'object') err(what + ': "traced" must be an object with "steps", "flows" and "diagram".');
          else {
            (Array.isArray(tr.flows) ? tr.flows : []).forEach((qn) => { if (!flowInPack(qn)) warn(what + ' traced names ' + qn + ', which is not in the pack — it shows as plain text, not a link.'); });
            if (tr.diagram !== undefined) flowDiagram(what + ' traced', tr.diagram, 'diagram');
          }
        } else if (t.verdict !== 'cannot-tell') warn(what + ': no "traced" — show what the model does, the steps and the flows you followed.');
        const ev = Array.isArray(t.evidence) ? t.evidence : [];
        if (t.evidence !== undefined && !Array.isArray(t.evidence)) err(what + ': "evidence" must be a list.');
        else if (!ev.length && t.verdict !== 'cannot-tell') warn(what + ': no "evidence" — name the places in the model the verdict rests on; they become links.');
        if (ev.length > 60) warn(what + ': ' + ev.length + ' evidence rows — MxScout keeps 60.');
        ev.forEach((x, j) => {
          const w = what + ' evidence[' + j + ']';
          if (!x || typeof x !== 'object') { err(w + ' is not an object.'); return; }
          if (typeof x.target !== 'string' || !x.target.trim()) { err(w + ': no "target" — MxScout drops it.'); return; }
          if (CHANGE_KINDS.indexOf(x.kind) === -1) warn(w + ': "kind" "' + x.kind + '" is not one of ' + CHANGE_KINDS.join(', ') + ' — shown as other.');
          if (typeof x.what !== 'string' || !x.what.trim()) warn(w + ': no "what" — say what this place shows.');
          if (targetInPack(x.kind, x.target) === false) warn(w + ': ' + x.target + ' is not in the pack — name it as the pack does.');
        });
        const needs = t.needs;
        if (needs !== undefined && (!Array.isArray(needs) || needs.some((x) => typeof x !== 'string'))) err(what + ': "needs" must be a list of sentences.');
        if ((t.verdict === 'cannot-tell' || t.confidence === 'low') && !(Array.isArray(needs) && needs.length)) warn(what + ': ' + (t.verdict === 'cannot-tell' ? 'cannot tell' : 'low confidence') + ' and no "needs" — say what would settle it (logs, the data, the steps to reproduce, the deployed version).');
        if (t.reply !== undefined && typeof t.reply !== 'string') err(what + ': "reply" must be text.');
        if (t.change !== undefined) {
          if (typeof t.change !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.change)) err(what + ': "change" must be the id of a change — a slug, as the change has it; MxScout drops it otherwise.');
          else if (!changeIds[t.change]) warn(what + ': "change" is "' + t.change + '", which is not in this file — it links only if MxScout already keeps a change with that id.');
        } else if (t.verdict === 'bug') warn(what + ': a bug with no "change" — propose the fix as a change in the same file and name its id.');
        if (t.risks !== undefined) {
          if (!Array.isArray(t.risks)) err(what + ': "risks" must be a list.');
          else t.risks.forEach((r, j) => {
            const w = what + ' risks[' + j + ']';
            if (!r || !/^P[123]$/.test(r.level)) err(w + ': "level" must be "P1", "P2" or "P3" — MxScout drops it otherwise.');
            if (!r || typeof r.title !== 'string' || !r.title.trim()) err(w + ': no "title" — MxScout drops it.');
          });
        }
      });
    }
  }
  return problems;
}

// A ticket's verdict and how sure it is (reference/descriptions-format.md, "Tickets"; public/describe.js keeps the same lists).
const TICKET_VERDICTS = ['bug', 'as-designed', 'data-config', 'cannot-tell'];
const CONFIDENCE = ['high', 'medium', 'low'];

// A change's status, the kinds of model change and what is done to each (reference/descriptions-format.md, "changes"; public/describe.js keeps the same lists).
const CHANGE_STATUS = ['proposed', 'accepted', 'done', 'dropped'];
const CHANGE_KINDS = ['microflow', 'nanoflow', 'page', 'entity', 'attribute', 'association', 'enumeration', 'security', 'scheduled event', 'integration', 'other'];
const CHANGE_ACTIONS = ['add', 'change', 'remove'];

// A risk's id (reference/descriptions-format.md; public/describe.js reads the same pattern).
const RISK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The ten patterns a risk can belong to (reference/risk-levels.md; public/describe.js keeps the same list).
const THEMES = ['access', 'secrets', 'logic', 'silent', 'delete', 'loops', 'schedule', 'dead', 'hardcoded', 'naming'];

// ---------- merge ----------
function merge(parts) {
  const out = { format: DESC_FORMAT, version: 1 };
  parts.forEach((p) => {
    ['project', 'language', 'by', 'written'].forEach((k) => { if (typeof p[k] === 'string' && p[k]) out[k] = p[k]; });
    // A part that says "add": true (one more process) adds its processes to the application's, a process
    // of the same name replaced; any other part's "app" is the whole of it.
    if (p.app && typeof p.app === 'object') {
      if (p.add === true && out.app && !(Array.isArray(p.replace) && p.replace.indexOf('app') !== -1)) {
        const procs = (Array.isArray(out.app.processes) ? out.app.processes : []).slice();
        (Array.isArray(p.app.processes) ? p.app.processes : []).forEach((x) => {
          const i = procs.findIndex((q) => q && x && typeof q.name === 'string' && typeof x.name === 'string' && q.name.toLowerCase() === x.name.toLowerCase());
          if (i < 0) procs.push(x); else procs[i] = x;
        });
        out.app = Object.assign({}, out.app, p.app.summary ? { summary: p.app.summary } : {}, p.app.story ? { story: p.app.story } : {}, { processes: procs });
      } else out.app = p.app;
    }
    if (p.c4 && typeof p.c4 === 'object') out.c4 = p.c4;
    // Changes by id: one written again replaces the one before, a new one goes at the end.
    if (Array.isArray(p.changes)) {
      out.changes = (out.changes || []).slice();
      p.changes.forEach((x) => {
        const i = out.changes.findIndex((y) => y && x && y.id === x.id);
        if (i < 0) out.changes.push(x); else out.changes[i] = x;
      });
    }
    // Tickets the same way, by id.
    if (Array.isArray(p.tickets)) {
      out.tickets = (out.tickets || []).slice();
      p.tickets.forEach((x) => {
        const i = out.tickets.findIndex((y) => y && x && y.id === x.id);
        if (i < 0) out.tickets.push(x); else out.tickets[i] = x;
      });
    }
    TABLES.forEach((k) => {
      if (!p[k] || typeof p[k] !== 'object') return;
      out[k] = Object.assign(out[k] || {}, p[k]);
    });
    // Risks and context come from several parts (one per module, and the application's): they add up,
    // and the same risk written twice — the same id, or the same level and title — is kept once, the later part winning.
    if (Array.isArray(p.risks)) {
      const same = (x, r) => x && r && ((x.id && r.id && x.id === r.id) || (x.level === r.level && x.title === r.title));
      out.risks = (out.risks || []).filter((r) => !p.risks.some((x) => same(x, r))).concat(p.risks);
    }
    if (p.context && typeof p.context === 'object') {
      out.context = out.context || {};
      ['where', 'conventions', 'pitfalls'].forEach((k) => {
        if (Array.isArray(p.context[k])) out.context[k] = (out.context[k] || []).concat(p.context[k].filter((x) => !(out.context[k] || []).some((y) => JSON.stringify(y) === JSON.stringify(x))));
      });
    }
  });
  return out;
}

// ---------- the command line ----------
function main(argv) {
  const [cmd, ...rest] = argv;
  const list = rest.indexOf('--list') !== -1;
  const args = rest.filter((a) => a !== '--list');
  if (cmd === 'todo' && args[0]) {
    const pack = readPack(fs.readFileSync(args[0], 'utf8'));
    const desc = args[1] && fs.existsSync(args[1]) ? readJson(args[1]) : null;
    const t = todo(pack, desc);
    console.log(t.flows + ' flows to describe in ' + t.modules.length + ' modules' + (t.overview ? '; the application overview is missing' : t.overviewStory ? '; the application has no long description' : '') +
      (t.missingModules.length ? '; ' + t.missingModules.length + ' modules have no description' : '') +
      (t.shortModules.length ? '; ' + t.shortModules.length + ' modules have a summary but no long description (' + t.shortModules.join(', ') + ')' : '') +
      (t.risks ? '; no risks yet' : '') + (t.context ? '; no context for developers yet' : '') +
      (t.noNotes.length ? '; ' + t.noNotes.length + ' modules have no notes' : '') + (t.c4 ? '; no architecture yet' : '') + '.');
    if (t.recheck.length || t.falsePositives.length || t.verify.length) {
      console.log('Risk triage: ' + [t.recheck.length ? t.recheck.length + ' fixed to check again (' + t.recheck.join(', ') + ')' : null,
        t.falsePositives.length ? t.falsePositives.length + ' false positives not to raise again (' + t.falsePositives.join(', ') + ')' : null,
        t.verify.length ? t.verify.length + ' raised by people, marked fixed, to answer in "verify" (' + t.verify.join(', ') + ')' : null].filter(Boolean).join('; ') + '.');
    }
    t.modules.forEach((r) => {
      console.log('  ' + r.module + ' (pack line ' + r.line + '): ' + r.fresh.length + ' new, ' + r.changed.length + ' changed');
      if (list) r.fresh.concat(r.changed).forEach((qn) => console.log('    ' + qn));
    });
    return 0;
  }
  if (cmd === 'check' && args[1]) {
    const problems = check(readPack(fs.readFileSync(args[0], 'utf8')), readJson(args[1]));
    problems.forEach((p) => console.log(p.level.toUpperCase() + '  ' + p.text));
    const errors = problems.filter((p) => p.level === 'error').length;
    console.log(errors ? errors + ' error(s): MxScout will not show what they are about.' : 'OK — MxScout will accept this file' + (problems.length ? ' (' + problems.length + ' warning(s))' : '') + '.');
    return errors ? 1 : 0;
  }
  if (cmd === 'merge' && args.length >= 2) {
    const merged = merge(args.slice(1).map(readJson));
    fs.writeFileSync(args[0], JSON.stringify(merged, null, 2) + '\n');
    const n = ['microflows', 'nanoflows', 'pages', 'entities'].reduce((s, k) => s + Object.keys(merged[k] || {}).length, 0);
    console.log('Wrote ' + args[0] + ': ' + n + ' descriptions' + (merged.changes ? ', ' + merged.changes.length + ' change' + (merged.changes.length === 1 ? '' : 's') : '') + (merged.tickets ? ', ' + merged.tickets.length + ' ticket' + (merged.tickets.length === 1 ? '' : 's') : '') + ' from ' + (args.length - 1) + ' parts.');
    return 0;
  }
  console.log('Usage:\n  node check-descriptions.js todo  <pack.md> [descriptions.json] [--list]\n  node check-descriptions.js check <pack.md> <descriptions.json>\n  node check-descriptions.js merge <out.json> <part.json> [<part.json> …]');
  return 2;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exitCode = 2; }
}
module.exports = { readPack, todo, check, merge, DESC_FORMAT };
