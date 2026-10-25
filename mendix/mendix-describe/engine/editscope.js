/* MxScout — written wider than edited: a write or delete right the access
 * rule gives in every state of the object, while every place the role uses
 * it does so only in some.
 *
 * Karol, 2026-10-18: "sometimes we need write, because we create or work in
 * nanoflows, but the object is in a state where we should not — and we
 * still have the right on the database, and it can be changed from the
 * client". Mendix's own advice says the same: an attribute the system sets
 * (a status) is read-only, and the XPath belongs in the access rule, not in
 * a widget. A page that shows an input only while Status is Draft stops
 * nobody: the rule is what the runtime checks when the object is committed,
 * from that page, from a nanoflow, from the browser's console or through an
 * API.
 *
 * FOR EVERY USER ROLE AND EVERY ATTRIBUTE IT MAY WRITE BY AN ACCESS RULE:
 *   1. Every place the role edits it: an input on a page the role may open,
 *      or on a snippet such a page places (with the conditions around the
 *      snippet), and every nanoflow, and microflow that applies entity
 *      access, that changes it with the role's rights (accessuse.js says
 *      which). An input that is never editable, or hidden from the role by
 *      a role condition, is no place at all.
 *   2. The conditions on each: whether it shows, and whether it is
 *      editable, on the input and on every container, row and tab around it
 *      — "editable" and "visible" count alike, since a hidden input edits
 *      nothing. A condition counts as a STATE condition only when it reads
 *      an enumeration or boolean attribute (or one named Status, State or
 *      Phase) of the object being edited, which the role does not itself
 *      change on a page with no condition (a toggle like AllDay that the
 *      same form edits restricts nothing). In a flow: a decision in front of
 *      the change that reads such an attribute of the object it changes.
 *   3. The verdict:
 *        wider        — every place is under a state condition, the
 *                       conditions together do not cover every value, and
 *                       some rule that gives the write has no XPath naming
 *                       that attribute: a FINDING — P1 when confirmed (a
 *                       typed state the role cannot set itself, no
 *                       before-commit microflow that may refuse it; see
 *                       assess), else TO VERIFY, P2.
 *        held         — every place is conditional, and every rule that
 *                       gives the write names the attribute in its XPath.
 *        every-state  — every place is conditional, but together they
 *                       allow every value (AllDay true on one input, false
 *                       on the other).
 *        unconditional — some place edits it with no state condition.
 *      A place MxScout could not read (a flow without a drawing, a page
 *      whose inputs it did not find) counts as unconditional: uncertainty
 *      never makes a finding.
 *   The same for delete: a Delete button, or a flow that deletes with the
 *   role's rights, against the rules that allow delete. An XPath limits
 *   write and delete; it does not limit create, which is why create has no
 *   verdict here — a create right nothing uses is already "written never"
 *   (accessuse.js), and this says how many there are.
 *
 * WORTH KNOWING, a mitigation: one microflow run before commit on three or
 * more entities that each carry a boolean attribute no role may read or
 * write — the shape of a shared commit check that refuses what the client
 * commits on its own (a server flow sets the flag, the client cannot). It
 * is named by its module when that module is a Marketplace module, and
 * only as a pattern otherwise. MxScout does not follow what the microflow
 * checks; as a before-commit microflow that may refuse the commit and that
 * MxScout cannot read, it makes the write finding to verify (assess).
 *
 * Pure: no DOM, no storage, no network. Reads what mpr.js already reads
 * (pages' and snippets' structure, flows' drawings, entities' events) and
 * what accessuse.js and guards.js work out. The Security section draws what
 * it returns, and mendix-describe carries the same file in its engine/.
 */
(function () {
  'use strict';

  // What names a state is guards.js's (namedState): Status, State or Phase as a word of the name. With
  // options.legacyNames, as the rules before read it (the letters anywhere) — see secrisks.js, withdrawn.
  var LEGACY_NAME = /status|state|phase/i;
  var legacyNames = false;
  function namedState(name) {
    if (window.MxGuards && window.MxGuards.namedState) return window.MxGuards.namedState(name, { legacyNames: legacyNames });
    return legacyNames ? LEGACY_NAME.test(name) : String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').split(/[\s_]+/)
      .some(function (w) { return /^(status|state|phase)$/i.test(w); });
  }
  var EDITING = { input: true };

  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }
  function shortName(qn) { var s = String(qn || ''); return s.slice(s.lastIndexOf('.') + 1); }
  function oneLine(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function andList(list) { return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : (list[0] || ''); }

  // ---------- the model, indexed once ----------
  function indexModel(model) {
    var ix = { entity: {}, enumValues: {}, page: {}, snippet: {}, micro: {}, nano: {}, children: {} };
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) ix.entity[e.qualifiedName] = e; });
    (model.entities || []).forEach(function (e) { if (e && e.generalization) (ix.children[e.generalization] = ix.children[e.generalization] || []).push(e.qualifiedName); });
    (model.enumerations || []).forEach(function (en) {
      if (en && en.qualifiedName) ix.enumValues[en.qualifiedName] = (en.values || []).map(function (v) { return v && v.name; }).filter(Boolean);
    });
    (model.pages || []).forEach(function (p) { if (p && p.qualifiedName) ix.page[p.qualifiedName] = p; });
    (model.snippets || []).forEach(function (p) { if (p && p.qualifiedName) ix.snippet[p.qualifiedName] = p; });
    (model.microflows || []).forEach(function (f) { if (f && f.qualifiedName) ix.micro[f.qualifiedName] = f; });
    (model.nanoflows || []).forEach(function (f) { if (f && f.qualifiedName) ix.nano[f.qualifiedName] = f; });
    return ix;
  }
  function ancestors(ix, qn) {
    var out = [], seen = {}, e = ix.entity[qn];
    while (e && e.generalization && !seen[e.generalization]) { seen[e.generalization] = true; out.push(e.generalization); e = ix.entity[e.generalization]; }
    return out;
  }
  function descendants(ix, qn) {
    var out = [], q = (ix.children[qn] || []).slice();
    while (q.length) { var c = q.shift(); if (out.indexOf(c) !== -1) continue; out.push(c); q = q.concat(ix.children[c] || []); }
    return out;
  }
  function family(ix, qn) { return [qn].concat(ancestors(ix, qn), descendants(ix, qn)); }
  function attrOf(ix, entityQn, name) {
    var seen = {}, e = ix.entity[entityQn];
    while (e && !seen[e.qualifiedName]) {
      seen[e.qualifiedName] = true;
      var a = (e.attributes || []).filter(function (x) { return x && x.name === name; })[0];
      if (a) return a;
      e = e.generalization ? ix.entity[e.generalization] : null;
    }
    return null;
  }
  // An attribute that says what state an object is in — as guards.js reads it.
  function isState(ix, entityQn, name) { return !!stateKind(ix, entityQn, name); }
  // 'typed' — an enumeration or a boolean; 'named' — only its name says it is a state (a hint, not proof).
  function stateKind(ix, entityQn, name) {
    if (!name || name.indexOf('.') !== -1) return null;
    var a = attrOf(ix, entityQn, name);
    if (!a) return null;
    return a.type === 'Enumeration' || a.type === 'Boolean' ? 'typed' : namedState(name) ? 'named' : null;
  }
  function stored(ix, qn) { var e = ix.entity[qn]; return !!e && e.persistable !== false; }
  // Every value an attribute can hold, when that is a short list.
  function domainOf(ix, entityQn, name) {
    var a = attrOf(ix, entityQn, name);
    if (!a) return null;
    if (a.type === 'Boolean') return ['true', 'false'];
    if (a.type === 'Enumeration' && ix.enumValues[a.enumerationQualifiedName]) return ix.enumValues[a.enumerationQualifiedName].slice();
    return null;
  }

  // ---------- reading a condition ----------
  // Split at a top-level word ("or", "and"), outside quotes and brackets.
  function splitTop(s, word) {
    var out = [], depth = 0, quote = false, last = 0, re = new RegExp('^\\s+' + word + '\\s+', 'i');
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === "'") quote = !quote;
      else if (!quote && c === '(') depth++;
      else if (!quote && c === ')') depth--;
      else if (!quote && depth === 0 && /\s/.test(c)) {
        var m = re.exec(s.slice(i));
        if (m) { out.push(s.slice(last, i)); i += m[0].length - 1; last = i + 1; }
      }
    }
    out.push(s.slice(last));
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function stripParens(s) {
    s = s.trim();
    while (s.charAt(0) === '(' && s.charAt(s.length - 1) === ')') {
      var depth = 0, wraps = true;
      for (var i = 0; i < s.length; i++) {
        if (s.charAt(i) === '(') depth++;
        else if (s.charAt(i) === ')') { depth--; if (depth === 0 && i < s.length - 1) { wraps = false; break; } }
      }
      if (!wraps) break;
      s = s.slice(1, -1).trim();
    }
    return s;
  }
  function literal(v) {
    v = String(v).trim();
    if (/^'.*'$/.test(v)) return v.slice(1, -1);
    if (/^(true|false)(\(\))?$/i.test(v)) return v.replace(/\(\)$/, '').toLowerCase();
    if (/^empty$/i.test(v)) return '';
    if (/^[A-Za-z_]\w*\.[A-Za-z_]\w*\.[A-Za-z_]\w*$/.test(v)) return shortName(v);
    return null;
  }
  // One comparison on one attribute: "$X/Status = 'Draft'", "not($X/Done)",
  // "$X/Done". Returns { v, path, values: [..] | null, negate } or null.
  function atom(s) {
    s = stripParens(s);
    var m = /^not\s*\(\s*\$([A-Za-z_]\w*)((?:\/[A-Za-z_][\w.]*)+)\s*\)$/i.exec(s);
    if (m) return { v: m[1], path: m[2].slice(1).split('/'), values: ['false'] };
    m = /^\$([A-Za-z_]\w*)((?:\/[A-Za-z_][\w.]*)+)\s*(!=|=)\s*(.+)$/.exec(s);
    if (m) {
      var lit = literal(m[4]);
      if (lit === null) return { v: m[1], path: m[2].slice(1).split('/'), values: null };
      return { v: m[1], path: m[2].slice(1).split('/'), values: [lit], negate: m[3] === '!=' };
    }
    m = /^\$([A-Za-z_]\w*)((?:\/[A-Za-z_][\w.]*)+)$/.exec(s);
    if (m) return { v: m[1], path: m[2].slice(1).split('/'), values: ['true'] };
    return null;
  }
  // Every $Var/Path in an expression, outside string literals.
  function refsIn(text) {
    if (window.MxGuards && window.MxGuards.refsIn) return window.MxGuards.refsIn(text);
    var out = [], s = String(text || '').replace(/'[^']*'/g, "''"), re = /\$([A-Za-z_]\w*)((?:\/[A-Za-z_][\w.]*)*)/g, m;
    while ((m = re.exec(s))) out.push({ v: m[1], path: m[2] ? m[2].slice(1).split('/') : [] });
    return out;
  }
  // Where a path ends: an attribute of the object itself, or of the entity a
  // path over an association names before it.
  function target(path, base) {
    if (!path.length) return null;
    if (path.length === 1) return { entity: base, attribute: path[0] };
    var ent = path[path.length - 2];
    return /\./.test(ent) ? { entity: ent, attribute: path[path.length - 1], over: true } : null;
  }
  // A page condition as the states it allows: [{ entity|null, attribute,
  // values: [..] | null }]; values null is "some, not known which".
  function statesOfCondition(cond, resolve) {
    var out = [];
    if (!cond) return out;
    if (cond.attribute) {
      var attr = shortName(cond.attribute);
      out.push({ entity: cond.attribute.slice(0, cond.attribute.length - attr.length - 1), attribute: attr, values: (cond.values || []).length ? cond.values.slice() : null });
      return out;
    }
    if (!cond.expression) return out;
    var text = String(cond.expression);
    var ors = splitTop(stripParens(text), 'or');
    if (ors.length > 1) {
      // Every branch on the same attribute of the same object: the union.
      var atoms = ors.map(atom);
      if (atoms.every(Boolean) && atoms.every(function (a) { return a.v === atoms[0].v && a.path.join('/') === atoms[0].path.join('/') && !a.negate && a.values; })) {
        var t = target(atoms[0].path, resolve(atoms[0].v));
        if (t) out.push({ entity: t.entity, attribute: t.attribute, values: uniq([].concat.apply([], atoms.map(function (a) { return a.values; }))), over: t.over });
        return out;
      }
    } else {
      // A conjunction: each comparison it can read narrows, the rest is
      // read as "some state".
      var ands = splitTop(stripParens(text), 'and'), read = false;
      ands.forEach(function (part) {
        var a = atom(part);
        if (!a) return;
        var t = target(a.path, resolve(a.v));
        if (!t) return;
        read = true;
        out.push({ entity: t.entity, attribute: t.attribute, values: a.values, negate: a.negate, over: t.over });
      });
      if (read && ands.length === out.length) return out;
    }
    // Anything else: every attribute it reads, in some state not known.
    refsIn(text).forEach(function (r) {
      var t = target(r.path, resolve(r.v));
      if (t && !out.some(function (o) { return o.entity === t.entity && o.attribute === t.attribute; })) out.push({ entity: t.entity, attribute: t.attribute, values: null, over: t.over });
    });
    return out;
  }
  function conditionText(on, cond) {
    var head = on === 'editable' ? 'editable when ' : 'shown when ';
    if (cond.expression) return head + oneLine(cond.expression);
    if (cond.attribute) return head + shortName(cond.attribute.slice(0, cond.attribute.lastIndexOf('.'))) + '.' + shortName(cond.attribute) + ' is ' + ((cond.values || []).join(' or ') || 'set');
    return head + 'a condition MxScout could not read';
  }

  // ---------- where a role edits and deletes, on its pages ----------
  // Every input and every Delete button on the pages the role may open,
  // and on the snippets they place, with the conditions around each.
  function pagePlaces(ix, model, roles) {
    var places = { edits: [], deletes: [] };
    function allowedFor(c) {
      // A role condition: shown only to some module roles.
      return !c.roles || c.roles.some(function (r) { return roles[r]; });
    }
    function walk(widgets, ctx, depth) {
      if (depth > 80) return;
      (widgets || []).forEach(function (w) {
        if (!w || typeof w !== 'object') return;
        var here = { page: ctx.page, snippets: ctx.snippets, entity: ctx.entity, names: ctx.names, params: ctx.params, conds: ctx.conds, readOnly: ctx.readOnly };
        function resolve(v) {
          if (v === 'currentObject') return here.entity;
          if (here.names[v]) return here.names[v];
          if (here.params[v]) return here.params[v];
          return null;
        }
        if (w.visible) {
          if (!allowedFor(w.visible)) return;
          if (w.visible.expression || w.visible.attribute) here.conds = here.conds.concat([{ on: 'shown', text: conditionText('shown', w.visible), states: statesOfCondition(w.visible, resolve) }]);
        }
        if (w.readOnly) here.readOnly = true;
        else if (w.editableIf) {
          if (!allowedFor(w.editableIf)) here.readOnly = true;
          else if (w.editableIf.expression || w.editableIf.attribute) here.conds = here.conds.concat([{ on: 'editable', text: conditionText('editable', w.editableIf), states: statesOfCondition(w.editableIf, resolve) }]);
          else here.conds = here.conds.concat([{ on: 'editable', text: conditionText('editable', w.editableIf), states: [] }]);
        }
        if (EDITING[w.kind] || (w.kind === 'item' && w.attribute && w.type !== 'column')) {
          if (!here.readOnly && typeof w.attribute === 'string' && w.attribute.split('.').length === 3) {
            places.edits.push({ via: ctx.snippets.length ? 'snippet' : 'page', page: ctx.page, snippets: ctx.snippets.slice(), widget: w.name || null,
              caption: w.caption || null, attribute: w.attribute, entity: w.attribute.split('.').slice(0, 2).join('.'), conds: here.conds });
          }
        }
        (w.actions || []).forEach(function (a) {
          if (!a || a.kind !== 'delete') return;
          var ent = here.entity;
          if (!ent) {
            var ps = Object.keys(here.params);
            if (ps.length === 1) ent = here.params[ps[0]];
          }
          if (ent) places.deletes.push({ via: ctx.snippets.length ? 'snippet' : 'page', page: ctx.page, snippets: ctx.snippets.slice(), widget: w.name || null, caption: w.caption || null, entity: ent, conds: here.conds });
        });
        // A data container: its children work on its own object.
        var inner = here;
        if (w.source) {
          var ent2 = w.source.entity || (w.source.kind === 'parameter' && here.params[w.source.param]) || (w.source.kind === 'widget' && here.names[w.source.widget]) || null;
          inner = Object.assign({}, here, { entity: ent2 || null });
          if (w.name && ent2) { inner.names = Object.assign({}, here.names); inner.names[w.name] = ent2; }
        }
        if (w.kind === 'snippet' && w.snippet && ix.snippet[w.snippet] && ctx.snippets.indexOf(w.snippet) === -1 && ctx.snippets.length < 6) {
          var sn = ix.snippet[w.snippet], params = {};
          (sn.parameters || []).forEach(function (p) { if (p && p.name && p.entityQualifiedName) params[p.name] = p.entityQualifiedName; });
          if (sn.structure) (sn.structure.regions || []).forEach(function (r) {
            walk(r.widgets, { page: ctx.page, snippets: ctx.snippets.concat([w.snippet]), entity: inner.entity, names: {}, params: params, conds: inner.conds, readOnly: inner.readOnly }, depth + 1);
          });
        }
        Object.keys(w).forEach(function (k) {
          if (k === 'actions' || k === 'args' || k === 'source' || !Array.isArray(w[k])) return;
          walk(w[k], inner, depth + 1);
        });
      });
    }
    (model.pages || []).forEach(function (p) {
      if (!p || !p.structure || !(p.allowedModuleRoles || []).some(function (r) { return roles[r]; })) return;
      var params = {};
      (p.parameters || []).forEach(function (x) { if (x && x.name && x.entityQualifiedName) params[x.name] = x.entityQualifiedName; });
      (p.structure.regions || []).forEach(function (r) {
        walk(r.widgets, { page: p.qualifiedName, snippets: [], entity: null, names: {}, params: params, conds: [], readOnly: false }, 0);
      });
    });
    return places;
  }

  // ---------- where a flow edits and deletes, and what it checks first ----------
  function flowSteps(ix, flow, kind, entityFamily, attribute) {
    // { steps: [node id], states: [{ attribute, text }], createsOnly } — the
    // state decisions that stand in front of EVERY step changing (or
    // deleting) it in this flow.
    var front = window.MxGuards && window.MxGuards.frontOf ? window.MxGuards.frontOf(flow) : null;
    if (!front) return null;
    var varEntity = {};
    (flow.parameters || []).forEach(function (p) { if (p && p.name && p.entityQualifiedName && !p.isList) varEntity[p.name] = p.entityQualifiedName; });
    front.nodes.forEach(function (n) {
      var p = n.props || {};
      if (p.out && p.entity && (n.action === 'RetrieveAction' || n.action === 'CreateChangeAction')) varEntity[p.out] = p.entity;
    });
    var ids = [], vars = {}, creates = 0;
    front.nodes.forEach(function (n) {
      if (n.kind !== 'activity' || n.disabled || !front.reachable[n.id]) return;
      var p = n.props || {};
      var fields = (n.fields || []).map(function (f) { return shortName(f.name); });
      var mine = p.object && (!varEntity[p.object] || entityFamily.indexOf(varEntity[p.object]) !== -1);
      if (attribute) {
        if (n.action === 'CreateChangeAction' && fields.indexOf(attribute) !== -1) { creates++; return; }
        if (n.action !== 'ChangeAction' || !mine || fields.indexOf(attribute) === -1) return;
      } else if (n.action !== 'DeleteAction' || !mine) return;
      ids.push(n.id);
      vars[p.object] = true;
    });
    var states = [];
    if (ids.length) front.before(ids).forEach(function (d) {
      refsIn(d.expression || '').forEach(function (r) {
        if (!vars[r.v] || r.path.length !== 1) return;
        var ent = varEntity[r.v] || entityFamily[0];
        if (isState(ix, ent, r.path[0]) && !states.some(function (s) { return s.attribute === r.path[0]; })) states.push({ attribute: r.path[0], text: 'checks ' + oneLine(d.expression) + ' first' });
      });
    });
    return { steps: ids, states: states, createsOnly: !ids.length && creates > 0 };
  }

  // ---------- one shared commit check (worth knowing) ----------
  function commitChecks(ix, model) {
    var byFlow = {};
    (model.entities || []).forEach(function (e) {
      if (!stored(ix, e.qualifiedName)) return;
      [e.qualifiedName].concat(ancestors(ix, e.qualifiedName)).some(function (qn) {
        var x = ix.entity[qn];
        var ev = ((x && x.events) || []).filter(function (v) { return v.moment === 'before' && v.type === 'commit'; });
        ev.forEach(function (v) { (byFlow[v.microflow] = byFlow[v.microflow] || []).push(e.qualifiedName); });
        return ev.length > 0;
      });
    });
    function noRights(entityQn, attrName) {
      return [entityQn].concat(ancestors(ix, entityQn)).every(function (qn) {
        return ((ix.entity[qn] || {}).accessRules || []).every(function (r) { return !r || !(r.attrAccess || {})[attrName]; });
      });
    }
    var out = [];
    Object.keys(byFlow).sort().forEach(function (mf) {
      var covered = [], markers = [];
      uniq(byFlow[mf]).forEach(function (qn) {
        var flags = [];
        [qn].concat(ancestors(ix, qn)).forEach(function (x) {
          ((ix.entity[x] || {}).attributes || []).forEach(function (a) { if (a && a.type === 'Boolean' && noRights(qn, a.name)) flags.push(a.name); });
        });
        if (flags.length) { covered.push(qn); markers = uniq(markers.concat(flags)); }
      });
      if (covered.length < 3) return;
      var mod = mf.split('.')[0];
      var m = (model.modules || []).filter(function (x) { return x && x.name === mod; })[0];
      var appStore = !!(m && m.fromAppStore);
      out.push({ kind: 'commit-check', microflow: mf, module: mod, fromAppStore: appStore, entities: covered.sort(), markers: markers.sort(),
        text: (appStore ? 'The Marketplace module ' + mod + ' runs ' : 'One microflow, ') + mf + (appStore ? '' : ', runs') + ' before every commit of ' + covered.length +
          ' entities, and each carries a boolean attribute no role may read or write (' + markers.join(', ') + ') — the shape of a shared commit check that refuses what the client commits on its own. ' +
          'A write wider than the pages on these entities may be stopped there: where ' + shortName(mf) + ' may refuse it — it reads the state, or MxScout cannot read it — the write finding is to verify, and it stays.' });
    });
    return out;
  }

  // ---------- the whole check ----------
  // `options.all` keeps the pairs edited somewhere with no condition too
  // (for checking by hand); otherwise they are only counted.
  function analyse(model, use, options) {
    var was = legacyNames;
    legacyNames = !!(options && options.legacyNames);
    try { return analyseNow(model || {}, use, options || {}); } finally { legacyNames = was; }
  }
  function analyseNow(model, use, options) {
    var ix = indexModel(model);
    if (!use && window.MxAccessUse) use = window.MxAccessUse.of ? window.MxAccessUse.of(model) : window.MxAccessUse.analyse(model);
    var subjects = (model.userRoles || []).filter(function (r) { return r && (r.moduleRoles || []).length; })
      .map(function (r) { return { name: r.name, moduleRoles: r.moduleRoles.slice() }; });
    // stateUse: for each user role, entity and attribute it may write by an access rule — whether it sets it
    // somewhere with no condition on its own value (free: a setting, a toggle), in how many places it
    // changes it at all, and whether some place changes it with no state condition at all (open, openAt:
    // the same write is offered to the role there, in every state). guards.js reads it to tell a state the role may not reach from one it switches itself.
    var out = { state: subjects.length ? 'checked' : 'no-roles', pairs: [], findings: [], notes: [], counts: { pairs: 0, conditional: 0, unconditional: 0 }, stateUse: {} };
    if (!subjects.length) return out;
    var checks = commitChecks(ix, model);
    var strict = model.security ? model.security.strictMode : null;

    subjects.forEach(function (subject) {
      var roles = {};
      subject.moduleRoles.forEach(function (mr) { roles[mr] = true; });
      var onPages = pagePlaces(ix, model, roles);
      var writers = (use && use.writers && use.writers[subject.name]) || {};
      var deleters = (use && use.deleters && use.deleters[subject.name]) || {};

      (model.entities || []).forEach(function (entity) {
        var qn = entity.qualifiedName;
        if (!stored(ix, qn)) return;
        var rules = (entity.accessRules || []).filter(function (r) { return r && roles[r.moduleRole]; });
        if (!rules.length) return;
        var fam = family(ix, qn);
        var writeAttrs = uniq([].concat.apply([], rules.map(function (r) { return Object.keys(r.attrAccess || {}).filter(function (a) { return r.attrAccess[a] === 'rw'; }); }))).sort();

        // The page places of this entity, each with the state conditions on
        // the object it edits.
        function statesOn(place) {
          var out2 = [];
          place.conds.forEach(function (c) {
            c.states.forEach(function (s) {
              var ent = s.entity && !s.over ? s.entity : (s.over ? s.entity : null);
              var onObject = ent ? fam.indexOf(ent) !== -1 : !!attrOf(ix, qn, s.attribute);
              if (!onObject || !isState(ix, ent || qn, s.attribute)) return;
              out2.push({ attribute: s.attribute, values: s.values, negate: !!s.negate, text: c.text });
            });
          });
          return out2;
        }
        var edits = onPages.edits.filter(function (p) { return fam.indexOf(p.entity) !== -1; }).map(function (p) { return Object.assign({ states: statesOn(p) }, p); });
        // Every place the role writes each attribute, with every state
        // condition on the object, before deciding which of those states
        // restrict anything.
        var placesOf = {};
        writeAttrs.forEach(function (attr) {
          var places = [];
          edits.forEach(function (p) { if (shortName(p.attribute) === attr) places.push(pagePlace(p)); });
          fam.forEach(function (x) {
            ((writers[x] || {})[attr] || []).forEach(function (w) {
              if (w.via === 'page' || w.via === 'snippet') {
                if (!places.some(function (pl) { return w.via === 'page' ? (pl.via === 'page' && pl.name === w.name) : (pl.snippets || []).indexOf(w.name) !== -1; })) {
                  places.push({ via: w.via, name: w.name, conditions: [], raw: [], note: 'MxScout found the input but not the conditions around it' });
                }
                return;
              }
              if (places.some(function (pl) { return pl.via === w.via && pl.name === w.name; })) return;
              var f = w.via === 'nanoflow' ? ix.nano[w.name] : ix.micro[w.name];
              var fs = f ? flowSteps(ix, f, w.via, fam, attr) : null;
              if (fs && fs.createsOnly) return;
              places.push(flowPlace(w, fs));
            });
          });
          placesOf[attr] = places;
        });
        // An attribute the role sets itself somewhere without a condition on
        // its own value — an input, a toggle microflow — is the form's state,
        // not the object's: a condition on it restricts nothing (AllDay, a
        // "show recipients" switch). One the role changes only behind a check
        // of its own value ("editable while SecondLine is false", a Submit
        // that checks Status first) stays a state.
        var free = {};
        writeAttrs.forEach(function (attr) {
          if (placesOf[attr].some(function (pl) { return !pl.raw.some(function (s) { return s.attribute === attr; }); })) free[attr] = true;
        });
        var su = (out.stateUse[subject.name] = out.stateUse[subject.name] || {})[qn] = {};
        writeAttrs.forEach(function (attr) {
          var at = placesOf[attr].filter(function (pl) { return free[attr] ? !pl.raw.some(function (s) { return s.attribute === attr; }) : true; })
            .slice(0, 3).map(function (pl) { return (pl.via === 'page' || pl.via === 'snippet' ? 'on ' : 'in ') + pl.name + (pl.widget ? ' · ' + pl.widget : ''); });
          su[attr] = { writable: true, free: !!free[attr], places: placesOf[attr].length, where: at.join(', ') || null };
        });
        function settle(pl) {
          pl.states = pl.raw.filter(function (s) { return !free[s.attribute]; });
          pl.conditional = pl.states.length > 0;
          delete pl.raw;
          return pl;
        }
        writeAttrs.forEach(function (attr) {
          judge('write', attr, placesOf[attr].map(function (pl) { return settle(Object.assign({}, pl)); }), rules.filter(function (r) { return (r.attrAccess || {})[attr] === 'rw'; }));
        });

        if (rules.some(function (r) { return r.allowDelete; })) {
          var delFam = [qn].concat(ancestors(ix, qn));
          var places = onPages.deletes.filter(function (p) { return delFam.indexOf(p.entity) !== -1; }).map(function (p) { return pagePlace(Object.assign({ states: statesOn(p) }, p)); });
          delFam.forEach(function (x) {
            (deleters[x] || []).forEach(function (w) {
              if (w.via === 'page' || w.via === 'snippet') {
                if (!places.some(function (pl) { return w.via === 'page' ? (pl.via === 'page' && pl.name === w.name) : (pl.snippets || []).indexOf(w.name) !== -1; })) {
                  places.push({ via: w.via, name: w.name, conditions: [], raw: [], note: 'MxScout found the Delete button but not the conditions around it' });
                }
                return;
              }
              if (places.some(function (pl) { return pl.via === w.via && pl.name === w.name; })) return;
              var f = w.via === 'nanoflow' ? ix.nano[w.name] : ix.micro[w.name];
              places.push(flowPlace(w, f ? flowSteps(ix, f, w.via, fam, null) : null));
            });
          });
          judge('delete', null, places.map(settle), rules.filter(function (r) { return r.allowDelete; }));
        }

        function judge(kind, attr, places, grantRules) {
          if (!places.length || !grantRules.length) return;
          if (kind === 'write' && su[attr]) {
            var open = places.filter(function (p) { return !p.conditional; });
            su[attr].open = open.length > 0;
            su[attr].openAt = open.slice(0, 3).map(function (pl) { return (pl.via === 'page' || pl.via === 'snippet' ? 'on ' : 'in ') + pl.name + (pl.widget ? ' · ' + pl.widget : ''); }).join(', ') || null;
          }
          out.counts.pairs++;
          var conditional = places.every(function (p) { return p.conditional; });
          if (!places.some(function (p) { return p.conditional; })) {
            out.counts.unconditional++;
            if (options.all) out.pairs.push({ kind: kind, userRole: subject.name, entity: qn, attribute: attr, places: places, rules: grantRules.map(function (r) { return { moduleRole: r.moduleRole, xpath: r.xpathConstraint || null, knows: false }; }), stateAttrs: [], verdict: 'unconditional' });
            return;
          }
          out.counts.conditional++;
          var stateAttrs = uniq([].concat.apply([], places.map(function (p) { return p.states.map(function (s) { return s.attribute; }); }))).sort();
          var ruleRows = grantRules.map(function (r) {
            var x = r.xpathConstraint ? String(r.xpathConstraint).replace(/'[^']*'/g, "''") : '';
            var knows = !!x && stateAttrs.some(function (a) { return new RegExp('(^|[^\\w.])' + a + '\\b').test(x); });
            return { moduleRole: r.moduleRole, xpath: r.xpathConstraint || null, knows: knows };
          });
          var verdict = !conditional ? 'unconditional' : coversAll(places, attr) ? 'every-state' : ruleRows.every(function (r) { return r.knows; }) ? 'held' : 'wider';
          out.pairs.push({ kind: kind, userRole: subject.name, entity: qn, attribute: attr, places: places, rules: ruleRows, stateAttrs: stateAttrs, verdict: verdict });
        }
        // Together, the places allow every value of one state attribute
        // (AllDay true on one input, false on another): no state is left out.
        function coversAll(places) {
          var cands = places[0].states.map(function (s) { return s.attribute; });
          return uniq(cands).some(function (a) {
            var dom = domainOf(ix, qn, a);
            if (!dom) return false;
            var union = [];
            var all = places.every(function (p) {
              var sets = p.states.filter(function (s) { return s.attribute === a; }).map(function (s) {
                if (!s.values) return null;
                return s.negate ? dom.filter(function (v) { return s.values.indexOf(v) === -1; }) : s.values.map(String);
              });
              if (!sets.length || sets.some(function (x) { return x === null; })) return false;
              var allowed = sets.reduce(function (acc, x) { return acc.filter(function (v) { return x.indexOf(v) !== -1; }); });
              union = uniq(union.concat(allowed));
              return true;
            });
            return all && dom.every(function (v) { return union.indexOf(v) !== -1; });
          });
        }
      });
    });

    // ---- findings: one per entity, for write and for delete ----
    var byKey = {};
    out.pairs.filter(function (p) { return p.verdict === 'wider'; }).forEach(function (p) {
      var key = p.kind + ' ' + p.entity;
      var f = byKey[key] = byKey[key] || { kind: p.kind, priority: 'P1', entity: p.entity, userRoles: [], attributes: [], stateAttrs: [], values: {}, places: [], rules: [], pairs: [] };
      f.pairs.push(p);
      if (f.userRoles.indexOf(p.userRole) === -1) f.userRoles.push(p.userRole);
      if (p.attribute && f.attributes.indexOf(p.attribute) === -1) f.attributes.push(p.attribute);
      f.stateAttrs = uniq(f.stateAttrs.concat(p.stateAttrs));
      p.places.forEach(function (pl) {
        pl.states.forEach(function (s) { if (s.values && !s.negate) f.values[s.attribute] = uniq((f.values[s.attribute] || []).concat(s.values)); });
        var k = pl.via + ' ' + pl.name + ' ' + (pl.widget || '');
        if (!f.places.some(function (x) { return x.key === k; })) f.places.push(Object.assign({ key: k }, pl));
      });
      p.rules.forEach(function (r) { if (!r.knows && !f.rules.some(function (x) { return x.moduleRole === r.moduleRole && x.xpath === r.xpath; })) f.rules.push(r); });
    });
    Object.keys(byKey).sort().forEach(function (k) {
      var f = byKey[k];
      f.attributes.sort(); f.userRoles.sort();
      var check = checks.filter(function (c) { return f.kind === 'write' && c.entities.indexOf(f.entity) !== -1; })[0];
      if (check) f.mitigation = 'A shared commit check runs before every commit of ' + shortName(f.entity) + ' (' + check.microflow + ', with ' + check.markers.join(', ') + ' set by no role) and may refuse it; MxScout does not follow what it checks.';
      assess(ix, model, f, out.stateUse);
      f.text = findingText(f, strict);
      f.strict = strictText(strict);
      f.fix = fixText(f);
      out.findings.push(f);
    });
    out.findings.sort(function (a, b) { return a.entity.localeCompare(b.entity) || a.kind.localeCompare(b.kind); });

    // ---- worth knowing ----
    checks.forEach(function (c) { out.notes.push(c); });
    if (use && use.unwritten) {
      var creates = use.unwritten.filter(function (u) { return u.create && stored(ix, u.entity); });
      if (creates.length) out.notes.push({ kind: 'create-never', count: creates.length,
        text: creates.length + ' pair' + (creates.length === 1 ? '' : 's') + ' of user role and entity may create objects that nothing the role reaches creates. An XPath does not limit create, so such a right is open in every state; each is listed as written never in the rule’s Access window on the Domain model.' });
    }
    return out;
  }

  // How strong a finding is. A condition on a page or in a flow is a hint: it says where the role edits, not
  // that the state is one it may not reach. CONFIRMED when at least one of the state attributes is typed (an
  // enumeration or a boolean) and, for every role of the finding, read-only or changed only behind a check of
  // its own value — a state the application keeps — and no before-commit (before-delete) microflow may refuse
  // the write: P1. Anything less is TO VERIFY, P2, with what to look at. The finding stays either way.
  function assess(ix, model, f, stateUse) {
    var own = {}, evidence = [];
    f.stateAttrs.forEach(function (a) {
      var d = own[a] = [], kind = stateKind(ix, f.entity, a), at = attrOf(ix, f.entity, a) || {};
      if (kind !== 'typed') d.push(a + ' is ' + (at.type ? 'a ' + at.type + ' attribute' : 'an attribute') + ' that only its name marks as a state — a hint, not a state the model shows anyone protecting.');
      var readOnly = [];
      f.userRoles.forEach(function (role) {
        var u = stateUse[role] && stateUse[role][f.entity] && stateUse[role][f.entity][a];
        if (!u) { readOnly.push(role); return; }
        if (u.free) d.push('"' + role + '" sets ' + a + ' itself with no condition on its value' + (u.where ? ' (' + u.where + ')' : '') + '.');
        else if (!u.places) d.push('"' + role + '" may write ' + a + ' by its access rule and nothing it reaches changes it: whether ' + a + ' is a state it must not reach or a setting it may change, the model does not say.');
        else evidence.push('"' + role + '" changes ' + a + ' only behind a check of its value' + (u.where ? ' (' + u.where + ')' : '') + '.');
      });
      if (readOnly.length) evidence.push(a + ' is read-only for ' + andList(readOnly.map(function (x) { return '"' + x + '"'; })) + ': only the server sets it.');
      if (kind === 'typed') evidence.push(a + ' is ' + (at.type === 'Boolean' ? 'a boolean' : 'an enumeration') + ' of ' + shortName(f.entity) + '.');
    });
    var solid = f.stateAttrs.filter(function (a) { return !own[a].length; });
    var type = f.kind === 'delete' ? 'delete' : 'commit';
    var sc = window.MxGuards && window.MxGuards.serverChecks ? window.MxGuards.serverChecks(model, f.entity, type, solid.length ? solid : f.stateAttrs, false) : { doubts: [], clear: [] };
    var server = sc.doubts.map(function (x) { return x.microflow + ' ' + x.why + '.'; });
    f.confidence = solid.length && !server.length ? 'confirmed' : 'suspected';
    f.priority = f.confidence === 'confirmed' ? 'P1' : 'P2';
    if (f.confidence === 'confirmed') {
      f.doubts = [];
      f.evidence = uniq(evidence.filter(function (x) { return solid.some(function (a) { return x.indexOf(a + ' ') === 0 || x.indexOf(' ' + a + ' ') !== -1; }); })
        .concat([sc.clear.length ? 'Before every ' + type + ' of ' + shortName(f.entity) + ' runs ' + andList(sc.clear) + ', which cannot refuse it or reads none of ' + andList(solid) + '.' : 'No microflow runs before a ' + type + ' of ' + shortName(f.entity) + ' that could refuse it.']));
      var who = andList(f.userRoles.map(function (r) { return '"' + r + '"'; }));
      f.scenario = who + ' can ' + (f.kind === 'write' ? 'change ' + andList(f.attributes) + ' of' : 'delete') + ' a ' + shortName(f.entity) + ' whose ' + andList(solid) + ' the pages do not ' + (f.kind === 'write' ? 'edit it in' : 'delete it in') +
        ' — from a nanoflow, the browser or an API — and the runtime lets it through, since the access rule does not name ' + andList(solid) + '.';
      f.impact = f.kind === 'write' ? 'The change is stored in a state the application does not allow it in.' : 'The object is deleted in a state the application does not allow it in.';
    } else {
      f.evidence = [];
      f.doubts = uniq([].concat.apply([], f.stateAttrs.map(function (a) { return own[a]; })).concat(server));
    }
  }

  // A place, before its states are settled: `raw` is every state condition
  // on the object, `conditions` the conditions as a person reads them.
  function pagePlace(p) {
    return { via: p.via, name: p.page, snippets: p.snippets, widget: p.widget, caption: p.caption,
      conditions: p.conds.map(function (c) { return c.text; }), raw: p.states };
  }
  function flowPlace(w, fs) {
    if (!fs || !fs.steps.length) return { via: w.via, name: w.name, conditions: [], raw: [], note: fs ? 'MxScout found no step for it in the drawing' : 'no drawing to read' };
    return { via: w.via, name: w.name, conditions: fs.states.map(function (x) { return x.text; }),
      raw: fs.states.map(function (x) { return { attribute: x.attribute, values: null, text: x.text }; }) };
  }

  // What strict mode does here, by the Mendix documentation: it switches off
  // the client API's own data calls (get, create, commit, remove, rollback,
  // action) from JavaScript and the console, React client only; the app's
  // nanoflows and pages keep running with the role's rights.
  function strictText(strict) {
    var does = 'Strict mode (React client only) switches off the client API’s own data calls from the browser’s console and custom JavaScript, but not the app’s nanoflows and pages: they keep changing and committing with the role’s rights, and the runtime then checks only the access rule — so it narrows this, it does not close it.';
    if (strict === true) return 'Strict mode is on. ' + does;
    if (strict === false) return 'Strict mode is off, so the browser’s console can change and commit it directly. ' + does;
    return 'Whether strict mode is on is not recorded in this model. ' + does;
  }
  function stateWords(f) {
    return andList(f.stateAttrs.map(function (a) { return a + (f.values[a] && f.values[a].length ? ' is ' + f.values[a].map(function (v) { return v === '' ? 'empty' : v; }).join(' or ') : ' is in some state'); }));
  }
  function findingText(f, strict) {
    var who = andList(f.userRoles.map(function (r) { return '"' + r + '"'; }));
    var openRules = uniq(f.rules.map(function (r) { return r.moduleRole + (r.xpath ? ' (' + oneLine(r.xpath) + ')' : ' (no XPath)'); }));
    var what = f.kind === 'write'
      ? who + ' may change ' + andList(f.attributes) + ' of ' + f.entity + ' in any state'
      : who + ' may delete ' + f.entity + ' in any state';
    var where = f.kind === 'write'
      ? 'every place ' + (f.userRoles.length > 1 ? 'they edit' : 'it edits') + ' ' + (f.attributes.length > 1 ? 'them' : 'it')
      : 'every Delete button and flow ' + (f.userRoles.length > 1 ? 'they reach' : 'it reaches');
    return what + ', while ' + where + ' does so only when ' + stateWords(f) + '. The rule' + (openRules.length > 1 ? 's that give it — ' : ' that gives it — ') + openRules.join('; ') +
      ' — ' + (openRules.length > 1 ? 'do' : 'does') + ' not name ' + (f.stateAttrs.length > 1 ? 'those attributes' : f.stateAttrs[0]) + ', so a nanoflow, the browser or an API can ' +
      (f.kind === 'write' ? 'write ' + (f.attributes.length > 1 ? 'them' : 'it') : 'delete it') + ' in a state where none of those places allows it.';
  }
  function xpathFor(f) {
    return '[' + f.stateAttrs.map(function (a) {
      var vals = f.values[a] || [];
      if (!vals.length) return a + ' = …';
      return vals.map(function (v) { return a + ' = ' + (v === 'true' || v === 'false' ? v + '()' : v === '' ? 'empty' : '\'' + v + '\''); }).join(' or ');
    }).join(' and ') + ']';
  }
  function fixText(f) {
    var xp = xpathFor(f);
    if (f.kind === 'write') {
      return 'In Studio Pro, take write on ' + andList(f.attributes) + ' out of the rule above and give it in a separate access rule for the same module role with the XPath ' + xp +
        ' (write only in that state); or make ' + (f.attributes.length > 1 ? 'them' : 'it') + ' read-only for the role and change ' + (f.attributes.length > 1 ? 'them' : 'it') + ' in a microflow that checks the state first.';
    }
    return 'In Studio Pro, take delete out of the rule above and allow it in a separate access rule for the same module role with the XPath ' + xp +
      '; or delete in a microflow that checks the state first, and give the role no delete right.';
  }

  var VERDICT_TEXT = {
    wider: 'the rule allows it in every state — wider than every place it is edited',
    held: 'the rule’s XPath names the same state',
    'every-state': 'the places together allow every state',
    unconditional: 'edited somewhere with no state condition'
  };

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  var legacyCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model, use) {
    if (!model || typeof model !== 'object' || !cache) return analyse(model, use);
    var hit = cache.get(model);
    if (!hit) { hit = analyse(model, use); cache.set(model, hit); }
    return hit;
  }
  // Who sets each state attribute, and how — for guards.js (see analyse, stateUse).
  function stateUse(model, opts) {
    if (!(opts && opts.legacyNames)) return of(model).stateUse;
    if (!model || typeof model !== 'object' || !legacyCache) return analyse(model, null, opts).stateUse;
    var hit = legacyCache.get(model);
    if (!hit) { hit = analyse(model, null, opts); legacyCache.set(model, hit); }
    return hit.stateUse;
  }

  window.MxEditScope = { analyse: analyse, of: of, stateUse: stateUse, VERDICT_TEXT: VERDICT_TEXT, strictText: strictText };
})();
