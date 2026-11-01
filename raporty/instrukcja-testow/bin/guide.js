#!/usr/bin/env node
// guide.js: turns the tester guide of the "instrukcja-testow" skill (instrukcja.json: access, accounts, scenarios with
// steps and actions) into the document testers get: by default the document spec of the "dokumentacja" skill (GEN-47),
// built there as .html, .docx, .md; with --pack a folder of standalone HTML files, one per topic, zipped (bin/pack.js).
// The same instrukcja.json drives bin/walkthrough.js, so the document and the browser check never drift apart.
// Before building it refuses a guide that breaks the rules for non-technical testers: a ticket key, a technical name,
// an access section with a gap, a scenario without a goal, account, steps or expected result, an account not in the
// table, the testers' password in any text.
// Usage: node guide.js instrukcja.json [outDir] [--walk przejscie/walkthrough.json] [--pack] [--check]
//   --walk   adds the result of the last browser walkthrough (date, every scenario passed or not) to the document
//   --pack   builds the pack (<outDir>/<name>/ and <outDir>/<name>.zip) instead of the single document
//   --check  only checks the rules; builds nothing
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const walkFile = flag('--walk');
const checkOnly = has('--check');
const packMode = has('--pack');
const guideFile = args[0];
if (!guideFile) { console.error('Usage: node guide.js instrukcja.json [outDir] [--walk przejscie/walkthrough.json] [--pack] [--check]'); process.exit(2); }
const guide = JSON.parse(fs.readFileSync(guideFile, 'utf8'));
const outDir = args[1] || path.dirname(path.resolve(guideFile));
const access = guide.access || {};
// Two kinds of environment: the local gateway on Karol's Mac (an account picked on a page, no password) and a cloud
// environment with a login page and the testers' shared password (walkthrough.js reads it from an environment variable).
const cloud = access.kind === 'cloud';

// Words a non-technical tester must never meet: ticket keys and names from the model or the build.
const TICKET_KEY = /\b[A-Z][A-Z0-9]{1,7}-\d+\b/;
const TECHNICAL = ['mikroflow', 'microflow', 'nanoflow', 'encj', 'entity', 'moduł', 'module', 'atrybut', 'attribute', 'xpath',
  'odata', 'mcp', 'pipeline', 'seed', 'refaktor', 'snippet', 'widget', 'commit', 'deploy', 'mda', 'postgres', 'baza danych'];
const TECH_NAME = /\b(ACT|SUB|DS|VAL|SCE|BCO|ACo|OCh|ACr|IVK|SE|DL|NAV)_[A-Za-z0-9]/;

// Entries of a scenario's steps: a real step has `text`; a section title, a heading, a paragraph or a note is document-only.
const realSteps = (s) => (s.steps || []).filter(st => st.text != null);
// The account a scenario or step names: by id, login or name (the gate shows names, the cloud login wants logins).
const accountOf = (ref) => (guide.accounts || []).find(a => a.id === ref || a.login === ref || a.name === ref) || null;
const accountLabel = (ref) => { const a = accountOf(ref); return a ? (a.name || a.login) : ref; };
// The accounts a scenario uses, in order of appearance: its own, then those its steps name.
const accountRefs = (s) => [s.account].concat(realSteps(s).map(st => st.account)).filter(Boolean).filter((r, i, arr) => arr.indexOf(r) === i);
// The texts of a dokumentacja block (a scenario's own sections).
const blockTexts = (b) => typeof b === 'string' ? [b] : b.p ? [b.p] : b.note ? [b.note.text] : b.ul || b.ol || (b.table ? [].concat(b.table.head, ...b.table.rows) : b.grid ? b.grid.map(g => g.cap + ' ' + g.text) : []);
// A login step of the access section: a sentence, or { text, expect } for the pack's table.
const stepText = (t) => typeof t === 'string' ? t : [t.text, t.expect].filter(Boolean).join(' ');

// Every text of the guide a tester reads, with where it sits (for the error message).
function texts() {
  const out = [];
  const add = (where, t) => { if (t) out.push([where, String(t)]); };
  ['title', 'lead', 'scope', 'audience'].forEach(k => add(k, guide[k]));
  const a = access;
  ['intro', 'gate', 'url', 'login', 'start', 'autoStop', 'restart', 'popup', 'lead', 'summary', 'accountsIntro'].forEach(k => add('access.' + k, a[k]));
  (a.loginSteps || []).forEach((t, i) => add('access.loginSteps[' + i + ']', stepText(t)));
  (a.notes || []).forEach((n, i) => add('access.notes[' + i + ']', n.text));
  (a.switch || []).forEach((t, i) => add('access.switch[' + i + ']', t));
  ['accountsNote', 'switchNote'].forEach(k => { if (a[k]) add('access.' + k, a[k].text); });
  (guide.accounts || []).forEach((x, i) => ['role', 'name', 'what'].forEach(k => add('accounts[' + i + '].' + k, x[k])));
  (guide.scenarios || []).forEach(s => {
    ['title', 'lead', 'goal', 'summary', 'hint', 'before', 'eyebrow'].forEach(k => add(s.id + '.' + k, s[k]));
    accountRefs(s).forEach(r => add(s.id + '.account', accountLabel(r)));
    (s.steps || []).forEach((st, i) => {
      ['text', 'expect', 'section', 'heading', 'p'].forEach(k => add(s.id + '.steps[' + i + '].' + k, st[k]));
      if (st.note) add(s.id + '.steps[' + i + '].note', st.note.text);
    });
    (s.notes || []).forEach((n, i) => add(s.id + '.notes[' + i + ']', n.text));
    if (s.accountsNote) add(s.id + '.accountsNote', s.accountsNote.text);
    (s.sections || []).forEach((x, i) => { add(s.id + '.sections[' + i + '].title', x.title); (x.blocks || []).forEach(b => blockTexts(b).forEach(t => add(s.id + '.sections[' + i + ']', t))); });
    if (s.expect) add(s.id + '.expect', s.expect.text);
  });
  (guide.notInGuide || []).forEach((t, i) => add('notInGuide[' + i + ']', t));
  (guide.troubles || []).forEach((t, i) => { add('troubles[' + i + ']', t.title); add('troubles[' + i + ']', t.text); });
  return out;
}

// The rules of the skill (SKILL.md, „Zasady instrukcji”). → list of problems, empty when the guide may be built.
function problems() {
  const out = [];
  const all = texts();
  for (const [where, t] of all) {
    const key = t.match(TICKET_KEY); if (key) out.push(where + ': numer ticketu „' + key[0] + '”');
    const name = t.match(TECH_NAME); if (name) out.push(where + ': nazwa techniczna „' + name[0] + '…”');
    const low = t.toLowerCase();
    TECHNICAL.forEach(w => { if (new RegExp('(^|[^a-ząćęłńóśźż])' + w).test(low)) out.push(where + ': słowo techniczne „' + w + '”'); });
  }
  // the testers' password, when this shell has it, is in no text (the value itself is never printed)
  const secret = cloud && access.passwordEnv ? process.env[access.passwordEnv] : null;
  if (secret) for (const [where, t] of all) if (t.includes(secret)) out.push(where + ': zawiera hasło testerów');
  const a = access;
  if (cloud) {
    ['url', 'login'].forEach(k => { if (!a[k]) out.push('access.' + k + ': brak (w chmurze: adres strony logowania i zdanie, skąd tester ma hasło)'); });
    if (!a.passwordEnv && !a.passwordOp) out.push('access.passwordEnv albo access.passwordOp: brak (skąd przeglądarka bierze hasło testerów: zmienna środowiska albo 1Password)');
  }
  else ['gate', 'login', 'start', 'autoStop', 'restart'].forEach(k => { if (!a[k]) out.push('access.' + k + ': brak (wejście na środowisko jest zawsze pierwsze i pełne)'); });
  if (!(a.loginSteps || []).length) out.push('access.loginSteps: brak kroków logowania');
  if (!(guide.accounts || []).length) out.push('accounts: brak kont testowych per rola');
  if (cloud) (guide.accounts || []).forEach((x, i) => { if (!x.login) out.push('accounts[' + i + ']: brak loginu (w chmurze tester loguje się loginem)'); });
  if (!(guide.scenarios || []).length) out.push('scenarios: brak scenariuszy');
  (guide.scenarios || []).forEach(s => {
    ['id', 'title', 'goal'].forEach(k => { if (!s[k]) out.push((s.id || '?') + ': brak ' + k); });
    const steps = realSteps(s);
    if (!steps.length) out.push(s.id + ': brak kroków');
    if (!s.account && !steps.every(st => st.account)) out.push(s.id + ': brak konta (scenariusz albo każdy jego krok)');
    (s.steps || []).forEach((st, i) => { if (st.text == null && !st.section && !st.heading && !st.p && !st.note) out.push(s.id + '.steps[' + i + ']: wpis bez treści'); });
    if (!s.expect || !s.expect.text) out.push(s.id + ': brak oczekiwanego wyniku');
    if ((guide.accounts || []).length) accountRefs(s).forEach(r => { if (!accountOf(r)) out.push(s.id + ': konto „' + r + '” nie jest w tabeli kont'); });
  });
  return out;
}

// The note on the last browser walkthrough: green, or a warning not to send this version.
function walkNote(walk) {
  return walk.ok
    ? { tag: 'Sprawdzone', kind: 'acc', text: 'Claude przeszedł tę instrukcję w przeglądarce krok po kroku, tymi samymi kontami: **wszystkie scenariusze przechodzą** (' + walk.date + ').' +
      (walk.human ? ' Kroków tylko dla człowieka (' + walk.human + ', np. kod z maila) przeglądarka nie robi; Claude przeszedł dalej tą samą bramką.' : '') }
    : { tag: 'Uwaga', kind: 'bad', text: 'Ostatnie przejście w przeglądarce (' + walk.date + ') nie przeszło całości. Tej wersji nie wysyłaj testerom.' };
}

// The single document's spec for the dokumentacja skill: access first, then accounts, one section per scenario, troubles
// and limits. No "how to report" chapter and no result, date or signature fields: nobody fills them in (skill 0.2).
function spec(walk) {
  const a = access, n = (guide.scenarios || []).length;
  const sections = [];
  sections.push({ id: 'summary', title: 'W skrócie', blocks: [
    { p: guide.lead },
    { table: { head: ['Scenariusz', 'Kto testuje', 'Cel'], rows: guide.scenarios.map(s => [s.id + '. ' + s.title, accountRefs(s).map(accountLabel).join(', '), s.goal]) } }
  ].concat(walk ? [{ note: walk.note }] : []) });
  const rows = [['Adres', '**' + (cloud ? a.url : a.gate) + '**'], ['Logowanie', a.login]]
    .concat(a.start ? [['Uruchomienie aplikacji', a.start]] : [], a.autoStop ? [['Samo się wyłącza', a.autoStop]] : [], a.restart ? [['Ponowne uruchomienie', a.restart]] : []);
  sections.push({ id: 'access', title: 'Jak wejść na środowisko testowe', blocks: [
    { p: a.intro || (cloud ? 'Aplikacja do testów działa na osobnym środowisku testowym. To, co w niej zrobisz, nie trafia do prawdziwych osób.' : 'Aplikacja do testów działa na komputerze Mac Studio, nie w chmurze. Ma tylko dane testowe.') },
    { table: { head: ['Co', 'Jak'], rows } },
    { steps: a.loginSteps.map((t, i) => ({ title: 'Krok ' + (i + 1), text: stepText(t) })) }
  ].concat(a.popup ? [{ note: { tag: 'Okienko', text: a.popup } }] : [], (a.notes || []).map(x => ({ note: x })), (a.switch || []).length ? [{ p: '**Zmiana konta:**' }, { ol: a.switch }] : []) });
  sections.push({ id: 'accounts', title: 'Konta testowe', blocks: [
    { p: a.accountsIntro || (cloud ? 'Każdy scenariusz mówi, którym kontem wykonać który krok. Wszystkie konta mają jedno wspólne hasło.'
      : 'Każda rola ma swoje konto. Wybierasz je na stronie wyboru konta („Wybierz, kim chcesz być w aplikacji”); hasła nie wpisujesz. Jedna rola na jedno okno przeglądarki.') },
    { table: { head: ['Rola', cloud ? 'Login' : 'Konto (tak jak na stronie wyboru)', 'Do czego'], rows: guide.accounts.map(x => [x.role, cloud ? x.login : x.name, x.what]) } }
  ] });
  guide.scenarios.forEach(s => {
    const blocks = [{ p: '**Cel:** ' + s.goal }, { p: '**Konto:** ' + accountRefs(s).map(accountLabel).join(', ') + (s.before ? '. **Zanim zaczniesz:** ' + s.before : '') }];
    if (s.accountsNote) blocks.push({ note: s.accountsNote });
    (s.sections || []).forEach(x => { blocks.push({ p: '**' + x.title + '**' }); (x.blocks || []).forEach(b => blocks.push(typeof b === 'string' ? { p: b } : b)); });
    let list = [], k = 0;
    const flush = () => { if (list.length) blocks.push({ steps: list }); list = []; };
    for (const st of s.steps || []) {
      if (st.section || st.heading) { flush(); blocks.push({ p: '**' + (st.section || st.heading) + '**' }); continue; }
      if (st.p) { flush(); blocks.push({ p: st.p }); continue; }
      if (st.note) { flush(); blocks.push({ note: st.note }); continue; }
      k += 1;
      const other = st.account && accountRefs(s).length > 1 ? '(' + accountLabel(st.account) + ') ' : '';
      list.push({ title: 'Krok ' + k, text: other + st.text + (st.expect ? ' Zobaczysz: ' + st.expect : '') });
    }
    flush();
    (s.notes || []).forEach(x => blocks.push({ note: x }));
    blocks.push({ note: { tag: 'Oczekiwany wynik', kind: 'acc', text: s.expect.text } });
    sections.push({ id: 's-' + s.id.toLowerCase(), title: s.id + '. ' + s.title, blocks });
  });
  if ((guide.troubles || []).length) sections.push({ id: 'troubles', title: 'Gdy coś nie działa', blocks: [{ verify: guide.troubles }] });
  if ((guide.notInGuide || []).length) sections.push({ id: 'out', title: 'Czego ta instrukcja nie obejmuje', blocks: [{ ul: guide.notInGuide }] });
  return {
    type: 'instrukcja-testow', lang: 'pl', eyebrow: 'Instrukcja testów · ' + guide.app, title: guide.title, lead: guide.scope || guide.lead,
    meta: [{ k: 'Dla kogo', v: guide.audience || 'Testerzy (bez wiedzy technicznej)' }, { k: 'Scenariusze', v: String(n) },
      { k: 'Status', v: walk ? (walk.ok ? 'Sprawdzona w przeglądarce' : 'Nie przeszła sprawdzenia') : 'Niesprawdzona', status: true },
      { k: 'Data', v: guide.date || new Date().toISOString().slice(0, 10) }],
    sections, footer: guide.footer || ['Instrukcja testów · ' + guide.app, 'przygotował Claude dla Karola']
  };
}

const found = problems();
if (found.length) { console.error('Instrukcja łamie zasady skilla:\n- ' + found.join('\n- ')); process.exit(1); }
if (checkOnly) { console.log('Instrukcja spełnia zasady (' + guide.scenarios.length + ' scenariuszy' + (cloud ? ', środowisko w chmurze' : ', bramka lokalna') + ').'); process.exit(0); }
let walk = null;
if (walkFile) {
  const w = JSON.parse(fs.readFileSync(walkFile, 'utf8'));
  walk = { ok: !!w.ok && guide.scenarios.every(s => w.scenarios.some(r => r.id === s.id && r.ok)), date: String(w.at || '').slice(0, 16).replace('T', ' '),
    human: w.scenarios.reduce((n, r) => n + r.steps.filter(st => st.status === 'human').length, 0) };
  walk.note = walkNote(walk);
}
const name = guide.name || 'instrukcja-testow';
fs.mkdirSync(outDir, { recursive: true });
if (packMode) {
  const r = require('./pack.js').build(guide, walk, outDir);
  console.log(r.files.map(f => path.join(r.dir, f)).concat(r.zip).join('\n'));
} else {
  const specFile = path.join(outDir, name + '.json');
  fs.writeFileSync(specFile, JSON.stringify(spec(walk), null, 2) + '\n');
  // The dokumentacja skill beside this one (installed or in the same skills folder).
  const builder = [path.join(__dirname, '..', '..', 'dokumentacja', 'bin', 'build.js'), path.join(os.homedir(), '.claude', 'skills', 'dokumentacja', 'bin', 'build.js')].find(f => fs.existsSync(f));
  if (!builder) { console.error('Nie znalazłem skilla dokumentacja (GEN-47): zainstaluj go obok tego skilla.'); process.exit(2); }
  execFileSync('node', [builder, specFile, outDir], { stdio: 'inherit' });
}
