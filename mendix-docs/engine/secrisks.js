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
    'advisory': 'Known security advisory',
    'market-admin': 'Administrative role of a Marketplace module on a user role', 'market-unused': 'Marketplace module the app does not use',
    'market-role-unused': 'Marketplace module role that grants nothing'
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

  // ---------- the whole list ----------
  // → { risks: [R], notChecked: [{ check, text, where }], counts: { risks, findings, notes, P1, P2, P3, byCheck: { check: n } } }
  // R = { id, check, register: 'finding' | 'note', level, theme, title, detail, fix, where[], key?, recipe }
  // Each module is used when it is loaded (in the browser all are; the skill's engine loads them all too).
  function check(model) {
    model = model || {};
    var W = typeof window !== 'undefined' ? window : {};
    var risks = [], notChecked = [], ids = {}, ix = indexOf(model);
    function add(check, subject, register, level, theme, title, detail, fix, where, key, src) {
      var id = riskId(check, subject);
      if (ids[id]) return;
      ids[id] = true;
      var note = register !== 'finding';
      var r = { id: id, check: check, register: note ? 'note' : 'finding', level: note ? 'P3' : (/^P[12]$/.test(level) ? level : 'P1'), theme: THEMES[theme] ? theme : 'access',
        title: cut((note ? 'Worth knowing: ' : '') + title, 300), detail: detail ? cut(detail, 3000) : null, fix: fix ? cut(fix, 1000) : null,
        where: uniq((where || []).map(function (w) { return cut(w, 300); })).slice(0, 40) };
      if (key) r.key = key;
      r.recipe = recipeFor(ix, check, src, r.fix, r.where);
      r.recipe.then = 'node check-security.js no longer lists ' + id + ' — the model no longer has it.';
      risks.push(r);
    }
    function shortText(t) { t = str(t); var i = t.search(/[.—;:](\s|$)/); return i > 20 && i < 200 ? t.slice(0, i) : cut(t, 200); }

    // The settings, in the band's words.
    settings(model).forEach(function (x) {
      add(x.check, x.subject, x.register, x.level, x.check === 'demo-password' ? 'secrets' : 'access', x.text.replace(/\.$/, ''), x.text, x.fix, x.where, null, x);
    });

    // The anonymous role, in Mendix's own codes.
    if (W.MxAnonRole) W.MxAnonRole.check(model).results.forEach(function (r) {
      if (r.register === 'unchecked') { notChecked.push({ check: 'anon', text: r.code + ' · ' + r.text, where: [] }); return; }
      var subject = [r.code, r.entity, r.userRole, r.moduleRole].filter(Boolean).join(' ');
      add('anon', subject, r.register, 'P1', 'access', r.code + ' · ' + r.title + (r.entity ? ': ' + r.entity : r.moduleRole ? ': ' + r.moduleRole : ''), r.text, r.fix, [r.entity, r.moduleRole], null, r);
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
    var use = W.MxAccessUse ? W.MxAccessUse.analyse(model) : null;
    if (W.MxAccounts) {
      W.MxAccounts.check(model, use).results.forEach(function (r) {
        if (r.register !== 'finding' && r.register !== 'note') return;
        add('accounts', [r.kind, r.userRole, r.entity, r.moduleRole].filter(Boolean).join(' '), r.register, r.priority, 'access',
          (r.title || 'User accounts') + (r.userRole ? ' — ' + r.userRole : '') + (r.entity ? ' (' + r.entity + ')' : ''), r.text, r.fix, [r.entity], null, r);
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
            [b.flow].concat(b.list.map(function (f) { return f.page; })), null, b);
        } else {
          add('guard-bypass-xpath', b.flow, 'finding', p1 ? 'P1' : 'P2', 'access', b.flow + ' retrieves past the role’s XPath', b.list.map(function (f) { return f.text; }).join('\n'),
            'Give the retrieve in ' + b.flow + ' the XPath of the role’s own access rule, or let the microflow apply entity access.',
            [b.flow].concat(b.list.map(function (f) { return f.entity; })), null, b);
        }
      });
      g.notes.forEach(function (n) { add('guard-same-entity', n.flow, 'note', 'P3', 'access', n.flow + ' takes two objects of ' + (n.entity || 'one entity') + ' from the client', n.text,
        'Check in ' + n.flow + ' that the two objects belong together — the same owner, or one linked to the other — before it changes either.', [n.flow, n.entity], null, n); });
    }

    // A write or delete right wider than every place the role uses it.
    if (W.MxEditScope) {
      var sc = W.MxEditScope.of(model, use);
      sc.findings.forEach(function (f) {
        add(f.kind === 'delete' ? 'scope-delete' : 'scope-write', f.entity, 'finding', f.priority || 'P1', 'access',
          (f.kind === 'delete' ? 'Deleted in every state: ' : 'Written in every state: ') + f.entity + (f.attributes && f.attributes.length ? ' (' + f.attributes.slice(0, 4).join(', ') + (f.attributes.length > 4 ? '…' : '') + ')' : ''),
          f.text + (f.mitigation ? ' ' + f.mitigation : ''), f.fix, [f.entity].concat((f.places || []).map(function (p) { return p.name; })), null, f);
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
          'Give the roles that may run ' + f.flow + ' the access it needs, or stop offering it to them.', [f.flow].concat(uniq(bad.map(function (i) { return i.entity; }))), null, { flow: f.flow, items: bad });
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

    // Marketplace modules (marketplace.js): an administrative module role on a user role that is not the application's
    // administrator is a finding — a role mapping in App Security, so P2 like the other settings; what nothing uses is worth knowing.
    if (W.MxMarketplace) {
      var mk = W.MxMarketplace.of(model);
      mk.findings.forEach(function (f) {
        add('market-admin', f.moduleRole + ' ' + f.userRole, 'finding', 'P2', 'access', 'Administrative role of ' + f.module + ' on "' + f.userRole + '": ' + f.moduleRole, f.text, f.fix, [f.moduleRole], null, f);
      });
      mk.notes.forEach(function (n) {
        var unusedModule = n.kind === 'unused-module';
        add(unusedModule ? 'market-unused' : 'market-role-unused', n.moduleRole || n.module, 'note', 'P3', 'access',
          unusedModule ? 'Marketplace module ' + n.module + ' is installed and not used' : 'Module role ' + n.moduleRole + ' grants nothing and is on ' + (n.userRoles || []).length + ((n.userRoles || []).length === 1 ? ' user role' : ' user roles'),
          n.text, n.fix, [n.moduleRole || n.module], null, n);
      });
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
  // counting the second; one marked fixed that the model still shows gets { still: true }, and MxScout reopens it.
  // One marked a false positive, or settled already, is left alone. opts.fixed: { id: what was done } — see below.
  // → { format, version, add: true, by, written, risks: [...], verify?: [{ id, still, why, fixed? }] }
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
      .map(function (id) { return { id: id, still: false, why: 'not seen in the model' }; })
      // Marked fixed (or verified) and still found: said as well, so MxScout reopens it (review.js, "fixed still in the model").
      .concat(ids.filter(function (id) { return now[id] && (status[id] === 'fixed' || status[id] === 'verified'); })
        .map(function (id) { return { id: id, still: true, why: 'still in the model' }; }));
    // Fixed by the skill (check-security.js --fixed <id> --note, MXS-10): one the model no longer shows is said with what
    // was done, and MxScout marks it verified whatever it was — open, reopened or marked fixed.
    var fixed = opts.fixed || {};
    Object.keys(fixed).sort().forEach(function (id) {
      if (now[id]) return;
      var v = verify.filter(function (x) { return x.id === id; })[0];
      if (!v) { v = { id: id, still: false, why: 'not seen in the model' }; verify.push(v); }
      v.fixed = cut(fixed[id], 1000);
    });
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

  window.MxSecRisks = { CHECKS: CHECKS, check: check, of: of, part: part, settings: settings, passwordVerdict: passwordVerdict, riskId: riskId, slug: slug, idOf: idOf, recipeText: recipeText };
})();
