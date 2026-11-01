#!/usr/bin/env node
// pack.js: the pack form of the "instrukcja-testow" skill (0.3). Instead of one document, a folder of standalone HTML
// files in the MxScout look, one topic per file (the list, the access page, one page per scenario), zipped together.
// Every file inlines the stylesheet of the "dokumentacja" skill and, when MxScout is beside it, its two fonts, so it
// opens offline by double-click. Generic blocks render through dokumentacja's bin/build.js (required as a module);
// the blocks only a tester guide has (step table with the account column, account table, file cards) are here.
// Not a command of its own: guide.js --pack calls build(guide, walk, outDir). The folder <outDir>/<name> is rebuilt
// from scratch every time; <outDir>/<name>.zip beside it is what testers get.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// The dokumentacja skill beside this one (same skills folder) or installed in ~/.claude/skills.
const docDir = [path.join(__dirname, '..', '..', 'dokumentacja'), path.join(os.homedir(), '.claude', 'skills', 'dokumentacja')]
  .find(d => fs.existsSync(path.join(d, 'bin', 'build.js')));
if (!docDir) throw new Error('Nie znalazłem skilla dokumentacja (GEN-47): zainstaluj go obok tego skilla.');
const doc = require(path.join(docDir, 'bin', 'build.js'));
const esc = doc.esc, inl = doc.inlineHtml;

// What the pack adds to dokumentacja's stylesheet: an even vertical rhythm, the account badge, the step table, file cards.
const PACK_CSS = `
section > * + * { margin-top:20px; }
section > .sec-h + * { margin-top:0; }
section > h3 { margin-top:28px; }
section > h3 + * { margin-top:10px; }
.card > h3 + p, .card > h3 + ul { margin-top:8px; }
.grid2 { margin:0; }
.table + .note, .note + .table { margin-top:20px; }
.chips + .lead { margin-top:18px; }
a { color:var(--acc-text); }
.who { display:inline-block; font:600 11px/20px var(--font-mono); padding:0 8px; border-radius:6px; background:var(--acc-soft); color:var(--acc-text); white-space:nowrap; }
.who.op { background:var(--okbg); color:var(--ok); }
table.steps-t { table-layout:fixed; }
table.steps-t td { overflow-wrap:anywhere; }
col.c-no { width:60px; }
col.c-who { width:160px; }
td.no { font:600 12px var(--font-mono); color:var(--acc-text); }
td.exp { color:var(--ink); }
.files { display:grid; gap:12px; }
.files a.card { display:block; text-decoration:none; color:inherit; }
.files a.card:hover { border-color:color-mix(in srgb, var(--acc) 45%, transparent); background:var(--acc-soft); }
.files .card .cap { color:var(--acc-text); }
.files .card b { display:block; margin-top:4px; font-size:17px; color:var(--ink); }
.files .card span.d { display:block; margin-top:6px; color:var(--ink2); font-size:14px; }
.backlink { display:inline-block; margin-bottom:28px; font-size:13px; text-decoration:none; }
@media screen and (max-width:760px) { col.c-who { width:auto; } }
`;

// MxScout's fonts (Instrument Sans, JetBrains Mono) inlined as data URIs, their licences copied beside the pages.
// Without MxScout the pages fall back to the system fonts named in the stylesheet.
function fonts() {
  const dir = path.join(process.env.MXSCOUT_DIR || path.join(os.homedir(), 'Projects', 'MxScout'), 'public', 'fonts');
  const face = (family, file, weight) => {
    const f = path.join(dir, file);
    if (!fs.existsSync(f)) return '';
    return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format("woff2");font-weight:${weight};font-display:swap;}`;
  };
  const css = face('Instrument Sans', 'InstrumentSans.woff2', '400 700') + face('JetBrains Mono', 'JetBrainsMono.woff2', '100 800');
  const licences = ['OFL-InstrumentSans.txt', 'OFL-JetBrainsMono.txt'].map(f => path.join(dir, f)).filter(f => fs.existsSync(f));
  return { css, licences };
}

// A file-name piece from a Polish title.
const slug = (s) => String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, c => 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const no2 = (n) => String(n).padStart(2, '0');
const konta = (n) => n === 1 ? '1 konto' : n < 5 ? n + ' konta' : n + ' kont';
// 2026-10-31 → 31.10.2026
const plDate = (iso) => /^\d{4}-\d{2}-\d{2}/.test(String(iso)) ? iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4) : String(iso || '');

// The account a scenario or step names: by id, login or name (the gate shows names, the cloud login wants logins).
const accountOf = (g, ref) => (g.accounts || []).find(a => a.id === ref || a.login === ref || a.name === ref) || null;
const who = (a) => `<span class="who${a.op ? ' op' : ''}">${esc(a.login || a.name)}</span>`;

// One block of a page: the pack's own blocks, else dokumentacja's.
function block(b, g) {
  if (typeof b === 'string') return doc.blockHtml({ p: b });
  if (b.html) return b.html;
  if (b.h3) return `<h3>${inl(b.h3)}</h3>`;
  if (b.accounts) {
    const head = `<tr><th>Rola</th><th>${g.access.kind === 'cloud' ? 'Login' : 'Konto (tak jak na stronie wyboru)'}</th><th>Co ta osoba robi</th></tr>`;
    return `<div class="table"><table><thead>${head}</thead><tbody>${b.accounts.map(a => `<tr><td class="name">${esc(a.role)}</td><td>${who(a)}</td><td>${inl(a.what)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if (b.stepsTable) {
    const w = b.stepsTable.who;
    const rows = b.stepsTable.rows.map(r => `<tr><td class="no">${esc(r.no)}</td>${w ? `<td class="whocol">${r.account ? who(r.account) : ''}</td>` : ''}<td>${inl(r.text)}</td><td class="exp">${inl(r.expect || '')}</td></tr>`).join('');
    return `<div class="table"><table class="steps-t"><colgroup><col class="c-no">${w ? '<col class="c-who">' : ''}<col><col></colgroup><thead><tr><th>Krok</th>${w ? '<th>Kto</th>' : ''}<th>Co zrobić</th><th>Co powinno się stać</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  if (b.files) return `<div class="files">${b.files.map(f => `<a class="card" href="${esc(f.href)}"><span class="cap">${esc(f.cap)}</span><b>${esc(f.title)}</b><span class="d">${inl(f.text)}</span></a>`).join('')}</div>`;
  return doc.blockHtml(b);
}

// One standalone page: header with chips, numbered sections, footer; a link back to the list on every page but the list.
function page(p, g, css) {
  const chips = p.meta.map(m => `<div class="chip${m.status ? ' status' : ''}"><span class="cap">${esc(m.k)}</span><b>${esc(m.v)}</b></div>`).join('');
  const secs = p.sections.map((s, i) => `<section id="${esc(s.id)}">\n<div class="sec-h"><span class="no">${no2(i + 1)}</span><h2>${esc(s.title)}</h2></div>\n${s.blocks.map(b => block(b, g)).join('\n')}\n</section>`).join('\n');
  const footer = g.footer || [`${g.app} · środowisko ${g.env || 'Test'} · instrukcja dla testerów`, 'Stan na ' + plDate(g.date || new Date().toISOString().slice(0, 10))];
  return `<!doctype html>
<html lang="pl" data-theme="light" data-accent="cobalt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} · ${esc(g.app)}</title>
<style>${css}</style>
</head>
<body>
<main class="island">
${p.index ? '' : '<a class="backlink" href="index.html">← Wszystkie instrukcje</a>'}
<header>
<div class="eyebrow">${esc(p.eyebrow)}</div>
<h1>${esc(p.title)}</h1>
<p class="lead">${inl(p.lead || '')}</p>
<div class="chips">${chips}</div>
</header>
${secs}
<footer><span>${esc(footer[0])}</span><span>${esc(footer[1] || '')}</span></footer>
</main>
</body>
</html>
`;
}

// The pages of the pack from the guide: the access page, one page per scenario, then the list that links them.
function pages(g, walk) {
  const a = g.access, cloud = a.kind === 'cloud', env = g.env || 'Test';
  const status = walk ? (walk.ok ? 'Sprawdzona w przeglądarce' : 'Nie przeszła sprawdzenia') : 'Niesprawdzona';
  const meta = (accounts) => [{ k: 'Dla kogo', v: g.audience || 'Testerzy biznesowi' }, { k: 'Środowisko', v: env }, { k: 'Konta', v: accounts }, { k: 'Status', v: status, status: true }];
  const stepsTable = (list, who) => ({ stepsTable: { who, rows: list.map((s, i) => Object.assign({ no: no2(i + 1) }, typeof s === 'string' ? { text: s } : s)) } });
  const noteOf = (n) => n ? [{ note: n }] : [];
  const accessFile = '01-wejscie-na-' + slug(env) + '.html';
  const out = [];

  // 01: how to get in, every account, how to change the account, what to do when something is off
  const sections = [];
  if (cloud) sections.push({ id: 'adres', title: 'Adres i logowanie', blocks: [
    { html: `<div class="grid2"><div class="card"><p class="cap">Adres</p><p><a href="${esc(a.url)}">${esc(a.url)}</a></p></div><div class="card"><p class="cap">Hasło</p><p>${inl(a.login)}</p></div></div>` },
    stepsTable(a.loginSteps, false)
  ].concat((a.notes || []).map(n => ({ note: n }))) });
  else sections.push({ id: 'adres', title: 'Adres i logowanie', blocks: [
    { p: a.intro || 'Aplikacja do testów działa na komputerze Mac Studio, nie w chmurze. Ma tylko dane testowe.' },
    { table: { head: ['Co', 'Jak'], rows: [['Adres', '**' + a.gate + '**'], ['Logowanie', a.login], ['Uruchomienie aplikacji', a.start], ['Samo się wyłącza', a.autoStop], ['Ponowne uruchomienie', a.restart]] } },
    stepsTable(a.loginSteps, false)
  ].concat(a.popup ? [{ note: { tag: 'Okienko', text: a.popup } }] : [], (a.notes || []).map(n => ({ note: n }))) });
  sections.push({ id: 'konta', title: 'Wybór konta testowego', blocks: [
    a.accountsIntro || (cloud ? 'Każdy scenariusz mówi, którym kontem wykonać który krok. Poniżej wszystkie konta, których używają instrukcje z tej paczki.'
      : 'Każda rola ma swoje konto. Wybierasz je na stronie wyboru konta („Wybierz, kim chcesz być w aplikacji”); hasła nie wpisujesz. Jedna rola na jedno okno przeglądarki.'),
    { accounts: g.accounts }
  ].concat(noteOf(a.accountsNote)) });
  if ((a.switch || []).length) sections.push({ id: 'zmiana', title: 'Zmiana konta', blocks: [{ ol: a.switch }].concat(noteOf(a.switchNote)) });
  if ((g.troubles || []).length) sections.push({ id: 'klopoty', title: 'Gdy coś nie działa', blocks: [{ verify: g.troubles }] });
  out.push({ file: accessFile, eyebrow: 'Instrukcja 01 · zacznij tutaj', title: 'Wejście na środowisko ' + env,
    lead: a.lead || `Jak otworzyć ${g.app} na środowisku ${env}, zalogować się kontem testowym i przełączać się między kontami.`,
    meta: meta('wszystkie'), sections });

  // one page per scenario: its accounts, its own sections, the steps (tables split by sections, headings, notes), the result
  (g.scenarios || []).forEach((sc, i) => {
    const real = sc.steps.filter(s => s.text != null);
    const refs = [sc.account].concat(real.map(s => s.account)).filter(Boolean).filter((r, k, arr) => arr.indexOf(r) === k);
    const used = refs.map(r => accountOf(g, r)).filter(Boolean);
    const mixed = used.length > 1;
    const secs = [];
    const login = `<div class="prose"><p>Jak się zalogować: instrukcja <a href="${esc(accessFile)}">01 Wejście na środowisko ${esc(env)}</a>.` +
      (sc.before ? ' <b>Zanim zaczniesz:</b> ' + inl(sc.before) : '') + (sc.hint ? ' ' + inl(sc.hint) : '') + '</p></div>';
    secs.push({ id: 'konta', title: 'Konta w tym scenariuszu', blocks: [{ accounts: used }, { html: login }].concat(sc.accountsNote ? [{ note: sc.accountsNote }] : []) });
    (sc.sections || []).forEach((x, k) => secs.push({ id: x.id || 'czesc-' + (k + 1), title: x.title, blocks: x.blocks || [] }));
    const stepSecs = [];
    let cur = { id: 'kroki', title: 'Kroki', blocks: [] }, rows = [], n = 0;
    const flush = () => { if (rows.length) cur.blocks.push({ stepsTable: { who: mixed, rows } }); rows = []; };
    const open = (title) => { flush(); if (cur.blocks.length) stepSecs.push(cur); cur = { id: 'kroki-' + (stepSecs.length + 1), title, blocks: [] }; };
    for (const s of sc.steps) {
      if (s.section) { open(s.section); continue; }
      if (s.heading) { flush(); cur.blocks.push({ h3: s.heading }); continue; }
      if (s.p) { flush(); cur.blocks.push({ p: s.p }); continue; }
      if (s.note) { flush(); cur.blocks.push({ note: s.note }); continue; }
      n += 1;
      rows.push({ no: no2(n), account: accountOf(g, s.account || sc.account), text: s.text, expect: s.expect });
    }
    flush();
    (sc.notes || []).forEach(nt => cur.blocks.push({ note: nt }));
    cur.blocks.push({ note: { tag: 'Oczekiwany wynik', kind: 'acc', text: sc.expect.text } });
    stepSecs.push(cur);
    out.push({ file: sc.file || `${no2(i + 2)}-scenariusz-${slug(sc.id)}-${slug(sc.title)}.html`, id: sc.id, accounts: used.length,
      eyebrow: 'Scenariusz ' + sc.id + (sc.eyebrow ? ' · ' + sc.eyebrow : ''), title: sc.title, lead: sc.lead || sc.goal, summary: sc.summary || sc.goal,
      meta: meta(konta(used.length)), sections: secs.concat(stepSecs) });
  });

  // the list: every file as a card, the walkthrough's verdict, what the pack leaves out
  const files = out.map((p, i) => i === 0
    ? { href: p.file, cap: '01 · zacznij tutaj', title: p.title, text: a.summary || 'Adres, logowanie, wybór konta testowego, zmiana konta.' }
    : { href: p.file, cap: 'Scenariusz ' + p.id + ' · ' + konta(p.accounts), title: p.title, text: p.summary });
  const listSections = [{ id: 'pliki', title: 'Pliki w paczce', blocks: (walk && walk.note ? [{ note: walk.note }] : []).concat([{ files }]) }];
  if ((g.notInGuide || []).length) listSections.push({ id: 'poza', title: 'Czego te instrukcje nie obejmują', blocks: [{ ul: g.notInGuide }] });
  out.unshift({ file: 'index.html', index: true, eyebrow: g.app + ' · instrukcje dla testerów', title: g.title,
    lead: g.lead || 'Każdy plik to jeden temat. Zacznij od wejścia na środowisko, potem wykonuj scenariusze w dowolnej kolejności. Pliki działają bez internetu: wystarczy je otworzyć dwuklikiem.',
    meta: [{ k: 'Dla kogo', v: g.audience || 'Testerzy biznesowi' }, { k: 'Środowisko', v: env }, { k: 'Plików', v: (out.length) + ' + ten spis' }, { k: 'Status', v: status, status: true }],
    sections: listSections });
  return out;
}

// Builds the pack: <outDir>/<name>/ (rebuilt from scratch) and <outDir>/<name>.zip. → { dir, zip, files }
function build(g, walk, outDir) {
  const name = g.name || 'instrukcja-testow';
  const dir = path.join(outDir, name), zip = path.join(outDir, name + '.zip');
  const f = fonts();
  const css = f.css + doc.css() + PACK_CSS;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const list = pages(g, walk);
  for (const p of list) fs.writeFileSync(path.join(dir, p.file), page(p, g, css));
  if (f.licences.length) {
    fs.mkdirSync(path.join(dir, 'licencje-czcionek'));
    f.licences.forEach(l => fs.copyFileSync(l, path.join(dir, 'licencje-czcionek', path.basename(l))));
  }
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-qr', '-X', zip, '.'], { cwd: dir });
  return { dir, zip, files: list.map(p => p.file) };
}

module.exports = { build };
