/* MxScout — guards: what stops a flow the client may call from working on an
 * object it should not.
 *
 * Whether a person may call a flow is a role question, and the access rules
 * answer whether they may touch somebody else's object. Neither answers
 * whether they may call it on their OWN object in the wrong state — withdraw
 * a ticket that is already closed, edit a form that was already sent. A page
 * usually hides the button then ("visible when Status is Created"), but a
 * page is not a security boundary: a microflow a role may call can be called
 * from the browser's console with any object that role can read, past any
 * condition on any button. The only thing that holds is what the flow checks
 * itself. This compares the two, from the model alone.
 *
 * FOR EVERY FLOW A ROLE MAY CALL (allowed roles) WITH AN OBJECT PARAMETER:
 *   1. What it does with that object, and with every object it reaches from
 *      it — over an association, an XPath naming it, a loop over a list it
 *      retrieved, a new object linked to it: change, commit, delete, create
 *      linked, open a page with it. One level down into the microflows it
 *      hands such an object to; deeper is NOT CHECKED, with the flow's name.
 *   2. What stands in front of each of those steps — a decision every path to
 *      the step goes through, with a branch that never reaches it:
 *        state  — the decision reads an enumeration or boolean attribute of
 *                 the object (or one named Status, State or Phase), directly
 *                 or in a microflow it calls one level down;
 *        owner  — the decision compares the object with the signed-in user
 *                 ([%CurrentUser%], $currentUser), or the object was fetched
 *                 with an XPath that keeps it to the signed-in user;
 *        rule   — the microflow applies entity access, and every access rule
 *                 the calling roles hold on the entity has an XPath that
 *                 keeps the rows to the user (owner) or names a state
 *                 attribute (state). Without entity access a rule guards
 *                 nothing here.
 *      A decision that calls a rule, a Java action handed the object, and a
 *      flow two levels down are named as not checked — never counted as a
 *      guard; a rule, or a Java action on every path to the step, is a doubt
 *      in front of it (guards.maybe), since it may be the very check.
 *   3. A verdict: state, owner, both or nothing — "both" only when every step
 *      has both. A nanoflow gets no verdict of its own: it runs in the browser
 *      under the role's access rules, which is what decides there.
 *
 * WHAT IT CONCLUDES:
 *   page-hides  (finding) — a button, link or other trigger calls the flow,
 *     and it, or a container around it, shows only on a state attribute of
 *     the object the flow is given (or only to its owner), while the flow
 *     does not check that attribute (or the owner) before every step it
 *     takes on the object. P1 when a step is stored — a commit, a delete, a
 *     change or a create that commits — P2 when it only changes in memory or
 *     opens a page. A page's condition is a hint, not proof (assess): the
 *     finding is CONFIRMED only when a condition is a state the role cannot
 *     set itself (typed, read-only for it or changed only behind a check of
 *     its value — editscope.js stateUse says which) or an owner it can read
 *     past, and an unchecked step has nothing in front of it MxScout cannot
 *     read (no rule, Java action, or before-commit / before-delete microflow
 *     that may refuse it — serverChecks). Otherwise it is TO VERIFY, P2,
 *     with its doubts. Each confirmed one says its scenario, effect and
 *     evidence.
 *   bypass-xpath (finding) — a microflow that does not apply entity access,
 *     callable by a role, retrieves an entity from the database with no
 *     XPath, while every access rule that role holds on it has one: rows the
 *     role may not read come back. CONFIRMED, P1, when the drawing shows
 *     where they go — returned (the end's return value), shown on a page,
 *     changed and committed, deleted; TO VERIFY, P2, otherwise.
 *   same-entity (worth knowing) — two object parameters of the same entity on
 *     a flow the client calls: the runtime is handed each by its id, and
 *     nothing stops it being handed the same object twice, or two that do
 *     not belong together.
 *
 * Read from what mpr.js already reads: each flow's drawing (graph — the
 * decision's expression, a rule call's arguments, every step's object and
 * settings) and each page's widget tree (structure — every trigger with what
 * it calls and hands over, and every visibility and editability condition).
 * Pure: no DOM, no storage, no network. The microflow window and Security
 * draw what it returns, and mendix-describe carries the same file in its
 * engine/.
 */
(function () {
  'use strict';

  var USER = /\[%CurrentUser%\]|\$currentUser\b|\$currentSession\/System\.Session_User/i;
  // A name that says state: Status, State or Phase as a word of it (OrderStatus, status_cd, STATE) — not
  // inside another word (Estate, Statement, Restated). The rules before (rules 1) matched the letters
  // anywhere; analyse(model, { legacyNames: true }) still reads them that way, so secrisks.js can tell a risk
  // the rules no longer give from one the model no longer has.
  var LEGACY_NAME = /status|state|phase/i;
  var legacyNames = false, legacyHelpers = false;
  function namedState(name) {
    if (legacyNames) return LEGACY_NAME.test(name);
    return String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').split(/[\s_]+/)
      .some(function (w) { return /^(status|state|phase)$/i.test(w); });
  }
  // On a page, only "is the user" hides a trigger from everyone else; "is not
  // the user" ($Ticket/Assignee != [%CurrentUser%]) shows it to everyone else.
  var IS_USER = /(?:^|[^!<>])=\s*'?(?:\[%CurrentUser%\]|\$currentUser\b)|(?:\[%CurrentUser%\]|\$currentUser\b)'?\s*=/i;

  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }
  function shortName(qn) { var s = String(qn || ''); return s.slice(s.lastIndexOf('.') + 1); }

  // Every "$Var/Path/…" in an expression or an XPath, outside string literals.
  function refsIn(text) {
    var out = [];
    if (typeof text !== 'string') return out;
    var s = text.replace(/'[^']*'/g, "''");
    var re = /\$([A-Za-z_]\w*)((?:\/[A-Za-z_][\w.]*)*)/g, m;
    while ((m = re.exec(s))) out.push({ v: m[1], path: m[2] ? m[2].slice(1).split('/') : [] });
    return out;
  }
  // A bare "$Var" (an argument that hands over the variable itself).
  function bareVar(value) {
    var m = /^\s*\$([A-Za-z_]\w*)\s*$/.exec(String(value || ''));
    return m ? m[1] : null;
  }

  // ---------- the model, indexed once ----------
  function indexModel(model) {
    var ix = { entity: {}, assoc: {}, micro: {}, nano: {}, page: {}, userRoles: [] };
    (model.pages || []).forEach(function (p) { if (p && p.qualifiedName) ix.page[p.qualifiedName] = p; });
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) ix.entity[e.qualifiedName] = e; });
    (model.associations || []).forEach(function (a) {
      if (!a || !a.name) return;
      var qn = a.name.indexOf('.') === -1 && a.module ? a.module + '.' + a.name : a.name;
      ix.assoc[qn] = a;
    });
    (model.microflows || []).forEach(function (f) { if (f && f.qualifiedName) ix.micro[f.qualifiedName] = f; });
    (model.nanoflows || []).forEach(function (f) { if (f && f.qualifiedName) ix.nano[f.qualifiedName] = f; });
    ix.userRoles = (model.userRoles || []).filter(function (r) { return r && (r.moduleRoles || []).length; });
    return ix;
  }
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
  function isA(ix, entityQn, wanted) {
    var seen = {}, e = entityQn;
    while (e && !seen[e]) { if (e === wanted) return true; seen[e] = true; e = ix.entity[e] ? ix.entity[e].generalization : null; }
    return false;
  }
  // An attribute that says what state an object is in: an enumeration or a
  // boolean, or one whose name says so (Status, State, Phase).
  function isState(ix, entityQn, name) { return !!stateKind(ix, entityQn, name); }
  // How sure that is: 'typed' — an enumeration or a boolean; 'named' — only its name says so (a String
  // called Status), which is a hint, not proof that it is a state anyone protects.
  function stateKind(ix, entityQn, name) {
    if (!name || name.indexOf('.') !== -1) return null;
    var a = attrOf(ix, entityQn, name);
    if (a && (a.type === 'Enumeration' || a.type === 'Boolean')) return 'typed';
    return namedState(name) && (!!a || !ix.entity[entityQn]) ? 'named' : null;
  }
  // A non-persistable object is not data: changing or committing one stores
  // nothing, and its attributes are the page's own state, not the object's.
  function stored(ix, entityQn) { var e = ix.entity[entityQn]; return !e || e.persistable !== false; }
  // The end of an association a retrieve over it lands on, from where it started.
  function otherEnd(ix, assocQn, fromEntity) {
    var a = ix.assoc[assocQn];
    if (!a) return null;
    if (fromEntity && isA(ix, fromEntity, a.owner) && !isA(ix, fromEntity, a.other)) return a.other;
    if (fromEntity && isA(ix, fromEntity, a.other)) return a.owner;
    return a.other;
  }
  // The user roles that may call a flow: those carrying one of its allowed
  // module roles. A model without user roles is judged per module role.
  function callersOf(ix, flow) {
    var allowed = flow.allowedModuleRoles || [];
    if (!allowed.length) return [];
    if (!ix.userRoles.length) return allowed.map(function (mr) { return { name: mr, moduleRoles: [mr] }; });
    return ix.userRoles.filter(function (r) { return r.moduleRoles.some(function (mr) { return allowed.indexOf(mr) !== -1; }); });
  }

  // ---------- the drawing, as a graph to walk ----------
  function graphOf(flow) {
    var g = flow && flow.graph;
    if (!g || !g.nodes || !g.nodes.length) return null;
    var byId = {}, succ = {}, hasIn = {}, start = null;
    g.nodes.forEach(function (n) { byId[n.id] = n; succ[n.id] = []; if (n.kind === 'start' && !n.parentId) start = n.id; });
    (g.edges || []).forEach(function (e) {
      if (!e || e.kind === 'annotation' || !byId[e.from] || !byId[e.to]) return;
      succ[e.from].push(e.to);
      hasIn[e.to] = true;
    });
    // A loop's body has no edge into it: its first step is the one nothing
    // inside points at, entered from the loop itself.
    g.nodes.forEach(function (n) {
      if (n.parentId && byId[n.parentId] && !hasIn[n.id] && n.kind !== 'annotation' && n.kind !== 'parameter') succ[n.parentId].push(n.id);
    });
    if (!start) return null;
    return { nodes: g.nodes, byId: byId, succ: succ, start: start };
  }
  function reach(G, from, avoid) {
    var seen = {};
    if (from === avoid) return seen;
    var queue = [from];
    seen[from] = true;
    while (queue.length) {
      var id = queue.shift();
      (G.succ[id] || []).forEach(function (to) {
        if (to === avoid || seen[to]) return;
        seen[to] = true;
        queue.push(to);
      });
    }
    return seen;
  }
  // For each decision: what is still reachable without passing it, and what
  // each of its branches reaches. A decision stands in front of a step when
  // the step cannot be reached without it and one branch never gets there.
  function decisionsOf(G) {
    var all = reach(G, G.start, null);
    return {
      reachable: all,
      list: G.nodes.filter(function (n) { return n.kind === 'decision' && all[n.id]; }).map(function (d) {
        return { node: d, without: reach(G, G.start, d.id), branches: (G.succ[d.id] || []).map(function (to) { return reach(G, to, d.id); }) };
      })
    };
  }
  function guardsIn(D, nodeId) {
    if (!D.reachable[nodeId]) return [];
    return D.list.filter(function (d) {
      return d.node.id !== nodeId && !d.without[nodeId] && d.branches.some(function (b) { return !b[nodeId]; });
    });
  }

  // ---------- one flow, from its object parameters ----------
  // `seed` is { paramName: { from, entity } } — the caller's object under the
  // parameter's name, when this flow is one level down.
  function trace(ix, flow, seed) {
    var G = graphOf(flow);
    var tracked = {};   // var -> { from, entity, how, owner?: xpath, states?: [attr] }
    var checkVars = {}; // var -> { kind: 'owner', text } — a retrieve narrowed to the user and to the object
    var callOut = {};   // var -> { flow, args: { param: from } } — what a call handed back
    Object.keys(seed).forEach(function (p) { tracked[p] = { from: seed[p].from, entity: seed[p].entity, how: 'parameter' }; });
    if (!G) return { G: null, tracked: tracked, checkVars: checkVars, callOut: callOut };
    function derive(base, entity, how) {
      var t = { from: base.from, entity: entity, how: how };
      if (base.owner) t.owner = base.owner;
      if (base.states) t.states = base.states.slice();
      return t;
    }
    var changed = true, rounds = 0;
    while (changed && rounds++ < 8) {
      changed = false;
      G.nodes.forEach(function (n) {
        var p = n.props || {};
        if (n.kind === 'loop' && n.loop && n.loop.iteratorVariable && tracked[n.loop.listVariable] && !tracked[n.loop.iteratorVariable]) {
          tracked[n.loop.iteratorVariable] = derive(tracked[n.loop.listVariable], tracked[n.loop.listVariable].entity, 'iterator');
          changed = true;
          return;
        }
        if (n.kind !== 'activity' || !p.out || tracked[p.out]) return;
        if (n.action === 'RetrieveAction') {
          if (p.source === 'By association' && tracked[p.from]) {
            tracked[p.out] = derive(tracked[p.from], otherEnd(ix, p.association, tracked[p.from].entity), 'association');
            changed = true;
          } else if (p.source === 'From database' && p.xpath) {
            var hit = refsIn(p.xpath).filter(function (r) { return tracked[r.v]; })[0];
            if (!hit) return;
            var user = USER.test(p.xpath);
            var narrowsSame = p.entity && isA(ix, p.entity, tracked[hit.v].entity);
            if (user && !checkVars[p.out]) { checkVars[p.out] = { kind: 'owner', text: p.xpath, from: tracked[hit.v].from }; changed = true; }
            if (narrowsSame || !user) {
              var t = derive(tracked[hit.v], p.entity, 'xpath');
              if (user) t.owner = p.xpath;
              var states = xpathStates(ix, p.entity, p.xpath);
              if (states.length) t.states = uniq((t.states || []).concat(states.map(function (s) { return { attribute: s, text: p.xpath }; })));
              tracked[p.out] = t;
              changed = true;
            }
          }
        } else if (n.action === 'CreateChangeAction') {
          var link = (n.fields || []).filter(function (f) { return f.association && tracked[bareVar(f.value)]; })[0];
          if (link) { tracked[p.out] = derive(tracked[bareVar(link.value)], p.entity, 'linked'); changed = true; }
        } else if (n.action === 'MicroflowCallAction' && p.target) {
          var args = {};
          (n.fields || []).forEach(function (f) { var v = bareVar(f.value); if (v && tracked[v]) args[f.name] = tracked[v]; });
          if (Object.keys(args).length && !callOut[p.out]) { callOut[p.out] = { flow: p.target, args: args }; changed = true; }
        }
      });
    }
    return { G: G, tracked: tracked, checkVars: checkVars, callOut: callOut };
  }
  // State attributes an XPath compares, e.g. "[Status = 'Open']".
  function xpathStates(ix, entityQn, xpath) {
    var out = [], s = String(xpath || '').replace(/'[^']*'/g, "''"), re = /(?:^|[\[\s(]|and |or )([A-Za-z_]\w*)\s*(?:!=|=|<|>)/g, m;
    while ((m = re.exec(s))) if (m[1] !== 'id' && isState(ix, entityQn, m[1]) && out.indexOf(m[1]) === -1) out.push(m[1]);
    return out;
  }

  // What one decision checks about the tracked objects.
  function classify(ix, T, d, depth, notChecked, where) {
    var node = d.node, out = { state: [], owner: [], maybe: [] };
    var caption = node.caption || node.title || (node.expression ? node.expression.replace(/\s+/g, ' ') : node.rule ? shortName(node.rule) : 'decision');
    var label = { decision: caption, flow: where };
    if (node.rule) {
      var handed = (node.ruleArgs || []).some(function (a) { return T.tracked[bareVar(a.value)]; });
      // A rule handed the object may be the very check: what stands in front is not known, so it is a
      // doubt about any finding behind it, never a guard and never nothing.
      if (handed) { notChecked.push({ kind: 'rule', name: node.rule, at: where }); out.maybe.push({ kind: 'rule', name: node.rule, at: where }); }
      return out;
    }
    var text = node.expression || '';
    if (!text) return out;
    var refs = refsIn(text), touches = false;
    refs.forEach(function (r) {
      var t = T.tracked[r.v];
      if (t) {
        touches = true;
        if (r.path.length && isState(ix, t.entity, r.path[0])) {
          out.state.push({ attribute: r.path[0], entity: t.entity, from: t.from, text: oneLine(text), decision: label.decision, flow: where });
        }
      }
      if (T.checkVars[r.v]) out.owner.push({ from: T.checkVars[r.v].from, text: oneLine(text), decision: label.decision, flow: where, xpath: T.checkVars[r.v].text });
      var call = T.callOut[r.v];
      if (call) {
        // A decision on what a microflow handed back: what THAT flow checks
        // about the object, one level down; deeper is not checked.
        if (depth > 0) { notChecked.push({ kind: 'flow', name: call.flow, at: where }); out.maybe.push({ kind: 'flow', name: call.flow, at: where }); return; }
        var sub = ix.micro[call.flow];
        if (!sub) { notChecked.push({ kind: 'flow', name: call.flow, at: where }); out.maybe.push({ kind: 'flow', name: call.flow, at: where }); return; }
        var found = checksIn(ix, sub, call.args, notChecked);
        out.maybe = out.maybe.concat(found.maybe);
        found.state.forEach(function (s) { out.state.push({ attribute: s.attribute, entity: s.entity, from: s.from, text: oneLine(text), decision: label.decision, flow: where, via: call.flow, inner: s.text }); });
        found.owner.forEach(function (s) { out.owner.push({ from: s.from, text: oneLine(text), decision: label.decision, flow: where, via: call.flow, inner: s.text }); });
      }
    });
    if (touches && USER.test(text)) {
      var from = refs.map(function (r) { return T.tracked[r.v] && T.tracked[r.v].from; }).filter(Boolean)[0];
      out.owner.push({ from: from, text: oneLine(text), decision: label.decision, flow: where });
    }
    return out;
  }
  function oneLine(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  // Everything a microflow one level down checks about what it was handed,
  // wherever in it: it was called to decide, and its answer is what counts.
  function checksIn(ix, flow, args, notChecked) {
    var seed = {};
    Object.keys(args).forEach(function (p) { seed[p] = { from: args[p].from, entity: args[p].entity }; });
    var T = trace(ix, flow, seed), out = { state: [], owner: [], maybe: [] };
    if (!T.G) { out.maybe.push({ kind: 'flow', name: flow.qualifiedName, at: flow.qualifiedName, why: 'no drawing' }); return out; }
    var D = decisionsOf(T.G);
    D.list.forEach(function (d) {
      var c = classify(ix, T, d, 1, notChecked, flow.qualifiedName);
      out.state = out.state.concat(c.state);
      out.owner = out.owner.concat(c.owner);
      out.maybe = out.maybe.concat(c.maybe);
    });
    return out;
  }

  // What a helper stops on: each decision in it with a branch that ends only in an error event (nothing on it
  // reaches an end event), read like any decision about the objects it was handed.
  function abortsIn(ix, sub, args, notChecked) {
    var seed = {}, out = { state: [], owner: [], maybe: [] };
    Object.keys(args).forEach(function (k) { seed[k] = { from: args[k].from, entity: args[k].entity }; });
    var T = trace(ix, sub, seed);
    if (!T.G) return out;
    var D = decisionsOf(T.G);
    var kind = function (id) { return (T.G.byId[id] || {}).kind; };
    D.list.forEach(function (d) {
      var stops = d.branches.some(function (b) {
        var ids = Object.keys(b);
        return ids.some(function (id) { return kind(id) === 'errorEvent'; }) && !ids.some(function (id) { return kind(id) === 'end'; });
      });
      if (!stops) return;
      var c = classify(ix, T, d, 1, notChecked, sub.qualifiedName);
      c.state.forEach(function (x) { x.via = sub.qualifiedName; out.state.push(x); });
      c.owner.forEach(function (x) { x.via = sub.qualifiedName; out.owner.push(x); });
      out.maybe = out.maybe.concat(c.maybe);
    });
    return out;
  }

  // The steps a flow takes on the tracked objects, each with what stands in
  // front of it. `inherited` are the caller's guards in front of the call.
  function stepsOf(ix, flow, seed, depth, inherited, notChecked, callers) {
    var T = trace(ix, flow, seed), steps = [];
    if (!T.G) { if (depth > 0) notChecked.push({ kind: 'flow', name: flow.qualifiedName, at: flow.qualifiedName, why: 'no drawing' }); return steps; }
    var D = decisionsOf(T.G);
    var memo = {};
    // A Java action handed one of the objects, on every path to a step: it may check and stop the flow
    // (an exception), and MxScout cannot read it — a doubt in front of that step.
    var javaAt = [];
    T.G.nodes.forEach(function (n) {
      var p = n.props || {};
      if (n.kind !== 'activity' || n.action !== 'JavaActionCallAction' || !p.target || n.disabled || !D.reachable[n.id]) return;
      if ((n.fields || []).some(function (f) { var v = bareVar(f.value); return v && T.tracked[v]; })) javaAt.push({ id: n.id, name: p.target, without: reach(T.G, T.G.start, n.id) });
    });
    // A microflow handed one of the objects, on every path to a step, that stops with an error event when its
    // own decision on that object says no — a validation helper (VAL_…, a Marketplace module's): what it
    // decides on is a check in front of the step. One deeper than MxScout follows, or not readable, is a doubt.
    var callsAt = [];
    T.G.nodes.forEach(function (n) {
      var p = n.props || {};
      if (legacyHelpers || n.kind !== 'activity' || n.action !== 'MicroflowCallAction' || !p.target || n.disabled || !D.reachable[n.id]) return;
      var args = {};
      (n.fields || []).forEach(function (f) { var v = bareVar(f.value); if (v && T.tracked[v]) args[f.name] = T.tracked[v]; });
      if (!Object.keys(args).length) return;
      var sub = ix.micro[p.target], c = { id: n.id, without: reach(T.G, T.G.start, n.id), state: [], owner: [], maybe: [] };
      if (depth > 0 || !sub || !graphOf(sub)) c.maybe.push({ kind: 'flow', name: p.target, at: flow.qualifiedName, why: !sub ? 'not in this model' : depth > 0 ? 'two levels down' : 'no drawing' });
      else {
        var a = abortsIn(ix, sub, args, notChecked);
        c.state = a.state; c.owner = a.owner; c.maybe = a.maybe;
      }
      if (c.state.length || c.owner.length || c.maybe.length) callsAt.push(c);
    });
    function guardsAt(nodeId, t) {
      var g = { state: inherited.state.slice(), owner: inherited.owner.slice(), maybe: (inherited.maybe || []).slice() };
      if (!memo[nodeId]) {
        memo[nodeId] = { state: [], owner: [], maybe: [] };
        guardsIn(D, nodeId).forEach(function (d) {
          var c = classify(ix, T, d, depth, notChecked, flow.qualifiedName);
          memo[nodeId].state = memo[nodeId].state.concat(c.state);
          memo[nodeId].owner = memo[nodeId].owner.concat(c.owner);
          memo[nodeId].maybe = memo[nodeId].maybe.concat(c.maybe);
        });
        javaAt.forEach(function (j) { if (j.id !== nodeId && !j.without[nodeId]) memo[nodeId].maybe.push({ kind: 'java', name: j.name, at: flow.qualifiedName }); });
        callsAt.forEach(function (c) {
          if (c.id === nodeId || c.without[nodeId]) return;
          memo[nodeId].state = memo[nodeId].state.concat(c.state);
          memo[nodeId].owner = memo[nodeId].owner.concat(c.owner);
          memo[nodeId].maybe = memo[nodeId].maybe.concat(c.maybe);
        });
      }
      g.state = g.state.concat(memo[nodeId].state);
      g.owner = g.owner.concat(memo[nodeId].owner);
      g.maybe = g.maybe.concat(memo[nodeId].maybe);
      if (t && t.owner) g.owner.push({ from: t.from, text: oneLine(t.owner), decision: 'retrieve', flow: flow.qualifiedName, xpath: t.owner });
      if (t && t.states) t.states.forEach(function (s) { g.state.push({ attribute: s.attribute, entity: t.entity, from: t.from, text: oneLine(s.text), decision: 'retrieve', flow: flow.qualifiedName }); });
      if (t) {
        var r = ruleGuard(ix, flow, t.entity, callers);
        if (r) {
          if (r.owner) g.owner.push({ from: t.from, text: r.xpaths.join(' | '), decision: 'access rule', flow: flow.qualifiedName, rule: true });
          r.states.forEach(function (a) { g.state.push({ attribute: a, entity: t.entity, from: t.from, text: r.xpaths.join(' | '), decision: 'access rule', flow: flow.qualifiedName, rule: true }); });
        }
      }
      function once(list) {
        var seen = {};
        return list.filter(function (x) { var k = [x.attribute, x.decision, x.via, x.flow].join('|'); if (seen[k]) return false; seen[k] = true; return true; });
      }
      var said = {};
      return { state: once(g.state), owner: once(g.owner), maybe: g.maybe.filter(function (x) { var k = x.kind + ' ' + x.name; if (said[k]) return false; said[k] = true; return true; }) };
    }
    function push(n, kind, varName, extra) {
      var t = T.tracked[varName];
      // Opening a page with it hands the object to a form, persistable or not.
      if (kind !== 'page' && !stored(ix, t.entity)) return;
      var s = { node: n.id, flow: flow.qualifiedName, depth: depth, kind: kind, variable: varName, from: t.from, entity: t.entity, how: t.how };
      Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
      s.guards = guardsAt(n.id, t);
      steps.push(s);
    }
    T.G.nodes.forEach(function (n) {
      if (n.kind !== 'activity' || !D.reachable[n.id] || n.disabled) return;
      var p = n.props || {};
      // `events`: the entity's own before-commit (before-delete) microflows run first — the server's checks
      // before the step takes effect; a commit without events skips them.
      if (n.action === 'ChangeAction' && T.tracked[p.object]) {
        push(n, 'change', p.object, { members: (n.fields || []).map(function (f) { return f.name; }), stored: !!p.commit && p.commit !== 'No', events: p.commit === 'Yes' });
      } else if (n.action === 'CommitAction' && T.tracked[p.object]) {
        push(n, 'commit', p.object, { stored: true, events: p.withEvents !== 'No' });
      } else if (n.action === 'DeleteAction' && T.tracked[p.object]) {
        push(n, 'delete', p.object, { stored: true, events: true });
      } else if (n.action === 'CreateChangeAction' && p.out && T.tracked[p.out] && T.tracked[p.out].how === 'linked') {
        push(n, 'create', p.out, { stored: !!p.commit && p.commit !== 'No', events: p.commit === 'Yes' });
      } else if (n.action === 'ShowFormAction') {
        var shown = (n.fields || []).map(function (f) { return bareVar(f.value); }).filter(function (v) { return v && T.tracked[v]; })[0];
        if (shown) push(n, 'page', shown, { page: n.ref || null, stored: false });
      } else if (n.action === 'MicroflowCallAction' && p.target) {
        var args = {};
        (n.fields || []).forEach(function (f) { var v = bareVar(f.value); if (v && T.tracked[v]) args[f.name] = T.tracked[v]; });
        if (!Object.keys(args).length) return;
        var sub = ix.micro[p.target];
        if (depth > 0 || !sub) { notChecked.push({ kind: 'flow', name: p.target, at: flow.qualifiedName, why: sub ? 'two levels down' : 'not in this model' }); return; }
        var seed2 = {};
        Object.keys(args).forEach(function (k) { seed2[k] = { from: args[k].from, entity: args[k].entity }; });
        var here = guardsAt(n.id, null);
        steps = steps.concat(stepsOf(ix, sub, seed2, depth + 1, here, notChecked, callers));
      } else if (n.action === 'JavaActionCallAction' && p.target) {
        var java = (n.fields || []).some(function (f) { var v = bareVar(f.value); return v && T.tracked[v]; });
        if (java) notChecked.push({ kind: 'java', name: p.target, at: flow.qualifiedName });
      }
    });
    return steps;
  }

  // A microflow that applies entity access is held by the rules: when every
  // rule the calling roles hold on the entity keeps the rows to the user, or
  // names a state attribute, that is a guard. Without entity access — or for
  // a role with no XPath — it is not.
  function ruleGuard(ix, flow, entityQn, callers) {
    if (!flow.applyEntityAccess || !entityQn || !callers.length) return null;
    var e = ix.entity[entityQn];
    if (!e) return null;
    var restricts = window.MxAccounts && window.MxAccounts.restrictsToUser;
    var owner = true, states = null, xpaths = [];
    var any = callers.every(function (role) {
      var rules = (e.accessRules || []).filter(function (r) { return r && role.moduleRoles.indexOf(r.moduleRole) !== -1; });
      if (!rules.length) return false;
      rules.forEach(function (r) {
        var x = r.xpathConstraint || '';
        if (x) xpaths.push(oneLine(x));
        if (!x || !(restricts ? restricts(x) : USER.test(x))) owner = false;
        var s = x ? xpathStates(ix, entityQn, x) : [];
        states = states === null ? s : states.filter(function (a) { return s.indexOf(a) !== -1; });
      });
      return true;
    });
    if (!any) return null;
    states = states || [];
    if (!owner && !states.length) return null;
    return { owner: owner, states: states, xpaths: uniq(xpaths) };
  }

  // ---------- where the flow is called from on a page ----------
  // Every trigger — button, link, a click on a row, an image — on every page
  // and snippet, with the visibility and editability conditions on it and on
  // every container around it.
  function triggersOf(model) {
    var byFlow = {};
    function walk(nodes, owner, kind, conds) {
      (nodes || []).forEach(function (w) {
        if (!w || typeof w !== 'object') return;
        var here = conds.slice();
        if (w.visible) here.push({ on: w.kind === 'button' ? 'button' : (w.kind || 'container'), shown: true, cond: w.visible });
        var own = here.slice();
        if (w.editableIf && Object.keys(w.editableIf).length) own.push({ on: 'button', editable: true, cond: w.editableIf });
        (w.actions || []).forEach(function (a) {
          if (!a || (a.kind !== 'microflow' && a.kind !== 'nanoflow') || !a.flow) return;
          (byFlow[a.flow] = byFlow[a.flow] || []).push({
            page: owner, pageKind: kind, widget: w.name || null, widgetKind: w.kind, caption: w.caption || null,
            calls: a.kind, args: a.args || [], conditions: own
          });
        });
        Object.keys(w).forEach(function (k) {
          if (k === 'actions' || k === 'args' || !Array.isArray(w[k])) return;
          walk(w[k], owner, kind, here);
        });
      });
    }
    (model.pages || []).forEach(function (p) { if (p.structure) walk(p.structure.regions, p.qualifiedName, 'page', []); });
    (model.snippets || []).forEach(function (p) { if (p.structure) walk(p.structure.regions, p.qualifiedName, 'snippet', []); });
    return byFlow;
  }
  // What a condition on a trigger says about the objects the flow is handed:
  // [{ kind: 'state'|'owner', param, attribute?, text }].
  function readCondition(ix, c, trigger, params) {
    var out = [], cond = c.cond || {};
    function paramFor(varName) {
      var a = (trigger.args || []).filter(function (x) { return bareVar(x.value) === varName; })[0];
      return a ? params.filter(function (p) { return p.name === a.name; })[0] || null : null;
    }
    function byAttribute(name) {
      var hits = params.filter(function (p) { return attrOf(ix, p.entity, name); });
      return hits.length === 1 ? hits[0] : null;
    }
    var prefix = c.editable ? 'editable when ' : 'shown when ';
    if (cond.attribute) {
      var attr = shortName(cond.attribute), ent = cond.attribute.slice(0, cond.attribute.length - attr.length - 1);
      var p = (cond.of && paramFor(cond.of.replace(/^\$/, ''))) ||
        params.filter(function (x) { return isA(ix, x.entity, ent) || isA(ix, ent, x.entity); })[0] || null;
      if (p && stored(ix, ent) && isState(ix, ent, attr)) out.push({ kind: 'state', param: p.name, attribute: attr, text: prefix + shortName(ent) + '.' + attr + ' is ' + ((cond.values || []).join(' or ') || 'set') });
      return out;
    }
    if (!cond.expression) return out;
    var refs = refsIn(cond.expression), owner = null;
    refs.forEach(function (r) {
      if (!r.path.length) return;
      var p = paramFor(r.v) || byAttribute(r.path[0]);
      if (!p) return;
      if (stored(ix, p.entity) && isState(ix, p.entity, r.path[0]) && !out.some(function (o) { return o.kind === 'state' && o.attribute === r.path[0]; })) {
        out.push({ kind: 'state', param: p.name, attribute: r.path[0], text: prefix + oneLine(cond.expression) });
      }
      if (!owner) owner = p;
    });
    if (owner && IS_USER.test(cond.expression)) out.push({ kind: 'owner', param: owner.name, text: prefix + oneLine(cond.expression) });
    return out;
  }

  // ---------- the whole check ----------
  // Returns
  //   { flows: { qualifiedName: Result }, list: [Result], findings: [Finding], notes: [Note] }
  //   Result  = { qualifiedName, kind: 'microflow'|'nanoflow', applyEntityAccess, callers: [userRole],
  //               params: [{ name, entity }], triggers: [Trigger], steps: [Step],
  //               verdict: 'state'|'owner'|'both'|'none'|'no-steps'|'rules', stateAttrs: [name],
  //               notChecked: [{ kind: 'flow'|'java'|'rule', name, at, why? }], sameEntity: [{ entity, params }] }
  //   Step    = { node, flow, depth, kind: 'change'|'commit'|'delete'|'create'|'page', variable, from, entity,
  //               members?, page?, stored, guards: { state: [Guard], owner: [Guard] } }
  //   Finding = { kind: 'page-hides'|'bypass-xpath', priority: 'P1'|'P2', flow, text, … }
  // opts: { legacyNames: true } — state names read as the rules before did (see namedState);
  //       { stateUse } — editscope.js's stateUse for this model, when the caller has it already.
  // { legacyHelpers: true } — a helper's error event is no check, as the rules before read it (secrisks.js, withdrawn).
  function analyse(model, opts) {
    var was = legacyNames, wasH = legacyHelpers;
    legacyNames = !!(opts && opts.legacyNames);
    legacyHelpers = !!(opts && opts.legacyHelpers);
    try { return analyseNow(model || {}, opts || {}); } finally { legacyNames = was; legacyHelpers = wasH; }
  }
  function analyseNow(model, opts) {
    var ix = indexModel(model);
    var triggers = triggersOf(model);
    var out = { flows: {}, list: [], findings: [], notes: [] };
    // Who sets each state attribute, and how (editscope.js): the difference between a state the role may
    // not reach and a setting it switches itself. Without it, a role's write right on the attribute is a doubt.
    var stateUse = opts.stateUse !== undefined ? opts.stateUse
      : window.MxEditScope && window.MxEditScope.stateUse ? window.MxEditScope.stateUse(model, { legacyNames: legacyNames }) : null;
    var ctx = { model: model, stateUse: stateUse };

    function judge(flow, kind) {
      var params = (flow.parameters || []).filter(function (p) { return p && p.entityQualifiedName && !p.isList; })
        .map(function (p) { return { name: p.name, entity: p.entityQualifiedName }; });
      if (!params.length) return;
      var callers = callersOf(ix, flow);
      if (!callers.length) return;
      var r = {
        qualifiedName: flow.qualifiedName, name: flow.name, module: flow.module, kind: kind,
        applyEntityAccess: kind === 'microflow' ? !!flow.applyEntityAccess : true,
        callers: callers.map(function (c) { return c.name; }), params: params,
        triggers: triggers[flow.qualifiedName] || [], steps: [], verdict: 'rules', stateAttrs: [], notChecked: [], sameEntity: []
      };
      var byEntity = {};
      params.forEach(function (p) { (byEntity[p.entity] = byEntity[p.entity] || []).push(p.name); });
      Object.keys(byEntity).forEach(function (e) { if (byEntity[e].length > 1) r.sameEntity.push({ entity: e, params: byEntity[e] }); });

      if (kind === 'microflow') {
        var seed = {};
        params.forEach(function (p) { seed[p.name] = { from: p.name, entity: p.entity }; });
        var notChecked = [];
        r.steps = stepsOf(ix, flow, seed, 0, { state: [], owner: [], maybe: [] }, notChecked, callers);
        var seen = {};
        r.notChecked = notChecked.filter(function (n) { var k = n.kind + ' ' + n.name; if (seen[k]) return false; seen[k] = true; return true; });
        r.verdict = verdictOf(r.steps);
        r.stateAttrs = stateAttrsOf(r.steps);
      }
      out.flows[flow.qualifiedName] = r;
      out.list.push(r);
    }
    (model.microflows || []).forEach(function (f) { judge(f, 'microflow'); });
    (model.nanoflows || []).forEach(function (f) { if (!out.flows[f.qualifiedName]) judge(f, 'nanoflow'); });

    out.list.forEach(function (r) {
      // Worth knowing: two objects of one entity, each handed over by its id.
      r.sameEntity.forEach(function (s) {
        out.notes.push({ kind: 'same-entity', flow: r.qualifiedName, flowKind: r.kind, entity: s.entity, params: s.params,
          text: r.qualifiedName + ' takes ' + s.params.map(function (p) { return '$' + p; }).join(' and ') + ', both ' + s.entity +
            ': whoever calls it hands each over by its id, so it may be given the same object twice, or two that do not belong together.' });
      });
      if (r.kind !== 'microflow') return;
      pageHides(ix, r, out.findings, ctx);
    });
    bypassXpath(ix, model, out.findings);
    var said = {};
    out.findings = out.findings.filter(function (f) { if (said[f.text]) return false; said[f.text] = true; return true; });
    var order = { P1: 0, P2: 1 };
    out.findings.sort(function (a, b) { return order[a.priority] - order[b.priority] || a.kind.localeCompare(b.kind) || a.flow.localeCompare(b.flow); });
    return out;
  }

  // ---------- what the server checks before a step takes effect ----------
  // The before-commit (before-delete) microflows of the entity and of every entity it specializes. One that
  // can refuse (it returns a Boolean, or raises an error on false) and reads one of `attrs` of the object it
  // is handed in a decision — or the signed-in user, for an owner — or hands the object to a microflow, a
  // rule or a Java action, may stop the step: a doubt. One MxScout cannot read is a doubt as well. One that
  // cannot refuse, or reads none of them, is said as evidence that it does not.
  // → { doubts: [{ microflow, why }], clear: [microflow] }
  function serverChecksIn(ix, entityQn, type, attrs, owner) {
    var out = { doubts: [], clear: [] }, seen = {}, e = ix.entity[entityQn];
    attrs = attrs || [];
    while (e && !seen[e.qualifiedName]) {
      seen[e.qualifiedName] = true;
      (e.events || []).forEach(function (ev) {
        if (!ev || ev.moment !== 'before' || ev.type !== type || !ev.microflow) return;
        var mf = ix.micro[ev.microflow];
        if (!mf) { out.doubts.push({ microflow: ev.microflow, why: 'runs before every ' + type + ' and is not in this model, so what it checks is not known' }); return; }
        var refuses = ev.raiseErrorOnFalse || /^Boolean$/i.test(String(mf.returnType || ''));
        if (!refuses) { out.clear.push(ev.microflow); return; }
        var G = graphOf(mf);
        if (!G) { out.doubts.push({ microflow: ev.microflow, why: 'runs before every ' + type + ', may refuse it, and MxScout cannot read it (no drawing)' }); return; }
        var params = (mf.parameters || []).filter(function (p) { return p && p.entityQualifiedName && !p.isList; }).map(function (p) { return p.name; });
        var handed = function (fields) { return (fields || []).some(function (a) { return params.indexOf(bareVar(a.value)) !== -1; }); };
        var why = null;
        G.nodes.forEach(function (n) {
          if (why || n.disabled) return;
          if (n.kind === 'decision') {
            if (n.rule && handed(n.ruleArgs)) { why = 'hands the object to the rule ' + n.rule; return; }
            var refs = refsIn(n.expression || '');
            var hit = refs.filter(function (r) { return params.indexOf(r.v) !== -1 && r.path.length && attrs.indexOf(r.path[0]) !== -1; })[0];
            if (hit) why = 'reads ' + hit.path[0] + ' (' + oneLine(n.expression) + ')';
            else if (owner && USER.test(n.expression || '') && refs.some(function (r) { return params.indexOf(r.v) !== -1; })) why = 'compares the object with the signed-in user (' + oneLine(n.expression) + ')';
          } else if (n.kind === 'activity' && (n.action === 'MicroflowCallAction' || n.action === 'JavaActionCallAction') && n.props && n.props.target && handed(n.fields)) {
            why = 'hands the object to ' + n.props.target + ', which MxScout does not follow here';
          }
        });
        if (why) out.doubts.push({ microflow: ev.microflow, why: 'runs before every ' + type + ', may refuse it, and ' + why });
        else out.clear.push(ev.microflow);
      });
      e = e.generalization ? ix.entity[e.generalization] : null;
    }
    return out;
  }
  var ixCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function serverChecks(model, entityQn, type, attrs, owner) {
    var ix = ixCache && model && typeof model === 'object' ? ixCache.get(model) : null;
    if (!ix) { ix = indexModel(model || {}); if (ixCache && model && typeof model === 'object') ixCache.set(model, ix); }
    return serverChecksIn(ix, entityQn, type, attrs, owner);
  }

  // ---------- how strong a page-hides finding is ----------
  // A condition on a page is a hint, not proof: it says what the page offers, not what the role may not do.
  // A finding is CONFIRMED only when at least one of its conditions is a state the role cannot simply set
  // itself (typed, enumeration or boolean, and read-only for the role or changed only behind a check of its
  // own value) or an owner the role can read past, and a step on that object is unchecked with nothing in
  // front of it that MxScout cannot read — no rule, Java action or flow beyond what it follows, no
  // before-commit or before-delete microflow that may refuse it. Anything less is TO VERIFY: the doubts say
  // what to look at. Nothing here makes a finding go away; it says how sure it is.
  function roleObjects(ix, names) {
    return (names || []).map(function (n) {
      return ix.userRoles.filter(function (r) { return r.name === n; })[0] || { name: n, moduleRoles: [n] };
    });
  }
  function rulesOf(ix, entityQn, role) {
    var out = [], seen = {}, e = ix.entity[entityQn];
    while (e && !seen[e.qualifiedName]) {
      seen[e.qualifiedName] = true;
      (e.accessRules || []).forEach(function (r) { if (r && role.moduleRoles.indexOf(r.moduleRole) !== -1) out.push(r); });
      e = e.generalization ? ix.entity[e.generalization] : null;
    }
    return out;
  }
  function useOfState(ctx, role, entityQn, attr, ix) {
    var su = ctx.stateUse && ctx.stateUse[role.name];
    if (!su) return null;
    var seen = {}, e = entityQn;
    while (e && !seen[e]) {
      seen[e] = true;
      if (su[e] && su[e][attr]) return su[e][attr];
      e = ix.entity[e] ? ix.entity[e].generalization : null;
    }
    return null;
  }
  // Another trigger of the same microflow that offers it to `role` with the object `c.param` stands for, and
  // without the condition c — on a page the role may open, not hidden from it by a role condition. A snippet's
  // trigger counts only through the pages that place it, which this does not follow: it is no other way in.
  function elsewhere(ix, r, f, c, role) {
    var hit = null;
    r.triggers.forEach(function (tr) {
      if (hit || [tr.page, tr.widget || tr.caption, r.qualifiedName].join(' ') === f.triggerKey) return;
      var pg = tr.pageKind === 'page' ? ix.page[tr.page] : null;
      if (!pg || !(pg.allowedModuleRoles || []).some(function (mr) { return role.moduleRoles.indexOf(mr) !== -1; })) return;
      if (!(tr.args || []).some(function (a) { return a.name === c.param; })) return;
      if (tr.conditions.some(function (x) { var rs = x.cond && x.cond.roles; return rs && rs.length && !rs.some(function (mr) { return role.moduleRoles.indexOf(mr) !== -1; }); })) return;
      var same = tr.conditions.some(function (x) {
        return readCondition(ix, x, tr, r.params).some(function (y) { return y.param === c.param && y.kind === c.kind && (c.kind === 'owner' || y.attribute === c.attribute); });
      });
      if (!same) hit = 'is offered ' + r.qualifiedName + ' by “' + (tr.caption || tr.widget || tr.widgetKind) + '” on ' + tr.page + ' with no such condition';
    });
    return hit;
  }
  // The same change, on a form: every step left unchecked only changes (and commits) members `role` edits
  // somewhere with no state condition at all (editscope.js stateUse, open).
  function sameWrite(ctx, ix, steps, role) {
    if (!steps.length || !steps.every(function (st) { return st.kind === 'change' || st.kind === 'commit'; })) return null;
    var members = [], ent = null;
    steps.forEach(function (st) { if (st.kind === 'change') { ent = st.entity; (st.members || []).forEach(function (m) { m = shortName(m); if (members.indexOf(m) === -1) members.push(m); }); } });
    if (!members.length) return null;
    var at = [];
    var all = members.every(function (m) { var u = useOfState(ctx, role, ent, m, ix); if (u && u.open) { if (u.openAt) at.push(m + ' ' + u.openAt); return true; } return false; });
    return all ? 'changes ' + andList(members) + ' itself, in every state (' + at.join('; ') + ')' : null;
  }
  function assess(ix, r, f, ctx) {
    var roles = roleObjects(ix, r.callers), restricts = window.MxAccounts && window.MxAccounts.restrictsToUser;
    var who = andList(roles.map(function (x) { return '"' + x.name + '"'; }));
    var judged = f.conditions.map(function (c) {
      var p = r.params.filter(function (x) { return x.name === c.param; })[0] || {}, pe = p.entity, own = [], ev = [];
      if (roles.length && roles.every(function (role) { return !rulesOf(ix, pe, role).length; })) own.push('None of ' + who + ' holds an access rule on ' + shortName(pe) + ': the object reaches the flow only where something else hands it over.');
      if (c.kind === 'state') {
        var kind = stateKind(ix, pe, c.attribute), a = attrOf(ix, pe, c.attribute);
        if (kind === 'named') own.push(c.attribute + ' is ' + (a && a.type ? 'a ' + a.type + ' attribute' : 'an attribute') + ' that only its name marks as a state — a hint, not a state the model shows anyone protecting.');
        else ev.push(c.attribute + ' is ' + (a && a.type === 'Boolean' ? 'a boolean' : 'an enumeration') + ' of ' + shortName(pe) + '.');
        var readOnly = [];
        roles.forEach(function (role) {
          var writable = rulesOf(ix, pe, role).some(function (x) { return (x.attrAccess || {})[c.attribute] === 'rw'; });
          if (!writable) { readOnly.push(role.name); return; }
          var u = useOfState(ctx, role, pe, c.attribute, ix);
          if (!u) own.push('"' + role.name + '" may write ' + c.attribute + ' by its access rule, and where it changes it was not followed.');
          else if (u.free) own.push('"' + role.name + '" sets ' + c.attribute + ' itself' + (u.where ? ' (' + u.where + ')' : '') + ' with no condition on its value, so the page’s condition is how the form behaves, not a state the role may not reach.');
          else if (!u.places) own.push('"' + role.name + '" may write ' + c.attribute + ' by its access rule and nothing it reaches changes it: whether ' + c.attribute + ' is a state it must not reach or a setting it may change, the model does not say.');
          else ev.push('"' + role.name + '" changes ' + c.attribute + ' only behind a check of its value' + (u.where ? ' (' + u.where + ')' : '') + '.');
        });
        if (readOnly.length) ev.push(c.attribute + ' is read-only for ' + andList(readOnly.map(function (x) { return '"' + x + '"'; })) + ': only the server sets it.');
        if (!r.applyEntityAccess && roles.length && roles.every(function (role) {
          var rules = rulesOf(ix, pe, role);
          return rules.length && rules.every(function (x) { return x.xpathConstraint && xpathStates(ix, pe, x.xpathConstraint).indexOf(c.attribute) !== -1; });
        })) own.push('Every access rule of ' + who + ' on ' + shortName(pe) + ' names ' + c.attribute + ' in its XPath: an object in another state may not reach the flow at all — confirm it in the running application.');
      } else {
        var keeps = roles.length && roles.every(function (role) {
          var rules = rulesOf(ix, pe, role);
          return rules.length && rules.every(function (x) { return x.xpathConstraint && (restricts ? restricts(x.xpathConstraint) : USER.test(x.xpathConstraint)); });
        });
        if (keeps) own.push('Every access rule of ' + who + ' on ' + shortName(pe) + ' keeps it to the signed-in user: somebody else’s object may not reach the flow at all — confirm it in the running application.');
        else ev.push(who + (roles.length > 1 ? ' read ' : ' reads ') + shortName(pe) + ' beyond their own, so another person’s object can be handed to it.');
      }
      // The steps this condition leaves unchecked, and which of them nothing unknown stands in front of.
      var open = r.steps.filter(function (st) {
        if (st.from !== c.param) return false;
        return c.kind === 'owner' ? !st.guards.owner.length : !st.guards.state.some(function (g) { return g.attribute === c.attribute; });
      });
      var certain = [];
      open.forEach(function (st) {
        var d = [];
        (st.guards.maybe || []).forEach(function (m) {
          d.push((m.kind === 'rule' ? 'The rule ' : m.kind === 'java' ? 'The Java action ' : 'The microflow ') + m.name + ' stands in front of “' + stepWord(st) + '” and MxScout cannot read what it checks' + (m.why ? ' (' + m.why + ')' : '') + '.');
        });
        if (st.stored && st.events) {
          var sc = serverChecksIn(ix, st.entity, st.kind === 'delete' ? 'delete' : 'commit', isA(ix, st.entity, pe) && c.kind === 'state' ? [c.attribute] : [], c.kind === 'owner');
          sc.doubts.forEach(function (x) { d.push(x.microflow + ' ' + x.why + '.'); });
        }
        if (d.length) own = own.concat(d); else certain.push(st);
      });
      // The same operation for the same role, elsewhere. Every entry is weighed together, not one by one: the
      // same microflow from another trigger, on a page the role may open, handed the same object with no such
      // condition — or the same change on a form the role edits in every state (editscope.js, open). For a
      // role that has one, this page's condition is how this page behaves, not a rule the role is kept to.
      var rest = roles.filter(function (role) {
        var alt = elsewhere(ix, r, f, c, role);
        if (alt) { (c.alt = c.alt || []).push('"' + role.name + '" ' + alt); return false; }
        var same = sameWrite(ctx, ix, certain, role);
        if (same) { (c.alt = c.alt || []).push('"' + role.name + '" ' + same); return false; }
        return true;
      });
      if (roles.length && !rest.length) own.push('The same is offered without this condition: ' + c.alt.join('; ') + '. So “' + c.text + '” is how ' + f.page + ' behaves, not a rule the role is kept to — unless that other way in is itself reached only in that state: confirm how it is reached.');
      else if (rest.length < roles.length) ev.push('For ' + andList(rest.map(function (x) { return '"' + x.name + '"'; })) + ' nothing else offers it without the condition (' + c.alt.join('; ') + ').');
      return { c: c, doubts: uniq(own), evidence: ev, certain: certain, rest: rest };
    });
    var solid = judged.filter(function (j) { return !j.doubts.length && j.certain.length; });
    f.confidence = solid.length ? 'confirmed' : 'suspected';
    var steps = [];
    solid.forEach(function (j) { j.certain.forEach(function (st) { if (steps.indexOf(st) === -1) steps.push(st); }); });
    f.stored = steps.some(function (st) { return st.stored; });
    f.priority = f.confidence === 'confirmed' && f.stored ? 'P1' : 'P2';
    f.doubts = f.confidence === 'confirmed' ? [] : uniq([].concat.apply([], judged.map(function (j) { return j.doubts; })));
    if (f.confidence === 'suspected' && !f.doubts.length) f.doubts.push('Every step it takes on the object is checked once MxScout follows it — what is left unchecked is not shown.');
    f.evidence = f.confidence === 'confirmed' ? uniq([].concat.apply([], solid.map(function (j) { return j.evidence; })).concat([
      'Unchecked, with nothing in front of it MxScout cannot read: ' + andList(uniq(steps.map(stepWord))) + '.'])) : [];
    if (f.confidence === 'confirmed') {
      var j0 = solid[0];
      var noun = shortName((r.params.filter(function (x) { return x.name === j0.c.param; })[0] || {}).entity);
      f.scenario = andList(j0.rest.map(function (x) { return '"' + x.name + '"'; })) + ' may call ' + r.qualifiedName + ' from the browser with ' + (/^[aeiou]/i.test(noun) ? 'an ' : 'a ') + noun +
        ' the page does not offer it for (' + j0.c.text + ' does not hold)' + ', and it ' + andList(uniq(j0.certain.map(stepWord))) + '.';
      f.impact = f.stored ? 'The change is stored: the object leaves the state the page keeps it in, and nothing in the model undoes it.' : 'Nothing is stored: the object changes in memory or opens on a page the role should not get to with it.';
    }
  }
  function verdictOf(steps) {
    if (!steps.length) return 'no-steps';
    var state = steps.every(function (s) { return s.guards.state.length; });
    var owner = steps.every(function (s) { return s.guards.owner.length; });
    return state && owner ? 'both' : state ? 'state' : owner ? 'owner' : 'none';
  }
  // The state attributes that stand in front of EVERY step.
  function stateAttrsOf(steps) {
    if (!steps.length) return [];
    var first = uniq(steps[0].guards.state.map(function (g) { return g.attribute; }));
    return first.filter(function (a) { return steps.every(function (s) { return s.guards.state.some(function (g) { return g.attribute === a; }); }); });
  }

  var VERDICT_TEXT = {
    both: 'checks the state of the object and its owner',
    state: 'checks the state of the object, not its owner',
    owner: 'checks the owner, not the state of the object',
    none: 'checks neither the state of the object nor its owner',
    'no-steps': 'does nothing to the object it is given',
    rules: 'runs in the browser, under the role’s access rules'
  };

  function pageHides(ix, r, findings, ctx) {
    var seen = {}, mine = [];
    r.triggers.forEach(function (tr) {
      var conds = [], texts = {};
      tr.conditions.forEach(function (c) {
        readCondition(ix, c, tr, r.params).forEach(function (x) { if (!texts[x.kind + x.text]) { texts[x.kind + x.text] = true; conds.push(x); } });
      });
      if (!conds.length) return;
      var missing = conds.filter(function (c) {
        var steps = r.steps.filter(function (s) { return s.from === c.param; });
        if (!steps.length) return false;
        if (c.kind === 'owner') return !steps.every(function (s) { return s.guards.owner.length; });
        return !steps.every(function (s) { return s.guards.state.some(function (g) { return g.attribute === c.attribute; }); });
      });
      if (!missing.length) return;
      var params = uniq(missing.map(function (c) { return c.param; }));
      var steps = r.steps.filter(function (s) { return params.indexOf(s.from) !== -1; });
      var stored = steps.some(function (s) { return s.stored; });
      var key = [tr.page, tr.widget || tr.caption, r.qualifiedName].join(' ');
      if (seen[key]) {
        missing.forEach(function (c) { if (!seen[key].conditions.some(function (x) { return x.text === c.text; })) seen[key].conditions.push(c); });
        if (stored) seen[key].priority = 'P1';
        seen[key].text = pageHidesText(seen[key], r);
        return;
      }
      var what = uniq(steps.map(stepWord));
      var f = {
        kind: 'page-hides', priority: stored ? 'P1' : 'P2', flow: r.qualifiedName, page: tr.page, pageKind: tr.pageKind,
        trigger: tr.caption || tr.widget || tr.widgetKind, widget: tr.widget, conditions: missing, verdict: r.verdict, triggerKey: key,
        steps: what, notChecked: r.notChecked, caption: tr.caption, widgetKind: tr.widgetKind
      };
      f.text = pageHidesText(f, r);
      seen[key] = f;
      findings.push(f);
      mine.push(f);
    });
    mine.forEach(function (f) { assess(ix, r, f, ctx || {}); });
  }
  function pageHidesText(f, r) {
    var what = f.steps.length > 4 ? f.steps.slice(0, 4).concat([(f.steps.length - 4) + ' more step' + (f.steps.length - 4 === 1 ? '' : 's')]) : f.steps;
    var kind = f.widgetKind || 'trigger';
    return (f.caption ? '“' + f.caption + '”' : (/^[aeiou]/i.test(kind) ? 'An ' : 'A ') + kind) + ' on ' + f.pageKind + ' ' + f.page + ' is ' +
      f.conditions.map(function (c) { return c.text; }).join('; ') + ' — ' + r.qualifiedName + ' ' + VERDICT_TEXT[r.verdict] +
      ' before it ' + andList(what) + '. Called from anywhere else — the browser’s console — it works on any object the role can read.';
  }
  function stepWord(s) {
    var obj = '$' + s.variable + (s.variable !== s.from && s.entity ? ' (' + shortName(s.entity) + ')' : '');
    if (s.kind === 'change') return 'changes ' + obj + (s.stored ? ' and commits' : '');
    if (s.kind === 'commit') return 'commits ' + obj;
    if (s.kind === 'delete') return 'deletes ' + obj;
    if (s.kind === 'create') return 'creates ' + obj + ' linked to it' + (s.stored ? ' and commits' : '');
    return 'opens ' + (s.page ? shortName(s.page) : 'a page') + ' with ' + obj;
  }
  function andList(list) { return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : (list[0] || ''); }

  // A microflow without entity access, which a role may call, that fetches an
  // entity with no XPath while that role's every rule on it has one. CONFIRMED when the model shows where the
  // rows go — returned to the caller, shown on a page, changed and committed, deleted — P1; TO VERIFY, P2,
  // when it does not: a flow that only counts or looks something up keeps the rows to itself.
  function bypassXpath(ix, model, findings) {
    (model.microflows || []).forEach(function (flow) {
      if (flow.applyEntityAccess || !flow.graph || !flow.graph.nodes) return;
      var callers = callersOf(ix, flow);
      if (!callers.length) return;
      flow.graph.nodes.forEach(function (n) {
        var p = n.props || {};
        if (n.kind !== 'activity' || n.action !== 'RetrieveAction' || p.source !== 'From database' || p.xpath || !p.entity || n.disabled) return;
        var e = ix.entity[p.entity];
        if (!e) return;
        var roles = [], xpaths = [];
        callers.forEach(function (role) {
          var rules = (e.accessRules || []).filter(function (r) { return r && role.moduleRoles.indexOf(r.moduleRole) !== -1; });
          if (!rules.length || !rules.every(function (r) { return r.xpathConstraint; })) return;
          roles.push(role.name);
          rules.forEach(function (r) { xpaths.push(oneLine(r.xpathConstraint)); });
        });
        if (!roles.length) return;
        var typed = typeof flow.returnType === 'string' && flow.returnType.indexOf(p.entity) !== -1;
        var go = rowsGo(flow, p.out, typed);
        var returns = go.returned;
        var doubts = [], evidence = [];
        if (go.returned) evidence.push('It returns $' + p.out + ' to whoever called it.');
        if (go.shown.length) evidence.push('It opens ' + andList(go.shown.map(shortName)) + ' with them.');
        if (go.changed) evidence.push('It changes and commits them.');
        if (go.deleted) evidence.push('It deletes them.');
        if (!evidence.length) {
          if (typed && !go.returnKnown) doubts.push('It returns ' + flow.returnType + ', and the model as read does not say what it returns — confirm it is these rows.');
          else if (typed) doubts.push('It returns ' + flow.returnType + ', but not $' + (p.out || 'the rows') + ' as far as MxScout follows it.');
          doubts.push('MxScout sees the rows go nowhere a person sees or changes them' + (go.handed.length ? ' — they are handed to ' + andList(go.handed) + ', which it does not follow here' : '') + ': a flow that only counts or looks something up is harmless.');
        }
        var confirmed = evidence.length > 0;
        findings.push({
          kind: 'bypass-xpath', priority: confirmed ? 'P1' : 'P2', confidence: confirmed ? 'confirmed' : 'suspected', doubts: doubts, evidence: confirmed ? evidence : [],
          flow: flow.qualifiedName, entity: p.entity, node: n.id,
          retrieve: n.caption || ('Retrieve ' + shortName(p.entity) + (p.range === 'First' ? ' (first)' : ' (all)')),
          out: p.out || null, roles: roles, xpaths: uniq(xpaths), returns: returns,
          scenario: confirmed ? andList(roles.map(function (x) { return '"' + x + '"'; })) + ' may call ' + flow.qualifiedName + ' and get past its own access rule on ' + p.entity + '.' : null,
          impact: confirmed ? (go.deleted || go.changed ? 'Rows the role may not even read are ' + (go.deleted ? 'deleted' : 'changed') + '.' : 'Rows the role may not read reach it.') : null,
          text: flow.qualifiedName + ' does not apply entity access and retrieves ' + p.entity + ' from the database with no XPath' +
            (p.out ? ' into $' + p.out : '') + ', while every access rule ' + andList(roles.map(function (x) { return '"' + x + '"'; })) +
            (roles.length > 1 ? ' hold' : ' holds') + ' on it has one (' + uniq(xpaths).join(' | ') + '): rows outside the rule ' +
            (go.returned ? 'come back to whoever called it.' : go.deleted ? 'are deleted by it.' : go.changed ? 'are changed and committed by it.' : go.shown.length ? 'are shown on ' + andList(go.shown.map(shortName)) + '.' : 'reach whatever the flow does next.')
        });
      });
    });
  }
  // Where a retrieved list (or what a loop takes from it) goes in the flow's drawing.
  function rowsGo(flow, out, typed) {
    var g = flow.graph || {}, vars = {}, res = { returned: false, returnKnown: false, shown: [], changed: false, deleted: false, handed: [] };
    if (!out) return res;
    vars[out] = true;
    (g.nodes || []).forEach(function (n) { if (n.kind === 'loop' && n.loop && vars[n.loop.listVariable] && n.loop.iteratorVariable) vars[n.loop.iteratorVariable] = true; });
    var uses = function (fields) { return (fields || []).some(function (f) { var v = bareVar(f.value); return v && vars[v]; }); };
    (g.nodes || []).forEach(function (n) {
      var p = n.props || {};
      if (n.disabled) return;
      if (n.kind === 'end' && typeof n.returnValue === 'string' && n.returnValue.trim()) {
        res.returnKnown = true;
        // The rows themselves, or (the flow returning the entity) something made of them — not a count.
        if (vars[bareVar(n.returnValue)] || (typed && refsIn(n.returnValue).some(function (r) { return vars[r.v]; }))) res.returned = true;
      }
      if (n.kind !== 'activity') return;
      if (n.action === 'DeleteAction' && vars[p.object]) res.deleted = true;
      else if (n.action === 'CommitAction' && vars[p.object]) res.changed = true;
      else if (n.action === 'ChangeAction' && vars[p.object] && p.commit && p.commit !== 'No') res.changed = true;
      else if (n.action === 'ShowFormAction' && uses(n.fields)) res.shown.push(n.ref || 'a page');
      else if ((n.action === 'MicroflowCallAction' || n.action === 'JavaActionCallAction') && p.target && uses(n.fields)) res.handed.push(p.target);
    });
    res.shown = uniq(res.shown);
    res.handed = uniq(res.handed);
    return res;
  }

  // The same answer for the same model object, worked out once: the
  // microflow window and Security both ask, and the model does not change
  // under them (a replaced model is a new object).
  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    if (!model || typeof model !== 'object' || !cache) return analyse(model);
    var hit = cache.get(model);
    if (!hit) { hit = analyse(model); cache.set(model, hit); }
    return hit;
  }

  // A flow's drawing as editscope.js reads it: its steps, which are
  // reachable, and for a set of steps the decisions in front of all of them
  // — every path to each passes the decision, and one of its branches
  // reaches none (a toggle that changes the value on both branches is not
  // guarded by its own decision). Null without a drawing.
  function frontOf(flow) {
    var G = graphOf(flow);
    if (!G) return null;
    var D = decisionsOf(G);
    return { nodes: G.nodes, reachable: D.reachable, before: function (ids) {
      ids = [].concat(ids);
      return D.list.filter(function (d) {
        return ids.every(function (id) { return id !== d.node.id && D.reachable[id] && !d.without[id]; }) &&
          d.branches.some(function (b) { return ids.every(function (id) { return !b[id]; }); });
      }).map(function (d) { return d.node; });
    } };
  }

  // A condition on a trigger, as a person reads it.
  function conditionText(c) {
    var cond = (c && c.cond) || {}, head = c && c.editable ? 'editable when ' : 'shown when ';
    if (cond.expression) return head + oneLine(cond.expression);
    if (cond.attribute) return head + shortName(cond.attribute.slice(0, cond.attribute.lastIndexOf('.'))) + '.' + shortName(cond.attribute) + ' is ' + ((cond.values || []).join(' or ') || 'set');
    if (cond.roles) return head + 'the user has ' + cond.roles.join(' or ');
    return head + 'a condition';
  }

  window.MxGuards = { analyse: analyse, of: of, VERDICT_TEXT: VERDICT_TEXT, stepWord: stepWord, conditionText: conditionText, frontOf: frontOf, refsIn: refsIn,
    serverChecks: serverChecks, stateKind: function (model, entityQn, name, opts) {
      var was = legacyNames; legacyNames = !!(opts && opts.legacyNames);
      try { return stateKind(indexModel(model || {}), entityQn, name); } finally { legacyNames = was; }
    }, namedState: function (name, opts) { var was = legacyNames; legacyNames = !!(opts && opts.legacyNames); try { return namedState(name); } finally { legacyNames = was; } } };
})();
