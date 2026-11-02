/* MxScout — entity access measured against what actually uses it.
 *
 * An access rule says how much of an entity a role may read. The pages,
 * nanoflows and microflows that role can reach say how much of it the app
 * ever SHOWS that role. The two are written in different places, by
 * different people, and nothing in Studio Pro compares them. This does, from
 * the model alone, without a running app and without any AI:
 *
 *   WIDER THAN ITS USE — the role reads every row of the entity (a rule with
 *     no XPath), but every place it meets that entity narrows it: a list over
 *     an association, a list with an XPath, the object a page was opened
 *     with, a microflow that hands it over. Nothing the role can reach lists
 *     the whole table.
 *   NEVER USED — the role has a rule on the entity, and nothing the role can
 *     reach shows it, reads it, takes it or returns it.
 *   WRITTEN NEVER — the role may write attributes, create or delete, and
 *     nothing it reaches does: no input on its pages, no New or Delete
 *     button, no flow that runs with its rights.
 *   ALLOWED TO RUN, NOT ALLOWED TO DO — a nanoflow, or a microflow that
 *     applies entity access, that the role can reach, does something the
 *     role has no right to: it fails for that role, or finds nothing.
 *   PAST ENTITY ACCESS — a microflow that does not apply entity access, that
 *     the role may call, creates, changes or deletes what the role itself
 *     may not. Usually deliberate; always worth knowing.
 *
 * Why the first one matters at all: a page is not a security boundary. What
 * a signed-in user can fetch is decided by the rule, not by the list that
 * happens to be on screen, so a rule wider than every page is the real
 * extent of that role's access. Strict mode narrows what the client may ask
 * for directly, which is why the Security section says which mode the
 * project is in next to these.
 *
 * PER USER ROLE, not per module role, and that is not a presentation choice.
 * A page allows the module roles of ITS module, an entity's rule names the
 * module roles of ITS module, and the only thing that joins a page in one
 * module to a rule in another is the user role carrying both. Measured per
 * module role, project A reported 244 rules "never used" that its own pages
 * use every day, through a different module's role on the same person.
 *
 * What counts as "reaching" an entity, for one user role:
 *   - a page any of its module roles may open: every data source on it and
 *     on every snippet it places (recursively), its parameters, and every
 *     entity its widgets name, an attribute shown over an association too;
 *   - every nanoflow and microflow it may call, every microflow behind a
 *     published REST operation it may call, and every flow those pages name,
 *     followed through the calls they make;
 *   - of those, a nanoflow, or a microflow that applies entity access,
 *     counts its retrieves and the objects it creates or changes, since it
 *     does all of that with the role's rights;
 *   - a microflow that does NOT apply entity access counts only what crosses
 *     into the client: its object parameters and what it returns, when the
 *     role may call it, and what it returns to a page that uses it as a data
 *     source. What it does inside is done with no rights at all.
 *   - a specialization is reached wherever its generalization is: a list of
 *     every Document shows every Invoice.
 *
 * Where it stops: a published OData service hands out whole entity sets by
 * its own role list, and which entity a set is cannot be read from here, so
 * a user role that a service is open to is set aside and named rather than
 * judged. A Java action is not followed either.
 */
(function () {
  'use strict';

  // How a use narrows the entity, in the order a reader is told about them.
  // 'all' is the one that does not narrow.
  var HOW = ['all', 'xpath', 'association', 'context', 'microflow', 'parameter', 'mention'];
  // What it means for the APPLICATION, not a page, to lead to a flow: the navigation, a menu item, App Settings
  // or a published operation. A flow no button carries, that the navigation runs, is still offered to whoever may
  // run it — and "allowed to run, not allowed to do" has to count it (MXS-173). A scheduled event is not here: it
  // runs as nobody, so no role's own rights are measured against it.
  var ENTRY_KIND = { menu: true, navigation: true, 'App Settings': true,
    'published REST service': true, 'published web service': true, 'published OData service': true };

  function grantsRead(rule) {
    if (!rule) return false;
    if (rule.defaultAccess === 'r' || rule.defaultAccess === 'rw') return true;
    var maps = [rule.attrAccess || {}, rule.assocAccess || {}];
    return maps.some(function (m) {
      return Object.keys(m).some(function (k) { return m[k] === 'r' || m[k] === 'rw'; });
    });
  }

  // "List of Sales.Order", "Sales.Order" — only names that ARE entities.
  function entitiesIn(text, entityByName) {
    var out = [];
    if (typeof text !== 'string') return out;
    var re = /([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g, m;
    while ((m = re.exec(text))) {
      var qn = m[1] + '.' + m[2];
      if (entityByName[qn] && out.indexOf(qn) === -1) out.push(qn);
    }
    return out;
  }

  function analyse(model, options) {
    options = options || {};
    var entities = model.entities || [];
    var entityByName = {};
    entities.forEach(function (e) { entityByName[e.qualifiedName] = e; });

    // The entities a flow creates objects of. "Create list" makes an empty list, not an object: it is no
    // create, and needs no create right. A model read before mpr.js told them apart lists both in
    // activity.creates, so the drawing decides when there is one.
    // options.legacy: as the rules before read it (secrisks.js, withdrawn) — every create the reader listed,
    // and every flow a page names run by every role that opens the page.
    var legacy = !!options.legacy, legacyCreates = legacy || !!options.legacyCreatesOnly;
    function createsOf(f) {
      var act = f && f.activity, nodes = f && f.graph && f.graph.nodes;
      if (legacyCreates || !nodes || !nodes.length) return (act && act.creates) || [];
      var out = [];
      nodes.forEach(function (n) {
        var e = n && !n.disabled && n.action === 'CreateChangeAction' && n.props ? n.props.entity : null;
        if (e && out.indexOf(e) === -1) out.push(e);
      });
      return out;
    }

    // Every ancestor of an entity, so a use of the generalization counts
    // for each specialization under it.
    function ancestors(qn) {
      var out = [], seen = {};
      var e = entityByName[qn];
      while (e && e.generalization && !seen[e.generalization]) {
        seen[e.generalization] = true;
        out.push(e.generalization);
        e = entityByName[e.generalization];
      }
      return out;
    }

    // Every specialization of an entity: an object of one is an object of
    // the generalization, so a right on either can be what a step uses.
    var childrenOf = {};
    entities.forEach(function (e) { if (e.generalization) (childrenOf[e.generalization] = childrenOf[e.generalization] || []).push(e.qualifiedName); });
    function descendants(qn) {
      var out = [], q = (childrenOf[qn] || []).slice();
      while (q.length) { var c = q.shift(); if (out.indexOf(c) !== -1) continue; out.push(c); q = q.concat(childrenOf[c] || []); }
      return out;
    }
    // What a set of module roles may do with one entity, by its own rules.
    function rightsOn(qn, roles) {
      var r = { any: false, read: false, create: false, del: false, write: {} };
      ((entityByName[qn] || {}).accessRules || []).forEach(function (rule) {
        if (!rule || !roles[rule.moduleRole]) return;
        r.any = true;
        if (grantsRead(rule)) r.read = true;
        if (rule.allowCreate) r.create = true;
        if (rule.allowDelete) r.del = true;
        Object.keys(rule.attrAccess || {}).forEach(function (a) { if (rule.attrAccess[a] === 'rw') r.write[a] = true; });
      });
      return r;
    }
    // Rights on the entity or on any specialization of it: a step that works on a variable of the
    // generalization may be handed either — so a right counts only when the generalization itself gives it, or
    // when EVERY specialization does. One that only some of them give leaves the others failing, and the rules
    // before read it as a right on all of them (MXS-173, the review of 2026-11-01).
    function rightsAround(qn, roles) {
      var own = rightsOn(qn, roles), kids = descendants(qn).map(function (x) { return rightsOn(x, roles); });
      var every = function (pick) { return kids.length > 0 && kids.every(pick); };
      var r = { any: own.any || kids.some(function (x) { return x.any; }), create: own.create,
        read: own.read || every(function (x) { return x.read; }),
        del: own.del || every(function (x) { return x.del; }), write: {} };
      Object.keys(own.write).forEach(function (a) { r.write[a] = true; });
      if (kids.length) {
        Object.keys(kids[0].write).forEach(function (a) { if (kids.every(function (x) { return x.write[a]; })) r.write[a] = true; });
      }
      return r;
    }
    // Whether an entity is, or specializes, another one.
    function isUnder(qn, want) { return qn === want || ancestors(qn).indexOf(want) !== -1; }
    // A child entity holds data worth more than its parent's key: a file, a picture, or a member whose name says
    // it is a secret. What makes the finding is the missing XPath; this only says how heavily it weighs.
    var SENSITIVE = /password|passwd|passphrase|secret|token|apikey|api_?key|private_?key|credential|content|contents|attachment/i;
    function sensitiveOf(qn) {
      var e = entityByName[qn];
      if (!e) return null;
      if (isUnder(qn, 'System.FileDocument') || isUnder(qn, 'System.Image')) return 'every row is a file';
      var hit = (e.attributes || []).filter(function (a) { return a && (SENSITIVE.test(a.name) || a.type === 'Binary'); }).map(function (a) { return a.name; });
      return hit.length ? 'it carries ' + hit.slice(0, 4).join(', ') : null;
    }

    var flowByName = {};
    (model.microflows || []).forEach(function (f) { flowByName[f.qualifiedName] = [{ flow: f, kind: 'microflow' }]; });
    (model.nanoflows || []).forEach(function (f) {
      // A nanoflow and a microflow can share a qualified name, and a call
      // site does not always say which, so both are followed.
      (flowByName[f.qualifiedName] = flowByName[f.qualifiedName] || []).push({ flow: f, kind: 'nanoflow' });
    });
    var snippetByName = {};
    (model.snippets || []).forEach(function (s) { snippetByName[s.qualifiedName] = s; });

    // Published services, by the module roles they are open to. A REST
    // operation names the microflow behind it ("POST order → Sales.Cancel"),
    // so that one is followed; an OData entity set is not.
    var restFlowsFor = {}, odataFor = {};
    (model.publishedServices || []).forEach(function (s) {
      (s.allowedModuleRoles || []).forEach(function (mr) {
        if (s.kind === 'OData') {
          (odataFor[mr] = odataFor[mr] || []).push(s.name);
          return;
        }
        (s.exposes || []).forEach(function (op) {
          var m = /→\s*(\S+)\s*$/.exec(String(op));
          if (m) (restFlowsFor[mr] = restFlowsFor[mr] || []).push(m[1]);
        });
      });
    });

    // Who is judged: the user roles, since that is what a person holds. A
    // model with none (a JSON export from elsewhere) is judged per module
    // role instead, which is the best it can say.
    var subjects = (model.userRoles || []).filter(function (r) { return (r.moduleRoles || []).length; })
      .map(function (r) { return { name: r.name, moduleRoles: r.moduleRoles.slice() }; });
    if (!(model.userRoles || []).length) {
      var seenRole = {};
      entities.forEach(function (e) {
        (e.accessRules || []).forEach(function (rule) {
          if (rule && rule.moduleRole && !seenRole[rule.moduleRole]) {
            seenRole[rule.moduleRole] = true;
            subjects.push({ name: rule.moduleRole, moduleRoles: [rule.moduleRole] });
          }
        });
      });
    }

    var visible = options.visible || null; // a Set of entity names to report on
    var wider = [], unused = [], setAside = [], unwritten = [], cannotDo = {}, pastAccess = {}, writersBy = {}, deletersBy = {}, notInherited = [];
    var pastCache = {}; // writesPast, per flow

    subjects.forEach(function (subject) {
      var roles = {};
      subject.moduleRoles.forEach(function (mr) { roles[mr] = true; });

      var services = [];
      subject.moduleRoles.forEach(function (mr) {
        (odataFor[mr] || []).forEach(function (name) { if (services.indexOf(name) === -1) services.push(name); });
      });
      if (services.length) {
        setAside.push({ userRole: subject.name, services: services.sort() });
        return;
      }

      var reach = reachFor(roles);
      writersBy[subject.name] = reach.writers;
      deletersBy[subject.name] = reach.deleters;
      var uses = reach.uses;
      var unusedHere = {};
      entities.forEach(function (entity) {
        var qn = entity.qualifiedName;
        if (visible && !visible.has(qn)) return;
        var rules = (entity.accessRules || []).filter(function (rule) { return rule && roles[rule.moduleRole]; });
        if (!rules.length) return;

        var found = (uses[qn] || []).slice();
        ancestors(qn).forEach(function (a) {
          (uses[a] || []).forEach(function (u) { found.push(Object.assign({ through: a }, u)); });
        });
        found.sort(function (a, b) { return HOW.indexOf(a.how) - HOW.indexOf(b.how); });

        var item = {
          entity: qn, name: entity.name, module: entity.module, userRole: subject.name,
          // The module roles whose rules gave this user role the entity,
          // which are the rules somebody would change.
          moduleRoles: unique(rules.map(function (r) { return r.moduleRole; })),
          openRoles: unique(rules.filter(function (r) { return grantsRead(r) && !r.xpathConstraint; })
            .map(function (r) { return r.moduleRole; })),
          uses: found
        };
        if (!found.length) {
          unused.push(item);
          unusedHere[qn] = true;
          return;
        }
        // "Every row in the database" means nothing for an entity that is
        // never stored.
        if (!item.openRoles.length || entity.persistable === false) return;
        if (found.some(function (u) { return u.how === 'all'; })) return;
        wider.push(item);
      });

      // ---- written never: write, create and delete rights nothing uses ----
      entities.forEach(function (entity) {
        var qn = entity.qualifiedName;
        if ((visible && !visible.has(qn)) || unusedHere[qn]) return;
        var r = rightsOn(qn, roles);
        if (!r.any) return;
        // A write to an attribute counts whichever way the object was typed
        // where it was written: as this entity, a generalization or a
        // specialization of it.
        var family = [qn].concat(ancestors(qn), descendants(qn));
        var written = {};
        family.forEach(function (x) { (reach.writes[x] || []).forEach(function (a) { written[a] = true; }); });
        var never = Object.keys(r.write).filter(function (a) { return !written[a]; }).sort();
        var createNever = r.create && !reach.creates[qn];
        var deleteNever = r.del && ![qn].concat(ancestors(qn)).some(function (x) { return reach.deletes[x]; });
        if (!never.length && !createNever && !deleteNever) return;
        unwritten.push({ entity: qn, name: entity.name, module: entity.module, userRole: subject.name,
          attributes: never, create: !!createNever, del: !!deleteNever });
      });

      // ---- allowed to run, not allowed to do ----
      // Only a flow the role can actually set off: a page, snippet or data source it reaches offers it, a
      // published operation exposes it, or a flow that is itself reachable calls it. A role listed in a flow's
      // allowed roles with nothing anywhere that runs it fails at nothing — eight of the sixteen risks of this
      // kind in the reviewed application were exactly that (MXS-173). Past entity access keeps the console.
      reach.rightsFlows.filter(function (rf) { return legacy || reach.uiReachable[rf.flow.qualifiedName]; }).forEach(function (rf) {
        var f = rf.flow, act = f.activity;
        if (!act) return;
        var missing = [];
        (act.retrieves || []).forEach(function (x) {
          // An entity this model does not carry (System.Session, a module read without its rules) says nothing
          // about a missing right: the rules before counted it as one.
          if (!entityByName[x.entity] && !legacy) return;
          if (!rightsAround(x.entity, roles).read) push(missing, { what: 'read', entity: x.entity });
        });
        // A non-persistable entity needs no create or delete right: nothing is stored, and only the rights to its
        // members are checked. Four of the risks of this kind were a password form and a search result (MXS-173).
        createsOf(f).forEach(function (e) {
          if (entityByName[e] && (legacy || entityByName[e].persistable !== false) && !rightsOn(e, roles).create) push(missing, { what: 'create', entity: e });
        });
        (act.deletes || []).forEach(function (e) {
          if (entityByName[e] && (legacy || entityByName[e].persistable !== false) && !rightsAround(e, roles).del) push(missing, { what: 'delete', entity: e });
        });
        Object.keys(act.writes || {}).forEach(function (e) {
          if (!entityByName[e]) return;
          var w = rightsAround(e, roles).write;
          var no = act.writes[e].filter(function (a) { return !w[a]; });
          if (no.length) push(missing, { what: 'write', entity: e, members: no.sort() });
        });
        if (visible) missing = missing.filter(function (m) { return visible.has(m.entity); });
        if (!missing.length) return;
        collect(cannotDo, f, rf.kind, subject.name, missing);
      });

      // ---- past entity access ----
      reach.pastFlows.forEach(function (pf) {
        var beyond = [];
        pf.writes.forEach(function (w) {
          if (visible && !visible.has(w.entity)) return;
          if (w.what === 'create' && !rightsOn(w.entity, roles).create) push(beyond, w);
          else if (w.what === 'delete' && !rightsAround(w.entity, roles).del) push(beyond, w);
          else if (w.what === 'write') {
            var rw = rightsAround(w.entity, roles).write;
            var no = w.members.filter(function (a) { return !rw[a]; });
            if (no.length) push(beyond, { what: 'write', entity: w.entity, members: no.sort() });
          }
        });
        if (beyond.length) collect(pastAccess, pf.flow, 'microflow', subject.name, beyond);
      });

      // ---- the row filter the child did not inherit ----
      // A parent kept to its owner by an XPath, and a child of it — the copy of a comment, the mail that was
      // sent, the attachment, the line in the audit log — read by the same role with no XPath at all. The row
      // filter stops at the parent, and everything hanging off it is open: the same data, one association away.
      // The rules before counted this among the hundreds of "reads every row" notes, where nobody saw it (MXS-173).
      entities.forEach(function (child) {
        var qn = child.qualifiedName;
        if ((visible && !visible.has(qn)) || child.persistable === false) return;
        var mine = (child.accessRules || []).filter(function (r) { return r && roles[r.moduleRole] && grantsRead(r); });
        if (!mine.length || mine.some(function (r) { return r.xpathConstraint; })) return;
        (model.associations || []).forEach(function (a) {
          if (!a || a.type !== 'Reference' || !isUnder(qn, a.owner)) return;
          var parent = entityByName[a.other];
          if (!parent || parent.persistable === false || a.other === qn) return;
          // The parent has to be kept to the SIGNED-IN USER: any other XPath (a status, a flag) narrows rows in a
          // way the child need not repeat, and taking every XPath for this makes a note of half the model.
          var keeps = typeof window !== 'undefined' && window.MxAccounts && window.MxAccounts.restrictsToUser;
          var up = (parent.accessRules || []).filter(function (r) { return r && roles[r.moduleRole] && grantsRead(r); });
          if (!up.length || !keeps || !up.every(function (r) { return r.xpathConstraint && keeps(r.xpathConstraint); })) return;
          notInherited.push({ entity: qn, name: child.name, module: child.module, userRole: subject.name,
            parent: a.other, association: a.name.indexOf('.') === -1 && a.module ? a.module + '.' + a.name : a.name,
            moduleRoles: unique(mine.map(function (r) { return r.moduleRole; })),
            parentXPaths: unique(up.map(function (r) { return String(r.xpathConstraint).replace(/\s+/g, ' ').trim(); })),
            sensitive: sensitiveOf(qn) });
        });
      });
    });

    function push(list, item) {
      var key = JSON.stringify(item);
      if (!list.some(function (x) { return JSON.stringify(x) === key; })) list.push(item);
    }
    // One entry per flow and per thing it does, with the user roles it is
    // true for: six roles that all fail at the same step are one line.
    function collect(into, f, kind, userRole, items) {
      var entry = into[f.qualifiedName] = into[f.qualifiedName] || { flow: f.qualifiedName, name: f.name, module: f.module, kind: kind, items: {} };
      items.forEach(function (it) {
        var key = JSON.stringify(it);
        var slot = entry.items[key] = entry.items[key] || Object.assign({ userRoles: [] }, it);
        if (slot.userRoles.indexOf(userRole) === -1) slot.userRoles.push(userRole);
      });
    }
    function flatten(map) {
      return Object.keys(map).sort().map(function (k) {
        var e = map[k];
        return { flow: e.flow, name: e.name, module: e.module, kind: e.kind,
          items: Object.keys(e.items).map(function (x) { return e.items[x]; }) };
      });
    }

    return { wider: wider, unused: unused, setAside: setAside, judged: subjects.length - setAside.length,
      unwritten: unwritten, cannotDo: flatten(cannotDo), pastAccess: flatten(pastAccess),
      // Per user role: a child entity read with no XPath whose parent is kept to the role's own rows.
      notInherited: notInherited,
      // Per user role: entity -> attribute -> [{ via, name }], every page and
      // flow with the role's rights that writes it. Not filtered by `visible`.
      writers: writersBy,
      // Per user role: entity -> [{ via, name }], every page and flow with
      // the role's rights that deletes it (editscope.js).
      deleters: deletersBy };

    function unique(list) {
      return list.filter(function (v, i) { return list.indexOf(v) === i; }).sort();
    }

    // Everything one user role reaches, as entity name -> [use].
    function reachFor(roles) {
      var uses = {}, writes = {}, writers = {}, creates = {}, deletes = {}, deleters = {}, rightsFlows = [], pastFlows = [];
      // An attribute written, and where: the page or flow that writes it, so
      // a check can name the places that use a write right (accounts.js).
      function wrote(qualifiedAttr, where) {
        var p = String(qualifiedAttr).split('.');
        if (p.length < 3) return;
        var e = p[0] + '.' + p[1];
        var list = writes[e] = writes[e] || [];
        if (list.indexOf(p[2]) === -1) list.push(p[2]);
        if (!where) return;
        var byAttr = writers[e] = writers[e] || {};
        var at = byAttr[p[2]] = byAttr[p[2]] || [];
        if (!at.some(function (w) { return w.via === where.via && w.name === where.name; })) at.push({ via: where.via, name: where.name });
      }
      // An entity deleted, and where, as `wrote` does for an attribute.
      function deleted(e, where) {
        if (!e) return;
        deletes[e] = true;
        var at = deleters[e] = deleters[e] || [];
        if (!at.some(function (w) { return w.via === where.via && w.name === where.name; })) at.push({ via: where.via, name: where.name });
      }
      function use(qn, how, where) {
        if (!qn || !entityByName[qn]) return;
        (uses[qn] = uses[qn] || []).push(Object.assign({ how: how }, where));
      }
      function allowed(item) {
        return (item.allowedModuleRoles || []).some(function (mr) { return roles[mr]; });
      }

      var flowQueue = [], flowSeen = {}, uiSeeds = [];
      // A flow a page or snippet names runs for this role only when the role may call it — a microflow or
      // nanoflow lists its allowed roles, and the runtime refuses everyone else — and when the role sees
      // something that runs it: a widget shown only to other module roles runs nothing for this one. Flows
      // a microflow calls on the server run for whoever called it, whatever their own roles say.
      function mayRun(name) {
        if (legacy) return true;
        var targets = flowByName[name] || [];
        return !targets.length || targets.some(function (t) { return !Array.isArray(t.flow.allowedModuleRoles) || allowed(t.flow); });
      }
      function hiddenFrom(c) {
        var seen = {}, open = {};
        if (legacy) return {};
        function walk(ws, hidden, depth) {
          if (depth > 80) return;
          (ws || []).forEach(function (w) {
            if (!w || typeof w !== 'object') return;
            var rs = w.visible && w.visible.roles;
            var h = hidden || !!(rs && rs.length && !rs.some(function (r) { return roles[r]; }));
            (w.actions || []).forEach(function (a) { if (a && a.flow) { seen[a.flow] = true; if (!h) open[a.flow] = true; } });
            Object.keys(w).forEach(function (k) { if (k !== 'actions' && k !== 'args' && Array.isArray(w[k])) walk(w[k], h, depth + 1); });
          });
        }
        if (c.structure && !c.structure.truncated) (c.structure.regions || []).forEach(function (r) { walk(r.widgets, false, 0); });
        var out = {};
        Object.keys(seen).forEach(function (f) { if (!open[f]) out[f] = true; });
        return out;
      }
      function queueFromPage(name, hidden) { if (!hidden[name] && mayRun(name)) { uiSeeds.push(name); queueFlow(name); } }
      function queueFlow(name) {
        if (!name || flowSeen[name]) return;
        flowSeen[name] = true;
        flowQueue.push(name);
      }

      function readContainer(c, where, snippetSeen) {
        var hidden = hiddenFrom(c);
        (c.dataSources || []).forEach(function (s) {
          var at = { via: where.via, name: where.name, widget: s.widget || null };
          if (s.kind === 'database') {
            use(s.entity, s.xpath ? 'xpath' : 'all', Object.assign({ xpath: s.xpath }, at));
          } else if (s.kind === 'association') {
            use(s.entity, 'association', Object.assign({ path: s.path || [], xpath: s.xpath || null }, at));
          } else if (s.kind === 'context') {
            use(s.entity, 'context', at);
          } else if (s.kind === 'microflow' || s.kind === 'nanoflow') {
            if (!mayRun(s.flow)) return;
            uiSeeds.push(s.flow);
            queueFlow(s.flow);
            // What a data source flow returns reaches the client whatever
            // the flow did to find it.
            (flowByName[s.flow] || []).forEach(function (target) {
              entitiesIn(target.flow.returnType, entityByName).forEach(function (qn) {
                use(qn, 'microflow', Object.assign({ flow: s.flow }, at));
              });
            });
          }
        });
        (c.flowRefs || []).forEach(function (name) { queueFromPage(name, hidden); });
        (c.mentions || []).forEach(function (qn) { use(qn, 'mention', { via: where.via, name: where.name }); });
        (c.edits || []).forEach(function (a) { wrote(a, where); });
        (c.creates || []).forEach(function (e) { creates[e] = true; });
        (c.deletes || []).forEach(function (e) { deleted(e, where); });
        (c.snippets || []).forEach(function (name) {
          if (snippetSeen[name]) return;
          snippetSeen[name] = true;
          var snippet = snippetByName[name];
          if (snippet) readContainer(snippet, { via: 'snippet', name: name }, snippetSeen);
        });
      }

      (model.pages || []).forEach(function (p) {
        if (!allowed(p)) return;
        (p.parameters || []).forEach(function (param) {
          use(param.entityQualifiedName, 'context', { via: 'page', name: p.qualifiedName, parameter: param.name });
        });
        readContainer(p, { via: 'page', name: p.qualifiedName }, {});
      });

      // Flows the role may call from the client or through a REST operation:
      // their parameters and what they return cross over whatever they do
      // inside.
      var callable = {};
      ['microflows', 'nanoflows'].forEach(function (key) {
        (model[key] || []).forEach(function (f) {
          if (!allowed(f)) return;
          callable[f.qualifiedName] = true;
          queueFlow(f.qualifiedName);
        });
      });
      Object.keys(roles).forEach(function (mr) {
        (restFlowsFor[mr] || []).forEach(function (name) {
          callable[name] = true;
          uiSeeds.push(name);
          queueFlow(name);
        });
      });
      // And what the application itself leads to, however it is reached (ENTRY_KIND): the role may run it, and
      // something outside a page sets it off.
      ['microflows', 'nanoflows'].forEach(function (key) {
        (model[key] || []).forEach(function (f) {
          if (!f || !f.qualifiedName || !(f.calledBy || []).some(function (c) { return c && ENTRY_KIND[c.kind]; })) return;
          if (!mayRun(f.qualifiedName)) return;
          uiSeeds.push(f.qualifiedName);
          queueFlow(f.qualifiedName);
        });
      });

      while (flowQueue.length) {
        var name = flowQueue.shift();
        (flowByName[name] || []).forEach(function (e) { readFlow(e.flow, e.kind, callable[name]); });
      }

      function readFlow(f, kind, isCallable) {
        var act = f.activity;
        var withRights = kind === 'nanoflow' || f.applyEntityAccess === true;
        var where = { via: kind, name: f.qualifiedName };
        if (withRights && act) {
          rightsFlows.push({ flow: f, kind: kind });
          Object.keys(act.writes || {}).forEach(function (e) { act.writes[e].forEach(function (a) { wrote(e + '.' + a, where); }); });
          createsOf(f).forEach(function (e) { creates[e] = true; });
          (act.deletes || []).forEach(function (e) { deleted(e, where); });
          (act.retrieves || []).forEach(function (r) {
            use(r.entity, r.over === 'association' ? 'association' : (r.xpath ? 'xpath' : 'all'),
              Object.assign({ xpath: r.xpath || null }, where));
          });
          // A flow read before retrieves were recorded still names what it
          // reads: a use of unknown extent, so it counts as one that narrows.
          if (!act.retrieves) (act.reads || []).forEach(function (qn) { use(qn, 'mention', where); });
          [createsOf(f), act.changes, act.deletes, act.commits].forEach(function (list) {
            (list || []).forEach(function (qn) { use(qn, 'mention', where); });
          });
        }
        if (withRights || isCallable) {
          (f.parameters || []).forEach(function (param) {
            use(param.entityQualifiedName, 'parameter', Object.assign({ parameter: param.name }, where));
          });
          entitiesIn(f.returnType, entityByName).forEach(function (qn) { use(qn, 'microflow', where); });
        }
        if (act) (act.calls || []).forEach(queueFlow);
        // A microflow the role may call that does not apply entity access:
        // what it, and every microflow it calls that does not either, writes.
        if (kind === 'microflow' && !withRights && isCallable) pastFlows.push({ flow: f, writes: writesPast(f) });
      }

      // The flows something in the application actually sets off for this role: a page, a snippet or a data
      // source it reaches, or a published operation — and whatever those call, however deep. A role merely named
      // in a flow's allowed roles is not among them (see "allowed to run, not allowed to do").
      var uiReachable = {};
      if (legacy) Object.keys(flowSeen).forEach(function (n) { uiReachable[n] = true; });
      else {
        var q2 = uiSeeds.slice();
        while (q2.length) {
          var nm = q2.shift();
          if (!nm || uiReachable[nm]) continue;
          uiReachable[nm] = true;
          (flowByName[nm] || []).forEach(function (e) { (((e.flow || {}).activity || {}).calls || []).forEach(function (c) { q2.push(c); }); });
        }
      }

      return { uses: uses, writes: writes, writers: writers, creates: creates, deletes: deletes, deleters: deleters, rightsFlows: rightsFlows, pastFlows: pastFlows, uiReachable: uiReachable };
    }

    // What a microflow without entity access writes, through the calls that
    // also run without it — a sub-microflow doing the writing is the usual
    // shape. Stops at one that applies entity access: that one runs with the
    // caller's rights and is judged as such.
    function writesPast(f) {
      if (pastCache[f.qualifiedName]) return pastCache[f.qualifiedName];
      var out = [], seen = {}, q = [f];
      while (q.length) {
        var g = q.shift();
        if (!g || seen[g.qualifiedName]) continue;
        seen[g.qualifiedName] = true;
        var act = g.activity;
        if (!act) continue;
        createsOf(g).forEach(function (e) { if (entityByName[e]) push(out, { what: 'create', entity: e }); });
        (act.deletes || []).forEach(function (e) { if (entityByName[e]) push(out, { what: 'delete', entity: e }); });
        Object.keys(act.writes || {}).forEach(function (e) {
          if (entityByName[e]) push(out, { what: 'write', entity: e, members: act.writes[e].slice().sort() });
        });
        (act.calls || []).forEach(function (name) {
          (flowByName[name] || []).forEach(function (x) {
            if (x.kind === 'microflow' && x.flow.applyEntityAccess !== true) q.push(x.flow);
          });
        });
      }
      pastCache[f.qualifiedName] = out;
      return out;
    }
  }

  // "2 over an association · 1 with an XPath": how the uses narrow, counted.
  var HOW_TEXT = {
    all: ['lists every row', 'list every row'],
    xpath: ['with an XPath', 'with an XPath'],
    association: ['over an association', 'over an association'],
    context: ['the object a page was given', 'objects a page was given'],
    microflow: ['handed over by a flow', 'handed over by a flow'],
    parameter: ['a flow parameter', 'flow parameters'],
    mention: ['named on a page or in a flow', 'named on a page or in a flow']
  };
  function summary(uses) {
    var counts = {};
    uses.forEach(function (u) { counts[u.how] = (counts[u.how] || 0) + 1; });
    return HOW.filter(function (h) { return counts[h]; }).map(function (h) {
      return counts[h] + ' ' + HOW_TEXT[h][counts[h] === 1 ? 0 : 1];
    }).join(' · ');
  }

  // Once per model: the write scope, the guards and the security list all ask (a replaced model is a new object).
  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    if (!model || typeof model !== 'object' || !cache) return analyse(model);
    var hit = cache.get(model);
    if (!hit) { hit = analyse(model); cache.set(model, hit); }
    return hit;
  }

  window.MxAccessUse = { analyse: analyse, of: of, summary: summary, grantsRead: grantsRead, HOW: HOW };
})();
