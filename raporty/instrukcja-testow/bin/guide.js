#!/usr/bin/env node
// guide.js: turns the tester guide of the "instrukcja-testow" skill (instrukcja.json: access, accounts, scenarios with
// steps and actions) into the document spec of the "dokumentacja" skill (GEN-47) and builds it there: .html, .docx, .md.
// The same instrukcja.json drives bin/walkthrough.js, so the document and the browser check never drift apart.
// Before building it refuses a guide that breaks the rules for non-technical testers: a ticket key, a technical name,
// an access section with a gap, a scenario without a goal, account, steps or expected result.
// Usage: node guide.js instrukcja.json [outDir] [--walk przejscie/walkthrough.json] [--check]
//   --walk   adds the result of the last browser walkthrough (date, every scenario passed or not) to the document
//   --check  only checks the rules; builds nothing
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const walkFile = flag('--walk');
const checkOnly = args.includes('--check') ? (args.splice(args.indexOf('--check'), 1), true) : false;
const guideFile = args[0];
if (!guideFile) { console.error('Usage: node guide.js instrukcja.json [outDir] [--walk walkthrough.json] [--check]'); process.exit(2); }
const guide = JSON.parse(fs.readFileSync(guideFile, 'utf8'));
const outDir = args[1] || path.dirname(path.resolve(guideFile));

// Words a non-technical tester must never meet: ticket keys and names from the model or the build.
const TICKET_KEY = /\b[A-Z][A-Z0-9]{1,7}-\d+\b/;
const TECHNICAL = ['mikroflow', 'microflow', 'nanoflow', 'encj', 'entity', 'moduł', 'module', 'atrybut', 'attribute', 'xpath',
  'odata', 'mcp', 'pipeline', 'seed', 'refaktor', 'snippet', 'widget', 'commit', 'deploy', 'mda', 'postgres', 'baza danych'];
const TECH_NAME = /\b(ACT|SUB|DS|VAL|SCE|BCO|ACo|OCh|ACr|IVK|SE|DL|NAV)_[A-Za-z0-9]/;

// Every text of the guide a tester reads, with where it sits (for the error message).
function texts() {
  const out = [];
  const add = (where, t) => { if (t) out.push([where, String(t)]); };
  ['title', 'lead', 'scope', 'audience'].forEach(k => add(k, guide[k]));
  const a = guide.access || {};
  ['intro', 'gate', 'login', 'start', 'autoStop', 'restart', 'popup'].forEach(k => add('access.' + k, a[k]));
  (a.loginSteps || []).forEach((t, i) => add('access.loginSteps[' + i + ']', t));
  (guide.accounts || []).forEach((x, i) => ['role', 'name', 'what'].forEach(k => add('accounts[' + i + '].' + k, x[k])));
  (guide.scenarios || []).forEach(s => {
    ['title', 'goal', 'account', 'before'].forEach(k => add(s.id + '.' + k, s[k]));
    (s.steps || []).forEach((st, i) => add(s.id + '.steps[' + i + ']', st.text));
    if (s.expect) add(s.id + '.expect', s.expect.text);
  });
  (guide.notInGuide || []).forEach((t, i) => add('notInGuide[' + i + ']', t));
  (guide.troubles || []).forEach((t, i) => { add('troubles[' + i + ']', t.title); add('troubles[' + i + ']', t.text); });
  return out;
}

// The rules of the skill (SKILL.md, „Zasady instrukcji”). → list of problems, empty when the guide may be built.
function problems() {
  const out = [];
  for (const [where, t] of texts()) {
    const key = t.match(TICKET_KEY); if (key) out.push(where + ': numer ticketu „' + key[0] + '”');
    const name = t.match(TECH_NAME); if (name) out.push(where + ': nazwa techniczna „' + name[0] + '…”');
    const low = t.toLowerCase();
    TECHNICAL.forEach(w => { if (new RegExp('(^|[^a-ząćęłńóśźż])' + w).test(low)) out.push(where + ': słowo techniczne „' + w + '”'); });
  }
  const a = guide.access || {};
  ['gate', 'login', 'start', 'autoStop', 'restart'].forEach(k => { if (!a[k]) out.push('access.' + k + ': brak (wejście na środowisko jest zawsze pierwsze i pełne)'); });
  if (!(a.loginSteps || []).length) out.push('access.loginSteps: brak kroków logowania');
  if (!(guide.accounts || []).length) out.push('accounts: brak kont testowych per rola');
  if (!(guide.scenarios || []).length) out.push('scenarios: brak scenariuszy');
  (guide.scenarios || []).forEach(s => {
    ['id', 'title', 'goal', 'account'].forEach(k => { if (!s[k]) out.push((s.id || '?') + ': brak ' + k); });
    if (!(s.steps || []).length) out.push(s.id + ': brak kroków');
    if (!s.expect || !s.expect.text) out.push(s.id + ': brak oczekiwanego wyniku');
    if ((guide.accounts || []).length && s.account && !(guide.accounts || []).some(x => x.name === s.account)) out.push(s.id + ': konto „' + s.account + '” nie jest w tabeli kont');
  });
  return out;
}

// The document spec for the dokumentacja skill: access first, then one section per scenario, then troubles and limits.
function spec(walk) {
  const a = guide.access, n = (guide.scenarios || []).length;
  const sections = [];
  sections.push({ id: 'summary', title: 'W skrócie', blocks: [
    { p: guide.lead },
    { table: { head: ['Scenariusz', 'Kto testuje', 'Cel'], rows: guide.scenarios.map(s => [s.id + '. ' + s.title, s.account, s.goal]) } }
  ].concat(walk ? [{ note: walk.ok
    ? { tag: 'Sprawdzone', kind: 'acc', text: 'Claude przeszedł tę instrukcję w przeglądarce krok po kroku, tymi samymi kontami: **wszystkie scenariusze przechodzą** (' + walk.date + ').' +
      (walk.human ? ' Kroków tylko dla człowieka (' + walk.human + ', np. kod z maila) przeglądarka nie robi; Claude przeszedł dalej tą samą bramką.' : '') }
    : { tag: 'Uwaga', kind: 'bad', text: 'Ostatnie przejście w przeglądarce (' + walk.date + ') nie przeszło całości. Tej wersji nie wysyłaj testerom.' } }] : []) });
  sections.push({ id: 'access', title: 'Jak wejść na środowisko testowe', blocks: [
    { p: a.intro || 'Aplikacja do testów działa na komputerze Mac Studio, nie w chmurze. Ma tylko dane testowe.' },
    { table: { head: ['Co', 'Jak'], rows: [
      ['Adres', '**' + a.gate + '**'],
      ['Logowanie', a.login],
      ['Uruchomienie aplikacji', a.start],
      ['Samo się wyłącza', a.autoStop],
      ['Ponowne uruchomienie', a.restart]
    ] } },
    { steps: a.loginSteps.map((t, i) => ({ title: 'Krok ' + (i + 1), text: t })) }
  ].concat(a.popup ? [{ note: { tag: 'Okienko', text: a.popup } }] : []) });
  sections.push({ id: 'accounts', title: 'Konta testowe', blocks: [
    { p: 'Każda rola ma swoje konto. Wybierasz je na stronie wyboru konta („Wybierz, kim chcesz być w aplikacji”); hasła nie wpisujesz. Jedna rola na jedno okno przeglądarki.' },
    { table: { head: ['Rola', 'Konto (tak jak na stronie wyboru)', 'Do czego'], rows: guide.accounts.map(x => [x.role, x.name, x.what]) } }
  ] });
  guide.scenarios.forEach(s => sections.push({ id: 's-' + s.id.toLowerCase(), title: s.id + '. ' + s.title, blocks: [
    { p: '**Cel:** ' + s.goal },
    { p: '**Konto:** ' + s.account + (s.before ? '. **Zanim zaczniesz:** ' + s.before : '') },
    { steps: s.steps.map((st, i) => ({ title: 'Krok ' + (i + 1), text: st.text })) },
    { note: { tag: 'Oczekiwany wynik', kind: 'acc', text: s.expect.text } }
  ] }));
  if ((guide.troubles || []).length) sections.push({ id: 'troubles', title: 'Gdy coś nie działa', blocks: [{ verify: guide.troubles }] });
  if ((guide.notInGuide || []).length) sections.push({ id: 'out', title: 'Czego ta instrukcja nie obejmuje', blocks: [{ ul: guide.notInGuide }] });
  sections.push({ id: 'report', title: 'Jak zgłosić błąd', blocks: [{ ol: guide.report || [
    'Zapisz numer scenariusza i kroku, w którym coś poszło inaczej.',
    'Zrób zrzut ekranu całego okna.',
    'Napisz, co zrobiłeś, co zobaczyłeś i czego się spodziewałeś, i wyślij to do Karola razem ze zrzutem.'
  ] }] });
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
if (checkOnly) { console.log('Instrukcja spełnia zasady (' + guide.scenarios.length + ' scenariuszy).'); process.exit(0); }
let walk = null;
if (walkFile) {
  const w = JSON.parse(fs.readFileSync(walkFile, 'utf8'));
  walk = { ok: !!w.ok && guide.scenarios.every(s => w.scenarios.some(r => r.id === s.id && r.ok)), date: String(w.at || '').slice(0, 16).replace('T', ' '),
    human: w.scenarios.reduce((n, r) => n + r.steps.filter(st => st.status === 'human').length, 0) };
}
const name = guide.name || 'instrukcja-testow';
fs.mkdirSync(outDir, { recursive: true });
const specFile = path.join(outDir, name + '.json');
fs.writeFileSync(specFile, JSON.stringify(spec(walk), null, 2) + '\n');
// The dokumentacja skill beside this one (installed or in the same skills folder).
const builder = [path.join(__dirname, '..', '..', 'dokumentacja', 'bin', 'build.js'), path.join(os.homedir(), '.claude', 'skills', 'dokumentacja', 'bin', 'build.js')].find(f => fs.existsSync(f));
if (!builder) { console.error('Nie znalazłem skilla dokumentacja (GEN-47): zainstaluj go obok tego skilla.'); process.exit(2); }
execFileSync('node', [builder, specFile, outDir], { stdio: 'inherit' });
