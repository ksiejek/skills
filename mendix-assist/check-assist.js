#!/usr/bin/env node
/* The mendix-assist skill's checker. No dependencies — Node only.
 *
 *   node check-assist.js check <file.json> [--pack ai-pack.md]
 *       Checks an Assist envelope ({ "format": "mxscout-assist", "version": 1, "items": [ … ] }) before it
 *       goes into the project folder's inbox/ or through the agent channel: the envelope, every item's
 *       required fields for its kind, the lists of allowed values, the id's form, the dates. An error is
 *       what MxScout would refuse (exit 1); a warning is what it would keep but show worse. With --pack
 *       (the AI pack, ai-pack.md in the project folder) it also warns about qualified names not in the model.
 *
 *   node check-assist.js list <project-folder> [--kind ticket|jira|idea|other] [--status open,in-progress]
 *       Prints the items MxScout keeps under assist/<kind>/<id>.json — kind, id, status, planned date,
 *       last update and title — and the files still waiting in inbox/. Read it before answering, so you
 *       know what is open, planned and closed.
 *
 * The format is reference/assist-format.md. This file reads; it writes nothing.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FORMAT = 'mxscout-assist';
const KINDS = ['ticket', 'jira', 'idea', 'other'];
const FOLDERS = { ticket: 'tickets', jira: 'jira', idea: 'ideas', other: 'other' };
const NAMES = { ticket: 'a ticket', jira: 'a Jira issue', idea: 'an idea', other: 'other help' };
const STATUSES = ['open', 'waiting', 'in-progress', 'done', 'dropped'];
const OPEN_STATUSES = ['open', 'waiting', 'in-progress'];
const QSTATUSES = ['open', 'answered', 'dropped'];
const FROM = ['reporter', 'person', 'agent'];
const QID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UPDATE_FIELDS = ['id', 'kind', 'update', 'updated', 'status', 'planned', 'closed', 'history', 'thread', 'questions'];
const VERDICTS = ['bug', 'as-designed', 'data-config', 'cannot-tell'];
const CONFIDENCE = ['high', 'medium', 'low'];
const FEASIBLE = ['yes', 'partly', 'no'];
const BY = ['person', 'agent'];
const CHANGE_KINDS = ['microflow', 'nanoflow', 'page', 'entity', 'attribute', 'association', 'enumeration', 'security', 'scheduled event', 'integration', 'other'];
const ACTIONS = ['add', 'change', 'remove'];
const LEVELS = ['P1', 'P2', 'P3'];
const COMMON = ['id', 'kind', 'title', 'reported', 'source', 'created', 'updated', 'status', 'planned', 'closed', 'history', 'questions', 'thread', 'language', 'modelVersion'];
const OWN = {
  ticket: ['verdict', 'confidence', 'summary', 'story', 'traced', 'evidence', 'needs', 'reply', 'fix', 'risk'],
  jira: ['summary', 'story', 'scope', 'proposal', 'impact', 'risks', 'open', 'effort', 'reply'],
  idea: ['now', 'proposal', 'impact', 'risks', 'open', 'effort', 'reply'],
  other: ['summary', 'story', 'sources', 'proposal', 'reply']
};

// A tracker's key or number (SD-4711, INC0012345, 4711); a slug for an idea or other help (discount-approval).
// Both become a file name, so neither may hold a slash, a space or start with a dot.
const KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

function realDate(y, m, d) {
  const t = new Date(Date.UTC(+y, +m - 1, +d));
  return t.getUTCFullYear() === +y && t.getUTCMonth() === +m - 1 && t.getUTCDate() === +d;
}
function isDate(v) { const m = DATE.exec(String(v)); return typeof v === 'string' && !!m && realDate(m[1], m[2], m[3]); }
function isDateOrTime(v) {
  if (isDate(v)) return true;
  const m = DATETIME.exec(String(v));
  return typeof v === 'string' && !!m && realDate(m[1], m[2], m[3]) && +m[4] < 24 && +m[5] < 60 && (m[6] === undefined || +m[6] < 60);
}
const str = (v) => typeof v === 'string' && v.trim() !== '';
const words = (s) => (String(s).match(/\S+/g) || []).length;

// ---------- the pack, when given: which names the model has ----------
// mendix-describe's reader, beside this skill; without it the --pack check is skipped, never guessed.
function loadPack(file, warn) {
  let readPack;
  try { ({ readPack } = require(path.join(__dirname, '..', 'mendix-describe', 'check-descriptions.js'))); }
  catch (e) { warn('--pack: mendix-describe is not installed beside this skill, so names are not checked against the model.'); return null; }
  try { return readPack(fs.readFileSync(file, 'utf8')); }
  catch (e) { warn('--pack: ' + e.message.split('\n')[0]); return null; }
}
function inPack(pack, kind, qn) {
  if (!pack) return null;
  const parts = String(qn).split('.');
  const flow = !!(pack.microflows[qn] || pack.nanoflows[qn] || pack.pages[qn]);
  if (kind === 'flow') return flow || !!pack.entities[qn];
  if (kind === 'microflow' || kind === 'nanoflow' || kind === 'page') return !!pack[kind + 's'][qn];
  if (kind === 'entity') return !!pack.entities[qn];
  if (kind === 'attribute') return parts.length === 3 && !!pack.entities[parts[0] + '.' + parts[1]];
  if (kind === 'association') return !!pack.modules[parts[0]];
  return null; // the pack does not list the other kinds by name
}

// ---------- check ----------
function check(envelope, opts) {
  opts = opts || {};
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const pack = opts.pack || null;

  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) { err('The file is not a JSON object.'); return { errors, warnings }; }
  if (envelope.format !== FORMAT) err('"format" must be "' + FORMAT + '"' + (envelope.format === 'mxscout-descriptions' ? ' — this is a descriptions file; Assist items go in an envelope of their own.' : '.'));
  if (envelope.version !== 1) err('"version" must be 1.');
  ['tickets', 'changes'].forEach((k) => { if (envelope[k] !== undefined) err('"' + k + '" belongs to no file any more: write each as an item in "items" (reference/assist-format.md).'); });
  if (envelope.written !== undefined && !isDateOrTime(envelope.written)) warn('"written" is not an ISO date.');
  if (envelope.language !== undefined && !LANG.test(String(envelope.language))) warn('"language" should be an ISO 639 code ("en", "pl"); English is assumed.');
  if (envelope.setLanguage !== undefined && typeof envelope.setLanguage !== 'boolean') err('"setLanguage" must be true or false.');
  if (envelope.setLanguage === true && !LANG.test(String(envelope.language || ''))) err('"setLanguage": true needs "language" — the ISO code the project should keep ("en", "pl").');
  ['project', 'by'].forEach((k) => { if (envelope[k] !== undefined && typeof envelope[k] !== 'string') warn('"' + k + '" should be text.'); });
  Object.keys(envelope).forEach((k) => { if (['format', 'version', 'items', 'project', 'language', 'setLanguage', 'by', 'written', 'tickets', 'changes'].indexOf(k) === -1) warn('"' + k + '" is not part of the envelope; MxScout ignores it.'); });
  if (!Array.isArray(envelope.items) || envelope.items.length === 0) { err('"items" must be a list with at least one item.'); return { errors, warnings }; }

  const seen = {};
  envelope.items.forEach((it, i) => {
    let w = 'item ' + (i + 1);
    if (!it || typeof it !== 'object' || Array.isArray(it)) { err(w + ': not an object.'); return; }
    const kind = it.kind;
    if (KINDS.indexOf(kind) === -1) { err(w + ': "kind" must be one of ' + KINDS.join(', ') + '.'); return; }
    // ----- the id: how the item is found later, and its file name -----
    if (!str(it.id)) err(w + ': "id" is required.');
    else {
      w = kind + ' ' + it.id;
      if (kind === 'ticket' || kind === 'jira') {
        if (!KEY.test(it.id)) err(w + ': the id must be the tracker\'s number or key as given — letters, digits, dots, hyphens and underscores, starting with a letter or digit, at most 80' + (/^#/.test(it.id) ? ' (drop the leading #)' : '') + '.');
        else if (!/\d/.test(it.id)) warn(w + ': the id has no number in it — ask the person for the ' + (kind === 'jira' ? 'Jira issue\'s key' : 'ticket\'s number') + ', so the item can be found later.');
      } else if (!SLUG.test(it.id) || it.id.length > 80) err(w + ': the id must be a slug — lower-case letters, digits and single hyphens, at most 80 (e.g. "discount-approval").');
      const key = kind + '/' + it.id;
      if (seen[key]) err(w + ': this kind and id appear twice in the file.');
      seen[key] = true;
    }
    // ----- status, dates, history, questions and thread: a full item and an update share these -----
    const statusAndDates = () => {
      if (it.status !== undefined && STATUSES.indexOf(it.status) === -1) err(w + ': "status" must be one of ' + STATUSES.join(', ') + '.');
      ['planned', 'closed'].forEach((k) => { if (it[k] !== undefined && it[k] !== null && !isDate(it[k])) err(w + ': "' + k + '" must be an ISO date (YYYY-MM-DD): ' + JSON.stringify(it[k]) + '.'); });
      if ((it.status === 'done' || it.status === 'dropped') && !it.closed) warn(w + ': it is ' + it.status + ' — set "closed" to the date it was.');
      if (OPEN_STATUSES.indexOf(it.status) !== -1 && it.closed) warn(w + ': it is ' + it.status + ' but has "closed" — leave "closed" out until it is done or dropped.');
    };
    const history = (required) => {
      if (it.history === undefined && !required) return;
      if (!Array.isArray(it.history)) { err(w + ': "history" is required — a list of { date, what, by }.'); return; }
      if (it.history.length === 0 && required) warn(w + ': "history" is empty — add what you did ("Checked against the model: …").');
      it.history.forEach((h, j) => {
        const hw = w + ': history ' + (j + 1);
        if (!h || typeof h !== 'object') { err(hw + ': not an object.'); return; }
        if (!isDateOrTime(h.date)) err(hw + ': "date" is not an ISO date.');
        if (!str(h.what)) err(hw + ': "what" is required.');
        if (BY.indexOf(h.by) === -1) err(hw + ': "by" must be "person" or "agent".');
      });
      for (let j = 1; j < it.history.length; j++) {
        const a = it.history[j - 1], b = it.history[j];
        if (a && b && isDateOrTime(a.date) && isDateOrTime(b.date) && String(b.date) < String(a.date)) { warn(w + ': "history" is not oldest first.'); break; }
      }
    };
    // questions[]: what to ask the reporter. In a full item each is whole; in an update, one with "text" is a
    // new question (whole too), one without only changes the status of a question MxScout keeps.
    const questions = (partial) => {
      if (it.questions === undefined) return [];
      if (!Array.isArray(it.questions)) { err(w + ': "questions" must be a list of { id, text, why, status, asked }.'); return []; }
      const ids = [];
      it.questions.forEach((q, j) => {
        const qw = w + ': question ' + (q && q.id ? q.id : j + 1);
        if (!q || typeof q !== 'object') { err(qw + ': not an object.'); return; }
        if (!(typeof q.id === 'string' && QID.test(q.id))) err(qw + ': "id" must be a short slug, unique in the item ("q1", "q2", "role").');
        else if (ids.indexOf(q.id) !== -1) err(qw + ': the id appears twice.');
        else ids.push(q.id);
        if (QSTATUSES.indexOf(q.status) === -1) err(qw + ': "status" must be one of ' + QSTATUSES.join(', ') + '.');
        const whole = !partial || q.text !== undefined;
        if (whole) {
          if (!str(q.text)) err(qw + ': "text" is required — the question as the reporter will read it.');
          if (!str(q.why)) err(qw + ': "why" is required — what it settles for the verdict or the proposal.');
          if (!isDate(q.asked)) err(qw + ': "asked" must be an ISO date (YYYY-MM-DD).');
        }
        if (q.answered !== undefined && !isDate(q.answered)) err(qw + ': "answered" must be an ISO date (YYYY-MM-DD).');
        if (q.status === 'answered' && q.answered === undefined) warn(qw + ': answered — set "answered" to the date.');
        if (q.status !== 'answered' && q.answered !== undefined) warn(qw + ': it has "answered" but its status is ' + q.status + '.');
      });
      return ids;
    };
    // thread[]: the exchange with the reporter, append-only — MxScout keeps what it has and adds the rest.
    const thread = (qids, partial) => {
      if (it.thread === undefined) return;
      if (!Array.isArray(it.thread)) { err(w + ': "thread" must be a list of { date, from, text }.'); return; }
      it.thread.forEach((t, j) => {
        const tw = w + ': thread ' + (j + 1);
        if (!t || typeof t !== 'object') { err(tw + ': not an object.'); return; }
        if (!isDateOrTime(t.date)) err(tw + ': "date" is not an ISO date.');
        if (FROM.indexOf(t.from) === -1) err(tw + ': "from" must be one of ' + FROM.join(', ') + '.');
        if (!str(t.text)) err(tw + ': "text" is required.');
        if (t.answers !== undefined) {
          if (!Array.isArray(t.answers) || t.answers.some((a) => typeof a !== 'string')) err(tw + ': "answers" must be a list of question ids.');
          else t.answers.forEach((a) => {
            if (!partial && qids.indexOf(a) === -1) err(tw + ': answers "' + a + '", which is not one of the item\'s questions.');
            const q = (it.questions || []).find((x) => x && x.id === a);
            if (q && q.status === 'open') warn(tw + ': it answers ' + a + ', which is still open — mark it answered.');
          });
        }
      });
      for (let j = 1; j < it.thread.length; j++) {
        const a = it.thread[j - 1], b = it.thread[j];
        if (a && b && isDateOrTime(a.date) && isDateOrTime(b.date) && String(b.date) < String(a.date)) { warn(w + ': "thread" is not oldest first.'); break; }
      }
    };
    const waitingRule = () => {
      const open = (it.questions || []).filter((q) => q && q.status === 'open').length;
      if (open && (it.status === 'open' || it.status === 'in-progress')) warn(w + ': ' + open + ' question(s) to the reporter are open — the status is "waiting" until they answer.');
      if (it.status === 'waiting' && !open && Array.isArray(it.questions)) warn(w + ': "waiting" with no open question — say what you are waiting for, or set it open.');
    };

    // ----- an update: only what changed, merged into the item MxScout keeps -----
    if (it.update !== undefined) {
      if (it.update !== true) { err(w + ': "update" is true or left out.'); return; }
      if (!isDateOrTime(it.updated)) err(w + ': "updated" is required (an ISO date).');
      const unknown = Object.keys(it).filter((k) => UPDATE_FIELDS.indexOf(k) === -1);
      if (unknown.length) err(w + ': an update carries only ' + UPDATE_FIELDS.join(', ') + ' — to change ' + unknown.join(', ') + ', send the whole item without "update".');
      if (!['status', 'planned', 'closed', 'history', 'thread', 'questions'].some((k) => it[k] !== undefined)) warn(w + ': the update changes nothing.');
      statusAndDates();
      history(false);
      const qids = questions(true);
      thread(qids, true);
      waitingRule();
      return;
    }

    // ----- every item -----
    if (!str(it.title)) err(w + ': "title" is required.');
    else if (it.title.length > 200) warn(w + ': "title" is over 200 characters — say it in a line.');
    if (!str(it.reported)) err(w + ': "reported" is required — the text as the person pasted it, trimmed.');
    else if (it.reported !== it.reported.trim()) warn(w + ': "reported" has spaces or blank lines around it; trim it.');
    if (it.language !== undefined && !LANG.test(String(it.language))) warn(w + ': "language" should be an ISO 639 code ("en", "pl"); English is assumed.');
    if (it.source !== undefined && typeof it.source !== 'string') err(w + ': "source" must be text (it is shown, never opened).');
    ['created', 'updated'].forEach((k) => {
      if (it[k] === undefined) err(w + ': "' + k + '" is required (an ISO date).');
      else if (!isDateOrTime(it[k])) err(w + ': "' + k + '" is not an ISO date or date-time: ' + JSON.stringify(it[k]) + '.');
    });
    if (isDateOrTime(it.created) && isDateOrTime(it.updated) && String(it.updated).slice(0, 10) < String(it.created).slice(0, 10)) warn(w + ': "updated" is before "created".');
    if (it.status === undefined) err(w + ': "status" must be one of ' + STATUSES.join(', ') + '.');
    statusAndDates();
    history(true);
    const qids = questions(false);
    thread(qids, false);
    waitingRule();
    const allowed = COMMON.concat(OWN[kind]);
    Object.keys(it).forEach((k) => {
      if (allowed.indexOf(k) !== -1) return;
      const other = KINDS.filter((x) => OWN[x].indexOf(k) !== -1).map((x) => NAMES[x]);
      warn(w + ': "' + k + '" is not a field of ' + NAMES[kind] + (other.length ? ' (it is one of ' + other.join(', of ') + ')' : '') + '; MxScout ignores it.');
    });

    const flows = (list, where) => {
      if (list === undefined) return;
      if (!Array.isArray(list)) { err(w + ': ' + where + ' must be a list of qualified names.'); return; }
      list.forEach((qn) => {
        if (!str(qn)) err(w + ': ' + where + ' holds an empty name.');
        else if (inPack(pack, 'flow', qn) === false) warn(w + ': ' + where + ' names ' + qn + ', which is not in the pack.');
      });
    };
    const texts = (list, where) => {
      if (list === undefined) return;
      if (!Array.isArray(list) || list.some((s) => !str(s))) err(w + ': ' + where + ' must be a list of sentences.');
    };
    const diagram = (d, where, depth) => {
      if (d === undefined) return;
      if (!Array.isArray(d)) { err(w + ': ' + where + ' must be a list of steps, decisions and ends.'); return; }
      d.forEach((x, j) => {
        const xw = where + '[' + j + ']';
        if (!x || typeof x !== 'object') { err(w + ': ' + xw + ' is not an object.'); return; }
        if (str(x.step) || str(x.end)) return;
        if (str(x.decision)) {
          if (!Array.isArray(x.ways) || x.ways.length < 2) warn(w + ': ' + xw + ' is a decision with fewer than two ways.');
          (Array.isArray(x.ways) ? x.ways : []).forEach((way, k) => {
            if (!way || typeof way !== 'object') { err(w + ': ' + xw + ' way ' + (k + 1) + ' is not an object.'); return; }
            if (depth < 6) diagram(way.then, xw + '.ways[' + k + '].then', depth + 1);
            else if (way.then !== undefined) warn(w + ': ' + xw + ' nests deeper than 6 levels; the rest is dropped.');
          });
          return;
        }
        err(w + ': ' + xw + ' has no "step", "decision" or "end".');
      });
    };
    const story = (s, where, min) => {
      if (!str(s)) { err(w + ': ' + where + ' is required.'); return; }
      if (min && words(s) < min) warn(w + ': ' + where + ' has ' + words(s) + ' words — at least ' + min + ' tell the case.');
      if (/^\s*(?:[-*•]\s|#{1,6}\s)|\*\*|<\/?[a-z][^>]*>/im.test(s)) warn(w + ': ' + where + ' looks like markup; it is shown as plain text — paragraphs separated by a blank line.');
    };
    const risks = (list, where) => {
      if (list === undefined) return;
      if (!Array.isArray(list)) { err(w + ': ' + where + ' must be a list.'); return; }
      list.forEach((r, j) => {
        if (!r || LEVELS.indexOf(r.level) === -1 || !str(r.title)) err(w + ': ' + where + '[' + j + '] needs a "level" (P1, P2 or P3) and a "title".');
      });
    };
    const impact = (v) => {
      if (v === undefined) return;
      if (!v || typeof v !== 'object' || Array.isArray(v)) { err(w + ': "impact" must be { flows, roles, data }.'); return; }
      flows(v.flows, 'impact.flows');
      texts(v.roles, 'impact.roles');
      if (v.data !== undefined && typeof v.data !== 'string') err(w + ': impact.data must be text.');
    };
    const proposal = (p, where, required) => {
      if (p === undefined) { if (required) err(w + ': "' + where + '" is required.'); return; }
      if (!p || typeof p !== 'object' || Array.isArray(p)) { err(w + ': "' + where + '" must be an object.'); return; }
      if (!str(p.summary)) err(w + ': ' + where + '.summary is required.');
      if (p.story !== undefined) story(p.story, where + '.story', 0);
      texts(p.steps, where + '.steps');
      diagram(p.diagram, where + '.diagram', 0);
      if (!Array.isArray(p.changes) || p.changes.length === 0) err(w + ': ' + where + '.changes must list at least one model change.');
      else p.changes.forEach((c, j) => {
        const cw = where + '.changes[' + j + ']';
        if (!c || typeof c !== 'object') { err(w + ': ' + cw + ' is not an object.'); return; }
        if (CHANGE_KINDS.indexOf(c.kind) === -1) err(w + ': ' + cw + ' "kind" must be one of ' + CHANGE_KINDS.join(', ') + '.');
        if (!str(c.target)) err(w + ': ' + cw + ' needs a "target" (a qualified name).');
        if (ACTIONS.indexOf(c.action) === -1) err(w + ': ' + cw + ' "action" must be add, change or remove.');
        if (!str(c.what)) err(w + ': ' + cw + ' needs "what" — one or two sentences.');
        if (c.action !== 'add' && str(c.target) && inPack(pack, c.kind, c.target) === false) warn(w + ': ' + cw + ' ' + c.target + ' is not in the pack — name an existing one as the pack does; for something new the action is "add".');
      });
      if (p.effort !== undefined && typeof p.effort !== 'string') err(w + ': ' + where + '.effort must be text.');
    };

    // ----- per kind -----
    if (kind === 'ticket') {
      if (VERDICTS.indexOf(it.verdict) === -1) err(w + ': "verdict" must be one of ' + VERDICTS.join(', ') + '.');
      if (CONFIDENCE.indexOf(it.confidence) === -1) err(w + ': "confidence" must be one of ' + CONFIDENCE.join(', ') + '.');
      if (!str(it.summary)) err(w + ': "summary" is required.');
      story(it.story, '"story"', 80);
      if (it.traced !== undefined) {
        if (!it.traced || typeof it.traced !== 'object') err(w + ': "traced" must be { steps, flows, diagram }.');
        else { texts(it.traced.steps, 'traced.steps'); flows(it.traced.flows, 'traced.flows'); diagram(it.traced.diagram, 'traced.diagram', 0); }
      } else warn(w + ': no "traced" — the behaviour as the model has it is what the verdict rests on.');
      if (it.evidence === undefined || (Array.isArray(it.evidence) && it.evidence.length === 0)) warn(w + ': no "evidence" — cite each place the verdict rests on.');
      else if (!Array.isArray(it.evidence)) err(w + ': "evidence" must be a list of { kind, target, what }.');
      else it.evidence.forEach((e, j) => {
        if (!e || CHANGE_KINDS.indexOf(e.kind) === -1 || !str(e.target) || !str(e.what)) err(w + ': evidence[' + j + '] needs "kind" (one of ' + CHANGE_KINDS.join(', ') + '), "target" and "what".');
        else if (inPack(pack, e.kind, e.target) === false) warn(w + ': evidence[' + j + '] ' + e.target + ' is not in the pack.');
      });
      texts(it.needs, '"needs"');
      if ((it.verdict === 'cannot-tell' || it.confidence === 'low') && !(Array.isArray(it.needs) && it.needs.length)) warn(w + ': ' + (it.verdict === 'cannot-tell' ? 'cannot-tell' : 'low confidence') + ' — say in "needs" what would settle it.');
      if (!str(it.reply)) warn(w + ': no "reply" — a few sentences to paste back into the ticket.');
      if (it.verdict === 'bug') { if (it.fix === undefined) warn(w + ': a bug — propose the fix in "fix".'); }
      proposal(it.fix, 'fix', false);
      if (it.risk !== undefined && !(typeof it.risk === 'string' && (SLUG.test(it.risk) || /^c-[0-9a-z-]+$/i.test(it.risk)))) err(w + ': "risk" must be a known risk\'s id, as the pack or the documentation gives it.');
      if (it.risk !== undefined && pack && pack.triage && pack.triage.length && !pack.triage.some((r) => r.id === it.risk)) warn(w + ': "risk" ' + it.risk + ' is not in the pack\'s risk triage — use it only when the documentation\'s Risks section gives that id.');
    }
    if (kind === 'jira') {
      if (!str(it.summary)) err(w + ': "summary" is required.');
      story(it.story, '"story"', 80);
      const s = it.scope;
      if (!s || typeof s !== 'object' || Array.isArray(s)) err(w + ': "scope" is required — { feasible, why, modules, touches }.');
      else {
        if (FEASIBLE.indexOf(s.feasible) === -1) err(w + ': scope.feasible must be one of ' + FEASIBLE.join(', ') + '.');
        if (!str(s.why)) warn(w + ': scope.why — say in a sentence why.');
        texts(s.modules, 'scope.modules');
        flows(s.touches, 'scope.touches');
      }
      proposal(it.proposal, 'proposal', true);
    }
    if (kind === 'idea') {
      const n = it.now;
      if (!n || typeof n !== 'object' || Array.isArray(n)) err(w + ': "now" is required — how it works today: { summary, story, steps, flows, diagram }.');
      else {
        if (!str(n.summary)) err(w + ': now.summary is required.');
        story(n.story, 'now.story', 80);
        texts(n.steps, 'now.steps');
        flows(n.flows, 'now.flows');
        diagram(n.diagram, 'now.diagram', 0);
      }
      proposal(it.proposal, 'proposal', true);
    }
    if (kind === 'jira' || kind === 'idea') {
      impact(it.impact);
      risks(it.risks, '"risks"');
      texts(it.open, '"open"');
      if (it.effort !== undefined && typeof it.effort !== 'string') err(w + ': "effort" must be text.');
      if (!str(it.effort)) warn(w + ': no "effort" — a rough size, in words.');
    }
    if (kind !== 'ticket' && it.reply !== undefined && typeof it.reply !== 'string') err(w + ': "reply" must be text.');
    if (kind === 'other') {
      if (!str(it.summary)) err(w + ': "summary" is required.');
      story(it.story, '"story"', 0);
      if (it.sources === undefined || (Array.isArray(it.sources) && !it.sources.length)) warn(w + ': no "sources" — name the flows the answer rests on.');
      flows(it.sources, '"sources"');
      proposal(it.proposal, 'proposal', false);
    }
  });
  return { errors, warnings };
}

// ---------- list ----------
// Where the Assist items and the inbox are: the project folder itself — or, for a project kept inside the
// Mendix project (mxscout/), its .local/, which is this machine's only: Assist items are personal, never committed.
function localOf(folder) {
  if (fs.existsSync(path.join(folder, 'mxscout', 'mxscout.json'))) return path.join(folder, 'mxscout', '.local');
  if (fs.existsSync(path.join(folder, 'mxscout.json'))) return path.join(folder, '.local');
  return folder;
}
// The items under <folder>/assist/<kind>/*.json, as MxScout keeps them (a bare item; an envelope of one is
// read too), and the *.json files still waiting in <folder>/inbox/.
function list(folder, opts) {
  opts = opts || {};
  folder = localOf(folder);
  const items = [], problems = [], waiting = [];
  const kinds = opts.kind ? [opts.kind] : KINDS;
  kinds.forEach((kind) => {
    const dir = path.join(folder, 'assist', FOLDERS[kind]);
    let names = [];
    try { names = fs.readdirSync(dir).filter((f) => /\.json$/i.test(f)).sort(); } catch (e) { return; }
    names.forEach((f) => {
      const rel = path.join('assist', FOLDERS[kind], f);
      let it;
      try { it = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { problems.push(rel + ': not JSON'); return; }
      if (it && it.format === FORMAT && Array.isArray(it.items)) it = it.items[0];
      if (!it || typeof it !== 'object') { problems.push(rel + ': not an item'); return; }
      const h = Array.isArray(it.history) && it.history.length ? it.history[it.history.length - 1] : null;
      const asked = Array.isArray(it.questions) ? it.questions.filter((q) => q && q.status === 'open').length : 0;
      items.push({ kind, id: it.id || f.replace(/\.json$/i, ''), status: it.status || '?', asked, planned: it.planned || '', closed: it.closed || '',
        updated: it.updated || '', title: it.title || '', verdict: it.verdict || '', last: h ? h.date + ' ' + h.by + ': ' + h.what : '', file: rel });
    });
  });
  try { fs.readdirSync(path.join(folder, 'inbox')).filter((f) => /\.json$/i.test(f)).sort().forEach((f) => waiting.push(path.join('inbox', f))); } catch (e) { /* no inbox */ }
  const statuses = opts.status ? String(opts.status).split(',') : null;
  return { items: statuses ? items.filter((x) => statuses.indexOf(x.status) !== -1) : items, problems, waiting, hasAssist: fs.existsSync(path.join(folder, 'assist')) };
}

function printList(folder, r) {
  if (!r.hasAssist) console.log('No assist/ folder in ' + folder + ' yet: no items kept.');
  else if (!r.items.length) console.log('No items' + ' under ' + path.join(folder, 'assist') + ' match.');
  else {
    console.log('kind | id | status | open questions | planned | closed | updated | title');
    r.items.forEach((x) => console.log([x.kind, x.id, x.status + (x.verdict ? ' (' + x.verdict + ')' : ''), x.asked || '-', x.planned || '-', x.closed || '-', x.updated || '-', x.title].join(' | ')));
    const count = {};
    r.items.forEach((x) => { count[x.status] = (count[x.status] || 0) + 1; });
    console.log(r.items.length + ' item' + (r.items.length === 1 ? '' : 's') + ': ' + STATUSES.filter((s) => count[s]).map((s) => count[s] + ' ' + s).join(', ') + '. Each file is assist/<kind>/<id>.json — read it whole before you update it.');
  }
  r.problems.forEach((p) => console.log('unreadable: ' + p));
  if (r.waiting.length) console.log('waiting in inbox/ (not taken by MxScout yet — is the project open?): ' + r.waiting.join(', '));
}

function main(argv) {
  const args = argv.slice();
  const take = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v === undefined ? null : v; };
  const packFile = take('--pack'), kind = take('--kind'), status = take('--status');
  const [cmd, arg] = args;
  if (cmd === 'check' && arg) {
    let env;
    try { env = JSON.parse(fs.readFileSync(arg, 'utf8')); } catch (e) { console.error(arg + ': ' + e.message.split('\n')[0]); return 1; }
    const early = [];
    const pack = packFile ? loadPack(packFile, (m) => early.push(m)) : null;
    const r = check(env, { pack });
    r.warnings = early.concat(r.warnings);
    r.errors.forEach((m) => console.log('error: ' + m));
    r.warnings.forEach((m) => console.log('warning: ' + m));
    const n = Array.isArray(env && env.items) ? env.items.length : 0;
    console.log(r.errors.length ? r.errors.length + ' error(s): MxScout would refuse this file. Fix them.' : 'OK: ' + n + ' item' + (n === 1 ? '' : 's') + (r.warnings.length ? ', ' + r.warnings.length + ' warning(s)' : '') + '.');
    return r.errors.length ? 1 : 0;
  }
  if (cmd === 'list' && arg) {
    if (kind && KINDS.indexOf(kind) === -1) { console.error('--kind must be one of ' + KINDS.join(', ')); return 2; }
    if (!fs.existsSync(arg)) { console.error('No such folder: ' + arg); return 1; }
    printList(localOf(arg), list(arg, { kind, status }));
    return 0;
  }
  console.error('Usage: node check-assist.js check <file.json> [--pack ai-pack.md] | list <project-folder> [--kind ticket|jira|idea|other] [--status open,in-progress]');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { check, list, localOf, main, FORMAT, KINDS, FOLDERS, STATUSES, QSTATUSES, VERDICTS };
