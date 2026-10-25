/* MxScout — the business brief's format: what an application is meant to be, as the team's own
 * documents say it (MXS-61).
 *
 * A team has user stories, design documents and notes saying what an application is for and how it is
 * meant to work. The mendix-brief skill reads them and writes one brief:
 *
 *   { "format": "mxscout-brief", "version": 1, "title", "language"?, "summary",
 *     "sources":   [{ "id": "S1", "name", "kind"?: "stories|document|notes|other", "note"? }],
 *     "roles":     [{ "name", "text", "sources": ["S1", "S2 §3"] }],
 *     "processes": [{ "name", "text", "steps"?: [..], "sources" }],
 *     "rules":     [{ "id": "BR-1", "text", "process"?, "sources" }],
 *     "data":      [{ "name", "text", "fields"?: [..], "sources" }],
 *     "open"?:     [{ "text", "sources" }] }
 *
 * Every statement names where it came from: a reference is a source's id, optionally followed by where in
 * it ("S2 §3.1", "S1 US-14"). Rules are numbered BR-1, BR-2, … so that a ticket or a later comparison
 * with the model can point at one; a number, once given, keeps meaning the same rule.
 *
 * This one file is read by the browser (window.MxBriefFormat — brief.js) and by the skill's checker
 * (skills/mendix-brief/brief-format.js, the same file; a test keeps the two equal). Pure: no DOM, no I/O.
 * Whatever a brief says is text to show, never markup or instructions.
 */
(function (root) {
  'use strict';

  var FORMAT = 'mxscout-brief';
  var VERSION = 1;
  var LIMITS = { sources: 200, roles: 100, processes: 200, rules: 1000, data: 300, open: 200, steps: 60, fields: 120, text: 8000, summary: 12000, name: 200 };
  var KINDS = ['stories', 'document', 'notes', 'other'];
  var SOURCE_ID = /^S[1-9][0-9]{0,3}$/;
  var RULE_ID = /^BR-[1-9][0-9]{0,3}$/;
  var REF = /^(S[1-9][0-9]{0,3})(?:\s+(\S.{0,119}))?$/;

  function isEnvelope(text) {
    if (text && typeof text === 'object') return text.format === FORMAT;
    return typeof text === 'string' && /"format"\s*:\s*"mxscout-brief"/.test(text.slice(0, 4000));
  }
  function str(x) { return typeof x === 'string' ? x.replace(/\r\n?/g, '\n').trim() : ''; }

  // A brief as handed in → { value, errors, warnings }. value is null when there is an error: a brief is
  // taken whole or not at all. The value is a clean copy — only the fields above, trimmed.
  function check(input) {
    var errors = [], warnings = [], raw = input;
    if (typeof input === 'string') { try { raw = JSON.parse(input); } catch (e) { return { value: null, errors: ['That is not JSON.'], warnings: [] }; } }
    if (!raw || typeof raw !== 'object' || raw.format !== FORMAT) return { value: null, errors: ['"format" should be "' + FORMAT + '".'], warnings: [] };
    if (raw.version !== VERSION) return { value: null, errors: ['This brief is version ' + JSON.stringify(raw.version === undefined ? null : raw.version) + '; MxScout reads version ' + VERSION + '.'], warnings: [] };
    var v = { format: FORMAT, version: VERSION, title: str(raw.title), language: str(raw.language) || null, summary: str(raw.summary),
      sources: [], roles: [], processes: [], rules: [], data: [], open: [] };
    if (!v.title) errors.push('"title" is missing — the application\'s name, as the documents call it.');
    else if (v.title.length > LIMITS.name) errors.push('"title" is longer than ' + LIMITS.name + ' characters.');
    if (!v.summary) errors.push('"summary" is missing — what the application is for, in a few sentences.');
    else if (v.summary.length > LIMITS.summary) errors.push('"summary" is longer than ' + LIMITS.summary + ' characters.');
    if (v.language && !/^[a-z]{2}(-[A-Za-z]{2})?$/.test(v.language)) { warnings.push('"language" should be a code like "en" or "pl"; it was left out.'); v.language = null; }

    function list(key, need) {
      var x = raw[key];
      if (x === undefined && !need) return [];
      if (!Array.isArray(x)) { errors.push('"' + key + '" must be a list.'); return []; }
      if (need && !x.length) errors.push('"' + key + '" is empty — a brief needs at least one.');
      if (x.length > LIMITS[key]) errors.push('"' + key + '" has ' + x.length + ' entries; MxScout keeps at most ' + LIMITS[key] + '.');
      return x.slice(0, LIMITS[key]);
    }
    var ids = {};
    list('sources', true).forEach(function (s, i) {
      var at = 'sources[' + i + ']';
      if (!s || typeof s !== 'object') { errors.push(at + ' is not an object.'); return; }
      var id = str(s.id), name = str(s.name), kind = str(s.kind) || 'other';
      if (!SOURCE_ID.test(id)) errors.push(at + ': "id" should be S1, S2, … (it is ' + JSON.stringify(s.id) + ').');
      else if (ids[id]) errors.push(at + ': the id ' + id + ' is used twice.');
      if (!name) errors.push(at + ': "name" is missing — the file\'s name, or the document\'s title.');
      if (KINDS.indexOf(kind) === -1) { warnings.push(at + ': "kind" is one of ' + KINDS.join(', ') + '; read as "other".'); kind = 'other'; }
      ids[id] = true;
      v.sources.push({ id: id, name: name.slice(0, LIMITS.name), kind: kind, note: str(s.note).slice(0, LIMITS.text) || null });
    });
    var used = {};
    function refs(x, at, need) {
      var out = [];
      if (x !== undefined && !Array.isArray(x)) { errors.push(at + ': "sources" must be a list such as ["S1", "S2 §3"].'); return out; }
      (x || []).slice(0, 20).forEach(function (r) {
        var m = REF.exec(str(r));
        if (!m) { errors.push(at + ': ' + JSON.stringify(r) + ' is not a reference — a source\'s id, then optionally where in it ("S2 §3.1").'); return; }
        if (!ids[m[1]]) { errors.push(at + ': ' + m[1] + ' is not among "sources".'); return; }
        used[m[1]] = true;
        out.push(m[2] ? m[1] + ' ' + m[2] : m[1]);
      });
      if (need && !out.length && !(x || []).length) warnings.push(at + ' names no source — say which document it comes from.');
      return out;
    }
    function texts(x, at, key) {
      if (x === undefined) return [];
      if (!Array.isArray(x)) { errors.push(at + ': "' + key + '" must be a list of sentences.'); return []; }
      return x.slice(0, LIMITS[key]).map(str).filter(Boolean).map(function (t) { return t.slice(0, LIMITS.text); });
    }
    function entry(e, at, needName) {
      if (!e || typeof e !== 'object') { errors.push(at + ' is not an object.'); return null; }
      var name = str(e.name), text = str(e.text);
      if (needName && !name) errors.push(at + ': "name" is missing.');
      if (!text && needName !== 'optional-text') errors.push(at + ': "text" is missing.');
      if (text.length > LIMITS.text) errors.push(at + ': "text" is longer than ' + LIMITS.text + ' characters.');
      return { name: name.slice(0, LIMITS.name), text: text, sources: refs(e.sources, at, true) };
    }
    list('roles', true).forEach(function (e, i) { var r = entry(e, 'roles[' + i + ']', true); if (r) v.roles.push(r); });
    list('processes', true).forEach(function (e, i) {
      var at = 'processes[' + i + ']', r = entry(e, at, true);
      if (r) { r.steps = texts(e.steps, at, 'steps'); v.processes.push(r); }
    });
    var ruleIds = {}, names = {};
    v.processes.forEach(function (p) { names[p.name] = true; });
    list('rules', true).forEach(function (e, i) {
      var at = 'rules[' + i + ']';
      if (!e || typeof e !== 'object') { errors.push(at + ' is not an object.'); return; }
      var id = str(e.id), text = str(e.text), process = str(e.process) || null;
      if (!RULE_ID.test(id)) errors.push(at + ': "id" should be BR-1, BR-2, … (it is ' + JSON.stringify(e.id) + ').');
      else if (ruleIds[id]) errors.push(at + ': the number ' + id + ' is used twice.');
      ruleIds[id] = true;
      if (!text) errors.push(at + ': "text" is missing.');
      else if (text.length > LIMITS.text) errors.push(at + ': "text" is longer than ' + LIMITS.text + ' characters.');
      if (process && !names[process]) warnings.push(at + ': "process" names ' + JSON.stringify(process) + ', which is not among "processes".');
      v.rules.push({ id: id, text: text, process: process, sources: refs(e.sources, at, true) });
    });
    list('data', false).forEach(function (e, i) {
      var at = 'data[' + i + ']', r = entry(e, at, true);
      if (r) { r.fields = texts(e.fields, at, 'fields'); v.data.push(r); }
    });
    list('open', false).forEach(function (e, i) {
      var at = 'open[' + i + ']';
      if (!e || typeof e !== 'object' || !str(e.text)) { errors.push(at + ': needs "text" — the question, or what the documents disagree about.'); return; }
      v.open.push({ text: str(e.text).slice(0, LIMITS.text), sources: refs(e.sources, at, false) });
    });
    v.sources.forEach(function (s) { if (!used[s.id]) warnings.push('Source ' + s.id + ' (' + s.name + ') is not referred to anywhere — leave it out, or say what it says.'); });
    return { value: errors.length ? null : v, errors: errors, warnings: warnings };
  }

  // What changed between two briefs, by the things one can point at → { added, changed, removed } of rule
  // numbers, and the names of processes added and removed. For the page's version line and the skill.
  function diff(before, after) {
    var out = { rules: { added: [], changed: [], removed: [] }, processes: { added: [], removed: [] } };
    var a = {}, b = {};
    ((before && before.rules) || []).forEach(function (r) { a[r.id] = r.text; });
    ((after && after.rules) || []).forEach(function (r) { b[r.id] = r.text; if (!(r.id in a)) out.rules.added.push(r.id); else if (a[r.id] !== r.text) out.rules.changed.push(r.id); });
    Object.keys(a).forEach(function (id) { if (!(id in b)) out.rules.removed.push(id); });
    var pa = {}, pb = {};
    ((before && before.processes) || []).forEach(function (p) { pa[p.name] = true; });
    ((after && after.processes) || []).forEach(function (p) { pb[p.name] = true; if (!pa[p.name]) out.processes.added.push(p.name); });
    Object.keys(pa).forEach(function (n) { if (!pb[n]) out.processes.removed.push(n); });
    return out;
  }

  // ---------- Markdown: for an agent ----------
  // meta: { version, at, project } — which version this is. Headings and labels in English: the brief's own
  // text is in its language, the frame stays the same so an agent finds its way in any of them.
  function oneLine(t) { return String(t || '').replace(/\s*\n\s*/g, ' '); }
  function cite(refs) { return refs && refs.length ? ' *(' + refs.join('; ') + ')*' : ''; }
  function markdown(b, meta) {
    meta = meta || {};
    var out = ['# ' + oneLine(b.title) + ' — business brief', ''];
    var line = ['format: ' + FORMAT + ' ' + VERSION];
    if (meta.version) line.push('version ' + meta.version);
    if (meta.at) line.push(String(meta.at).slice(0, 10));
    if (b.language) line.push('language: ' + b.language);
    out.push('<!-- ' + line.join(' · ') + ' -->', '',
      'What the application is meant to be, as the team\'s documents say it — not what the model does. Every statement names its source (S1, S2 …, listed at the end); rules are numbered so they can be referred to.', '');
    out.push('## Purpose', '', b.summary, '');
    if (b.roles.length) {
      out.push('## Roles', '');
      b.roles.forEach(function (r) { out.push('- **' + oneLine(r.name) + '** — ' + oneLine(r.text) + cite(r.sources)); });
      out.push('');
    }
    if (b.processes.length) {
      out.push('## Processes', '');
      b.processes.forEach(function (p) {
        out.push('### ' + oneLine(p.name), '', p.text + cite(p.sources), '');
        if (p.steps && p.steps.length) { p.steps.forEach(function (s, i) { out.push((i + 1) + '. ' + oneLine(s)); }); out.push(''); }
        var rs = b.rules.filter(function (r) { return r.process === p.name; });
        if (rs.length) { out.push('Rules: ' + rs.map(function (r) { return r.id; }).join(', '), ''); }
      });
    }
    if (b.rules.length) {
      out.push('## Business rules', '');
      b.rules.forEach(function (r) { out.push('- **' + r.id + '** ' + oneLine(r.text) + (r.process ? ' — ' + oneLine(r.process) : '') + cite(r.sources)); });
      out.push('');
    }
    if (b.data.length) {
      out.push('## Data', '');
      b.data.forEach(function (d) {
        out.push('- **' + oneLine(d.name) + '** — ' + oneLine(d.text) + cite(d.sources));
        (d.fields || []).forEach(function (f) { out.push('  - ' + oneLine(f)); });
      });
      out.push('');
    }
    if (b.open.length) {
      out.push('## Open questions', '');
      b.open.forEach(function (o) { out.push('- ' + oneLine(o.text) + cite(o.sources)); });
      out.push('');
    }
    out.push('## Sources', '');
    b.sources.forEach(function (s) { out.push('- **' + s.id + '** ' + oneLine(s.name) + ' (' + s.kind + ')' + (s.note ? ' — ' + oneLine(s.note) : '')); });
    out.push('');
    return out.join('\n');
  }
  // A file name for an export: the title, made safe.
  function fileName(b, ext) {
    var base = String((b && b.title) || 'application').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'application';
    return base + '-business-brief.' + ext;
  }

  var api = { FORMAT: FORMAT, VERSION: VERSION, LIMITS: LIMITS, KINDS: KINDS, isEnvelope: isEnvelope, check: check, diff: diff, markdown: markdown, fileName: fileName };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MxBriefFormat = api;
})(this);
