/* MxScout — every security check, as one list of risks with fixed ids.
 *
 * The Security section draws what anonrole.js, selfreg.js, accounts.js,
 * guards.js, editscope.js, accessuse.js, constants.js and advisories.js
 * conclude, each in a card of its own. This file says the same conclusions
 * once more, as RISKS: a level, a pattern (theme), the places, a fix in one
 * sentence, and an id that is the same every time the same model is read.
 * The mendix-describe skill runs this very file (engine/secrisks.js, a byte
 * copy) from check-security.js, on a .mpr or on a project folder, so the
 * documentation and MxScout say the same thing about security, under the
 * same ids, instead of an agent writing its own and changing its mind
 * between sessions (Karol, 2026-10-18).
 *
 * A pure function of the model: no DOM, no state, nothing sent anywhere.
 *
 * LEVELS, from the register each check already has (risk-levels.md):
 *   FINDING about data or accounts        → P1 (or the check's own P1/P2)
 *   FINDING about a setting (Prototype security, a weak demo password,
 *     a user role with no module role)    → P2
 *   WORTH KNOWING                         → P3, its title begins "Worth knowing:"
 *   NOT CHECKED                           → not a risk; listed in notChecked
 *
 * THE ID: 'mx-' + the check's id + '-' + a slug of what it is about (the
 * entity, the role, the flow…), lower-case letters, digits and single
 * hyphens, at most 80 characters — a longer one keeps its first 71 and ends
 * in a hash of the whole, so it stays the same and stays unique. The check
 * ids (CHECKS) are the ids the standards catalogue names.
 *
 * Constants keep the triage key MxScout gave them (constants.js,
 * 'm:secrets:<Module.Constant>'): MxScout works those out on every load,
 * and a risk of this list with the same id is the same risk (triage.js).
 *
 * Every text here is set as text by whoever draws it.
 */
(function () {
  'use strict';

  // The checks, by id: what each is about, for the --md output and the catalogue.
  var CHECKS = {
    'security-level': 'Security level', 'demo-password': 'Demo user password', 'role-no-module-role': 'User role without module roles',
    'strict-mode-off': 'Strict mode', 'page-url-check': 'Page URL check', 'role-manages-all': 'User role that manages every role',
    'service-open': 'Published service with nothing in front of it',
    'anon': 'Anonymous role (Mendix MXS003–MXS010)', 'selfreg': 'Self-registration', 'accounts': 'User accounts',
    'guard-page-hides': 'Hidden on the page, not checked in the flow', 'guard-bypass-xpath': 'Microflow retrieves past the role’s XPath',
    'guard-same-entity': 'Two objects of the same entity from the client',
    'scope-write': 'Written wider than edited', 'scope-delete': 'Deleted wider than the Delete buttons', 'scope-note': 'Write scope',
    'access-wider': 'Reads every row, sees fewer', 'access-unused': 'Granted, never used', 'access-unwritten': 'May write, nothing writes',
    'access-fails': 'May run it, may not do what it does', 'access-finds-nothing': 'May run it, finds nothing',
    'access-past': 'Does for a role what its rules do not allow',
    'secret-constant': 'Constant the browser receives that looks like a secret', 'constant-note': 'Constants',
    'advisory': 'Known security advisory'
  };

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function slug(s) { return str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  // FNV-1a, 32 bits: only to keep a shortened id unique and the same on every run.
  function hash(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function riskId(check, subject) {
    var base = 'mx-' + check + (slug(subject) ? '-' + slug(subject) : '');
    if (base.length <= 80) return base;
    return base.slice(0, 71).replace(/-+$/, '') + '-' + hash(base);
  }
  function uniq(list) { var seen = {}; return list.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; }); }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  var THEMES = { access: true, secrets: true, logic: true };

  // ---------- what a password judgement says (security.js draws it) ----------
  // MxScout reads a password once, in the Worker, and keeps only the judgement (mpr.js judgePassword).
  // A model from before that carries the old boolean, which is normalised rather than read as "no password".
  function passwordVerdict(judgement, legacyBoolean) {
    if (!judgement) {
      if (legacyBoolean) return { weak: false, text: 'set, in plain text', reason: null };
      return { weak: false, tone: 'muted', text: 'none', reason: null };
    }
    var reasons = (judgement.failsPolicy || []).slice();
    if (judgement.common) reasons.unshift('one of the most common passwords there are');
    if (judgement.sameAsUserName) reasons.unshift('the same as the user name');
    if (!reasons.length) return { weak: false, text: 'set, in plain text', reason: 'It meets this project’s own password policy.' };
    var length = typeof judgement.length === 'number' ? judgement.length + ' character' + (judgement.length === 1 ? '' : 's') + ', ' : '';
    return { weak: true, text: 'set, in plain text — weak', reason: length + reasons.join('; ') + '.' };
  }

  // ---------- the project's own settings (the Security screen's band) ----------
  // → [{ check, subject, register: 'finding' | 'note', level, text, fix, where }]. The band's words: security.js
  // draws exactly these texts, so the band and the list below cannot disagree.
  var LEVEL_LABEL = { CheckNothing: 'Off', CheckFormsAndMicroflows: 'Prototype', CheckEverything: 'Production' };
  function settings(model) {
    model = model || {};
    var s = model.security, out = [];
    function add(check, subject, register, level, text, fix, where) { out.push({ check: check, subject: subject, register: register, level: level, text: text, fix: fix, where: where || [] }); }
    if (s && (s.level === 'CheckNothing' || s.level === 'CheckFormsAndMicroflows')) {
      var off = s.level === 'CheckNothing';
      add('security-level', s.level, 'finding', off ? 'P1' : 'P2',
        'Security is ' + LEVEL_LABEL[s.level] + ' — ' + (off ? 'the running app enforces none of these rules.' : 'the running app does not check entity access.'),
        'Set the project’s security level to Production in App Security, and give every module role the entity access its pages need.');
    }
    if (s) {
      (s.demoUsers || []).forEach(function (u) {
        var v = passwordVerdict(u.password, u.passwordSet);
        if (v.weak) add('demo-password', u.userName, 'finding', 'P2', 'Demo account ' + u.userName + ' has a weak password — ' + v.reason,
          'Give the demo user a password this project’s own policy accepts, or switch demo users off — they can still sign in where they were once created.');
      });
      if (s.strictMode === false) add('strict-mode-off', 'project', 'note', 'P3', 'Strict mode is off — access rights resolve the older, more permissive way.', 'Switch strict mode on in App Security, after checking that the pages fetch only what they define.');
      if (s.strictPageUrlCheck === false) add('page-url-check', 'project', 'note', 'P3', 'Page URLs are not checked strictly.', 'Switch the strict page URL check on in App Security.');
    }
    (model.userRoles || []).forEach(function (r) {
      if (!(r.moduleRoles || []).length) add('role-no-module-role', r.name, 'finding', 'P2', 'User role "' + r.name + '" carries no module role — somebody given it can sign in and reach nothing.',
        'Give the user role the module roles it is for, or remove it.');
      if (r.manageAllRoles) add('role-manages-all', r.name, 'note', 'P3', '"' + r.name + '" can assign every other role, including roles above its own.',
        'Nothing, if it is the administrator; otherwise list the roles it may manage instead of all.');
    });
    (model.publishedServices || []).forEach(function (svc) {
      var open = Array.isArray(svc.allowedModuleRoles) && !svc.allowedModuleRoles.length && !(svc.authentication || []).length && !svc.authenticationMicroflow;
      if (open) add('service-open', svc.qualifiedName || svc.name, 'note', 'P3', svc.name + ' (' + svc.kind + ') has no role list and no authentication.',
        'Nothing, if it must be reachable before sign-in (a callback); otherwise give it authentication and the module roles allowed to call it.', [svc.qualifiedName].filter(Boolean));
    });
    return out;
  }

  // ---------- the whole list ----------
  // → { risks: [R], notChecked: [{ check, text, where }], counts: { risks, findings, notes, P1, P2, P3, byCheck: { check: n } } }
  // R = { id, check, register: 'finding' | 'note', level, theme, title, detail, fix, where[], key? }
  // Each module is used when it is loaded (in the browser all are; the skill's engine loads them all too).
  function check(model) {
    model = model || {};
    var W = typeof window !== 'undefined' ? window : {};
    var risks = [], notChecked = [], ids = {};
    function add(check, subject, register, level, theme, title, detail, fix, where, key) {
      var id = riskId(check, subject);
      if (ids[id]) return;
      ids[id] = true;
      var note = register !== 'finding';
      var r = { id: id, check: check, register: note ? 'note' : 'finding', level: note ? 'P3' : (/^P[12]$/.test(level) ? level : 'P1'), theme: THEMES[theme] ? theme : 'access',
        title: cut((note ? 'Worth knowing: ' : '') + title, 300), detail: detail ? cut(detail, 3000) : null, fix: fix ? cut(fix, 1000) : null,
        where: uniq((where || []).map(function (w) { return cut(w, 300); })).slice(0, 40) };
      if (key) r.key = key;
      risks.push(r);
    }
    function shortText(t) { t = str(t); var i = t.search(/[.—;:](\s|$)/); return i > 20 && i < 200 ? t.slice(0, i) : cut(t, 200); }

    // The settings, in the band's words.
    settings(model).forEach(function (x) {
      add(x.check, x.subject, x.register, x.level, x.check === 'demo-password' ? 'secrets' : 'access', x.text.replace(/\.$/, ''), x.text, x.fix, x.where);
    });

    // The anonymous role, in Mendix's own codes.
    if (W.MxAnonRole) W.MxAnonRole.check(model).results.forEach(function (r) {
      if (r.register === 'unchecked') { notChecked.push({ check: 'anon', text: r.code + ' · ' + r.text, where: [] }); return; }
      var subject = [r.code, r.entity, r.userRole, r.moduleRole].filter(Boolean).join(' ');
      add('anon', subject, r.register, 'P1', 'access', r.code + ' · ' + r.title + (r.entity ? ': ' + r.entity : r.moduleRole ? ': ' + r.moduleRole : ''), r.text, r.fix, [r.entity, r.moduleRole]);
    });

    // A way to register without signing in: one risk per way in and what it hands out.
    if (W.MxSelfReg) {
      var sr = W.MxSelfReg.check(model);
      if (sr.state === 'shown') (sr.paths || []).forEach(function (p) {
        (p.grants || []).forEach(function (g) {
          if (g.register === 'unchecked') { notChecked.push({ check: 'selfreg', text: g.text, where: [p.entry.flow] }); return; }
          if (g.register !== 'finding' && g.register !== 'note') return;
          add('selfreg', [p.entry.flow, g.role || g.constant || g.kind].join(' '), g.register, g.priority, 'access', 'Self-registration: ' + shortText(g.text), g.text,
            g.register === 'finding' ? 'Give the role a registration flow hands out only what a newcomer needs, and keep personal and account data behind an XPath to [%CurrentUser%].' : 'Nothing, if a newcomer is meant to get this role.',
            [p.entry.flow, g.flow, g.role ? null : g.constant]);
        });
      });
    }

    // User accounts, role by role — with what each role's pages and flows write (accessuse.js), measured once.
    var use = W.MxAccessUse ? W.MxAccessUse.analyse(model) : null;
    if (W.MxAccounts) {
      W.MxAccounts.check(model, use).results.forEach(function (r) {
        if (r.register !== 'finding' && r.register !== 'note') return;
        add('accounts', [r.kind, r.userRole, r.entity, r.moduleRole].filter(Boolean).join(' '), r.register, r.priority, 'access',
          (r.title || 'User accounts') + (r.userRole ? ' — ' + r.userRole : '') + (r.entity ? ' (' + r.entity + ')' : ''), r.text, r.fix, [r.entity]);
      });
    }

    // What a page hides and the microflow behind it does not check: one risk per flow (one cause, its pages as places).
    if (W.MxGuards) {
      var g = W.MxGuards.of(model), byFlow = {}, order = [];
      g.findings.forEach(function (f) {
        var k = f.kind + ' ' + f.flow;
        if (!byFlow[k]) { byFlow[k] = { kind: f.kind, flow: f.flow, list: [] }; order.push(k); }
        byFlow[k].list.push(f);
      });
      order.forEach(function (k) {
        var b = byFlow[k], p1 = b.list.some(function (f) { return f.priority === 'P1'; });
        if (b.kind === 'page-hides') {
          add('guard-page-hides', b.flow, 'finding', p1 ? 'P1' : 'P2', 'access', b.flow + ' does not check what its page hides', b.list.map(function (f) { return f.text; }).join('\n'),
            'Add a decision at the start of ' + b.flow + ' that checks the same condition the page uses to hide the button, and end the flow when it does not hold.',
            [b.flow].concat(b.list.map(function (f) { return f.page; })));
        } else {
          add('guard-bypass-xpath', b.flow, 'finding', p1 ? 'P1' : 'P2', 'access', b.flow + ' retrieves past the role’s XPath', b.list.map(function (f) { return f.text; }).join('\n'),
            'Give the retrieve in ' + b.flow + ' the XPath of the role’s own access rule, or let the microflow apply entity access.',
            [b.flow].concat(b.list.map(function (f) { return f.entity; })));
        }
      });
      g.notes.forEach(function (n) { add('guard-same-entity', n.flow, 'note', 'P3', 'access', n.flow + ' takes two objects of ' + (n.entity || 'one entity') + ' from the client', n.text,
        'Check in ' + n.flow + ' that the two objects belong together — the same owner, or one linked to the other — before it changes either.', [n.flow, n.entity]); });
    }

    // A write or delete right wider than every place the role uses it.
    if (W.MxEditScope) {
      var sc = W.MxEditScope.of(model, use);
      sc.findings.forEach(function (f) {
        add(f.kind === 'delete' ? 'scope-delete' : 'scope-write', f.entity, 'finding', f.priority || 'P1', 'access',
          (f.kind === 'delete' ? 'Deleted in every state: ' : 'Written in every state: ') + f.entity + (f.attributes && f.attributes.length ? ' (' + f.attributes.slice(0, 4).join(', ') + (f.attributes.length > 4 ? '…' : '') + ')' : ''),
          f.text + (f.mitigation ? ' ' + f.mitigation : ''), f.fix, [f.entity].concat((f.places || []).map(function (p) { return p.name; })));
      });
      sc.notes.forEach(function (n) {
        add('scope-note', n.kind + ' ' + (n.microflow || ''), 'note', 'P3', 'access', n.kind === 'commit-check' ? 'A shared commit check in ' + n.microflow : 'Create rights nothing uses', n.text,
          n.kind === 'commit-check' ? 'Nothing, if ' + n.microflow + ' refuses what the pages do not allow; otherwise name the state in the access rule.' : 'Take the create right off the rules where nothing the role reaches creates.', [n.microflow]);
      });
    }

    // Entity access against what uses it (accessuse.js). The Domain model tells these entity by entity, in each
    // rule's Access window, and the Security band counts them; here each kind is ONE risk, worth knowing, with
    // its entities as places — on a real model they run to hundreds, and a Risks page of hundreds reads as noise.
    // The exception is a flow that fails for a role that may run it: a functional error, P2, one risk per flow.
    if (use) {
      var WHAT = { read: 'reads', create: 'creates', write: 'changes', del: 'deletes', 'delete': 'deletes' };
      var group = function (check, list, title, said, fix) {
        var ents = uniq(list.map(function (i) { return i.entity || i.flow; })).sort();
        if (!ents.length) return;
        add(check, 'model', 'note', 'P3', 'access', ents.length + ' ' + title,
          said + ' ' + (ents.length > 60 ? ents.slice(0, 60).join(', ') + ' and ' + (ents.length - 60) + ' more.' : ents.join(', ') + '.') +
          ' Each is told in the rule’s Access window on the Domain model.', fix, ents);
      };
      group('access-wider', use.wider || [], 'entities read in full by a role whose pages show fewer rows',
        'A read rule with no XPath, while nothing the role reaches lists every row — a page is not a security boundary, the rule is what the client may fetch:',
        'Give each read rule the XPath its pages narrow by, or confirm every row may be read.');
      group('access-unused', use.unused || [], 'entities a role holds a rule on and never uses',
        'Nothing the role reaches shows, reads, takes or returns them (a Java action or a published OData service, which MxScout does not follow, may):',
        'Take the rule off the module role, unless a Java action or a published service needs it.');
      group('access-unwritten', use.unwritten || [], 'entities a role may write, create or delete and nothing it reaches does',
        'No input on its pages, no New or Delete button, no flow that runs with its rights:', 'Take the unused write, create and delete rights off the rule.');
      var quiet = [];
      (use.cannotDo || []).forEach(function (f) {
        var bad = f.items.filter(function (i) { return i.what !== 'read'; });
        if (!bad.length) { quiet.push(f); return; }
        add('access-fails', f.flow, 'finding', 'P2', 'logic', 'Fails for a role that may run it: ' + f.flow,
          bad.map(function (i) { return (f.kind === 'nanoflow' ? 'Nanoflow ' : 'Microflow ') + f.flow + ' ' + (WHAT[i.what] || i.what) + ' ' + i.entity + (i.members ? ' (' + i.members.join(', ') + ')' : '') + ' for ' + (i.userRoles || []).join(', ') + ' without the right'; }).join('; ') + ', so it fails for them.',
          'Give the roles that may run ' + f.flow + ' the access it needs, or stop offering it to them.', [f.flow].concat(uniq(bad.map(function (i) { return i.entity; }))));
      });
      group('access-finds-nothing', quiet, 'flows that read an entity the role running them cannot read',
        'Each finds nothing for that role:', 'Give the role read access, or stop offering the flow to it.');
      group('access-past', use.pastAccess || [], 'microflows that do for a role what its own rules do not allow',
        'Usually deliberate — a microflow is the controlled way to let a role do it:', 'Nothing, if each is the controlled way to let the role do it.');
    }

    // Constants the browser receives that look like a secret: the risks constants.js gives, with their key.
    if (W.MxConstants) {
      var c = W.MxConstants.of(model);
      (c.risks || []).forEach(function (r) {
        add('secret-constant', (r.where && r.where[0]) || r.title, 'finding', r.level, 'secrets', r.title, r.detail, r.fix, r.where, r.key);
      });
      (c.notes || []).forEach(function (n) { add('constant-note', n.kind + ' ' + n.constant, 'note', 'P3', 'secrets', 'Constant ' + n.constant, n.text, n.fix, [n.constant]); });
    }

    // Known advisories for this Mendix version and these Marketplace modules: worth knowing, never a finding.
    if (W.MxAdvisories) {
      var a = W.MxAdvisories.of(model);
      a.matches.forEach(function (m) { add('advisory', m.cve + ' ' + m.name, 'note', 'P3', 'access', m.cve + ' in ' + m.name + ' ' + m.version, m.text + (m.note ? ' ' + m.note : '') + ' ' + m.link, m.fixText, []); });
      a.notChecked.forEach(function (n) { notChecked.push({ check: 'advisory', text: n.text, where: [] }); });
    }

    // Rules MxScout could not follow (accessrule.js): not checked, said so.
    if (W.MxAccessRule && W.MxAccessRule.unfollowed) W.MxAccessRule.unfollowed(model).forEach(function (u) {
      notChecked.push({ check: 'access-rule', text: u.qualifiedName + ' — the rule for ' + u.moduleRole + ': ' + u.label, where: [u.qualifiedName] });
    });

    var counts = { risks: risks.length, findings: 0, notes: 0, P1: 0, P2: 0, P3: 0, byCheck: {} };
    risks.forEach(function (r) {
      counts[r.register === 'finding' ? 'findings' : 'notes']++;
      counts[r.level]++;
      counts.byCheck[r.check] = (counts.byCheck[r.check] || 0) + 1;
    });
    return { risks: risks, notChecked: notChecked, counts: counts };
  }

  // Once per model: the Security screen asks on every draw.
  var kept = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    var hit = kept && kept.get(model);
    if (!hit) { hit = check(model); if (kept) kept.set(model, hit); }
    return hit;
  }

  // ---------- the risks as a part of the descriptions (descriptions-format.md, risks v1) ----------
  // opts.decided: what was decided about risks (triage.json's `triage`), or null; opts.kept: the risks the
  // descriptions hold now (their `risks`), or null. Each of these checks' risks that the model no longer shows —
  // marked fixed, or still counted — gets a `verify` saying so: MxScout marks the first verified and stops
  // counting the second. One marked a false positive, or settled already, is left alone.
  // → { format, version, add: true, by, written, risks: [...], verify?: [...] }
  function part(model, opts) {
    opts = opts || {};
    var res = of(model), now = {};
    res.risks.forEach(function (r) { now[r.id] = true; });
    var out = { format: 'mxscout-descriptions', version: 1, add: true, by: 'MxScout security check', written: opts.written || null,
      risks: res.risks.map(function (r) { return { id: r.id, level: r.level, theme: r.theme, title: r.title, detail: r.detail, fix: r.fix, where: r.where }; }) };
    if (opts.project) out.project = opts.project;
    var status = {}, ids = [];
    var E = (opts.decided && opts.decided.risks) || {};
    Object.keys(E).sort().forEach(function (k) { var id = idOf(E[k]); if (id && !(id in status)) { status[id] = E[k].status; ids.push(id); } });
    ((opts.kept && Array.isArray(opts.kept)) ? opts.kept : []).forEach(function (r) {
      var id = r && typeof r.id === 'string' ? idOf({ risk: { id: r.id } }) : null;
      if (id && !(id in status)) { status[id] = 'open'; ids.push(id); }
    });
    var verify = ids.filter(function (id) { return !now[id] && (status[id] === 'fixed' || status[id] === 'open' || status[id] === 'reopened'); })
      .map(function (id) { return { id: id, still: false, why: 'not seen in the model' }; });
    if (verify.length) out.verify = verify;
    return out;
  }
  // The id an entry of what was decided was known by, when it is one of these checks'.
  function idOf(e) {
    if (!e) return null;
    var id = e.risk && e.risk.id;
    if (typeof id === 'string' && /^mx-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 80) return id;
    var k = String(e.key || '');
    if (/^id:mx-/.test(k)) return k.slice(3);
    if (/^m:secrets:/.test(k)) return riskId('secret-constant', k.slice(10));
    return null;
  }

  window.MxSecRisks = { CHECKS: CHECKS, check: check, of: of, part: part, settings: settings, passwordVerdict: passwordVerdict, riskId: riskId, slug: slug, idOf: idOf };
})();
