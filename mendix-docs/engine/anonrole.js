/* MxScout — the anonymous role, checked the way Mendix checks it.
 *
 * Studio Pro 10.24.27 and later carries eight recommendations about the
 * anonymous user role in its Best Practice Recommender, MXS003 to MXS010, and
 * runs them only with the project open in Studio Pro. This works out the same
 * eight from the model MxScout already holds, offline, at import — and says
 * each one in Mendix's own code, so a developer can look the fix up in
 * Mendix's documentation ("Security Recommendations") by that code.
 *
 * Why these eight first: the Mendix apps found leaking data in 2026
 * (DIVD-2026-00003) come down to the anonymous role and a role handed out
 * after self-registration with rules that are too wide.
 *
 * PURE: no DOM, no storage, no network. It takes a model and returns plain
 * data; security.js draws it, and the same file is carried byte for byte in
 * skills/mendix-describe/engine/ (the suite checks it is), so the skill's
 * engine in Node reaches the same conclusions as this browser.
 *
 * Each result is in one of MxScout's three registers (see security.js):
 *   finding  — MXS004, MXS005, MXS006, MXS007, MXS009, and MXS010 when the
 *              entity holds personal data the rule lets anyone read;
 *   note     — worth knowing: MXS003, MXS008, MXS010 otherwise;
 *   unchecked — the model does not carry what the check needs.
 *
 * Model shape read (all of it optional):
 *   model.security   = { guestAccess, guestUserRole, adminUserRole }
 *   model.userRoles[] = { name, moduleRoles[], manageAllRoles, manageableRoles[] }
 *   model.entities[]  = { qualifiedName, module, name, persistable, generalization,
 *                         accessRules[{ moduleRole, defaultAccess, attrAccess{},
 *                         assocAccess{}, xpathConstraint, allowCreate, allowDelete }] }
 */
(function () {
  'use strict';

  // Mendix's own titles for the eight, as its Security Recommendations page
  // names them.
  var TITLES = {
    MXS003: 'Disable anonymous users',
    MXS004: 'Avoid granting anonymous users access to sensitive entities',
    MXS005: 'Do not use the administrator user role for anonymous access',
    MXS006: 'Avoid granting anonymous users write access to persistable entities',
    MXS007: 'Do not let anonymous users manage user roles',
    MXS008: 'Do not share module roles between anonymous and other user roles',
    MXS009: 'Do not map Administration module roles to the anonymous user role',
    MXS010: 'Constrain the read access of anonymous users'
  };
  var CODES = Object.keys(TITLES);

  // An attribute name that says it holds something about a person. A bare
  // "Name" does not count — Product.Name is not personal data — but FullName,
  // Email or Phone does.
  var PERSONAL = /^(full|first|last|middle|given|family|display|user|maiden)_?name$|^surname$|e_?-?mail|phone|mobile|telephone|address|birth|iban|ssn|pesel|passport|national_?id|salary/i;

  function hasRead(letter) { return letter === 'r' || letter === 'rw'; }
  function values(o) { return o ? Object.keys(o).map(function (k) { return o[k]; }) : []; }

  // What one access rule grants, in four words.
  function rightsOf(rule) {
    var members = values(rule.attrAccess).concat(values(rule.assocAccess));
    var written = Object.keys(rule.attrAccess || {}).filter(function (k) { return rule.attrAccess[k] === 'rw'; })
      .concat(Object.keys(rule.assocAccess || {}).filter(function (k) { return rule.assocAccess[k] === 'rw'; }));
    return {
      read: hasRead(rule.defaultAccess) || members.some(hasRead),
      write: rule.defaultAccess === 'rw' || written.length > 0,
      written: written,
      create: !!rule.allowCreate,
      del: !!rule.allowDelete
    };
  }

  // The System entity an entity inherits from, through any number of this
  // project's own entities in between — Shop.Member → Shop.Person →
  // System.User answers "System.User". Null when its chain stays local.
  function systemAncestor(entity, byQn) {
    var current = entity, guard = 0;
    while (current && current.generalization && guard++ < 30) {
      var g = current.generalization;
      if (/^System\./.test(g)) return g;
      current = byQn[g];
    }
    return null;
  }

  function result(code, register, text, fix, where) {
    var r = { code: code, title: TITLES[code] || 'The anonymous role', register: register, text: text, fix: fix };
    Object.keys(where || {}).forEach(function (k) { r[k] = where[k]; });
    return r;
  }

  // The whole check. Returns
  //   { state: 'not-checked' | 'off' | 'on', role: name|null, codes: [...],
  //     results: [{ code, title, register, text, fix, entity?, userRole?, moduleRole? }] }
  // 'off' carries no results: with anonymous access off, none of them applies.
  function check(model) {
    model = model || {};
    var s = model.security;
    var out = { state: 'on', role: null, codes: CODES.slice(), results: [] };
    if (!s || s.guestAccess === null || s.guestAccess === undefined) {
      out.state = 'not-checked';
      out.results.push(result('MXS003–MXS010', 'unchecked',
        'This model does not carry the project’s security settings, so MxScout could not check the anonymous role (MXS003–MXS010).',
        'Replace the model from the Mendix project folder; a model read by MxScout before it read the Security screen has none of it.'));
      return out;
    }
    if (!s.guestAccess) { out.state = 'off'; return out; }

    var roleName = s.guestUserRole || null;
    out.role = roleName;
    var role = (model.userRoles || []).filter(function (r) { return r && r.name === roleName; })[0];
    out.results.push(result('MXS003', 'note',
      roleName ? 'Anonymous users are allowed: anyone who can reach the app uses it as "' + roleName + '", without signing in, and nothing they do is tied to a person.'
               : 'Anonymous users are allowed, but no user role is named for them.',
      'If the app has no use for it (a custom sign-in page alone does not need it), set Allow anonymous users to No in App Security; if it does, keep the anonymous role as narrow as the checks below ask.',
      roleName ? { userRole: roleName } : null));
    if (!role) {
      out.results.push(result('MXS004–MXS010', 'unchecked',
        roleName ? 'The anonymous user role "' + roleName + '" is not among this model’s user roles, so MXS004–MXS010 were not checked.'
                 : 'With no anonymous user role named, MXS004–MXS010 were not checked.',
        'Name the anonymous user role in App Security.', roleName ? { userRole: roleName } : null));
      return out;
    }

    // MXS005 — the same role as the administrator's.
    if (s.adminUserRole && s.adminUserRole === roleName) {
      out.results.push(result('MXS005', 'finding',
        'Anonymous visitors get "' + roleName + '", the administrator’s own user role — everything the administrator may do, without signing in.',
        'Give anonymous access a user role of its own (Mendix names it Anonymous) that carries only what a visitor needs.',
        { userRole: roleName }));
    }

    // MXS007 — user management on the anonymous role.
    if (role.manageAllRoles || (role.manageableRoles || []).length) {
      out.results.push(result('MXS007', 'finding',
        'The anonymous role "' + roleName + '" may manage ' + (role.manageAllRoles ? 'every user role' : 'the user roles ' + role.manageableRoles.join(', ')) +
          ' — a visitor could create accounts and hand them roles.',
        'Remove every entry under User management for "' + roleName + '" in App Security.',
        { userRole: roleName }));
    }

    var anonModuleRoles = (role.moduleRoles || []).slice();
    var others = (model.userRoles || []).filter(function (r) { return r && r.name !== roleName; });

    // MXS009 — Administration module roles on the anonymous role.
    anonModuleRoles.filter(function (mr) { return /^Administration\./.test(mr); }).forEach(function (mr) {
      out.results.push(result('MXS009', 'finding',
        'The anonymous role "' + roleName + '" carries ' + mr + ', which reaches account data and account management.',
        'Remove ' + mr + ' from "' + roleName + '"; give a visitor a module role made for anonymous use.',
        { userRole: roleName, moduleRole: mr }));
    });

    // MXS008 — a module role shared with signed-in roles.
    var shared = {};
    anonModuleRoles.filter(function (mr) { return !/^System\./.test(mr); }).forEach(function (mr) {
      var with_ = others.filter(function (r) { return (r.moduleRoles || []).indexOf(mr) !== -1; }).map(function (r) { return r.name; });
      if (!with_.length) return;
      shared[mr] = true;
      out.results.push(result('MXS008', 'note',
        mr + ' is carried by the anonymous role "' + roleName + '" and by ' + with_.map(function (n) { return '"' + n + '"'; }).join(', ') +
          ' — whatever is granted to signed-in users through it is granted to visitors too.',
        'Map "' + roleName + '" only to module roles used for anonymous access alone, and take ' + mr + ' off it.',
        { userRole: roleName, moduleRole: mr }));
    });

    // The entity checks: every rule a module role of the anonymous role holds.
    var byQn = {};
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) byQn[e.qualifiedName] = e; });
    var mine = {};
    anonModuleRoles.forEach(function (mr) { mine[mr] = true; });
    (model.entities || []).forEach(function (e) {
      if (!e || e.module === 'System' || /^System\./.test(e.qualifiedName || '')) return;
      var rules = (e.accessRules || []).filter(function (r) { return r && mine[r.moduleRole]; });
      if (!rules.length) return;
      var qn = e.qualifiedName, persistable = e.persistable !== false;
      var where = function (rs) { return { entity: qn, userRole: roleName, moduleRole: rs.map(function (r) { return r.moduleRole; }).filter(function (m, i, a) { return a.indexOf(m) === i; }).join(', ') }; };

      // MXS004 — read or write on an entity that inherits from System.
      var sys = systemAncestor(e, byQn);
      var touching = rules.filter(function (r) { var g = rightsOf(r); return g.read || g.write; });
      if (sys && touching.length) {
        out.results.push(result('MXS004', 'finding',
          'Anonymous visitors may ' + (touching.some(function (r) { return rightsOf(r).write; }) ? 'read and change' : 'read') + ' ' + qn +
            ', which inherits from ' + sys + ' — account and identity data, open without signing in.',
          'Remove the access rule on ' + qn + ' for ' + where(touching).moduleRole + '.', where(touching)));
      }

      if (!persistable) return; // a non-persistable entity lives in one session and touches no database

      // MXS006 — create, write or delete on a persistable entity.
      var writing = rules.filter(function (r) { var g = rightsOf(r); return g.write || g.create || g.del; });
      if (writing.length) {
        var what = [];
        if (writing.some(function (r) { return r.allowCreate; })) what.push('create objects');
        var written = [];
        writing.forEach(function (r) { rightsOf(r).written.forEach(function (m) { if (written.indexOf(m) === -1) written.push(m); }); });
        if (written.length) what.push('change ' + written.slice(0, 6).join(', ') + (written.length > 6 ? ' and ' + (written.length - 6) + ' more' : ''));
        else if (writing.some(function (r) { return r.defaultAccess === 'rw'; })) what.push('change them');
        if (writing.some(function (r) { return r.allowDelete; })) what.push('delete objects');
        out.results.push(result('MXS006', 'finding',
          'On ' + qn + ', a persistable entity, anonymous visitors may ' + (what.length > 1 ? what.slice(0, -1).join(', ') + ' and ' + what[what.length - 1] : what[0]) +
            ' — written to the database by nobody anyone can name.',
          'Take create, write and delete off the rule for ' + where(writing).moduleRole + '; take a visitor’s input in a non-persistable entity and check it in a microflow before anything is stored.',
          where(writing)));
      }

      // MXS010 — read without an XPath on a persistable entity. Not for a
      // module role shared with signed-in roles: MXS008 already covers it.
      var open = rules.filter(function (r) { return !shared[r.moduleRole] && !r.xpathConstraint && rightsOf(r).read; });
      if (open.length) {
        var personal = [];
        open.forEach(function (r) {
          Object.keys(r.attrAccess || {}).forEach(function (a) {
            if (hasRead(r.attrAccess[a]) && PERSONAL.test(a) && personal.indexOf(a) === -1) personal.push(a);
          });
        });
        var isUser = sys === 'System.User';
        var finding = personal.length > 0 || isUser;
        out.results.push(result('MXS010', finding ? 'finding' : 'note',
          'Anonymous visitors may read every row of ' + qn + ': the rule for ' + where(open).moduleRole + ' has no XPath' +
            (personal.length ? ', and it lets them read ' + personal.join(', ') + '.' : isUser ? ', and every row is a user account.' : '.'),
          'Add an XPath that limits the rows to what this visitor’s session may see, or take the read access off; if the data belongs to a person, ask for a sign-in instead.',
          where(open)));
      }
    });

    var order = {};
    CODES.forEach(function (c, i) { order[c] = i; });
    var rank = { finding: 0, note: 1, unchecked: 2 };
    out.results.sort(function (a, b) {
      return ((order[a.code] || 0) - (order[b.code] || 0)) || ((a.entity || a.moduleRole || '').localeCompare(b.entity || b.moduleRole || '')) || (rank[a.register] - rank[b.register]);
    });
    return out;
  }

  window.MxAnonRole = { check: check, titles: TITLES, personal: PERSONAL };
})();
