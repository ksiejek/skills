/* MxScout — the documentation's Security review page.
 *
 * A security department reads the report, not MxScout (Karol, 2026-10-18). What
 * MxScout concludes about security sits in several places — the Security
 * screen's cards, the Risks page, the access matrix — each in MxScout's own
 * order. This page says it once more, in the order such a department already
 * knows: the OWASP Top 10 Low-Code/No-Code Security Risks (LCNC-SEC-01 to
 * LCNC-SEC-10), every conclusion in one of three registers — FINDING, WORTH
 * KNOWING, NOT CHECKED — with Mendix's own code (MXS003–MXS010) where it has
 * one, where it is, what to do, and what was decided about it. And it says in
 * so many words what a review of the model cannot see. There is no score
 * anywhere: a number that grades an application reads as a verdict this page
 * cannot give.
 *
 * Its facts are secrisks.js's (MxSecRisks.of: one list of risks with fixed
 * ids, the same the mendix-describe skill's check-security.js gives), what was
 * decided about each (triage.js, through the documentation's own rows) and
 * the version the security review was ticked off at (review.json, review.js).
 * build() turns them into plain data (data.security) in MxScout, before the
 * export; draw() is the page, run by the reader (docs-view.js) in MxScout's
 * previews and in the exported file, which carries this file beside the
 * reader (docs-file.js SCRIPTS). The reader stays under 3,000 lines that way.
 *
 * Nothing here reaches anything: build() reads what it is handed, draw() builds
 * DOM with the reader's builder, text only — names and texts come from a
 * model, and none of it can become markup.
 */
(function () {
  'use strict';

  // The OWASP Low-Code/No-Code Top 10 (2022), and what each means in a Mendix model, in one line.
  var LCNC = [
    ['LCNC-SEC-01', 'Account Impersonation', 'Who can create an account or act for another one: sign-up without signing in, roles that manage accounts and passwords.'],
    ['LCNC-SEC-02', 'Authorization Misuse', 'Who may read, change, delete or run what: entity access, the anonymous role, flows that do not check what their page hides.'],
    ['LCNC-SEC-03', 'Data Leakage and Unexpected Consequences', 'Data a role can fetch that nothing it uses ever shows it.'],
    ['LCNC-SEC-04', 'Authentication and Secure Communication Failures', 'Ways in with no authentication in front of them, and demo accounts with weak passwords.'],
    ['LCNC-SEC-05', 'Security Misconfiguration', 'The project’s own security settings, and access rights that do not fit the flows that need them.'],
    ['LCNC-SEC-06', 'Injection Handling Failures', 'Input that reaches a query, a script or a call unchecked.'],
    ['LCNC-SEC-07', 'Vulnerable and Untrusted Components', 'The Mendix version and the Marketplace modules against published security advisories, and Marketplace modules installed and not used.'],
    ['LCNC-SEC-08', 'Data and Secret Handling Failures', 'Keys, passwords and tokens kept where the browser or anyone with the model can read them.'],
    ['LCNC-SEC-09', 'Asset Management Failures', 'Applications, environments and connections nobody keeps track of any more.'],
    ['LCNC-SEC-10', 'Security Logging and Monitoring Failures', 'Whether security events are logged, and whether anybody looks.']
  ];
  // Each of secrisks.js's checks (MxSecRisks.CHECKS), by the category it belongs to (its index in LCNC).
  var CHECK_CAT = {
    'selfreg': 0, 'accounts': 0,
    'anon': 1, 'role-manages-all': 1, 'market-admin': 1, 'market-role-unused': 1, 'guard-page-hides': 1, 'guard-bypass-xpath': 1, 'guard-same-entity': 1,
    'scope-write': 1, 'scope-delete': 1, 'scope-note': 1, 'access-unused': 1, 'access-unwritten': 1, 'access-past': 1, 'access-rule': 1,
    'access-wider': 2,
    'demo-password': 3, 'service-open': 3,
    'security-level': 4, 'strict-mode-off': 4, 'page-url-check': 4, 'role-no-module-role': 4, 'access-fails': 4, 'access-finds-nothing': 4,
    'advisory': 6, 'market-unused': 6,
    'secret-constant': 7, 'constant-note': 7
  };
  // The categories no check of MxScout's reaches, said as NOT CHECKED rather than left empty: an empty
  // category would read as "nothing wrong here".
  var NO_CHECK = {
    5: 'No check of this review reaches it. The model does not show how a Java action, a JavaScript action or a database query uses what a user types.',
    8: 'No check of this review reaches it. Which applications, environments and connections exist, and which are still used, is not in one model. Elements nothing in the model reaches are on Model quality.',
    9: 'No check of this review reaches it. What is logged, at which level, and who watches it is set in the environment and the log configuration, not in the model.'
  };
  // What a review of the model cannot see, written out (the About page says the same of MxScout).
  var OUTSIDE = [
    ['The environments', 'Each environment’s own settings: the constants’ values there, which scheduled events run, who can reach the deployment, and whether it restricts the documentation paths Mendix serves (/rest-doc/, /odata-doc/, /ws-doc/). They are set on the environment, not in the model.'],
    ['The running application', 'Which accounts, roles and data exist in its database — demo users created earlier among them — and how it behaves under a real request. This is a review of the model, not a test of the running application.'],
    ['Code outside the model', 'The code of Java actions, JavaScript actions and widgets, and of Marketplace modules beyond their model. A flow that calls one is followed up to the call.'],
    ['Logs and monitoring', 'What the application logs, at which level, and whether anybody reads it.'],
    ['The network and sign-in', 'Certificates, headers, firewalls, and what an identity provider decides for single sign-on.']
  ];
  var REG = { finding: 'Finding', note: 'Worth knowing', unchecked: 'Not checked' };
  var REG_ORDER = ['finding', 'note', 'unchecked'];
  var STATUS = { open: 'Open', reopened: 'Reopened', fixed: 'Fixed — to verify', verified: 'Verified', 'false-positive': 'False positive', gone: 'No longer reported' };

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function codeOf(text) { var m = /^(MXS\d{3})\b/.exec(str(text)); return m ? m[1] : null; }
  // The check an mx- id was made by: the longest check id it starts with.
  function checkOf(id, checks) {
    var best = null;
    Object.keys(checks || CHECK_CAT).forEach(function (k) { if ((id === 'mx-' + k || id.indexOf('mx-' + k + '-') === 0) && (!best || k.length > best.length)) best = k; });
    return best;
  }
  function catOf(check) { return CHECK_CAT[check] !== undefined ? CHECK_CAT[check] : 4; }

  // ---------- the data (MxScout, before the page is drawn or exported) ----------
  // res: MxSecRisks.of(model); rows: the documentation's risks with what was decided (data.ai.risks and
  // data.ai.triaged, triage.js); idOf: MxSecRisks.idOf; review: review.json's value (review.js) or null;
  // RV: MxReview; now: the model's version (data.version). → plain data, carried in the exported file.
  function build(res, rows, idOf, review, RV, now, checks) {
    var decided = {};
    (rows || []).forEach(function (r) {
      var id = r && typeof r.id === 'string' && /^mx-/.test(r.id) ? r.id : idOf ? idOf({ key: r.key, risk: { id: r.id } }) : null;
      if (id && !decided[id]) decided[id] = { status: r.status || 'open', note: r.note || null, by: r.decidedBy || null, at: r.decidedAt || null, level: r.level, title: r.title };
    });
    var seen = {};
    var items = (res.risks || []).map(function (r) {
      seen[r.id] = true;
      var d = decided[r.id] || {}, t = str(r.title).replace(/^Worth knowing: /, ''), step = r.recipe && r.recipe.steps && r.recipe.steps[0];
      // A setting has no document to name: where it is, is where Studio Pro changes it (the recipe's first step, secrisks.js).
      return { id: r.id, check: r.check, cat: catOf(r.check), register: r.register === 'finding' ? 'finding' : 'note', level: r.level,
        code: codeOf(t), title: t.replace(/^MXS\d{3} · /, ''), detail: r.detail || null, fix: r.fix || null, where: (r.where || []).slice(),
        place: !(r.where || []).length && step && step.in ? str(step.in) : null, status: d.status || 'open', note: d.note || null, by: d.by || null, at: d.at || null };
    });
    (res.notChecked || []).forEach(function (n) {
      items.push({ id: null, check: n.check, cat: catOf(n.check), register: 'unchecked', level: null, code: codeOf(n.text), title: str(n.text).replace(/^MXS\d{3} · /, ''),
        detail: null, fix: null, where: (n.where || []).slice(), status: null });
    });
    // Decided about, and no longer in the model: what was fixed, said once at the end.
    var resolved = Object.keys(decided).filter(function (id) { return !seen[id] && /^(fixed|verified|gone)$/.test(decided[id].status); }).sort().map(function (id) {
      var d = decided[id], check = checkOf(id, checks);
      return { id: id, cat: catOf(check), level: d.level || null, title: str(d.title).replace(/^Worth knowing: /, ''), status: d.status === 'fixed' ? 'verified' : d.status, note: d.note, by: d.by, at: d.at };
    });
    var rv = null;
    if (review && RV) {
      var s = review.securityCheckedAt, at = null;
      (review.items || []).forEach(function (x) { if (x.kind === 'security' && x.status === 'done' && x.at && (!s || !x.version || RV.same(x.version, s)) && (!at || x.at > at)) at = x.at; });
      var nowV = RV.version(now || null, null, null);
      rv = { security: s ? RV.label(s) : null, at: at || (s && s.date) || null, described: review.describedAt ? RV.label(review.describedAt) : null,
        behind: !!(s && nowV && nowV.commit && s.commit && !RV.same(s, nowV)) };
    }
    var counts = { finding: 0, note: 0, unchecked: 0 };
    items.forEach(function (x) { counts[x.register]++; });
    return { items: items, resolved: resolved, counts: counts, review: rv };
  }

  // ---------- the page ----------
  // kit: h, ln, main, setTitle, plural, data, sec (data.security), st (the reader's state: st.sub a category),
  // flowKey (qn → the reader's key of a flow or page, or null), modelRead, fmtDate.
  function draw(kit) {
    var h = kit.h, ln = kit.ln, sec = kit.sec, data = kit.data, plural = kit.plural, c = sec.counts;
    kit.setTitle('Security review', plural(c.finding, 'finding', 'findings') + ', ' + c.note + ' worth knowing, ' + c.unchecked + ' not checked — under the OWASP Low-Code/No-Code Top 10. Nothing is graded: what was found, where, and what to do.');
    var by = LCNC.map(function () { return { finding: [], note: [], unchecked: [] }; });
    sec.items.forEach(function (x) { by[x.cat][x.register].push(x); });
    by.forEach(function (b) { b.finding.sort(function (a, z) { return str(a.level).localeCompare(str(z.level)); }); });

    function where(list, place) {
      if (!list.length) return place ? h('div', { class: 'dx-sr-where' }, [h('span', { class: 'dx-sr-k', text: 'Where' }), h('span', { class: 'dx-sr-place', text: place })]) : null;
      function one(qn) {
        var key = kit.flowKey(qn), dot = qn.indexOf('.');
        var kids = [h('span', { class: 'dx-mod', text: dot > 0 ? qn.slice(0, dot + 1) : '' }), dot > 0 ? qn.slice(dot + 1) : qn];
        if (key) return ln({ view: 'refs', module: data.flows[key].module, seg: data.flows[key].kind, key: key }, { class: 'dx-sr-qn mono' }, kids);
        if (data.entities && data.entities[qn]) return ln({ view: 'domain', entity: qn }, { class: 'dx-sr-qn mono' }, kids);
        return h('span', { class: 'dx-sr-qn mono' }, kids);
      }
      var first = list.slice(0, 6).map(one), rest = list.slice(6);
      return h('div', { class: 'dx-sr-where' }, [h('span', { class: 'dx-sr-k', text: 'Where' }), h('span', { class: 'dx-sr-qns' }, first.concat(rest.length
        ? [h('details', { class: 'dx-sr-more' }, [h('summary', { text: 'and ' + rest.length + ' more' }), h('span', { class: 'dx-sr-qns' }, rest.map(one))])] : []))]);
    }
    function item(x) {
      var lv = x.level ? x.level.toLowerCase() : 'none';
      return h('li', { class: 'dx-sr-item', 'data-register': x.register, 'data-level': x.level || '', 'data-status': x.status || '', 'data-id': x.id || '', 'data-code': x.code || '' }, [
        h('div', { class: 'dx-sr-head' }, [
          x.level ? h('span', { class: 'dx-lv ' + lv, text: x.level }) : null,
          h('span', { class: 'dx-sr-reg dx-sr-reg-' + x.register, text: REG[x.register].toUpperCase() }),
          x.code ? h('span', { class: 'dx-kind dx-sr-code', title: 'Mendix’s own code for this recommendation', text: x.code }) : null,
          h('span', { class: 'dx-sr-title', text: x.title }),
          x.status ? h('span', { class: 'dx-rs dx-rs-' + x.status + ' dx-sr-status', text: STATUS[x.status] || x.status }) : null
        ]),
        where(x.where, x.place),
        x.fix ? h('div', { class: 'dx-sr-fix' }, [h('span', { class: 'dx-sr-k', text: 'What to do' }), h('span', { text: x.fix })]) : null,
        x.note || x.at ? h('div', { class: 'dx-sr-dec' }, [h('span', { class: 'dx-sr-k', text: 'Decided' }),
          h('span', { text: [STATUS[x.status], x.by, x.at ? kit.fmtDate(x.at) : null].filter(Boolean).join(' · ') + (x.note ? ' — ' + x.note : '') })]) : null,
        x.detail ? h('details', { class: 'dx-sr-detail' }, [h('summary', { text: 'What happens' }), h('p', { text: x.detail })]) : null
      ]);
    }

    var rv = sec.review, v = data.version, ver = v && v.short ? [(v.branch ? v.branch + ' @ ' : '') + v.short, v.date ? String(v.date).slice(0, 10) : null].filter(Boolean).join(' · ') : null;
    var prov = [
      'Read from the model' + (ver ? ' at version ' + ver : '') + ', ' + kit.modelRead(data, true) + '.',
      rv && rv.security ? 'Security last reviewed at version ' + rv.security + (rv.at ? ' on ' + kit.fmtDate(rv.at) : '') + (rv.behind ? ' — an earlier version than this model.' : '.')
        : rv ? 'No security review is ticked off in review.json yet' + (rv.described ? ' (the descriptions were reviewed at ' + rv.described + ').' : '.')
        : 'No security review is recorded for this model (review.json).'
    ];
    var page = h('div', { class: 'dx-sr' }, [
      h('section', { class: 'dx-sr-intro' }, [
        h('p', { class: 'dx-sr-lead', text: 'Every security conclusion drawn from this model, arranged by the OWASP Top 10 Low-Code/No-Code Security Risks. Each is a finding, worth knowing, or not checked — said as such, never graded or added up.' }),
        h('p', { class: 'dx-prov dx-sr-version', text: prov.join(' ') }),
        h('p', { class: 'dx-prov', text: 'Worked out from the model by fixed checks, the same on every read — not written by an AI agent. Mendix’s own codes (MXS003–MXS010) are given where Mendix has one. The status is what the team decided about each.' })
      ]),
      h('div', { class: 'dx-sr-regs' }, REG_ORDER.map(function (k) {
        return h('div', { class: 'dx-sr-regbox', 'data-register': k }, [h('span', { class: 'dx-sr-reg dx-sr-reg-' + k, text: REG[k].toUpperCase() }), h('b', { class: 'mono', text: String(c[k]) }),
          h('small', { text: k === 'finding' ? 'to act on, P1 first' : k === 'note' ? 'to know about; act if it matters here' : 'the model does not carry what the check needs' })]);
      })),
      h('section', { class: 'dx-sr-map' }, [
        h('h3', { class: 'dx-cap', text: 'The map · OWASP LCNC Top 10' }),
        h('table', { class: 'dx-sr-table' }, [
          h('thead', null, [h('tr', null, ['Category', '', 'Findings', 'Worth knowing', 'Not checked'].map(function (t) { return h('th', { text: t }); }))]),
          h('tbody', null, LCNC.map(function (L, i) {
            var b = by[i], none = NO_CHECK[i] !== undefined;
            return h('tr', { 'data-cat': L[0], 'data-findings': String(b.finding.length) }, [
              h('td', { class: 'mono' }, [ln({ view: 'security', sub: L[0] }, { class: 'dx-sr-catlink' }, [L[0]])]),
              h('td', { text: L[1] }),
              h('td', { class: 'mono', text: String(b.finding.length) }),
              h('td', { class: 'mono', text: String(b.note.length) }),
              h('td', { class: 'mono', text: none ? 'whole category' : String(b.unchecked.length) })
            ]);
          }))
        ])
      ])
    ]);
    LCNC.forEach(function (L, i) {
      var b = by[i], n = b.finding.length + b.note.length + b.unchecked.length;
      page.appendChild(h('section', { class: 'dx-sr-cat', id: 'sr-' + L[0], 'data-cat': L[0] }, [
        h('h2', { class: 'dx-sr-cat-h' }, [h('span', { class: 'mono', text: L[0] }), ' ', L[1]]),
        h('p', { class: 'dx-sr-cat-p', text: L[2] }),
        NO_CHECK[i] !== undefined ? h('ul', { class: 'dx-sr-items' }, [item({ id: null, register: 'unchecked', level: null, code: null, title: NO_CHECK[i], where: [], status: null })]) : null,
        n ? h('ul', { class: 'dx-sr-items' }, REG_ORDER.reduce(function (acc, k) { return acc.concat(b[k].map(item)); }, [])) : NO_CHECK[i] === undefined ? h('p', { class: 'dx-empty', text: 'Nothing found by the checks in this category.' }) : null
      ]));
    });
    if (sec.resolved.length) page.appendChild(h('section', { class: 'dx-sr-cat dx-sr-resolved' }, [
      h('h2', { class: 'dx-sr-cat-h', text: 'Fixed, and no longer in the model' }),
      h('ul', { class: 'dx-sr-items' }, sec.resolved.map(function (x) {
        return h('li', { class: 'dx-sr-item', 'data-status': x.status, 'data-id': x.id }, [h('div', { class: 'dx-sr-head' }, [
          x.level ? h('span', { class: 'dx-lv ' + x.level.toLowerCase(), text: x.level }) : null,
          h('span', { class: 'mono dx-sr-code', text: LCNC[x.cat][0] }), h('span', { class: 'dx-sr-title', text: x.title || x.id }),
          h('span', { class: 'dx-rs dx-rs-' + x.status + ' dx-sr-status', text: STATUS[x.status] || x.status })]),
          x.note || x.at ? h('div', { class: 'dx-sr-dec' }, [h('span', { class: 'dx-sr-k', text: 'Decided' }), h('span', { text: [x.by, x.at ? kit.fmtDate(x.at) : null].filter(Boolean).join(' · ') + (x.note ? ' — ' + x.note : '') })]) : null]);
      }))
    ]));
    page.appendChild(h('section', { class: 'dx-sr-cat dx-sr-outside' }, [
      h('h2', { class: 'dx-sr-cat-h', text: 'What this review does not check' }),
      h('p', { class: 'dx-sr-cat-p', text: 'This review reads the Mendix model and nothing else. What follows is outside the model, so outside this review — however the categories above read.' }),
      h('dl', { class: 'dx-sr-out' }, OUTSIDE.reduce(function (acc, o) { return acc.concat([h('dt', { text: o[0] }), h('dd', { text: o[1] })]); }, []))
    ]));
    kit.main.appendChild(page);
    // An address with a category (#/security/LCNC-SEC-02) opens the page at it.
    if (kit.st.sub) { var at = page.querySelector('[data-cat="' + String(kit.st.sub).replace(/[^A-Z0-9-]/g, '') + '"].dx-sr-cat'); if (at && at.scrollIntoView) setTimeout(function () { at.scrollIntoView({ block: 'start' }); }, 0); }
  }

  window.MxDocsSecurity = { LCNC: LCNC, CHECK_CAT: CHECK_CAT, NO_CHECK: NO_CHECK, OUTSIDE: OUTSIDE, REG: REG, build: build, draw: draw, checkOf: checkOf, codeOf: codeOf };
})();
