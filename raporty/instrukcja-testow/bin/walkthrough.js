#!/usr/bin/env node
// walkthrough.js: the browser check of the "instrukcja-testow" skill. It reads the guide (instrukcja.json, the same file
// guide.js turns into the document) and does exactly the written steps with the written test account, in a headless
// Chromium (Tandem's CDP driver, modules/mendix/lib/cdp.js: no npm). One screenshot per scenario, one more on a failed step.
// A step the browser cannot do (the e-mail code goes to the tester's mailbox) is `human`: it is listed, never skipped quietly.
// Usage: node walkthrough.js instrukcja.json [outDir] [--only S1,S2] [--explore]
//   outDir     defaults to <guide folder>/przejscie; gets walkthrough.json, walkthrough.md and <scenario>.png
//   --explore  prints the page text after every step (for writing the steps, not for the proof)
// Exit code 0 only when every scenario passed end to end.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

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

// The address the browser uses: guide.access.walkUrl (Karol's tailnet route to the same gateway) or the gate itself.
const base = String((guide.access && (guide.access.walkUrl || guide.access.gate)) || '').replace(/\/$/, '');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const js = JSON.stringify;

// Page-side helpers, injected once per evaluate: visible elements, the one whose own text matches, the field of a label.
const HELPERS = `
  var vis = function (e) { var r = e.getBoundingClientRect(); var s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  var norm = function (s) { return String(s || '').replace(/\\s+/g, ' ').trim().toLowerCase(); };
  var byText = function (text, scope) {
    var want = norm(text), all = Array.prototype.slice.call((scope || document).querySelectorAll('*')).filter(vis);
    var exact = all.filter(function (e) { return norm(e.innerText || e.value) === want; });
    var pool = exact.length ? exact : all.filter(function (e) { return norm(e.innerText || e.value).indexOf(want) >= 0; });
    pool.sort(function (a, b) { return (a.innerText || '').length - (b.innerText || '').length; });
    var hit = pool[0]; if (!hit) return null;
    var up = hit.closest('button,a,[role=button],[role=tab],[role=menuitem],[role=row],tr,input[type=submit]');
    return up && vis(up) ? up : hit;
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

// One action of a step: open, click, fill, choose, see, seeNot, loginAs, wait. → null when done, else the reason it failed.
async function act(tab, a) {
  if (a.open != null) { await tab.navigate(/^https?:/.test(a.open) ? a.open : base + a.open); await sleep(a.settle || 2500); return null; }
  if (a.wait) { await sleep(a.wait); return null; }
  if (a.loginAs) {
    await tab.navigate(base + '/_gate/as'); await sleep(1500);
    const ok = await tab.evaluate(`(function(){${HELPERS} var card = byText(${js(a.loginAs)}); if (!card) return false;
      var box = card.closest('button') || card; box.click(); return true; })()`);
    if (!ok) return 'nie ma konta „' + a.loginAs + '” na stronie wyboru roli';
    await sleep(a.settle || 6000); return null;
  }
  if (a.click) {
    const until = Date.now() + (a.timeout || 15000);
    for (;;) {
      // the element, scrolled into view; then a real mouse click at its centre, as a tester clicks; a popup over it is a failure
      const at = await tab.evaluate(`(function(){${HELPERS} var e = byText(${js(a.click)}); if (!e) return null; e.scrollIntoView({block:'center'});
        var r = e.getBoundingClientRect(); var x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
        if (top && !(e === top || e.contains(top) || top.contains(e))) return { covered: (top.innerText || top.className || top.tagName).slice(0, 60) };
        return { x: x, y: y }; })()`).catch(() => null);
      if (at && !at.covered) { if (tab.clickAt) await tab.clickAt(at.x, at.y); else await tab.evaluate(`(function(){${HELPERS} byText(${js(a.click)}).click(); })()`); break; }
      if (at && at.covered && Date.now() > until) return '„' + a.click + '” zasłania coś innego: ' + at.covered;
      if (a.optional && Date.now() > until - (a.timeout || 15000) + (a.within || 3000)) return null;   // „gdy się pojawi”: absent is fine
      if (Date.now() > until) return 'nie znalazłem „' + a.click + '” do kliknięcia';
      await sleep(300);
    }
    await sleep(a.settle || 2000); return null;
  }
  if (a.fill) {
    // focus the field and select what is in it, then type the value with the keyboard (rich-text editors included)
    const ok = await tab.evaluate(`(function(){${HELPERS} var f = field(${js(a.fill)}); if (!f) return false; f.scrollIntoView({block:'center'}); f.focus();
      if (f.isContentEditable) { var r = document.createRange(); r.selectNodeContents(f); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } else if (f.select) f.select();
      return true; })()`);
    if (!ok) return 'nie znalazłem pola „' + a.fill + '”';
    if (tab.insertText) await tab.insertText(a.value == null ? '' : a.value);
    else await tab.evaluate(`(function(){ var f = document.activeElement; var proto = f.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(f, ${js(String(a.value == null ? '' : a.value))}); f.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await tab.evaluate('(function(){ var f = document.activeElement; if (f) { f.dispatchEvent(new Event("change", { bubbles: true })); f.blur(); } })()');
    await sleep(a.settle || 800); return null;
  }
  if (a.choose) {
    const ok = await tab.evaluate(`(function(){${HELPERS} var f = field(${js(a.choose)}); if (!f || f.tagName !== 'SELECT') return false;
      var o = Array.prototype.slice.call(f.options).find(function (o) { return norm(o.text) === norm(${js(a.value)}); }); if (!o) return false;
      f.value = o.value; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    if (!ok) return 'nie wybrałem „' + a.value + '” w polu „' + a.choose + '”';
    await sleep(a.settle || 1500); return null;
  }
  if (a.see != null || a.seeNot != null) {
    const want = String(a.see != null ? a.see : a.seeNot).replace(/\s+/g, ' ').toLowerCase();
    const until = Date.now() + (a.timeout || (a.see != null ? 15000 : 1500));
    for (;;) {
      const text = String(await tab.text().catch(() => '')).replace(/\s+/g, ' ').toLowerCase();
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

// Runs one scenario: its steps, then the expected result. → { id, title, account, steps: [{ no, text, status, why? }], ok, shot }
async function scenario(browser, sc) {
  const tab = await browser.tab('about:blank');
  if (tab.viewport) await tab.viewport(1440, 900);
  const out = { id: sc.id, title: sc.title, account: sc.account || null, steps: [], ok: true, shot: null };
  const all = (sc.steps || []).map((s, i) => Object.assign({ no: i + 1 }, s)).concat(sc.expect ? [Object.assign({ no: 'wynik' }, sc.expect)] : []);
  for (const s of all) {
    if (s.human) { out.steps.push({ no: s.no, text: s.text, status: 'human', why: s.human }); continue; }
    const actions = [].concat(s.do || []);
    let why = null;
    for (const a of actions) { why = await act(tab, a).catch(e => e.message); if (why) break; }
    out.steps.push(Object.assign({ no: s.no, text: s.text, status: why ? 'failed' : 'passed' }, why ? { why } : {}));
    if (explore) console.log('\n--- ' + sc.id + ' krok ' + s.no + ': ' + s.text + '\n' + String(await tab.text().catch(() => '')).slice(0, 1800));
    if (why) {
      out.ok = false;
      const png = await tab.screenshot(); if (png) fs.writeFileSync(path.join(outDir, sc.id + '-blad.png'), png);
      break;
    }
  }
  const png = await tab.screenshot();
  if (png) { out.shot = sc.id + '.png'; fs.writeFileSync(path.join(outDir, out.shot), png); }
  await tab.close();
  return out;
}

// The report beside the screenshots: what passed, what failed and why, which steps only a person can do.
function markdown(result) {
  const mark = { passed: '✓', failed: '✗', human: '👤' };
  const lines = ['# Przejście instrukcji: ' + (guide.title || guide.app), '', (result.ok ? 'Cała instrukcja przechodzi.' : 'Instrukcja NIE przechodzi.') +
    ' ' + result.at + ', adres ' + base + '.', ''];
  for (const s of result.scenarios) {
    lines.push('## ' + s.id + '. ' + s.title + (s.ok ? ' ✓' : ' ✗'), '', 'Konto: ' + (s.account || '–') + (s.shot ? ' · zrzut: ' + s.shot : ''), '');
    s.steps.forEach(st => lines.push('- ' + mark[st.status] + ' ' + st.no + '. ' + st.text + (st.why ? ' — ' + st.why : '')));
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
      const r = await scenario(browser, sc);
      result.scenarios.push(r); if (!r.ok) result.ok = false;
      console.log((r.ok ? 'ok   ' : 'BŁĄD ') + sc.id + ' ' + sc.title + (r.ok ? '' : ': krok ' + r.steps[r.steps.length - 1].no + ' — ' + r.steps[r.steps.length - 1].why));
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(outDir, 'walkthrough.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(outDir, 'walkthrough.md'), markdown(result));
  console.log((result.ok ? 'Cała instrukcja przechodzi' : 'Instrukcja nie przechodzi') + ' · ' + path.join(outDir, 'walkthrough.md'));
  process.exit(result.ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
