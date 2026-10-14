/* MxScout — documentation, the Tickets page.
 *
 * A ticket is something reported on the application — a Jira issue, an e-mail
 * from a user — that an agent with the mendix-ticket-check skill checked
 * against the model (Karol, 2026-10-14: "I paste a ticket, it checks whether
 * the ticket is right and keeps the result in the documentation"): the ticket
 * as it was pasted, a verdict — a bug in the model, works as designed, data or
 * configuration, or cannot tell from the model — with how sure it is, the
 * reasoning, what the model does, the places in the model that show it, what
 * would settle it, a reply to paste back into the ticket, and for a bug the
 * change on the Changes page that would fix it. It is an agent's judgement.
 * MxScout shows it and acts on none of it: nothing is sent to the tracker, and
 * a ticket's source address is shown as text, never opened or fetched.
 *
 * Like docs-changes.js, the page is part of the documentation reader
 * (docs-view.js), in a file of its own so the reader stays under 3,000 lines —
 * and so does its section of the Markdown copy. It has no references of its
 * own: the reader hands it what it draws and writes with each time. The
 * exported file carries this file beside the flow drawing (docs-file.js
 * SCRIPTS), so the file draws the page, and writes its Markdown, exactly as
 * MxScout does.
 *
 * It builds its DOM with the reader's builder, text only: everything here was
 * written by an agent or pasted from a ticket, and none of it can become markup.
 */
(function () {
  'use strict';

  // The verdicts, in the order the filter and the Overview list them: what needs fixing first.
  var VERDICTS = [['bug', 'Bug in the model'], ['data-config', 'Data or configuration'], ['as-designed', 'Works as designed'], ['cannot-tell', 'Cannot tell from the model']];
  var VERDICT = {};
  VERDICTS.forEach(function (v) { VERDICT[v[0]] = v[1]; });
  var KIND = { microflow: 'Microflow', nanoflow: 'Nanoflow', page: 'Page', entity: 'Entity', attribute: 'Attribute', association: 'Association', enumeration: 'Enumeration',
    security: 'Security', 'scheduled event': 'Scheduled event', integration: 'Integration', other: 'Other' };
  // A ticket pasted at more than this many characters or lines opens folded.
  var LONG_CHARS = 700, LONG_LINES = 10;

  // kit: what the reader hands over (docs-view.js drawTickets) —
  //   h, ln, list, main, setTitle, tools, copyLink, paragraphs, plural, flowRows, diagram,
  //   place (qualified name, kind → the patch that opens it, or null), project, tickets, changes,
  //   at (the id on screen, or null for the list).
  function draw(kit) {
    var h = kit.h, ln = kit.ln, tickets = kit.tickets;
    var t = null;
    tickets.forEach(function (x) { if (x.id === kit.at) t = x; });
    function badge(v) { return h('span', { class: 'dx-tk-v ' + v, text: VERDICT[v] || v }); }
    function cap(text) { return h('h3', { class: 'dx-cap', text: text }); }
    function sec(kids) { return h('section', { class: 'dx-ch-sub' }, kids); }
    function line(x) { return [x.date, x.confidence + ' confidence'].filter(Boolean).join(' · '); }

    kit.setTitle('Tickets', tickets.length === 1
      ? 'One ticket checked by an agent against the model: is it a bug, does it work as designed, is it the data, or can the model not tell.'
      : tickets.length + ' tickets checked by an agent against the model: is each a bug, does it work as designed, is it the data, or can the model not tell.');
    if (kit.copyLink) kit.tools(kit.copyLink());

    // ---- the list beside the page ----
    // A ticket's key is longer than a number, so it goes under the title rather than in the number's column.
    var rows = [h('div', { role: 'listitem' }, ln({ view: 'tickets', ticket: null }, { class: 'dx-pl-item dx-tk-item' + (t ? '' : ' on'), 'aria-current': t ? null : 'page' }, [
      h('span', { class: 'dx-pl-t' }, [h('b', { text: 'All tickets' }), h('small', { text: kit.plural(tickets.length, 'ticket', 'tickets') })])]))];
    tickets.forEach(function (x) {
      var on = x === t;
      rows.push(h('div', { role: 'listitem' }, ln({ view: 'tickets', ticket: x.id }, { class: 'dx-pl-item dx-tk-item' + (on ? ' on' : ''), 'aria-current': on ? 'page' : null }, [
        h('span', { class: 'dx-pl-t' }, [h('b', { text: x.title }), h('small', null, [h('code', { class: 'dx-tk-id', text: x.id }), ' ', badge(x.verdict)])])])));
    });
    kit.list.appendChild(h('div', { class: 'dx-pl', role: 'list' }, rows));

    var wrap = h('div', { class: 'dx-pd dx-ch dx-tk' });
    if (!t) {
      // ---- every ticket, one line each, filtered by verdict on the page itself ----
      wrap.appendChild(h('div', { class: 'dx-pd-head' }, [
        h('span', { class: 'dx-pd-eye', text: kit.project + ' · tickets' }),
        h('h2', { text: 'Tickets' }),
        h('p', { class: 'dx-pd-lead', text: 'What was reported on the application, each checked by an agent against the model: whether the model shows the fault, behaves as it was built to, depends on data or configuration the model cannot see, or cannot settle it.' })
      ]));
      var index = h('div', { class: 'dx-pd-rows dx-ch-index dx-tk-index' }, tickets.map(function (x) {
        return ln({ view: 'tickets', ticket: x.id }, { class: 'dx-ch-row dx-tk-row', 'data-verdict': x.verdict }, [
          h('span', { class: 'dx-ch-row-h' }, [h('code', { class: 'dx-tk-id', text: x.id }), h('b', { text: x.title }), badge(x.verdict)]),
          h('span', { class: 'dx-ch-row-s', text: x.summary }),
          h('small', { text: [line(x), x.change ? 'fix proposed' : null, x.needs.length ? kit.plural(x.needs.length, 'thing would settle it', 'things would settle it') : null].filter(Boolean).join(' · ') })
        ]);
      }));
      var chips = [], shown = null;
      function filter(v) {
        shown = v;
        chips.forEach(function (c) { var on = c.getAttribute('data-verdict') === (v || ''); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        Array.prototype.forEach.call(index.children, function (r) { r.hidden = !!shown && r.getAttribute('data-verdict') !== shown; });
      }
      [['', 'All', tickets.length]].concat(VERDICTS.map(function (v) { return [v[0], v[1], tickets.filter(function (x) { return x.verdict === v[0]; }).length]; })).forEach(function (v) {
        if (v[0] && !v[2]) return;
        var b = h('button', { type: 'button', class: 'dx-tk-chip' + (v[0] ? ' ' + v[0] : ''), 'data-verdict': v[0], 'aria-pressed': 'false' }, [v[1], h('span', { class: 'mono', text: ' ' + v[2] })]);
        b.addEventListener('click', function () { filter(v[0] || null); });
        chips.push(b);
      });
      wrap.appendChild(h('div', { class: 'dx-tk-chips', role: 'group', 'aria-label': 'Show tickets by verdict' }, chips));
      wrap.appendChild(index);
      filter(null);
    } else {
      // ---- one ticket ----
      var long = t.reported && (t.reported.length > LONG_CHARS || t.reported.split('\n').length > LONG_LINES);
      var quote = t.reported ? h('blockquote', { class: 'dx-ch-asked dx-tk-rep' }, [long ? null : h('span', { class: 'dx-cap', text: 'Reported' }), h('p', { text: t.reported })]) : null;
      wrap.appendChild(h('div', { class: 'dx-pd-head' }, [
        h('span', { class: 'dx-pd-eye' }, [h('code', { class: 'dx-tk-id', text: t.id }), t.source ? ' · ' + t.source : null, t.date ? ' · checked ' + t.date : null]),
        h('h2', { text: t.title }),
        long ? h('details', { class: 'dx-tk-fold' }, [h('summary', { text: 'The ticket as reported · ' + kit.plural(t.reported.split('\n').length, 'line', 'lines') }), quote]) : quote
      ]));

      // ---- the verdict, then why ----
      wrap.appendChild(h('section', { class: 'dx-tk-verdict ' + t.verdict }, [
        h('div', { class: 'dx-tk-vh' }, [badge(t.verdict), h('span', { class: 'dx-tk-conf ' + t.confidence, text: t.confidence + ' confidence' })]),
        h('p', { class: 'dx-ch-lead', text: t.summary })
      ]));
      if (t.story) wrap.appendChild(h('section', { class: 'dx-pd-sec' }, [cap('Why'), h('div', { class: 'dx-pd-story' }, kit.paragraphs(t.story).map(function (p) { return h('p', { text: p }); }))]));

      // ---- what the model does ----
      var tr = t.traced;
      if (tr.steps.length || tr.flows.length || tr.diagram.length) {
        wrap.appendChild(h('section', { class: 'dx-pd-sec dx-tk-traced' }, [cap('What the model does'),
          tr.steps.length ? h('ol', { class: 'dx-pd-steps dx-ch-steps' }, tr.steps.map(function (x, i) { return h('li', null, [h('span', { class: 'dx-pd-sn', text: String(i + 1) }), h('span', { text: x })]); })) : null,
          kit.diagram(tr.diagram, 'Diagram · as the model has it'),
          tr.flows.length ? sec([cap('Flows on its way · ' + tr.flows.length), kit.flowRows(tr.flows)]) : null]));
      }

      // ---- where the model shows it ----
      if (t.evidence.length) {
        wrap.appendChild(h('section', { class: 'dx-pd-sec dx-tk-evidence' }, [cap('Where the model shows it · ' + t.evidence.length),
          h('table', { class: 'dx-ch-table' }, [
            h('thead', null, h('tr', null, [h('th', { text: 'Kind' }), h('th', { text: 'Where' }), h('th', { text: 'What it shows' })])),
            h('tbody', null, t.evidence.map(function (x) {
              var where = kit.place(x.target, x.kind);
              return h('tr', null, [h('td', { class: 'dx-tk-kind', text: KIND[x.kind] || x.kind }),
                h('td', { class: 'dx-ch-target' }, where ? ln(where, { class: 'dx-code link' }, x.target) : h('code', { class: 'dx-code', text: x.target })),
                h('td', { text: x.what || '' })]);
            }))
          ])]));
      }

      // ---- what would settle it, the fix, the reply, the risks ----
      var fix = null;
      if (t.change) {
        var c = null;
        (kit.changes || []).forEach(function (x) { if (x.id === t.change) c = x; });
        fix = sec([cap('Proposed fix'), c
          ? ln({ view: 'changes', change: c.id }, { class: 'dx-ch-row dx-tk-change' }, [h('span', { class: 'dx-ch-row-h' }, [h('b', { text: c.title })]), c.proposal.summary ? h('span', { class: 'dx-ch-row-s', text: c.proposal.summary }) : null, h('small', { text: 'On the Changes page' })])
          : h('p', { class: 'dx-ch-data' }, ['The change ', h('code', { class: 'dx-code', text: t.change }), ' is not in this documentation.'])]);
      }
      var side = [
        t.needs.length ? sec([cap('What would settle it · ' + t.needs.length), h('ol', { class: 'dx-ch-open dx-tk-needs' }, t.needs.map(function (x) { return h('li', { text: x }); }))]) : null,
        fix,
        t.reply ? sec([cap('Suggested reply'), h('div', { class: 'dx-tk-reply' }, [h('p', { class: 'dx-tk-reply-t', text: t.reply }), copyButton(h, t.reply)])]) : null,
        t.risks.length ? sec([cap('Risks · ' + t.risks.length), h('div', { class: 'dx-pd-rows' }, t.risks.map(function (r) {
          return h('div', { class: 'dx-ch-risk' }, [h('span', { class: 'dx-lv ' + r.level.toLowerCase(), text: r.level }), h('div', null, [h('b', { text: r.title }),
            r.detail ? h('p', { text: r.detail }) : null, r.fix ? h('p', null, [h('b', { text: 'What to do. ' }), r.fix]) : null])]);
        }))]) : null
      ].filter(Boolean);
      if (side.length) wrap.appendChild(h('div', { class: 'dx-ch-more' }, side));
    }
    wrap.appendChild(h('p', { class: 'dx-prov' }, [h('span', { class: 'dx-ai', title: 'Written by an AI agent from this model, not read from it', text: '✦ AI' }),
      ' Checked by an agent against the model, which shows how the application is built — not what it did on a given day, nor the data it holds. Flow names come from the model; check the reasoning before you answer the ticket.']));
    kit.main.appendChild(wrap);
  }

  // Copies the reply to the clipboard and says so on the button; where the browser will not, it selects
  // the text instead, for Ctrl C. Nothing leaves the page.
  function copyButton(h, text) {
    var b = h('button', { type: 'button', class: 'mf-btn dx-tk-copy', text: 'Copy reply' });
    b.addEventListener('click', function () {
      function said() { b.textContent = 'Reply copied'; b.classList.add('done'); setTimeout(function () { b.textContent = 'Copy reply'; b.classList.remove('done'); }, 2000); }
      function select() {
        var p = b.parentNode && b.parentNode.querySelector('.dx-tk-reply-t'), sel = window.getSelection && window.getSelection();
        if (!p || !sel) return;
        var r = document.createRange(); r.selectNodeContents(p); sel.removeAllRanges(); sel.addRange(r);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(said, select); else select();
    });
    return b;
  }

  // The Tickets section of the Markdown copy (docs-view.js markdown), after Risks as in the menu.
  // md: the copy's own w (a line), esc, code, paras, table, raw, agent and plural.
  function markdown(tickets, md) {
    var w = md.w, esc = md.esc, code = md.code, paras = md.paras;
    w('## Tickets'); w();
    w(md.plural(tickets.length, 'ticket', 'tickets') + ' reported on the application, each checked by an agent against the model.'); w();
    md.table(['Ticket', 'Title', 'Verdict', 'Confidence', 'Checked'], tickets.map(function (t) { return [t.id, t.title, VERDICT[t.verdict], t.confidence, t.date || '']; }));
    tickets.forEach(function (t) {
      var tr = t.traced;
      w('### ' + esc(t.id) + ' · ' + esc(t.title)); w(); md.agent();
      w('**' + VERDICT[t.verdict] + '** · ' + t.confidence + ' confidence' + (t.date ? ' · checked ' + esc(t.date) : '') + (t.source ? ' · ' + esc(t.source) : '')); w();
      if (t.reported) { t.reported.split('\n').forEach(function (l) { w('> ' + esc(l)); }); w(); }
      paras(t.summary);
      if (t.story) { w('#### Why'); w(); paras(t.story); }
      if (tr.steps.length || tr.flows.length) {
        w('#### What the model does'); w();
        if (tr.steps.length) { tr.steps.forEach(function (x, j) { w((j + 1) + '. ' + esc(x)); }); w(); }
        if (tr.flows.length) { w('Flows: ' + tr.flows.map(code).join(', ')); w(); }
      }
      if (t.evidence.length) {
        w('#### Where the model shows it'); w();
        md.table(['Kind', 'Where', 'What it shows'], t.evidence.map(function (x) { return [x.kind, md.raw(code(x.target)), x.what || '']; }));
      }
      if (t.needs.length) { w('#### What would settle it'); w(); t.needs.forEach(function (x, j) { w((j + 1) + '. ' + esc(x)); }); w(); }
      if (t.change) { w('Proposed fix: the change ' + code(t.change) + ' (Changes).'); w(); }
      // The reply as it is to be pasted, unescaped, in a fence it cannot close.
      if (t.reply) { var fence = t.reply.indexOf('```') === -1 ? '```' : '~~~~'; w('#### Suggested reply'); w(); w(fence + 'text'); w(t.reply); w(fence); w(); }
      if (t.risks.length) { w('#### Risks'); w(); t.risks.forEach(function (r) { w('- ' + r.level + ' · ' + esc(r.title) + (r.detail ? ' — ' + esc(r.detail) : '') + (r.fix ? ' What to do: ' + esc(r.fix) : '')); }); w(); }
    });
  }

  // What Search everything finds of them (docs-view.js search): each ticket by its id and title, and its words.
  function search(tickets, name, text) {
    tickets.forEach(function (t) {
      var at = { view: 'tickets', ticket: t.id };
      name('Tickets', t.title, t.id + ' · ' + VERDICT[t.verdict].toLowerCase(), 'TK', at, t.id);
      text(t.id + ' · ' + t.title, 'ticket', [t.reported, t.summary, t.story].concat(t.evidence.map(function (x) { return x.target + ' ' + (x.what || ''); }), t.needs, [t.reply]).filter(Boolean).join(' '), at);
    });
  }

  window.MxDocsTickets = { draw: draw, markdown: markdown, search: search, VERDICTS: VERDICTS };
})();
