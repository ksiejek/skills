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
 *       is there, unless they add it. Exit code 1 on errors.
 *
 *   node check-descriptions.js merge <out.json> <part.json> [<part.json> …]
 *       One file from several, later parts winning per name (a change per id) —
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
  const pack = { project: null, modules: {}, microflows: {}, nanoflows: {}, pages: {}, entities: {} };
  const project = /^project: (.+)$/m.exec(text);
  pack.project = project ? project[1].trim() : null;
  let module = null;
  lines.forEach((line, i) => {
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
    c4: !(desc.c4 && typeof desc.c4 === 'object' && (desc.c4.context || desc.c4.containers))
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
    if (!Array.isArray(desc.risks)) err('"risks" must be a list.');
    else desc.risks.forEach((r, i) => {
      const what = 'risks[' + i + ']' + (r && typeof r.title === 'string' ? ' "' + r.title + '"' : '');
      if (!r || typeof r !== 'object') { err(what + ' is not an object.'); return; }
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
  // Changes (SKILL.md, "A change, when the person asks"): how it works now, traced like a process, and the
  // proposal with the model changes it needs. MxScout drops a change without a slug id or a title, and a
  // model change without a target or with an action other than add, change or remove.
  if (desc.changes !== undefined) {
    if (!Array.isArray(desc.changes)) err('"changes" must be a list.');
    else {
      if (desc.changes.length > 100) warn('"changes" has ' + desc.changes.length + ' entries — MxScout keeps 100.');
      const ids = {};
      const flowInPack = (qn) => !!(pack.microflows[qn] || pack.nanoflows[qn] || pack.pages[qn]);
      // Whether a model change's target is in the pack: flows and pages by kind, an entity, and an attribute
      // or an association by the entity or module it belongs to. The other kinds the pack does not list.
      const targetInPack = (kind, qn) => {
        const parts = String(qn).split('.');
        if (kind === 'microflow' || kind === 'nanoflow' || kind === 'page') return !!pack[kind + 's'][qn];
        if (kind === 'entity') return !!pack.entities[qn];
        if (kind === 'attribute') return parts.length === 3 && !!pack.entities[parts[0] + '.' + parts[1]];
        if (kind === 'association') return !!pack.modules[parts[0]];
        return null;
      };
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
  return problems;
}

// A change's status, the kinds of model change and what is done to each (reference/descriptions-format.md, "changes"; public/describe.js keeps the same lists).
const CHANGE_STATUS = ['proposed', 'accepted', 'done', 'dropped'];
const CHANGE_KINDS = ['microflow', 'nanoflow', 'page', 'entity', 'attribute', 'association', 'enumeration', 'security', 'scheduled event', 'integration', 'other'];
const CHANGE_ACTIONS = ['add', 'change', 'remove'];

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
    TABLES.forEach((k) => {
      if (!p[k] || typeof p[k] !== 'object') return;
      out[k] = Object.assign(out[k] || {}, p[k]);
    });
    // Risks and context come from several parts (one per module, and the application's): they add up,
    // and the same risk written twice — same level, same title — is kept once, the later part winning.
    if (Array.isArray(p.risks)) {
      out.risks = (out.risks || []).filter((r) => !p.risks.some((x) => x && r && x.level === r.level && x.title === r.title)).concat(p.risks);
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
    console.log('Wrote ' + args[0] + ': ' + n + ' descriptions' + (merged.changes ? ', ' + merged.changes.length + ' change' + (merged.changes.length === 1 ? '' : 's') : '') + ' from ' + (args.length - 1) + ' parts.');
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
