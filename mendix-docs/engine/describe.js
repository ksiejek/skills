/* MxScout — descriptions written by an AI agent, and the pack it writes them from.
 *
 * MxScout reads a model; it does not write prose about it. What a business
 * reader wants — what the application is for, its main processes, a sentence
 * on what each microflow does — takes a language model. That model runs
 * OUTSIDE MxScout, on the reader's own terms (a local agent with the
 * mendix-describe skill), and the two meet through two files:
 *
 *  - the AI pack, which MxScout writes: the model as the documentation
 *    already reads it — every flow as its steps with the data they set, every
 *    entity with its members and associations, who may read, write, create
 *    and delete it, and the validation rules that refuse a save — in a
 *    dense text a model reads cheaply, one section per module, an index of
 *    line ranges at the top so an agent reads one module at a time, and a
 *    fingerprint per flow so the next run describes only what changed;
 *  - the descriptions file, which the agent writes and MxScout imports: JSON,
 *    checked here before anything of it is kept.
 *
 * MxScout opens no connection for any of this and runs no model. The pack is
 * a browser download, or — when the person presses Share with an agent — held in
 * the server's memory for an agent on this machine to read (docs.js, and
 * server/routes/agent.js); the descriptions arrive by a file the reader picks, or
 * from that agent, kept only when the person presses Import. In
 * the documentation every imported sentence is marked as written by AI,
 * because the rest of it is read from the model and says so.
 */
(function () {
  'use strict';

  var PACK_FORMAT = 'mxscout-ai-pack';
  var DESC_FORMAT = 'mxscout-descriptions';
  var MAX_VALUE = 200;
  var STORY_MAX = 16000;   // a long description: several paragraphs, ~1,200 words at the most the brief asks for

  // ---------- fingerprints ----------
  // FNV-1a over what a description is ABOUT: the flow's inputs, result and
  // steps. Not who calls it — a new caller does not change what a flow does.
  function fnv(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  // A flow's entry is not changed once docs-data.js has built it, so its
  // fingerprint and its text are worked out once: attaching descriptions,
  // the pack and the chat assistant's parts all ask for them, on every flow.
  // The chat assistant's card works out every flow's text when the
  // Documentation section is drawn; the pack, made when it is asked for,
  // takes the same lines from here instead of writing them again.
  var memo = typeof WeakMap === 'function' ? { hash: new WeakMap(), text: new WeakMap(), lines: new WeakMap() } : null;
  // A copy of an entry (docs-data.js flowEntry) shares what is worked out with the entry it copies.
  function remembered(kind, f, make) {
    if (!memo || !f || typeof f !== 'object') return make(f);
    var key = f.same || f;
    var v = memo[kind].get(key);
    if (v === undefined) { v = make(f); memo[kind].set(key, v); }
    return v;
  }
  function hashOf(f) { return remembered('hash', f, hashOfNow); }
  function hashOfNow(f) {
    if (f.kind === 'page') return fnv(JSON.stringify([f.params, f.roles]));
    return fnv(JSON.stringify([f.params, f.returns, f.workflow]));
  }
  // An entity's fingerprint is its members and associations only — not its access rules or its
  // validation rules, which the pack lists under it (accessLines, validationLines). A description of
  // an entity says what it holds; a role gaining write access does not make that out of date, and
  // adding those lines to the pack did not mark every entity's description out of date.
  function entityHash(e, assoc) { return fnv(JSON.stringify([e.attributes, e.generalization, assoc])); }

  // ---------- the pack ----------
  function cut(v, max) {
    max = max || MAX_VALUE;
    var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }
  function short(qn) { return String(qn || '').split('.').pop(); }

  function stepLines(list, depth, out) {
    var pad = new Array(depth + 1).join('  ');
    (list || []).forEach(function (b) {
      if (b.t === 'start') return;
      if (b.t === 'end') { out.push(pad + '- ' + (b.kind === 'errorEvent' ? 'error end' : b.kind === 'break' ? 'break' : b.kind === 'continue' ? 'next iteration' : 'end') + (b.returns ? ' returns ' + cut(b.returns) : '')); return; }
      if (b.t === 'go') { out.push(pad + (b.back ? '- ↩ back to step ' : '- ↪ step ') + (b.no || '?')); return; }
      if (b.t === 'orphan') { out.push(pad + '- (separate path)'); stepLines(b.body, depth + 1, out); return; }
      if (b.t === 'loop') {
        out.push(pad + '- ' + b.no + ' ' + (b.cond !== null && b.cond !== undefined ? 'while ' + cut(b.cond || 'condition') : 'for each ' + (b.each || 'item') + ' in ' + (b.over || 'list')) + ':');
        stepLines(b.body, depth + 1, out);
        return;
      }
      if (b.t === 'split') {
        out.push(pad + '- ' + b.no + ' if ' + JSON.stringify(cut(b.title)) + (b.cond ? ' ' + cut(b.cond) : '') + ':');
        b.branches.forEach(function (x) {
          out.push(pad + '  - ' + (x.label === null || x.label === undefined ? '(other)' : cut(x.label)) + ':');
          if (x.body.length) stepLines(x.body, depth + 2, out); else out.push(pad + '    - (continues)');
        });
        return;
      }
      if (b.t === 'step') {
        var c = b.card;
        var kick = String(c.kick || '');
        if (c.ref && c.fam === 'call') kick = kick.split(' · ')[0]; // the module is in the qualified name
        var line = pad + '- ' + b.no + ' ' + kick.charAt(0).toLowerCase() + kick.slice(1) + ' ' + cut(c.ref && c.fam === 'call' ? c.ref.qn : c.title);
        // A change's detail is the list of members it sets; with the values
        // below, the names alone would be said twice.
        var detail = c.detail;
        if (detail && c.fields) {
          var named = {};
          c.fields.forEach(function (x) { named[x.name] = true; });
          detail = detail.split(', ').filter(function (t) { return !named[t]; }).join(', ');
        }
        if (detail && detail !== c.title) line += ' · ' + cut(detail);
        if (c.fields) line += ' {' + c.fields.map(function (x) { return x.name + (x.op && x.op !== 'Set' ? ' ' + x.op.toLowerCase() + ' ' : '=') + cut(x.value); }).join('; ') + '}';
        if (c.off) line += ' (disabled)';
        out.push(line);
        if (b.error) { out.push(pad + '  on error:'); stepLines(b.error, depth + 2, out); }
      }
    });
  }

  function flowBlock(f, out) {
    var tag = f.kind === 'page' ? 'PG' : f.kind === 'nanoflow' ? 'NF' : 'MF';
    out.push('### ' + tag + ' ' + f.qn + ' #' + hashOf(f));
    if (f.roles.length) out.push('roles: ' + f.roles.map(short).join(', '));
    if (f.params.length) out.push('in: ' + f.params.map(function (p) { return p.name + ': ' + p.type; }).join('; '));
    if (f.calledBy.length) {
      var by = {};
      f.calledBy.forEach(function (c) { (by[c.kind] = by[c.kind] || []).push(short(c.qn)); });
      out.push('from: ' + Object.keys(by).map(function (k) { return k + ' ' + by[k].slice(0, 6).join(', ') + (by[k].length > 6 ? ' +' + (by[k].length - 6) : ''); }).join('; '));
    }
    if (f.kind !== 'page' && f.returns) out.push('returns: ' + f.returns);
    if (f.doc) out.push('doc: ' + cut(f.doc));
    if (f.kind !== 'page' && f.workflow) { out.push('steps:'); stepLines(f.workflow, 0, out); }
  }

  function entityLine(e, data) {
    var refs = [];
    data.associations.forEach(function (a) {
      if (a.from === e.qn) refs.push('→ ' + a.to + (a.many ? ' (*-*)' : ' (*-1)') + ' via ' + a.name);
      else if (a.to === e.qn) refs.push('← ' + a.from + (a.many ? ' (*-*)' : ' (*-1)') + ' via ' + a.name);
    });
    var parts = ['E ' + e.name + ' #' + entityHash(e, refs) + (e.persistable ? '' : ' (not persistable)') + (e.generalization ? ' extends ' + e.generalization : '')];
    if (e.attributes.length) parts.push('attrs: ' + e.attributes.map(function (a) { return a.name + ':' + a.type; }).join(', '));
    if (refs.length) parts.push('refs: ' + refs.join(', '));
    if (e.doc) parts.push('doc: ' + cut(e.doc));
    return parts.join(' | ');
  }

  // Who may do what with an entity: one line per module role an access rule names, under the
  // entity's line. "read" lists the members it may read, "write" those it may change too; a member
  // left out is one it may not touch. "assoc" is the same for the associations the entity owns, said
  // only when it owns some. Then create and delete, and the rows: all of them, or only those the
  // XPath lets through, kept as the model has it. An entity no rule names gets "access none".
  // skills/mendix-describe/reference/pack-format.md.
  var XPATH_MAX = 300;
  function memberSet(names, ok) {
    var yes = names.filter(ok), no = names.filter(function (n) { return !ok(n); });
    if (!yes.length) return 'none';
    if (!no.length) return 'all';
    return no.length < yes.length ? 'all except ' + no.join(', ') : yes.join(', ');
  }
  function accessLines(e, data, out) {
    // No rule: no module role reaches it from the client; only a flow can.
    if (!(e.access || []).length) { out.push('  access none'); return; }
    var owned = data.associations.filter(function (a) { return a.from === e.qn; }).map(function (a) { return a.name; });
    (e.access || []).forEach(function (r) {
      var m = r.members || {};
      // The associations the entity owns and those the rule names; every other member it names is an
      // attribute — the entity's own, or one it inherits, which a rule on a specialisation names too.
      var assocs = owned.slice(), isAssoc = {};
      owned.concat(r.assocs || []).forEach(function (k) { isAssoc[k] = true; if (assocs.indexOf(k) === -1) assocs.push(k); });
      var attrs = e.attributes.map(function (a) { return a.name; });
      Object.keys(m).forEach(function (k) { if (!isAssoc[k] && attrs.indexOf(k) === -1) attrs.push(k); });
      function reads(k) { return m[k] === 'r' || m[k] === 'rw'; }
      function writes(k) { return m[k] === 'rw'; }
      var parts = [];
      if (attrs.length) parts.push('read ' + memberSet(attrs, reads), 'write ' + memberSet(attrs, writes));
      parts.push(r.create ? 'create' : 'no create', r.del ? 'delete' : 'no delete');
      if (assocs.length) parts.push('assoc read ' + memberSet(assocs, reads), 'assoc write ' + memberSet(assocs, writes));
      out.push('  access ' + r.role + ': ' + parts.join(' · ') + ' — ' + (r.xpath ? 'only ' + cut(r.xpath, XPATH_MAX) : 'all rows'));
    });
  }

  // What refuses a save before any flow runs: one line per validation rule, under the access lines.
  function bound(b) { return !b ? '?' : b.attribute ? 'attribute ' + b.attribute : cut(b.value); }
  function validationLines(e, out) {
    (e.validations || []).forEach(function (v) {
      var what = v.kind;
      if (v.kind === 'range') what = v.min && v.max ? 'range ' + bound(v.min) + '..' + bound(v.max) : v.min ? 'range ≥ ' + bound(v.min) : v.max ? 'range ≤ ' + bound(v.max) : 'range';
      else if (v.kind === 'regex') what = 'regex ' + (v.regex || '?');
      else if (v.kind === 'maxLength') what = 'max length ' + (v.max === null || v.max === undefined ? '?' : v.max);
      else if (v.kind === 'equals') what = 'equals ' + bound(v.to);
      out.push('  valid ' + v.attribute + ': ' + what + (v.message ? ' — ' + JSON.stringify(cut(v.message)) : ''));
    });
  }

  // data is what MxDocsData.build returns.
  function pack(data) {
    var own = data.modules.filter(function (m) { return !m.marketplace && (m.microflows.length + m.nanoflows.length + m.pages.length + m.entities.length); });
    var market = data.modules.filter(function (m) { return m.marketplace; }).map(function (m) { return m.name; });
    var blocks = own.map(function (m) {
      var out = ['## module ' + m.name];
      if (m.entities.length) {
        out.push('### entities');
        m.entities.forEach(function (q) {
          var e = data.entities[q];
          out.push(entityLine(e, data));
          accessLines(e, data, out);
          validationLines(e, out);
        });
      }
      m.microflows.concat(m.nanoflows, m.pages).forEach(function (k) {
        out.push('');
        var lines = flowLines(data.flows[k]);
        for (var i = 0; i < lines.length; i++) out.push(lines[i]);
      });
      out.push('');
      return { m: m, lines: out };
    });
    var head = [
      '# MxScout AI pack',
      'format: ' + PACK_FORMAT + ' 1',
      'project: ' + data.project,
      (data.mendix ? 'mendix: ' + data.mendix : null),
      'generated: ' + data.generatedAt,
      'read with: the mendix-describe skill (skills/mendix-describe in the MxScout repository); it says what to write and in what format',
      // Each user role with the module roles it carries: an entity's access lines name module roles.
      'roles: ' + data.roles.map(function (r) { return r.name + (r.moduleRoles && r.moduleRoles.length ? ' (' + r.moduleRoles.join(', ') + ')' : ''); }).join('; '),
      data.scheduled.length ? 'scheduled events: ' + data.scheduled.map(function (s) { return short(s.name) + ' → ' + (s.microflow || '?') + (s.enabled ? '' : ' (off)'); }).join('; ') : null,
      data.services.length ? 'published services: ' + data.services.map(function (s) { return s.name + (s.kind ? ' (' + s.kind + ')' : ''); }).join('; ') : null,
      market.length ? 'not included: ' + market.length + ' Marketplace modules — ' + market.join(', ') : null,
      'legend: MF microflow, NF nanoflow, PG page, E entity; #xxxxxxxx is a fingerprint — copy it into the description; {member=value} is the data a step sets or passes; → owns an association to, ← is owned by; under an entity, "access <module role>:" is what that role may read, write, create and delete, and on which rows, and "valid <attribute>:" a validation rule that refuses a save',
      ''
    ].filter(function (l) { return l !== null; });
    var indexHead = ['## index', 'module | lines | microflows | nanoflows | pages | entities'];
    var line = head.length + indexHead.length + own.length + 2; // +1 blank, then the first module heading
    var index = blocks.map(function (b) {
      var from = line, to = line + b.lines.length - 1;
      line = to + 1;
      return b.m.name + ' | ' + from + '-' + to + ' | ' + b.m.microflows.length + ' | ' + b.m.nanoflows.length + ' | ' + b.m.pages.length + ' | ' + b.m.entities.length;
    });
    var all = head.concat(indexHead, index, ['']);
    blocks.forEach(function (b) { all = all.concat(b.lines); });
    var text = all.join('\n') + '\n';
    var out = { text: text, modules: own.length, flows: own.reduce(function (n, m) { return n + m.microflows.length + m.nanoflows.length; }, 0) };
    // Its fingerprint, worked out when something asks for it: on a large project it is a read of
    // every character of the pack, and sharing it with an agent has no use for it.
    var id = null;
    Object.defineProperty(out, 'id', { enumerable: true, get: function () { return id || (id = fnv(text)); } });
    return out;
  }

  // ---------- the descriptions file ----------
  function str(v, max) { return typeof v === 'string' && v.trim() ? v.trim().slice(0, max || 4000) : null; }

  // A module's notes for developers (skills/mendix-describe/reference/module-notes.md): sections of
  // text, bullet lines and one small table. Every part is kept as text; nothing is markup.
  function notesOf(list) {
    if (!Array.isArray(list)) return null;
    var out = list.slice(0, 16).map(function (s) {
      if (!s || typeof s !== 'object' || !str(s.title, 160)) return null;
      var t = s.table && typeof s.table === 'object' ? s.table : null;
      var cols = t && Array.isArray(t.columns) ? t.columns.slice(0, 6).map(function (c) { return str(c, 60); }).filter(Boolean) : [];
      var rows = t && cols.length && Array.isArray(t.rows) ? t.rows.slice(0, 80).map(function (r) {
        return Array.isArray(r) ? r.slice(0, cols.length).map(function (c) { return String(c === null || c === undefined ? '' : c).replace(/\s+/g, ' ').trim().slice(0, 500); }) : null;
      }).filter(function (r) { return r && r.some(Boolean); }) : [];
      var sec = {
        title: str(s.title, 160), text: str(s.text, 6000),
        items: (Array.isArray(s.items) ? s.items : []).slice(0, 60).map(function (x) { return str(x, 800); }).filter(Boolean),
        table: rows.length ? { columns: cols, rows: rows } : null
      };
      return sec.text || sec.items.length || sec.table ? sec : null;
    }).filter(Boolean);
    return out.length ? out : null;
  }

  // The architecture the agent drew (skills/mendix-describe/reference/c4.md): nodes and the links between
  // them. A link to a node that is not there is dropped; a kind it does not know becomes a system.
  var C4_KINDS = { person: true, system: true, app: true, store: true, part: true };
  function diagramOf(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.nodes)) return null;
    var ids = Object.create(null);
    var nodes = raw.nodes.slice(0, 100).map(function (n) {
      if (!n || typeof n !== 'object') return null;
      var id = str(n.id, 40), name = str(n.name, 80);
      if (!id || !name || !/^[A-Za-z0-9_-]+$/.test(id) || ids[id]) return null;
      ids[id] = true;
      return { id: id, name: name, note: str(n.note, 140), kind: typeof n.kind === 'string' && C4_KINDS[n.kind] === true ? n.kind : 'system', group: str(n.group, 60) };
    }).filter(Boolean);
    if (!nodes.length) return null;
    var links = (Array.isArray(raw.links) ? raw.links : []).slice(0, 250).map(function (l) {
      return l && typeof l.from === 'string' && typeof l.to === 'string' && ids[l.from] && ids[l.to] && l.from !== l.to ? { from: l.from, to: l.to, label: str(l.label, 60) } : null;
    }).filter(Boolean);
    return { nodes: nodes, links: links, note: str(raw.note, 600) };
  }

  // A process's simplified diagram (skills/mendix-describe/reference/descriptions-format.md, "diagram"),
  // drawn on the Processes page by the flow drawing (flowgraph.js): business steps, decisions with their
  // ways, ends. Karol, 2026-10-14: a process that branches — how an order finds its warehouse — reads better
  // drawn. Text only, bounded in size and depth; anything else in it is dropped.
  function diagramItems(list, depth) {
    if (!Array.isArray(list) || depth > 6) return [];
    return list.slice(0, 60).map(function (x) {
      if (!x || typeof x !== 'object') return null;
      if (str(x.decision, 200)) {
        var ways = (Array.isArray(x.ways) ? x.ways : []).slice(0, 6).map(function (w) {
          if (!w || typeof w !== 'object') return null;
          return { label: str(w.label, 60) || '', items: diagramItems(w.then, depth + 1), end: str(w.end, 160), join: str(w.join, 200) };
        }).filter(Boolean);
        return ways.length ? { t: 'decision', text: str(x.decision, 200), ways: ways } : null;
      }
      if (str(x.step, 200)) return { t: 'step', text: str(x.step, 200), who: str(x.who, 60), by: x.by === 'app' ? 'app' : 'person' };
      if (str(x.end, 160)) return { t: 'end', text: str(x.end, 160) };
      return null;
    }).filter(Boolean);
  }

  // A change the person asked an agent to work out (skills/mendix-describe/SKILL.md, "A change, when the
  // person asks"; Karol, 2026-10-14: "I have a change I want to make — how does it work now, and what
  // would the solution be"): the process as it works today, the proposed solution, the concrete changes to
  // the model, and what they touch. A proposal: MxScout shows it, and nothing of it is applied anywhere.
  // Text only, bounded; an entry without an id or a title is dropped, and so is a model change with an
  // action it does not know. The fields and their bounds: descriptions-format.md, "changes".
  var CHANGE_STATUS = { proposed: true, accepted: true, done: true, dropped: true };
  var CHANGE_KINDS = { microflow: true, nanoflow: true, page: true, entity: true, attribute: true, association: true, enumeration: true, security: true, 'scheduled event': true, integration: true, other: true };
  var CHANGE_ACTIONS = { add: true, change: true, remove: true };
  function texts(list, max, n) { return (Array.isArray(list) ? list : []).map(function (s) { return str(s, max); }).filter(Boolean).slice(0, n); }
  function changeOf(c) {
    if (!c || typeof c !== 'object') return null;
    var id = str(c.id, 80), title = str(c.title, 200);
    if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !title) return null;
    var now = c.now && typeof c.now === 'object' ? c.now : {}, pr = c.proposal && typeof c.proposal === 'object' ? c.proposal : {};
    var im = c.impact && typeof c.impact === 'object' ? c.impact : {};
    return {
      id: id, title: title, asked: str(c.asked, 2000), date: str(c.date, 40), status: CHANGE_STATUS[c.status] === true ? c.status : 'proposed',
      now: { summary: str(now.summary, 2000), story: str(now.story, STORY_MAX), steps: texts(now.steps, 600, 100), flows: texts(now.flows, 300, 60), diagram: diagramItems(now.diagram, 0) },
      proposal: {
        summary: str(pr.summary, 2000), story: str(pr.story, STORY_MAX), steps: texts(pr.steps, 600, 100), diagram: diagramItems(pr.diagram, 0),
        changes: (Array.isArray(pr.changes) ? pr.changes : []).slice(0, 60).map(function (x) {
          if (!x || typeof x !== 'object' || !str(x.target, 300) || CHANGE_ACTIONS[x.action] !== true) return null;
          var kind = typeof x.kind === 'string' ? x.kind.trim().toLowerCase() : '';
          return { kind: CHANGE_KINDS[kind] === true ? kind : 'other', target: str(x.target, 300), action: x.action, what: str(x.what, 1000) };
        }).filter(Boolean)
      },
      impact: { flows: texts(im.flows, 300, 60), roles: texts(im.roles, 120, 30), data: str(im.data, 3000) },
      risks: (Array.isArray(c.risks) ? c.risks : []).slice(0, 30).map(function (x) {
        return x && typeof x === 'object' && /^P[123]$/.test(x.level) && str(x.title, 300) ? { level: x.level, title: str(x.title, 300), detail: str(x.detail, 3000), fix: str(x.fix, 1000) } : null;
      }).filter(Boolean),
      open: texts(c.open, 1000, 30), effort: str(c.effort, 300)
    };
  }

  // A ticket checked against the model (skills/mendix-ticket-check; Karol, 2026-10-14: "I paste a ticket
  // reported on the application, it checks whether the ticket is right and keeps the result in the
  // documentation"): the ticket as it was pasted, a verdict — a bug in the model, works as designed, data
  // or configuration, or cannot tell from the model — with the reasoning, the behaviour as the model has
  // it, the places in the model that show it, what would settle it, a reply to paste back, and for a bug
  // the change that would fix it (an id on the Changes page). An agent's judgement: MxScout shows it and
  // acts on none of it; a source address is kept as text and never opened. An entry without an id, a
  // title, a verdict or a summary is dropped. The fields and their bounds: descriptions-format.md, "Tickets".
  var TICKET_VERDICTS = { bug: true, 'as-designed': true, 'data-config': true, 'cannot-tell': true };
  var CONFIDENCE = { high: true, medium: true, low: true };
  function ticketOf(t) {
    if (!t || typeof t !== 'object') return null;
    var id = str(t.id, 80), title = str(t.title, 200), summary = str(t.summary, 2000);
    if (!id || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) || !title || TICKET_VERDICTS[t.verdict] !== true || !summary) return null;
    var tr = t.traced && typeof t.traced === 'object' ? t.traced : {}, change = str(t.change, 80);
    return {
      id: id, title: title, reported: str(t.reported, 8000), source: str(t.source, 300), date: str(t.date, 40),
      verdict: t.verdict, confidence: CONFIDENCE[t.confidence] === true ? t.confidence : 'low', summary: summary, story: str(t.story, STORY_MAX),
      traced: { steps: texts(tr.steps, 600, 100), flows: texts(tr.flows, 300, 60), diagram: diagramItems(tr.diagram, 0) },
      evidence: (Array.isArray(t.evidence) ? t.evidence : []).slice(0, 60).map(function (x) {
        if (!x || typeof x !== 'object' || !str(x.target, 300)) return null;
        var kind = typeof x.kind === 'string' ? x.kind.trim().toLowerCase() : '';
        return { kind: CHANGE_KINDS[kind] === true ? kind : 'other', target: str(x.target, 300), what: str(x.what, 1000) };
      }).filter(Boolean),
      needs: texts(t.needs, 1000, 30), reply: str(t.reply, 4000),
      change: change && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(change) ? change : null,
      risks: (Array.isArray(t.risks) ? t.risks : []).slice(0, 30).map(function (x) {
        return x && typeof x === 'object' && /^P[123]$/.test(x.level) && str(x.title, 300) ? { level: x.level, title: str(x.title, 300), detail: str(x.detail, 3000), fix: str(x.fix, 1000) } : null;
      }).filter(Boolean)
    };
  }

  // Checks the shape and keeps only what it understands, as text. Whatever
  // the file says is data to show, never markup and never instructions.
  function parse(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) { return { error: 'That file is not JSON.' }; }
    if (!raw || raw.format !== DESC_FORMAT) return { error: 'That is not a descriptions file — it should say "format": "' + DESC_FORMAT + '".' };
    if (raw.version !== 1) return { error: 'This descriptions file is version ' + raw.version + '; this MxScout reads version 1.' };
    var out = {
      project: str(raw.project, 200), language: str(raw.language, 20), by: str(raw.by, 200), written: str(raw.written, 40),
      app: null, modules: {}, microflows: {}, nanoflows: {}, pages: {}, entities: {}
    };
    // "add": true — this file adds to what is kept rather than replacing it (see merge below).
    if (raw.add === true) out.add = true;
    // ...and "replace": ["app"] — its application overview (summary, story, who uses it, the processes)
    // is the whole of it, in place of the one kept: an agent that wrote the overview again from the start.
    if (out.add && Array.isArray(raw.replace) && raw.replace.indexOf('app') !== -1) out.replace = ['app'];
    // The application, its processes and its modules come in two layers (skills/mendix-describe/reference/
    // business-narrative.md): a summary that is always shown and a story folded under it. Both are text.
    if (raw.app && typeof raw.app === 'object') {
      // Who uses it: a list of groups, each { who, what } (redesign spec 11), or — in a file written before — one sentence.
      var aud = raw.app.audience;
      out.app = {
        summary: str(raw.app.summary, 6000), story: str(raw.app.story, STORY_MAX), audience: str(aud, 1000),
        users: (Array.isArray(aud) ? aud : []).slice(0, 30).map(function (u) {
          return u && typeof u === 'object' && str(u.who, 120) ? { who: str(u.who, 120), what: str(u.what, 600) } : null;
        }).filter(Boolean),
        processes: (Array.isArray(raw.app.processes) ? raw.app.processes : []).slice(0, 200).map(function (p) {
          return p && typeof p === 'object' ? {
            name: str(p.name, 200), summary: str(p.summary, 2000), story: str(p.story, STORY_MAX),
            steps: (Array.isArray(p.steps) ? p.steps : []).map(function (s) { return str(s, 600); }).filter(Boolean).slice(0, 100),
            flows: (Array.isArray(p.flows) ? p.flows : []).map(function (s) { return str(s, 300); }).filter(Boolean).slice(0, 60),
            diagram: diagramItems(p.diagram, 0)
          } : null;
        }).filter(function (p) { return p && p.name; })
      };
    }
    function table(src, into, withNotes) {
      if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        var text = typeof v === 'string' ? str(v) : (v && typeof v === 'object' ? str(v.text) || str(v.summary) : null);
        var notes = withNotes && v && typeof v === 'object' ? notesOf(v.notes) : null;
        if (text || notes) into[k] = { text: text, hash: v && typeof v === 'object' ? str(v.hash, 16) : null, story: v && typeof v === 'object' ? str(v.story, STORY_MAX) : null, notes: notes };
      });
    }
    // One table per kind: a microflow and a page may share a qualified name.
    ['modules', 'microflows', 'nanoflows', 'pages', 'entities'].forEach(function (k) { table(raw[k], out[k], k === 'modules'); });
    // The architecture, if the agent drew it: the context and the containers, and what the model could not settle.
    var a4 = raw.c4 && typeof raw.c4 === 'object' ? raw.c4 : null;
    out.c4 = a4 ? { context: diagramOf(a4.context), containers: diagramOf(a4.containers), open: (Array.isArray(a4.open) ? a4.open : []).slice(0, 30).map(function (x) { return str(x, 500); }).filter(Boolean) } : null;
    if (out.c4 && !out.c4.context && !out.c4.containers) out.c4 = null;
    // Risks, ranked by the shared definition (skills/mendix-describe/reference/risk-levels.md), and what a
    // developer should know before changing the model. Text again; a level outside P1–P3 drops the risk.
    out.risks = (Array.isArray(raw.risks) ? raw.risks : []).slice(0, 2000).map(function (x) {
      return x && typeof x === 'object' && /^P[123]$/.test(x.level) && str(x.title, 300) ? {
        level: x.level, title: str(x.title, 300), detail: str(x.detail, 3000), fix: str(x.fix, 1000),
        // One of the report's ten themes (reportdata.js THEMES), when the agent names one; anything else is dropped.
        theme: /^(access|secrets|schedule|delete|loops|silent|hardcoded|dead|naming|logic)$/.test(x.theme) ? x.theme : null,
        where: (Array.isArray(x.where) ? x.where : []).map(function (s) { return str(s, 300); }).filter(Boolean).slice(0, 40)
      } : null;
    }).filter(Boolean);
    var c = raw.context && typeof raw.context === 'object' ? raw.context : {};
    function pairs(list, a, b) {
      return (Array.isArray(list) ? list : []).slice(0, 80).map(function (x) {
        return x && typeof x === 'object' && str(x[a], 300) && str(x[b], 1000) ? [str(x[a], 300), str(x[b], 1000)] : null;
      }).filter(Boolean);
    }
    out.context = {
      where: pairs(c.where, 'topic', 'place'),
      conventions: pairs(c.conventions, 'pattern', 'meaning'),
      pitfalls: (Array.isArray(c.pitfalls) ? c.pitfalls : []).map(function (s) { return str(s, 1000); }).filter(Boolean).slice(0, 80)
    };
    if (!out.context.where.length && !out.context.conventions.length && !out.context.pitfalls.length) out.context = null;
    // Changes, each once: a second entry with an id already read is dropped.
    var ids = {};
    out.changes = (Array.isArray(raw.changes) ? raw.changes : []).slice(0, 100).map(changeOf).filter(function (x) {
      if (!x || ids[x.id]) return false;
      ids[x.id] = true;
      return true;
    });
    // Tickets, each once by its id, the same way.
    var tids = {};
    out.tickets = (Array.isArray(raw.tickets) ? raw.tickets : []).slice(0, 200).map(ticketOf).filter(function (x) {
      if (!x || tids[x.id]) return false;
      tids[x.id] = true;
      return true;
    });
    if (!out.app && !out.c4 && !out.risks.length && !out.context && !out.changes.length && !out.tickets.length && !['modules', 'microflows', 'nanoflows', 'pages', 'entities'].some(function (k) { return Object.keys(out[k]).length; })) {
      return { error: 'The file has the right format but no descriptions in it.' };
    }
    return { value: out };
  }

  // A file that says "add": true is laid over the descriptions already kept, not put in their place
  // (Karol, 2026-10-14: after reading the documentation, "describe this process too" — the agent sends
  // the one process, and the flows it described for it, and nothing else is lost). A process of the same
  // name is replaced, a new one is added at the end; a flow, page, entity or module described again is
  // replaced; a risk with a title already kept is not added twice; a change with an id already kept is
  // replaced, a new one added at the end, and so is a ticket; the rest is kept as it was.
  function merge(base, more) {
    var out = JSON.parse(JSON.stringify(base || {
      project: null, language: null, by: null, written: null, app: null,
      modules: {}, microflows: {}, nanoflows: {}, pages: {}, entities: {}, risks: [], context: null, c4: null
    }));
    delete out.add; delete out.replace;
    ['modules', 'microflows', 'nanoflows', 'pages', 'entities'].forEach(function (k) {
      out[k] = out[k] || {};
      Object.keys(more[k] || {}).forEach(function (q) { out[k][q] = more[k][q]; });
    });
    if (more.app && more.replace && more.replace.indexOf('app') !== -1) out.app = JSON.parse(JSON.stringify(more.app));
    else if (more.app) {
      var a = out.app || (out.app = { summary: null, story: null, audience: null, users: [], processes: [] });
      if (more.app.summary) a.summary = more.app.summary;
      if (more.app.story) a.story = more.app.story;
      if (more.app.users && more.app.users.length) { a.users = more.app.users; a.audience = more.app.audience; }
      a.processes = a.processes || [];
      (more.app.processes || []).forEach(function (p) {
        var at = -1;
        a.processes.forEach(function (q, i) { if (at < 0 && q.name.toLowerCase() === p.name.toLowerCase()) at = i; });
        if (at < 0) a.processes.push(p); else a.processes[at] = p;
      });
    }
    var titles = {};
    (out.risks = out.risks || []).forEach(function (r) { titles[r.title.toLowerCase()] = true; });
    (more.risks || []).forEach(function (r) { if (!titles[r.title.toLowerCase()]) { titles[r.title.toLowerCase()] = true; out.risks.push(r); } });
    if (more.context) {
      var c = out.context || (out.context = { where: [], conventions: [], pitfalls: [] });
      c.where = c.where.concat(more.context.where); c.conventions = c.conventions.concat(more.context.conventions); c.pitfalls = c.pitfalls.concat(more.context.pitfalls);
    }
    if (more.c4) out.c4 = more.c4;
    out.changes = out.changes || [];
    (more.changes || []).forEach(function (c) {
      var at = -1;
      out.changes.forEach(function (x, i) { if (at < 0 && x.id === c.id) at = i; });
      if (at < 0) out.changes.push(c); else out.changes[at] = c;
    });
    // A ticket the same way, by its id: checked again, it replaces the one kept.
    out.tickets = out.tickets || [];
    (more.tickets || []).forEach(function (t) {
      var at = -1;
      out.tickets.forEach(function (x, i) { if (at < 0 && x.id === t.id) at = i; });
      if (at < 0) out.tickets.push(t); else out.tickets[at] = t;
    });
    ['project', 'language', 'by'].forEach(function (k) { if (!out[k] && more[k]) out[k] = more[k]; });
    if (more.written) out.written = more.written;
    return out;
  }

  // The descriptions as kept, written back as a descriptions file — for the .mxscout package
  // (transfer.js), whose receiving side reads them with parse() like any other file, so nothing
  // reaches its database that an import would not have let through.
  function toFile(v) {
    if (!v) return null;
    function items(list) {
      return (list || []).map(function (x) {
        if (x.t === 'step') return { step: x.text, who: x.who, by: x.by };
        if (x.t === 'decision') return { decision: x.text, ways: x.ways.map(function (w) { return { label: w.label, then: items(w.items), end: w.end, join: w.join }; }) };
        return { end: x.text };
      });
    }
    var f = { format: DESC_FORMAT, version: 1, project: v.project, language: v.language, by: v.by, written: v.written };
    if (v.app) f.app = {
      summary: v.app.summary, story: v.app.story, audience: v.app.users && v.app.users.length ? v.app.users : v.app.audience,
      processes: (v.app.processes || []).map(function (p) { return { name: p.name, summary: p.summary, story: p.story, steps: p.steps, flows: p.flows, diagram: items(p.diagram) }; })
    };
    ['modules', 'microflows', 'nanoflows', 'pages', 'entities'].forEach(function (k) {
      f[k] = {};
      Object.keys(v[k] || {}).forEach(function (q) { var x = v[k][q]; f[k][q] = { text: x.text, hash: x.hash, story: x.story, notes: x.notes }; });
    });
    if (v.c4) f.c4 = v.c4;
    f.risks = v.risks || [];
    if (v.changes && v.changes.length) f.changes = v.changes.map(function (c) {
      var x = JSON.parse(JSON.stringify(c));
      x.now.diagram = items(c.now.diagram); x.proposal.diagram = items(c.proposal.diagram);
      return x;
    });
    if (v.tickets && v.tickets.length) f.tickets = v.tickets.map(function (t) {
      var x = JSON.parse(JSON.stringify(t));
      x.traced.diagram = items(t.traced.diagram);
      return x;
    });
    if (v.context) f.context = {
      where: v.context.where.map(function (x) { return { topic: x[0], place: x[1] }; }),
      conventions: v.context.conventions.map(function (x) { return { pattern: x[0], meaning: x[1] }; }),
      pitfalls: v.context.pitfalls
    };
    return f;
  }

  // Puts the descriptions on the documentation data, in place. A flow whose
  // fingerprint moved since it was described is marked, not hidden: an old
  // sentence is still a lead, as long as it says it may be out of date.
  function attach(data, d) {
    if (!d) return { described: 0, stale: 0, missing: 0 };
    var own = {};
    data.modules.forEach(function (m) { if (!m.marketplace) own[m.name] = true; });
    var described = 0, stale = 0, missing = 0;
    Object.keys(data.flows).forEach(function (k) {
      var f = data.flows[k];
      var x = (d[f.kind + 's'] || {})[f.qn];
      if (x) {
        f.desc = x.text;
        f.descStale = !!(x.hash && x.hash !== hashOf(f));
        if (f.kind !== 'page' && own[f.module]) { described++; if (f.descStale) stale++; }
      } else if (f.kind !== 'page' && own[f.module]) missing++;
    });
    Object.keys(data.entities).forEach(function (q) { if (d.entities[q]) data.entities[q].desc = d.entities[q].text; });
    data.ai = {
      app: d.app, by: d.by, written: d.written, language: d.language,
      // A file imported before risks and context existed has neither.
      risks: d.risks || [], context: d.context || null,
      c4: d.c4 || null,
      // And the changes an agent proposed — none in a file imported before they existed.
      changes: d.changes || [],
      // And the tickets an agent checked against the model, the same.
      tickets: d.tickets || [],
      modules: Object.keys(d.modules).reduce(function (o, k) { o[k] = { summary: d.modules[k].text, story: d.modules[k].story || null, notes: d.modules[k].notes || null }; return o; }, {})
    };
    return { described: described, stale: stale, missing: missing };
  }

  // One flow as the pack writes it — for a route that sends the model in pieces (copilot.js).
  function flowText(f) { return remembered('text', f, function () { return flowLines(f).join('\n'); }); }
  // Its lines as the pack writes them, one entry a line — the pack's index counts them.
  function flowLines(f) { return remembered('lines', f, function () { var out = []; flowBlock(f, out); return out; }); }

  // The imported risks by the documents they name, for the screens that show
  // them beside a document (the App Explorer, Microflows). A risk names its
  // documents by qualified name; when two documents share one (a page and a
  // microflow both called Order_Edit) it is on both — unless the name says
  // which, as "Module.Name|mf" (mf, nf, pg, or en for an entity).
  var LEVELS = ['P1', 'P2', 'P3'];
  function riskIndex(d) {
    var all = (d && d.risks) || [], byDoc = {}, byModule = {};
    all.forEach(function (r, i) {
      var modulesHit = {};
      (r.where || []).forEach(function (w) {
        var m = /^([^|]+?)(?:\|(mf|nf|pg|dm|en))?$/.exec(String(w).trim());
        if (!m) return;
        var key = (m[2] === 'en' ? 'dm' : m[2] || '*') + ':' + m[1];
        (byDoc[key] = byDoc[key] || []).push(i);
        var dot = m[1].indexOf('.');
        if (dot > 0) modulesHit[m[1].slice(0, dot)] = true;
      });
      Object.keys(modulesHit).forEach(function (mod) { (byModule[mod] = byModule[mod] || []).push(i); });
    });
    return {
      all: all, byModule: byModule,
      // kindKey: mf, nf, pg or dm. Highest level first.
      of: function (kindKey, qn) {
        var seen = {}, out = [];
        (byDoc[kindKey + ':' + qn] || []).concat(byDoc['*:' + qn] || []).forEach(function (i) { if (!seen[i]) { seen[i] = true; out.push(all[i]); } });
        return out.sort(function (a, b) { return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level); });
      },
      levels: function (risks) { return LEVELS.filter(function (l) { return risks.some(function (r) { return r.level === l; }); }); }
    };
  }

  window.MxDescribe = { pack: pack, parse: parse, attach: attach, merge: merge, toFile: toFile, hashOf: hashOf, flowText: flowText, riskIndex: riskIndex, FORMAT: DESC_FORMAT, PACK_FORMAT: PACK_FORMAT };
})();
