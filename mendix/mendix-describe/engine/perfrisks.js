/* MxScout — performance findings, worked out from the model, as risks with fixed ids.
 *
 * What a customer feels first is a slow page, and most of the causes can be
 * read in the model before anybody runs the app: a retrieve or a commit made
 * once per item of a loop, an attribute filtered on in many places with no
 * index, a page whose rows each start a query of their own, an XPath the
 * database cannot answer from an index, a calculated attribute worked out
 * for every row of a list. Each becomes a risk with a level, a pattern, the
 * places and a fix, under an id that is the same every time the same model
 * is read, so what was decided about it (triage.js: confirmed, accepted,
 * fixed, verified, false positive) holds across loads like the security
 * risks' (Karol, MXS-66, 2026-10-22).
 *
 * Where a view entity would do the work in one query instead — a count per
 * row worked out in a loop, a data view per row over an association — the
 * risk says so and carries the OQL of that view entity (risk.oql), ready to
 * paste into Studio Pro and adjust.
 *
 * A pure function of the model: no DOM, no state, nothing sent anywhere.
 * What the model cannot show (how many rows a table has, how often a page
 * opens) it does not guess: the levels follow the shape alone, and say so.
 *
 * LEVELS:
 *   P2 — the shape costs a query or a write per item or per row: a database
 *        retrieve, a commit or a delete in a loop, a data source inside a
 *        list's row, a calculated attribute shown in a list or reading the
 *        database, an attribute filtered on in 3 places or more with no index,
 *        a page with 12 data sources or more, temporary objects a page leaves in
 *        the browser until a reload (tied to the session or the user, no cleanup).
 *   P3 — worth knowing: the same through a called flow, an unindexed filter
 *        in 1–2 places, 8–11 data sources, an XPath an index cannot serve,
 *        a calculated attribute nothing lists, a view entity proposal.
 * What sits in a Marketplace module is left out (its owner fixes it): setAside counts it.
 */
(function () {
  'use strict';

  var RULES = 1;
  var CHECKS = ['perf-retrieve-in-loop', 'perf-commit-in-loop', 'perf-delete-in-loop', 'perf-call-in-loop', 'perf-no-index',
    'perf-heavy-page', 'perf-row-query', 'perf-xpath', 'perf-calculated', 'perf-view-entity', 'perf-held-objects'];
  // The client's garbage collector keeps whatever is connected to these (and to entities built on System.User).
  var ROOTS = { 'System.Session': true, 'System.User': true };
  var CLEANUP = /^(JS_ClearUnusedObjects|JA_DeleteNonPersistable)$/;
  var LIST_KINDS = { listview: true, datagrid: true, gallery: true, datalist: true };
  var QUERY_SOURCES = { database: true, microflow: true, nanoflow: true, association: true };
  var HEAVY_P3 = 8, HEAVY_P2 = 12, INDEX_P2 = 3;
  var AGG = { Count: 'COUNT', Sum: 'SUM', Average: 'AVG', Minimum: 'MIN', Maximum: 'MAX' };

  // ---------- ids: 'mx-perf-…', the same shape and limit as secrisks.js ----------
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'; }
  function hash(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
  function riskId(check, subject) {
    var id = 'mx-' + check + '-' + slug(subject);
    return id.length <= 80 ? id : id.slice(0, 71).replace(/-+$/, '') + '-' + hash(id);
  }
  function short(qn) { return String(qn || '').split('.').pop(); }
  function moduleOf(qn) { return String(qn || '').split('.')[0]; }

  // ---------- reading the model ----------
  function index(model) {
    var I = { flows: {}, entities: {}, assoc: {}, snippets: {}, market: {} };
    (model.modules || []).forEach(function (m) { if (m.fromAppStore) I.market[m.name] = true; });
    (model.microflows || []).concat(model.nanoflows || []).forEach(function (f) { if (f.qualifiedName) I.flows[f.qualifiedName] = f; });
    (model.entities || []).forEach(function (e) { I.entities[e.qualifiedName] = e; });
    (model.associations || []).forEach(function (a) {
      I.assoc[a.name] = a;
      if (a.module && a.name.indexOf('.') < 0) I.assoc[a.module + '.' + a.name] = a;
    });
    (model.snippets || []).forEach(function (s) { I.snippets[s.qualifiedName] = s; });
    return I;
  }
  function attrOf(I, entityQn, name) {
    for (var e = I.entities[entityQn], n = 0; e && n < 20; e = I.entities[e.generalization], n++) {
      var a = (e.attributes || []).filter(function (x) { return x.name === name; })[0];
      if (a) return { owner: e, attr: a };
    }
    return null;
  }
  // The loop a graph node sits in (its parentId chain), or null.
  function loopOf(byId, node) {
    for (var p = byId[node.parentId], n = 0; p && n < 60; p = byId[p.parentId], n++) if (p.kind === 'loop') return p;
    return null;
  }
  function loopText(loop) {
    var L = loop && loop.loop;
    return L && L.mode === 'while' ? 'a while loop' : 'the loop over $' + ((L && L.listVariable) || 'list');
  }
  function stripStrings(x) { return String(x || '').replace(/'(?:[^']|'')*'|"[^"]*"/g, "''"); }
  // The attributes an XPath compares directly — "[Status = 'Open']", "[Total > 100]" — never one reached
  // over an association ("Order_Customer/Customer/Name") nor a variable's. Names are checked against the entity.
  var XPATH_WORDS = { and: true, or: true, not: true, id: true, empty: true, true: true, false: true, div: true, mod: true };
  function compared(xpath) {
    var x = stripStrings(xpath), out = [], m, re = /(?:^|[^\w$./'-])([A-Za-z_]\w*)\s*(?:!=|<=|>=|=|<|>)/g;
    while ((m = re.exec(x))) if (!XPATH_WORDS[m[1]] && out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }
  // What makes an XPath expensive for the database: contains() reads every row, not() turns an index
  // lookup into a scan, and three associations or more in one path join that many tables per query.
  function costly(xpath) {
    var x = stripStrings(xpath), why = [];
    if (/\bcontains\s*\(/.test(x)) why.push('contains() reads every row, as no index helps a search inside a text');
    if (/\bnot\s*\(/.test(x)) why.push('not() makes the database check every row it cannot rule out by an index');
    var deep = 0;
    x.split(/[\[\]()]/).forEach(function (part) {
      // Module.Association/Module.Entity/… — two qualified names per step.
      var hops = Math.ceil((part.match(/[A-Za-z_]\w*\.[A-Za-z_]\w*\s*\//g) || []).length / 2);
      if (hops > deep) deep = hops;
    });
    if (deep >= 3) why.push('a path over ' + deep + ' associations joins ' + (deep + 1) + ' tables for every query');
    return why;
  }
  // An Aggregate list step, from the drawing's own text (mpr.js nodeLabel: the title is the list, "$Lines", and
  // the meta "Count" or "Sum of Price → $Total"), so the step's properties — part of a flow's fingerprint — stay as they were.
  function aggregateOf(n) {
    var m = /^(Count|Sum|Average|Minimum|Maximum)(?: of ([A-Za-z_]\w*))?(?: →|$)/.exec(String(n.meta || '')), list = /^\$?([A-Za-z_]\w*)$/.exec(String(n.title || '').trim());
    return m && list ? { list: list[1], 'function': m[1], attribute: m[2] || null } : null;
  }
  function walk(nodes, fn, list) {
    (nodes || []).forEach(function (n) {
      if (!n || typeof n !== 'object') return;
      fn(n, list);
      var inner = LIST_KINDS[n.kind] && n.source ? n : list;
      walk(n.widgets, fn, inner);
      walk(n.footer, fn, inner);
    });
  }
  function treeOf(doc) { var S = doc && doc.structure; return S ? (S.regions || []).reduce(function (a, r) { return a.concat(r.widgets || []); }, []) : null; }
  function sourceText(s) {
    return s.kind === 'microflow' || s.kind === 'nanoflow' ? 'the ' + s.kind + ' ' + s.flow
      : s.kind === 'association' ? 'the association ' + (s.path || []).join('/') + ' to ' + s.entity : 'the database (' + s.entity + ')';
  }

  // ---------- the check ----------
  function check(model) {
    var I = index(model), out = [], seen = {}, setAside = 0;
    var flows = (model.microflows || []).concat(model.nanoflows || []);
    var docs = (model.pages || []).concat(model.snippets || []);
    function add(check, subject, level, theme, title, detail, fix, where, extra) {
      var id = riskId(check, subject);
      if (seen[id]) return;
      seen[id] = true;
      where = where.filter(Boolean);
      if (where.length && I.market[moduleOf(where[0])]) { setAside++; return; } // the place it is in decides: a Marketplace module's own
      out.push(Object.assign({
        id: id, key: 'id:' + id, origin: 'model', check: check, level: level, theme: theme,
        title: level === 'P3' ? 'Worth knowing: ' + title.replace(/^(A|The) /, function (m) { return m.toLowerCase(); }) : title,
        detail: detail, fix: fix, where: where.filter(Boolean).slice(0, 40)
      }, extra || {}));
    }

    // 1. Per item of a loop: a database retrieve, a commit, a delete, a call to a flow that does them.
    flows.forEach(function (f) {
      var g = f.graph;
      if (!g || !g.nodes) return;
      var byId = {}, kind = f.qualifiedName && (model.nanoflows || []).indexOf(f) >= 0 ? 'nanoflow' : 'microflow';
      g.nodes.forEach(function (n) { byId[n.id] = n; });
      var hit = { retrieve: [], commit: [], 'delete': [], call: [] };
      g.nodes.forEach(function (n) {
        if (n.kind !== 'activity' || n.disabled || !n.action) return;
        var loop = loopOf(byId, n), P = n.props || {};
        if (!loop) return;
        if (n.action === 'RetrieveAction' && P.source === 'From database' && P.entity) hit.retrieve.push({ n: n, loop: loop, entity: P.entity });
        else if (n.action === 'CommitAction' || (n.action === 'CreateChangeAction' && /^Yes/.test(P.commit || ''))) hit.commit.push({ n: n, loop: loop, entity: P.entity || null });
        else if (n.action === 'DeleteAction') hit['delete'].push({ n: n, loop: loop });
        else if (n.action === 'MicroflowCallAction' || n.action === 'NanoflowCallAction') {
          var t = I.flows[P.target], A = t && t.activity;
          if (!A) return;
          var reads = (A.retrieves || []).filter(function (r) { return r.over === 'database'; }).length;
          if (reads || A.commitCount) hit.call.push({ n: n, loop: loop, target: t, reads: reads, commits: A.commitCount || 0 });
        }
      });
      var fq = f.qualifiedName, per = kind === 'nanoflow' ? ' — in a nanoflow each of them is also a call from the browser to the server' : '';
      if (hit.retrieve.length) {
        var ents = hit.retrieve.map(function (x) { return x.entity; }).filter(function (e, i, a) { return a.indexOf(e) === i; });
        add('perf-retrieve-in-loop', fq, 'P2', 'performance', fq + ' reads from the database once per item of ' + loopText(hit.retrieve[0].loop),
          fq + ' retrieves ' + ents.join(', ') + ' from the database inside ' + loopText(hit.retrieve[0].loop) + ': one query for every item' + per +
          '. With a hundred items that is a hundred queries where one would do. How long it takes grows with the list, which the model cannot show.',
          'Retrieve once, before the loop, every object the loop needs (an XPath over the association to the list, or "in" the list), then find each in that list with a list operation (Find / Filter) inside the loop.',
          [fq].concat(ents), { guide: { where: fq + ', the retrieve' + (hit.retrieve.length > 1 ? 's' : '') + ' of ' + ents.join(', ') + ' inside the loop.', expected: 'One retrieve before the loop; inside it, a Find or Filter on the list already in memory.',
            check: ['Run ' + fq + ' on a list of 100 items with the Performance tool or the log level of ConnectionBus_Queries on Trace: the number of queries no longer grows with the list.'] } });
      }
      if (hit.commit.length) {
        add('perf-commit-in-loop', fq, 'P2', 'loops', fq + ' commits one object at a time inside ' + loopText(hit.commit[0].loop),
          fq + ' commits ' + (hit.commit.length > 1 ? hit.commit.length + ' times' : '') + ' inside ' + loopText(hit.commit[0].loop) + ': a database write, and its before- and after-commit events, for every item. Slow on a long list, and when one item fails the ones before it stay committed only if the error is caught.',
          'Change the objects in the loop without committing, add each to a list, and commit that list once after the loop (one Commit of the list).',
          [fq], { guide: { where: fq + ', the commit inside the loop.', expected: 'Objects changed with Commit: No inside the loop and collected in a list; one Commit of the list after it.',
            check: ['Run ' + fq + ' on 100 items: one commit of the list in the log instead of 100.'] } });
      }
      if (hit['delete'].length) {
        add('perf-delete-in-loop', fq, 'P2', 'loops', fq + ' deletes one object at a time inside ' + loopText(hit['delete'][0].loop),
          fq + ' deletes inside ' + loopText(hit['delete'][0].loop) + ': a delete, its delete events and the delete behaviour of its associations, once for every item.',
          'Collect the objects in a list inside the loop (or retrieve them in one query) and delete the list once after it.', [fq]);
      }
      if (hit.call.length) {
        var c0 = hit.call[0], what = [c0.reads ? 'reads from the database' + (c0.reads > 1 ? ' ' + c0.reads + ' times' : '') : null, c0.commits ? 'commits' : null].filter(Boolean).join(' and ');
        add('perf-call-in-loop', fq, 'P3', 'performance', fq + ' calls ' + c0.target.qualifiedName + ', which ' + what + ', once per item of ' + loopText(c0.loop),
          fq + ' calls ' + hit.call.map(function (x) { return x.target.qualifiedName; }).filter(function (e, i, a) { return a.indexOf(e) === i; }).join(', ') +
          ' inside ' + loopText(c0.loop) + '. ' + c0.target.qualifiedName + ' ' + what + ', so that happens once for every item. Whether it matters depends on how long the list gets, which the model cannot show.',
          'Give the called flow the whole list instead of one item, or retrieve what it needs once before the loop and pass it in.',
          [fq].concat(hit.call.map(function (x) { return x.target.qualifiedName; })));
      }

      // A count, a sum or an average worked out per item: a retrieve in the loop and an aggregate of what it returned.
      hit.retrieve.concat(g.nodes.filter(function (n) { return n.action === 'RetrieveAction' && (n.props || {}).source === 'By association' && loopOf(byId, n); })
        .map(function (n) { return { n: n, loop: loopOf(byId, n) }; })).forEach(function (r) {
        var P = r.n.props || {}, out = P.out;
        var agg = null;
        g.nodes.forEach(function (n) { var a = !agg && n.action === 'AggregateAction' && loopOf(byId, n) === r.loop && aggregateOf(n); if (a && a.list === out) agg = { props: a }; });
        if (!agg) return;
        var prop = proposeAggregate(I, g, r.loop, P, agg.props, f);
        if (!prop) return;
        add('perf-view-entity', fq + ' ' + prop.child, 'P3', 'performance', 'A view entity can work out the ' + agg.props.function.toLowerCase() + ' per ' + short(prop.parent) + ' in ' + fq + ' in one query',
          fq + ' retrieves ' + prop.child + ' for every ' + short(prop.parent) + ' of ' + loopText(r.loop) + ' only to take its ' + agg.props.function.toLowerCase() +
          '. A view entity with the query below gives every ' + short(prop.parent) + ' with its ' + agg.props.function.toLowerCase() + ' in one query. Group by an attribute that is unique per ' + short(prop.parent) + ', or rows with the same values are counted together; the attributes chosen here are a start.',
          'Create a view entity from the OQL under "How to fix" (check it in the OQL editor first), retrieve it once before the loop or show it on the page directly, and drop the retrieve and the aggregate from the loop.',
          [fq, prop.parent, prop.child], { register: 'proposal', oql: prop.oql });
      });
    });

    // 2. Attributes filtered on in XPath with no index that starts with them; XPath an index cannot serve.
    var filtered = {}, places = function (where, entity, xpath) {
      if (!entity || !xpath) return;
      compared(xpath).forEach(function (name) {
        var hit = attrOf(I, entity, name);
        if (!hit || hit.attr.calculated || hit.attr.type === 'Boolean' || !hit.owner.persistable || hit.owner.viewEntity || !Array.isArray(hit.owner.indexes)) return;
        if (hit.owner.indexes.some(function (ix) { return ix[0] === name; })) return;
        var k = hit.owner.qualifiedName + '.' + name;
        (filtered[k] = filtered[k] || { owner: hit.owner, attr: hit.attr, where: [] }).where.indexOf(where) < 0 && filtered[k].where.push(where);
      });
      var why = costly(xpath);
      if (why.length) add('perf-xpath', where + ' ' + entity, 'P3', 'performance', 'The XPath on ' + entity + ' in ' + where + ' is hard for the database to answer from an index',
        'The constraint ' + xpath + ' in ' + where + ': ' + why.join('; ') + '. On a small table nobody notices; on a large one this query is the slow part.',
        'Filter on a stored attribute with an index (starts-with() instead of contains() where the search allows it, a positive condition instead of not(), an attribute copied onto the entity instead of a long path).',
        [where, entity]);
    };
    flows.forEach(function (f) {
      ((f.activity && f.activity.retrieves) || []).forEach(function (r) { if (r.over === 'database') places(f.qualifiedName, r.entity, r.xpath); });
    });
    docs.forEach(function (p) {
      (p.dataSources || []).forEach(function (s) { if (s.kind === 'database') places(p.qualifiedName, s.entity, s.xpath); });
    });
    Object.keys(filtered).sort().forEach(function (k) {
      var F = filtered[k], n = F.where.length, lvl = n >= INDEX_P2 ? 'P2' : 'P3';
      add('perf-no-index', k, lvl, 'performance', k + ' is filtered on in ' + n + ' place' + (n > 1 ? 's' : '') + ' and no index starts with it',
        'XPath constraints compare ' + k + ' in ' + F.where.join(', ') + ', and none of ' + F.owner.qualifiedName + '’s ' + (F.owner.indexes.length ? F.owner.indexes.length + ' indexes' : 'indexes (it has none)') +
        ' starts with ' + F.attr.name + ', so the database reads the whole table to find the rows. It matters once the table holds thousands of rows, which the model cannot show.',
        'Add an index on ' + F.attr.name + ' to ' + F.owner.qualifiedName + ' (domain model → the entity → Indexes) — or, when it is always filtered together with another attribute, one index on both, ' + F.attr.name + ' first.',
        [F.owner.qualifiedName].concat(F.where), { guide: { where: F.owner.qualifiedName + ', Indexes.', expected: 'An index whose first attribute is ' + F.attr.name + '.',
          check: ['Open a page that filters on ' + F.attr.name + ' over the production-sized data: the query takes milliseconds instead of a table scan (EXPLAIN in the database shows an index scan).'] } });
    });

    // 3. Pages: many data sources; a query in every row of a list; calculated attributes per row.
    var listed = {};
    docs.forEach(function (p) {
      var tree = treeOf(p);
      if (!tree) return;
      var sources = [], rows = [];
      walk(tree, function (n, list) {
        if (!n.source || !QUERY_SOURCES[n.source.kind]) return;
        sources.push(n);
        if (LIST_KINDS[n.kind] && n.source.entity) (listed[n.source.entity] = listed[n.source.entity] || []).indexOf(p.qualifiedName) < 0 && listed[n.source.entity].push(p.qualifiedName);
        if (list) rows.push({ n: n, list: list });
      });
      (p.snippets || []).forEach(function (s) { var t = treeOf(I.snippets[s]); if (t) walk(t, function (n) { if (n.source && QUERY_SOURCES[n.source.kind]) sources.push(n); }); });
      var pq = p.qualifiedName, isPage = (model.pages || []).indexOf(p) >= 0;
      if (isPage && sources.length >= HEAVY_P3) {
        add('perf-heavy-page', pq, sources.length >= HEAVY_P2 ? 'P2' : 'P3', 'performance', pq + ' asks the server for data ' + sources.length + ' times when it opens',
          pq + ' (with the snippets it uses) has ' + sources.length + ' widgets with a data source of their own — database, microflow, nanoflow or association — and each is a request when the page opens. Pages with fewer than ' + HEAVY_P3 + ' are not reported.',
          'Show less at once: move parts the user does not need first into tabs that load when opened, or into a page of their own; feed several widgets from one microflow or one data view.',
          [pq]);
      }
      if (rows.length) {
        var hard = rows.filter(function (x) { return x.n.source.kind !== 'association'; });
        add('perf-row-query', pq, hard.length ? 'P2' : 'P3', 'performance', pq + ' starts a query in every row of a list',
          pq + ' has ' + rows.map(function (x) { return 'a ' + x.n.kind + ' on ' + sourceText(x.n.source) + ' inside the ' + x.list.kind + ' of ' + (x.list.source.entity || x.list.source.flow || 'a list'); }).join('; ') +
          '. Every row the list shows runs it once: 20 rows, 20 queries' + (hard.length ? '' : ' (over an association, so each is small)') + '.',
          'Show the value in the list itself: an attribute reached over the association in a column, or a view entity that joins the two (see the proposal, when there is one); a microflow source per row is better replaced by one that returns everything for the list.',
          [pq].concat(rows.map(function (x) { return x.n.source.entity || x.n.source.flow; })));
        rows.forEach(function (x) {
          var prop = proposeJoin(I, x.list, x.n);
          if (prop) add('perf-view-entity', pq + ' ' + prop.parent + ' ' + prop.child, 'P3', 'performance', 'A view entity can show ' + short(prop.parent) + ' with its ' + short(prop.child) + ' in ' + pq + ' in one query',
            'Each row of the ' + x.list.kind + ' in ' + pq + ' opens a data view over ' + prop.assoc + ' to read ' + prop.child + '. A view entity with the query below joins the two, so the list reads both in one query; the attributes are the ones the page shows.',
            'Create a view entity from the OQL under "How to fix", point the list at it and replace the inner data view by its columns.',
            [pq, prop.parent, prop.child], { register: 'proposal', oql: prop.oql });
        });
      }
    });
    (model.entities || []).forEach(function (e) {
      (e.attributes || []).filter(function (a) { return a.calculated; }).forEach(function (a) {
        var k = e.qualifiedName + '.' + a.name, by = I.flows[a.calculatedBy], A = by && by.activity;
        var reads = A ? (A.retrieves || []).filter(function (r) { return r.over === 'database'; }).length : 0;
        var lists = (listed[e.qualifiedName] || []).slice();
        add('perf-calculated', k, lists.length || reads ? 'P2' : 'P3', 'performance', k + ' is calculated by a microflow every time an object is read' + (lists.length ? ', and is shown in a list' : ''),
          k + ' is not stored: ' + (a.calculatedBy || 'its microflow') + ' runs for every ' + e.name + ' object retrieved, in every list and every retrieve, whether the value is shown or not' +
          (reads ? '; it reads from the database itself (' + reads + ' retrieve' + (reads > 1 ? 's' : '') + '), so a list of 50 rows makes 50 more queries' : '') +
          (lists.length ? '. Lists of ' + e.name + ': ' + lists.join(', ') : '') + '.',
          'Store the value instead (an attribute set when what it depends on changes, in a before-commit event or the flow that changes it), or work it out in a view entity for the page that needs it.',
          [k, a.calculatedBy].concat(lists).filter(Boolean));
      });
    });

    // 4. Temporary objects the browser never drops: a non-persistable entity (or a view entity) a page works with,
    // tied by an association to the session or the user, which the client's garbage collector keeps until a reload,
    // and no flow the page starts calls one of the cleanup actions of the wiki's guide-cleanup page (MXS-71).
    function rooted(qn) {
      for (var e = qn, i = 0; e && i < 20; i++) { if (ROOTS[e]) return true; e = I.entities[e] && I.entities[e].generalization; }
      return false;
    }
    var held = {};
    (model.associations || []).forEach(function (a) {
      [[a.owner, a.other], [a.other, a.owner]].forEach(function (p) {
        var t = I.entities[p[0]];
        if (t && (t.persistable === false || t.viewEntity) && rooted(p[1])) (held[p[0]] = held[p[0]] || []).push(p[1] + ' over ' + aqn(a));
      });
    });
    var nanos = {};
    (model.nanoflows || []).forEach(function (f) { nanos[f.qualifiedName] = true; });
    if (Object.keys(held).length) (model.pages || []).forEach(function (p) {
      var used = {}, reach = {}, todo = [];
      var parts = [p].concat((p.snippets || []).map(function (s) { return I.snippets[s]; }).filter(Boolean));
      parts.forEach(function (d) {
        (d.dataSources || []).forEach(function (s) { if (s.entity) used[s.entity] = true; if (s.flow) todo.push(s.flow); });
        (d.parameters || []).forEach(function (x) { if (x.entityQualifiedName) used[x.entityQualifiedName] = true; });
        (d.creates || []).forEach(function (e) { used[e] = true; });
        todo = todo.concat(d.flowRefs || []);
      });
      while (todo.length && Object.keys(reach).length < 200) {
        var q = todo.shift(), f = I.flows[q];
        if (!f || reach[q]) continue;
        reach[q] = f;
        var A = f.activity || {};
        Object.keys(A.writes || {}).forEach(function (e) { used[e] = true; });
        (A.retrieves || []).forEach(function (r) { if (r.entity) used[r.entity] = true; });
        todo = todo.concat(A.calls || []);
      }
      var ents = Object.keys(used).filter(function (e) { return held[e]; }).sort();
      if (!ents.length) return;
      var flowsHere = Object.keys(reach);
      if (flowsHere.some(function (q) { var A = reach[q].activity || {}; return (A.jsActions || []).concat(A.javaActions || []).some(function (x) { return CLEANUP.test(short(x)); }); })) return;
      var nano = flowsHere.some(function (q) { return nanos[q]; }), pq = p.qualifiedName;
      var action = nano ? 'JS_ClearUnusedObjects' : 'JA_DeleteNonPersistable';
      add('perf-held-objects', pq, 'P2', 'performance', 'Temporary objects on ' + pq + ' stay in the browser until a reload',
        pq + ' works with ' + ents.map(function (e) { return e + ' (' + (I.entities[e].viewEntity ? 'a view entity' : 'non-persistable') + ', tied to ' + held[e].join(' and ') + ')'; }).join('; ') +
        '. The browser’s garbage collector keeps every temporary object connected to the session or the user, so each one made on this page stays in memory until the page is reloaded, and the page grows slower the longer it is used. No flow the page starts clears them. How many pile up depends on how the page is used, which the model cannot show.',
        (nano ? 'The page starts nanoflows: call the JavaScript action JS_ClearUnusedObjects' : 'The page starts microflows only: call the Java action JA_DeleteNonPersistable') +
        ' at the end of the flow that is done with these objects, passing them (Help → Wiki → Clear temporary objects without a reload has the code). Where the association to the session or the user is not needed, dropping it lets the browser clear the objects by itself.',
        [pq].concat(ents), { action: action, guide: { where: pq + ', the flow that is done with ' + ents.join(', ') + '.',
          expected: 'A call to ' + action + ' with the objects the page no longer needs' + (nano ? ', in a nanoflow' : ', in a microflow') + '.',
          check: ['Use ' + pq + ' a few times, then run the flow: a list over the association to the session or the user is empty, and what the page still shows stays editable.'] } });
    });

    var counts = { risks: out.length, P1: 0, P2: 0, P3: 0, setAside: setAside };
    out.forEach(function (r) { counts[r.level]++; });
    return { risks: out, counts: counts, setAside: setAside, rules: RULES };
  }

  // ---------- view entity proposals ----------
  function alias(name, used) { var a = name, n = 2; while (used[a]) a = name + n++; used[a] = true; return a; }
  function stored(e, n) {
    return (e && e.attributes || []).filter(function (a) { return !a.calculated && a.type !== 'Binary'; })
      .sort(function (a, b) { return (b.type === 'String') - (a.type === 'String'); }).slice(0, n).map(function (a) { return a.name; });
  }
  function otherEnd(a, entity) { return a.owner === entity ? a.other : a.other === entity ? a.owner : null; }
  function aqn(a) { return a.name.indexOf('.') < 0 && a.module ? a.module + '.' + a.name : a.name; }
  // A retrieve per item of a loop, then Count/Sum/… of what it returned → one grouped query.
  function proposeAggregate(I, g, loop, P, A, flow) {
    var L = loop.loop || {}, parent = null, child = null, assoc = null;
    if (L.mode !== 'list' || !L.listVariable) return null;
    (flow.parameters || []).forEach(function (p) { if (p.name === L.listVariable && p.entityQualifiedName) parent = p.entityQualifiedName; });
    g.nodes.forEach(function (n) { var Q = n.props || {}; if (!parent && n.action === 'RetrieveAction' && Q.out === L.listVariable && Q.entity) parent = Q.entity; });
    if (!parent) return null;
    if (P.source === 'By association') {
      if (P.from !== L.iteratorVariable) return null;
      assoc = I.assoc[P.association];
      child = assoc && otherEnd(assoc, parent);
    } else {
      var m = new RegExp('\\[\\s*([A-Za-z_]\\w*\\.[A-Za-z_]\\w*)\\s*=\\s*\\$' + L.iteratorVariable + '\\s*\\]').exec(P.xpath || '');
      assoc = m && I.assoc[m[1]];
      child = P.entity;
      if (!assoc || otherEnd(assoc, child) !== parent) return null;
    }
    if (!assoc || !child || !I.entities[parent] || !I.entities[child]) return null;
    var used = {}, cols = stored(I.entities[parent], 3);
    var fn = AGG[A['function']], what = fn === 'COUNT' ? 'c.ID' : A.attribute ? 'c.' + A.attribute : null;
    if (!what) return null;
    var sel = cols.map(function (c) { return 'p.' + c + ' AS ' + alias(c, used); });
    sel.push(fn + '(' + what + ') AS ' + alias(String(A['function']) + short(child) + (fn === 'COUNT' ? '' : A.attribute), used));
    return { parent: parent, child: child, oql: 'SELECT ' + sel.join(',\n       ') + '\nFROM ' + parent + ' AS p\nLEFT OUTER JOIN p/' + aqn(assoc) + '/' + child + ' AS c' +
      (cols.length ? '\nGROUP BY ' + cols.map(function (c) { return 'p.' + c; }).join(', ') : '') };
  }
  // A data view per row of a list, over one association → one joined query with the attributes the page shows.
  function proposeJoin(I, list, inner) {
    var S = list.source, T = inner.source;
    if (S.kind !== 'database' || !S.entity || inner.kind !== 'dataview' || T.kind !== 'association' || !T.path || T.path.length !== 1 || !T.entity) return null;
    var assoc = I.assoc[T.path[0]];
    if (!assoc || otherEnd(assoc, S.entity) !== T.entity) return null;
    var outer = [], inn = [];
    function bound(nodes, into, entity, stop) {
      (nodes || []).forEach(function (n) {
        if (!n || n === stop) return;
        if (n.attribute && !n.path && n.attribute.indexOf(entity + '.') === 0 && into.indexOf(short(n.attribute)) < 0) {
          var a = attrOf(I, entity, short(n.attribute));
          if (a && !a.attr.calculated) into.push(short(n.attribute));
        }
        bound(n.widgets, into, entity, stop); bound(n.footer, into, entity, stop);
      });
    }
    bound(list.widgets, outer, S.entity, inner);
    bound(inner.widgets, inn, T.entity, null);
    if (!inn.length) return null;
    var used = {}, sel = outer.map(function (c) { return 'p.' + c + ' AS ' + alias(c, used); })
      .concat(inn.map(function (c) { return 'o.' + c + ' AS ' + alias(short(T.entity) + c, used); }));
    return { parent: S.entity, child: T.entity, assoc: aqn(assoc),
      oql: 'SELECT ' + sel.join(',\n       ') + '\nFROM ' + S.entity + ' AS p\nLEFT OUTER JOIN p/' + aqn(assoc) + '/' + T.entity + ' AS o' };
  }

  // What this model cannot say, so a decided risk of that kind is not taken as gone: no flow bodies
  // (a JSON export) → nothing about loops; no indexes read → nothing about indexes; no page structure
  // → nothing about pages. → { prefixes: ['id:mx-perf-…'] }
  function unchecked(model) {
    var pre = [], flows = (model.microflows || []).concat(model.nanoflows || []);
    if (flows.length && !flows.some(function (f) { return f.graph; })) pre.push('id:mx-perf-retrieve-in-loop', 'id:mx-perf-commit-in-loop', 'id:mx-perf-delete-in-loop', 'id:mx-perf-call-in-loop', 'id:mx-perf-view-entity');
    if ((model.entities || []).length && !(model.entities || []).some(function (e) { return Array.isArray(e.indexes); })) pre.push('id:mx-perf-no-index');
    if ((model.pages || []).length && !(model.pages || []).some(function (p) { return p.structure; })) pre.push('id:mx-perf-heavy-page', 'id:mx-perf-row-query', 'id:mx-perf-view-entity', 'id:mx-perf-calculated');
    return { prefixes: pre };
  }

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    if (!cache || !model || typeof model !== 'object') return check(model || {});
    if (!cache.has(model)) cache.set(model, check(model));
    return cache.get(model);
  }
  function risks(model) { return of(model).risks; }

  window.MxPerfRisks = { CHECKS: CHECKS, RULES: RULES, check: check, of: of, risks: risks, unchecked: unchecked, riskId: riskId, compared: compared, costly: costly };
})();
