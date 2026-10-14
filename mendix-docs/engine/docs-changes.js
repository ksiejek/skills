/* MxScout — documentation, the Changes page.
 *
 * A change is something the person wants made to the application, worked out
 * by an agent with the mendix-describe skill ("A change, when the person
 * asks"; Karol, 2026-10-14): what was asked, how that part of the application
 * works now, the solution it proposes, the concrete changes to the model, and
 * what they touch. It is a proposal. MxScout shows it; nothing of it is applied
 * to the model or anywhere else.
 *
 * The page is part of the documentation reader (docs-view.js), in a file of its
 * own so the reader stays readable — and so does its section of the Markdown
 * copy. It has no references of its own: the reader hands it what it draws and
 * writes with — its element builder, its links, the flow rows and the process
 * diagram; the Markdown copy's line writer and escapes — each time. The
 * exported file carries this file beside the flow drawing (docs-file.js
 * SCRIPTS), so the file draws the page, and writes its Markdown, exactly as
 * MxScout does.
 *
 * It builds its DOM with the reader's builder, text only: everything here was
 * written by an agent, and none of it can become markup.
 */
(function () {
  'use strict';

  var STATUS = { proposed: 'Proposed', accepted: 'Accepted', done: 'Done', dropped: 'Dropped' };
  // The model changes, grouped by what they change, in the order a developer works through them.
  var KINDS = [['entity', 'Entities'], ['attribute', 'Attributes'], ['association', 'Associations'], ['enumeration', 'Enumerations'],
    ['microflow', 'Microflows'], ['nanoflow', 'Nanoflows'], ['page', 'Pages'], ['security', 'Security'],
    ['scheduled event', 'Scheduled events'], ['integration', 'Integrations'], ['other', 'Other']];
  var ACTION = { add: 'Add', change: 'Change', remove: 'Remove' };

  // Where a qualified name a change names is in the documentation's data: the patch that opens it,
  // or null. An attribute or an association opens its entity. flowKey is the reader's.
  function placeOf(data, flowKey, qn, kind) {
    var seg = { microflow: 'mf', nanoflow: 'nf', page: 'pg' }[kind];
    var k = (seg || kind === 'other') ? flowKey(qn, seg) : null;
    if (k) return { view: 'refs', module: data.flows[k].module, seg: data.flows[k].kind, key: k };
    var parts = String(qn).split('.'), ent = parts.length === 3 ? parts[0] + '.' + parts[1] : qn;
    if (kind === 'attribute' && data.entities[ent] && !(data.entities[ent].attributes || []).some(function (a) { return a.name === parts[2]; })) return null;
    if ((kind === 'entity' || kind === 'attribute' || kind === 'other') && data.entities[ent]) return { view: 'domain', entity: ent, dmodule: data.entities[ent].module };
    var as = kind === 'association' ? (data.associations || []).filter(function (a) { return a.name === qn || a.module + '.' + a.name === qn; })[0] : null;
    return as && data.entities[as.from] ? { view: 'domain', entity: as.from, dmodule: data.entities[as.from].module } : null;
  }

  // kit: what the reader hands over (docs-view.js drawChanges) —
  //   h, ln, list, main, setTitle, tools, copyLink, paragraphs, plural, flowRows, diagram, data, flowKey,
  //   project, changes, at (the id on screen, or null for the list).
  function draw(kit) {
    var h = kit.h, ln = kit.ln, changes = kit.changes;
    function place(qn, kind) { return placeOf(kit.data, kit.flowKey, qn, kind); }
    var c = null;
    changes.forEach(function (x) { if (x.id === kit.at) c = x; });
    function badge(status) { return h('span', { class: 'dx-ch-st ' + status, text: STATUS[status] || status }); }
    function count(x) { return kit.plural(x.proposal.changes.length, 'model change', 'model changes'); }
    function cap(text) { return h('h3', { class: 'dx-cap', text: text }); }
    function story(text) { return kit.paragraphs(text).map(function (p) { return h('p', { text: p }); }); }
    function steps(list) {
      return list.length ? h('ol', { class: 'dx-pd-steps dx-ch-steps' }, list.map(function (x, i) { return h('li', null, [h('span', { class: 'dx-pd-sn', text: String(i + 1) }), h('span', { text: x })]); })) : null;
    }

    kit.setTitle('Changes', changes.length === 1
      ? 'One change asked for and worked out by an agent from the model: how it works now, and what it proposes. Nothing here is in the model.'
      : changes.length + ' changes asked for and worked out by an agent from the model: how each works now, and what it proposes. Nothing here is in the model.');
    if (kit.copyLink) kit.tools(kit.copyLink());

    // ---- the list beside the page ----
    var rows = [h('div', { role: 'listitem' }, ln({ view: 'changes', change: null }, { class: 'dx-pl-item' + (c ? '' : ' on'), 'aria-current': c ? null : 'page' }, [
      h('span', { class: 'dx-pl-n', text: '—' }), h('span', { class: 'dx-pl-t' }, [h('b', { text: 'All changes' }), h('small', { text: kit.plural(changes.length, 'change', 'changes') })])]))];
    changes.forEach(function (x, i) {
      var on = x === c;
      rows.push(h('div', { role: 'listitem' }, ln({ view: 'changes', change: x.id }, { class: 'dx-pl-item' + (on ? ' on' : ''), 'aria-current': on ? 'page' : null }, [
        h('span', { class: 'dx-pl-n', text: (i < 9 ? '0' : '') + (i + 1) }),
        h('span', { class: 'dx-pl-t' }, [h('b', { text: x.title }), h('small', null, [badge(x.status), ' ' + [x.date, count(x)].filter(Boolean).join(' · ')])])])));
    });
    kit.list.appendChild(h('div', { class: 'dx-pl', role: 'list' }, rows));

    var wrap = h('div', { class: 'dx-pd dx-ch' });
    if (!c) {
      // ---- every change, one line each ----
      wrap.appendChild(h('div', { class: 'dx-pd-head' }, [
        h('span', { class: 'dx-pd-eye', text: kit.project + ' · changes' }),
        h('h2', { text: 'Changes' }),
        h('p', { class: 'dx-pd-lead', text: 'What someone wants changed, as an agent worked it out from the model: how that part works now, the solution it proposes, and what it would change in the model.' })
      ]));
      wrap.appendChild(h('div', { class: 'dx-pd-rows dx-ch-index' }, changes.map(function (x) {
        return ln({ view: 'changes', change: x.id }, { class: 'dx-ch-row' }, [
          h('span', { class: 'dx-ch-row-h' }, [h('b', { text: x.title }), badge(x.status)]),
          x.proposal.summary || x.now.summary ? h('span', { class: 'dx-ch-row-s', text: x.proposal.summary || x.now.summary }) : null,
          h('small', { text: [x.date, count(x), x.risks.length ? kit.plural(x.risks.length, 'risk', 'risks') : null, x.open.length ? kit.plural(x.open.length, 'open question', 'open questions') : null].filter(Boolean).join(' · ') })
        ]);
      })));
    } else {
      // ---- one change ----
      var now = c.now, pr = c.proposal;
      wrap.appendChild(h('div', { class: 'dx-pd-head' }, [
        h('span', { class: 'dx-pd-eye' }, [badge(c.status), c.date ? ' ' + c.date : null]),
        h('h2', { text: c.title }),
        c.asked ? h('blockquote', { class: 'dx-ch-asked' }, [h('span', { class: 'dx-cap', text: 'Asked for' }), h('p', { text: '“' + c.asked + '”' })]) : null
      ]));
      var nowDiagram = kit.diagram(now.diagram, 'Diagram · now'), toBe = kit.diagram(pr.diagram, 'Diagram · proposed');
      wrap.appendChild(h('div', { class: 'dx-ch-cols' }, [
        h('section', { class: 'dx-ch-col now' }, [
          cap('How it works now'),
          now.summary ? h('p', { class: 'dx-ch-lead', text: now.summary }) : null,
          steps(now.steps),
          nowDiagram,
          now.story ? h('div', { class: 'dx-pd-story' }, story(now.story)) : null,
          now.flows.length ? h('section', { class: 'dx-ch-sub' }, [cap('Flows that carry it · ' + now.flows.length), kit.flowRows(now.flows)]) : null
        ]),
        h('section', { class: 'dx-ch-col proposal' }, [
          cap('Proposed solution'),
          pr.summary ? h('p', { class: 'dx-ch-lead', text: pr.summary }) : null,
          steps(pr.steps),
          toBe,
          pr.story ? h('div', { class: 'dx-pd-story' }, story(pr.story)) : null
        ])
      ]));

      // ---- what changes in the model, by kind ----
      if (pr.changes.length) {
        var groups = KINDS.map(function (k) { return [k[1], pr.changes.filter(function (x) { return x.kind === k[0]; })]; }).filter(function (g) { return g[1].length; });
        wrap.appendChild(h('section', { class: 'dx-pd-sec dx-ch-model' }, [cap('What changes in the model · ' + pr.changes.length),
          h('table', { class: 'dx-ch-table' }, [
            h('thead', null, h('tr', null, [h('th', { text: 'Action' }), h('th', { text: 'Target' }), h('th', { text: 'What' })])),
            groups.map(function (g) {
              return h('tbody', null, [h('tr', { class: 'dx-ch-kind' }, h('th', { colspan: '3', scope: 'colgroup' }, [g[0], h('span', { class: 'mono', text: ' ' + g[1].length })]))].concat(g[1].map(function (x) {
                var where = x.action === 'add' ? null : place(x.target, x.kind);
                return h('tr', null, [
                  h('td', null, h('span', { class: 'dx-ch-act ' + x.action, text: ACTION[x.action] })),
                  h('td', { class: 'dx-ch-target' }, [where ? ln(where, { class: 'dx-code link' }, x.target) : h('code', { class: 'dx-code', text: x.target }),
                    x.action === 'add' ? h('span', { class: 'dx-ch-new', text: 'new' }) : null]),
                  h('td', { text: x.what || '' })
                ]);
              })));
            })
          ])]));
      }

      // ---- what it touches, what could go wrong, what is not known ----
      var im = c.impact;
      var side = [
        im.flows.length || im.roles.length || im.data ? h('section', { class: 'dx-ch-sub' }, [cap('Impact'),
          im.flows.length ? kit.flowRows(im.flows) : null,
          im.roles.length ? h('div', { class: 'dx-ch-roles' }, [h('span', { text: 'Roles' })].concat(im.roles.map(function (r) { return h('span', { class: 'dx-ch-role', text: r }); }))) : null,
          im.data ? h('p', { class: 'dx-ch-data' }, [h('b', { text: 'Data. ' }), im.data]) : null]) : null,
        c.risks.length ? h('section', { class: 'dx-ch-sub' }, [cap('Risks · ' + c.risks.length), h('div', { class: 'dx-pd-rows' }, c.risks.map(function (r) {
          return h('div', { class: 'dx-ch-risk' }, [h('span', { class: 'dx-lv ' + r.level.toLowerCase(), text: r.level }), h('div', null, [h('b', { text: r.title }),
            r.detail ? h('p', { text: r.detail }) : null, r.fix ? h('p', null, [h('b', { text: 'What to do. ' }), r.fix]) : null])]);
        }))]) : null,
        c.open.length ? h('section', { class: 'dx-ch-sub' }, [cap('Open questions · ' + c.open.length), h('ol', { class: 'dx-ch-open' }, c.open.map(function (x) { return h('li', { text: x }); }))]) : null,
        c.effort ? h('section', { class: 'dx-ch-sub' }, [cap('Effort'), h('p', { class: 'dx-ch-data', text: c.effort })]) : null
      ].filter(Boolean);
      if (side.length) wrap.appendChild(h('div', { class: 'dx-ch-more' }, side));
    }
    wrap.appendChild(h('p', { class: 'dx-prov' }, [h('span', { class: 'dx-ai', title: 'Written by an AI agent from this model, not read from it', text: '✦ AI' }),
      ' Written by an agent from the model. A proposal: nothing of it has been changed in the model. Flow names come from the model; check the wording before you act on it.']));
    kit.main.appendChild(wrap);
  }

  // The Changes section of the Markdown copy (docs-view.js markdown), after Processes as in the menu.
  // md: the copy's own w (a line), esc, code, paras, table, raw, agent and plural.
  function markdown(changes, md) {
    var w = md.w, esc = md.esc, code = md.code, paras = md.paras;
    w('## Changes'); w();
    w(md.plural(changes.length, 'change', 'changes') + ' asked for and worked out by an agent from the model: how it works now, and what it proposes. None of it is in the model.'); w();
    changes.forEach(function (c) {
      var now = c.now, pr = c.proposal, im = c.impact;
      w('### ' + esc(c.title) + ' (' + c.status + (c.date ? ' · ' + esc(c.date) : '') + ')'); w(); md.agent();
      if (c.asked) { w('> ' + esc(c.asked).replace(/\s*\n\s*/g, ' ')); w(); }
      w('#### How it works now'); w();
      paras(now.summary);
      if (now.steps.length) { now.steps.forEach(function (x, j) { w((j + 1) + '. ' + esc(x)); }); w(); }
      paras(now.story);
      if (now.flows.length) { w('Flows: ' + now.flows.map(code).join(', ')); w(); }
      w('#### Proposed solution'); w();
      paras(pr.summary);
      if (pr.steps.length) { pr.steps.forEach(function (x, j) { w((j + 1) + '. ' + esc(x)); }); w(); }
      paras(pr.story);
      if (pr.changes.length) {
        w('#### What changes in the model'); w();
        md.table(['Action', 'Kind', 'Target', 'What'], pr.changes.map(function (x) { return [x.action, x.kind, md.raw(code(x.target)), x.what || '']; }));
      }
      if (im.flows.length || im.roles.length || im.data) {
        w('#### Impact'); w();
        if (im.flows.length) w('- Flows it touches: ' + im.flows.map(code).join(', '));
        if (im.roles.length) w('- Roles: ' + im.roles.map(esc).join(', '));
        if (im.data) w('- Data: ' + esc(im.data));
        w();
      }
      if (c.risks.length) { w('#### Risks'); w(); c.risks.forEach(function (r) { w('- ' + r.level + ' · ' + esc(r.title) + (r.detail ? ' — ' + esc(r.detail) : '') + (r.fix ? ' What to do: ' + esc(r.fix) : '')); }); w(); }
      if (c.open.length) { w('#### Open questions'); w(); c.open.forEach(function (x, j) { w((j + 1) + '. ' + esc(x)); }); w(); }
      if (c.effort) { w('Effort: ' + esc(c.effort)); w(); }
    });
  }

  window.MxDocsChanges = { draw: draw, markdown: markdown, place: placeOf, STATUS: STATUS, KINDS: KINDS };
})();
