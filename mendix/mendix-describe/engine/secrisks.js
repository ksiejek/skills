/* MxScout — every security check, as one list of risks with fixed ids.
 *
 * The Security section draws what anonrole.js, selfreg.js, accounts.js,
 * guards.js, editscope.js, accessuse.js, constants.js, advisories.js and
 * marketplace.js conclude, each in a card of its own. This file says the
 * same conclusions once more, as RISKS: a level, a pattern (theme), the places, a fix in one
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
 *   TO VERIFY — what a check suspects and the model does not prove (a page
 *     condition that may be a setting, a check MxScout cannot read in front
 *     of the step, a commit check that may refuse it) → P2, its title begins
 *     "To verify:", its detail says what to look at. A finding is CONFIRMED
 *     only with a concrete scenario, the evidence for it and its effect
 *     (risk.scenario, risk.evidence, risk.impact); a missing check, a write,
 *     or Apply entity access off alone never makes one P1.
 *   WORTH KNOWING                         → P3, its title begins "Worth knowing:"
 *   NOT CHECKED                           → not a risk; listed in notChecked
 *
 * RULES: the version of these rules (RULES). A risk the rules before gave and
 * these no longer give, on the same model, is WITHDRAWN (withdrawn(model)):
 * part() says so in its verify ({ withdrawn: true }), and MxScout never
 * takes that for a fix — the application did not change, the rules did.
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
    'guard-escalation': 'Writes past the role’s own access rules', 'guard-role-wider': 'Callable by more roles than any page offers it to',
    'service-op-unscoped': 'Service operation that trusts the key in the request',
    'access-not-inherited': 'Read in full while its parent is narrowed', 'secret-attribute': 'An attribute whose name says it holds a secret',
    'logic-note': 'What the drawing says about the logic',
    'secret-constant': 'Constant the browser receives that looks like a secret', 'constant-note': 'Constants',
    'advisory': 'Known security advisory',
    'market-admin': 'Administrative role of a Marketplace module on a user role', 'market-unused': 'Marketplace module the app does not use',
    'market-role-unused': 'Marketplace module role that grants nothing',
    // Rules 6: the checks the review needed (rule-changes N1–N12).
    'admin-wide-access': 'Administrator roles reach almost everything', 'access-self-grant': 'A role may write the association its own access is scoped by', 'guard-scope-set': 'A client-callable flow sets a scope association without looking at the caller',
    'scope-delete-state': 'A delete right that does not name the state', 'guard-account-param': 'An account from the client is changed, or gets objects made for it',
    'role-manages-no-pages': 'A role that manages users and has no pages', 'services-many-modules': 'One user role opens the published services of several modules',
    'guard-auth-loose': 'An authentication microflow that matches a secret loosely', 'guard-sub-callable': 'A sub-microflow the client can call, that stores or sends',
    'demo-admin': 'A demo user with the administrator’s role', 'access-text-open': 'A text or file store read in full'
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
  // The version of the rules. 2 (2026-10-20): a page's condition is a hint, not proof; a finding is confirmed
  // only with a scenario, its evidence and its effect, else it is to verify; Status, State and Phase count as
  // a state's name only as a word of it (not in Estate, Statement). 3 (2026-10-20): every way in to the same
  // operation is weighed together — a hidden button whose microflow (or whose very change) the same role is
  // offered elsewhere without the condition is to verify, not a finding; a helper that stops with an error
  // event on the object's state is a check; a "Create list" is no create; a page's flow runs only for a role
  // that may call it and sees what runs it; a secret or an administrator only a name says is to verify; and
  // a risk the model cannot judge this time (unchecked) keeps what was decided. 4 (2026-10-20): inside a
  // Marketplace module, what nothing in the application leads to, or only its administrators reach, is set aside
  // (asideOf); every risk carries a test case (test) and its fix as steps (repair).
  // 5 (2026-11-01, MXS-173, from the review of 148 risks on a real application where 54 % were false positives):
  // a microflow is weighed against the ROLE'S OWN RULES, not against the page — a step every calling role may take
  // anyway is no risk, and one it may not take at all, or one past the XPath that keeps it to its own rows, is a
  // risk of its own (guard-escalation), whether or not any page hides anything; Apply entity access off is still
  // never a risk by itself. A page's trigger is followed through a nanoflow to the microflow behind it. Adding
  // only the CALLER to an object the role already reads is worth knowing, not a finding. Nothing is said about a
  // role that administers the application, about a non-persistable entity's create and delete rights, or about a
  // decision that cannot come out both ways. "Does for a role what its rules do not allow" is no longer a risk:
  // what mattered in it is guard-escalation. New: a child entity read in full while its parent is kept to its
  // owner, an attribute whose name says it holds a secret, a service operation that fetches by the request's own
  // key with nothing comparing it to the authenticated user, and what the drawing says about the logic.
  // 6 (2026-11-15, from a rule-by-rule review of 38 rules on a large real application): the Risks list holds only real,
  // confirmed problems. What a check computes and cannot prove is a LEAD (register 'lead': no level, not counted, not
  // exported as a risk; check().leads, part().leads), which the risk skill confirms or drops. Performance, code quality,
  // personal data and cleanup are lists of their own (check().other, perfrisks.js and gdprmap.js `list`). The checks
  // are narrowed where the review found them pointing at the right place and judging wrongly, guard-same-entity is
  // switched off, and new checks cover what the review needed: access-self-grant, guard-scope-set, guard-account-param,
  // guard-sub-callable, guard-auth-loose, scope-delete-state, access-text-open, accounts-manager-no-pages,
  // services-many-modules and demo-admin. A risk of a changed check these rules no longer give is withdrawn (NARROWED6).
  var RULES = 6;

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
      // Rules 6 (C15.1): a finding, P2 — strict mode off is what turns every hidden button into an open action.
      if (s.strictMode === false) add('strict-mode-off', 'project', 'finding', 'P2', 'Strict mode is off — the client may call any microflow and fetch any data its role allows, not only what the pages offer, so every button a page hides is an open action.', 'Switch strict mode on in App Security, after checking that the pages fetch only what they define.');
      // N11 (rules 6): a demo user that holds the administrator's role, while demo users are on.
      if (s.demoUsersEnabled && s.adminUserRole) (s.demoUsers || []).forEach(function (u) {
        if (u && (u.userRoles || []).indexOf(s.adminUserRole) !== -1) add('demo-admin', u.userName, 'note', 'P3', 'Demo user ' + u.userName + ' holds the administrator’s role "' + s.adminUserRole + '"',
          'Fix in App Security: take the administrator’s role off the demo user, or switch demo users off. Where demo users were once created they can still sign in, with every right the administrator has.');
      });
      if (s.strictPageUrlCheck === false) add('page-url-check', 'project', 'note', 'P3', 'Page URLs are not checked strictly.', 'Switch the strict page URL check on in App Security.');
    }
    (model.userRoles || []).forEach(function (r) {
      if (!(r.moduleRoles || []).length) add('role-no-module-role', r.name, 'finding', 'P2', 'User role "' + r.name + '" carries no module role — somebody given it can sign in and reach nothing.',
        'Give the user role the module roles it is for, or remove it.');
      // Not for the role App Security names as the administrator: assigning every role is what that role is
      // (MXS-173, the review of 2026-11-01).
      if (r.manageAllRoles && !(s && s.adminUserRole === r.name)) add('role-manages-all', r.name, 'note', 'P3', '"' + r.name + '" can assign every other role, including roles above its own.',
        'Nothing, if it is the administrator; otherwise list the roles it may manage instead of all.');
    });
    // N6 (rules 6): one user role whose module roles open the published services of three modules or more — any one
    // credential of it calls all of them.
    (model.userRoles || []).forEach(function (r) {
      if (!r || !(r.moduleRoles || []).length) return;
      var svcs = (model.publishedServices || []).filter(function (svc) { return svc && (svc.allowedModuleRoles || []).some(function (m) { return r.moduleRoles.indexOf(m) !== -1; }); });
      var mods = uniq(svcs.map(function (svc) { return svc.module || modOf(svc.qualifiedName); }));
      if (mods.length >= 3) add('services-many-modules', r.name, 'finding', 'P3', '"' + r.name + '" opens the published services of ' + mods.length + ' modules (' + mods.slice(0, 6).join(', ') + ') — whoever holds one credential of it calls all of them.',
        'Give each integration a user role of its own, holding only the module role of its own service.', svcs.map(function (svc) { return svc.qualifiedName || svc.name; }));
    });
    (model.publishedServices || []).forEach(function (svc) {
      var open = Array.isArray(svc.allowedModuleRoles) && !svc.allowedModuleRoles.length && !(svc.authentication || []).length && !svc.authenticationMicroflow;
      if (open) add('service-open', svc.qualifiedName || svc.name, 'note', 'P3', svc.name + ' (' + svc.kind + ') has no role list and no authentication.',
        'Nothing, if it must be reachable before sign-in (a callback); otherwise give it authentication and the module roles allowed to call it.', [svc.qualifiedName].filter(Boolean));
    });
    return out;
  }

  // ---------- the fix, as a recipe in Mendix's words (MXS-10) ----------
  // Every risk carries R.recipe: what to change, where in Studio Pro, named the way a Mendix developer names it —
  // the module, the entity, the access rule (by its module role), the user role, the members to take write off, the
  // XPath to add, the decision to put in a flow with its condition. The mendix-describe skill shows it
  // (check-security.js --fix <id>) and makes it one change at a time, with the person's yes, or hands it to a person.
  //   recipe = { module, marketplace: bool, decide: text|null, manual: text|null, steps: [Step], inside?: [Step], then }
  //   Step   = { do: 'set'|'remove'|'take-off'|'add-xpath'|'add-decision'|'give'|'update'|'decide', in, text,
  //              entity?, moduleRole?, userRole?, members?, rights?, xpath?, flow?, condition?, setting?, value? }
  // marketplace: the change would be inside a Marketplace module — never made there (an update overwrites it, and
  // the module is not the team's); the steps are then what can be done OUTSIDE it, and `inside` says what the change
  // in the module would be, for a person to weigh (a module the team has changed already, as many do). decide: what a person settles
  // before anyone changes anything. manual: why only a person may make it (a password, an update), even with a yes.
  function shortQn(qn) { qn = str(qn); var i = qn.indexOf('.'); return i < 0 ? qn : qn.slice(i + 1); }
  function modOf(qn) { qn = str(qn); var i = qn.indexOf('.'); return i < 0 ? '' : qn.slice(0, i); }
  function indexOf(model) {
    var ix = { market: {}, ent: {}, role: {}, flow: {} };
    (model.modules || []).forEach(function (m) { if (m && m.fromAppStore) ix.market[m.name] = true; });
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) ix.ent[e.qualifiedName] = e; });
    (model.userRoles || []).forEach(function (r) { if (r && r.name) ix.role[r.name] = r; });
    (model.microflows || []).concat(model.nanoflows || []).forEach(function (f) { if (f && f.qualifiedName) ix.flow[f.qualifiedName] = f; });
    return ix;
  }
  var APP_SECURITY = 'App Security (App Explorer › App › Security)';
  function ruleAt(entity, moduleRole) { return modOf(entity) + ' › Domain model › ' + shortQn(entity) + ' › Access rules › the rule for ' + moduleRole; }
  function splitRoles(s) { return uniq(str(s).split(/,\s*/)); }
  function rulesOn(ix, entity, moduleRoles) {
    var e = ix.ent[entity], want = {};
    (moduleRoles || []).forEach(function (m) { want[m] = true; });
    return ((e && e.accessRules) || []).filter(function (r) { return r && (!moduleRoles || want[r.moduleRole]); });
  }
  function rolesOfUser(ix, userRole) { var r = ix.role[userRole]; return r ? (r.moduleRoles || []).slice() : []; }
  function writtenBy(rule) {
    return Object.keys(rule.attrAccess || {}).filter(function (k) { return rule.attrAccess[k] === 'rw'; })
      .concat(Object.keys(rule.assocAccess || {}).filter(function (k) { return rule.assocAccess[k] === 'rw'; }));
  }
  function list(a) { a = a || []; return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  // An XPath that keeps an attribute to the given values, written as Studio Pro reads it.
  function stateXPath(ix, entity, attr, values, negate) {
    var e = ix.ent[entity], a = ((e && e.attributes) || []).filter(function (x) { return x.name === attr; })[0] || {};
    var one = function (v) { return a.type === 'Boolean' ? attr + ' = ' + (/^true$/i.test(v) ? 'true()' : 'false()') : /^(Integer|Long|Decimal|AutoNumber)$/.test(a.type) ? attr + ' = ' + v : attr + " = '" + str(v).replace(/'/g, "''") + "'"; };
    var body = (values || []).map(one).join(' or ');
    if (!body) return null;
    return '[' + (negate ? 'not(' + body + ')' : body) + ']';
  }
  // The condition a page hides a button by, as a microflow expression on the flow's own parameter.
  function flowCondition(ix, flowQn, c) {
    var t = str(c && c.text).replace(/^(shown|editable) when /, '');
    if (/\$currentObject/.test(t) && c.param) return t.replace(/\$currentObject/g, '$' + c.param);
    var m = /^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+) is (.+)$/.exec(t);
    if (!m || !c.param) return null;
    var f = ix.flow[flowQn], p = ((f && f.parameters) || []).filter(function (x) { return x.name === c.param; })[0] || {};
    var e = ix.ent[p.entityQualifiedName], a = ((e && e.attributes) || []).filter(function (x) { return x.name === m[2]; })[0] || {};
    var vals = m[3].split(' or ');
    if (a.type === 'Boolean') return vals.length === 1 && /^(true|false)$/.test(vals[0]) ? (vals[0] === 'true' ? '$' + c.param + '/' + m[2] : 'not($' + c.param + '/' + m[2] + ')') : null;
    if (a.enumerationQualifiedName) return vals.map(function (v) { return '$' + c.param + '/' + m[2] + ' = ' + a.enumerationQualifiedName + '.' + v; }).join(' or ');
    return vals.map(function (v) { return '$' + c.param + '/' + m[2] + " = '" + v + "'"; }).join(' or ');
  }
  function step(o) { var s = {}; Object.keys(o).forEach(function (k) { if (o[k] !== undefined && o[k] !== null && !(Array.isArray(o[k]) && !o[k].length)) s[k] = o[k]; }); return s; }
  function marketNote(module) {
    return module + ' is a Marketplace module: nothing in it is changed here — the next update of the module would overwrite the change, and the module is not the team’s own.';
  }

  // The recipe for one risk. src: what the check concluded (its own result object), fix: the one-sentence fix.
  function recipeFor(ix, check, src, fix, where) {
    src = src || {};
    var r = { module: null, marketplace: false, decide: null, manual: null, steps: [] };
    var say = function (o) { r.steps.push(step(o)); };
    var inModule = function (module, outside) {
      r.module = module || null;
      if (module && ix.market[module]) { r.marketplace = true; r.inside = r.steps.filter(function (x) { return x.do !== 'decide'; }); r.steps = []; (outside || []).forEach(say); if (!r.steps.length) say({ do: 'decide', text: 'Keep it, and mark the risk a false positive with the reason — or ask the module’s publisher; update the module when a version fixes it.' }); }
    };
    var nothingIf = /^Nothing, if /.test(str(fix));
    if (nothingIf) r.decide = str(fix).replace(/;.*$/, '');
    switch (check) {
      case 'security-level':
        say({ do: 'set', in: APP_SECURITY, setting: 'Security level', value: 'Production', text: 'Set Security level to Production.' });
        say({ do: 'give', in: 'each module’s Security › Entity access', text: 'Give every module role the entity access its pages and flows need — mx check (or Studio Pro’s Errors pane) lists each rule that is missing.' });
        break;
      case 'demo-password':
        r.manual = 'A password is chosen and typed by a person; an agent never writes one.';
        say({ do: 'set', in: APP_SECURITY + ' › Demo users › ' + src.subject, setting: 'Password', text: 'Give demo user ' + src.subject + ' a password this project’s password policy accepts.' });
        say({ do: 'set', in: APP_SECURITY + ' › Demo users', setting: 'Enable demo users', value: 'No', text: 'Or switch demo users off — where they were once created they can still sign in, so remove those accounts there too.' });
        break;
      case 'role-no-module-role':
        r.decide = 'Which module roles the user role "' + src.subject + '" is for — or whether it goes.';
        say({ do: 'give', in: APP_SECURITY + ' › User roles › ' + src.subject + ' › Module roles', userRole: src.subject, text: 'Give "' + src.subject + '" the module roles it is for.' });
        say({ do: 'remove', in: APP_SECURITY + ' › User roles', userRole: src.subject, text: 'Or remove the user role "' + src.subject + '".' });
        break;
      case 'strict-mode-off':
        say({ do: 'set', in: APP_SECURITY, setting: 'Strict mode', value: 'on', text: 'Switch Strict mode on, then run the app and check the pages still fetch what they show.' });
        break;
      case 'page-url-check':
        say({ do: 'set', in: APP_SECURITY, setting: 'Strict page URL check', value: 'on', text: 'Switch the strict page URL check on.' });
        break;
      case 'role-manages-all':
        say({ do: 'set', in: APP_SECURITY + ' › User roles › ' + src.subject + ' › User management', userRole: src.subject, setting: 'User management', value: 'Selected roles', text: 'Change User management for "' + src.subject + '" from All to the roles it has to assign.' });
        break;
      case 'service-open':
        say({ do: 'set', in: src.subject + ' › Settings', setting: 'Authentication', text: 'Give ' + src.subject + ' an authentication (Username and password, or Custom with a microflow).' });
        say({ do: 'give', in: src.subject + ' › Settings › Allowed roles', text: 'Name the module roles allowed to call it.' });
        inModule(modOf(src.subject));
        break;
      case 'anon': {
        var code = str(src.code), role = src.userRole, mrs = splitRoles(src.moduleRole), ent = src.entity;
        var anonRoles = APP_SECURITY + ' › User roles › ' + role + ' › Module roles';
        var offAnon = mrs.map(function (mr) { return { do: 'remove', in: anonRoles, userRole: role, moduleRole: mr, text: 'Take ' + mr + ' off the anonymous user role "' + role + '" — visitors then lose everything ' + mr + ' gives them; check nothing a visitor needs depends on it.' }; });
        if (code === 'MXS003') {
          r.decide = 'Whether the app needs anonymous users at all.';
          say({ do: 'set', in: APP_SECURITY + ' › Anonymous users', setting: 'Allow anonymous users', value: 'No', text: 'Set Allow anonymous users to No.' });
        } else if (code === 'MXS005') {
          r.decide = 'What a visitor needs — that is all the new role gets.';
          say({ do: 'give', in: APP_SECURITY + ' › User roles', userRole: 'Anonymous', text: 'Add a user role Anonymous with only the module roles a visitor needs.' });
          say({ do: 'set', in: APP_SECURITY + ' › Anonymous users', setting: 'Anonymous user role', value: 'Anonymous', text: 'Make it the anonymous user role instead of "' + role + '".' });
        } else if (code === 'MXS007') {
          say({ do: 'remove', in: APP_SECURITY + ' › User roles › ' + role + ' › User management', userRole: role, text: 'Remove every entry under User management for "' + role + '".' });
        } else if (code === 'MXS008') {
          r.decide = 'Whether visitors need what ' + list(mrs) + ' gives — if they do, it needs a module role of its own for them.';
          offAnon.forEach(say);
        } else if (code === 'MXS009') {
          offAnon.forEach(say);
        } else if (code === 'MXS004' || code === 'MXS006' || code === 'MXS010') {
          rulesOn(ix, ent, mrs).forEach(function (rule) {
            var w = writtenBy(rule);
            if (code === 'MXS004') say({ do: 'remove', in: ruleAt(ent, rule.moduleRole), entity: ent, moduleRole: rule.moduleRole, text: 'Remove the access rule on ' + ent + ' for ' + rule.moduleRole + '.' });
            else if (code === 'MXS006') say({ do: 'take-off', in: ruleAt(ent, rule.moduleRole), entity: ent, moduleRole: rule.moduleRole, members: w,
              rights: [rule.allowCreate ? 'create' : null, w.length || rule.defaultAccess === 'rw' ? 'write' : null, rule.allowDelete ? 'delete' : null].filter(Boolean),
              text: 'In the rule for ' + rule.moduleRole + ' on ' + ent + ': untick Allow creating new objects' + (rule.allowDelete ? ' and Allow deleting existing objects' : '') +
                (w.length ? ', and set ' + list(w.slice(0, 12)) + (w.length > 12 ? ' and ' + (w.length - 12) + ' more' : '') + ' from Read, Write to Read' : '') + (rule.defaultAccess === 'rw' ? ', and Default rights for new members to Read' : '') + '.' });
            else say({ do: 'add-xpath', in: ruleAt(ent, rule.moduleRole) + ' › XPath constraint', entity: ent, moduleRole: rule.moduleRole, text: 'Give the rule for ' + rule.moduleRole + ' on ' + ent + ' an XPath constraint that keeps the rows to what a visitor may see — or take its read access off.' });
          });
          if (code === 'MXS006') say({ do: 'decide', text: 'Take what a visitor types in a non-persistable entity, and store it from a microflow that checks it first.' });
          if (code === 'MXS010') r.decide = 'Which rows of ' + ent + ' a visitor may see.';
          inModule(modOf(ent), offAnon.concat([{ do: 'decide', text: 'Or keep it — the module may be meant to work for visitors — and mark the risk a false positive with the reason.' }]));
        } else say({ do: 'decide', text: fix });
        break;
      }
      case 'selfreg':
        r.decide = nothingIf ? r.decide : 'Which role a newcomer is given — only what a newcomer needs.';
        say({ do: 'set', in: src.flow, flow: src.flow, text: 'In ' + src.flow + ', give a new account a user role made for newcomers' + (src.role ? ' instead of "' + src.role + '"' : '') + '.' });
        if (src.role) say({ do: 'add-xpath', userRole: src.role, text: 'Or keep "' + src.role + '" and put its personal and account data behind an XPath to [%CurrentUser%] in each module role’s access rules.' });
        inModule(modOf(src.flow));
        break;
      case 'accounts': {
        var ent2 = src.entity, fields = src.fields || [];
        if (ent2 && fields.length && /write/.test(str(src.kind))) {
          var mods = src.moduleRole ? splitRoles(src.moduleRole) : rolesOfUser(ix, src.userRole);
          rulesOn(ix, ent2, mods).forEach(function (rule) {
            var off = writtenBy(rule).filter(function (m) { return fields.indexOf(m) !== -1 || fields.indexOf(m.replace(/^.*\./, '')) !== -1; });
            if (off.length) say({ do: 'take-off', in: ruleAt(ent2, rule.moduleRole), entity: ent2, moduleRole: rule.moduleRole, userRole: src.userRole, members: off, rights: ['write'],
              text: 'In the rule for ' + rule.moduleRole + ' on ' + ent2 + ': set ' + list(off) + ' from Read, Write to Read.' });
          });
          if (!r.steps.length) say({ do: 'take-off', entity: ent2, userRole: src.userRole, members: fields, rights: ['write'], text: fix });
          inModule(modOf(ent2));
        } else if (src.kind === 'user-management') {
          say({ do: 'set', in: APP_SECURITY + ' › User roles › ' + src.userRole + ' › User management', userRole: src.userRole, text: fix });
        } else if (src.kind === 'default-rights') {
          splitRoles(src.moduleRole).forEach(function (mr) { say({ do: 'set', in: ruleAt(src.entity, mr), entity: src.entity, moduleRole: mr, setting: 'Default rights for new members', value: 'None', text: 'Set Default rights for new members to None in the rule for ' + mr + ' on ' + src.entity + '.' }); });
          inModule(modOf(src.entity));
        } else {
          say({ do: 'decide', entity: src.entity, userRole: src.userRole, text: fix });
          if (src.entity) inModule(modOf(src.entity));
        }
        break;
      }
      case 'guard-page-hides': {
        var flow = src.flow, conds = [], seen = {};
        (src.list || []).forEach(function (f) { (f.conditions || []).forEach(function (c) { if (!seen[c.text]) { seen[c.text] = true; conds.push(c); } }); });
        conds.forEach(function (c) {
          var expr = c.kind === 'owner' ? null : flowCondition(ix, flow, c);
          say({ do: 'add-decision', in: flow + ' (microflow editor)', flow: flow, condition: expr,
            text: 'In ' + flow + ', right after the start event, add a decision ' + (expr ? 'with the expression ' + expr : 'that checks what the page checks (' + c.text + ')') +
              '; on false, show a message and go to an end event — before anything changes $' + (c.param || 'the object') + '.' });
          if (!expr) r.decide = 'The exact expression of the check' + (c.kind === 'owner' ? ' that $' + c.param + ' belongs to the user' : '') + '.';
        });
        if (!r.steps.length) say({ do: 'add-decision', flow: flow, text: fix });
        inModule(modOf(flow));
        break;
      }
      case 'guard-bypass-xpath': {
        (src.list || []).forEach(function (f) {
          var xp = uniq(f.xpaths || []);
          say({ do: 'add-xpath', in: f.flow + ' › the Retrieve of ' + f.entity + (f.out ? ' ($' + f.out + ')' : ''), flow: f.flow, entity: f.entity, xpath: xp.length === 1 ? xp[0] : null,
            text: 'Give the Retrieve of ' + f.entity + ' in ' + f.flow + ' the XPath constraint ' + (xp.length === 1 ? xp[0] : 'of the role’s own access rule' + (xp.length ? ' (' + xp.join(' / ') + ')' : '')) + '.' });
          if (xp.length > 1) r.decide = 'Which of the roles’ XPaths the retrieve keeps to — they differ.';
        });
        say({ do: 'set', in: src.flow + ' › Properties', flow: src.flow, setting: 'Apply entity access', value: 'Yes', text: 'Or set Apply entity access to Yes on ' + src.flow + ' — then the role’s own rules hold.' });
        inModule(modOf(src.flow));
        break;
      }
      case 'guard-escalation': {
        var ef = src.flow, who5 = list((src.roles || []).map(function (x) { return '"' + x + '"'; }));
        if (src.why === 'past-xpath') {
          say({ do: 'add-decision', in: ef + ' (microflow editor)', flow: ef, entity: src.entity,
            text: 'In ' + ef + ', before the step, add a decision that compares ' + shortQn(src.entity) + ' with the signed-in user — the same comparison the role’s own access rule makes (' + (src.xpaths || []).slice(0, 1).join('') + ') — and end the flow when it does not hold.' });
          say({ do: 'add-xpath', in: ef + ' › the Retrieve of ' + src.entity, flow: ef, entity: src.entity, xpath: (src.xpaths || [])[0] || null,
            text: 'Or fetch the object with that XPath instead of taking it from the caller.' });
        } else {
          r.decide = 'Whether ' + who5 + ' should be able to ' + (src.step === 'delete' ? 'delete ' : src.step === 'create' ? 'create ' : 'change ') + shortQn(src.entity) + ' at all.';
          say({ do: 'give', in: modOf(src.entity) + ' › Domain model › ' + shortQn(src.entity) + ' › Access rules', entity: src.entity,
            rights: [src.step === 'delete' ? 'delete' : src.step === 'create' ? 'create' : 'write'], members: src.members || [],
            text: 'If they should: give the module roles of ' + who5 + ' that right on ' + src.entity + ', and set Apply entity access to Yes on ' + ef + ' so the rule holds.' });
          say({ do: 'add-decision', in: ef + ' (microflow editor)', flow: ef,
            text: 'If they should not: add a decision at the start of ' + ef + ' that lets only the roles that may through, and end the flow for the rest.' });
        }
        say({ do: 'set', in: ef + ' › Properties', flow: ef, setting: 'Apply entity access', value: 'Yes', text: 'Apply entity access on ' + ef + ' is No, which is why the step runs with no rights at all; switching it on makes the role’s own rules hold — check the flow still does what it should.' });
        inModule(modOf(ef));
        break;
      }
      case 'guard-role-wider':
        say({ do: 'remove', in: src.flow + ' › Properties › Security › Allowed roles', flow: src.flow,
          text: 'Take ' + list((src.roles || []).map(function (x) { return '"' + x + '"'; })) + ' off Allowed roles of ' + src.flow + ' — the module roles they carry, not the user roles.' });
        say({ do: 'decide', text: 'Or offer the flow to them on a page, if they are meant to run it.' });
        inModule(modOf(src.flow));
        break;
      case 'service-op-unscoped':
        say({ do: 'add-decision', in: src.flow + ' (microflow editor)', flow: src.flow, entity: src.entity,
          text: 'In ' + src.flow + ', after the object is fetched, add a decision that compares it with the user the service authenticated, and answer with an error when it does not belong to them.' });
        say({ do: 'add-xpath', in: src.flow + ' › the Retrieve of ' + src.entity, flow: src.flow, entity: src.entity,
          text: 'Or give that Retrieve an XPath that also names the authenticated user, so a key that is not theirs finds nothing.' });
        inModule(modOf(src.flow));
        break;
      case 'access-not-inherited': {
        var ce = (where && where[0]) || src.entity, pe = (where && where[1]) || src.parents && src.parents[0];
        r.decide = 'Which rows of ' + shortQn(str(ce)) + ' each role may see — the answer is its parent’s XPath, followed over the association.';
        splitRoles(src.moduleRole || '').concat(rulesOn(ix, str(ce), null).map(function (x) { return x.moduleRole; })).filter(Boolean).forEach(function (mr) {
          say({ do: 'add-xpath', in: ruleAt(str(ce), mr) + ' › XPath constraint', entity: str(ce), moduleRole: mr,
            text: 'Give the rule for ' + mr + ' on ' + ce + ' an XPath that follows the association to ' + pe + ' and repeats its constraint there.' });
        });
        if (!r.steps.length) say({ do: 'add-xpath', entity: str(ce), text: fix });
        inModule(modOf(str(ce)));
        break;
      }
      case 'secret-attribute': {
        var se = (where && where[0]) || '';
        rulesOn(ix, se, null).forEach(function (rule) {
          say({ do: 'take-off', in: ruleAt(se, rule.moduleRole), entity: se, moduleRole: rule.moduleRole, rights: ['read'],
            text: 'In the rule for ' + rule.moduleRole + ' on ' + se + ': set the secret member from Read (or Read, Write) to None, and read it in a microflow on the server.' });
        });
        say({ do: 'decide', text: 'Decide what the value is for: compared only — store an HMAC and compare that; read back — encrypt it, with the key in the deployment’s configuration and never as a default in the model.' });
        inModule(modOf(se));
        break;
      }
      case 'logic-note':
        say({ do: 'decide', text: fix });
        break;
      case 'guard-same-entity':
        r.decide = 'How the two objects belong together — the same owner, or one linked to the other.';
        say({ do: 'add-decision', in: src.flow + ' (microflow editor)', flow: src.flow, text: 'In ' + src.flow + ', right after the start, add a decision that checks the two objects of ' + (src.entity || 'the entity') + ' belong together; on false, end the flow.' });
        inModule(modOf(src.flow));
        break;
      case 'scope-write':
      case 'scope-delete': {
        var e3 = src.entity, attrs = src.attributes || [], states = src.stateAttrs || [], vals = src.values || {};
        var xp3 = states.map(function (a) { return stateXPath(ix, e3, a, vals[a]); }).filter(Boolean).join('');
        (src.rules || []).forEach(function (rule) {
          var keep = str(rule.xpath) + (xp3 || '');
          if (check === 'scope-write') say({ do: 'take-off', in: ruleAt(e3, rule.moduleRole), entity: e3, moduleRole: rule.moduleRole, members: attrs, rights: ['write'],
            text: 'In the rule for ' + rule.moduleRole + ' on ' + e3 + ': set ' + list(attrs) + ' from Read, Write to Read.' });
          else say({ do: 'take-off', in: ruleAt(e3, rule.moduleRole), entity: e3, moduleRole: rule.moduleRole, rights: ['delete'], text: 'In the rule for ' + rule.moduleRole + ' on ' + e3 + ': untick Allow deleting existing objects.' });
          if (xp3) say({ do: 'add-xpath', in: modOf(e3) + ' › Domain model › ' + shortQn(e3) + ' › Access rules › New', entity: e3, moduleRole: rule.moduleRole, members: check === 'scope-write' ? attrs : [], xpath: keep,
            rights: [check === 'scope-write' ? 'write' : 'delete'],
            text: 'Add a new access rule for ' + rule.moduleRole + ' on ' + e3 + ' with the XPath ' + keep + ' that gives ' + (check === 'scope-write' ? 'Read, Write on ' + list(attrs) : 'Allow deleting existing objects') + ' — only in that state.' });
        });
        if (!xp3) r.decide = 'The state in which the role may ' + (check === 'scope-write' ? 'change ' + list(attrs) : 'delete') + ' — the pages do not say it in one value.';
        say({ do: 'decide', text: 'Or make it read only for the role and change it in a microflow that checks the state first.' });
        inModule(modOf(e3));
        break;
      }
      case 'access-fails': {
        var fl = src.flow, f4 = ix.flow[fl] || {};
        r.decide = 'Whether the roles should be able to run ' + fl + ' — give them the access, or stop offering it.';
        (src.items || []).filter(function (i) { return i.what !== 'read'; }).forEach(function (i) {
          say({ do: 'give', in: modOf(i.entity) + ' › Domain model › ' + shortQn(i.entity) + ' › Access rules', entity: i.entity, rights: [i.what === 'del' ? 'delete' : i.what], members: i.members || [],
            text: 'Give the module roles of ' + list(i.userRoles || []) + ' the right to ' + (i.what === 'del' || i.what === 'delete' ? 'delete objects of' : i.what === 'create' ? 'create objects of' : 'change' + (i.members ? ' ' + list(i.members) + ' of' : '')) + ' ' + i.entity + '.' });
        });
        say({ do: 'remove', in: fl + ' › Properties › Security › Allowed roles', flow: fl, text: 'Or take those module roles off Allowed roles of ' + fl + (f4.allowedModuleRoles ? ' (now ' + list(f4.allowedModuleRoles) + ')' : '') + '.' });
        inModule(modOf(fl));
        break;
      }
      case 'secret-constant': {
        var cq = (where && where[0]) || '';
        if (src.key === 'm:secrets:defaults') {
          var emptyIt = function (q) { return 'Empty the default value of ' + q + ' and give it its value in each environment’s configuration.'; };
          var shared = 'If the model was ever shared (a package, a copy, its history), change those secrets where they are used.';
          (where || []).forEach(function (q) { say({ do: 'set', in: modOf(q) + ' › ' + shortQn(q), setting: 'Default value', value: '(empty)', text: emptyIt(q) }); });
          say({ do: 'decide', text: shared });
          break;
        }
        say({ do: 'set', in: modOf(cq) + ' › ' + shortQn(cq), setting: 'Expose to client', value: 'No', text: 'Untick Expose to client on ' + cq + ' and read it in a microflow on the server.' });
        say({ do: 'decide', text: 'If the browser really needs it, it is not a secret (a public key, an address): mark the risk a false positive and say so.' });
        inModule(modOf(cq), [{ do: 'decide', text: 'Leave ' + cq + ' as the module ships it; give it its value only in the deployment’s configuration, never as a default in the model; mark the risk a false positive when it is a public key.' }]);
        break;
      }
      case 'market-admin':
        r.module = src.module || null;
        r.decide = 'Who really administers ' + str(src.module) + ' — the administrator, or a user role made for the few people who do.';
        say({ do: 'remove', in: APP_SECURITY + ' › User roles › ' + src.userRole + ' › Module roles', userRole: src.userRole, moduleRole: src.moduleRole,
          text: 'Take ' + src.moduleRole + ' off the user role "' + src.userRole + '".' });
        say({ do: 'give', in: APP_SECURITY + ' › User roles', moduleRole: src.moduleRole, text: 'Give ' + src.moduleRole + ' to the administrator’s user role, or to a user role for whoever really runs ' + str(src.module) + '.' });
        break;
      case 'market-unused':
        r.module = src.module || null;
        r.decide = 'Whether anything outside the model needs ' + str(src.module) + ' — a widget, a Java action, a deployment setting — and whether its data may go: deleting a module deletes its data.';
        say({ do: 'remove', in: 'App Explorer › Marketplace modules › ' + src.module, text: 'Delete the module ' + src.module + ' (right-click › Delete).' });
        say({ do: 'remove', in: APP_SECURITY + ' › User roles', text: 'Its module roles leave the user roles with it; check App Security has no error left.' });
        break;
      case 'market-role-unused':
        r.module = src.module || null;
        (src.userRoles || []).forEach(function (u) {
          say({ do: 'remove', in: APP_SECURITY + ' › User roles › ' + u + ' › Module roles', userRole: u, moduleRole: src.moduleRole, text: 'Take ' + src.moduleRole + ' off the user role "' + u + '".' });
        });
        break;
      case 'advisory':
        r.manual = 'Updating Mendix or a Marketplace module is a person’s job in Studio Pro (Marketplace › the module › Update, or a new Studio Pro version), followed by a test run.';
        say({ do: 'update', text: fix || 'Update to a version the advisory names as fixed.' });
        break;
      default:
        say({ do: 'decide', text: fix });
        if (where && where.length === 1 && /\./.test(where[0])) inModule(modOf(where[0]));
    }
    return r;
  }
  // The recipe as lines to read (check-security.js --fix, and anyone who shows it).
  function recipeText(rx) {
    if (!rx) return [];
    var L = [];
    if (rx.module) L.push('Module: ' + rx.module + (rx.marketplace ? ' — Marketplace' : ''));
    if (rx.marketplace) L.push('Never changed here: ' + marketNote(rx.module));
    if (rx.verify && rx.verify.length) L.push('Verify first — this is to verify, not confirmed: ' + rx.verify.join(' ') + ' If it does not hold, mark it a false positive with the reason instead of changing the model.');
    if (rx.decide) L.push('Decide first: ' + rx.decide);
    if (rx.manual) L.push('Only by a person: ' + rx.manual);
    rx.steps.forEach(function (s, i) { L.push((i + 1) + '. ' + s.text + (s.in ? ' [Studio Pro: ' + s.in + ']' : '')); });
    if (rx.inside && rx.inside.length) {
      L.push('Inside ' + rx.module + ', were it the team’s own module (not done here):');
      rx.inside.forEach(function (s) { L.push('- ' + s.text + (s.in ? ' [Studio Pro: ' + s.in + ']' : '')); });
    }
    if (rx.then) L.push('Then: ' + rx.then);
    return L;
  }

  // ---------- a Marketplace module: what the application opens of it, and who may ----------
  // Rules 4 (2026-10-20): inside a Marketplace module a risk is SET ASIDE, not reported, when nothing in the
  // application leads to it (no page, menu, navigation item, scheduled event or flow outside the module opens or
  // calls it), or when every user role that may reach it is one of the application's administrators. Those are the
  // module's own administration screens, run by whoever runs the application. A regular role holding something
  // administrative is still reported. The Administration module is never set aside: its Account entity and account
  // pages are where personal data is, and accounts.js reads them in full.
  // The application's administrators, by what the model says rather than by a name: { userRole: why }.
  // Rules 6 (C9): a role that may give users its own role administers them only when it can open a page that shows
  // accounts — a reporting role with no pages that may manage users is no administrator, and the checks look at it
  // (role-manages-no-pages).
  function adminsOf(model) {
    var sec = model.security || {}, out = {};
    var opens = accountPages(model);
    if (sec.adminUserRole) out[sec.adminUserRole] = 'is the administrator in App Security';
    (model.userRoles || []).forEach(function (u) {
      if (!u || !u.name || out[u.name]) return;
      if (u.manageAllRoles) out[u.name] = 'may assign every user role';
      else if ((u.manageableRoles || []).indexOf(u.name) !== -1 && opens[u.name]) out[u.name] = 'may give users its own role and others, and opens the pages that show accounts, so it administers them';
    });
    return out;
  }
  // The user roles that open at least one page showing accounts (an entity built on System.User as the page's
  // parameter or a data source): { userRole: true }. gdprmap.js reads it the same way (accountPagesOf).
  function accountPages(model) {
    var gen = {}, out = {}, roles = {};
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) gen[e.qualifiedName] = e.generalization || null; });
    function isAccount(q) { for (var i = 0; q && i < 20; i++) { if (q === 'System.User') return true; q = gen[q]; } return false; }
    (model.pages || []).forEach(function (p) {
      if (!p) return;
      var shows = (p.parameters || []).some(function (x) { return x && isAccount(x.entityQualifiedName); }) || (p.dataSources || []).some(function (d) { return d && isAccount(d.entity); });
      if (shows) (p.allowedModuleRoles || []).forEach(function (m) { roles[m] = true; });
    });
    (model.userRoles || []).forEach(function (u) { if (u && (u.moduleRoles || []).some(function (m) { return roles[m]; })) out[u.name] = true; });
    return out;
  }
  // The documents of the Marketplace modules something outside the module leads to, followed through the module's own
  // calls: { qualifiedName: true }. A caller of an application-level kind (menu, navigation…) is outside by definition.
  var OUTSIDE_KIND = { menu: true, navigation: true, 'App Settings': true, 'scheduled event': true, 'published REST service': true, 'published web service': true, 'published OData service': true };
  function enteredOf(model, market) {
    var docs = (model.microflows || []).concat(model.nanoflows || [], model.pages || [], model.snippets || []), calls = {}, out = {}, queue = [];
    docs.forEach(function (d) {
      if (!d || !d.qualifiedName || !market[modOf(d.qualifiedName)]) return;
      var mod = modOf(d.qualifiedName);
      (d.calledBy || []).forEach(function (c) {
        if (!c) return;
        if (OUTSIDE_KIND[c.kind] || modOf(c.name) !== mod) { if (!out[d.qualifiedName]) { out[d.qualifiedName] = true; queue.push(d.qualifiedName); } }
        else (calls[c.name] = calls[c.name] || []).push(d.qualifiedName);
      });
    });
    while (queue.length) (calls[queue.shift()] || []).forEach(function (q) { if (!out[q]) { out[q] = true; queue.push(q); } });
    return out;
  }
  function usersHolding(ix, moduleRoles) {
    var want = {};
    (moduleRoles || []).forEach(function (m) { want[m] = true; });
    return Object.keys(ix.role).filter(function (n) { return (ix.role[n].moduleRoles || []).some(function (m) { return want[m]; }); }).sort();
  }
  function quoted(list) { return list.map(function (x) { return '"' + x + '"'; }); }
  // Why a risk is set aside, or null. qn: what the risk is about (a flow or an entity).
  function asideOf(ix, admins, entered, check, qn, src) {
    if (check === 'market-admin') {
      // The administrator first: the Administration module is never set aside because its account pages are where
      // personal data is — not so that an administrator holding an administrative role would be reported (MXS-173).
      if (admins[src.userRole]) return '"' + src.userRole + '" ' + admins[src.userRole] + ' — an administrator holding the module’s administrative role is what it is for';
      if (src.module === 'Administration') return null;
      var opens = (ix.pagesOf[src.moduleRole] || []).concat(ix.flowsOf[src.moduleRole] || []).filter(function (q) { return entered[q]; });
      return opens.length ? null : 'nothing in the application opens what ' + src.moduleRole + ' grants — no page, menu or flow outside ' + src.module + ' leads to its pages or flows';
    }
    var mod = modOf(qn);
    if (!ix.market[mod] || mod === 'Administration') return null;
    var flow = ix.flow[qn], users;
    if (flow) {
      if (!entered[qn]) return 'nothing in the application leads to ' + qn + ' — no page, menu or flow outside ' + mod + ' opens or calls it';
      users = usersHolding(ix, flow.allowedModuleRoles);
    } else if (ix.ent[qn]) users = usersHolding(ix, (ix.ent[qn].accessRules || []).map(function (r) { return r && r.moduleRole; }));
    else return null;
    if (!users.length || users.some(function (u) { return !admins[u]; })) return null;
    return 'only ' + list(quoted(users)) + ' may reach it in ' + mod + ', and ' + (users.length === 1 ? 'that role is' : 'each of them is') + ' an administrator of the application';
  }
  // The checks whose risk is about one flow (its first place) or one entity, in a module of its own.
  var ASIDE = { 'guard-page-hides': true, 'guard-bypass-xpath': true, 'guard-same-entity': true, 'guard-escalation': true, 'guard-role-wider': true,
    'service-op-unscoped': true, 'access-fails': true, 'scope-write': true, 'scope-delete': true, 'market-admin': true,
    'guard-scope-set': true, 'guard-account-param': true, 'guard-sub-callable': true, 'guard-auth-loose': true, 'scope-delete-state': true, 'access-finds-nothing': true };

  // ---------- an attribute whose name says it holds a secret (rules 5, MXS-173) ----------
  // A password, a token or an API key kept as an ATTRIBUTE, not as a constant: the name is the only hint the model
  // gives about what is in it, and what decides is who may READ it. A role that administers the application is
  // left out — holding the application's own credentials is what it is for. Whether the value is stored as it was
  // typed is read from the flows that write it: one that calls nothing which encrypts or hashes stores it plainly.
  // The review of 2026-11-01 found three such places, every one hidden inside the hundreds of P3 access notes.
  var ENCRYPTS = /encrypt|decrypt|hmac|hash|bcrypt|scrypt|pbkdf|cipher|crypto/i;
  function secretAttributes(model, admins) {
    var W = typeof window !== 'undefined' ? window : {};
    var says = W.MxConstants && W.MxConstants.secretAttributeName ? W.MxConstants.secretAttributeName
      : function (n) { return !/^(is|has)[A-Z_]/.test(str(n)) && /password|passwd|passphrase|secret|token|api_?key|private_?key|secret_?key|credential|access_?key/i.test(str(n)); };
    var restricts = W.MxAccounts && W.MxAccounts.restrictsToUser ? W.MxAccounts.restrictsToUser : function (x) { return /\[%CurrentUser%\]/.test(str(x)); };
    var flows = (model.microflows || []).concat(model.nanoflows || []), out = [];
    // Does nothing that writes this member encrypt or hash it on the way?
    function plainly(entityQn, attr) {
      var writers = flows.filter(function (f) {
        var w = (f && f.activity && f.activity.writes) || {};
        return (w[entityQn] || []).indexOf(attr) !== -1;
      });
      if (!writers.length) return false; // nothing in this model writes it: it does not say
      return !writers.some(function (f) {
        if ((((f.activity || {}).calls) || []).some(function (c) { return ENCRYPTS.test(str(c)); })) return true;
        return (((f.graph || {}).nodes) || []).some(function (n) {
          return n && !n.disabled && n.props && ENCRYPTS.test(str(n.props.target));
        });
      });
    }
    (model.entities || []).forEach(function (e) {
      if (!e || !e.qualifiedName || e.persistable === false || /^System\./.test(e.qualifiedName)) return;
      (e.attributes || []).forEach(function (a) {
        // Rules 6 (C10): text only — a Boolean, an enumeration, a number or a date holds no secret.
        if (!a || !a.name || (a.type && a.type !== 'String' && a.type !== 'HashString') || !says(a.name)) return;
        var readers = [], open = [], writers = [];
        (model.userRoles || []).forEach(function (u) {
          if (!u || !u.name || admins[u.name] || !(u.moduleRoles || []).length) return;
          var mine = {};
          u.moduleRoles.forEach(function (m) { mine[m] = true; });
          (e.accessRules || []).forEach(function (rule) {
            if (!rule || !mine[rule.moduleRole]) return;
            var letter = (rule.attrAccess || {})[a.name] || rule.defaultAccess;
            if (letter !== 'r' && letter !== 'rw') return;
            // Only a reader past its own row (C10.3): one's own token on one's own account is one's own.
            if (rule.xpathConstraint && restricts(rule.xpathConstraint)) return;
            if (readers.indexOf(u.name) === -1) readers.push(u.name);
            if (!rule.xpathConstraint && open.indexOf(u.name) === -1) open.push(u.name);
            if (letter === 'rw' && writers.indexOf(u.name) === -1) writers.push(u.name);
          });
        });
        if (!readers.length) return;
        var writtenBy = flows.filter(function (f) { var w = (f && f.activity && f.activity.writes) || {}; return (w[e.qualifiedName] || []).indexOf(a.name) !== -1; }).length;
        out.push({ entity: e.qualifiedName, attribute: a.name, type: a.type || 'String', hashed: a.type === 'HashString',
          readers: readers.sort(), open: open.sort(), writers: writers.sort(), plain: plainly(e.qualifiedName, a.name), writtenBy: writtenBy });
      });
    });
    return out;
  }

  // ---------- the test case: how a person shows the risk is real ----------
  // → { who, given, steps[], real, safe } — plain sentences. Who signs in as which role, what has to be there first,
  // what to do in the running application (the browser's developer console where the risk is that the client may do
  // what the page does not offer), and how to tell a real risk from a safe one.
  var CONSOLE = 'Open the browser’s developer tools (F12) › Console';
  function signIn(users, admins) {
    // The plainest role first: not an administrator, and not one whose name says it administers something.
    var plain = users.filter(function (u) { return !admins[u]; }).sort(function (a, b) { return (/admin/i.test(a) - /admin/i.test(b)) || a.localeCompare(b); }), u = (plain.length ? plain : users)[0];
    var others = users.filter(function (x) { return x !== u; });
    return u ? 'A user who has only the role "' + u + '"' + (others.length ? ' (the same holds for ' + list(quoted(others.slice(0, 4)).concat(others.length > 4 ? [(others.length - 4) + ' more'] : [])) + ')' : '') : 'A user of one of the roles named in the description';
  }
  function guidOf(entity) {
    return 'Find the object’s id: mx.data.get({ xpath: "//' + entity + '", callback: function (os) { console.log(os.map(function (o) { return o.getGuid(); })); } })';
  }
  function callFlow(flow, withObject) {
    return 'Call the flow directly: mx.data.action({ params: { actionname: "' + flow + '"' + (withObject ? ', applyto: "selection", guids: ["<the id>"]' : '') + ' }, callback: console.log, error: console.error })' +
      (withObject && withObject.others && withObject.others.length ? ' — it also takes ' + list(withObject.others) + ': call it from the page that opens it if the console call is refused for that reason' : '');
  }
  function testOf(ix, admins, entered, check, r, src) {
    src = src || {};
    var flow = ix.flow[r.where[0]], first = str(r.detail).split('\n')[0];
    var objects = flow ? (flow.parameters || []).filter(function (p) { return p && p.entityQualifiedName && !p.isList; }) : [];
    var named = str(((((src.list || [])[0] || {}).conditions || [])[0] || {}).param);
    var param = objects.filter(function (p) { return p.name === named; })[0] || objects[0];
    if (param) param = { name: param.name, entity: param.entityQualifiedName, others: objects.filter(function (p) { return p !== param; }).map(function (p) { return '$' + p.name; }) };
    var t = { who: null, given: null, steps: [], real: null, safe: null };
    switch (check) {
      case 'guard-page-hides': {
        var f = (src.list || [])[0] || {}, conds = uniq((src.list || []).map(function (x) { return (x.conditions || []).map(function (c) { return c.text; }).join(' and '); }));
        t.who = signIn(usersHolding(ix, flow && flow.allowedModuleRoles), admins);
        t.given = 'An object' + (param ? ' of ' + param.entity : '') + ' for which ' + (f.page || 'the page') + ' hides "' + str(f.trigger || 'the button') + '"' + (conds.length ? ' (the condition: ' + conds.join('; or ') + ')' : '') + '.';
        t.steps = ['Sign in as that user and open ' + (f.page || 'the page') + ' on the object: "' + str(f.trigger || 'the button') + '" is not there.', CONSOLE + '.'];
        if (param) t.steps.push(guidOf(param.entity));
        t.steps.push(callFlow(r.where[0], param));
        t.real = src.impact || 'The call succeeds and the object is changed, although the page would not let the user do it.';
        t.safe = 'The call ends with an error or a message and nothing changes: ' + r.where[0] + ' checks the state itself.';
        break;
      }
      case 'guard-bypass-xpath': {
        var b = (src.list || [])[0] || {};
        t.who = signIn(b.roles || [], admins);
        t.given = 'Objects of ' + (b.entity || 'the entity') + ' that this role’s access rule (' + (b.xpaths || []).join(' | ') + ') does not let it see.';
        t.steps = ['Sign in as that user and note what lists of ' + (b.entity || 'the entity') + ' show: only the rows the rule allows.', CONSOLE + '.', callFlow(r.where[0], param)];
        t.real = src.impact || 'Rows outside the role’s rule come back, or are changed.';
        t.safe = 'Only the rows the rule allows come back, and nothing outside them changes.';
        break;
      }
      case 'access-fails': {
        var it = (src.items || [])[0] || {}, page = flow && (flow.calledBy || []).filter(function (c) { return c.kind === 'page'; })[0];
        t.who = signIn(it.userRoles || [], admins);
        t.steps = ['Sign in as that user.', page ? 'Open ' + page.name + ' and use what runs ' + r.where[0] + '.' : 'Run ' + r.where[0] + ' the way the application offers it.'];
        t.real = 'It stops with an error about missing access to ' + (it.entity || 'an entity') + ', or does nothing.';
        t.safe = 'It finishes and does what it should.';
        break;
      }
      case 'scope-write': case 'scope-delete': {
        var ent = r.where[0], del = check === 'scope-delete';
        t.who = signIn(usersHolding(ix, ((ix.ent[ent] || {}).accessRules || []).map(function (x) { return x && x.moduleRole; })), admins);
        t.given = 'An object of ' + ent + ' in a state where no page lets this role ' + (del ? 'delete it' : 'change it') + '.';
        t.steps = ['Sign in as that user.', CONSOLE + '.', guidOf(ent),
          del ? 'mx.data.remove({ guids: ["<the id>"], callback: console.log, error: console.error })'
            : 'mx.data.get({ guid: "<the id>", callback: function (o) { o.set("' + str((src.attributes || [])[0] || 'the attribute') + '", <a value>); mx.data.commit({ mxobj: o, callback: console.log, error: console.error }); } })'];
        t.real = 'The server accepts it: the object is ' + (del ? 'deleted' : 'changed') + ' in a state the pages do not allow.';
        t.safe = 'The server refuses it.';
        break;
      }
      case 'market-admin':
        t.who = 'A user who has only the role "' + src.userRole + '"';
        t.steps = ['Sign in as that user.', 'Open what ' + src.moduleRole + ' grants: ' + (list((ix.pagesOf[src.moduleRole] || []).filter(function (q) { return entered[q] || src.module === 'Administration'; }).slice(0, 3)) || 'the pages of ' + src.module) + '.'];
        t.real = 'The user sees and may use the administration of ' + src.module + '.';
        t.safe = 'The pages do not open or are empty for this user.';
        break;
      case 'secret-constant':
        if (src.key === 'm:secrets:defaults') {
          t.who = 'Anybody with a copy of the model (the project, a package or its history)';
          t.steps = ['Open the project in Studio Pro.', 'Open each constant listed here and look at its Default value.'];
          t.real = 'A value is set in the model.';
          t.safe = 'The default value is empty; each environment sets its own.';
          break;
        }
        t.who = 'Any signed-in user';
        t.steps = ['Sign in. ' + CONSOLE.replace(/ › Console$/, '') + ' › Network.', 'Reload the page and open the session request (xas, action get_session_data).', 'Search its answer for ' + r.where[0] + '.'];
        t.real = 'The value is there, readable by everyone signed in.';
        t.safe = 'The constant is not in it.';
        break;
      case 'demo-password':
        t.who = 'Anybody who can reach the application';
        t.steps = ['Open the application’s sign-in page.', 'Sign in as ' + str(src.subject || r.where[0]) + ' with its demo password.'];
        t.real = 'The sign-in works on the deployed application.';
        t.safe = 'Demo users are off where the application runs.';
        break;
      default:
        t.who = src.userRole ? 'A user who has only the role "' + src.userRole + '"' : src.role ? 'A user who has the role "' + src.role + '"' : check === 'anon' || check === 'selfreg' ? 'Anybody, not signed in' : null;
        if (src.scenario) t.steps.push(src.scenario);
        else if ((src.doubts || []).length) t.steps = src.doubts.slice(0, 4);
        else t.steps.push('In Studio Pro, open ' + (r.where[0] || 'App Security') + ' and check it against the description.');
        t.real = src.impact || first;
        t.safe = r.fix && /^Nothing, if /.test(r.fix) ? r.fix.replace(/^Nothing, if /, 'It is meant: ') : null;
    }
    if (r.register === 'suspect' && (src.doubts || []).length && check !== 'secret-constant') t.given = (t.given ? t.given + ' ' : '') + 'First look at: ' + src.doubts.slice(0, 2).join(' ') + (src.doubts.length > 2 ? ' (and ' + (src.doubts.length - 2) + ' more in the description)' : '');
    var out = {};
    Object.keys(t).forEach(function (k) { if (t[k] && (!Array.isArray(t[k]) || t[k].length)) out[k] = Array.isArray(t[k]) ? t[k].map(function (s) { return cut(s, 600); }) : cut(t[k], 1200); });
    return out;
  }

  // ---------- the whole list ----------
  // → { risks: [R], notChecked: [{ check, text, where }], counts: { risks, findings, notes, P1, P2, P3, byCheck: { check: n } } }
  // R = { id, check, register: 'finding' | 'note', level, theme, title, detail, fix, where[], key?, recipe }
  // Each module is used when it is loaded (in the browser all are; the skill's engine loads them all too).
  function check(model) {
    model = model || {};
    var W = typeof window !== 'undefined' ? window : {};
    var risks = [], leads = [], other = [], notChecked = [], setAside = [], ids = {}, ix = indexOf(model), admins = adminsOf(model), entered = enteredOf(model, ix.market);
    ix.pagesOf = {}; ix.flowsOf = {};
    [['pagesOf', model.pages], ['flowsOf', (model.microflows || []).concat(model.nanoflows || [])]].forEach(function (p) {
      (p[1] || []).forEach(function (d) { if (d && d.qualifiedName) (d.allowedModuleRoles || []).forEach(function (m) { (ix[p[0]][m] = ix[p[0]][m] || []).push(d.qualifiedName); }); });
    });
    function add(check, subject, register, level, theme, title, detail, fix, where, key, src) {
      var id = riskId(check, subject);
      if (ids[id]) return;
      ids[id] = true;
      var aside = ASIDE[check] ? asideOf(ix, admins, entered, check, str((where || [])[0]), src || {}) : null;
      if (aside) { setAside.push({ id: id, check: check, title: cut(title, 300), why: aside }); return; }
      // Rules 6 (C0): what a check suspects and the model does not prove is a LEAD, not a risk "to verify" — kept
      // for the risk skill, which confirms it (and writes it as a risk, the lead's id in `from`) or drops it. A lead
      // has no level, is not counted and is not exported as a risk.
      if (register === 'suspect' || register === 'lead') return addLead(id, check, theme, title, detail, fix, where, src);
      // Not a risk at all: a list of its own — code quality (a flow that fails for a role) or cleanup (rights and
      // modules nothing uses). Shown where the list belongs, never counted as a risk (C13).
      if (register === 'quality' || register === 'cleanup') {
        other.push({ id: id, check: check, list: register, theme: THEMES[theme] ? theme : 'access', title: cut(title, 300), detail: detail ? cut(detail, 3000) : null,
          fix: fix ? cut(fix, 1000) : null, where: uniq((where || []).map(function (w) { return cut(w, 300); })).slice(0, 40) });
        return;
      }
      var suspect = false, note = register !== 'finding';
      // A finding is P1 or P2, and — since rules 5 — P3 where what it describes is real but gains nobody anything
      // (adding only the caller to an object the role already reads).
      var r = { id: id, check: check, register: suspect ? 'suspect' : note ? 'note' : 'finding', level: note ? 'P3' : suspect ? (level === 'P3' ? 'P3' : 'P2') : (/^P[123]$/.test(level) ? level : 'P1'), theme: THEMES[theme] ? theme : 'access',
        title: cut((note ? 'Worth knowing: ' : suspect ? 'To verify: ' : '') + title, 300), detail: detail ? cut(detail, 3000) : null, fix: fix ? cut(fix, 1000) : null,
        where: uniq((where || []).map(function (w) { return cut(w, 300); })).slice(0, 40) };
      if (key) r.key = key;
      // What makes it sure, or not: evidence and the scenario with its effect for a confirmed finding, the doubts
      // (what to look at) for one to verify. Only the checks that weigh their evidence give these.
      if (src && (src.evidence || src.doubts)) {
        if (suspect) r.doubts = (src.doubts || []).slice(0, 12);
        else { r.evidence = (src.evidence || []).slice(0, 12); if (src.scenario) r.scenario = src.scenario; if (src.impact) r.impact = src.impact; }
      }
      r.recipe = recipeFor(ix, check, src, r.fix, r.where);
      // To verify: nothing is changed before a person has looked at what the model does not prove.
      if (suspect) r.recipe.verify = (r.doubts || []).length ? r.doubts.slice() : ['The model does not prove it: look at it in Studio Pro and in the running application first.'];
      r.recipe.then = 'node check-security.js no longer lists ' + id + ' — the model no longer has it.';
      // What a person reads on the risk's page: how to show it is real, and what to change where, as a ticket would say it.
      r.test = testOf(ix, admins, entered, check, r, Object.assign({ subject: subject }, src || {}));
      r.repair = recipeText(r.recipe).map(function (l) { return l.replace(/^Then: node check-security\.js no longer lists (\S+) — /, 'Then: the security check no longer lists $1 — '); });
      risks.push(r);
    }
    function addLead(id, check, theme, title, detail, fix, where, src) {
      var L = { id: id, check: check, register: 'lead', theme: THEMES[theme] ? theme : 'access', title: cut(str(title).replace(/^(To verify|Worth knowing): /, ''), 300),
        detail: detail ? cut(detail, 3000) : null, fix: fix ? cut(fix, 1000) : null, where: uniq((where || []).map(function (w) { return cut(w, 300); })).slice(0, 40) };
      // The facts the check read: what it saw, and what the model does not show (what the skill looks at first).
      var facts = uniq([].concat((src && src.evidence) || [], (src && src.facts) || [])).slice(0, 12), doubts = ((src && src.doubts) || []).slice(0, 12);
      if (facts.length) L.facts = facts;
      if (doubts.length) L.doubts = doubts;
      if (src && src.rank !== undefined) L.rank = src.rank;
      leads.push(L);
    }
    function shortText(t) { t = str(t); var i = t.search(/[.—;:](\s|$)/); return i > 20 && i < 200 ? t.slice(0, i) : cut(t, 200); }
    // A weighed finding's detail: what it is, then why it is sure (scenario, effect, evidence) or what to verify.
    function weighed(text, src) {
      if (!src || !src.confidence) return text;
      if (src.confidence === 'confirmed') return text + (src.scenario ? '\nScenario: ' + src.scenario : '') + (src.impact ? '\nEffect: ' + src.impact : '') +
        ((src.evidence || []).length ? '\nEvidence: ' + src.evidence.join(' ') : '');
      return text + '\nTo verify — the model does not prove it: ' + (src.doubts || []).join(' ') + '\nNothing here says it is safe either: look at these before you mark it a false positive or fix it.';
    }
    // The register of a weighed finding.
    function reg(src) { return src && src.confidence === 'suspected' ? 'suspect' : 'finding'; }

    // The settings, in the band's words.
    settings(model).forEach(function (x) {
      add(x.check, x.subject, x.register, x.level, x.check === 'demo-password' ? 'secrets' : 'access', x.text.replace(/\.$/, ''), x.text, x.fix, x.where, null, x);
    });

    // The anonymous role, in Mendix's own codes.
    if (W.MxAnonRole) W.MxAnonRole.check(model).results.forEach(function (r) {
      if (r.register === 'unchecked') { notChecked.push({ check: 'anon', text: r.code + ' · ' + r.text, where: [] }); return; }
      var subject = [r.code, r.entity, r.userRole, r.moduleRole].filter(Boolean).join(' ');
      add('anon', subject, r.register, r.priority || 'P1', 'access', r.code + ' · ' + r.title + (r.entity ? ': ' + r.entity : r.moduleRole ? ': ' + r.moduleRole : ''), r.text, r.fix, [r.entity, r.moduleRole], null, r);
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
            [p.entry.flow, g.flow, g.role ? null : g.constant], null, { flow: g.flow || p.entry.flow, role: g.role });
        });
      });
    }

    // User accounts, role by role — with what each role's pages and flows write (accessuse.js), measured once.
    var use = W.MxAccessUse ? (W.MxAccessUse.of ? W.MxAccessUse.of(model) : W.MxAccessUse.analyse(model)) : null;
    if (W.MxAccounts) {
      W.MxAccounts.check(model, use).results.forEach(function (r) {
        // Rules 6 (C8): 'info' is the Security screen's alone; a member nothing uses is a lead; a role that manages
        // users and opens no page (or sits on a published service) is a finding of its own (N5).
        if (r.register !== 'finding' && r.register !== 'note' && r.register !== 'lead') return;
        if (r.kind === 'manager-no-pages') {
          add('role-manages-no-pages', r.userRole, 'finding', 'P2', 'access', r.title + ' — ' + r.userRole, r.text, r.fix, ['System.User'].concat(r.services || []), null, r);
          return;
        }
        var subj = r.kind === 'write-unused' ? [r.kind, r.entity, (r.fields || [])[0]].join(' ') : [r.kind, r.userRole, r.entity, r.moduleRole].filter(Boolean).join(' ');
        if (r.kind === 'write-unused') { add('accounts', subj, 'lead', null, 'access', r.title + ': ' + r.entity + '.' + (r.fields || [])[0], r.text, r.fix, [r.entity].concat(r.userRoles || []), null, r); return; }
        add('accounts', subj, r.register, r.priority, 'access',
          (r.title || 'User accounts') + (r.userRole ? ' — ' + r.userRole : '') + (r.entity ? ' (' + r.entity + ')' : ''), r.text, r.fix, [r.entity], null, r);
      });
    }

    // What a page hides and the microflow behind it does not check: one risk per flow (one cause, its pages as places).
    if (W.MxGuards) {
      var g = W.MxGuards.of(model), byFlow = {}, order = [];
      // Only the two kinds this grouping is about: since rules 5 guards.js also returns escalation-write and
      // service-unscoped, which are risks of their own below — grouped here they would all come out as
      // "retrieves past the role's XPath", which is not what any of them says (MXS-173).
      g.findings.filter(function (f) { return f.kind === 'page-hides' || f.kind === 'bypass-xpath'; }).forEach(function (f) {
        var k = f.kind + ' ' + f.flow;
        if (!byFlow[k]) { byFlow[k] = { kind: f.kind, flow: f.flow, list: [] }; order.push(k); }
        byFlow[k].list.push(f);
      });
      order.forEach(function (k) {
        var b = byFlow[k], p1 = b.list.some(function (f) { return f.priority === 'P1'; });
        // One risk per flow: confirmed when one of its places is, with that place's evidence; else to verify.
        var sure = b.list.filter(function (f) { return f.confidence !== 'suspected'; });
        b.confidence = sure.length ? 'confirmed' : 'suspected';
        b.evidence = uniq([].concat.apply([], sure.map(function (f) { return f.evidence || []; })));
        b.scenario = sure.length ? sure[0].scenario || null : null;
        b.impact = sure.length ? sure[0].impact || null : null;
        b.doubts = sure.length ? [] : uniq([].concat.apply([], b.list.map(function (f) { return f.doubts || []; })));
        var detail = weighed(b.list.map(function (f) { return f.text; }).join('\n'), b);
        // Rules 6 (C2): a lead, always — what the flow does decides, and the skill reads it.
        if (b.kind === 'page-hides') {
          b.rank = p1 ? 1 : 2;
          add('guard-page-hides', b.flow, 'lead', null, 'access', b.flow + ' does not check what its page hides', detail,
            'Add a decision at the start of ' + b.flow + ' that checks the same condition the page uses to hide the button, and end the flow when it does not hold.',
            [b.flow].concat(b.list.map(function (f) { return f.page; })), null, b);
        } else {
          add('guard-bypass-xpath', b.flow, reg(b), p1 ? 'P1' : 'P2', 'access', b.flow + ' retrieves past the role’s XPath', detail,
            'Give the retrieve in ' + b.flow + ' the XPath of the role’s own access rule, or let the microflow apply entity access.',
            [b.flow].concat(b.list.map(function (f) { return f.entity; })), null, b);
        }
      });
      // Callable by more roles than any page offers it to: ONE note with the flows as places. On a real
      // application these run to dozens — a role given "just in case" — and a Risks page of dozens reads as noise.
      // Rules 6 (C3): one lead per flow — without the roles that administer the application, and only for a flow
      // that stores or sends something (guards.js roleWider). guard-same-entity is switched off (C4).
      g.notes.filter(function (n) { return n.kind === 'role-wider'; }).forEach(function (n) {
        add('guard-role-wider', n.flow, 'lead', null, 'access', n.flow + ' may be called by ' + list(quoted(n.roles)) + ', which no page offers it to', n.text,
          'Take the module roles ' + list(quoted(n.roles)) + ' carry off Allowed roles of ' + n.flow + ', or offer the flow to them on a page.', [n.flow], null, { facts: [n.text], rank: 2 });
      });

      // Past the role's own rules: one risk per flow, entity and kind of step (rules 5). This is the way to
      // somebody else's data the rules before did not know, and it does not depend on any page hiding anything.
      g.findings.filter(function (f) { return f.kind === 'escalation-write'; }).forEach(function (f) {
        var who = list(f.roles.map(function (x) { return '"' + x + '"'; }));
        add('guard-escalation', f.flow + ' ' + f.why, 'lead', null, 'access',
          f.flow + (f.why === 'past-xpath' ? ' works on anybody’s ' : ' writes past the rules of ' + who + ' on ') + shortQn(f.entity),
          weighed(f.text, f),
          f.why === 'past-xpath'
            ? 'In ' + f.flow + ', fetch the object with the XPath of the role’s own rule, or add a decision that compares it with $currentUser before the step; or set Apply entity access to Yes.'
            : 'Set Apply entity access to Yes on ' + f.flow + ' and give ' + who + ' the access the step needs — or add a decision that refuses the step for a role that may not take it.',
          [f.flow].concat(f.entities || [f.entity]), null, f);
      });

      // Published operations that trust the key in the request.
      g.findings.filter(function (f) { return f.kind === 'service-unscoped'; }).forEach(function (f) {
        add('service-op-unscoped', f.flow, 'lead', null, 'access',
          f.operation + ' fetches ' + shortQn(f.entity) + ' by the key in the request, with nothing comparing it to the caller', weighed(f.text, f),
          'In ' + f.flow + ', compare the object with the user the service authenticated ($currentUser, or the account the authentication microflow returned) before it is read or changed — or fetch it with an XPath that does.',
          [f.flow, f.entity, f.service], null, f);
      });

      // What the drawing says about the logic (rules 6, C6): a REST call with no error handler is code quality, not a
      // risk; commits in a loop are perfrisks.js's, and switched-off scheduled events a count on the overview.
      (g.logic || []).forEach(function (n) {
        add('logic-note', n.kind, 'quality', null, 'logic', 'A REST call with no error handler', n.text, n.fix, n.flows, null, n);
      });

      // The leads the review needed (rules 6, N2, N4, N9, N10).
      var NEW = { 'scope-set': 'guard-scope-set', 'account-param': 'guard-account-param', 'auth-loose': 'guard-auth-loose', 'sub-callable': 'guard-sub-callable' };
      var TITLE = {
        'scope-set': function (f) { return f.flow + ' sets ' + list(f.associations) + ', which keeps rows to the user, without looking at the caller'; },
        'account-param': function (f) { return f.flow + (f.credential ? ' makes a credential for an account the client names' : ' changes an account the client names, or makes objects for it'); },
        'auth-loose': function (f) { return f.flow + ' matches a credential loosely'; },
        'sub-callable': function (f) { return f.flow + ' is a sub-microflow the client may call, and it ' + (f.sends ? 'sends' : 'stores'); }
      };
      var FIX = {
        'scope-set': function (f) { return 'In ' + f.flow + ', check before the change that the caller may put that object into that scope (compare with $currentUser), or set Apply entity access to Yes and give the association write only where it belongs.'; },
        'account-param': function (f) { return 'In ' + f.flow + ', compare the account with $currentUser before the step (or check the caller administers it), or take the role off Allowed roles.'; },
        'auth-loose': function (f) { return 'Compare the credential exactly (=), on the whole header or field that carries it, and refuse an empty one.'; },
        'sub-callable': function (f) { return 'Take every role off Allowed roles of ' + f.flow + ': a microflow only other microflows call needs none.'; }
      };
      g.findings.filter(function (f) { return NEW[f.kind]; }).forEach(function (f) {
        add(NEW[f.kind], f.flow, 'lead', null, 'access', TITLE[f.kind](f), f.text, FIX[f.kind](f), [f.flow].concat(f.entities || []).concat(f.service ? [f.service] : []), null, f);
      });
    }

    // A write or delete right wider than every place the role uses it.
    if (W.MxEditScope) {
      var sc = W.MxEditScope.of(model, use);
      // Rules 6 (C12): leads, never P1 on the role's own rows; the notes are the cleanup list (C13.3).
      sc.findings.forEach(function (f) {
        f.rank = f.priority === 'P1' ? 1 : 2;
        add(f.kind === 'delete' ? 'scope-delete' : 'scope-write', f.entity, 'lead', null, 'access',
          (f.kind === 'delete' ? 'Deleted in every state: ' : 'Written in every state: ') + f.entity + (f.attributes && f.attributes.length ? ' (' + f.attributes.slice(0, 4).join(', ') + (f.attributes.length > 4 ? '…' : '') + ')' : ''),
          weighed(f.text + (f.mitigation ? ' ' + f.mitigation : ''), f), f.fix, [f.entity].concat((f.places || []).map(function (p) { return p.name; })), null, f);
      });
      sc.notes.forEach(function (n) {
        add('scope-note', n.kind + ' ' + (n.microflow || ''), 'cleanup', null, 'access', n.kind === 'commit-check' ? 'A shared commit check in ' + n.microflow : 'Create rights nothing uses', n.text,
          n.kind === 'commit-check' ? 'Nothing, if ' + n.microflow + ' refuses what the pages do not allow; otherwise name the state in the access rule.' : 'Take the create right off the rules where nothing the role reaches creates.', [n.microflow]);
      });
    }

    // N3 (rules 6): a delete right a non-administrator holds whose XPath does not name the entity's workflow state.
    if (W.MxEditScope && W.MxEditScope.deleteStates) {
      var dsBy = {};
      W.MxEditScope.deleteStates(model, admins).forEach(function (d) { var x = dsBy[d.entity] = dsBy[d.entity] || { entity: d.entity, states: d.states, roles: [], moduleRoles: [], xpaths: [] }; d.userRoles.forEach(function (u) { if (x.roles.indexOf(u) === -1) x.roles.push(u); }); x.moduleRoles.push(d.moduleRole); x.xpaths.push(d.xpath || '(no XPath)'); });
      Object.keys(dsBy).sort().forEach(function (k) {
        var d = dsBy[k], who = list(quoted(d.roles.sort()));
        add('scope-delete-state', d.entity, 'lead', null, 'access', who + ' may delete ' + d.entity + ' in any ' + list(d.states),
          'The rule' + (d.moduleRoles.length > 1 ? 's' : '') + ' for ' + list(uniq(d.moduleRoles)) + ' on ' + d.entity + ' allow' + (d.moduleRoles.length > 1 ? '' : 's') + ' delete with an XPath that does not name ' + list(d.states) + ' (' + uniq(d.xpaths).join(' | ') + '): ' + who + ' may delete one in any state, whatever the pages offer.',
          'Add the states a ' + shortQn(d.entity) + ' may be deleted in to the XPath of the rule that allows delete, or take delete off and delete in a microflow that checks the state.',
          [d.entity], null, { facts: ['Delete allowed by ' + list(uniq(d.moduleRoles)) + ' with XPath ' + uniq(d.xpaths).join(' | ') + '; workflow state: ' + list(d.states) + '.'], rank: 2 });
      });
    }

    // Entity access against what uses it (accessuse.js). The Domain model tells these entity by entity, in each
    // rule's Access window, and the Security band counts them.
    if (use) {
      var WHAT = { read: 'reads', create: 'creates', write: 'changes', del: 'deletes', 'delete': 'deletes' };
      // Rules 6 (C13): none of these is one risk with dozens of places any more.
      //  access-wider     — one lead per entity, the text and file stores first (N12 ranks them; an entity N12 names
      //                     is its lead alone).
      //  access-unwritten — leads for the members a rule WITHOUT an own-rows XPath lets the role write; the rest,
      //                     with access-unused, is the cleanup list on the Security screen.
      //  access-fails, access-finds-nothing — the code quality list ("fails for a role").
      var texts = W.MxAccessUse.textStores ? W.MxAccessUse.textStores(model, admins) : [], textBy = {};
      texts.forEach(function (t) {
        textBy[t.entity] = t;
        var who = list(quoted(t.userRoles));
        add('access-text-open', t.entity, 'lead', null, 'access', t.entity + ' (' + (t.file ? 'files' : '') + (t.file && t.attributes.length ? ', ' : '') + t.attributes.slice(0, 4).join(', ') + ') is read in full by ' + (t.userRoles.length > 2 ? t.userRoles.length + ' user roles' : who),
          who + ' read every ' + t.entity + ' — the rule' + (t.moduleRoles.length > 1 ? 's' : '') + ' for ' + list(t.moduleRoles) + ' ha' + (t.moduleRoles.length > 1 ? 've' : 's') + ' no XPath — and it holds ' + (t.file ? 'files' : '') + (t.file && t.attributes.length ? ' and ' : '') + (t.attributes.length ? 'long text (' + t.attributes.join(', ') + ')' : '') + ': whatever is written into it by anyone is readable by all of them. Look at whether it is a copy of what other rules keep to their owner (a sent mail, a comment, an attachment).',
          'Give the read rule an XPath that follows what the entity belongs to, the way its owner’s rule does.', [t.entity], null, { facts: [list(t.moduleRoles) + ': read, no XPath.'], rank: 1 });
      });
      var widerBy = {};
      (use.wider || []).forEach(function (i) {
        if (admins[i.userRole] || textBy[i.entity]) return;
        var e = ix.ent[i.entity];
        if (e && e.persistable === false) return;
        if (asideOf(ix, admins, entered, 'access-wider', i.entity, {})) return;
        var x = widerBy[i.entity] = widerBy[i.entity] || { roles: [], moduleRoles: [] };
        if (x.roles.indexOf(i.userRole) === -1) x.roles.push(i.userRole);
        (i.openRoles || []).forEach(function (m) { if (x.moduleRoles.indexOf(m) === -1) x.moduleRoles.push(m); });
      });
      Object.keys(widerBy).sort().forEach(function (q) {
        var x = widerBy[q], who = list(quoted(x.roles.sort()));
        add('access-wider', q, 'lead', null, 'access', q + ' is read in full by ' + (x.roles.length > 2 ? x.roles.length + ' user roles' : who) + ', whose pages show fewer rows',
          who + ' read every row of ' + q + ' (the rule' + (x.moduleRoles.length > 1 ? 's' : '') + ' for ' + list(x.moduleRoles) + ' ha' + (x.moduleRoles.length > 1 ? 've' : 's') + ' no XPath), while nothing they reach lists every row — a page is not a security boundary, the rule is what the client may fetch.',
          'Give the read rule the XPath its pages narrow by, or confirm every row may be read.', [q], null, { facts: [list(x.moduleRoles) + ': read, no XPath.'], rank: 3 });
      });
      var cleanup = function (check, list0, title, said, fix) {
        var ents = uniq(list0.filter(function (i) {
          if (i.userRole && admins[i.userRole]) return false;
          var e = ix.ent[i.entity];
          return !(e && e.persistable === false);
        }).map(function (i) { return i.entity || i.flow; })).filter(function (q) { return !asideOf(ix, admins, entered, check, q, {}); }).sort();
        if (!ents.length) return;
        add(check, 'model', 'cleanup', null, 'access', ents.length + ' ' + title,
          said + ' ' + (ents.length > 60 ? ents.slice(0, 60).join(', ') + ' and ' + (ents.length - 60) + ' more.' : ents.join(', ') + '.') + ' Each is told in the rule’s Access window on the Domain model.', fix, ents);
      };
      cleanup('access-unused', use.unused || [], 'entities a role holds a rule on and never uses',
        'Nothing the role reaches shows, reads, takes or returns them (a Java action or a published OData service, which MxScout does not follow, may):',
        'Take the rule off the module role, unless a Java action or a published service needs it.');
      var unw = {}, rest = [];
      (use.unwritten || []).forEach(function (u) {
        if (admins[u.userRole]) return;
        var e = ix.ent[u.entity];
        if (e && e.persistable === false) return;
        if ((u.openWrite || []).length) {
          var x = unw[u.entity] = unw[u.entity] || { members: [], roles: [] };
          u.openWrite.forEach(function (m) { if (x.members.indexOf(m) === -1) x.members.push(m); });
          if (x.roles.indexOf(u.userRole) === -1) x.roles.push(u.userRole);
        }
        if ((u.attributes || []).length > (u.openWrite || []).length || u.create || u.del) rest.push(u);
      });
      Object.keys(unw).sort().forEach(function (q) {
        var x = unw[q], who = list(quoted(x.roles.sort()));
        add('access-unwritten', q, 'lead', null, 'access', who + ' may write ' + q + ' (' + x.members.slice(0, 4).join(', ') + (x.members.length > 4 ? '…' : '') + ') on every row, and nothing ' + (x.roles.length > 1 ? 'they reach' : 'it reaches') + ' does',
          who + ' may write ' + list(x.members.sort().slice(0, 10)) + (x.members.length > 10 ? ' and more' : '') + ' on ' + q + ' through a rule that does not keep it to the own rows, and no input on their pages, no flow that runs with their rights writes it: the right is only a way in.',
          'Take the unused write rights off the rule.', [q], null, { facts: [who + ': write, no own-rows XPath, nothing writes it.'], rank: 3 });
      });
      cleanup('access-unwritten', rest, 'entities a role may write, create or delete only on its own rows, or create or delete, and nothing it reaches does',
        'No input on its pages, no New or Delete button, no flow that runs with its rights:', 'Take the unused write, create and delete rights off the rule.');
      var quiet = [];
      (use.cannotDo || []).forEach(function (f) {
        var bad = f.items.filter(function (i) { return i.what !== 'read'; });
        if (!bad.length) { quiet.push(f); return; }
        add('access-fails', f.flow, 'quality', null, 'logic', 'Fails for a role that may run it: ' + f.flow,
          bad.map(function (i) { return (f.kind === 'nanoflow' ? 'Nanoflow ' : 'Microflow ') + f.flow + ' ' + (WHAT[i.what] || i.what) + ' ' + i.entity + (i.members ? ' (' + i.members.join(', ') + ')' : '') + ' for ' + (i.userRoles || []).join(', ') + ' without the right'; }).join('; ') + ', so it fails for them.',
          'Give the roles that may run ' + f.flow + ' the access it needs, or stop offering it to them.', [f.flow].concat(uniq(bad.map(function (i) { return i.entity; }))), null, { flow: f.flow, items: bad });
      });
      quiet.forEach(function (f) {
        add('access-finds-nothing', f.flow, 'quality', null, 'logic', 'Finds nothing for a role that may run it: ' + f.flow,
          (f.kind === 'nanoflow' ? 'Nanoflow ' : 'Microflow ') + f.flow + ' reads ' + list(uniq(f.items.map(function (i) { return i.entity; }))) + ', which ' + list(uniq([].concat.apply([], f.items.map(function (i) { return i.userRoles || []; })))) + ' may not read, so it finds nothing for them.',
          'Give the role read access, or stop offering the flow to it.', [f.flow].concat(uniq(f.items.map(function (i) { return i.entity; }))));
      });
      // "Does for a role what its own rules do not allow" (access-past) is NOT a risk any more (rules 5): on the
      // reviewed application it listed 284 microflows, of which about nine in ten were wizards, helper entities or
      // administrators only — a microflow IS the controlled way to let a role do something. What mattered in that
      // list is now guard-escalation, which weighs each step against the calling role's own rules and says which
      // of them really reaches past them. accessuse.js still works it out, and MxScout Dev still shows it.

      // The row filter a child did not inherit: one risk per entity, with the roles and the parent's XPath.
      var child = {};
      (use.notInherited || []).forEach(function (i) {
        if (admins[i.userRole]) return;
        var c = child[i.entity] = child[i.entity] || { entity: i.entity, parents: [], roles: [], xpaths: [], sensitive: i.sensitive || null, cascade: [], via: [] };
        // Rules 6 (C7): the parents whose delete takes the child with it come first; a reference without it is a lead.
        if (i.cascade === true && c.cascade.indexOf(i.parent) === -1) { c.cascade.push(i.parent); c.via.push(i.association); }
        if (c.parents.indexOf(i.parent) === -1) c.parents.push(i.parent);
        if (c.roles.indexOf(i.userRole) === -1) c.roles.push(i.userRole);
        c.xpaths = uniq(c.xpaths.concat(i.parentXPaths || []));
        if (!c.sensitive && i.sensitive) c.sensitive = i.sensitive;
      });
      Object.keys(child).sort().forEach(function (k) {
        var c = child[k], who = list(c.roles.sort().map(function (x) { return '"' + x + '"'; })), parent = (c.cascade.length ? c.cascade.slice() : c.parents).sort()[0];
        var evidence = ['Every rule ' + who + ' hold' + (c.roles.length > 1 ? '' : 's') + ' on ' + parent + ' has an XPath (' + c.xpaths.slice(0, 2).join(' | ') + '); no rule of theirs on ' + c.entity + ' has one.'];
        if (c.cascade.length) evidence.push('Deleting a ' + shortQn(parent) + ' deletes its ' + shortQn(c.entity) + ' objects too (' + c.via[c.cascade.indexOf(parent)] + '): the child belongs to it.');
        else evidence.push('Nothing in the model says a ' + shortQn(c.entity) + ' belongs to its ' + shortQn(parent) + ': the association does not delete it with the parent, so it may only point at it.');
        if (c.sensitive) evidence.push('And ' + shortQn(c.entity) + ': ' + c.sensitive + '.');
        // A finding (P2, never P1 by itself) only when the parent's delete removes the child, directly or through
        // one more such association; otherwise a lead for the skill (rules 6, C7).
        add('access-not-inherited', c.entity, c.cascade.length ? 'finding' : 'lead', 'P2', 'access',
          c.entity + ' is read in full while ' + parent + ' is kept to the role’s own rows',
          who + ' read every row of ' + c.entity + ' — the rule has no XPath — while every rule they hold on ' + parent +
          ', which it belongs to, keeps the rows to their own (' + c.xpaths.slice(0, 2).join(' | ') + '). The row filter stops at the parent, so everything hanging off somebody else’s ' +
          shortQn(parent) + ' is open: the same data, one association away.' + (c.sensitive ? ' And ' + shortQn(c.entity) + ': ' + c.sensitive + '.' : '') +
          '\nScenario: ' + who + ' may fetch every ' + shortQn(c.entity) + ' in the database and read, through it, what ' + shortQn(parent) + ' keeps from them.' +
          '\nEffect: ' + (c.sensitive ? 'Files and values of other people’s records are readable.' : 'Rows of other people’s records are readable.') +
          '\nEvidence: ' + evidence.join(' '),
          'Give the rule on ' + c.entity + ' an XPath that follows the association to ' + parent + ' and repeats its constraint, so the child is as narrow as its parent.',
          [c.entity, parent], null, { confidence: 'confirmed', evidence: evidence, rank: c.sensitive ? 1 : 2,
            scenario: who + ' may fetch every ' + shortQn(c.entity) + ' in the database and read, through it, what ' + shortQn(parent) + ' keeps from them.',
            impact: c.sensitive ? 'Files and values of other people’s records are readable.' : 'Rows of other people’s records are readable.' });
      });
    }

    // Attributes whose NAME says they hold a secret, readable by somebody who does not administer the application.
    secretAttributes(model, admins).forEach(function (a) {
      var who = list(a.readers.map(function (x) { return '"' + x + '"'; }));
      var openWho = list(a.open.map(function (x) { return '"' + x + '"'; }));
      var evidence = [a.entity + '.' + a.attribute + ' is ' + (a.type === 'String' ? 'a String' : 'a ' + a.type) + ' attribute, and ' + who + ' may read it' +
        (a.open.length ? ' on every row (' + openWho + ': no XPath)' : ' on the rows its XPath allows') + '.'];
      if (a.writers.length) evidence.push(list(a.writers.map(function (x) { return '"' + x + '"'; })) + ' may write it too.');
      if (a.plain) evidence.push('No flow that writes it calls anything that encrypts or hashes: what is stored is what was typed.');
      // Rules 6 (C10.5): a lead, with what the writers do to the value — the skill proves whether it is a secret.
      var treat = a.hashed ? 'it is a hashed string' : !a.writtenBy ? 'nothing in this model writes it' : a.plain ? 'the flows that write it store it as typed' : 'a flow that writes it encrypts or hashes it';
      evidence.push('What the writers do to the value: ' + treat + '.');
      add('secret-attribute', a.entity + ' ' + a.attribute, 'lead', null, 'secrets',
        a.entity + '.' + a.attribute + ' is readable by ' + (a.readers.length > 2 ? a.readers.length + ' user roles' : who),
        'The name of ' + a.entity + '.' + a.attribute + ' says it holds a secret, and ' + who + ' may read it' +
        (a.open.length ? ' on every row: the rule for ' + openWho + ' has no XPath, so the client may fetch the lot.' : ', within what the rule’s XPath allows.') +
        (a.plain ? ' Nothing that writes it encrypts or hashes it, so the value is stored as it was typed.' : '') +
        ' A name is only a hint about what an attribute holds; what makes this a finding is who may read it.' +
        '\nScenario: a user who has only ' + (a.readers[0] ? '"' + a.readers[0] + '"' : 'that role') + ' fetches ' + shortQn(a.entity) + ' from the client and reads ' + a.attribute + '.' +
        '\nEffect: a credential belonging to the application, or to somebody else, is readable by whoever holds the role.' +
        '\nEvidence: ' + evidence.join(' '),
        'Take read access to ' + a.attribute + ' off the rule' + (a.readers.length > 1 ? 's' : '') + ' that give' + (a.readers.length > 1 ? '' : 's') +
        ' it, and read the value only in a microflow on the server' + (a.plain ? '; store a hash (HMAC) where it is only ever compared, and encrypt it where it has to be read back' : '') + '.',
        [a.entity], null, { confidence: 'confirmed', evidence: evidence, rank: a.open.length ? 1 : 2,
          scenario: 'A user who has only ' + (a.readers[0] ? '"' + a.readers[0] + '"' : 'that role') + ' fetches ' + shortQn(a.entity) + ' from the client and reads ' + a.attribute + '.',
          impact: 'A credential belonging to the application, or to somebody else, is readable by whoever holds the role.' });
    });

    // N1 (rules 6): a role may write the association its own access is scoped by — it can make itself the owner of
    // anybody's rows. One finding per entity and association, the user roles as places.
    if (W.MxAccessUse && W.MxAccessUse.selfGrants) {
      var sg = {};
      W.MxAccessUse.selfGrants(model, admins).forEach(function (x) {
        var k = x.entity + ' ' + x.association, o = sg[k] = sg[k] || { entity: x.entity, association: x.association, roles: [], moduleRoles: [], scopes: [], account: x.account !== false, farEnd: x.farEnd || null };
        x.userRoles.forEach(function (u) { if (o.roles.indexOf(u) === -1) o.roles.push(u); });
        if (o.moduleRoles.indexOf(x.moduleRole) === -1) o.moduleRoles.push(x.moduleRole);
        x.scopes.forEach(function (e) { if (o.scopes.indexOf(e) === -1) o.scopes.push(e); });
      });
      Object.keys(sg).sort().forEach(function (k) {
        var o = sg[k], who = list(quoted(o.roles.sort()));
        var ev = ['The rule for ' + list(o.moduleRoles) + ' on ' + o.entity + ' gives write on ' + o.association + ' with no XPath that keeps it to the own rows.',
          'The access rules of ' + list(o.scopes.slice(0, 4)) + ' keep rows to the signed-in user by ' + o.association + ', and ' + who + ' hold' + (o.roles.length > 1 ? '' : 's') + ' such a rule.'];
        // Round 2: a finding only when the association ends at an account (System.User or a specialisation): the role
        // names itself or another account the owner directly. Ending anywhere else, the step to the owner runs through
        // that other entity, which the model alone does not settle: a lead, and no "sets it to their own account".
        if (!o.account) {
          ev.push(o.association + ' ends at ' + (o.farEnd || 'another entity') + ', not at an account: whether setting it reaches other people’s rows depends on who may change ' + (o.farEnd || 'that entity') + '.');
          add('access-self-grant', o.entity + ' ' + o.association, 'lead', null, 'access',
            who + ' may set ' + o.association + ', which ' + list(o.scopes.slice(0, 2)) + ' is scoped by',
            who + ' may write the association ' + o.association + ' on any ' + o.entity + ' (the rule for ' + list(o.moduleRoles) + ' has no own-rows XPath), and ' + (o.roles.length > 1 ? 'their' : 'its') + ' rules on ' + list(o.scopes.slice(0, 4)) +
              ' keep rows to the signed-in user through that association. It ends at ' + (o.farEnd || 'another entity') + ', not at an account, so whether pointing it elsewhere opens other people’s rows depends on ' + (o.farEnd || 'that entity') + '.',
            'Check who may create or change ' + (o.farEnd || 'the far entity') + ' and point ' + o.association + ' at it; if a role can reach others’ rows that way, take write on ' + o.association + ' off the rule for ' + list(o.moduleRoles) + '.',
            [o.entity].concat(o.farEnd ? [o.farEnd] : [], o.scopes.slice(0, 6)), null, { evidence: ev });
          return;
        }
        add('access-self-grant', o.entity + ' ' + o.association, 'finding', 'P2', 'access', who + ' may set ' + o.association + ', which ' + (o.roles.length > 1 ? 'their' : 'its') + ' own access to ' + list(o.scopes.slice(0, 2)) + ' is scoped by',
          who + ' may write the association ' + o.association + ' on any ' + o.entity + ' (the rule for ' + list(o.moduleRoles) + ' has no own-rows XPath), and ' + (o.roles.length > 1 ? 'their' : 'its') + ' rules on ' + list(o.scopes.slice(0, 4)) +
            ' keep rows to the signed-in user by that very association: ' + (o.roles.length > 1 ? 'they' : 'it') + ' can make ' + (o.roles.length > 1 ? 'themselves' : 'itself') + ' the owner of anybody’s rows.' +
            '\nScenario: a user who has only ' + quoted(o.roles)[0] + ' sets ' + o.association + ' to their own account from the client, then reads and changes what ' + list(o.scopes.slice(0, 2)) + ' keeps to its owner.' +
            '\nEffect: other people’s rows become the caller’s.\nEvidence: ' + ev.join(' '),
          'Take write on ' + o.association + ' off the rule for ' + list(o.moduleRoles) + ', or keep that rule to the own rows; set the association in a microflow that checks who may.',
          [o.entity].concat(o.scopes.slice(0, 6)), null, { confidence: 'confirmed', evidence: ev, scenario: 'A user who has only ' + quoted(o.roles)[0] + ' sets ' + o.association + ' to their own account from the client.', impact: 'Other people’s rows become the caller’s.' });
      });
    }

    // The administrators themselves (Karol, 2026-11-15: "the MxAdmin role and the other administrator roles must stay
    // a risk, one risk, saying how much they reach"). Every other check leaves the application's administrators out —
    // they are meant to reach everything — so this is the one place their reach is said: one risk for the project,
    // P2, naming each administrator role, why it counts as one, and what it may do with no XPath. Not a defect to fix
    // in the model so much as an exposure to keep small: who holds these roles, and whether every module role in
    // them is needed.
    (function () {
      var names = Object.keys(admins).sort();
      if (!names.length) return;
      var mods = {}, rows = [];
      names.forEach(function (n) {
        var u = (model.userRoles || []).filter(function (x) { return x && x.name === n; })[0];
        if (!u) return;
        var mr = {};
        (u.moduleRoles || []).forEach(function (m) { mr[m] = true; mods[String(m).split('.')[0]] = true; });
        var readAll = 0, writeAll = 0, delAll = 0, ents = 0;
        (model.entities || []).forEach(function (e) {
          if (!e || e.persistable === false) return;
          var rs = (e.accessRules || []).filter(function (r) { return r && mr[r.moduleRole] && !r.xpathConstraint; });
          if (!rs.length) return;
          ents++;
          if (rs.some(function (r) { return r.defaultAccess === 'r' || r.defaultAccess === 'rw' || Object.keys(r.attrAccess || {}).some(function (k) { return r.attrAccess[k] !== 'none'; }); })) readAll++;
          if (rs.some(function (r) { return r.defaultAccess === 'rw' || Object.keys(r.attrAccess || {}).some(function (k) { return r.attrAccess[k] === 'rw'; }); })) writeAll++;
          if (rs.some(function (r) { return r.allowDelete; })) delAll++;
        });
        rows.push({ role: n, why: admins[n], modules: Object.keys(mr).length, all: !!u.manageAllRoles, readAll: readAll, writeAll: writeAll, delAll: delAll });
      });
      if (!rows.length) return;
      var who = list(quoted(rows.map(function (r) { return r.role; })));
      var lines = rows.map(function (r) {
        return '"' + r.role + '" ' + r.why + '; it holds ' + r.modules + ' module role' + (r.modules === 1 ? '' : 's') + ' and, with no XPath, reads every row of ' + r.readAll + ' entit' + (r.readAll === 1 ? 'y' : 'ies') +
          ', changes them on ' + r.writeAll + ' and deletes on ' + r.delAll + (r.all ? ', and may give anybody any user role' : '') + '.';
      });
      // Not the built-in administrator account or its password: only a local run from Studio Pro uses the model's
      // password, every other environment sets its own (Karol, 2026-10-15) — the risk is the ROLES' reach.
      var acct = '';
      var ev = lines.slice();
      add('admin-wide-access', 'project', 'finding', 'P2', 'access', 'Administrator roles reach almost everything: ' + who,
        lines.join(' ') + acct + ' The other checks leave administrators out because this reach is what they are for — which is exactly why it is said once here: whoever signs in with one of these roles, or takes over such an account, reads, changes and deletes almost all the application\u2019s data and hands out every role.' +
          '\nEffect: one administrator account taken over is the whole application.\nEvidence: ' + ev.join(' '),
        'Keep these roles to the few people who administer the application, and review who holds them on every release. Take module roles off an administrator role that it does not need (a module\u2019s own administration it never opens), and give day-to-day work a narrower role.',
        rows.map(function (r) { return r.role; }), null,
        { confidence: 'confirmed', evidence: ev, scenario: 'Somebody signs in with an administrator role, or takes over an account that has one.', impact: 'Almost all the application\u2019s data can be read, changed and deleted, and every role handed out.' });
    })();

    // Constants the browser receives that look like a secret: the risks constants.js gives, with their key.
    if (W.MxConstants) {
      var c = W.MxConstants.of(model);
      // The id follows the key ('m:secrets:<what>'), so the security list and the model's own findings name the same
      // risk once (C11): one risk for the secret-named constants with a value in the model, and one per constant the
      // browser receives. A name that is itself a key is masked in both (constants.js shown). The notes are not risks.
      (c.risks || []).forEach(function (r) {
        add('secret-constant', String(r.key || '').replace(/^m:secrets:/, '') || r.title, r.lead ? 'lead' : 'finding', r.level, 'secrets', r.title.replace(/^To verify: /, ''), r.detail, r.fix, r.where, r.key,
          { confidence: r.confidence, doubts: r.doubts || [], evidence: r.evidence || [], key: r.key });
      });
    }

    // Known advisories for this Mendix version and these Marketplace modules: worth knowing, never a finding.
    if (W.MxAdvisories) {
      var a = W.MxAdvisories.of(model);
      a.matches.forEach(function (m) { add('advisory', m.cve + ' ' + m.name, 'note', 'P3', 'access', m.cve + ' in ' + m.name + ' ' + m.version, m.text + (m.note ? ' ' + m.note : '') + ' ' + m.link, m.fixText, []); });
      a.notChecked.forEach(function (n) { notChecked.push({ check: 'advisory', text: n.text, where: [] }); });
    }

    // Marketplace modules (marketplace.js): an administrative module role on a user role that is not the application's
    // administrator is a finding — a role mapping in App Security, so P2 like the other settings; what nothing uses is worth knowing.
    if (W.MxMarketplace) {
      var mk = W.MxMarketplace.of(model);
      mk.findings.forEach(function (f) {
        add('market-admin', f.moduleRole + ' ' + f.userRole, 'lead', null, 'access', 'Administrative role of ' + f.module + ' on "' + f.userRole + '": ' + f.moduleRole, weighed(f.text, f), f.fix, [f.moduleRole], null, f);
      });
      // A module role that grants NOTHING is not a risk (rules 5): it opens no page, no flow and no entity, so
      // nobody holding it may do anything with it — the module's own catalogue says so. marketplace.js still says
      // it, on the module's own card, where it belongs.
      mk.notes.filter(function (n) { return n.kind === 'unused-module'; }).forEach(function (n) {
        add('market-unused', n.module, 'cleanup', null, 'access', 'Marketplace module ' + n.module + ' is installed and not used', n.text, n.fix, [n.module], null, n);
      });
    }

    // Rules MxScout could not follow (accessrule.js): not checked, said so.
    if (W.MxAccessRule && W.MxAccessRule.unfollowed) W.MxAccessRule.unfollowed(model).forEach(function (u) {
      notChecked.push({ check: 'access-rule', text: u.qualifiedName + ' — the rule for ' + u.moduleRole + ': ' + u.label, where: [u.qualifiedName] });
    });

    // Leads first by their rank (a lower number first), then by id; the risks keep the order of the checks.
    leads.sort(function (a, b) { return ((a.rank === undefined ? 9 : a.rank) - (b.rank === undefined ? 9 : b.rank)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    var counts = { risks: risks.length, findings: 0, suspects: 0, notes: 0, P1: 0, P2: 0, P3: 0, byCheck: {}, leads: leads.length, leadsByCheck: {}, other: other.length, quality: 0, cleanup: 0 };
    risks.forEach(function (r) {
      counts[r.register === 'finding' ? 'findings' : 'notes']++;
      counts[r.level]++;
      counts.byCheck[r.check] = (counts.byCheck[r.check] || 0) + 1;
    });
    leads.forEach(function (l) { counts.leadsByCheck[l.check] = (counts.leadsByCheck[l.check] || 0) + 1; });
    other.forEach(function (o) { counts[o.list]++; });
    counts.setAside = setAside.length;
    return { risks: risks, leads: leads, other: other, notChecked: notChecked, setAside: setAside, counts: counts, rules: RULES };
  }

  // ---------- unchecked: what this model cannot say either way ----------
  // A risk not seen is not a risk gone when the model lacks what its check reads: the constants not read, a
  // flow without its drawing, pages without their structure, no security settings, no user roles. Then what
  // was decided about it stays as it was — never verified, never "no longer reported".
  // ids: the risks known before (decided, kept). → { id: why }
  function checkOf(id) {
    var best = null;
    Object.keys(CHECKS).forEach(function (k) { if ((id === 'mx-' + k || id.indexOf('mx-' + k + '-') === 0) && (!best || k.length > best.length)) best = k; });
    return best;
  }
  function unchecked(model, ids) {
    model = model || {};
    var W = typeof window !== 'undefined' ? window : {}, now = {}, out = {};
    var res = of(model);
    res.risks.forEach(function (r) { now[r.id] = true; });
    // A lead or an item of another list is seen in this model: it is not "not checked", it moved (withdrawn says so).
    (res.leads || []).concat(res.other || []).forEach(function (r) { now[r.id] = true; });
    var flows = (model.microflows || []).concat(model.nanoflows || []), byId = {};
    flows.forEach(function (f) { if (f && f.qualifiedName) ['guard-page-hides', 'guard-bypass-xpath', 'guard-same-entity'].forEach(function (k) { byId[riskId(k, f.qualifiedName)] = f; }); });
    var drawn = function (f) { return !!(f && f.graph && f.graph.nodes && f.graph.nodes.length); };
    var anyGraph = flows.some(drawn), anyActivity = flows.some(function (f) { return f && f.activity; });
    var anyStructure = (model.pages || []).some(function (p) { return p && p.structure; });
    var roles = (model.userRoles || []).length > 0;
    var consts = W.MxConstants && W.MxConstants.unchecked ? W.MxConstants.unchecked(model) : { all: !(model.constants || []).length, keys: {} };
    var advisory = res.notChecked.filter(function (n) { return n.check === 'advisory'; }).map(function (n) { return n.text; })[0] || null;
    (ids || []).forEach(function (id) {
      if (!id || now[id] || out[id]) return;
      var check = checkOf(id), why = null;
      if (!check) return;
      if (/^(secret-constant|constant-note)$/.test(check)) {
        if (consts.all) why = 'the constants were not read from this model';
        else Object.keys(consts.keys).forEach(function (k) { if (!why && riskId(check, k.slice(10)) === id) why = k.slice(10) + ': ' + consts.keys[k]; });
      } else if (/^guard-/.test(check)) {
        if (!anyGraph) why = 'this model carries no microflow drawings';
        else if (byId[id] && !drawn(byId[id])) why = byId[id].qualifiedName + ' has no drawing in this model';
        else if (check === 'guard-page-hides' && !anyStructure) why = 'this model carries no page structure';
      } else if (/^scope-/.test(check)) {
        if (!anyStructure) why = 'this model carries no page structure';
        else if (!roles) why = 'this model carries no user roles';
      } else if (/^access-/.test(check)) {
        if (!anyActivity) why = 'this model carries no flow activity';
      } else if (/^(security-level|demo-password|strict-mode-off|page-url-check|anon|demo-admin)$/.test(check)) {
        if (!model.security) why = 'the security settings were not read from this model';
      } else if (/^(role-no-module-role|role-manages-all|admin-wide-access|role-manages-no-pages|services-many-modules|accounts|selfreg|market-admin|market-role-unused)$/.test(check)) {
        if (!roles) why = 'this model carries no user roles';
      } else if (check === 'advisory' && advisory) why = advisory;
      if (why) out[id] = 'not checked this time — ' + why + '; kept as it was';
    });
    return out;
  }

  // ---------- withdrawn: what the rules before gave and these do not ----------
  // The ids rules 1 gave on this very model that rules 2 do not: only the state's name read differently
  // (namedState in guards.js) can take a risk away — everything else these rules weigh keeps its id and is
  // only ranked differently (to verify). Worked out by running the checks it touches once more, the old way.
  // → { id: why }
  var gone = typeof WeakMap === 'function' ? new WeakMap() : null;
  var CAUSE = {
    names: 'an attribute whose name only contains Status, State or Phase inside another word is no longer read as a state',
    helpers: 'a helper microflow that stops with an error event when its decision on the object says no now counts as the check',
    creates: 'a “Create list” is no longer counted as creating an object',
    roles: 'a flow is no longer counted for a role that may not call it, or that sees nothing which runs it; a non-persistable entity needs no create or delete right; and an entity this model does not carry says nothing about a missing one',
    rules6: 'what a check suspects and the model does not prove is a lead for the risk skill, not a risk; performance, code quality, personal data and cleanup are lists of their own; and the checks are narrowed to what the review of a real application found real (rules 6)',
    rules5: 'a microflow is weighed against the calling role’s own access rules instead of against the page, and nothing is said about a role that administers the application, a non-persistable entity’s create and delete rights, a wizard’s helper form, a toggle’s own icon, a decision that cannot come out both ways, or “does for a role what its rules do not allow”'
  };
  // The two checks rules 5 stopped giving ALTOGETHER: an id of either is withdrawn by the rules, always — the
  // application cannot have fixed what MxScout no longer asks. The checks rules 5 only NARROWED keep the reading
  // above, which runs them the old way and says which change took the risk away.
  // 'constant-note': a secret-looking default value is a finding now, under the secret-constant id, so the note's
  // own id is gone — taken by the rules, not by the model.
  var NARROWED = { 'access-past': 1, 'market-role-unused': 1, 'constant-note': 1 };
  // The checks rules 6 changed (rule-changes C1–C17): narrowed, re-keyed (one risk per entity or flow instead of one
  // for the model, a masked constant name), moved to a lead or to a list that is not risks, or switched off
  // (guard-same-entity). A risk of one of them that these rules no longer give is withdrawn by the rules, never read
  // as a fix — the reading cannot tell it from a fix in the model, so it says the rules, which is the safe side.
  var NARROWED6 = { 'guard-escalation': 1, 'guard-page-hides': 1, 'guard-role-wider': 1, 'guard-same-entity': 1, 'service-op-unscoped': 1, 'logic-note': 1,
    'access-not-inherited': 1, 'accounts': 1, 'secret-attribute': 1, 'secret-constant': 1, 'scope-write': 1, 'scope-delete': 1, 'scope-note': 1,
    'access-wider': 1, 'access-unused': 1, 'access-unwritten': 1, 'access-fails': 1, 'access-finds-nothing': 1, 'market-admin': 1, 'market-unused': 1 };
  // `ids`: the risks known before (decided, kept), when the caller has them — part() does.
  function withdrawn(model, ids) {
    model = model || {};
    var base = gone && gone.get(model);
    if (base) return withIds(model, base, ids);
    var W = typeof window !== 'undefined' ? window : {}, now = {}, out = {};
    var res = of(model);
    res.risks.forEach(function (r) { now[r.id] = true; });
    var why = function (cause) { return 'withdrawn by a change in MxScout’s rules (rules ' + RULES + '): ' + CAUSE[cause] + ' — the model did not change'; };
    if (W.MxGuards && W.MxEditScope && W.MxAccessUse) {
      var legacyUse = W.MxAccessUse.analyse(model, { legacy: true });
      var guardIds = function (opts) {
        var ids = {};
        W.MxGuards.analyse(model, Object.assign({ stateUse: W.MxEditScope.stateUse(model, { legacyNames: !!opts.legacyNames }) }, opts)).findings
          .filter(function (f) { return f.kind === 'page-hides' || f.kind === 'bypass-xpath'; })
          .forEach(function (f) { ids[riskId(f.kind === 'page-hides' ? 'guard-page-hides' : 'guard-bypass-xpath', f.flow)] = true; });
        return ids;
      };
      var before = guardIds({ legacyNames: true, legacyHelpers: true }), helpersOnly = null, namesOnly = null;
      Object.keys(before).forEach(function (id) {
        if (now[id]) return;
        helpersOnly = helpersOnly || guardIds({ legacyHelpers: true });
        namesOnly = namesOnly || guardIds({ legacyNames: true });
        // Neither of those two readings brings it back: what took it away is rules 5 itself.
        out[id] = why(!helpersOnly[id] && !namesOnly[id] ? 'rules5' : helpersOnly[id] ? 'helpers' : 'names');
      });
      var scopeNow = {};
      W.MxEditScope.analyse(model, null).findings.forEach(function (f) { scopeNow[riskId(f.kind === 'delete' ? 'scope-delete' : 'scope-write', f.entity)] = true; });
      W.MxEditScope.analyse(model, legacyUse, { legacyNames: true }).findings.forEach(function (f) {
        var id = riskId(f.kind === 'delete' ? 'scope-delete' : 'scope-write', f.entity);
        if (!now[id]) out[id] = why(scopeNow[id] ? 'names' : 'rules5');
      });
      var createsOnly = null;
      (legacyUse.cannotDo || []).forEach(function (f) {
        if (!f.items.some(function (i) { return i.what !== 'read'; })) return;
        var id = riskId('access-fails', f.flow);
        if (now[id]) return;
        // Which change took it away: the creates read again alone, or the roles.
        if (!createsOnly) {
          createsOnly = {};
          var m2 = W.MxAccessUse.analyse(model, { legacyCreatesOnly: true });
          (m2.cannotDo || []).forEach(function (x) { if (x.items.some(function (i) { return i.what !== 'read'; })) createsOnly[riskId('access-fails', x.flow)] = true; });
        }
        out[id] = why(createsOnly[id] ? 'creates' : 'roles');
      });
    }

    // Set aside in a Marketplace module (rules 4): said why, whichever rules gave it before.
    (res.setAside || []).forEach(function (x) { out[x.id] = 'withdrawn by a change in MxScout’s rules (rules ' + RULES + '): set aside — ' + x.why + ' — the model did not change'; });
    // Rules 6: the same id is now a lead, or on a list that is not risks — the rules moved it, the model did not change.
    var moved = function (what) { return 'withdrawn by a change in MxScout’s rules (rules ' + RULES + '): now ' + what + ' — the model did not change'; };
    (res.leads || []).forEach(function (l) { if (!now[l.id]) out[l.id] = moved('a lead for the risk skill to confirm or drop, not a risk'); });
    (res.other || []).forEach(function (o) { if (!now[o.id]) out[o.id] = moved(o.list === 'quality' ? 'on the code quality list, not a risk' : 'on the cleanup list, not a risk'); });
    if (gone) gone.set(model, out);
    return withIds(model, out, ids);
  }
  // The ids the caller knew before, on top of what the runs above worked out: whatever rules 5 narrowed and the
  // model no longer shows. Kept out of the cache, since it depends on what the caller knew.
  function withIds(model, base, ids) {
    if (!ids || !ids.length) return base;
    var now = {}, out = {};
    of(model).risks.forEach(function (r) { now[r.id] = true; });
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    ids.forEach(function (id) {
      if (!id || now[id] || out[id]) return;
      var c = checkOf(id);
      if (c && NARROWED[c]) out[id] = 'withdrawn by a change in MxScout’s rules (rules ' + RULES + '): ' + CAUSE.rules5 + ' — the model did not change';
      else if (c && NARROWED6[c]) out[id] = 'withdrawn by a change in MxScout’s rules (rules ' + RULES + '): ' + CAUSE.rules6 + ' — the model did not change';
    });
    return out;
  }

  // Once per model: the Security screen asks on every draw.
  var kept = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    var hit = kept && kept.get(model);
    if (!hit) { hit = check(model); if (kept) kept.set(model, hit); }
    return hit;
  }

  // ---------- a decision on a lead (rules 6, round 2) ----------
  // The risk skill confirms or drops every lead: { id, verdict: confirmed | dropped | undecided, reason, risk? } — a
  // dropped lead is the agent's verdict, never a person's "false positive", and is kept apart from triage. Each lead
  // carries `hash`: what it said (its detail) and the rules number, so a decision that keeps the hash it was made on
  // shows as `stale` once the lead changed (the model, or the rules) and the lead is read again. The same 64-bit
  // hash (two 32-bit halves, hex) on the Team server (team-projects.js) and in files (check-security.js --decisions);
  // it tells versions apart, it protects nothing.
  var VERDICTS = ['confirmed', 'dropped', 'undecided'];
  function leadHash(lead, rules) {
    var s = String((lead && lead.detail) || '') + '\n' + String(rules == null ? RULES : rules);
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var hex = function (n) { return ('0000000' + (n >>> 0).toString(16)).slice(-8); };
    return hex(h2) + hex(h1);
  }
  // Marks each lead (in place) with its `decision` { verdict, reason, risk, by, at } and `stale: true` when the
  // decision's hash is not the lead's now. decisions: a list, { items: list } or { id: decision }. → the counts:
  // { total, open, confirmed, dropped, undecided, stale } — open is a lead with no decision, an undecided one or a
  // stale one; confirmed and dropped count only decisions that still hold.
  function markLeads(leads, decisions, rules) {
    var by = {}, list = Array.isArray(decisions) ? decisions : decisions && Array.isArray(decisions.items) ? decisions.items : null;
    if (list) list.forEach(function (d) { if (d && typeof d.id === 'string') by[d.id] = d; });
    else if (decisions && typeof decisions === 'object') Object.keys(decisions).forEach(function (k) { if (decisions[k] && typeof decisions[k] === 'object') by[k] = Object.assign({ id: k }, decisions[k]); });
    var c = { total: 0, open: 0, confirmed: 0, dropped: 0, undecided: 0, stale: 0 };
    (leads || []).forEach(function (l) {
      c.total++;
      if (!l.hash) l.hash = leadHash(l, rules);
      var d = by[l.id];
      if (!d || VERDICTS.indexOf(d.verdict) === -1) { c.open++; return; }
      var o = { verdict: d.verdict, reason: d.reason ? cut(str(d.reason), 300) : null };
      if (d.risk) o.risk = cut(str(d.risk), 120);
      if (d.by) o.by = cut(str(d.by), 120);
      if (d.at) o.at = cut(str(d.at), 40);
      l.decision = o;
      if (d.hash && d.hash !== l.hash) { l.stale = true; c.stale++; c.open++; return; }
      if (d.verdict === 'undecided') { c.undecided++; c.open++; return; }
      c[d.verdict]++;
    });
    return c;
  }

  // ---------- the risks as a part of the descriptions (descriptions-format.md, risks v1) ----------
  // opts.decided: what was decided about risks (triage.json's `triage`), or null; opts.kept: the risks the
  // descriptions hold now (their `risks`), or null. Each of these checks' risks that the model no longer shows —
  // marked fixed, or still counted — gets a `verify` saying so: MxScout marks the first verified and stops
  // counting the second; one marked fixed that the model still shows gets { still: true }, and MxScout reopens it.
  // One marked a false positive, or settled already, is left alone. opts.fixed: { id: what was done } — see below.
  // → { format, version, add: true, by, written, risks: [...], verify?: [{ id, still, why, fixed? }] }
  function part(model, opts) {
    opts = opts || {};
    var res = of(model), now = {};
    res.risks.forEach(function (r) { now[r.id] = true; });
    var out = { format: 'mxscout-descriptions', version: 1, add: true, by: 'MxScout security check', rules: RULES, written: opts.written || null,
      risks: res.risks.map(function (r) { return { id: r.id, level: r.level, theme: r.theme, title: r.title, detail: r.detail, fix: r.fix, where: r.where, test: r.test, repair: r.repair }; }) };
    // The leads (rules 6, C0), apart from the risks: MxScout's import reads only `risks`, so a lead is never stored or
    // counted as one; the risk skill reads them here, confirms or drops each, and writes a confirmed one as a risk
    // with the lead's id in `from`.
    // Each lead carries its hash; with opts.decisions (the skill's own decisions, check-security.js --decisions) each
    // also carries its decision and `stale`, and leadsCounts says how many are open, confirmed and dropped.
    if (res.leads.length) out.leads = res.leads.map(function (l) { var o = { id: l.id, check: l.check, theme: l.theme, title: l.title, detail: l.detail, fix: l.fix, where: l.where }; if (l.facts) o.facts = l.facts; if (l.doubts) o.doubts = l.doubts; o.hash = leadHash(o, RULES); return o; });
    if (opts.decisions) out.leadsCounts = markLeads(out.leads || [], opts.decisions, RULES);
    if (opts.project) out.project = opts.project;
    var status = {}, ids = [];
    var E = (opts.decided && opts.decided.risks) || {};
    Object.keys(E).sort().forEach(function (k) { var id = idOf(E[k]); if (id && !(id in status)) { status[id] = E[k].status; ids.push(id); } });
    ((opts.kept && Array.isArray(opts.kept)) ? opts.kept : []).forEach(function (r) {
      var id = r && typeof r.id === 'string' ? idOf({ risk: { id: r.id } }) : null;
      if (id && !(id in status)) { status[id] = 'open'; ids.push(id); }
    });
    // Withdrawn by the rules, not by the model: said so, and never a fix (triage.js, review.js).
    var missing = ids.some(function (id) { return !now[id]; }) || Object.keys(opts.fixed || {}).some(function (id) { return !now[id]; });
    var off = opts.withdrawn !== undefined ? (opts.withdrawn || {}) : missing ? withdrawn(model, ids.concat(Object.keys(opts.fixed || {}))) : {};
    // Not checked this time: nothing is said about it, so what was decided stays (unchecked above).
    var unk = missing ? unchecked(model, ids.concat(Object.keys(opts.fixed || {}))) : {};
    var verify = ids.filter(function (id) { return !now[id] && !unk[id] && (status[id] === 'fixed' || status[id] === 'open' || status[id] === 'confirmed' || status[id] === 'reopened'); })
      .map(function (id) { return off[id] ? { id: id, still: false, withdrawn: true, why: off[id] } : { id: id, still: false, why: 'not seen in the model' }; })
      // Marked fixed (or verified) and still found: said as well, so MxScout reopens it (review.js, "fixed still in the model").
      .concat(ids.filter(function (id) { return now[id] && (status[id] === 'fixed' || status[id] === 'verified'); })
        .map(function (id) { return { id: id, still: true, why: 'still in the model' }; }));
    // Fixed by the skill (check-security.js --fixed <id> --note, MXS-10): one the model no longer shows is said with what
    // was done, and MxScout marks it verified whatever it was — open, reopened or marked fixed.
    var fixed = opts.fixed || {};
    Object.keys(fixed).sort().forEach(function (id) {
      if (now[id] || off[id] || unk[id]) return;
      var v = verify.filter(function (x) { return x.id === id; })[0];
      if (!v) { v = { id: id, still: false, why: 'not seen in the model' }; verify.push(v); }
      v.fixed = cut(fixed[id], 1000);
    });
    if (verify.length) out.verify = verify;
    var skipped = Object.keys(unk).sort().map(function (id) { return { id: id, why: unk[id] }; });
    if (skipped.length) out.unchecked = skipped;
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

  window.MxSecRisks = { CHECKS: CHECKS, RULES: RULES, check: check, of: of, part: part, withdrawn: withdrawn, unchecked: unchecked, checkOf: checkOf, settings: settings, passwordVerdict: passwordVerdict, riskId: riskId, slug: slug, idOf: idOf, recipeText: recipeText, leadHash: leadHash, markLeads: markLeads, VERDICTS: VERDICTS };
})();
