/* MxScout — the test cases' format: manual tests worked out from the business brief's rules (MXS-69).
 *
 * The business brief (brief-format.js, MXS-61) numbers what the application must do: BR-1, BR-2 … The
 * mendix-testcases skill reads the brief and the model and writes, for every rule, at least one case a
 * person can carry out by hand in the running application:
 *
 *   { "format": "mxscout-testcases", "version": 1, "title", "language"?, "brief"?: <the brief's version>,
 *     "cases": [{ "id": "TC-1", "rule": "BR-1", "title", "role", "preconditions": [..], "steps": [..],
 *                 "expected", "model": ["Module.Document", ..], "finding"?: "<a risk's id>" }] }
 *
 * Every case names the rule it checks and where in the model the rule is built (or should be: a page, a
 * microflow, an entity, by its qualified name). `finding` is the id of a risk that case is about — a logic
 * finding (MXS-62) whose fix it shows works; the page shows that risk's remediation story beside it. Cases
 * are numbered TC-1, TC-2 … and a number, once given, keeps meaning the same case.
 *
 * This one file is read by the browser (window.MxTestCaseFormat — testcases.js) and by the skill's checker
 * (skills/mendix-testcases/testcase-format.js, the same file; a test keeps the two equal). Pure: no DOM, no
 * I/O. Whatever a case says is text to show, never markup or instructions. Nothing here runs a test.
 */
(function (root) {
  'use strict';

  var FORMAT = 'mxscout-testcases';
  var VERSION = 1;
  var LIMITS = { cases: 2000, steps: 40, preconditions: 20, model: 20, text: 4000, name: 200 };
  var CASE_ID = /^TC-[1-9][0-9]{0,3}$/;
  var RULE_ID = /^BR-[1-9][0-9]{0,3}$/;
  var QN = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$/;
  var RISK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function isEnvelope(text) {
    if (text && typeof text === 'object') return text.format === FORMAT;
    return typeof text === 'string' && /"format"\s*:\s*"mxscout-testcases"/.test(text.slice(0, 4000));
  }
  function str(x) { return typeof x === 'string' ? x.replace(/\r\n?/g, '\n').trim() : ''; }
  function idNo(id) { return Number(String(id).split('-')[1]) || 0; }

  // Test cases as handed in → { value, errors, warnings }. value is null when there is an error: the cases
  // are taken whole or not at all. brief (optional): the business brief they were written from — a case
  // whose rule is not in it is an error, a rule with no case is one too (every rule is tested).
  function check(input, brief) {
    var errors = [], warnings = [], raw = input;
    if (typeof input === 'string') { try { raw = JSON.parse(input); } catch (e) { return { value: null, errors: ['That is not JSON.'], warnings: [] }; } }
    if (!raw || typeof raw !== 'object' || raw.format !== FORMAT) return { value: null, errors: ['"format" should be "' + FORMAT + '".'], warnings: [] };
    if (raw.version !== VERSION) return { value: null, errors: ['These test cases are version ' + JSON.stringify(raw.version === undefined ? null : raw.version) + '; MxScout reads version ' + VERSION + '.'], warnings: [] };
    var v = { format: FORMAT, version: VERSION, title: str(raw.title), language: str(raw.language) || null,
      brief: typeof raw.brief === 'number' && raw.brief > 0 && raw.brief < 1e6 ? Math.floor(raw.brief) : null, cases: [] };
    if (!v.title) errors.push('"title" is missing — the application\'s name, as the brief calls it.');
    else if (v.title.length > LIMITS.name) errors.push('"title" is longer than ' + LIMITS.name + ' characters.');
    if (v.language && !/^[a-z]{2}(-[A-Za-z]{2})?$/.test(v.language)) { warnings.push('"language" should be a code like "en" or "pl"; it was left out.'); v.language = null; }
    if (!Array.isArray(raw.cases)) { errors.push('"cases" must be a list.'); return { value: null, errors: errors, warnings: warnings }; }
    if (!raw.cases.length) errors.push('"cases" is empty — write at least one case for every rule.');
    if (raw.cases.length > LIMITS.cases) errors.push('"cases" has ' + raw.cases.length + ' entries; MxScout keeps at most ' + LIMITS.cases + '.');

    function texts(x, at, key, need) {
      if (x === undefined && !need) return [];
      if (!Array.isArray(x)) { errors.push(at + ': "' + key + '" must be a list of sentences.'); return []; }
      var out = x.slice(0, LIMITS[key]).map(str).filter(Boolean).map(function (t) { return t.slice(0, LIMITS.text); });
      if (x.length > LIMITS[key]) warnings.push(at + ': "' + key + '" has more than ' + LIMITS[key] + ' entries; the rest were left out.');
      if (need && !out.length) errors.push(at + ': "' + key + '" is empty.');
      return out;
    }
    var ids = {};
    raw.cases.slice(0, LIMITS.cases).forEach(function (c, i) {
      var at = 'cases[' + i + ']';
      if (!c || typeof c !== 'object') { errors.push(at + ' is not an object.'); return; }
      var id = str(c.id), rule = str(c.rule), title = str(c.title), role = str(c.role), expected = str(c.expected), finding = str(c.finding) || null;
      if (!CASE_ID.test(id)) errors.push(at + ': "id" should be TC-1, TC-2, … (it is ' + JSON.stringify(c.id) + ').');
      else if (ids[id]) errors.push(at + ': the number ' + id + ' is used twice.');
      ids[id] = true;
      if (!RULE_ID.test(rule)) errors.push(at + ': "rule" should name the business rule it checks, BR-1, BR-2, … (it is ' + JSON.stringify(c.rule) + ').');
      if (!title) errors.push(at + ': "title" is missing — what the case checks, in a few words.');
      if (!role) errors.push(at + ': "role" is missing — who carries the case out (a user role of the application).');
      if (!expected) errors.push(at + ': "expected" is missing — what the tester should see when the rule holds.');
      [['title', title, LIMITS.name], ['role', role, LIMITS.name], ['expected', expected, LIMITS.text]].forEach(function (f) {
        if (f[1].length > f[2]) errors.push(at + ': "' + f[0] + '" is longer than ' + f[2] + ' characters.');
      });
      var pre = texts(c.preconditions, at, 'preconditions', false);
      var steps = texts(c.steps, at, 'steps', true);
      var model = [];
      if (!Array.isArray(c.model) || !c.model.length) errors.push(at + ': "model" must name at least one element of the model, as Module.Name ("Events.ACT_Register").');
      else c.model.slice(0, LIMITS.model).forEach(function (q) {
        var s = str(q);
        if (!QN.test(s) || s.length > LIMITS.name) errors.push(at + ': ' + JSON.stringify(q) + ' is not a qualified name such as "Events.ACT_Register".');
        else if (model.indexOf(s) === -1) model.push(s);
      });
      if (finding && (!RISK_ID.test(finding) || finding.length > 80)) { warnings.push(at + ': "finding" should be a risk\'s id ("logic-ticket-limit"); it was left out.'); finding = null; }
      v.cases.push({ id: id, rule: rule, title: title, role: role, preconditions: pre, steps: steps, expected: expected, model: model, finding: finding });
    });
    if (brief && Array.isArray(brief.rules)) {
      var rules = {}, covered = {};
      brief.rules.forEach(function (r) { rules[r.id] = true; });
      v.cases.forEach(function (c) { if (RULE_ID.test(c.rule)) { if (!rules[c.rule]) errors.push(c.id + ': ' + c.rule + ' is not a rule of the business brief.'); covered[c.rule] = true; } });
      var missing = brief.rules.filter(function (r) { return !covered[r.id]; }).map(function (r) { return r.id; });
      if (missing.length) errors.push('No case checks ' + missing.join(', ') + ' — every business rule needs at least one.');
    }
    v.cases.sort(function (a, b) { return idNo(a.id) - idNo(b.id); });
    return { value: errors.length ? null : v, errors: errors, warnings: warnings };
  }

  // The brief's rules and the cases that check each → [{ rule, text, process, cases: [..] }], in the brief's
  // order, a rule with no case among them with an empty list.
  function byRule(set, brief) {
    var cases = (set && set.cases) || [];
    return ((brief && brief.rules) || []).map(function (r) {
      return { rule: r.id, text: r.text, process: r.process || null, cases: cases.filter(function (c) { return c.rule === r.id; }) };
    });
  }

  // ---------- Markdown: for a tester, or an agent ----------
  // meta: { at, brief: the brief (for each rule's text), links: { 'TC-1': 'Remediation story #4 · …' } }.
  function oneLine(t) { return String(t || '').replace(/\s*\n\s*/g, ' '); }
  function markdown(set, meta) {
    meta = meta || {};
    var rules = {}, links = meta.links || {};
    ((meta.brief && meta.brief.rules) || []).forEach(function (r) { rules[r.id] = r.text; });
    var out = ['# ' + oneLine(set.title) + ' — test cases', ''];
    var line = ['format: ' + FORMAT + ' ' + VERSION];
    if (set.brief) line.push('from business brief version ' + set.brief);
    if (meta.at) line.push(String(meta.at).slice(0, 10));
    if (set.language) line.push('language: ' + set.language);
    out.push('<!-- ' + line.join(' · ') + ' -->', '',
      'Manual tests worked out from the business brief\'s rules (BR-n) by an AI agent: who carries each out, what must be true first, the steps and what the tester should see. Each names the rule it checks and where in the model that rule is built.', '');
    set.cases.forEach(function (c) {
      out.push('## ' + c.id + ' · ' + oneLine(c.title), '');
      out.push('- **Rule:** ' + c.rule + (rules[c.rule] ? ' — ' + oneLine(rules[c.rule]) : ''));
      out.push('- **Role:** ' + oneLine(c.role));
      out.push('- **In the model:** ' + c.model.map(function (q) { return '`' + q + '`'; }).join(', '));
      if (c.finding) out.push('- **Finding:** `' + c.finding + '`' + (links[c.id] ? ' — ' + oneLine(links[c.id]) : ''));
      else if (links[c.id]) out.push('- **Remediation:** ' + oneLine(links[c.id]));
      out.push('');
      if (c.preconditions.length) { out.push('**Preconditions**', ''); c.preconditions.forEach(function (p) { out.push('- ' + oneLine(p)); }); out.push(''); }
      out.push('**Steps**', '');
      c.steps.forEach(function (s, i) { out.push((i + 1) + '. ' + oneLine(s)); });
      out.push('', '**Expected:** ' + oneLine(c.expected), '');
    });
    return out.join('\n');
  }
  function fileName(set, ext) {
    var base = String((set && set.title) || 'application').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'application';
    return base + '-test-cases.' + ext;
  }

  var api = { FORMAT: FORMAT, VERSION: VERSION, LIMITS: LIMITS, isEnvelope: isEnvelope, check: check, byRule: byRule, markdown: markdown, fileName: fileName };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MxTestCaseFormat = api;
})(this);
