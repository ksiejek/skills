/* MxScout — risk triage: the risks in the documentation as something to work through.
 *
 * Karol, 2026-10-14: "I get risks, I fix things, I update the model, it checks
 * whether they are still there." A risk an AI agent wrote (describe.js), or one a
 * person raised in a comment (comments.js, a comment marked as a risk), can be
 * marked a FALSE POSITIVE with the reason, or FIXED with a note; Reopen undoes
 * either. What was decided is kept per project, in this browser's database
 * (store.js, the `triage` store), apart from the descriptions: importing new
 * descriptions replaces them, and the decisions stay.
 *
 * When new descriptions come in (a file, the agent channel, the chat
 * assistant), they are reconciled against what was decided: a risk marked
 * fixed that the agent reports again is REOPENED; one a full file no longer
 * lists is VERIFIED; a false positive reported again stays a false positive,
 * and the history says it came back; an open risk a full file no longer lists
 * is marked GONE ("no longer reported"). A file that adds (one process) says
 * nothing about the risks it does not list, and a file without a risks list
 * touches no risk. Risks a person raised are theirs: an import leaves them as
 * they are, except where the agent answers for one marked fixed (`verify`).
 *
 * Only open and reopened risks count as risks — on the Risks page, in the
 * overview, beside a flow. The rest stay on the Risks page under their own
 * filter, with their reason and their history, and travel in the exported
 * documentation as labels (read-only there) and in the .mxscout package.
 * Each entry keeps a copy of the risk as it was last seen, so a risk the agent
 * no longer writes is still shown, with what was decided about it.
 *
 * A third kind of risk is worked out by MxScout from the model itself (origin 'model', constants.js:
 * a constant the browser receives that looks like a secret). Its key is fixed ('m:secrets:<name>'),
 * so a decision about it holds across loads of the model; descriptions coming in never touch it,
 * and one the model no longer has is shown as verified (marked fixed) or no longer reported.
 * The skill's check-security.js hands in the same checks (secrisks.js) as risks with ids 'mx-…', and,
 * in `verify`, those the model no longer shows: one marked fixed is VERIFIED ("not seen in the model"),
 * one still counted is no longer reported. A constant's risk from it is the one MxScout already shows.
 * One WITHDRAWN (`withdrawn: true`: MxScout's rules changed, the model did not) is never verified — one
 * marked fixed stays "Fixed — to verify", one still counted is no longer reported, each saying why.
 *
 * Every text here is set as text. Nothing is sent anywhere.
 */
(function () {
  'use strict';

  var app = null; // { el, store, render, setMessage, findings(projectId), author(), setCommentStatus(id, status) }
  // projectId -> the triage record ({ projectId, risks: { key: entry }, updatedAt }), null when there is
  // none, undefined while it loads.
  var recs = {};
  var dialog = null; // { projectId, risk, to, note, error, busy }

  var LABEL = { open: 'Open', confirmed: 'Confirmed', reopened: 'Reopened', fixed: 'Fixed — to verify', verified: 'Verified', 'false-positive': 'False positive', accepted: 'Accepted risk', gone: 'No longer reported' };
  // A person's decision that outlives a new report: not a risk, or a risk the team takes knowingly (MXS-27).
  var DECIDED = { 'false-positive': true, accepted: true };
  // Confirmed (MXS-62): a person looked and it holds — still a risk to fix, so it counts, and it stays confirmed
  // when it is reported again.
  var COUNTED = { open: true, confirmed: true, reopened: true };
  var HISTORY_MAX = 40;
  var KIND_TAG = { entity: 'en', microflow: 'mf', nanoflow: 'nf', page: 'pg' };

  function init(api) {
    app = api;
    // Another tab decided about a risk: read the record again rather than draw — and later save over — the old copy.
    if (app.store.onOtherTab) app.store.onOtherTab(function (name, projectId) { if (name === 'triage' && Object.prototype.hasOwnProperty.call(recs, projectId)) { forget(projectId); app.render(); } });
  }

  function now() { return new Date().toISOString(); }
  function clone(x) { return x ? JSON.parse(JSON.stringify(x)) : x; }
  function empty(projectId) { return { projectId: projectId, risks: {}, updatedAt: null }; }

  // ---------- storage ----------
  function load(projectId) {
    if (!projectId || Object.prototype.hasOwnProperty.call(recs, projectId)) return;
    recs[projectId] = undefined;
    app.store.get('triage', projectId).then(function (row) { recs[projectId] = row || null; app.render(); }, function () { recs[projectId] = null; });
  }
  // The record of a project: null when nothing was decided, undefined while it loads (a render follows).
  function recordFor(projectId) { load(projectId); return recs[projectId]; }
  // Read again from storage on the next draw (a package brought decisions in).
  function forget(projectId) { delete recs[projectId]; }
  // Every change is made on the record as the database holds it NOW — read, changed and written in one
  // transaction, with a revision number (store.update) — never on this tab's copy, which a second tab's save
  // makes stale (an external audit, 2026-10-15, B05). fn(current or null) → the record to keep, or undefined.
  function change(projectId, fn) {
    return app.store.update('triage', projectId, function (cur) {
      var rec = fn(cur || null);
      if (rec) rec.updatedAt = now();
      return rec || undefined;
    }).then(function (r) { recs[projectId] = r.value || null; return r.value; });
  }

  // ---------- identity ----------
  function riskKey(r) { return r.key || window.MxDescribe.riskKey(r); }
  // The id of one of MxScout's own security risks (secrisks.js: 'mx-…') an entry or a risk is known by —
  // the same whether it came in from the skill's check-security.js or was worked out here (a constant's
  // 'm:secrets:' key), so the two are one risk with one decision.
  function mxId(e) { return window.MxSecRisks && e ? window.MxSecRisks.idOf(e) : null; }
  function byMxId(E, id) {
    if (!id) return null;
    if (E['id:' + id]) return E['id:' + id];
    var hit = null;
    Object.keys(E).forEach(function (x) { if (!hit && E[x].origin !== 'person' && mxId(E[x]) === id) hit = E[x]; });
    return hit;
  }
  // An AI risk's entry: by its key, or by its level and title when the agent has since given it an id.
  function find(E, r) {
    var k = riskKey(r);
    if (E[k]) return E[k];
    if (r.origin === 'model') return byMxId(E, mxId({ key: r.key }));
    if (r.origin === 'person') return null;
    var same = r.id && /^mx-/.test(r.id) ? byMxId(E, r.id) : null;
    if (same) return same;
    var t = window.MxDescribe.titleKey(r), hit = null;
    Object.keys(E).forEach(function (x) { if (!hit && E[x].origin !== 'person' && E[x].tkey === t) hit = E[x]; });
    return hit;
  }
  function snapshot(r) {
    var o = { id: r.id || null, level: r.level, title: r.title, detail: r.detail || null, fix: r.fix || null, theme: r.theme || null, where: (r.where || []).slice(0, 40) };
    if (r.logic) o.logic = clone(r.logic);
    return o;
  }
  function entryFor(r, status) {
    var origin = r.origin === 'person' || r.origin === 'model' ? r.origin : 'ai';
    return { key: riskKey(r), tkey: origin === 'ai' ? window.MxDescribe.titleKey(r) : null, origin: origin,
      status: status || 'open', note: null, by: null, at: null, risk: snapshot(r), history: [] };
  }
  function log(e, item) {
    e.history.push(item);
    if (e.history.length > HISTORY_MAX) e.history = e.history.slice(-HISTORY_MAX);
  }
  // A change MxScout made itself, on an update.
  function move(e, to, note, when) {
    log(e, { at: when, by: null, from: e.status, to: to, note: note, auto: true });
    e.status = to; e.at = when;
  }

  // ---------- a comment that is a risk ----------
  // Its first line is the title; the rest, when there is more, its detail; what should change, its fix.
  function commentRisk(f) {
    if (!f || !/^P[123]$/.test(f.risk || '') || !f.target) return null;
    var text = String(f.problem || '').trim(), lines = text.split(/\n/);
    var title = lines[0].trim(), detail = lines.slice(1).join('\n').trim() || null;
    if (title.length > 200) { detail = text; title = title.slice(0, 199) + '…'; }
    var tag = KIND_TAG[f.target.kind];
    return {
      id: null, level: f.risk, title: title || '(no title)', detail: detail, fix: f.change || null, theme: null,
      where: [f.target.qualifiedName + (tag ? '|' + tag : '')],
      origin: 'person', by: f.author || 'you', raisedAt: f.createdAt || null, key: 'c:' + f.id, pid: 'c-' + f.id
    };
  }

  // ---------- every risk, with what was decided ----------
  // The agent's risks in the order of its file, then the risks people raised, then what is kept of
  // risks the agent no longer writes. Each a copy, with its status; `no` is its place, for its address.
  // from: { rec, findings } read from storage (docs.js repoDocs) — the record and the comments as they are kept,
  // not this tab's copies, which may still be loading or belong only to the open project.
  // modelRisks: the risks MxScout found in the model (data.modelRisks, constants.js, perfrisks.js) — undefined when
  // the caller does not have the model, and then the decisions about them are left out rather than guessed at.
  // modelUnchecked: { all, keys, prefixes } — what the model cannot say about them (constants.js unchecked: all = no
  // constant read; perfrisks.js unchecked: prefixes = a kind of finding not judged): such a risk is not gone, and keeps what was decided.
  function view(projectId, descValue, from, modelRisks, modelUnchecked) {
    load(projectId);
    var rec = (from ? from.rec : recs[projectId]) || null, E = rec ? rec.risks : {};
    var seen = {}, out = [];
    function put(r, e) {
      var k = e ? e.key : riskKey(r);
      if (seen[k]) return;
      seen[k] = true;
      if (e) seen[e.key] = true;
      var x = Object.assign({}, r, { key: k, origin: r.origin || 'ai', status: e ? e.status : 'open', note: e ? e.note : null, decidedBy: e ? e.by : null, decidedAt: e ? e.at : null, history: e ? e.history.slice() : [] });
      out.push(x);
    }
    // A risk the skill's security check wrote that MxScout works out from this model itself is shown once, as MxScout's.
    var live = {};
    (modelRisks || []).forEach(function (r) { var id = mxId({ key: r.key }); if (id) live[id] = true; });
    ((descValue && descValue.risks) || []).forEach(function (r) { if (r.id && live[r.id]) return; put(Object.assign({}, r, { origin: 'ai' }), find(E, Object.assign({}, r, { origin: 'ai' }))); });
    (modelRisks || []).forEach(function (r) { put(Object.assign({}, r, { origin: 'model' }), find(E, Object.assign({}, r, { origin: 'model' }))); });
    ((from ? from.findings : app.findings(projectId)) || []).forEach(function (f) { var r = commentRisk(f); if (r) put(r, E[r.key] || null); });
    Object.keys(E).map(function (k) { return E[k]; }).filter(function (e) { return e.origin !== 'person' && !seen[e.key] && (e.origin !== 'model' || modelRisks); })
      .sort(function (a, b) { return String(a.at || '').localeCompare(String(b.at || '')); })
      .forEach(function (e) {
        // A risk from the model that this model no longer has: what is decided follows from the model.
        // Unless the model cannot say: the constants not read, its value not judged — then nothing follows.
        var unread = e.origin === 'model' && modelUnchecked && ((modelUnchecked.all && /^m:secrets:/.test(e.key)) || (modelUnchecked.keys || {})[e.key] ||
          (modelUnchecked.prefixes || []).some(function (p) { return String(e.key).indexOf(p) === 0; }));
        if (e.origin === 'model' && !unread) e = Object.assign({}, e, { status: e.status === 'fixed' || e.status === 'verified' ? 'verified' : DECIDED[e.status] ? e.status : 'gone' });
        put(Object.assign({}, e.risk, { origin: e.origin === 'model' ? 'model' : 'ai', key: e.key }), e);
      });
    out.forEach(function (r, i) { r.no = i + 1; });
    return out;
  }
  function counted(r) { return !!COUNTED[r.status || 'open']; }

  // Onto the documentation's data (docs.js, after describe.js attach): the risks that count in
  // data.ai.risks, the rest in data.ai.triaged. With no descriptions but risks people raised, the
  // data gets an ai part of its own, which says no agent wrote anything (agent: false).
  function apply(data, projectId, descValue, from) {
    var rows = view(projectId, descValue, from, data.modelRisks || [], data.modelUnchecked || null);
    if (!data.ai) {
      if (!rows.length) return data;
      data.ai = { app: null, by: null, written: null, language: null, risks: [], context: null, c4: null, modules: {}, agent: false };
    }
    data.ai.risks = rows.filter(counted);
    data.ai.triaged = rows.filter(function (r) { return !counted(r); });
    return data;
  }
  // The risks that count, by the documents they name — for the Microflows screen (microflows.js).
  function riskIndex(projectId, descValue) { return window.MxDescribe.riskIndex({ risks: view(projectId, descValue).filter(counted) }); }

  // What the documentation is drawn from changes when this does: what was decided, and the comments marked as risks.
  function stamp(projectId) {
    var rec = recs[projectId];
    return String(rec ? rec.updatedAt : '') + '|' + (app.findings(projectId) || []).filter(function (f) { return f.risk; })
      .map(function (f) { return f.id + ':' + f.risk + ':' + f.updatedAt; }).join(',');
  }

  // ---------- reconciling with new descriptions ----------
  // incoming: the file as parsed (describe.js parse), before it is merged; previous: the descriptions
  // kept before it. Returns the new record and what happened; the record passed in is not changed.
  function reconcile(rec, incoming, previous, when, projectId) {
    rec = clone(rec) || empty(projectId);
    var E = rec.risks, sum = { reopened: 0, verified: 0, kept: 0, gone: 0, back: 0, people: 0 };
    var verified = {}; // keys verified by their own id in this file (ownVerify)
    var date = String(when).slice(0, 10);
    // What the agent says about risks people raised and marked fixed.
    (incoming.verify || []).forEach(function (v) {
      if (/^mx-/.test(v.id)) return mxVerify(v);
      if (!/^c-/.test(v.id)) return ownVerify(v);
      var e = E['c:' + v.id.slice(2)];
      if (!e || e.origin !== 'person' || e.status !== 'fixed') return;
      move(e, v.still ? 'reopened' : 'verified', (v.still ? 'the agent still finds it after the fix' : 'the agent no longer finds it') + (v.why ? ': ' + v.why : '') + ', ' + date, when);
      sum.people++;
    });
    // What MxScout's security check (the skill's check-security.js) says about one of its own risks the model no
    // longer shows: marked fixed, it is verified; still counted, it is no longer reported. Its id is the same on
    // every reading of the model, so its absence means the model no longer has it.
    function mxVerify(v) {
      var e = byMxId(E, v.id);
      if (!e) {
        var was = ((previous && previous.risks) || []).filter(function (r) { return r.id === v.id; })[0];
        if (!was || v.still) return;
        e = entryFor(Object.assign({}, was, { origin: 'ai' }), 'open');
        E[e.key] = e;
      }
      var why = (v.why || 'not seen in the model') + ', MxScout’s security check, ' + date;
      // Withdrawn by a change in the rules: the application did not change, so nothing about it is verified.
      if (v.withdrawn && !v.still) {
        if (e.status === 'open' || e.status === 'confirmed' || e.status === 'reopened') { move(e, 'gone', why + ' — not a fix', when); sum.gone++; }
        else log(e, { at: when, by: null, from: e.status, to: e.status, note: why + ' — kept as it was: not a fix', auto: true });
        return;
      }
      // Fixed through the skill (check-security.js --fixed, MXS-10): the change it made is said, and the risk is verified.
      if (v.fixed && !v.still && !DECIDED[e.status] && e.status !== 'verified') { move(e, 'verified', 'fixed: ' + v.fixed + ' — ' + why, when); sum.verified++; return; }
      if (v.still) { if (e.status === 'fixed' || e.status === 'verified') { move(e, 'reopened', 'still in the model after the fix: ' + why, when); sum.reopened++; } return; }
      if (e.status === 'fixed') { move(e, 'verified', why, when); sum.verified++; }
      else if (e.status === 'open' || e.status === 'confirmed' || e.status === 'reopened') { move(e, 'gone', why, when); sum.gone++; }
    }
    // What the agent found when it checked one of its own findings against the model, by its id (MXS-62: after
    // a commit, a logic finding is read again rather than left out). Not there any more: verified, whatever was
    // decided short of a false positive or an accepted risk; still there after a fix: reopened.
    function ownVerify(v) {
      var e = E['id:' + v.id];
      if (!e) {
        var was = ((previous && previous.risks) || []).filter(function (r) { return r.id === v.id; })[0];
        if (!was || v.still) return;
        e = entryFor(Object.assign({}, was, { origin: 'ai' }), 'open');
        E[e.key] = e;
      }
      if (e.origin !== 'ai') return;
      var why = (v.why || (v.still ? 'still in the model' : 'not seen in the model')) + ', checked against the model, ' + date;
      if (v.still) { if (e.status === 'fixed' || e.status === 'verified') { move(e, 'reopened', 'still in the model after the fix: ' + why, when); sum.reopened++; } return; }
      if (DECIDED[e.status]) { log(e, { at: when, by: null, from: e.status, to: e.status, note: 'fixed in the model: ' + why + ' — kept as it was', auto: true }); return; }
      if (e.status !== 'verified') { move(e, 'verified', why, when); sum.verified++; }
      verified[e.key] = true;
    }
    var listed = incoming.risksListed || (incoming.risks && incoming.risks.length);
    if (!listed) return { rec: rec, sum: sum };
    var keys = {}, tkeys = {};
    (incoming.risks || []).forEach(function (r0) {
      var r = Object.assign({}, r0, { origin: 'ai' });
      var k = riskKey(r), t = window.MxDescribe.titleKey(r);
      keys[k] = true; tkeys[t] = true;
      var e = find(E, r);
      // A risk MxScout works out from the model itself is decided by the model, not by descriptions coming in.
      if (!e || e.origin === 'model') return;
      // The agent gave it an id since: from now on it is known by that.
      if (e.key !== k) { delete E[e.key]; e.key = k; E[k] = e; }
      e.tkey = t; e.risk = snapshot(r);
      if (verified[e.key]) return;
      if (e.status === 'fixed' || e.status === 'verified') { move(e, 'reopened', 'still found after the fix, ' + date, when); sum.reopened++; }
      else if (e.status === 'gone') { move(e, 'open', 'reported again, ' + date, when); sum.back++; }
      else if (DECIDED[e.status]) { log(e, { at: when, by: null, from: e.status, to: e.status, note: 'reported again, kept as ' + (e.status === 'accepted' ? 'an accepted risk' : 'false positive') + ', ' + date, auto: true }); sum.kept++; }
    });
    var absent = function (k, t) { return !keys[k] && !(t && tkeys[t]); };
    if (!incoming.add) {
      Object.keys(E).forEach(function (k) {
        var e = E[k];
        if (e.origin === 'person' || e.origin === 'model' || !absent(e.key, e.tkey)) return;
        if (e.status === 'fixed') { move(e, 'verified', 'not found any more, ' + date, when); sum.verified++; }
        else if (e.status === 'open' || e.status === 'confirmed' || e.status === 'reopened') { move(e, 'gone', 'no longer reported, ' + date, when); sum.gone++; }
      });
      // An open risk nobody had touched, which the new file no longer lists: kept, as gone.
      ((previous && previous.risks) || []).forEach(function (r0) {
        var r = Object.assign({}, r0, { origin: 'ai' });
        if (!absent(riskKey(r), window.MxDescribe.titleKey(r)) || find(E, r)) return;
        var e = entryFor(r, 'open');
        move(e, 'gone', 'no longer reported, ' + date, when);
        E[e.key] = e; sum.gone++;
      });
    }
    return { rec: rec, sum: sum };
  }

  // After new descriptions were kept (docs.js): reconcile, save, and say what happened in a sentence.
  function afterImport(projectId, incoming, previous) {
    var s = null;
    return change(projectId, function (rec) {
      var r = reconcile(rec || null, incoming, previous, now(), projectId);
      s = r.sum;
      if (!s.reopened && !s.verified && !s.kept && !s.gone && !s.back && !s.people && !rec) return undefined;
      return r.rec;
    }).then(function (kept) {
      if (!kept) return '';
      return Promise.resolve().then(function () {
        var parts = [];
        if (s.verified) parts.push(s.verified + ' fixed ' + (s.verified === 1 ? 'risk' : 'risks') + ' verified');
        if (s.reopened) parts.push(s.reopened + ' reopened — still found after the fix');
        if (s.kept) parts.push(s.kept + (s.kept === 1 ? ' false positive or accepted risk' : ' false positives or accepted risks') + ' reported again, kept as such');
        if (s.gone) parts.push(s.gone + ' no longer reported');
        if (s.back) parts.push(s.back + ' reported again');
        if (s.people) parts.push(s.people + ' raised by people checked by the agent');
        return parts.length ? ' Risks: ' + parts.join(', ') + '.' : '';
      });
    });
  }

  // ---------- a person's decision ----------
  function set(projectId, risk, to, note) {
    var e = null;
    return change(projectId, function (cur) {
      var rec = clone(cur) || empty(projectId);
      e = find(rec.risks, risk);
      if (!e) { e = entryFor(risk, risk.status || 'open'); rec.risks[e.key] = e; }
      var when = now(), by = app.author() || null;
      log(e, { at: when, by: by, from: e.status, to: to, note: note || null });
      e.status = to; e.note = note || null; e.by = by; e.at = when;
      if (risk.origin !== 'person') e.risk = snapshot(risk);
      return rec;
    }).then(function () {
      // A comment that is a risk says the same on the Comments page.
      if (risk.origin === 'person' && app.setCommentStatus) app.setCommentStatus(String(risk.key).slice(2), DECIDED[to] ? 'wontfix' : to === 'fixed' || to === 'verified' ? 'fixed' : 'open');
      return e;
    });
  }

  // The risks MxScout found in the model, each with what was decided about it — for the card that lists
  // them (security.js), whose buttons are actions() below.
  function modelRows(projectId, risks) {
    var keys = {};
    (risks || []).forEach(function (r) { keys[r.key] = true; });
    return view(projectId, null, null, risks || []).filter(function (r) { return r.origin === 'model' && keys[r.key]; });
  }

  // The buttons on a risk (the Risks page's hook, docs-view.js opts.riskActions).
  function actions(projectId, risk) {
    var el = app.el;
    if (!projectId || !risk) return [];
    function open(to) { return function () { dialog = { projectId: projectId, risk: risk, to: to, note: '', error: null, busy: false }; app.render(); }; }
    if (counted(risk)) return [
      risk.status === 'confirmed' ? null : el('button', { type: 'button', class: 'btn btn-sm', text: 'Confirm…', title: 'You looked and it holds: it stays a risk to fix, marked confirmed', onclick: open('confirmed') }),
      el('button', { type: 'button', class: 'btn btn-sm', text: 'False positive…', title: 'Not a risk: say why, and it leaves the count', onclick: open('false-positive') }),
      el('button', { type: 'button', class: 'btn btn-sm', text: 'Accept risk…', title: 'A real risk the team takes knowingly: say why, and it leaves the count', onclick: open('accepted') }),
      el('button', { type: 'button', class: 'btn btn-sm btn-primary', text: 'Mark fixed…', title: 'You fixed it: the next update checks whether it is still there', onclick: open('fixed') })
    ].filter(Boolean);
    return [el('button', { type: 'button', class: 'btn btn-sm', text: 'Reopen', title: 'Count it as an open risk again', onclick: function () {
      set(projectId, risk, 'open', null).then(function () { app.setMessage('Risk reopened.', 'ok'); app.render(); }, function (err) { app.setMessage('Could not save: ' + ((err && err.message) || err), 'error'); app.render(); });
    } })];
  }

  // The dialog, one per decision: its title, what it says, the field, whether a reason is required, the button, the message.
  var DIALOG = {
    'false-positive': { title: 'Mark as a false positive', field: 'Reason', must: true, button: 'Mark false positive', placeholder: 'Why is this not a risk? (required)',
      missing: 'Say why it is not a risk — the reason is what the next reader and the agent go by.',
      text: 'It stops counting as a risk and stays on the Risks page under False positive, with your reason. The agent is told, and does not raise it again unless the model changes so the reason no longer holds.',
      done: function () { return 'Marked as a false positive. It no longer counts as a risk; it stays under False positive.'; } },
    accepted: { title: 'Accept the risk', field: 'Reason', must: true, button: 'Accept risk', placeholder: 'Why does the team take this risk? Who decided, until when? (required)',
      missing: 'Say why the risk is accepted — the reason is what the next reader and an auditor go by.',
      text: 'It is a real risk the team takes knowingly. It stops counting and stays on the Risks page under Accepted risk, with your reason; reported again, it stays accepted.',
      done: function () { return 'Accepted. It no longer counts as an open risk; it stays under Accepted risk.'; } },
    confirmed: { title: 'Confirm the finding', field: 'Note', must: false, button: 'Confirm', placeholder: 'What did you see that shows it? (optional)',
      text: 'You looked and it holds. It stays a risk to fix — it still counts — and shows as Confirmed; reported again, it stays confirmed.',
      done: function () { return 'Confirmed. It still counts as a risk to fix.'; } },
    fixed: { title: 'Mark as fixed', field: 'Note', must: false, button: 'Mark fixed', placeholder: 'What did you change? (optional)',
      text: 'It stops counting as a risk and waits under Fixed — to verify. When new descriptions come in, MxScout checks: still reported, it is reopened; gone, it is verified.',
      done: function (d) { return d.risk.origin === 'model' ? 'Marked fixed. It stays marked when the model is loaded again; once the model no longer has it, it shows as verified.' : 'Marked fixed. The next update of the descriptions checks whether it is still there.'; } }
  };
  function renderDialog() {
    if (!dialog) return null;
    var el = app.el, d = dialog, D = DIALOG[d.to] || DIALOG.fixed;
    var close = function () { if (d.busy) return; dialog = null; app.render(); };
    var area = el('textarea', { class: 'editor-area', rows: '5', placeholder: D.placeholder });
    area.value = d.note;
    area.addEventListener('input', function () { d.note = area.value; });
    function submit() {
      var note = String(d.note || '').trim();
      if (D.must && !note) { d.error = D.missing; app.render(); return; }
      d.busy = true; app.render();
      set(d.projectId, d.risk, d.to, note).then(function () {
        dialog = null;
        app.setMessage(D.done(d), 'ok');
        app.render();
      }, function (err) { d.busy = false; d.error = 'Could not save: ' + ((err && err.message) || err); app.render(); });
    }
    var backdrop = el('div', { class: 'modal-backdrop', onclick: function (e) { if (e.target === backdrop) close(); } }, [window.MxDialog.modal(el('div', { class: 'modal triage-modal' }, [
      el('h3', { text: D.title }),
      el('p', { class: 'triage-risk' }, [el('b', { text: d.risk.level + ' · ' }), document.createTextNode(d.risk.title)]),
      el('p', { text: D.text }),
      el('label', { class: 'field' }, [el('span', { text: D.field }), area]),
      d.error ? el('p', { class: 'warn-text', text: d.error }) : null,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', text: 'Cancel', onclick: close }),
        el('button', { class: 'btn btn-primary', text: d.busy ? 'Saving…' : D.button, disabled: d.busy ? 'disabled' : null, onclick: submit })
      ])
    ]), close)]);
    return backdrop;
  }

  // ---------- in a package ----------
  // A whitelist, like comments.js serialize: what leaves is named here. Without the comments, the
  // decisions about risks people raised in them stay behind too.
  function serialize(rec, withComments) {
    if (!rec || !rec.risks) return null;
    var out = {};
    Object.keys(rec.risks).forEach(function (k) {
      var e = rec.risks[k];
      if (e.origin === 'person' && !withComments) return;
      out[k] = { key: e.key, tkey: e.tkey || null, origin: e.origin, status: e.status, note: e.note || null, by: e.by || null, at: e.at || null, risk: e.risk,
        history: (e.history || []).map(function (h) { return { at: h.at, by: h.by || null, from: h.from, to: h.to, note: h.note || null, auto: !!h.auto }; }) };
    });
    return Object.keys(out).length ? { risks: out } : null;
  }
  // What a package brought, checked as an import checks a file: known statuses, bounded text.
  function str(v, max) { return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null; }
  function clean(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object' || !raw.risks || typeof raw.risks !== 'object') return out;
    Object.keys(raw.risks).slice(0, 5000).forEach(function (k) {
      var e = raw.risks[k], r = e && e.risk;
      if (!e || typeof e !== 'object' || !LABEL[e.status] || !r || !/^P[123]$/.test(r.level) || !str(r.title, 300) || typeof k !== 'string' || k.length > 400) return;
      out[k] = { key: k, tkey: str(e.tkey, 400), origin: e.origin === 'person' || e.origin === 'model' ? e.origin : 'ai', status: e.status, note: str(e.note, 2000), by: str(e.by, 200), at: str(e.at, 40),
        risk: { id: str(r.id, 80), level: r.level, title: str(r.title, 300), detail: str(r.detail, 3000), fix: str(r.fix, 1000), theme: str(r.theme, 20),
          logic: r.logic && typeof r.logic === 'object' && /^(not-built|wrong|missing)$/.test(r.logic.kind) ? { kind: r.logic.kind, rule: str(r.logic.rule, 12), source: str(r.logic.source, 200), expected: str(r.logic.expected, 2000) } : undefined,
          where: (Array.isArray(r.where) ? r.where : []).map(function (w) { return str(w, 300); }).filter(Boolean).slice(0, 40) },
        history: (Array.isArray(e.history) ? e.history : []).slice(-HISTORY_MAX).filter(function (h) { return h && LABEL[h.to] && LABEL[h.from]; })
          .map(function (h) { return { at: str(h.at, 40), by: str(h.by, 200), from: h.from, to: h.to, note: str(h.note, 2000), auto: !!h.auto }; }) };
    });
    return out;
  }
  // Into this browser: per risk, the copy decided last wins — a package travels both ways.
  function takeFromPackage(projectId, raw) {
    var incoming = clean(raw);
    if (!Object.keys(incoming).length) return Promise.resolve(0);
    var n = 0;
    return change(projectId, function (cur) {
      var rec = clone(cur) || empty(projectId);
      Object.keys(incoming).forEach(function (k) {
        var mine = rec.risks[k];
        if (!mine || String(incoming[k].at || '') > String(mine.at || '')) { rec.risks[k] = incoming[k]; n++; }
      });
      return n ? rec : undefined;
    }).then(function () { if (n) forget(projectId); return n; });
  }

  function remove(projectId) { recs[projectId] = null; }

  // Puts back a record as it was before an import reconciled it (docs.js Undo); null removes it.
  function restore(projectId, rec) {
    if (!projectId) return Promise.resolve();
    var done = rec ? app.store.put('triage', rec) : app.store.delete('triage', projectId);
    return done.then(function () { recs[projectId] = rec || null; });
  }
  window.MxTriage = {
    init: init, recordFor: recordFor, forget: forget, remove: remove, view: view, apply: apply, modelRows: modelRows, riskIndex: riskIndex, stamp: stamp,
    reconcile: reconcile, afterImport: afterImport, restore: restore, set: set, actions: actions, renderDialog: renderDialog,
    serialize: serialize, clean: clean, takeFromPackage: takeFromPackage, commentRisk: commentRisk, LABEL: LABEL
  };
})();
