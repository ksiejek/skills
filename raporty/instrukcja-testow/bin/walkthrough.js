#!/usr/bin/env node
// walkthrough.js: the browser check of the "instrukcja-testow" skill. It reads the guide (instrukcja.json, the same file
// guide.js turns into the document) and does exactly the written steps with the written test account, in a headless
// Chromium (Tandem's CDP driver, modules/mendix/lib/cdp.js: no npm). One screenshot per scenario, one more on a failed step.
// A step the browser cannot do (the e-mail code goes to the tester's mailbox) is `human`: it is listed, never skipped quietly.
// Two kinds of environment (guide.access.kind): the local gateway, where an account is picked on a page without a password,
// and "cloud", a login page with the testers' shared password, read from the environment variable the guide names
// (access.passwordEnv) or from 1Password through the op CLI (access.passwordOp, after Karol's `op signin`): never from
// a file, never from the guide, never printed. A rejected login stops the whole run at once,
// because a few failed logins lock the account. A step by another account than the one logged in (step.account) makes the
// browser change the account first: sign out and in on the cloud, the account page on the gate.
// Usage: node walkthrough.js instrukcja.json [outDir] [--only S1,S2] [--explore]
//   outDir     defaults to <guide folder>/przejscie; gets walkthrough.json, walkthrough.md and <scenario>.png; a failed
//              step adds <scenario>-blad.png and <scenario>-blad.txt (the visible controls of that page with their texts)
//   --explore  prints the page text after every step (for writing the steps, not for the proof)
// Exit code 0 only when every scenario passed end to end; 3 when a login was rejected.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const only = (flag('--only') || '').split(',').filter(Boolean);
const explore = args.includes('--explore') ? (args.splice(args.indexOf('--explore'), 1), true) : false;
const guideFile = args[0];
if (!guideFile) { console.error('Usage: node walkthrough.js instrukcja.json [outDir] [--only S1,S2] [--explore]'); process.exit(2); }
const guide = JSON.parse(fs.readFileSync(guideFile, 'utf8'));
const outDir = args[1] || path.join(path.dirname(path.resolve(guideFile)), 'przejscie');
fs.mkdirSync(outDir, { recursive: true });
const tandemDir = process.env.TANDEM_DIR || path.join(os.homedir(), 'Projects', 'Tandem');
const cdp = require(path.join(tandemDir, 'modules', 'mendix', 'lib', 'cdp.js'));

const access = guide.access || {};
const cloud = access.kind === 'cloud';
if (cloud && !access.url) { console.error('access.url: brak adresu strony logowania'); process.exit(2); }
// The address the browser uses: the cloud login page's origin, or guide.access.walkUrl (Karol's tailnet route to the same
// gateway) or the gate itself.
const base = cloud ? new URL(access.url).origin : String(access.walkUrl || access.gate || '').replace(/\/$/, '');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const js = JSON.stringify;
// {run} in a value, a click or a check: this run's mark (HHMM), so a title made on a rerun stays unique.
const RUN = new Date().toISOString().slice(11, 16).replace(':', '');
const sub = (s) => s == null ? s : String(s).replace(/\{run\}/g, RUN);
// The account a scenario or step names: by id, login or name; and one key for "the same account".
const accountOf = (ref) => (guide.accounts || []).find(a => a.id === ref || a.login === ref || a.name === ref) || null;
const accountKey = (ref) => { const a = accountOf(ref); return a ? (a.id || a.login || a.name) : ref; };
// The testers' password (cloud only): the environment variable the guide names, else 1Password (access.passwordOp: a secret
// reference op://sejf/pozycja/password, or an item title) read once through the op CLI. Kept in memory, never printed.
// How op is authorized: the shell's own way (OP_SERVICE_ACCOUNT_TOKEN, or the 1Password app's integration), else Karol's Mac
// helper ~/Mx/bin/op-sa-token (ML-42, SD-83: the read-only service account of vault „Praca”, the way headless Claude sessions
// read the vault). The token goes only into op's environment, never into this process's own env or any output.
function opEnv() {
  if (process.env.OP_SERVICE_ACCOUNT_TOKEN) return process.env;
  const helper = path.join(os.homedir(), 'Mx', 'bin', 'op-sa-token');
  if (!fs.existsSync(helper)) return process.env;
  const t = spawnSync(helper, [], { encoding: 'utf8' });
  const token = t.status === 0 ? String(t.stdout || '').trim() : '';
  return token ? Object.assign({}, process.env, { OP_SERVICE_ACCOUNT_TOKEN: token }) : process.env;
}
let secret = null;
function password() {
  if (secret != null) return secret;
  const env = access.passwordEnv && process.env[access.passwordEnv];
  if (env) return (secret = env);
  if (access.passwordOp) {
    const ref = access.passwordOp;
    const env = opEnv();
    const r = /^op:\/\//.test(ref) ? spawnSync('op', ['read', ref], { encoding: 'utf8', env })
      : spawnSync('op', ['item', 'get', ref, '--fields', 'label=password', '--reveal'], { encoding: 'utf8', env });
    if (r.error || r.status !== 0 || !String(r.stdout || '').trim()) {
      const why = r.error ? r.error.message : String(r.stderr || '').trim().split('\n')[0];
      throw new Error('1Password nie oddał hasła „' + ref + '”: ' + why + '. Pozycja musi być w sejfie, który op widzi (service account: „Praca”), albo zaloguj się do 1Password (op signin) i uruchom ponownie.');
    }
    return (secret = String(r.stdout).replace(/\r?\n$/, ''));
  }
  throw new Error('Brak hasła testerów: ustaw zmienną środowiska ' + (access.passwordEnv || '(access.passwordEnv)') + ' albo podaj access.passwordOp (1Password). Hasła nie ma w instrukcji ani w plikach skilla.');
}
// Before the browser starts: the password must be at hand, or nothing else makes sense.
if (cloud) { try { password(); } catch (e) { console.error(e.message); process.exit(2); } }

// Page-side helpers, injected once per evaluate: visible elements, the one whose own text matches, the field of a label.
const HELPERS = `
  var vis = function (e) { var r = e.getBoundingClientRect(); var s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  var norm = function (s) { return String(s || '').replace(/\\s+/g, ' ').trim().toLowerCase(); };
  // every element, also inside open shadow roots (the gateway's role panel lives in one)
  var deep = function (root) { var out = []; Array.prototype.forEach.call(root.querySelectorAll('*'), function (e) { out.push(e); if (e.shadowRoot) out = out.concat(deep(e.shadowRoot)); }); return out; };
  // the text an element shows: its own text, or the caption of a submit button; never what was typed into a field
  var own = function (e) { if (e.tagName === 'TEXTAREA' || (e.tagName === 'INPUT' && !/submit|button|reset/.test(e.type))) return ''; return e.innerText || e.value; };
  var byText = function (text, scope) {
    var want = norm(text), all = deep(scope || document).filter(vis);
    // an icon button (the role tab) has no text: its aria-label is what the guide names
    var exact = all.filter(function (e) { return norm(own(e)) === want || (!norm(e.innerText) && (norm(e.getAttribute('aria-label')) === want || norm(e.getAttribute('title')) === want)); });
    var pool = exact.length ? exact : all.filter(function (e) { return norm(own(e)).indexOf(want) >= 0; });
    pool.sort(function (a, b) { return norm(own(a)).length - norm(own(b)).length; });
    var hit = pool[0]; if (!hit) return null;
    var up = hit.closest('button,a,[role=button],[role=tab],[role=menuitem],[role=option],.dropdown-item,[role=row],tr,input[type=submit]');
    if (up && vis(up)) return up;
    // a Mendix container with the same text as the button inside it: the button is what a tester clicks
    var down = Array.prototype.slice.call(hit.querySelectorAll('button,a,[role=button],[role=tab],input[type=submit]')).filter(vis)
      .find(function (e) { return norm(e.innerText || e.value) === norm(hit.innerText || hit.value); });
    return down || hit;
  };
  var field = function (label) {
    var want = norm(label);
    var labels = Array.prototype.slice.call(document.querySelectorAll('label')).filter(vis).filter(function (l) { return norm(l.innerText) === want || norm(l.innerText).indexOf(want) === 0; });
    for (var i = 0; i < labels.length; i++) {
      var l = labels[i];
      if (l.htmlFor && document.getElementById(l.htmlFor)) return document.getElementById(l.htmlFor);
      var box = l.closest('.form-group,.mx-dataview-content,div') || l.parentElement;
      var f = box && box.querySelector('input:not([type=hidden]),textarea,select,[contenteditable=true]');
      if (f) return f;
    }
    var ph = Array.prototype.slice.call(document.querySelectorAll('input,textarea')).filter(vis).find(function (e) { return norm(e.placeholder) === want || norm(e.getAttribute('aria-label')) === want; });
    return ph || null;
  };`;

// Logs the browser in as the named account. Cloud: a fresh session (cookies cleared), the login page, login and password,
// the sign-in button, then the dialogs the guide says to dismiss; a rejected login is fatal. Gate: the account page.
// → null when done, else the reason it failed.
async function loginAs(tab, ref, settle) {
  const acc = accountOf(ref);
  if (cloud) {
    if (!acc || !acc.login) return 'konto „' + ref + '” nie ma loginu w tabeli kont';
    const form = access.form || {};
    await tab.clearCookies();
    await tab.navigate(access.url); await sleep(1500);
    let why = await act(tab, { fill: form.user || 'User name', value: acc.login });
    if (!why) why = await act(tab, { fill: form.password || 'Password', secret: true });
    if (!why) why = await act(tab, { click: form.submit || 'Sign in', settle: 1000 });
    if (why) return why;
    // off the login page within 15 s, or an error on it: stop everything before another try locks the account
    const loginPage = path.basename(new URL(access.url).pathname);
    const until = Date.now() + 15000;
    for (;;) {
      const loc = String(await tab.location().catch(() => ''));
      const text = String(await tab.text().catch(() => '')).toLowerCase();
      const hit = text.match(/[^.]*\b(incorrect|invalid|nieprawid\S*|locked|zablokowan\S*)\b[^.]*/);
      if (!hit && !loc.includes(loginPage)) break;
      if (hit || Date.now() > until) {
        const e = new Error('logowanie jako ' + acc.login + ' odrzucone (' + (hit ? 'strona mówi: „' + hit[0].replace(/\s+/g, ' ').trim().slice(0, 120) + '”' : 'po 15 s wciąż strona logowania, bez komunikatu') + '): przerywam całe przejście, żeby nie zablokować kont');
        e.fatal = true; throw e;
      }
      await sleep(500);
    }
    await sleep(settle || 5000);
    for (const d of access.dismiss || []) await act(tab, Object.assign({ optional: true, within: 3000 }, typeof d === 'string' ? { click: d } : d));
    return null;
  }
  const name = acc ? acc.name : ref;
  await tab.navigate(base + '/_gate/as'); await sleep(1500);
  const ok = await tab.evaluate(`(function(){${HELPERS} var card = byText(${js(name)}); if (!card) return false;
    var box = card.closest('button') || card; box.click(); return true; })()`);
  if (!ok) return 'nie ma konta „' + name + '” na stronie wyboru roli';
  await sleep(settle || 6000); return null;
}

// One action of a step: open, click, fill (secret: the testers' password), choose, see, seeNot, loginAs, wait.
// → null when done, else the reason it failed.
async function act(tab, a) {
  a = Object.assign({}, a, { click: sub(a.click), value: sub(a.value), see: sub(a.see), seeNot: sub(a.seeNot) });
  if (a.open != null) { await tab.navigate(/^https?:/.test(a.open) ? a.open : base + a.open); await sleep(a.settle || 2500); return null; }
  if (a.wait) { await sleep(a.wait); return null; }
  if (a.loginAs) return loginAs(tab, a.loginAs, a.settle);
  if (a.click) {
    const until = Date.now() + (a.timeout || 15000);
    for (;;) {
      // the element, scrolled into view; then a real mouse click at its centre, as a tester clicks; a popup over it is a failure
      const at = await tab.evaluate(`(function(){${HELPERS} var e = byText(${js(a.click)}); if (!e) return null; e.scrollIntoView({block:'center'});
        var r = e.getBoundingClientRect(); var x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
        while (top && top.shadowRoot && top.shadowRoot.elementFromPoint(x, y) && top.shadowRoot.elementFromPoint(x, y) !== top) top = top.shadowRoot.elementFromPoint(x, y);
        if (top && !(e === top || e.contains(top) || top.contains(e))) return { covered: (top.innerText || top.className || top.tagName).slice(0, 60) };
        return { x: x, y: y }; })()`).catch(() => null);
      if (at && !at.covered) { if (tab.clickAt) await tab.clickAt(at.x, at.y); else await tab.evaluate(`(function(){${HELPERS} byText(${js(a.click)}).click(); })()`); break; }
      // a button that is only an icon (no text): the guide names a CSS selector as the fallback
      if (!at && a.selector) {
        const el = await tab.evaluate(`(function(){${HELPERS} var e = Array.prototype.slice.call(document.querySelectorAll(${js(a.selector)})).filter(vis)[0]; if (!e) return null; e.scrollIntoView({block:'center'});
          var r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`).catch(() => null);
        if (el) { if (tab.clickAt) await tab.clickAt(el.x, el.y); else await tab.evaluate(`(function(){${HELPERS} Array.prototype.slice.call(document.querySelectorAll(${js(a.selector)})).filter(vis)[0].click(); })()`); break; }
      }
      if (at && at.covered && Date.now() > until) return '„' + a.click + '” zasłania coś innego: ' + at.covered;
      if (a.optional && Date.now() > until - (a.timeout || 15000) + (a.within || 3000)) return null;   // „gdy się pojawi”: absent is fine
      if (Date.now() > until) return 'nie znalazłem „' + a.click + '” do kliknięcia';
      await sleep(300);
    }
    await sleep(a.settle || 2000); return null;
  }
  if (a.fill) {
    // focus the field and select what is in it, then type the value with the keyboard (rich-text editors included)
    // two fields with one label (the ticket's Description and the new message's): the guide names a selector as well
    const ok = await tab.evaluate(`(function(){${HELPERS} var f = ${a.selector ? `Array.prototype.slice.call(document.querySelectorAll(${js(a.selector)})).filter(vis)[0]` : `field(${js(a.fill)})`}; if (!f) return false; f.scrollIntoView({block:'center'}); f.focus();
      if (f.isContentEditable) { var r = document.createRange(); r.selectNodeContents(f); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } else if (f.select) f.select();
      return true; })()`);
    if (!ok) return 'nie znalazłem pola „' + a.fill + '”';
    const value = a.secret ? password() : (a.value == null ? '' : String(a.value));
    if (tab.insertText) await tab.insertText(value);
    else await tab.evaluate(`(function(){ var f = document.activeElement; var proto = f.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(f, ${js(value)}); f.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await tab.evaluate('(function(){ var f = document.activeElement; if (f) { f.dispatchEvent(new Event("change", { bubbles: true })); f.blur(); } })()');
    await sleep(a.settle || 800); return null;
  }
  if (a.choose) {
    // a native list: the option with that text (exact, else the first starting with it); a dropdown widget (Mendix combo
    // box, reference selector): open it, type the text to filter, then click the option on the screen
    const r = await tab.evaluate(`(function(){${HELPERS} var f = field(${js(a.choose)}); if (!f) return { why: 'nie znalazłem pola' };
      var want = norm(${js(a.value)});
      if (f.tagName === 'SELECT') {
        var opts = Array.prototype.slice.call(f.options);
        var o = opts.find(function (o) { return norm(o.text) === want; }) || opts.find(function (o) { return norm(o.text).indexOf(want) === 0; });
        if (!o) return { why: 'na liście: ' + opts.map(function (o) { return o.text; }).filter(Boolean).slice(0, 15).join(' | ') };
        f.value = o.value; f.dispatchEvent(new Event('change', { bubbles: true })); return { done: true };
      }
      f.scrollIntoView({block:'center'}); f.focus(); f.click();
      return { widget: f.tagName.toLowerCase() + (f.className ? '.' + String(f.className).trim().split(/\\s+/).slice(0, 2).join('.') : '') }; })()`);
    if (r.done) { await sleep(a.settle || 1500); return null; }
    if (r.why) return 'nie wybrałem „' + a.value + '” w polu „' + a.choose + '”: ' + r.why;
    await sleep(600);
    // the option of the open list with that text (exact, else starting with it, else containing it): a real click on it.
    // First the list as it opened; then filtered by the typed text; then by the name before a parenthesis (a code the list may not show).
    const pickOption = () => tab.evaluate(`(function(){${HELPERS} var want = norm(${js(a.value)});
      var opts = deep(document).filter(vis).filter(function (e) { return e.matches('[role=option],[role=listbox] li,.widget-combobox-item,.dropdown-item'); });
      var o = opts.find(function (e) { return norm(e.innerText) === want; }) || opts.find(function (e) { return norm(e.innerText).indexOf(want) === 0; }) || opts.find(function (e) { return norm(e.innerText).indexOf(want) >= 0; });
      if (!o) return { why: 'na liście (' + opts.length + '): ' + opts.slice(0, 12).map(function (e) { return norm(e.innerText) || '[' + (e.className || e.tagName) + ']'; }).join(' | ') };
      o.scrollIntoView({block:'center'}); var r = o.getBoundingClientRect(); if (!${js(!!tab.clickAt)}) o.click(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`).catch(e => ({ why: e.message }));
    const typeFilter = async (text) => {
      if (!tab.insertText || !r.widget.startsWith('input')) return;
      await tab.evaluate(`(function(){${HELPERS} var f = field(${js(a.choose)}); if (f) { f.focus(); if (f.select) f.select(); } })()`).catch(() => null);
      await tab.insertText(text); await sleep(900);
    };
    let pick = await pickOption();
    if (pick.why) { await typeFilter(String(a.value)); pick = await pickOption(); }
    const short = String(a.value).replace(/\s*\(.*$/, '').trim();
    if (pick.why && short && short !== String(a.value)) { await typeFilter(short); pick = await pickOption(); }
    if (pick.why) return 'nie wybrałem „' + a.value + '” w polu „' + a.choose + '” (' + r.widget + '): ' + pick.why;
    if (tab.clickAt) await tab.clickAt(pick.x, pick.y);
    await sleep(a.settle || 1500); return null;
  }
  if (a.see != null || a.seeNot != null) {
    const want = String(a.see != null ? a.see : a.seeNot).replace(/\s+/g, ' ').toLowerCase();
    const until = Date.now() + (a.timeout || (a.see != null ? 15000 : 1500));
    for (;;) {
      // the page text, the values of visible fields (a tester sees them too) and the text of open shadow roots (the gateway's role panel)
      const text = String(await tab.evaluate(`(function(){ var t = document.body ? document.body.innerText : '';
        Array.prototype.forEach.call(document.querySelectorAll('input,textarea,select'), function (e) { var r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && e.type !== 'password') t += ' ' + (e.tagName === 'SELECT' ? (e.selectedOptions[0] ? e.selectedOptions[0].text : '') : (e.value || '')); });
        Array.prototype.forEach.call(document.querySelectorAll('*'), function (e) { if (e.shadowRoot) Array.prototype.forEach.call(e.shadowRoot.children, function (c) { t += ' ' + (c.innerText || ''); }); });
        return t; })()`).catch(() => '')).replace(/\s+/g, ' ').toLowerCase();
      const has = text.indexOf(want) >= 0;
      if (a.see != null && has) return null;
      if (a.seeNot != null && !has && Date.now() > until) return null;
      if (a.seeNot != null && has) return 'na stronie jest „' + a.seeNot + '”, a nie powinno';
      if (a.see != null && Date.now() > until) return 'nie widzę „' + a.see + '”';
      await sleep(400);
    }
  }
  return 'nieznana akcja ' + js(a);
}

// Runs one scenario: its real steps (section titles, headings, paragraphs and notes are document-only), then the expected
// result. → { id, title, account, steps: [{ no, text, account?, status, why? }], ok, shot }
async function scenario(browser, sc) {
  const tab = await browser.tab('about:blank');
  if (tab.viewport) await tab.viewport(1440, 900);
  const out = { id: sc.id, title: sc.title, account: sc.account || null, steps: [], ok: true, shot: null };
  const all = (sc.steps || []).filter(s => s.text != null).map((s, i) => Object.assign({ no: i + 1 }, s)).concat(sc.expect ? [Object.assign({ no: 'wynik' }, sc.expect)] : []);
  let current = null;   // the account logged in, as its key
  try {
    for (const s of all) {
      if (s.human) { out.steps.push({ no: s.no, text: s.text, status: 'human', why: s.human }); continue; }
      const actions = [].concat(s.do || []);
      let why = null;
      // a step by another account than the one logged in: change the account first, unless the step logs in itself
      if (s.account && accountKey(s.account) !== current && !actions.some(a => a.loginAs)) {
        why = await loginAs(tab, s.account).catch(e => { if (e.fatal) throw e; return e.message; });
        if (!why) current = accountKey(s.account);
      }
      for (const a of actions) {
        if (why) break;
        why = await act(tab, a).catch(e => { if (e.fatal) throw e; return e.message; });
        if (!why && a.loginAs) current = accountKey(a.loginAs);
      }
      out.steps.push(Object.assign({ no: s.no, text: s.text, status: why ? 'failed' : 'passed' }, s.account ? { account: s.account } : {}, why ? { why } : {}));
      if (explore) console.log('\n--- ' + sc.id + ' krok ' + s.no + ': ' + s.text + '\n' + String(await tab.text().catch(() => '')).slice(0, 1800));
      if (why) {
        out.ok = false;
        const png = await tab.screenshot(); if (png) fs.writeFileSync(path.join(outDir, sc.id + '-blad.png'), png);
        // what the page offers at the failed step: visible controls with their texts, to fix the guide without the browser
        const controls = await tab.evaluate(`(function(){${HELPERS} return Array.prototype.slice.call(document.querySelectorAll('input,select,textarea,button,a.btn,[role=combobox],[role=listbox],[role=option],[role=button],label')).filter(vis).slice(0, 200).map(function (e) {
          var t = e.tagName.toLowerCase(); var s = t + (t === 'input' && e.type ? '[' + e.type + ']' : '') + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).trim().split(/\\s+/).slice(0, 3).join('.') : '');
          var txt = norm(e.innerText || e.value || e.placeholder || e.getAttribute('aria-label') || e.getAttribute('title')).slice(0, 60);
          if (t === 'select') txt = 'opcje: ' + Array.prototype.slice.call(e.options).map(function (o) { return o.text; }).filter(Boolean).slice(0, 12).join(' | ');
          return s + (txt ? ' → ' + txt : ''); }).join('\\n'); })()`).catch(() => '');
        if (controls) fs.writeFileSync(path.join(outDir, sc.id + '-blad.txt'), 'Krok ' + s.no + ': ' + why + '\n\n' + controls + '\n');
        break;
      }
    }
  } finally {
    const png = await tab.screenshot();
    if (png) { out.shot = sc.id + '.png'; fs.writeFileSync(path.join(outDir, out.shot), png); }
    await tab.close();
  }
  return out;
}

// The report beside the screenshots: what passed, what failed and why, which steps only a person can do.
function markdown(result) {
  const mark = { passed: '✓', failed: '✗', human: '👤' };
  const lines = ['# Przejście instrukcji: ' + (guide.title || guide.app), '', (result.ok ? 'Cała instrukcja przechodzi.' : 'Instrukcja NIE przechodzi.') +
    ' ' + result.at + ', adres ' + base + '.' + (result.stopped ? ' Przerwane: ' + result.stopped : ''), ''];
  for (const s of result.scenarios) {
    lines.push('## ' + s.id + '. ' + s.title + (s.ok ? ' ✓' : ' ✗'), '', 'Konto: ' + (s.account || '–') + (s.shot ? ' · zrzut: ' + s.shot : ''), '');
    s.steps.forEach(st => lines.push('- ' + mark[st.status] + ' ' + st.no + '. ' + (st.account ? '[' + st.account + '] ' : '') + st.text + (st.why ? ' — ' + st.why : '')));
    lines.push('');
  }
  return lines.join('\n');
}

(async () => {
  const browser = await cdp.launch({ env: process.env });
  const result = { guide: path.basename(guideFile), base, at: new Date().toISOString(), ok: true, scenarios: [] };
  try {
    for (const sc of guide.scenarios || []) {
      if (only.length && !only.includes(sc.id)) continue;
      let r;
      try { r = await scenario(browser, sc); } catch (e) {
        if (!e.fatal) throw e;
        result.ok = false; result.stopped = e.message;
        console.log('STOP ' + sc.id + ' ' + sc.title + ': ' + e.message);
        break;
      }
      result.scenarios.push(r); if (!r.ok) result.ok = false;
      console.log((r.ok ? 'ok   ' : 'BŁĄD ') + sc.id + ' ' + sc.title + (r.ok ? '' : ': krok ' + r.steps[r.steps.length - 1].no + ' — ' + r.steps[r.steps.length - 1].why));
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(outDir, 'walkthrough.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(outDir, 'walkthrough.md'), markdown(result));
  console.log((result.ok ? 'Cała instrukcja przechodzi' : 'Instrukcja nie przechodzi') + ' · ' + path.join(outDir, 'walkthrough.md'));
  process.exit(result.stopped ? 3 : result.ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
