#!/usr/bin/env node
/* A self-test of check-assist.js, with invented items of an invented sales app. No dependencies — Node only.
 *
 *   node selftest.js
 *
 * It checks that every example in reference/assist-format.md passes the checker (so the format and the
 * checker cannot drift apart), that what MxScout would refuse is an error, that `list` reads a project
 * folder's assist/ and inbox/, and that the command line answers with the right exit codes. It writes
 * only into a temporary folder of its own, removed at the end.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { check, list } = require('./check-assist.js');

let passed = 0, failed = 0;
function ok(cond, message) {
  if (cond) { passed++; console.log('  ok  ' + message); } else { failed++; console.log('  FAIL ' + message); }
}
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---- the examples in the format reference pass, with no warning ----
const format = fs.readFileSync(path.join(__dirname, 'reference', 'assist-format.md'), 'utf8');
const examples = [];
format.replace(/```json\n([\s\S]*?)\n```/g, (m, body) => { examples.push(JSON.parse(body)); return m; });
ok(examples.length >= 3 && examples.every((e) => e.format === 'mxscout-assist'), 'assist-format.md carries ' + examples.length + ' examples, each JSON and an Assist envelope');
const kindsShown = new Set();
examples.forEach((e, i) => {
  const r = check(e);
  e.items.forEach((it) => kindsShown.add(it.kind));
  ok(r.errors.length === 0 && r.warnings.length === 0, 'example ' + (i + 1) + ' (' + e.items.map((it) => it.kind + ' ' + it.id).join(', ') + ') passes' + (r.errors.length + r.warnings.length ? ': ' + r.errors.concat(r.warnings).join(' / ') : ''));
});
ok(['ticket', 'jira', 'idea', 'other'].every((k) => kindsShown.has(k)), 'the examples show every kind');

// ---- invented items, and what the checker makes of them ----
const ticket = examples[0].items[0];
const jira = examples[1].items[0];
const idea = examples[2].items.find((it) => it.kind === 'idea');
const other = examples[2].items.find((it) => it.kind === 'other');
const env = (...items) => ({ format: 'mxscout-assist', version: 1, items });
const errorsOf = (e) => check(e).errors.join(' / ');
const warningsOf = (e) => check(e).warnings.join(' / ');

ok(/"format" must be "mxscout-assist"/.test(errorsOf({ format: 'mxscout-descriptions', version: 1, items: [ticket] })), 'a descriptions file is not an Assist envelope');
ok(/"tickets" belongs to no file/.test(errorsOf(Object.assign(env(ticket), { tickets: [] }))), 'tickets in the envelope are refused: they are items now');
ok(/at least one item/.test(errorsOf(env())), 'an envelope with no items is refused');
ok(/"kind" must be one of/.test(errorsOf(env(Object.assign(clone(ticket), { kind: 'bug' })))), 'an unknown kind is refused');
ok(/"verdict" must be one of/.test(errorsOf(env(Object.assign(clone(ticket), { verdict: 'maybe' })))), 'a verdict outside its list is refused');
ok(/"status" must be one of/.test(errorsOf(env(Object.assign(clone(jira), { status: 'closed' })))), 'a status outside its list is refused');
ok(/drop the leading #/.test(errorsOf(env(Object.assign(clone(ticket), { id: '#4711' })))), 'a ticket number with a # is refused, with the reason');
ok(/no number in it/.test(warningsOf(env(Object.assign(clone(jira), { id: 'discounts' })))), 'a Jira key without a number is a warning: ask for it');
ok(/must be a slug/.test(errorsOf(env(Object.assign(clone(idea), { id: 'Reorder From History' })))), 'an idea id that is not a slug is refused');
ok(/must be a slug/.test(errorsOf(env(Object.assign(clone(other), { id: '../escape' })))), 'an id that would leave assist/ is refused');
ok(/appear twice/.test(errorsOf(env(ticket, ticket))), 'the same kind and id twice in one file is refused');
ok(/not an ISO date/.test(errorsOf(env(Object.assign(clone(ticket), { created: '15.10.2026' })))), 'a date that is not ISO is refused');
ok(/"planned" must be an ISO date/.test(errorsOf(env(Object.assign(clone(jira), { planned: '2026-02-30' })))), 'a date that does not exist is refused');
ok(/"by" must be "person" or "agent"/.test(errorsOf(env(Object.assign(clone(ticket), { history: [{ date: '2026-10-15', what: 'Checked.', by: 'claude' }] })))), 'history says who: a person or the agent');
ok(/"history" is required/.test(errorsOf(env(Object.assign(clone(other), { history: undefined })))), 'an item without history is refused');
ok(/set "closed"/.test(warningsOf(env(Object.assign(clone(jira), { status: 'done' })))), 'done without a closed date is a warning');
ok(/"scope" is required/.test(errorsOf(env(Object.assign(clone(jira), { scope: undefined })))), 'a Jira issue needs its scope');
ok(/scope.feasible must be one of/.test(errorsOf(env(Object.assign(clone(jira), { scope: Object.assign({}, jira.scope, { feasible: 'sure' }) })))), 'feasibility is yes, partly or no');
ok(/proposal.changes must list/.test(errorsOf(env(Object.assign(clone(idea), { proposal: Object.assign({}, idea.proposal, { changes: [] }) })))), 'a proposal names at least one model change');
ok(/"action" must be add, change or remove/.test(errorsOf(env(Object.assign(clone(idea), { proposal: Object.assign({}, idea.proposal, { changes: [{ kind: 'page', target: 'Orders.Order_Detail_Customer', action: 'rename', what: 'x' }] }) })))), 'a model change is added, changed or removed');
ok(/"now" is required/.test(errorsOf(env(Object.assign(clone(idea), { now: undefined })))), 'an idea says how it works now');
ok(/propose the fix/.test(warningsOf(env(Object.assign(clone(ticket), { fix: undefined })))), 'a bug without a fix is a warning');
ok(/what would settle it/.test(warningsOf(env(Object.assign(clone(ticket), { verdict: 'cannot-tell', fix: undefined, needs: [] })))), 'cannot-tell without needs is a warning');
ok(/not a field of a ticket \(it is one of a Jira issue, of an idea\)/.test(warningsOf(env(Object.assign(clone(ticket), { effort: 'small' })))), 'a field of another kind is a warning, and says whose it is');

ok(/ISO 639 code/.test(warningsOf(env(Object.assign(clone(ticket), { language: 'Polish' })))) && !warningsOf(env(Object.assign(clone(ticket), { language: 'pl' }))), 'an item\'s language is an ISO code ("pl"), not a name');

ok(/"setLanguage": true needs "language"/.test(errorsOf(Object.assign(env(ticket), { setLanguage: true }))) && !errorsOf(Object.assign(env(ticket), { setLanguage: true, language: 'pl' })), 'setLanguage sets the project\'s language, so it needs one');

// ---- questions to the reporter, the thread, waiting, and an update ----
const waiting = examples[3].items[0];
const update = examples[4].items[0];
ok(waiting.status === 'waiting' && waiting.questions.length === 2 && waiting.thread.length === 1, 'the format shows a ticket waiting for the reporter, with its questions and thread');
ok(update.update === true && !update.title, 'and an update that carries only what changed');
ok(/"status" must be one of/.test(errorsOf(env(Object.assign(clone(waiting), { questions: [Object.assign({}, waiting.questions[0], { status: 'pending' })] })))), 'a question is open, answered or dropped');
ok(/"why" is required/.test(errorsOf(env(Object.assign(clone(waiting), { questions: [Object.assign({}, waiting.questions[0], { why: '' })] })))), 'a question says why it matters');
ok(/the id appears twice/.test(errorsOf(env(Object.assign(clone(waiting), { questions: [waiting.questions[0], waiting.questions[0]] })))), 'question ids are unique in the item');
ok(/the status is "waiting"/.test(warningsOf(env(Object.assign(clone(waiting), { status: 'open' })))), 'open questions on an open item: the status is waiting');
ok(/"waiting" with no open question/.test(warningsOf(env(Object.assign(clone(waiting), { questions: waiting.questions.map((q) => Object.assign({}, q, { status: 'dropped' })) })))), 'waiting with nothing asked is a warning');
ok(/"from" must be one of reporter, person, agent/.test(errorsOf(env(Object.assign(clone(waiting), { thread: [{ date: '2026-10-17', from: 'customer', text: 'x' }] })))), 'a thread entry is from the reporter, the person or the agent');
ok(/not one of the item's questions/.test(errorsOf(env(Object.assign(clone(waiting), { thread: [{ date: '2026-10-17', from: 'reporter', text: 'A customer.', answers: ['q9'] }] })))), 'a thread entry answers the item\'s own questions');
ok(/still open — mark it answered/.test(warningsOf(env(Object.assign(clone(waiting), { thread: waiting.thread.concat([{ date: '2026-10-18', from: 'reporter', text: 'A customer.', answers: ['q2'] }]) })))), 'an answered question left open is a warning');
ok(/set "answered" to the date/.test(warningsOf(env(Object.assign(clone(waiting), { status: 'open', questions: waiting.questions.map((q) => Object.assign({}, q, { status: 'answered' })) })))), 'an answered question carries its date');
const answer = { id: 'SD-4720', kind: 'ticket', update: true, updated: '2026-10-18', status: 'in-progress',
  questions: [{ id: 'q1', status: 'answered', answered: '2026-10-18' }, { id: 'q2', status: 'answered', answered: '2026-10-18' }],
  thread: [{ date: '2026-10-18', from: 'reporter', text: "I'm a customer, it says I'm not allowed to change Notes.", answers: ['q1', 'q2'] }] };
ok(!errorsOf(env(answer)) && !warningsOf(env(answer)), 'an update records the reporter\'s answer and the questions it answers, without the whole item');
ok(/an update carries only/.test(errorsOf(env(Object.assign(clone(answer), { verdict: 'bug' })))), 'an update cannot change the verdict: that is the whole item again');
ok(/"updated" is required/.test(errorsOf(env(Object.assign(clone(answer), { updated: undefined })))), 'an update says when');
ok(/"text" is required/.test(errorsOf(env(Object.assign(clone(answer), { questions: [{ id: 'q3', status: 'open', text: '' }] })))), 'a new question in an update comes whole');

// ---- --pack: names against the model ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mendix-assist-selftest-'));
try {
  const packFile = path.join(tmp, 'ai-pack.md');
  fs.writeFileSync(packFile, [
    '# MxScout AI pack', 'format: mxscout-ai-pack 1', 'project: Sales', '', '## index', 'module | lines', 'Orders | 7-12', '',
    '## module Orders', '### entities', 'E Order #1a2b3c4d | attrs: Status:Enumeration Orders.ENUM_OrderStatus',
    '### MF Orders.ACT_Order_Cancel #0a1b2c3d', '### MF Orders.SUB_Order_ChangeStatus #1b2c3d4e', '### MF Orders.DS_Order_QueueForClerk #2c3d4e5f', ''
  ].join('\n'));
  const goodFile = path.join(tmp, 'assist.SD-4711.json');
  fs.writeFileSync(goodFile, JSON.stringify(examples[0], null, 2));
  const run = (args) => { try { return { code: 0, out: execFileSync(process.execPath, [path.join(__dirname, 'check-assist.js')].concat(args), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; } };
  let r = run(['check', goodFile, '--pack', packFile]);
  ok(r.code === 0 && /OK: 1 item/.test(r.out) && !/not in the pack/.test(r.out), 'check --pack: a ticket naming flows the pack has passes');
  const typo = clone(examples[0]); typo.items[0].traced.flows.push('Orders.DS_Order_QueueForClerks');
  fs.writeFileSync(goodFile, JSON.stringify(typo));
  r = run(['check', goodFile, '--pack', packFile]);
  ok(r.code === 0 && /Orders\.DS_Order_QueueForClerks, which is not in the pack/.test(r.out), 'check --pack: a name the model does not have is a warning');
  fs.writeFileSync(goodFile, JSON.stringify(env(Object.assign(clone(ticket), { verdict: 'wontfix' }))));
  r = run(['check', goodFile]);
  ok(r.code === 1 && /MxScout would refuse/.test(r.out), 'check: a file with errors exits 1');
  r = run(['nonsense']);
  ok(r.code === 2 && /Usage/.test(r.out), 'an unknown command prints the usage and exits 2');

  // ---- list: a project folder ----
  const folder = path.join(tmp, 'Sales');
  const put = (rel, obj) => { fs.mkdirSync(path.dirname(path.join(folder, rel)), { recursive: true }); fs.writeFileSync(path.join(folder, rel), JSON.stringify(obj, null, 2)); };
  r = run(['list', path.join(tmp, 'nowhere')]);
  ok(r.code === 1, 'list: a folder that is not there exits 1');
  fs.mkdirSync(folder);
  ok(list(folder).hasAssist === false && /no items kept/.test(run(['list', folder]).out), 'list: a project with no assist/ says so');
  put('assist/tickets/SD-4711.json', ticket);
  put('assist/jira/SALES-88.json', jira);
  put('assist/ideas/reorder-from-history.json', idea);
  put('assist/other/who-can-reopen-an-order.json', other);
  put('assist/tickets/SD-4720.json', waiting);
  put('inbox/assist-SD-4712.json', env(Object.assign(clone(ticket), { id: 'SD-4712' })));
  fs.writeFileSync(path.join(folder, 'assist', 'tickets', 'broken.json'), '{ not json');
  const all = list(folder);
  ok(all.items.length === 5 && ['SD-4720', 'SD-4711', 'SALES-88', 'reorder-from-history', 'who-can-reopen-an-order'].every((id) => all.items.some((x) => x.id === id)), 'list: reads one item per file, every kind');
  ok(all.items.find((x) => x.id === 'SALES-88').planned === '2026-11-20' && all.items.find((x) => x.id === 'who-can-reopen-an-order').status === 'done', 'list: with each one\'s status and planned date');
  ok(all.problems.length === 1 && /broken\.json/.test(all.problems[0]), 'list: an unreadable file is named, not skipped silently');
  ok(all.waiting.length === 1 && /assist-SD-4712\.json/.test(all.waiting[0]), 'list: the files still waiting in inbox/');
  ok(list(folder, { status: 'open,in-progress' }).items.every((x) => x.status === 'open' || x.status === 'in-progress') && list(folder, { status: 'open,in-progress' }).items.length === 3 && list(folder, { status: 'waiting' }).items.length === 1, 'list --status keeps only those statuses');
  ok(list(folder, { kind: 'jira' }).items.length === 1, 'list --kind keeps only that kind');
  ok(all.items.find((x) => x.id === 'SD-4720').asked === 2, 'list counts the questions still open');
  r = run(['list', folder]);
  ok(r.code === 0 && /SALES-88 \| open \| - \| 2026-11-20/.test(r.out) && /SD-4711 \| open \(bug\) \| -/.test(r.out) && /SD-4720 \| waiting \(cannot-tell\) \| 2/.test(r.out) && /waiting in inbox/.test(r.out), 'list on the command line prints status, verdict and planned date');

  // ---- list: a project kept inside the Mendix project (mxscout/), its Assist items personal, in .local/ ----
  const app = path.join(tmp, 'OrderPortal');
  fs.mkdirSync(path.join(app, 'mxscout', '.local', 'assist', 'jira'), { recursive: true });
  fs.writeFileSync(path.join(app, 'OrderPortal.mpr'), '');
  fs.writeFileSync(path.join(app, 'mxscout', 'mxscout.json'), JSON.stringify({ format: 'mxscout-project', layout: 2, id: 'x', name: 'OrderPortal' }));
  fs.writeFileSync(path.join(app, 'mxscout', '.local', 'assist', 'jira', 'SALES-88.json'), JSON.stringify(jira));
  ok(list(app).items.length === 1 && list(path.join(app, 'mxscout')).items.length === 1, 'list: the Mendix project, or its mxscout/, reads the items in mxscout/.local/assist/');
  r = run(['list', app]);
  ok(r.code === 0 && /SALES-88/.test(r.out), 'list on the command line, given the Mendix project');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log((failed ? 'FAILED: ' : 'All passed: ') + passed + ' passed, ' + failed + ' failed.');
process.exit(failed ? 1 : 0);
