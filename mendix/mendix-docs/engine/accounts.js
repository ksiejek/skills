/* MxScout — user accounts: who may read and change them, role by role.
 *
 * The account module is the one place where a write right is an identity
 * right. A role that may change its own FullName may, in an app that signs
 * people in through a company identity provider, call itself somebody else
 * wherever the app shows a name; a role that may change Active, Blocked or
 * UserRoles may lock people out or hand itself rights. Studio Pro shows each
 * access rule on its own; this puts every user role against every account
 * field in one table, from the model alone.
 *
 * WHAT IS COUNTED, for every user role:
 *   - the access rules its module roles hold on System.User's specializations
 *     in this model (Administration.Account, and any of the project's own),
 *     field by field: read or read and write, and on whose account — the
 *     signed-in user's own (an XPath that restricts the rows to
 *     [%CurrentUser%], see restrictsToUser), some (another XPath) or every
 *     one (no XPath);
 *   - its user management (Manage user roles in App Security): Mendix lets a
 *     role that manages a user role set the System.User fields — name,
 *     password, active, blocked, roles — of users with that role, whatever
 *     the entity's XPath says. A real Mx 11 project's rules on
 *     Administration.Account carry no right on those fields at all; this is
 *     where they come from, so it is a row of its own.
 * The fields: System.User's own that decide who an account is and whether it
 * works (P1_FIELDS) and the attributes that name a person to others
 * (FullName, Email, DisplayName). Never a value: a password is a field here,
 * and MxScout reads only the right to it.
 *
 * WHAT IT CONCLUDES, in security.js's three registers:
 *   finding P1 — a role without user management may change a P1 field on
 *     accounts other than its own, or may change UserRoles at all;
 *   finding    — with a single sign-on module in the project (SAML, OIDC,
 *     LDAP, Mendix SSO, read from the Marketplace modules with their
 *     version), a role may change FullName or Email: the identity provider
 *     says who someone is, and the app lets them say otherwise. P1 when some
 *     role reads that field on other people's accounts (the app shows it to
 *     others), P2 when nobody does. Changing someone else's, by a role that
 *     manages no users, is a finding with or without SSO;
 *   worth knowing — the same FullName / Email right without SSO; a role's
 *     user management; a role that reads other people's FullName or Email;
 *     Administration.User in use (superseded in Administration 4.5.0); a
 *     business entity that specializes System.User; "Default rights for new
 *     members" other than None on an account entity; a write right on an
 *     account entity that nothing the role reaches uses — remove it.
 * Every finding says which pages and flows of that role write the field
 * (accessuse.js, the pages and the flows that run with the role's rights) or
 * that none does.
 *
 * PURE: no DOM, no storage, no network. security.js draws what it returns;
 * the skill's engine carries the same file byte for byte.
 *
 * Model shape read (all optional): model.modules[{ name, fromAppStore,
 * version }], model.security.adminUserRole, model.userRoles[{ name,
 * moduleRoles[], manageAllRoles, manageableRoles[] }], model.entities[{
 * qualifiedName, module, name, generalization, attributes[], accessRules[] }].
 */
(function () {
  'use strict';

  // System.User's fields that decide who an account is and whether it works.
  var P1_FIELDS = ['Name', 'Password', 'Active', 'Blocked', 'BlockedSince', 'FailedLogins', 'WebServiceUser', 'IsAnonymous', 'UserRoles'];
  var SYSTEM_ASSOCS = { UserRoles: true };
  // The attributes that name a person to the people who see them.
  var IDENTITY = /^(full_?name|display_?name|e_?-?mail(_?address)?)$/i;
  // A single sign-on module, by the name the Marketplace gives it.
  var SSO = [
    { kind: 'SAML', test: /saml/i },
    { kind: 'OIDC', test: /oidc|openid/i },
    { kind: 'LDAP', test: /ldap/i },
    { kind: 'Mendix SSO', test: /^mendixsso$/i }
  ];

  // The single sign-on modules among the Marketplace modules, by name, with
  // the version the module records — [{ module, kind, version }]. Also what
  // selfreg.js names as a way in it cannot follow.
  function ssoModules(model) {
    var out = [];
    ((model && model.modules) || []).forEach(function (m) {
      if (!m || !m.name || !m.fromAppStore) return;
      SSO.some(function (s) {
        if (!s.test.test(m.name)) return false;
        out.push({ module: m.name, kind: s.kind, version: m.version || null });
        return true;
      });
    });
    return out;
  }

  // ---------- does an XPath keep the rows to the signed-in user? ----------
  // Ported from mendix-docs 2.11 (mx-usage.mjs, Karol's Bridge repository),
  // where it was checked on eleven real cases. Strict on purpose: the token
  // must stand in a conjunction at the top level of a bracket group, compared
  // with "=" (not "!=", not inside not()), and in an "or" every branch must
  // carry it. "[id = '[%CurrentUser%]']" holds; "[Name != '[%CurrentUser%]']"
  // and "[TechnicalAccount = true]" do not.
  var USER_TOKEN = /\[%CurrentUser%\]|\$currentUser\b/i;
  var TOKEN_MARK = '\u0001';
  function splitTop(s, word) {
    var parts = [], depth = 0, from = 0;
    var re = new RegExp('^\\s+' + word + '\\s+', 'i');
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (depth === 0 && /\s/.test(c)) {
        var m = re.exec(s.slice(i));
        if (m) { parts.push(s.slice(from, i)); from = i + m[0].length; i = from - 1; }
      }
    }
    parts.push(s.slice(from));
    return parts;
  }
  function holdsUser(g) {
    g = g.trim();
    var ors = splitTop(g, 'or');
    if (ors.length > 1) return ors.every(holdsUser);
    return splitTop(g, 'and').some(function (c) {
      c = c.trim();
      if (/^not\s*\(/i.test(c)) return false;
      if (c.charAt(0) === '(' && c.charAt(c.length - 1) === ')') return holdsUser(c.slice(1, -1));
      return c.indexOf(TOKEN_MARK) !== -1 && /(^|[^!<>])=\s*\u0001|\u0001\s*=(?!=)/.test(c) && !/!=\s*\u0001|\u0001\s*!=/.test(c);
    });
  }
  function restrictsToUser(x) {
    if (typeof x !== 'string' || !USER_TOKEN.test(x)) return false;
    var s = x.replace(/'\[%CurrentUser%\]'|\[%CurrentUser%\]|\$currentUser\b/gi, TOKEN_MARK).replace(/'[^']*'|"[^"]*"/g, "''");
    var depth = 0, start = 0, groups = [];
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) === '[') { if (depth++ === 0) start = i + 1; }
      else if (s.charAt(i) === ']' && --depth === 0) groups.push(s.slice(start, i));
    }
    return groups.some(holdsUser);
  }

  // ---------- small helpers ----------
  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }
  function names(list) { return list.map(function (n) { return '"' + n + '"'; }).join(', '); }
  function andList(list) { return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : (list[0] || ''); }
  var RANK = { own: 0, some: 1, all: 2 };
  function scopeOf(rule) { return !rule.xpathConstraint ? 'all' : restrictsToUser(rule.xpathConstraint) ? 'own' : 'some'; }
  function versionAtLeast(v, want) {
    var a = String(v || '').split('.').map(Number), b = want.split('.').map(Number);
    for (var i = 0; i < b.length; i++) { var x = a[i] || 0; if (x !== b[i]) return x > b[i]; }
    return true;
  }

  // The whole check. Returns
  //   { state: 'checked' | 'no-accounts' | 'no-roles', sso: [{ module, kind, version }],
  //     entities: [{ qualifiedName, module, fromAppStore }], administration: { version } | null,
  //     rows: [{ userRole, entity, field, system, access: 'r'|'rw', scope: 'own'|'some'|'all',
  //              xpath, via: 'rule'|'user management', moduleRoles[], manages[], register, priority }],
  //     results: [{ kind, register, priority, title, text, fix, userRole?, entity?, fields?, writers?, unused? }],
  //     usesFollowed: bool }
  // `use` is MxAccessUse.analyse(model) when the caller has it (security.js
  // caches it); without it, and without accessuse.js loaded, the places that
  // write a field are not named and every finding says so.
  function check(model, use) {
    model = model || {};
    var out = { state: 'checked', sso: [], entities: [], administration: null, rows: [], results: [], usesFollowed: false };
    var modules = model.modules || [];
    var appStore = {};
    modules.forEach(function (m) {
      if (!m || !m.name) return;
      if (m.fromAppStore) appStore[m.name] = true;
      if (m.name === 'Administration' && m.fromAppStore) out.administration = { version: m.version || null };
    });
    out.sso = ssoModules(model);

    var byQn = {};
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) byQn[e.qualifiedName] = e; });
    function underUser(e) {
      var g = 0, cur = e;
      while (cur && cur.generalization && g++ < 30) {
        if (cur.generalization === 'System.User') return true;
        cur = byQn[cur.generalization];
      }
      return false;
    }
    // An entity's own attributes and those of its ancestors in this project:
    // a "Name" there is the project's, not System.User's.
    function ownAttrs(e) {
      var seen = {}, g = 0, cur = e;
      while (cur && g++ < 30) {
        (cur.attributes || []).forEach(function (a) { if (a && a.name) seen[a.name] = true; });
        cur = cur.generalization ? byQn[cur.generalization] : null;
      }
      return seen;
    }
    var family = (model.entities || []).filter(underUser);
    family.forEach(function (e) {
      out.entities.push({ qualifiedName: e.qualifiedName, module: e.module, fromAppStore: !!appStore[e.module] });
    });

    var userRoles = (model.userRoles || []).filter(function (r) { return r && r.name; });
    if (!userRoles.length) { out.state = 'no-roles'; return out; }
    if (!family.length) out.state = 'no-accounts';

    var adminRole = model.security && model.security.adminUserRole;
    function manages(r) { return r.manageAllRoles ? ['every role'] : (r.manageableRoles || []).slice(); }
    function isUserManager(r) { return !!r.manageAllRoles || (r.manageableRoles || []).length > 0; }
    var sso = out.sso.length > 0;
    var ssoText = out.sso.map(function (s) { return s.module + (s.version ? ' ' + s.version : ''); });

    // ---- where a field is written, from accessuse.js ----
    if (!use && typeof window !== 'undefined' && window.MxAccessUse) use = window.MxAccessUse.analyse(model);
    var setAside = {};
    if (use) {
      out.usesFollowed = !!use.writers;
      (use.setAside || []).forEach(function (s) { setAside[s.userRole] = s.services; });
    }
    function lineage(qn) {
      var list = [qn], g = 0, cur = byQn[qn];
      while (cur && cur.generalization && g++ < 30) { list.push(cur.generalization); cur = byQn[cur.generalization]; }
      return list;
    }
    function writersOf(userRole, entityQn, field) {
      if (!use || !use.writers || setAside[userRole]) return null;
      var w = use.writers[userRole] || {}, found = [];
      lineage(entityQn).forEach(function (q) {
        ((w[q] || {})[field] || []).forEach(function (x) {
          if (!found.some(function (f) { return f.via === x.via && f.name === x.name; })) found.push(x);
        });
      });
      return found;
    }

    // ---- the table: rights by rule, field by field ----
    // One row per user role, entity and field: the widest grant wins — write
    // over read, then every account over some over its own.
    var readOthers = {}; // field -> [userRole] that read it on other people's accounts
    userRoles.forEach(function (role) {
      var mine = {};
      (role.moduleRoles || []).forEach(function (mr) { mine[mr] = true; });
      family.forEach(function (e) {
        var own = ownAttrs(e);
        var rows = {};
        (e.accessRules || []).forEach(function (rule) {
          if (!rule || !mine[rule.moduleRole]) return;
          var scope = scopeOf(rule);
          function take(field, letter, system) {
            if (letter !== 'r' && letter !== 'rw') return;
            var cur = rows[field];
            var better = !cur || (letter === 'rw' && cur.access === 'r') ||
              (letter === cur.access && RANK[scope] > RANK[cur.scope]);
            if (cur) cur.moduleRoles = uniq(cur.moduleRoles.concat([rule.moduleRole]));
            if (!better) return;
            rows[field] = { userRole: role.name, entity: e.qualifiedName, field: field, system: system, access: letter, scope: scope,
              xpath: rule.xpathConstraint || null, via: 'rule', moduleRoles: cur ? cur.moduleRoles : [rule.moduleRole], manages: [], register: null, priority: null };
          }
          Object.keys(rule.attrAccess || {}).forEach(function (a) {
            if (P1_FIELDS.indexOf(a) !== -1 && !own[a]) take(a, rule.attrAccess[a], true);
            else if (IDENTITY.test(a) && own[a]) take(a, rule.attrAccess[a], false);
          });
          Object.keys(rule.assocAccess || {}).forEach(function (a) {
            if (SYSTEM_ASSOCS[a]) take(a, rule.assocAccess[a], true);
          });
          // Whoever reads FullName or Email beyond their own account is
          // "the app shows it to others".
          Object.keys(rule.attrAccess || {}).forEach(function (a) {
            var l = rule.attrAccess[a];
            if (IDENTITY.test(a) && own[a] && (l === 'r' || l === 'rw') && scope !== 'own') {
              (readOthers[a] = readOthers[a] || []);
              if (readOthers[a].indexOf(role.name) === -1) readOthers[a].push(role.name);
            }
          });
        });
        Object.keys(rows).sort(function (a, b) {
          return (rows[b].system - rows[a].system) || a.localeCompare(b);
        }).forEach(function (f) { out.rows.push(rows[f]); });
      });
      // User management: the System.User fields of the users it manages.
      if (isUserManager(role)) {
        out.rows.push({ userRole: role.name, entity: 'System.User', field: 'Name, Password, Active, Blocked, UserRoles', system: true,
          access: 'rw', scope: 'managed', xpath: null, via: 'user management', moduleRoles: [], manages: manages(role), register: 'note', priority: null });
      }
    });

    // ---- the verdicts ----
    function add(r) { out.results.push(r); return r; }
    function writeNote(userRole, entity, fields) {
      var lists = fields.map(function (f) { return { field: f, at: writersOf(userRole, entity, f) }; });
      var known = lists.filter(function (x) { return x.at !== null; });
      var places = [];
      known.forEach(function (x) { x.at.forEach(function (w) { if (!places.some(function (p) { return p.via === w.via && p.name === w.name; })) places.push(w); }); });
      return { writers: known.length ? places : null, unused: known.length === fields.length && !places.length,
        notFollowed: setAside[userRole] ? 'An OData service (' + setAside[userRole].join(', ') + ') is open to "' + userRole + '", and what a service hands out cannot be followed, so MxScout does not say which pages and flows of this role set it.'
          : !use ? 'MxScout did not follow the pages and flows of this role, so it does not say which of them set it.' : null };
    }
    var p1ByRole = {};
    out.rows.forEach(function (row) {
      if (row.via !== 'rule' || row.access !== 'rw') return;
      var role = userRoles.filter(function (r) { return r.name === row.userRole; })[0];
      var manager = isUserManager(role);
      if (row.system) {
        var rolesField = row.field === 'UserRoles';
        if (manager && !rolesField && row.scope !== 'own') { row.register = 'note'; return; }
        if (manager && rolesField) { row.register = 'note'; return; }
        if (!rolesField && row.scope === 'own') return; // one's own password, one's own name: ordinary
        row.register = 'finding'; row.priority = 'P1';
        var key = row.userRole + '|' + row.entity;
        (p1ByRole[key] = p1ByRole[key] || []).push(row);
        return;
      }
      // FullName / Email
      var shown = (readOthers[row.field] || []).length > 0;
      if (row.scope === 'own') {
        if (sso) { row.register = 'finding'; row.priority = shown ? 'P1' : 'P2'; } else row.register = 'note';
      } else if (manager) {
        row.register = 'note';
      } else {
        row.register = 'finding'; row.priority = sso ? 'P1' : 'P2';
      }
    });
    Object.keys(p1ByRole).forEach(function (key) {
      var rows = p1ByRole[key], role = rows[0].userRole, entity = rows[0].entity;
      var fields = rows.map(function (r) { return r.field; });
      var roleField = fields.indexOf('UserRoles') !== -1;
      var others = rows.filter(function (r) { return r.scope !== 'own'; }).map(function (r) { return r.field; });
      var w = writeNote(role, entity, fields);
      add({ kind: 'account-write', register: 'finding', priority: 'P1', userRole: role, entity: entity, fields: fields, writers: w.writers, unused: w.unused, notFollowed: w.notFollowed,
        title: roleField ? 'Hands out roles without user management' : 'Changes other people’s accounts',
        text: '"' + role + '" may change ' + andList(fields) + ' on ' + entity +
          (others.length ? ' — on ' + (rows.some(function (r) { return r.scope === 'all'; }) ? 'every account' : 'accounts its XPath does not keep to its own') : '') +
          ', and it manages no user roles' + (roleField ? ': changing UserRoles is handing out roles, which Mendix keeps for User management.' : '.') ,
        fix: roleField ? 'Take the write right on UserRoles off the rule for ' + andList(uniq(rows.map(function (r) { return r.moduleRoles.join(', '); }))) + '; if this role is meant to assign roles, give it User management for exactly those roles in App Security.'
          : 'Restrict the rule to the signed-in user’s own account ([id = \'[%CurrentUser%]\']) or take the write right off; account administration belongs to a role with User management.' });
    });
    // FullName / Email, one line per role and entity.
    var idGroups = {};
    out.rows.forEach(function (row) {
      if (row.system || row.via !== 'rule' || row.access !== 'rw' || !row.register) return;
      var key = row.userRole + '|' + row.entity + '|' + row.register + '|' + (row.priority || '') + '|' + row.scope;
      (idGroups[key] = idGroups[key] || []).push(row);
    });
    Object.keys(idGroups).sort().forEach(function (key) {
      var rows = idGroups[key], r0 = rows[0], fields = rows.map(function (r) { return r.field; });
      var w = writeNote(r0.userRole, r0.entity, fields);
      var own = r0.scope === 'own';
      var shownBy = uniq([].concat.apply([], fields.map(function (f) { return readOthers[f] || []; })));
      var text, fix;
      if (own) {
        text = '"' + r0.userRole + '" may change ' + andList(fields) + ' on its own account (' + r0.entity + ').' +
          (sso ? ' This project signs people in through ' + andList(ssoText) + ', so the identity provider says who someone is — and the app lets them say otherwise' +
            (shownBy.length ? ', to everyone who sees that name: ' + names(shownBy.slice(0, 4)) + (shownBy.length > 4 ? ' and ' + (shownBy.length - 4) + ' more' : '') + ' read' + (shownBy.length === 1 ? 's' : '') + ' it on other people’s accounts.' : '. No role reads it on other people’s accounts, which keeps the damage small.')
            : ' Without single sign-on in this project that is usually the point of a profile page.');
        fix = sso ? 'Take the write right on ' + andList(fields) + ' off the rule for ' + andList(uniq(rows.map(function (r) { return r.moduleRoles.join(', '); }))) + ' and let the sign-in set them from the identity provider’s claims; Administration 4.5.0 and later has ReadOwnDetails for exactly this.'
          : 'Nothing, if people are meant to edit their own profile.';
      } else {
        var manager = r0.register === 'note';
        text = '"' + r0.userRole + '" may change ' + andList(fields) + ' on ' + (r0.scope === 'all' ? 'every account' : 'accounts its XPath does not keep to its own') + ' (' + r0.entity + ')' +
          (manager ? '; it manages users, so that is likely its job.' : ', and it manages no users — it can rename somebody else' + (sso ? ', in an app whose sign-in is ' + andList(ssoText) + '.' : '.'));
        fix = manager ? 'Nothing, if this role administers accounts.' : 'Restrict the rule to the signed-in user’s own account or take the write right off.';
      }
      add({ kind: 'identity-write', register: r0.register, priority: r0.priority, userRole: r0.userRole, entity: r0.entity, fields: fields,
        writers: w.writers, unused: w.unused, notFollowed: w.notFollowed, title: own ? 'Changes its own name' + (fields.some(function (f) { return /mail/i.test(f); }) ? ' or e-mail' : '') : 'Changes other people’s names',
        text: text, fix: fix });
    });

    // User management, one line per role.
    userRoles.filter(isUserManager).forEach(function (role) {
      var list = manages(role);
      var mine = {};
      (role.moduleRoles || []).forEach(function (mr) { mine[mr] = true; });
      var above = role.manageAllRoles ? [] : list.filter(function (n) {
        var r = userRoles.filter(function (x) { return x.name === n; })[0];
        return r && r.name !== role.name && (r.moduleRoles || []).some(function (mr) { return !mine[mr]; });
      });
      var w = writeNote(role.name, 'System.User', ['Name', 'Password', 'Active', 'Blocked']);
      add({ kind: 'user-management', register: 'note', priority: null, userRole: role.name, entity: 'System.User', writers: w.writers, unused: false, notFollowed: w.notFollowed,
        title: 'Manages users',
        text: '"' + role.name + '" manages ' + (role.manageAllRoles ? 'every user role' : 'the user roles ' + names(list)) +
          ': it may set the name, password, active and blocked flags and the roles of those users, whatever an XPath on the account entity says.' +
          (role.manageAllRoles && role.name !== adminRole ? ' It is not the administrator’s role.' : '') +
          (above.length ? ' Among them ' + names(above) + ', which carr' + (above.length === 1 ? 'ies' : 'y') + ' module roles it does not have itself.' : ''),
        fix: 'Keep User management to the roles somebody in this role has to assign.' });
    });

    // Who reads other people's FullName / Email.
    userRoles.forEach(function (role) {
      var fields = Object.keys(readOthers).filter(function (f) { return readOthers[f].indexOf(role.name) !== -1; }).sort();
      if (!fields.length) return;
      add({ kind: 'read-others', register: 'note', priority: null, userRole: role.name, fields: fields,
        title: 'Reads other people’s ' + andList(fields),
        text: '"' + role.name + '" may read ' + andList(fields) + ' on other people’s accounts. Usually needed — a ticket shows who raised it — and it is also how a changed name reaches others.',
        fix: 'Nothing, if the app shows these. Administration 4.5.0 and later gives this as ReadOthersFullName and ReadOthersEmail.' });
    });

    // Administration.User, the module's old all-in-one role.
    var carriers = userRoles.filter(function (r) { return (r.moduleRoles || []).indexOf('Administration.User') !== -1; }).map(function (r) { return r.name; });
    if (carriers.length && out.administration) {
      var v = out.administration.version;
      add({ kind: 'administration-user', register: 'note', priority: null, moduleRole: 'Administration.User',
        title: 'Administration.User in use',
        text: names(carriers) + ' carr' + (carriers.length === 1 ? 'ies' : 'y') + ' Administration.User, the module’s old all-in-one role: reading and editing one’s own account, and reading others’. ' +
          (v ? (versionAtLeast(v, '4.5.0') ? 'This project has Administration ' + v + ', which supersedes it with narrower roles.' : 'This project has Administration ' + v + '; 4.5.0 and later replace it with narrower roles.')
             : 'Administration 4.5.0 and later replace it with narrower roles.'),
        fix: 'After updating Administration, give each role ReadOwnDetails, EditOwnPassword, and EditOwnDetails, ReadOthersFullName or ReadOthersEmail only where it needs them — with single sign-on, ReadOwnDetails alone.' });
    }

    // A business entity under System.User.
    family.forEach(function (e) {
      if (e.qualifiedName === 'Administration.Account') return;
      add({ kind: 'specialization', register: 'note', priority: null, entity: e.qualifiedName,
        title: 'A business entity is an account',
        text: e.qualifiedName + ' specializes ' + (e.generalization === 'System.User' ? 'System.User' : e.generalization + ', and through it System.User') +
          ': every object of it is a user account, with a name, a password and roles, and every right on it is a right on an account.',
        fix: 'Mendix advises against it: keep the business data in an entity of its own, associated with the account.' });
    });

    // "Default rights for new members" other than None on an account entity.
    family.forEach(function (e) {
      var loose = (e.accessRules || []).filter(function (r) { return r && (r.defaultAccess === 'r' || r.defaultAccess === 'rw'); });
      if (!loose.length) return;
      var roles = uniq(loose.map(function (r) { return r.moduleRole; }));
      var write = loose.some(function (r) { return r.defaultAccess === 'rw'; });
      add({ kind: 'default-rights', register: 'note', priority: null, entity: e.qualifiedName, moduleRole: roles.join(', '),
        title: 'New attributes are open by default',
        text: 'The rule' + (roles.length === 1 ? '' : 's') + ' for ' + roles.join(', ') + ' on ' + e.qualifiedName + ' give' + (roles.length === 1 ? 's' : '') +
          ' "Default rights for new members" ' + (write ? 'Read, Write' : 'Read') + ': an attribute added to the account later is ' + (write ? 'writable' : 'readable') + ' by ' + (roles.length === 1 ? 'it' : 'them') + ' without anyone deciding it.',
        fix: 'Set Default rights for new members to None on account entities.' });
    });

    // Write rights on account entities that nothing the role reaches uses.
    if (use && use.unwritten) {
      var fam = {};
      family.forEach(function (e) { fam[e.qualifiedName] = true; });
      // A role that reaches the entity nowhere at all is in `unused`, not
      // `unwritten`: every write right its rules give there is unused.
      var whole = (use.unused || []).filter(function (u) { return fam[u.entity]; }).map(function (u) {
        var role = userRoles.filter(function (r) { return r.name === u.userRole; })[0] || {};
        var mine = {}, rw = [];
        (role.moduleRoles || []).forEach(function (mr) { mine[mr] = true; });
        (byQn[u.entity].accessRules || []).forEach(function (rule) {
          if (!rule || !mine[rule.moduleRole]) return;
          Object.keys(rule.attrAccess || {}).forEach(function (a) { if (rule.attrAccess[a] === 'rw' && rw.indexOf(a) === -1) rw.push(a); });
        });
        return { userRole: u.userRole, entity: u.entity, attributes: rw.sort() };
      });
      use.unwritten.concat(whole).forEach(function (u) {
        if (!fam[u.entity] || !(u.attributes || []).length) return;
        add({ kind: 'write-unused', register: 'note', priority: null, userRole: u.userRole, entity: u.entity, fields: u.attributes.slice(), unused: true,
          title: 'Not used — remove',
          text: '"' + u.userRole + '" may change ' + andList(u.attributes.slice(0, 8)) + (u.attributes.length > 8 ? ' and ' + (u.attributes.length - 8) + ' more' : '') +
            ' on ' + u.entity + ', and no page or flow it reaches with its rights does.',
          fix: 'Take the write right off: an account right nothing uses is only a way in.' });
      });
    }

    var reg = { finding: 0, note: 1, unchecked: 2 }, pri = { P1: 0, P2: 1 };
    var kinds = ['account-write', 'identity-write', 'user-management', 'read-others', 'administration-user', 'specialization', 'default-rights', 'write-unused'];
    out.results.sort(function (a, b) {
      return (reg[a.register] - reg[b.register]) || ((a.priority ? pri[a.priority] : 2) - (b.priority ? pri[b.priority] : 2)) ||
        (kinds.indexOf(a.kind) - kinds.indexOf(b.kind)) || String(a.userRole || a.entity || '').localeCompare(String(b.userRole || b.entity || ''));
    });
    return out;
  }

  window.MxAccounts = { check: check, restrictsToUser: restrictsToUser, ssoModules: ssoModules, P1_FIELDS: P1_FIELDS, IDENTITY: IDENTITY };
})();
