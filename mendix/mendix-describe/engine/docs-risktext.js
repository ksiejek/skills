/* MxScout — a risk's own words, laid out to be read: "What happens" and
 * "What to do" on the Risks page, and the page's tabs with its test case and
 * its fix step by step.
 *
 * A risk's text is one string — written by an agent, or by MxScout's security
 * check (secrisks.js) — and the checks write long ones: the roles a finding is
 * about, the access rules with their XPath, a list of 160 entities. As one
 * paragraph it is a wall. This file draws the same words, unchanged and in the
 * same order, with structure the text already has:
 *
 *   - each sentence a paragraph of its own;
 *   - a run of three or more items separated by semicolons a bulleted list,
 *     and a colon followed by four or more qualified names a set of chips;
 *   - an XPath constraint ([…]) as code, a qualified name (Module.Element) in
 *     mono with its module muted — a link when the documentation has that
 *     flow, page or entity — a $variable in mono, and a quoted role name in
 *     bold;
 *   - a break opportunity after every dot and underscore inside a name, so a
 *     long microflow name wraps inside its column instead of running into the
 *     next one — breaks() does the same for a risk's title and a place's name
 *     wherever the reader draws them in a narrow column.
 *
 * Nothing is added or reworded: what a reader copies is the text as written.
 * Like docs-triage.js it is part of the reader in a file of its own (the
 * reader stays under 3,000 lines), has no references of its own, and is
 * carried in the exported file (docs-file.js SCRIPTS). It builds its DOM with
 * the reader's builder, text only — none of it can become markup.
 */
(function () {
  'use strict';

  var QN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/;

  // Sentences, split where a sentence ends outside brackets and quotes: ". " before a capital, a quote or a $.
  function sentences(text) {
    var out = [], depth = 0, quote = false, start = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (c === '[' || c === '(') depth++;
      else if ((c === ']' || c === ')') && depth > 0) depth--;
      else if (c === '"') quote = !quote;
      else if ((c === '.' || c === '!' || c === '?') && !depth && !quote && text.charAt(i + 1) === ' ' && /[A-Z"“$]/.test(text.charAt(i + 2))) {
        out.push(text.slice(start, i + 1).trim()); start = i + 2;
      }
    }
    if (start < text.length) out.push(text.slice(start).trim());
    return out.filter(Boolean);
  }

  // Splits s at sep where it stands outside brackets; the parts keep their own text.
  function splitTop(s, sep) {
    var out = [], depth = 0, start = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '[' || c === '(') depth++;
      else if ((c === ']' || c === ')') && depth > 0) depth--;
      else if (!depth && s.substr(i, sep.length) === sep) { out.push(s.slice(start, i)); start = i + sep.length; i += sep.length - 1; }
    }
    out.push(s.slice(start));
    return out;
  }

  // A name with a break opportunity after each dot and underscore, the module part muted.
  function name(h, qn) {
    var dot = qn.indexOf('.'), kids = [];
    var rest = qn.slice(dot + 1).split(/([._])/);
    kids.push(h('span', { class: 'dx-mod', text: qn.slice(0, dot + 1) }), h('wbr'));
    rest.forEach(function (p) { if (p) kids.push(p); if (p === '.' || p === '_') kids.push(h('wbr')); });
    return kids;
  }

  // Plain text with a break opportunity after each dot and underscore inside a word, for a title or a name
  // that has to wrap in a narrow column (the list, the heading, the rows beside a risk); nothing else changes.
  function breaks(h, s) {
    var out = [];
    String(s || '').split(/(?<=[A-Za-z0-9][._])(?=[A-Za-z0-9])/).forEach(function (p, i) { if (i) out.push(h('wbr')); out.push(p); });
    return out;
  }

  // One run of text: XPath as code, names in mono (linked when the reader knows them), $vars, "roles".
  function inline(kit, s) {
    var h = kit.h, out = [], buf = '';
    function flush() { if (buf) { out.push(buf); buf = ''; } }
    for (var i = 0; i < s.length;) {
      var c = s.charAt(i), m;
      if (c === '[') {
        var depth = 0, j = i;
        for (; j < s.length; j++) { if (s.charAt(j) === '[') depth++; else if (s.charAt(j) === ']' && !--depth) break; }
        if (j < s.length) { flush(); out.push(h('code', { class: 'dx-rt-xp', text: s.slice(i, j + 1) })); i = j + 1; continue; }
      }
      var before = i ? s.charAt(i - 1) : ' ';
      if (/[A-Za-z_$"]/.test(c) && !/[A-Za-z0-9_.]/.test(before)) {
        m = /^\$[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)) || null;
        if (m) { flush(); out.push(h('span', { class: 'mono dx-rt-qn', text: m[0] })); i += m[0].length; continue; }
        m = /^"([^"\n]{1,60})"/.exec(s.slice(i));
        if (m && /^[A-Za-z_][\w ]*$/.test(m[1])) { flush(); out.push(h('b', { class: 'dx-rt-role', text: m[0] })); i += m[0].length; continue; }
        m = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+/.exec(s.slice(i));
        if (m && QN.test(m[0])) {
          flush();
          var qn = m[0], kids = name(h, qn), linked = kit.link ? kit.link(qn, kids) : null;
          out.push(linked || h('span', { class: 'mono dx-rt-qn' }, kids));
          i += qn.length; continue;
        }
      }
      buf += c; i++;
    }
    flush();
    return out;
  }

  // One sentence: a list when it carries one, otherwise a paragraph.
  function sentence(kit, s) {
    var h = kit.h;
    var semi = splitTop(s, '; ');
    if (semi.length >= 3) {
      // The list runs from after the last " — " or ": " before it to the next " — " after it.
      var first = semi[0], last = semi[semi.length - 1];
      var cut = Math.max(first.lastIndexOf(' — '), first.lastIndexOf(': '));
      var lead = cut >= 0 ? first.slice(0, cut + (first.charAt(cut) === ':' ? 1 : 3)).trim() : '';
      var tailAt = last.indexOf(' — ');
      var tail = tailAt >= 0 ? last.slice(tailAt).trim() : '';
      var items = [cut >= 0 ? first.slice(cut + (first.charAt(cut) === ':' ? 2 : 3)) : first].concat(semi.slice(1, -1), [tailAt >= 0 ? last.slice(0, tailAt) : last]);
      return [lead ? h('p', { class: 'dx-rk-p' }, inline(kit, lead)) : null,
        h('ul', { class: 'dx-rt-list' }, items.map(function (x) { return h('li', null, inline(kit, x.trim())); })),
        tail ? h('p', { class: 'dx-rk-p' }, inline(kit, tail)) : null];
    }
    var colon = s.indexOf(': ');
    if (colon > 0) {
      var rest = s.slice(colon + 2).replace(/[.…]+$/, ''), names = rest.split(', ');
      if (names.length >= 4 && names.every(function (n) { return QN.test(n.trim()); })) {
        return [h('p', { class: 'dx-rk-p' }, inline(kit, s.slice(0, colon + 1))),
          h('div', { class: 'dx-rt-chips' }, names.map(function (n) { return h('span', { class: 'dx-rt-chip' }, inline(kit, n.trim())); }))];
      }
    }
    return [h('p', { class: 'dx-rk-p' }, inline(kit, s))];
  }

  // kit: { h: the reader's builder, link(qn, kids): a link to that flow, page or entity, or null }.
  function block(kit, text) {
    var out = [];
    sentences(String(text || '')).forEach(function (s) { out = out.concat(sentence(kit, s)); });
    return kit.h('div', { class: 'dx-rt' }, out.filter(Boolean));
  }

  // ---- the risk's page, in tabs: Description · Test case · How to fix · Fix guide (when one was written) · Also found in ----
  // kit: { h, rt (text → its block), navIcon, own (MxScout's own check wrote it) }. The bar: each tab a button, with
  // a count where there is one; to(key) switches. The test case and the fix are drawn here; the description and the
  // places stay with the reader, which knows the triage and the links.
  function tabBar(kit, r, tab, places, to) {
    var h = kit.h, T = r.test || null;
    return h('div', { class: 'dx-tabs dx-rk-tabs', role: 'tablist', 'aria-label': 'Finding' }, [['about', 'Description'], ['test', 'Test case', T ? (T.steps || []).length : 0],
      ['fix', 'How to fix', (r.repair || []).filter(Boolean).length]].concat(r.guide ? [['guide', 'Fix guide', ((r.guide.reproduce || []).length + (r.guide.check || []).length) || 0]] : [])
      .concat([['where', 'Also found in', places]]).map(function (b) {
      var on = tab === b[0];
      return h('button', { type: 'button', role: 'tab', class: on ? 'on' : '', 'aria-selected': on ? 'true' : 'false', 'data-tab': b[0], onclick: function () { to(b[0]); } }, [b[1], b[2] ? h('i', { text: String(b[2]) }) : null]);
    }));
  }
  // A step that ends in something to type in the browser's console: the words, then the code to copy.
  function stepView(h, s) {
    var i = s.indexOf('mx.');
    return h('li', null, i > 0 ? [s.slice(0, i), h('code', { class: 'dx-rk-code mono', text: s.slice(i) })] : [s]);
  }
  function panel(kit, r, tab) {
    var h = kit.h, rt = kit.rt, T = r.test || null, R = (r.repair || []).filter(Boolean);
    function sec(label, kids, cls) { return h('section', { class: 'dx-rk-sec' + (cls ? ' ' + cls : '') }, [h('h3', { class: 'dx-cap', text: label })].concat(kids)); }
    if (tab === 'guide') {
      var G = r.guide || {};
      return r.guide ? [
        G.where ? sec('Where the problem is', [rt(G.where)]) : null,
        G.expected ? sec('How it should work', [rt(G.expected)]) : null,
        (G.reproduce || []).length ? sec('To see it happen', [h('ol', { class: 'dx-rk-steps' }, G.reproduce.map(function (s) { return stepView(h, s); }))]) : null,
        (G.check || []).length ? sec('How to tell the fix works', [h('ol', { class: 'dx-rk-steps' }, G.check.map(function (s) { return h('li', null, [s]); }))], 'dx-rk-real') : null
      ] : [h('div', { class: 'dx-empty pad', text: 'No fix guide for this finding. Ask the agent for one: “write the fix guide for this finding”.' })];
    }
    if (tab === 'test') return T ? [
      T.who ? sec('Who', [h('p', { class: 'dx-rk-p', text: T.who })]) : null,
      T.given ? sec('Before you start', [rt(T.given)]) : null,
      (T.steps || []).length ? sec('Steps', [h('ol', { class: 'dx-rk-steps' }, T.steps.map(function (s) { return stepView(h, s); }))]) : null,
      T.real ? sec('It is a real risk if', [rt(T.real)], 'dx-rk-real') : null,
      T.safe ? sec('It is safe if', [rt(T.safe)]) : null
    ] : [h('div', { class: 'dx-empty pad', text: 'No test case for this finding: ' + (kit.own ? 'its check does not write one.' : 'it was not written with one. MxScout’s security check writes one for each of its risks.') })];
    return [
      r.fix ? h('section', { class: 'dx-rk-fix' }, [h('h3', { class: 'dx-cap acc' }, [kit.navIcon('quality', 14), 'What to do']), rt(r.fix)]) : null,
      // A view entity proposal (perfrisks.js): its OQL, as code to copy into Studio Pro.
      r.oql ? sec('View entity · OQL', [h('code', { class: 'dx-rk-code mono', text: r.oql })]) : null,
      // A numbered or dashed line keeps its mark beside it: as text through rt(), "1." would be a sentence of its own.
      R.length ? sec('Step by step', [h('ul', { class: 'dx-rk-steps plain' }, R.map(function (l) {
        var m = /^(\d+\.|-) (.*)$/.exec(l);
        return h('li', null, m ? [h('span', { class: 'dx-rk-n mono', text: m[1] === '-' ? '· ' : m[1] + ' ' }), rt(m[2])] : [rt(l)]);
      }))]) : null,
      !r.fix && !R.length && !r.oql ? h('div', { class: 'dx-empty pad', text: 'No fix was written for this finding.' }) : null
    ];
  }

  // A logic finding: the business brief's rule it is about, what kind of gap, what the brief expects — and the
  // solution story it is worked in, when there is one. Nothing for any other finding.
  var LOGIC_KIND = { 'not-built': 'A rule the model does not build', wrong: 'Built differently from the rule', missing: 'An element the brief needs is missing' };
  function logicBlock(kit, r) {
    var h = kit.h, L = r.logic, S = r.story;
    if (!L && !S) return null;
    return h('section', { class: 'dx-rk-sec dx-rk-logic' }, [
      h('h3', { class: 'dx-cap', text: L ? 'Against the business brief' : 'Solution story' }),
      L ? h('p', { class: 'dx-rk-p' }, [h('b', { text: LOGIC_KIND[L.kind] || L.kind }), L.rule ? ' · ' + L.rule : '', L.source ? ' · ' + L.source : '']) : null,
      L && L.expected ? kit.rt(L.expected) : null,
      S ? h('p', { class: 'dx-rk-note', text: 'Worked in solution story ' + [S.number ? '#' + S.number : null, S.external].filter(Boolean).join(' · ') + '.' +
        (S.built ? ' Built in commit ' + S.built.slice(0, 10) + ' — the next check against the model verifies it.' : '') }) : null
    ]);
  }

  // The same in the Markdown copy, as "- " lines: the brief's rule, the story, the fix guide — and a view entity's OQL as a code block.
  function markdown(r, w, esc) {
    var L = r.logic, S = r.story, G = r.guide;
    if (r.oql) { w('- View entity (OQL):'); w(''); w('```sql'); String(r.oql).split('\n').forEach(function (l) { w(l); }); w('```'); w(''); }
    if (L) w('- Against the business brief: ' + (LOGIC_KIND[L.kind] || L.kind) + (L.rule ? ' · ' + L.rule : '') + (L.source ? ' · ' + esc(L.source) : '') + (L.expected ? ' — ' + esc(L.expected) : ''));
    if (S) w('- Solution story: ' + [S.number ? '#' + S.number : null, S.external ? esc(S.external) : null].filter(Boolean).join(' · ') + (S.built ? ' · built in commit ' + S.built.slice(0, 10) : ''));
    if (!G) return;
    if (G.where) w('- Fix guide, where: ' + esc(G.where));
    if (G.expected) w('- Fix guide, how it should work: ' + esc(G.expected));
    (G.reproduce || []).forEach(function (t, k) { w('- To see it happen, ' + (k + 1) + ': ' + esc(t)); });
    (G.check || []).forEach(function (t, k) { w('- To check the fix, ' + (k + 1) + ': ' + esc(t)); });
  }

  window.MxRiskText = { block: block, sentences: sentences, inline: inline, breaks: breaks, tabBar: tabBar, panel: panel, logicBlock: logicBlock, markdown: markdown };
})();
