/* MxScout — self-registration: what someone who has not signed in becomes.
 *
 * The Mendix apps found leaking data in 2026 (DIVD-2026-00003) were rarely
 * one wide rule. More often it was a path: a visitor who has not signed in,
 * a registration microflow that visitor may run, the user role that flow
 * hands the new account, and that role's access rules — so that "sign up,
 * activate, sign in" showed the visitor nearly the whole database. MxScout
 * holds every step of that path in the model; this joins them into one
 * sentence a security department can read: "A newly registered user gets the
 * role User, which reads 14 entities without an XPath."
 *
 * WHERE A PATH STARTS — the ways in that need no sign-in:
 *   - a microflow or nanoflow the anonymous user role may run (its allowed
 *     roles), when anonymous access is on; the pages that role may open and
 *     that call it are named beside it, but a page is not a way in of its
 *     own — the client can call only what the role is allowed to run;
 *   - an operation of a published REST service that asks for no
 *     authentication (no authentication type and no authentication
 *     microflow), whatever its role list says;
 *   - an operation of a REST service whose role list includes a module role
 *     of the anonymous user role, when anonymous access is on.
 * From there it follows every microflow and nanoflow called, any depth.
 *
 * WHAT MAKES IT A REGISTRATION: somewhere in what it runs, a Create object
 * of System.User or of one of its specializations (Administration.Account).
 * Then every change that sets or adds to System.UserRoles in what it runs is
 * the role it hands out, traced back to where the value comes from:
 *   - a retrieve of System.UserRole with [Name = 'User'] — the role "User";
 *   - [Name = @Module.Constant], or a constant anywhere in the value — NOT
 *     CHECKED, with the constant's name: an environment sets it, not the
 *     model;
 *   - a flow parameter — followed into every caller the path runs; what a
 *     microflow returns — followed to its end events; anything else (a Java
 *     action, an association from another object) — NOT CHECKED, saying why.
 * An account created with no role set in what the path runs is NOT CHECKED
 * too: an event handler or a Java action may set one.
 *
 * WHAT THE ROLE MAY READ — from its module roles' access rules on persistable
 * entities outside System: how many it reads at all, how many through a rule
 * with no XPath (every row), which of those hold personal data (the same
 * names anonrole.js uses) or are user accounts, and whether the role is the
 * administrator's or manages other roles. A finding, P1, when the role is the
 * administrator's, manages roles or reads every user account; P2 when it
 * reads personal data without an XPath; worth knowing otherwise — signing up
 * is a feature, and a role that reads a product list is no leak.
 *
 * ALSO SAID, because they are ways to an account the model cannot follow:
 *   - every single sign-on module among the Marketplace modules (accounts.js
 *     names them): it can create an account on first sign-in, with the role
 *     its configuration names — configuration that lives in the app's
 *     database, not the model. NOT CHECKED, with the module.
 *   - the demo users with their roles: Mendix never removes demo users from
 *     the database by itself, so switching demo users off leaves them there,
 *     and they can still sign in with the user name and password in the
 *     model (Mendix's Demo Users documentation).
 *
 * WHEN IT IS SHOWN: when anonymous access is on, or when a REST operation
 * that asks for no authentication creates an account. Otherwise
 * state 'hidden', and security.js draws nothing.
 *
 * PURE: no DOM, no storage, no network. security.js draws what it returns;
 * the skill's engine carries the same file byte for byte.
 *
 * Model shape read (all optional): model.security{ guestAccess,
 * guestUserRole, adminUserRole, demoUsersEnabled, demoUsers[{ userName,
 * userRoles[] }] }, model.userRoles[], model.modules[], model.entities[],
 * model.microflows[] / nanoflows[]{ qualifiedName, allowedModuleRoles,
 * parameters, activity{ calls, creates }, graph{ nodes[{ kind, action,
 * props, fields, returnValue }] } }, model.pages[] / snippets[]{ flowRefs,
 * snippets, allowedModuleRoles }, model.publishedServices[],
 * model.constants[{ qualifiedName, hasDefault? }] — never a value (constants.js).
 */
(function () {
  'use strict';

  var PERSONAL = /^(full|first|last|middle|given|family|display|user|maiden)_?name$|^surname$|e_?-?mail|phone|mobile|telephone|address|birth|iban|ssn|pesel|passport|national_?id|salary/i;
  var MAX_FLOWS = 600;   // what one way in may run, at most — a guard, not a limit a real path meets
  var MAX_DEPTH = 6;     // how far a value is traced back through parameters and returns
  var CONSTANT = /@([A-Za-z_]\w*\.[A-Za-z_]\w*)/g;

  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function hasRead(letter) { return letter === 'r' || letter === 'rw'; }
  function grantsRead(rule) {
    if (hasRead(rule.defaultAccess)) return true;
    return [rule.attrAccess || {}, rule.assocAccess || {}].some(function (m) {
      return Object.keys(m).some(function (k) { return hasRead(m[k]); });
    });
  }
  function grantsWrite(rule) {
    if (rule.allowCreate || rule.defaultAccess === 'rw') return true;
    return [rule.attrAccess || {}, rule.assocAccess || {}].some(function (m) {
      return Object.keys(m).some(function (k) { return m[k] === 'rw'; });
    });
  }

  // The whole check. Returns
  //   { state: 'shown' | 'hidden', anonymous: bool, anonymousRole, openRest: [service],
  //     paths: [Path], sso: [{ module, kind, version }], demo: { enabled, users: [{ userName, userRoles }] },
  //     roles: { name: Picture }, results: [{ register, priority, text }] }
  // Path = { entry: { kind: 'anonymous' | 'rest-open' | 'rest-anonymous', flow, flowKind, service?, operation?, moduleRoles? },
  //          pages: [page], chain: [flow], creates: [{ flow, entity }], grants: [Grant], register, priority }
  // Grant = { kind: 'role' | 'constant' | 'unresolved' | 'none', role?, constant?, hasDefault?, why?, flow, expression, op, text }
  // Picture = { userRole, reads: [entity], open: [entity], personal: [{ entity, attributes }], accounts: [entity],
  //             writesOpen: [entity], admin: bool, manages: [role] }
  function check(model) {
    model = model || {};
    var s = model.security || null;
    var out = { state: 'hidden', anonymous: !!(s && s.guestAccess === true), anonymousRole: null, openRest: [],
      paths: [], sso: [], demo: { enabled: s ? s.demoUsersEnabled : null, users: [] }, roles: {}, results: [] };

    var byQn = {};
    (model.entities || []).forEach(function (e) { if (e && e.qualifiedName) byQn[e.qualifiedName] = e; });
    function isAccount(qn) {
      if (qn === 'System.User') return true;
      var cur = byQn[qn], g = 0;
      while (cur && cur.generalization && g++ < 30) {
        if (cur.generalization === 'System.User') return true;
        cur = byQn[cur.generalization];
      }
      return false;
    }
    var userRoles = (model.userRoles || []).filter(function (r) { return r && r.name; });
    var roleByName = {};
    userRoles.forEach(function (r) { roleByName[r.name] = r; });
    var constantByName = {};
    (model.constants || []).forEach(function (c) { if (c && c.qualifiedName) constantByName[c.qualifiedName] = c; });

    var flowsByName = {};
    [['microflows', 'microflow'], ['nanoflows', 'nanoflow']].forEach(function (pair) {
      (model[pair[0]] || []).forEach(function (f) {
        if (!f || !f.qualifiedName) return;
        (flowsByName[f.qualifiedName] = flowsByName[f.qualifiedName] || []).push({ flow: f, kind: pair[1] });
      });
    });
    function nodesOf(f) { return (f.graph && f.graph.nodes) || []; }
    function callsOf(f) {
      var calls = ((f.activity && f.activity.calls) || []).slice();
      nodesOf(f).forEach(function (n) {
        if ((n.action === 'MicroflowCallAction' || n.action === 'NanoflowCallAction') && n.props && n.props.target) calls.push(n.props.target);
      });
      return uniq(calls);
    }

    // ---- the ways in ----
    var anonRole = out.anonymous ? (s.guestUserRole || null) : null;
    out.anonymousRole = anonRole;
    var anonMrs = {};
    if (anonRole && roleByName[anonRole]) (roleByName[anonRole].moduleRoles || []).forEach(function (mr) { anonMrs[mr] = true; });
    function anonAllowed(item) { return (item.allowedModuleRoles || []).filter(function (mr) { return anonMrs[mr]; }); }

    var entries = [];
    [['microflows', 'microflow'], ['nanoflows', 'nanoflow']].forEach(function (pair) {
      (model[pair[0]] || []).forEach(function (f) {
        if (!f || !f.qualifiedName) return;
        var mrs = anonAllowed(f);
        if (mrs.length) entries.push({ kind: 'anonymous', flow: f.qualifiedName, flowKind: pair[1], moduleRoles: mrs });
      });
    });
    (model.publishedServices || []).forEach(function (svc) {
      if (!svc || svc.kind !== 'REST') return;
      var open = !(svc.authentication || []).length && !svc.authenticationMicroflow;
      var mrs = anonAllowed(svc);
      if (!open && !mrs.length) return;
      (svc.exposes || []).forEach(function (op) {
        var m = /^(.*?)\s*→\s*(\S+)\s*$/.exec(String(op));
        if (!m) return;
        entries.push({ kind: open ? 'rest-open' : 'rest-anonymous', flow: m[2], flowKind: 'microflow',
          service: svc.qualifiedName || svc.name, operation: m[1], moduleRoles: mrs });
      });
    });

    // The pages the anonymous role may open that call a flow, snippets
    // followed: named beside a path, never a way in of their own.
    var snippetByName = {};
    (model.snippets || []).forEach(function (sn) { if (sn && sn.qualifiedName) snippetByName[sn.qualifiedName] = sn; });
    var pagesCalling = {};
    if (Object.keys(anonMrs).length) {
      (model.pages || []).forEach(function (p) {
        if (!p || !anonAllowed(p).length) return;
        var seen = {}, refs = [];
        (function walk(c) {
          refs = refs.concat(c.flowRefs || []);
          (c.snippets || []).forEach(function (name) {
            if (seen[name] || !snippetByName[name]) return;
            seen[name] = true;
            walk(snippetByName[name]);
          });
        })(p);
        uniq(refs).forEach(function (r) { (pagesCalling[r] = pagesCalling[r] || []).push(p.qualifiedName); });
      });
    }

    // ---- where a value of UserRoles comes from ----
    function rolesNamedIn(text) {
      var found = [], re = /'([^']*)'/g, m;
      while ((m = re.exec(String(text || '')))) if (roleByName[m[1]] && found.indexOf(m[1]) === -1) found.push(m[1]);
      return found;
    }
    function constantsIn(text) {
      var found = [], m;
      CONSTANT.lastIndex = 0;
      while ((m = CONSTANT.exec(String(text || '')))) if (found.indexOf(m[1]) === -1) found.push(m[1]);
      return found;
    }
    function constantGrant(name) {
      var c = constantByName[name];
      var g = { kind: 'constant', constant: name };
      // Whether it has a default value in the model — never the value: a constant's value is not kept (mpr.js readConstant).
      if (c && typeof c.hasDefault === 'boolean') g.hasDefault = c.hasDefault;
      return g;
    }
    function resolve(f, expr, depth, closure) {
      expr = String(expr || '').trim();
      var consts = constantsIn(expr);
      if (consts.length) return consts.map(constantGrant);
      var m = /^\$([A-Za-z_]\w*)$/.exec(expr);
      if (!m) {
        var named = rolesNamedIn(expr);
        if (named.length) return named.map(function (r) { return { kind: 'role', role: r, how: 'the name \'' + r + '\' in ' + f.qualifiedName }; });
        return [{ kind: 'unresolved', why: 'set to ' + (expr || 'an empty value') + ' in ' + f.qualifiedName }];
      }
      var v = m[1];
      if (depth > MAX_DEPTH) return [{ kind: 'unresolved', why: '$' + v + ' in ' + f.qualifiedName + ', traced further than MxScout follows' }];
      var producers = nodesOf(f).filter(function (n) { return n.props && n.props.out === v; });
      if (producers.length) {
        var got = [];
        producers.forEach(function (n) { got = got.concat(fromProducer(f, n, depth, closure)); });
        return got;
      }
      if ((f.parameters || []).some(function (p) { return p && p.name === v; })) {
        var outs = [];
        closure.forEach(function (g) {
          nodesOf(g).forEach(function (n) {
            if (!(n.action === 'MicroflowCallAction' || n.action === 'NanoflowCallAction') || !n.props || n.props.target !== f.qualifiedName) return;
            var arg = (n.fields || []).filter(function (a) { return a && a.name === v; })[0];
            if (arg) outs = outs.concat(resolve(g, arg.value, depth + 1, closure));
          });
        });
        if (outs.length) return outs;
        return [{ kind: 'unresolved', why: 'the parameter $' + v + ' of ' + f.qualifiedName + ', and nothing this path runs calls it with a value MxScout can read' }];
      }
      return [{ kind: 'unresolved', why: '$' + v + ' in ' + f.qualifiedName + ', which MxScout could not trace' }];
    }
    function fromProducer(f, n, depth, closure) {
      var p = n.props || {};
      if (n.action === 'RetrieveAction') {
        if (p.entity === 'System.UserRole' && p.source !== 'By association') return fromXPath(p.xpath || '', f, depth, closure);
        if (p.association) return [{ kind: 'unresolved', why: 'taken over ' + p.association + (p.from ? ' from $' + p.from : '') + ' in ' + f.qualifiedName + ' — the roles of another object, which the model does not hold' }];
        return [{ kind: 'unresolved', why: 'a retrieve of ' + (p.entity || 'an object') + ' in ' + f.qualifiedName }];
      }
      if ((n.action === 'MicroflowCallAction' || n.action === 'NanoflowCallAction') && p.target) {
        var target = (flowsByName[p.target] || [])[0];
        var ends = target ? nodesOf(target.flow).filter(function (x) { return x.kind === 'end' && x.returnValue; }) : [];
        if (!ends.length) return [{ kind: 'unresolved', why: 'returned by ' + p.target + ', whose return MxScout could not read' }];
        var got = [];
        ends.forEach(function (x) { got = got.concat(resolve(target.flow, x.returnValue, depth + 1, closure)); });
        return got;
      }
      if (n.action === 'JavaActionCallAction') return [{ kind: 'unresolved', why: 'returned by the Java action ' + (p.target || '') + ', which MxScout does not read' }];
      return [{ kind: 'unresolved', why: '$' + p.out + ' made by ' + (n.action || 'an activity') + ' in ' + f.qualifiedName }];
    }
    function fromXPath(xpath, f, depth, closure) {
      var consts = constantsIn(xpath);
      if (consts.length) return consts.map(constantGrant);
      var got = [], re = /\bName\s*=\s*'([^']*)'/g, m;
      while ((m = re.exec(xpath))) {
        got.push(roleByName[m[1]] ? { kind: 'role', role: m[1], how: 'retrieved in ' + f.qualifiedName + ' with ' + xpath.replace(/\s+/g, ' ') }
          : { kind: 'unresolved', why: 'a role named "' + m[1] + '" (retrieved in ' + f.qualifiedName + '), which is not among this model’s user roles' });
      }
      var pv = /\bName\s*=\s*(\$[A-Za-z_]\w*)\b/.exec(xpath);
      if (pv) got = got.concat(resolve(f, pv[1], depth + 1, closure));
      if (got.length) return got;
      return [{ kind: 'unresolved', why: 'a retrieve of System.UserRole in ' + f.qualifiedName + (xpath ? ' with ' + xpath.replace(/\s+/g, ' ') : ' with no XPath, which takes whichever role comes first') }];
    }

    // ---- what a role may read ----
    function picture(name) {
      if (out.roles[name]) return out.roles[name];
      var role = roleByName[name];
      if (!role) return null;
      var mrs = {};
      (role.moduleRoles || []).forEach(function (mr) { mrs[mr] = true; });
      var pic = { userRole: name, reads: [], open: [], personal: [], accounts: [], writesOpen: [],
        admin: !!(s && s.adminUserRole === name),
        manages: role.manageAllRoles ? ['every role'] : (role.manageableRoles || []).slice() };
      (model.entities || []).forEach(function (e) {
        if (!e || !e.qualifiedName || e.module === 'System' || /^System\./.test(e.qualifiedName) || e.persistable === false) return;
        var rules = (e.accessRules || []).filter(function (r) { return r && mrs[r.moduleRole]; });
        if (!rules.length) return;
        var open = rules.filter(function (r) { return !r.xpathConstraint; });
        if (open.some(grantsWrite)) pic.writesOpen.push(e.qualifiedName);
        if (!rules.some(grantsRead)) return;
        pic.reads.push(e.qualifiedName);
        var openRead = open.filter(grantsRead);
        if (!openRead.length) return;
        pic.open.push(e.qualifiedName);
        if (isAccount(e.qualifiedName)) pic.accounts.push(e.qualifiedName);
        var attrs = [];
        openRead.forEach(function (r) {
          Object.keys(r.attrAccess || {}).forEach(function (a) { if (hasRead(r.attrAccess[a]) && PERSONAL.test(a) && attrs.indexOf(a) === -1) attrs.push(a); });
        });
        if (attrs.length) pic.personal.push({ entity: e.qualifiedName, attributes: attrs.sort() });
      });
      out.roles[name] = pic;
      return pic;
    }
    function judge(pic) {
      if (pic.admin || pic.manages.length || pic.accounts.length) return { register: 'finding', priority: 'P1' };
      if (pic.personal.length) return { register: 'finding', priority: 'P2' };
      return { register: 'note', priority: null };
    }
    function headline(pic) {
      var t = 'A newly registered user gets the role "' + pic.userRole + '", which reads ' + plural(pic.open.length, 'entity', 'entities') + ' without an XPath';
      var more = [];
      if (pic.reads.length > pic.open.length) more.push(plural(pic.reads.length, 'entity', 'entities') + ' in all');
      if (pic.accounts.length) more.push('every user account (' + pic.accounts.join(', ') + ')');
      if (pic.personal.length) more.push('personal data on ' + pic.personal.map(function (x) { return x.entity + ' (' + x.attributes.join(', ') + ')'; }).join(', '));
      t += more.length ? ' — ' + more.join('; ') : '';
      if (pic.admin) t += '. It is the administrator’s own role';
      if (pic.manages.length) t += '. It may manage ' + (pic.manages[0] === 'every role' ? 'every user role' : 'the user roles ' + pic.manages.join(', ')) + ', so the new user may hand out roles';
      return t + '.';
    }

    // ---- each way in, followed ----
    var RANK = { finding: 0, unchecked: 1, note: 2 };
    entries.forEach(function (entry) {
      if (!flowsByName[entry.flow]) return;
      var seen = {}, parent = {}, queue = [entry.flow], closure = [];
      seen[entry.flow] = true;
      while (queue.length && closure.length < MAX_FLOWS) {
        var name = queue.shift();
        (flowsByName[name] || []).forEach(function (x) {
          closure.push(x.flow);
          callsOf(x.flow).forEach(function (c) {
            if (seen[c] || !flowsByName[c]) return;
            seen[c] = true;
            parent[c] = name;
            queue.push(c);
          });
        });
      }
      var creates = [], sets = [];
      closure.forEach(function (f) {
        var nodes = nodesOf(f);
        if (nodes.length) {
          nodes.forEach(function (n) {
            if (n.action === 'CreateChangeAction' && n.props && n.props.entity && isAccount(n.props.entity)) creates.push({ flow: f.qualifiedName, entity: n.props.entity });
            (n.fields || []).forEach(function (fd) {
              if (fd && fd.association && fd.name === 'UserRoles' && fd.op !== 'Remove') sets.push({ flow: f, expression: fd.value, op: fd.op || 'Set' });
            });
          });
        } else {
          ((f.activity && f.activity.creates) || []).forEach(function (qn) { if (isAccount(qn)) creates.push({ flow: f.qualifiedName, entity: qn }); });
        }
      });
      if (!creates.length) return;
      var chain = [creates[0].flow];
      while (parent[chain[0]] && chain.length < 20) chain.unshift(parent[chain[0]]);

      var grants = [];
      sets.forEach(function (st) {
        resolve(st.flow, st.expression, 0, closure).forEach(function (g) {
          g.flow = st.flow.qualifiedName;
          g.expression = st.expression;
          g.op = st.op;
          if (grants.some(function (x) { return x.kind === g.kind && x.role === g.role && x.constant === g.constant && x.why === g.why; })) return;
          grants.push(g);
        });
      });
      if (!grants.length) {
        grants.push({ kind: 'none', flow: creates[0].flow, expression: null, op: null,
          why: 'nothing this path runs sets UserRoles on the new account — an event handler or a Java action may, or the account gets no role' });
      }
      grants.forEach(function (g) {
        if (g.kind === 'role') {
          var pic = picture(g.role);
          var j = judge(pic);
          g.register = j.register;
          g.priority = j.priority;
          g.text = headline(pic);
        } else if (g.kind === 'constant') {
          g.register = 'unchecked';
          g.text = 'The role a newly registered user gets comes from the constant ' + g.constant +
            (g.hasDefault === true ? ' (it has a default value in the model; every environment may set its own)' : g.hasDefault === false ? ' (no default value in the model; each environment sets it)' : '') +
            ' — MxScout reads the model, not the value an environment gives it, so which role that is was not checked.';
        } else {
          g.register = 'unchecked';
          g.text = 'Which role a newly registered user gets was not checked: ' + g.why + '.';
        }
      });
      grants.sort(function (a, b) { return RANK[a.register] - RANK[b.register] || String(a.role || a.constant || '').localeCompare(String(b.role || b.constant || '')); });
      var worst = grants[0];
      out.paths.push({ entry: entry, pages: (pagesCalling[entry.flow] || []).slice().sort(), chain: chain,
        creates: creates.filter(function (c, i) { return creates.findIndex(function (d) { return d.flow === c.flow && d.entity === c.entity; }) === i; }),
        grants: grants, register: worst.register, priority: worst.priority || null });
    });
    out.paths.sort(function (a, b) {
      return RANK[a.register] - RANK[b.register] || String(a.priority || 'P9').localeCompare(String(b.priority || 'P9')) || a.entry.flow.localeCompare(b.entry.flow);
    });

    out.openRest = uniq(out.paths.filter(function (p) { return p.entry.kind === 'rest-open'; }).map(function (p) { return p.entry.service; }));
    if (out.anonymous || out.openRest.length) out.state = 'shown';
    if (out.state !== 'shown') { out.paths = []; out.roles = {}; return out; }

    out.sso = (typeof window !== 'undefined' && window.MxAccounts && window.MxAccounts.ssoModules) ? window.MxAccounts.ssoModules(model) : [];
    out.demo.users = ((s && s.demoUsers) || []).map(function (u) { return { userName: u.userName, userRoles: (u.userRoles || []).slice() }; });

    // For the band: one line per thing said, the same headline once.
    var said = {};
    out.paths.forEach(function (p) {
      p.grants.forEach(function (g) {
        if (g.register === 'unchecked' || said[g.text]) return;
        said[g.text] = true;
        out.results.push({ register: g.register, priority: g.priority, text: g.text });
      });
    });
    return out;
  }

  // The words a way in is told in.
  function entryText(entry) {
    if (entry.kind === 'rest-open') return entry.operation + ' on the REST service ' + entry.service + ', which asks for no authentication, runs ' + entry.flow;
    if (entry.kind === 'rest-anonymous') return entry.operation + ' on the REST service ' + entry.service + ', open to the anonymous role’s ' + entry.moduleRoles.join(', ') + ', runs ' + entry.flow;
    return 'Anonymous visitors may run the ' + (entry.flowKind || 'microflow') + ' ' + entry.flow + ' (allowed to ' + entry.moduleRoles.join(', ') + ')';
  }

  window.MxSelfReg = { check: check, entryText: entryText };
})();
