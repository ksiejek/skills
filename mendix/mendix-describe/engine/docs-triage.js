/* MxScout — the documentation's side of the risk triage (Developer tools).
 *
 * triage.js keeps what a person decided about a risk — fixed, a false
 * positive, reopened — and what MxScout concluded on an update (verified, no
 * longer reported), and hands the documentation its risks with that status
 * on them. This file is how the documentation reader (docs-view.js) shows it:
 * the status beside a risk, who raised it, what was decided and the history,
 * the filter by status and by whose a risk is, and the Markdown copy's list of
 * the risks that no longer count.
 *
 * Like docs-changes.js and docs-tickets.js, it is part of the reader in a file
 * of its own so the reader stays smaller. It has no references of
 * its own: the reader hands it what it draws with each time. The exported file
 * carries it beside the flow drawing (docs-file.js SCRIPTS), so the file shows
 * the same labels, read-only, as MxScout does.
 *
 * It builds its DOM with the reader's builder, text only: notes and names were
 * written by people and agents, and none of it can become markup.
 */
(function () {
  'use strict';

  // The labels go through the interface's language where the reader has one (MxScout's own screen, docs-i18n.js); the
  // exported file, MxScout Dev and the skill's engine have none and keep the English. The Markdown copy stays English.
  function lang() { return typeof window !== 'undefined' && window.MxDocsI18n && window.MxI18n ? window.MxDocsI18n : null; }
  function _(text, vars) { return lang() ? lang().t(text, vars) : vars ? String(text).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; }) : text; }
  function N_(text) { return text; } // translated where it is drawn (tools/i18n-check.js finds it)

  // Where a risk stands: only open, confirmed and reopened ones count as risks; the rest are kept on the Risks page
  // under their own filter, with what was decided.
  var RS = { open: N_('Open'), confirmed: N_('Confirmed'), reopened: N_('Reopened'), fixed: N_('Fixed — to verify'), verified: N_('Verified'), 'false-positive': N_('False positive'), accepted: N_('Accepted risk'), gone: N_('No longer reported') };
  var RS_GROUP = { open: 'open', confirmed: 'open', reopened: 'open', fixed: 'fixed', verified: 'verified', 'false-positive': 'fp', accepted: 'accepted', gone: 'gone' };
  var RS_FILTERS = [['open', N_('Open')], ['fixed', N_('Fixed — to verify')], ['verified', N_('Verified')], ['fp', N_('False positive')], ['accepted', N_('Accepted risk')], ['gone', N_('No longer reported')], ['all', N_('All')]];
  // A status (RS's key) and a filter (RS_FILTERS' row) as drawn: "Open" as a status has a key of its own, since the
  // dictionary's "Open" is the verb on a button.
  function label(st) { return st === 'open' && lang() && lang().local() ? _('Open (risk status)') : RS[st] ? _(RS[st]) : st; }
  function filterLabel(f) { return f[0] === 'open' ? label('open') : _(f[1]); }

  // One count of the risks for every screen and the exported file: Overview, the Documentation header, Risks, the Dashboard.
  // Counted are the risks that count after what was decided — data.ai.risks once triage.js apply ran: open, confirmed
  // and reopened. A false positive, an accepted risk, one fixed, verified or no longer reported is decided
  // (data.ai.triaged): kept on the Risks page under its own filter, counted nowhere. Each counted one is a finding
  // from the model (MxScout worked it out: origin 'model', or an id "mx-" from its security check), a risk a person
  // raised, or a risk from the agent. { agent, model, people, total, open, decided }; open is total.
  function fromModel(r) { return r.origin === 'model' || /^mx-/.test(r.id || ''); }
  function tally(ai) {
    var risks = (ai && ai.risks) || [], t = { agent: 0, model: 0, people: 0, total: risks.length, open: risks.length, decided: ((ai && ai.triaged) || []).length };
    risks.forEach(function (r) { if (fromModel(r)) t.model++; else if (r.origin === 'person') t.people++; else t.agent++; });
    return t;
  }
  // "25 findings: 9 from the agent, 16 from the model" in the interface's language; english: true for the Markdown copy.
  // split() is the part after the colon, for a tile that shows the total as its number.
  function split(t, english) {
    var tr = english ? function (x, v) { return String(x).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }); } : _;
    return t.people ? tr('{0} from the agent, {1} from the model, {2} raised by people', [t.agent, t.model, t.people]) : tr('{0} from the agent, {1} from the model', [t.agent, t.model]);
  }
  function tallyLabel(t, english) {
    var M = !english && lang() && window.MxI18n;
    var all = M ? M.plural(t.total, { en: ['{0} finding', '{0} findings'], pl: ['{0} znalezisko', '{0} znaleziska', '{0} znalezisk'], de: ['{0} Befund', '{0} Befunde'] }) : t.total + (t.total === 1 ? ' finding' : ' findings');
    return all + ': ' + split(t, english);
  }

  // A risk's status as a label beside it; nothing for an open one.
  function statusMark(h, st0) { return st0 && st0 !== 'open' ? h('span', { class: 'dx-rs dx-rs-' + st0, text: label(st0) }) : null; }

  // Who wrote a risk: an agent (the reader's ✦ AI mark), a person, in a comment, or MxScout from the model.
  function originMark(kit, r) {
    // MxScout's security check (secrisks.js, check-security.js) gives its risks ids beginning "mx-": its own, like the constants'.
    if (r.origin === 'model' || /^mx-/.test(r.id || '')) return kit.h('span', { class: 'dx-rk-by dx-rk-model', title: _('Worked out by MxScout from the model, the same on every load — not written by an AI agent'), text: _('found by MxScout') });
    return r.origin === 'person' ? kit.h('span', { class: 'dx-rk-by', title: r.raisedAt ? _('Raised by a person, in a comment on {0}', [kit.fmtDate(r.raisedAt)]) : _('Raised by a person, in a comment'),
      text: r.by ? _('raised by {0}', [r.by]) : _('raised by a person') }) : kit.aiMark();
  }

  // What was decided about a risk: the reason or note, who and when, and its history, newest first.
  // x: the Risks page's row ({ r: the risk, s: its status }).
  function block(kit, x) {
    var h = kit.h, r = x.r, hist = (r.history || []).slice().reverse();
    if (!r.note && !hist.length) return null;
    return h('section', { class: 'dx-rk-sec dx-rk-tri' }, [
      h('h3', { class: 'dx-cap', text: x.s === 'false-positive' ? _('Why it is not a risk') : x.s === 'accepted' ? _('Why the risk is accepted') : x.s === 'fixed' || x.s === 'verified' ? _('The fix') : _('Status') }),
      r.note ? h('p', { class: 'dx-rk-p', text: r.note }) : null,
      r.decidedAt ? h('p', { class: 'dx-rk-tri-who', text: label(x.s) + (r.decidedBy ? ' · ' + r.decidedBy : '') + ' · ' + kit.fmtDate(r.decidedAt) }) : null,
      hist.length ? h('details', { class: 'dx-rk-hist' }, [h('summary', { text: _('History · {0}', [hist.length]) }), h('ol', null, hist.map(function (e) {
        return h('li', null, [h('span', { class: 'mono', text: kit.fmtDate(e.at) }), h('span', { text: label(e.from) + ' → ' + label(e.to) + (e.by ? ' · ' + e.by : e.auto ? ' · ' + _('on an update') : '') + (e.note ? ' — ' + e.note : '') })]);
      }))]) : null
    ]);
  }

  // The status filter above the list: Open by default; fixed, verified, false positives, accepted risks and the
  // ones no longer reported each under their own, as history rather than risks. And whose: an agent's or a person's.
  // kit: h, everything (every row), inOrigin (row → whether the origin filter keeps it), rf (the page's
  // filters), setF (patch → applies it), shown (whether there is anything to filter), people, agents.
  function statusBar(kit) {
    var h = kit.h, rf = kit.rf, stCount = {};
    if (!kit.shown) return null;
    kit.everything.forEach(function (x) { if (kit.inOrigin(x)) { var g = RS_GROUP[x.s]; stCount[g] = (stCount[g] || 0) + 1; stCount.all = (stCount.all || 0) + 1; } });
    return h('div', { class: 'dx-rk-status', role: 'group', 'aria-label': _('Status') }, RS_FILTERS.filter(function (f) {
      return f[0] === 'open' || f[0] === 'all' || stCount[f[0]] || (rf.st || 'open') === f[0];
    }).map(function (f) {
      var on = (rf.st || 'open') === f[0];
      return h('button', { type: 'button', class: 'dx-rk-st' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () { kit.setF({ st: f[0] === 'open' ? null : f[0] }); } },
        [filterLabel(f), h('span', { class: 'dx-fc-n', text: String(stCount[f[0]] || 0) })]);
    }).concat(kit.people && kit.agents ? [h('span', { class: 'dx-rk-st-gap' })].concat([[null, _('Everyone')], ['ai', '✦ AI'], ['person', _('People')]].map(function (o) {
      var on = rf.or === o[0];
      return h('button', { type: 'button', class: 'dx-rk-st or' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', text: o[1], onclick: function () { kit.setF({ or: o[0] }); } });
    })) : []));
  }

  // The Markdown copy: the risks no longer counted, with what was decided about each, as history.
  // kit: w (writes a line), esc (Markdown-escapes text), counted (how many risks still count).
  function markdown(triaged, kit) {
    var w = kit.w, esc = kit.esc;
    if (!triaged.length) return;
    if (!kit.counted) { w('## Risks'); w(); w('No open risks.'); w(); }
    w('### Not counted as risks (' + triaged.length + ')'); w();
    w('Marked fixed or a false positive, or no longer reported by the agent.'); w();
    triaged.forEach(function (r) {
      var n = String(r.no || ''), id = 'R-' + (n.length < 3 ? ('00' + n).slice(-3) : n);
      w('- ' + id + ' · ' + r.level + ' · ' + esc(r.title) + ' — ' + (RS[r.status] || r.status) + (r.note ? ': ' + esc(r.note) : '') + (r.origin === 'person' ? ' (raised by ' + esc(r.by || 'a person') + ')' : r.origin === 'model' ? ' (found by MxScout in the model)' : ''));
    });
    w();
  }

  window.MxDocsTriage = { RS: RS, RS_GROUP: RS_GROUP, RS_FILTERS: RS_FILTERS, label: label, filterLabel: filterLabel, statusMark: statusMark, originMark: originMark, block: block, statusBar: statusBar, markdown: markdown, tally: tally, tallyLabel: tallyLabel, split: split, fromModel: fromModel };
})();
