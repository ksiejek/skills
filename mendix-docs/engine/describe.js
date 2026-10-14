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
 *    entity with its members and associations — in a dense text a model reads
 *    cheaply, one section per module, an index of line ranges at the top so
 *    an agent reads one module at a time, and a fingerprint per flow so the
 *    next run describes only what changed;
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
  function hashOf(f) {
    if (f.kind === 'page') return fnv(JSON.stringify([f.params, f.roles]));
    return fnv(JSON.stringify([f.params, f.returns, f.workflow]));
  }
  function entityHash(e, assoc) { return fnv(JSON.stringify([e.attributes, e.generalization, assoc])); }

  // ---------- the pack ----------
  function cut(v) {
    var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
    return s.length > MAX_VALUE ? s.slice(0, MAX_VALUE - 1) + '…' : s;
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

  // data is what MxDocsData.build returns.
  function pack(data) {
    var own = data.modules.filter(function (m) { return !m.marketplace && (m.microflows.length + m.nanoflows.length + m.pages.length + m.entities.length); });
    var market = data.modules.filter(function (m) { return m.marketplace; }).map(function (m) { return m.name; });
    var blocks = own.map(function (m) {
      var out = ['## module ' + m.name];
      if (m.entities.length) {
        out.push('### entities');
        m.entities.forEach(function (q) { out.push(entityLine(data.entities[q], data)); });
      }
      m.microflows.concat(m.nanoflows, m.pages).forEach(function (k) { out.push(''); flowBlock(data.flows[k], out); });
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
      'roles: ' + data.roles.map(function (r) { return r.name; }).join(', '),
      data.scheduled.length ? 'scheduled events: ' + data.scheduled.map(function (s) { return short(s.name) + ' → ' + (s.microflow || '?') + (s.enabled ? '' : ' (off)'); }).join('; ') : null,
      data.services.length ? 'published services: ' + data.services.map(function (s) { return s.name + (s.kind ? ' (' + s.kind + ')' : ''); }).join('; ') : null,
      market.length ? 'not included: ' + market.length + ' Marketplace modules — ' + market.join(', ') : null,
      'legend: MF microflow, NF nanoflow, PG page, E entity; #xxxxxxxx is a fingerprint — copy it into the description; {member=value} is the data a step sets or passes; → owns an association to, ← is owned by',
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
    return { text: text, id: fnv(text), modules: own.length, flows: own.reduce(function (n, m) { return n + m.microflows.length + m.nanoflows.length; }, 0) };
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
    if (!out.app && !out.c4 && !out.risks.length && !out.context && !['modules', 'microflows', 'nanoflows', 'pages', 'entities'].some(function (k) { return Object.keys(out[k]).length; })) {
      return { error: 'The file has the right format but no descriptions in it.' };
    }
    return { value: out };
  }

  // A file that says "add": true is laid over the descriptions already kept, not put in their place
  // (Karol, 2026-10-14: after reading the documentation, "describe this process too" — the agent sends
  // the one process, and the flows it described for it, and nothing else is lost). A process of the same
  // name is replaced, a new one is added at the end; a flow, page, entity or module described again is
  // replaced; a risk with a title already kept is not added twice; the rest is kept as it was.
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
      modules: Object.keys(d.modules).reduce(function (o, k) { o[k] = { summary: d.modules[k].text, story: d.modules[k].story || null, notes: d.modules[k].notes || null }; return o; }, {})
    };
    return { described: described, stale: stale, missing: missing };
  }

  // One flow as the pack writes it — for a route that sends the model in pieces (copilot.js).
  function flowText(f) { var out = []; flowBlock(f, out); return out.join('\n'); }

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
