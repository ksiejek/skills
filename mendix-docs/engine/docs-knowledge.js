/* MxScout — the Solved cases page: what stayed behind when a ticket, a Jira issue or an idea was solved.
 *
 * Karol, 2026-10-15: an agent that solves a case writes a note into knowledge/ (one Markdown file per
 * case, repodocs.js reads it); the next agent — on any machine, with or without MxScout — finds it
 * there first. This page is where a person reads them: every case in a list, searched and filtered by
 * kind, each opened as text — the problem, the cause, the solution, what did not work, how to
 * recognise it next time — with the flows and pages it names linked to their place in the model, and
 * a warning when one of them changed since the case was solved (its fingerprint moved) or is gone:
 * the case may be out of date. Read-only: MxScout records no case itself; an agent writes them.
 *
 * Drawn by the documentation reader (docs-view.js) in MxScout's own Solved cases screen, which hands
 * it the cases (opts.cases) — and in an exported file only when the person ticked "Include solved
 * cases" on Export: the file then carries them in its data, with what changed already worked out.
 * Text only: a note's simple Markdown (paragraphs, lists, `code`, **bold**) is drawn with elements
 * and text nodes, never parsed as markup.
 */
(function () {
  'use strict';

  var KINDS = [['', 'All'], ['ticket', 'Tickets'], ['jira', 'Jira'], ['idea', 'Ideas'], ['other', 'Other']];
  var KIND_ONE = { ticket: 'ticket', jira: 'Jira issue', idea: 'idea', other: 'other help' };
  var STATUS = { solved: 'Solved', workaround: 'Workaround', 'wont-fix': 'Won’t fix', 'as-designed': 'As designed' };

  // ---------- may be out of date ----------
  // Which of the flows, pages and entities a case names changed since it was solved: a flow or a page whose
  // fingerprint (describe.js hashOf, the pack's #xxxxxxxx) is not the one the note recorded, or one that is
  // not in the model any more — counted only in a module the data has, so an export of some modules does not
  // call the rest gone. flowOf(qn) → { f } or null; hashOf(entry) → its fingerprint, when this copy can tell.
  function staleOf(c, data, flowOf, hashOf) {
    if (Array.isArray(c.stale)) return c.stale;
    var mods = {}, out = [];
    (data.modules || []).forEach(function (m) { mods[m.name] = true; });
    function inData(qn) { return !!mods[String(qn).split('.')[0]]; }
    (c.flows || []).concat(c.pages || []).forEach(function (qn) {
      var hit = flowOf(qn);
      if (!hit) { if (inData(qn)) out.push(qn + ' is not in the model any more'); return; }
      var fp = c.fingerprints && c.fingerprints[qn];
      if (fp && hashOf && hashOf(hit.f) !== fp) out.push(qn + ' changed since the case was solved');
    });
    (c.entities || []).forEach(function (qn) { if (inData(qn) && !(data.entities || {})[qn]) out.push(qn + ' is not in the model any more'); });
    return out;
  }
  // The cases as an exported file carries them: what the page draws, with what changed worked out here (the
  // file has no fingerprints to compare with) — never the note's whole text, nor its fingerprints.
  function forData(cases, data, flowOf, hashOf) {
    return (cases || []).map(function (c) {
      return { id: c.id, kind: c.kind, title: c.title, status: c.status, solved: c.solved, model: c.model, flows: c.flows, entities: c.entities, pages: c.pages,
        keywords: c.keywords, related: c.related, language: c.language, path: c.path, sections: c.sections, stale: staleOf(c, data, flowOf, hashOf) };
    });
  }

  // ---------- a note's simple Markdown, as elements ----------
  // `code` and **bold** inside a line; everything else is the text as written.
  function inline(h, text) {
    return String(text).split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/).filter(function (x) { return x !== ''; }).map(function (x) {
      if (/^`[^`]+`$/.test(x)) return h('code', { class: 'dx-code', text: x.slice(1, -1) });
      if (/^\*\*[^*]+\*\*$/.test(x)) return h('b', { text: x.slice(2, -2) });
      return x;
    });
  }
  // Paragraphs, "-" and "1." lists, "### " subheadings and ``` blocks — the rest as paragraphs of text.
  function blocks(h, text) {
    var out = [], lines = String(text || '').split('\n'), i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) { i++; continue; }
      if (/^```/.test(l)) {
        var code = [];
        for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
        i++;
        out.push(h('pre', { class: 'dx-kn-pre', text: code.join('\n') }));
        continue;
      }
      var hd = /^#{3,6}\s+(.*)$/.exec(l);
      if (hd) { out.push(h('h4', { class: 'dx-kn-h4', text: hd[1] })); i++; continue; }
      var bullet = /^\s*[-*]\s+/, num = /^\s*\d+[.)]\s+/;
      if (bullet.test(l) || num.test(l)) {
        var ordered = num.test(l), items = [];
        while (i < lines.length && (ordered ? num : bullet).test(lines[i])) {
          var item = lines[i].replace(ordered ? num : bullet, '');
          for (i++; i < lines.length && /^\s{2,}\S/.test(lines[i]) && !bullet.test(lines[i]) && !num.test(lines[i]); i++) item += ' ' + lines[i].trim();
          items.push(h('li', null, inline(h, item)));
        }
        out.push(h(ordered ? 'ol' : 'ul', { class: 'dx-kn-list' }, items));
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{3,6}\s/.test(lines[i]) && !bullet.test(lines[i]) && !num.test(lines[i])) { para.push(lines[i].trim()); i++; }
      out.push(h('p', null, inline(h, para.join(' '))));
    }
    return out;
  }
  function problemLine(c) {
    var p = (c.sections || []).filter(function (s) { return s.title === 'Problem'; })[0];
    var t = p ? String(p.text).replace(/\s+/g, ' ').trim() : '';
    var dot = t.search(/[.!?](\s|$)/);
    t = dot > 0 && dot < 220 ? t.slice(0, dot + 1) : t;
    return t.length > 240 ? t.slice(0, 239) + '…' : t;
  }

  // kit: h, ln, list, main, setTitle, project, st (the reader's state: cid, kq, kk), keep (a patch of that
  // state, kept without drawing again), plural, cases ({ items() }), data, flow(qn) → { key, f } or null.
  function draw(kit) {
    var h = kit.h, ln = kit.ln, st = kit.st, all = (kit.cases.items() || []).slice();
    var hashOf = window.MxDescribe && window.MxDescribe.hashOf;
    var stale = {};
    all.forEach(function (c) { stale[c.path] = staleOf(c, kit.data, kit.flow, hashOf); });
    var it = null;
    all.forEach(function (c) { if (c.path === st.cid) it = c; });
    var old = all.filter(function (c) { return stale[c.path].length; }).length;
    kit.setTitle('Solved cases', all.length
      ? kit.plural(all.length, 'case', 'cases') + ' solved with an agent — the problem, its cause, the solution and the dead ends' + (old ? ', ' + old + ' of them may be out of date' : '') + '. Search them before working out a new one.'
      : 'What stays behind when a ticket, a Jira issue or an idea is solved with an agent.');
    function badge(c) { return h('span', { class: 'dx-kn-kind ' + c.kind, text: KIND_ONE[c.kind] || c.kind }); }
    function staleBadge(c) { return stale[c.path].length ? h('span', { class: 'dx-kn-old', text: 'may be out of date' }) : null; }

    // ---- the list beside the page ----
    var rows = [h('div', { role: 'listitem' }, ln({ view: 'cases', cid: null }, { class: 'dx-pl-item dx-tk-item' + (it ? '' : ' on'), 'aria-current': it ? null : 'page' }, [
      h('span', { class: 'dx-pl-t' }, [h('b', { text: 'All solved cases' }), h('small', { text: kit.plural(all.length, 'case', 'cases') })])]))];
    all.forEach(function (c) {
      var on = c === it;
      rows.push(h('div', { role: 'listitem' }, ln({ view: 'cases', cid: c.path }, { class: 'dx-pl-item dx-tk-item' + (on ? ' on' : ''), 'aria-current': on ? 'page' : null }, [
        h('span', { class: 'dx-pl-t' }, [h('b', { text: c.title }), h('small', null, [h('code', { class: 'dx-tk-id', text: c.id }), ' ', badge(c), staleBadge(c) ? ' ' : null, staleBadge(c)])])])));
    });
    kit.list.appendChild(h('div', { class: 'dx-pl', role: 'list' }, rows));

    var wrap = h('div', { class: 'dx-pd dx-ch dx-kn' });
    if (!it) index(); else one(it);
    wrap.appendChild(h('p', { class: 'dx-prov' }, [h('span', { class: 'dx-ai', title: 'Written by an AI agent, not read from the model', text: '✦ AI' }),
      ' Written by an agent when the case was solved, in knowledge/ — one Markdown file per case, committed with the fix. It says what held then; the model may have moved since.']));
    kit.main.appendChild(wrap);

    function index() {
      wrap.appendChild(h('div', { class: 'dx-pd-head' }, [
        h('span', { class: 'dx-pd-eye', text: kit.project + ' · solved cases' }),
        h('h2', { text: 'Solved cases' }),
        h('p', { class: 'dx-pd-lead', text: 'Each ticket, Jira issue or idea an agent helped solve: what the problem was, where in the model it came from, what was done, and what did not work. An agent searches them before it works out a new one.' })
      ]));
      if (!all.length) {
        wrap.appendChild(h('div', { class: 'dx-note dx-kn-empty', text: 'No solved cases yet. When a case is solved with an agent that has the mendix-assist skill, it writes a note into knowledge/ — commit it with the fix, and it appears here.' }));
        return;
      }
      var q = h('input', { type: 'search', class: 'dx-as-q dx-kn-q', placeholder: 'Search the solved cases — a symptom, a flow, a screen…', 'aria-label': 'Search the solved cases', value: st.kq || '' });
      var list = h('div', { class: 'dx-pd-rows dx-ch-index dx-kn-index' }, all.map(function (c) {
        var meta = [c.status !== 'solved' ? STATUS[c.status] || c.status : null, c.solved ? 'solved ' + c.solved : null, c.model ? 'checked against ' + c.model.slice(0, 7) : null].filter(Boolean).join(' · ');
        var r = ln({ view: 'cases', cid: c.path }, { class: 'dx-ch-row dx-kn-row', 'data-kind': c.kind, 'data-path': c.path, 'data-stale': stale[c.path].length ? 'true' : 'false' }, [
          h('span', { class: 'dx-ch-row-h' }, [h('code', { class: 'dx-tk-id', text: c.id }), h('b', { text: c.title }), badge(c), staleBadge(c)]),
          problemLine(c) ? h('span', { class: 'dx-ch-row-s', text: problemLine(c) }) : null,
          h('small', { text: meta })
        ]);
        r._find = [c.id, c.title, c.kind, c.status].concat(c.flows || [], c.pages || [], c.entities || [], c.keywords || [], (c.sections || []).map(function (s) { return s.text; })).join(' ').toLowerCase();
        return r;
      }));
      var none = h('p', { class: 'dx-note dx-as-none', text: 'Nothing matches.' });
      var chips = [];
      function apply() {
        var words = String(st.kq || '').toLowerCase().split(/\s+/).filter(Boolean), shown = 0;
        chips.forEach(function (b) { var on = b.getAttribute('data-kind') === (st.kk || ''); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        Array.prototype.forEach.call(list.children, function (r) {
          var hide = (!!st.kk && r.getAttribute('data-kind') !== st.kk) || words.some(function (w) { return r._find.indexOf(w) === -1; });
          r.hidden = hide;
          if (!hide) shown++;
        });
        none.hidden = shown > 0;
      }
      KINDS.forEach(function (k) {
        var n = k[0] ? all.filter(function (c) { return c.kind === k[0]; }).length : all.length;
        if (k[0] && !n) return;
        var b = h('button', { type: 'button', class: 'dx-tk-chip dx-kn-chip', 'data-kind': k[0], 'aria-pressed': 'false' }, [k[1], h('span', { class: 'mono', text: ' ' + n })]);
        b.addEventListener('click', function () { kit.keep({ kk: k[0] || null }); apply(); });
        chips.push(b);
      });
      q.addEventListener('input', function () { kit.keep({ kq: q.value }); apply(); });
      wrap.appendChild(h('div', { class: 'dx-as-tools' }, [q, h('div', { class: 'dx-tk-chips', role: 'group', 'aria-label': 'Show by kind' }, chips)]));
      wrap.appendChild(list);
      wrap.appendChild(none);
      apply();
    }

    function one(c) {
      wrap.appendChild(h('div', { class: 'dx-pd-head' }, [
        h('span', { class: 'dx-pd-eye' }, [h('code', { class: 'dx-tk-id', text: c.id }), ' · ' + (KIND_ONE[c.kind] || c.kind), c.status !== 'solved' ? ' · ' + (STATUS[c.status] || c.status) : null,
          c.solved ? ' · solved ' + c.solved : null, c.model ? ' · checked against the model at ' + c.model.slice(0, 7) : null, c.language && c.language !== 'en' ? ' · written in ' + c.language : null]),
        h('h2', { text: c.title }),
        h('p', { class: 'dx-pd-lead' }, [h('code', { class: 'dx-kn-path', text: c.path })])
      ]));
      if (stale[c.path].length) {
        wrap.appendChild(h('div', { class: 'dx-note dx-kn-stale', role: 'note' }, [h('b', { text: 'May be out of date. ' }),
          stale[c.path].join('; ') + '. Check what the case says against the model as it is now before you rely on it.']));
      }
      var names = [];
      (c.flows || []).concat(c.pages || [], c.entities || []).forEach(function (qn) {
        var hit = kit.flow(qn), ent = kit.data.entities && kit.data.entities[qn];
        if (hit) names.push(ln({ view: 'refs', module: hit.f.module, seg: hit.f.kind, key: hit.key }, { class: 'dx-code link' }, qn));
        else if (ent) names.push(ln({ view: 'domain', entity: qn, dmodule: ent.module }, { class: 'dx-code link' }, qn));
        else names.push(h('code', { class: 'dx-code', text: qn }));
      });
      var related = (c.related || []).map(function (id) {
        var other = all.filter(function (x) { return x.id === id; })[0];
        return other ? ln({ view: 'cases', cid: other.path }, { class: 'dx-tk-id link' }, id) : h('code', { class: 'dx-tk-id', text: id });
      });
      if (names.length || (c.keywords || []).length || related.length) {
        wrap.appendChild(h('section', { class: 'dx-pd-sec dx-kn-about' }, [
          names.length ? h('div', { class: 'dx-as-touches' }, names) : null,
          (c.keywords || []).length ? h('div', { class: 'dx-ch-roles dx-kn-keys' }, [h('span', { text: 'Keywords' })].concat(c.keywords.map(function (k) { return h('span', { class: 'dx-ch-role', text: k }); }))) : null,
          related.length ? h('div', { class: 'dx-ch-roles dx-kn-related' }, [h('span', { text: 'Related' })].concat(related)) : null
        ]));
      }
      (c.sections || []).forEach(function (s) {
        wrap.appendChild(h('section', { class: 'dx-pd-sec dx-kn-sec', 'data-section': s.title }, [h('h3', { class: 'dx-cap', text: s.title })].concat(blocks(h, s.text))));
      });
    }
  }

  // ---------- the Markdown copy ----------
  // The cases as a section of the documentation's Markdown file, when the export was asked for them.
  function markdown(cases) {
    var out = ['## Solved cases', '', 'Each written by an agent when the case was solved, in knowledge/; it says what held then.', ''];
    (cases || []).forEach(function (c) {
      out.push('### ' + c.id + ' — ' + c.title, '');
      out.push('*' + [KIND_ONE[c.kind] || c.kind, c.status !== 'solved' ? STATUS[c.status] || c.status : null, c.solved ? 'solved ' + c.solved : null, c.model ? 'checked against ' + c.model.slice(0, 7) : null].filter(Boolean).join(' · ') + '*', '');
      if ((c.stale || []).length) out.push('> **May be out of date.** ' + c.stale.join('; ') + '.', '');
      var names = (c.flows || []).concat(c.pages || [], c.entities || []);
      if (names.length) out.push('About: ' + names.map(function (n) { return '`' + n + '`'; }).join(', '), '');
      (c.sections || []).forEach(function (s) { out.push('#### ' + s.title, '', String(s.text || '').replace(/^#{1,6}\s+/gm, '') , ''); });
    });
    return out.join('\n');
  }

  window.MxDocsKnowledge = { draw: draw, markdown: markdown, staleOf: staleOf, forData: forData, blocks: blocks };
})();
