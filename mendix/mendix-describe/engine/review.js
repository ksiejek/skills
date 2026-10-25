/* MxScout — what was reviewed, and at which version of the model.
 *
 * Karol, 2026-10-18: "odpalamy skill, on sprawdza, czy były zmiany, czy zrobić
 * dokumentację, sprawdzić security, sprawdza i odznacza: zrobione,
 * niezrobione". The mendix-describe skill keeps that in review.json — in
 * mxscout/ inside the Mendix project, committed and shared with the team, or
 * in the project's own folder when it is not kept in its Mendix project. The
 * skill's agent.js is the only one that writes it (`node agent.js review`);
 * MxScout reads it and shows it in Documentation, and never writes it.
 *
 *   { "format": "mxscout-review", "version": 1, "project": "…",
 *     "describedAt":       Version | null,   the descriptions were brought up to date at
 *     "securityCheckedAt": Version | null,   the security findings were reviewed at
 *     "security": { "risks": { "<mx-id>": "P1" | "P2" | "P3" } } | null,
 *                          what the security check found at securityCheckedAt —
 *                          ids and levels only, to tell what is new next time
 *     "items": [ { "id", "kind": "describe" | "security" | "verify", "title",
 *                  "status": "open" | "done" | "skipped", "by", "at", "note",
 *                  "version": Version, "risk"?: "<mx-id>" } ] }
 *   Version = { "commit", "short", "branch", "snapshot", "date" } — the commit the
 *   Mendix project's HEAD named, or (no readable git) the snapshot id of the model.
 *
 * look() compares the model as it is now with the last review: the versions
 * and the commits between them, the flows changed and new since they were
 * described (check-descriptions.js todo), and the security check's risks
 * against the ones reviewed — new, gone, and the ones marked fixed, either
 * confirmed (no longer in the model) or still in the model. propose() turns it
 * into open items; mark() ticks one off with the version it was done at.
 *
 * A pure file: no DOM, no state, nothing sent anywhere. The skill runs this
 * very file (engine/review.js, a byte copy).
 */
(function () {
  'use strict';

  var FORMAT = 'mxscout-review', VERSION = 1;
  var KINDS = ['describe', 'security', 'verify'], STATUS = ['open', 'done', 'skipped'];
  var CAP = { items: 400, title: 300, note: 1000, by: 120, id: 200, risks: 5000 };
  var HASH = /^[0-9a-f]{7,64}$/;
  var RISK = /^mx-[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function str(v, n) { return typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // A version as review.json keeps it, from a git stamp (modelversion.js, agent.js gitHead) and a snapshot id.
  function version(v, snapshot, date) {
    var commit = v && typeof v.commit === 'string' && HASH.test(v.commit) ? v.commit : null;
    var out = { commit: commit, short: commit ? str(v.short, 12) || commit.slice(0, 7) : null, branch: commit ? str(v.branch, 120) : null,
      snapshot: str(snapshot, 64), date: str(date, 40) || (v && str(v.date, 40)) || null };
    return out.commit || out.snapshot ? out : null;
  }
  function cleanVersion(v) { return v && typeof v === 'object' ? version(v, v.snapshot, v.date) : null; }
  function label(v) {
    if (!v) return 'an unknown version';
    if (v.commit) return (v.branch ? v.branch + ' @ ' : '') + (v.short || v.commit.slice(0, 7));
    return 'snapshot ' + v.snapshot;
  }
  function short(v) { return !v ? '?' : v.commit ? (v.short || v.commit.slice(0, 7)) : String(v.snapshot).slice(0, 12); }
  // The same model: the same commit when both name one, else the same snapshot.
  function same(a, b) {
    if (!a || !b) return false;
    if (a.commit && b.commit) return a.commit === b.commit;
    return !!a.snapshot && a.snapshot === b.snapshot;
  }

  function empty(project) {
    return { format: FORMAT, version: VERSION, project: str(project, 200), describedAt: null, securityCheckedAt: null, security: null, items: [] };
  }
  function cleanItem(x) {
    if (!x || typeof x !== 'object') return null;
    var id = str(x.id, CAP.id), title = str(x.title, CAP.title);
    if (!id || !title || KINDS.indexOf(x.kind) === -1) return null;
    var out = { id: id, kind: x.kind, title: title, status: STATUS.indexOf(x.status) !== -1 ? x.status : 'open',
      by: str(x.by, CAP.by), at: str(x.at, 40), note: str(x.note, CAP.note), version: cleanVersion(x.version) };
    if (typeof x.risk === 'string' && RISK.test(x.risk) && x.risk.length <= 80) out.risk = x.risk;
    return out;
  }
  // review.json, read and cut to what MxScout keeps: { value, error }.
  function clean(o) {
    if (!o || typeof o !== 'object' || o.format !== FORMAT) return { value: null, error: 'not a review file (its "format" should be "' + FORMAT + '")' };
    if (typeof o.version === 'number' && o.version > VERSION) return { value: null, error: 'written by a newer skill (version ' + o.version + ')' };
    var v = empty(o.project);
    v.describedAt = cleanVersion(o.describedAt);
    v.securityCheckedAt = cleanVersion(o.securityCheckedAt);
    if (o.security && typeof o.security === 'object' && o.security.risks && typeof o.security.risks === 'object') {
      var risks = {};
      Object.keys(o.security.risks).slice(0, CAP.risks).forEach(function (id) {
        if (RISK.test(id) && id.length <= 80 && /^P[123]$/.test(o.security.risks[id])) risks[id] = o.security.risks[id];
      });
      v.security = { risks: risks };
    }
    var seen = {};
    v.items = (Array.isArray(o.items) ? o.items : []).map(cleanItem).filter(function (x) {
      if (!x || seen[x.id]) return false;
      seen[x.id] = true;
      return true;
    }).slice(-CAP.items);
    return { value: v, error: null };
  }
  function parse(text) {
    var o;
    try { o = JSON.parse(String(text)); } catch (e) { return { value: null, error: /^[<=>]{7}/m.test(String(text)) ? 'it has a git conflict' : 'it is not valid JSON' }; }
    return clean(o);
  }
  function toText(review) { return JSON.stringify(review, null, 2) + '\n'; }

  // ---------- what changed since the last review ----------
  // opts: { review, now: Version, commits: number | null (between the last review and now, from git's reflog),
  //         todo: check-descriptions.js todo() result | null (no pack), described: true when there are descriptions,
  //         risks: [{ id, level, title }] (the security check now), status: { <mx-id>: triage status },
  //         withdrawn: { <mx-id>: why } — what the rules before gave on this model and these do not (secrisks.js);
  //         never "gone" from the model, never a fix confirmed;
  //         unchecked: { <mx-id>: why } — what this model cannot say either way (secrisks.js): left as it was }
  function look(opts) {
    var review = opts.review || empty(null), now = opts.now;
    var from = review.describedAt || review.securityCheckedAt;
    var risks = opts.risks || [], status = opts.status || {}, here = {};
    risks.forEach(function (r) { here[r.id] = r; });
    var before = review.security ? review.security.risks : null;
    var off = Object.assign({}, opts.withdrawn || {}), unk = opts.unchecked || {};
    Object.keys(unk).forEach(function (id) { off[id] = off[id] || unk[id]; });
    var sec = { first: !before || !review.securityCheckedAt, total: risks.length, levels: { P1: 0, P2: 0, P3: 0 }, fresh: [], gone: [], confirmed: [], still: [], withdrawn: [] };
    risks.forEach(function (r) { if (sec.levels[r.level] !== undefined) sec.levels[r.level]++; });
    if (before) {
      risks.forEach(function (r) { if (!(r.id in before)) sec.fresh.push(r); });
      Object.keys(before).sort().forEach(function (id) { if (!here[id] && !off[id] && status[id] !== 'fixed' && status[id] !== 'verified') sec.gone.push(id); });
    }
    sec.unchecked = [];
    Object.keys(off).sort().forEach(function (id) { if (!here[id] && ((before && id in before) || id in status)) (unk[id] && !(opts.withdrawn || {})[id] ? sec.unchecked : sec.withdrawn).push(id); });
    Object.keys(status).sort().forEach(function (id) {
      if (status[id] === 'fixed' && !here[id] && !off[id]) sec.confirmed.push(id);
      if ((status[id] === 'fixed' || status[id] === 'verified') && here[id]) sec.still.push(here[id]);
    });
    var t = opts.todo;
    var flows = t ? { changed: 0, fresh: 0 } : null;
    if (t) t.modules.forEach(function (m) { flows.changed += m.changed.length; flows.fresh += m.fresh.length; });
    return { from: from || null, now: now, commits: typeof opts.commits === 'number' ? opts.commits : null, described: !!opts.described, flows: flows,
      security: sec, securityAt: review.securityCheckedAt, sameAsDescribed: same(review.describedAt, now), sameAsChecked: same(review.securityCheckedAt, now) };
  }
  function securityWords(s) {
    var bits = [];
    ['P1', 'P2', 'P3'].forEach(function (lv) {
      var n = s.fresh.filter(function (r) { return r.level === lv; }).length;
      if (n) bits.push(n + ' new ' + lv);
    });
    if (s.gone.length) bits.push(s.gone.length + ' gone');
    if (s.confirmed.length) bits.push(s.confirmed.length + ' fixed confirmed');
    if (s.still.length) bits.push(s.still.length + ' fixed still in the model');
    if ((s.withdrawn || []).length) bits.push(s.withdrawn.length + ' withdrawn by a rule change (not fixed)');
    if ((s.unchecked || []).length) bits.push(s.unchecked.length + ' not checked this time (kept as they were)');
    return bits;
  }
  // One summary: "Model main @ a1b2c3d → f00ba12 (7 commits). 12 flows changed, 3 new. Security: 2 new P1, 1 fixed
  // confirmed, 1 fixed still in the model."
  function summary(l) {
    var out = [];
    if (!l.from) out.push('Model ' + label(l.now) + ' — no review yet.');
    else if (same(l.from, l.now)) out.push('Model ' + label(l.now) + ', the version last reviewed.');
    else out.push('Model ' + label(l.from) + ' → ' + (l.now && l.now.commit ? short(l.now) : label(l.now)) + (l.commits !== null ? ' (' + plural(l.commits, 'commit', 'commits') + ')' : '') + '.');
    if (!l.flows) out.push('Flows not compared — there is no pack of the model.');
    else if (!l.described) out.push('No descriptions yet: ' + plural(l.flows.fresh, 'flow', 'flows') + ' to describe.');
    else if (!l.flows.changed && !l.flows.fresh) out.push('No flow changed since it was described.');
    else out.push(plural(l.flows.changed, 'flow', 'flows') + ' changed, ' + l.flows.fresh + ' new.');
    var s = l.security, bits = securityWords(s);
    if (s.first) out.push('Security: not reviewed yet — ' + plural(s.total, 'risk', 'risks') + ' (' + s.levels.P1 + ' P1, ' + s.levels.P2 + ' P2, ' + s.levels.P3 + ' P3)' + (bits.length ? ', ' + bits.join(', ') : '') + '.');
    else out.push('Security: ' + (bits.length ? bits.join(', ') : 'nothing new since ' + label(l.securityAt)) + '.');
    return out.join(' ');
  }

  // ---------- the items ----------
  function proposals(l) {
    var at = short(l.now), out = [];
    var todo = l.flows ? l.flows.changed + l.flows.fresh : 0;
    if (todo) out.push({ id: 'describe@' + at, kind: 'describe', title: l.described ? 'Update the descriptions: ' + plural(l.flows.changed, 'flow', 'flows') + ' changed, ' + l.flows.fresh + ' new' : 'Describe the application: ' + plural(l.flows.fresh, 'flow', 'flows') });
    else if (l.flows && l.described && !l.sameAsDescribed) out.push({ id: 'describe@' + at, kind: 'describe', title: 'Confirm the descriptions at ' + label(l.now) + ': no flow changed since it was described' });
    var s = l.security, bits = securityWords({ fresh: s.fresh, gone: s.gone, confirmed: [], still: [], withdrawn: s.withdrawn || [], unchecked: s.unchecked || [] });
    if (s.first) out.push({ id: 'security@' + at, kind: 'security', title: 'Review the security findings: ' + plural(s.total, 'risk', 'risks') + ' (' + s.levels.P1 + ' P1, ' + s.levels.P2 + ' P2, ' + s.levels.P3 + ' P3)' });
    else if (bits.length) out.push({ id: 'security@' + at, kind: 'security', title: 'Review the new security findings: ' + bits.join(', ') });
    else if (!l.sameAsChecked) out.push({ id: 'security@' + at, kind: 'security', title: 'Confirm the security review at ' + label(l.now) + ': nothing new' });
    s.still.forEach(function (r) {
      out.push({ id: 'verify@' + at + '/' + r.id, kind: 'verify', risk: r.id, title: 'Check ' + r.id + ' — marked fixed, still in the model: ' + String(r.title || '').slice(0, 200) });
    });
    return out;
  }
  // The next review: the items proposed now open (one already done or skipped stays as it is), the open ones
  // no longer proposed dropped — the model moved on, and they were never acted on.
  function propose(review, l) {
    var next = clean(JSON.parse(JSON.stringify(review || empty(null)))).value || empty(null);
    var want = proposals(l), byId = {};
    next.items.forEach(function (x) { byId[x.id] = x; });
    var wanted = {};
    want.forEach(function (p) { wanted[p.id] = true; });
    next.items = next.items.filter(function (x) { return x.status !== 'open' || wanted[x.id]; });
    want.forEach(function (p) {
      var had = byId[p.id];
      if (had && had.status !== 'open') return;
      if (had) { had.title = p.title; return; }
      next.items.push(cleanItem(Object.assign({ status: 'open', version: l.now }, p)));
    });
    next.items = next.items.slice(-CAP.items);
    return next;
  }
  function openItems(review) { return ((review && review.items) || []).filter(function (x) { return x.status === 'open'; }); }
  // An item ticked off: ref is its id, or its number in the open list (1, 2, …). opts: { status: 'done' | 'skipped',
  // by, at, note, now: Version, risks: [{ id, level }] (for a security item: what the check found now) }.
  // → { review, item } or { error }.
  function mark(review, ref, opts) {
    var next = clean(JSON.parse(JSON.stringify(review || empty(null)))).value || empty(null);
    var open = openItems(next);
    var item = /^\d+$/.test(String(ref)) ? open[Number(ref) - 1] : next.items.filter(function (x) { return x.id === ref; })[0];
    if (!item) return { error: 'No item ' + ref + (open.length ? ' — the open ones: ' + open.map(function (x, i) { return (i + 1) + ' ' + x.id; }).join(', ') : ' — nothing is open; node agent.js review proposes what to do') + '.' };
    if (item.status !== 'open') return { error: 'Item ' + item.id + ' is ' + item.status + ' already (' + (item.at || '') + ').' };
    var status = opts.status === 'skipped' ? 'skipped' : 'done';
    if (status === 'skipped' && !str(opts.note, CAP.note)) return { error: 'Say why it is skipped: --note "…".' };
    item.status = status;
    item.by = str(opts.by, CAP.by);
    item.at = str(opts.at, 40);
    item.note = str(opts.note, CAP.note);
    item.version = opts.now || item.version;
    if (status === 'done' && item.kind === 'describe') next.describedAt = opts.now || null;
    if (status === 'done' && item.kind === 'security') {
      next.securityCheckedAt = opts.now || null;
      var risks = {};
      (opts.risks || []).forEach(function (r) { if (RISK.test(r.id) && /^P[123]$/.test(r.level)) risks[r.id] = r.level; });
      next.security = { risks: risks };
    }
    return { review: next, item: item };
  }

  window.MxReview = {
    FORMAT: FORMAT, VERSION: VERSION, CAP: CAP,
    empty: empty, parse: parse, clean: clean, toText: toText, version: version, label: label, short: short, same: same,
    look: look, summary: summary, proposals: proposals, propose: propose, openItems: openItems, mark: mark
  };
})();
