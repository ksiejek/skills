/* MxScout — known security advisories for the Mendix runtime and for
 * Marketplace modules, as data, and which of them the versions in a model
 * fall under.
 *
 * WHAT THIS IS. Siemens ProductCERT publishes Mendix's security advisories
 * (Mendix lists them at docs.mendix.com/releasenotes/security-advisories/,
 * each linking to its Siemens page). A model records the Mendix version it
 * was saved with (meta.mendixVersion) and, for every Marketplace module, the
 * version it came in at (modules[].version, mpr.js reads AppStoreVersion).
 * Setting one against the other says "worth checking" offline, with no
 * request: this file is the whole table, and it is built into MxScout.
 *
 * WHAT IT IS NOT. A live version scanner. The table is as fresh as
 * CHECKED_ON and no fresher — an advisory published after that date is not
 * here — so the date is shown wherever a match is. And a model is what was
 * developed, not what is deployed: every match is WORTH KNOWING, never a
 * finding. It is updated by hand when MxScout is released.
 *
 * WHERE EACH ROW CAME FROM. Every entry was taken from the advisory's own
 * CSAF document on cert-portal.siemens.com (productcert/csaf/ssa-NNNNNN.json)
 * on CHECKED_ON — the affected products, their version ranges and the fixed
 * versions as written there, and one sentence in MxScout's words from its
 * summary. Nothing is inferred beyond one step, said here so an auditor can
 * check it: Siemens names a module's release lines by the Mendix version they
 * are for ("Mendix SAML (Mendix 9.24 compatible)"); a range carries that name
 * as `product`, and MxScout matches it by the line its version numbers are on
 * (SAML 3.x for 9.24, 4.x for 10 and 11), so a version on a line Siemens does
 * not name (SAML 2.x against a 2025 advisory) is not matched. A range for the
 * module as a whole ("Mendix LDAP", before 1.1.2) has no line and covers
 * every version below its fix.
 *
 * HOW A VERSION IS MATCHED. A range is half-open: affected from `from`
 * (inclusive, when given) up to `below` (exclusive) — a version at `below` or
 * later is fixed. `below: null` means every version on that line, with no
 * fix (`fix` says what Siemens says instead). A range may carry a `line`, a
 * version prefix compared by number ('10.6' is 10.6.x, never 10.60): of an
 * advisory's ranges, those on the longest line that holds the version decide,
 * and a range without a line covers every version no line is given for. The
 * runtime always carries the line Siemens names (Mendix Runtime V10.6 →
 * '10.6'), so Mendix 7 is never matched by a V8 range. Where Siemens gives
 * two fixed versions on one line (a New and an Upgrade track) `below` is the
 * higher one, so neither track is missed, and `fix` names both.
 *
 * Shapes:
 *   ADVISORY = { cve, ssa, published, component: 'runtime'|'module'|'widget',
 *                name (what it is about), modules: RegExp (Marketplace module
 *                names; module only), widget (the page widget's name; widget
 *                only), does (what an affected version does, after "before
 *                X"), note?, link, ranges: [RANGE] }
 *   RANGE    = { product, line?, from?, below|null, fix? }
 *   check(model) → { checkedOn, source, mendix: { version|null, state:
 *     'checked'|'not-recorded', matches: [MATCH] }, modules: [{ name,
 *     version|null, about|null, state: 'checked'|'no-version', matches }],
 *     widgets: [{ name, advisories: [cve], text }], matches: [MATCH],
 *     notChecked: [{ kind, name, text }] }
 *   MATCH    = { cve, ssa, component, name, product, version, from|null,
 *     below|null, fix|null, text, fixText, note|null, link, published }
 *
 * Pure: no DOM, no storage, no network. The Security section draws what it
 * returns, and mendix-describe carries the same file in its engine/.
 */
(function () {
  'use strict';

  var CHECKED_ON = '2026-10-18';
  var SOURCE = {
    name: 'Siemens ProductCERT security advisories for Mendix',
    list: 'https://docs.mendix.com/releasenotes/security-advisories/',
    portal: 'https://cert-portal.siemens.com/productcert/'
  };
  var HTML = 'https://cert-portal.siemens.com/productcert/html/ssa-';
  var PDF = 'https://cert-portal.siemens.com/productcert/pdf/ssa-';

  // Marketplace module names, as the Marketplace installs them.
  var SAML = /^saml(20)?$/i;
  var OIDC = /^oidc$/i;
  var FORGOT = /^forgot_?password$/i;

  var ADVISORIES = [
    // ---------- the Mendix runtime ----------
    { cve: 'CVE-2025-30280', ssa: 'SSA-874353', published: '2025-04-08', component: 'runtime', name: 'Mendix Runtime',
      does: 'lets someone who has not signed in list every entity and attribute name of the app',
      link: HTML + '874353.html',
      ranges: [
        { product: 'Mendix Runtime V8', line: '8', below: '8.18.35' },
        { product: 'Mendix Runtime V9', line: '9', below: '9.24.34' },
        { product: 'Mendix Runtime V10', line: '10', below: '10.21.0' },
        { product: 'Mendix Runtime V10.6', line: '10.6', below: '10.6.22' },
        { product: 'Mendix Runtime V10.12', line: '10.12', below: '10.12.16' },
        { product: 'Mendix Runtime V10.18', line: '10.18', below: '10.18.5' }
      ] },
    { cve: 'CVE-2024-50313', ssa: 'SSA-914892', published: '2024-11-12', component: 'runtime', name: 'Mendix Runtime',
      does: 'has a race condition in basic authentication that lets someone who has not signed in get around the account lockout',
      note: 'It matters where the app’s sign-in or its published REST, web and OData services use basic authentication.',
      link: HTML + '914892.html',
      ranges: [
        { product: 'Mendix Runtime V8', line: '8', below: null, fix: 'Siemens plans no fix for Mendix 8' },
        { product: 'Mendix Runtime V9', line: '9', below: '9.24.29' },
        { product: 'Mendix Runtime V10', line: '10', below: '10.16.0' },
        { product: 'Mendix Runtime V10.6', line: '10.6', below: '10.6.15' },
        { product: 'Mendix Runtime V10.12', line: '10.12', below: '10.12.7' }
      ] },
    { cve: 'CVE-2024-33500', ssa: 'SSA-540640', published: '2024-06-11', component: 'runtime', name: 'Mendix Runtime',
      does: 'lets a user who may manage a role raise the access rights of users with that role, if they guess the id of a role with higher rights',
      link: HTML + '540640.html',
      ranges: [
        { product: 'Mendix Applications using Mendix 9', line: '9', from: '9.3.0', below: '9.24.22' },
        { product: 'Mendix Applications using Mendix 10', line: '10', below: '10.11.0' },
        { product: 'Mendix Applications using Mendix 10 (V10.6)', line: '10.6', below: '10.6.9' }
      ] },
    { cve: 'CVE-2023-45794', ssa: 'SSA-084182', published: '2023-11-14', component: 'runtime', name: 'Mendix Runtime',
      does: 'has a capture-replay flaw that, depending on the app’s model and access rules, could let a signed-in user read or change objects without authorization or raise their privileges',
      link: HTML + '084182.html',
      ranges: [
        { product: 'Mendix Applications using Mendix 7', line: '7', below: '7.23.37' },
        { product: 'Mendix Applications using Mendix 8', line: '8', below: '8.18.27' },
        { product: 'Mendix Applications using Mendix 9', line: '9', below: '9.24.10' },
        { product: 'Mendix Applications using Mendix 10', line: '10', below: '10.4.0' }
      ] },
    { cve: 'CVE-2023-23835', ssa: 'SSA-252808', published: '2023-02-14', component: 'runtime', name: 'Mendix Runtime',
      does: 'lets an attacker get past XPath constraints and read data through XPath queries that trigger errors',
      link: PDF + '252808.pdf',
      ranges: [
        { product: 'Mendix Applications using Mendix 7', line: '7', below: '7.23.34' },
        { product: 'Mendix Applications using Mendix 8', line: '8', below: '8.18.23' },
        { product: 'Mendix Applications using Mendix 9', line: '9', below: '9.22.0' },
        { product: 'Mendix Applications using Mendix 9 (V9.6)', line: '9.6', below: '9.6.15' },
        { product: 'Mendix Applications using Mendix 9 (V9.12)', line: '9.12', below: '9.12.10' },
        { product: 'Mendix Applications using Mendix 9 (V9.18)', line: '9.18', below: '9.18.4' }
      ] },
    { cve: 'CVE-2022-24309', ssa: 'SSA-148641', published: '2022-03-08', component: 'runtime', name: 'Mendix Runtime',
      does: 'may skip the XPath constraints that run over an association the user may read, so a user could read and change data they should not',
      note: 'Mendix 9’s default configuration is not affected: only DataStorage.UseNewQueryHandler set to false is.',
      link: HTML + '148641.html',
      ranges: [
        { product: 'Mendix Runtime V7', line: '7', below: '7.23.29' },
        { product: 'Mendix Runtime V8', line: '8', below: '8.18.16' },
        { product: 'Mendix Runtime V9', line: '9', below: '9.13.0' }
      ] },

    // ---------- SAML ----------
    { cve: 'CVE-2026-80465', ssa: 'SSA-887643', published: '2026-09-03', component: 'module', name: 'SAML', modules: SAML,
      does: 'does not properly validate the SAML response signature, so in specific single sign-on configurations an attacker who has not signed in could take over an account',
      link: HTML + '887643.html',
      ranges: [
        { product: 'Mendix SAML (Mendix 9.24 compatible)', line: '3', below: '3.6.27' },
        { product: 'Mendix SAML (Mendix 10 and Mendix 11 compatible)', line: '4', below: '4.2.3' }
      ] },
    { cve: 'CVE-2025-40758', ssa: 'SSA-395458', published: '2025-08-14', component: 'module', name: 'SAML', modules: SAML,
      does: 'does not enforce signature validation and binding checks strictly enough, so in specific single sign-on configurations an attacker who has not signed in could take over an account',
      note: 'Siemens advises configurations with UseEncryption enabled until the module is updated.',
      link: HTML + '395458.html',
      ranges: [
        { product: 'Mendix SAML (Mendix 9.24 compatible)', line: '3', below: '3.6.21' },
        { product: 'Mendix SAML (Mendix 10.12 compatible)', line: '4.0', below: '4.0.3' },
        { product: 'Mendix SAML (Mendix 10.21 compatible)', line: '4', below: '4.1.2' }
      ] },
    { cve: 'CVE-2023-29129', ssa: 'SSA-851884', published: '2023-06-13', component: 'module', name: 'SAML', modules: SAML,
      does: 'verifies SAML assertions insufficiently in a specific non-default configuration (the incomplete fix of CVE-2023-25957), so an attacker who has not signed in could get past authentication',
      link: HTML + '851884.html',
      ranges: [
        { product: 'Mendix SAML (Mendix 7 compatible)', line: '1', from: '1.16.4', below: '1.18.0' },
        { product: 'Mendix SAML (Mendix 8 compatible)', line: '2', from: '2.2.0', below: '2.4.0' },
        { product: 'Mendix SAML (Mendix 9 latest compatible)', line: '3', from: '3.1.8', below: '3.6.1', fix: '3.6.0 (Upgrade Track) or 3.6.1 (New Track)' },
        { product: 'Mendix SAML (Mendix 9.6 compatible)', line: '3.2', below: '3.2.7', fix: '3.2.6 (Upgrade Track) or 3.2.7 (New Track)' },
        { product: 'Mendix SAML (Mendix 9.12/9.18 compatible)', line: '3.3', below: '3.3.15', fix: '3.3.14 (Upgrade Track) or 3.3.15 (New Track)' }
      ] },
    { cve: 'CVE-2023-25957', ssa: 'SSA-851884', published: '2023-03-14', component: 'module', name: 'SAML', modules: SAML,
      does: 'verifies SAML assertions insufficiently, so an attacker who has not signed in could get past authentication',
      note: 'The fixed versions still are when the default option Use Encryption is switched off.',
      link: HTML + '851884.html',
      ranges: [
        { product: 'Mendix SAML (Mendix 7 compatible)', line: '1', from: '1.16.4', below: '1.17.3' },
        { product: 'Mendix SAML (Mendix 8 compatible)', line: '2', from: '2.2.0', below: '2.3.0' },
        { product: 'Mendix SAML (Mendix 9 latest compatible)', line: '3', from: '3.1.8', below: '3.3.1', fix: '3.3.0 (Upgrade Track) or 3.3.1 (New Track)' },
        { product: 'Mendix SAML (Mendix 9.6 compatible)', line: '3.2', below: '3.2.7', fix: '3.2.6 (Upgrade Track) or 3.2.7 (New Track)' }
      ] },

    // ---------- OIDC SSO ----------
    { cve: 'CVE-2025-40571', ssa: 'SSA-726617', published: '2025-05-13', component: 'module', name: 'OIDC SSO', modules: OIDC,
      does: 'gives the Administrator role read and write access to every token, which someone changing the module during development could misuse',
      link: HTML + '726617.html',
      ranges: [
        { product: 'Mendix OIDC SSO (Mendix 9 compatible)', line: '3', below: '3.3.1' },
        { product: 'Mendix OIDC SSO (Mendix 10.12 compatible)', line: '4.0', below: '4.0.1' },
        { product: 'Mendix OIDC SSO V4.2 (Mendix 10 compatible)', line: '4.2', below: '4.2.1' },
        { product: 'Mendix OIDC SSO V4.3 (Mendix 10 compatible)', line: '4.3', below: null, fix: 'Siemens lists no fix for V4.3 yet' }
      ] },

    // ---------- LDAP ----------
    { cve: 'CVE-2024-56841', ssa: 'SSA-314390', published: '2025-01-14', component: 'module', name: 'LDAP', modules: /^ldap$/i,
      does: 'is open to LDAP injection, which lets someone who has not signed in get past the user name check',
      link: HTML + '314390.html',
      ranges: [{ product: 'Mendix LDAP', below: '1.1.2' }] },

    // ---------- Encryption ----------
    { cve: 'CVE-2024-39888', ssa: 'SSA-998949', published: '2024-07-09', component: 'module', name: 'Encryption', modules: /^encryption$/i,
      does: 'ships a hard-coded default EncryptionKey, so the data of an app that never set its own key can be decrypted by anyone',
      link: HTML + '998949.html',
      ranges: [{ product: 'Mendix Encryption', from: '10.0.0', below: '10.0.2' }] },

    // ---------- Forgot Password ----------
    { cve: 'CVE-2023-43623', ssa: 'SSA-295483', published: '2023-10-10', component: 'module', name: 'Forgot Password', modules: FORGOT,
      does: 'answers differently for known and unknown users, so someone who has not signed in can tell which user names exist',
      link: HTML + '295483.html',
      ranges: [
        { product: 'Mendix Forgot Password (Mendix 7 compatible)', line: '3', below: '3.7.3' },
        { product: 'Mendix Forgot Password (Mendix 8 compatible)', line: '4', below: '4.1.3' },
        { product: 'Mendix Forgot Password (Mendix 9 and Mendix 10 compatible)', line: '5', below: '5.4.0' }
      ] },
    { cve: 'CVE-2023-27464', ssa: 'SSA-699404', published: '2023-04-11', component: 'module', name: 'Forgot Password', modules: FORGOT,
      does: 'answers in an observably different way that could let an attacker retrieve sensitive information',
      link: HTML + '699404.html',
      ranges: [
        { product: 'Mendix Forgot Password (Mendix 7 compatible)', line: '3', below: '3.7.1' },
        { product: 'Mendix Forgot Password (Mendix 8 compatible)', line: '4', below: '4.1.1' },
        { product: 'Mendix Forgot Password (Mendix 9 compatible)', line: '5', below: '5.1.1' }
      ] },
    { cve: 'CVE-2022-26313', ssa: 'SSA-134279', published: '2022-03-08', component: 'module', name: 'Forgot Password', modules: FORGOT,
      does: 'lets someone, in certain configurations, use the sign-up flow to take over any user’s account',
      note: 'Siemens advises disabling sign-up until the module is updated.',
      link: PDF + '134279.pdf',
      ranges: [{ product: 'Mendix Forgot Password Appstore module', from: '3.3.0', below: '3.5.1' }] },
    { cve: 'CVE-2022-26314', ssa: 'SSA-134279', published: '2022-03-08', component: 'module', name: 'Forgot Password', modules: FORGOT,
      does: 'generates initial passwords in an insecure way, so in specific situations someone who has not signed in could brute-force them efficiently',
      link: PDF + '134279.pdf',
      ranges: [
        { product: 'Mendix Forgot Password Appstore module', line: '3', from: '3.3.0', below: '3.5.1' },
        { product: 'Mendix Forgot Password Appstore module (Mendix 7 compatible)', line: '3', below: '3.2.2' }
      ] },

    // ---------- other modules ----------
    { cve: 'CVE-2022-46664', ssa: 'SSA-210822', published: '2022-12-13', component: 'module', name: 'Workflow Commons', modules: /^workflow_?commons$/i,
      does: 'handles access control on some of its entities wrongly, so a signed-in user could read or delete sensitive information',
      link: PDF + '210822.pdf',
      ranges: [
        { product: 'Mendix Workflow Commons', below: '2.4.0' },
        { product: 'Mendix Workflow Commons V2.1', line: '2.1', below: '2.1.4' },
        { product: 'Mendix Workflow Commons V2.3', line: '2.3', below: '2.3.2' }
      ] },
    { cve: 'CVE-2022-45936', ssa: 'SSA-224632', published: '2022-12-13', component: 'module', name: 'Email Connector', modules: /^email_?connector$/i,
      does: 'handles access control on some of its entities wrongly, so a signed-in user could read and change sensitive information',
      note: 'Siemens advises not using the module’s default user role until the module is updated.',
      link: PDF + '224632.pdf',
      ranges: [{ product: 'Mendix Email Connector', below: '2.0.0' }] },
    { cve: 'CVE-2022-34467', ssa: 'SSA-610768', published: '2022-07-12', component: 'module', name: 'Excel Importer', modules: /^excel_?importer$/i,
      does: 'is open to XML entity expansion, which an attacker could use to make it unavailable',
      link: PDF + '610768.pdf',
      ranges: [
        { product: 'Mendix Excel Importer Module (Mendix 8 compatible)', line: '9', below: '9.2.2' },
        { product: 'Mendix Excel Importer Module (Mendix 9 compatible)', line: '10', below: '10.1.2' }
      ] },

    // ---------- a page widget: its version is not in the .mpr ----------
    { cve: 'CVE-2025-40834', ssa: 'SSA-190588', published: '2025-11-17', component: 'widget', name: 'Rich Text', widget: 'Rich Text',
      does: 'does not neutralize input properly, which allows cross-site scripting',
      link: HTML + '190588.html',
      ranges: [{ product: 'Mendix RichText', from: '4.0.0', below: '4.6.1' }] }
  ];

  // ---------- versions ----------
  // "10.18.3", "V10.18.3", "10.18.3.58900" → [10, 18, 3, 58900]. Anything
  // that does not start with a number is no version (null).
  function parse(v) {
    var m = /^\s*v?(\d+(?:\.\d+)*)/i.exec(String(v == null ? '' : v));
    return m ? m[1].split('.').map(Number) : null;
  }
  function compare(a, b) {
    var x = Array.isArray(a) ? a : parse(a), y = Array.isArray(b) ? b : parse(b);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (x[i] || 0) - (y[i] || 0);
      if (d) return d < 0 ? -1 : 1;
    }
    return 0;
  }
  // '10.6' holds 10.6.x; it does not hold 10.60.x.
  function onLine(v, line) {
    var l = parse(line);
    return l.every(function (n, i) { return v[i] === n; });
  }

  // The range that decides for this version, or null when the advisory names
  // none for it. Affected only when it is also inside [from, below).
  function rangesFor(adv, version) {
    var v = Array.isArray(version) ? version : parse(version);
    if (!v) return [];
    var best = -1, picked = [];
    adv.ranges.forEach(function (r) {
      var depth = r.line ? parse(r.line).length : 0;
      if (r.line && !onLine(v, r.line)) return;
      if (depth > best) { best = depth; picked = [r]; } else if (depth === best) picked.push(r);
    });
    return picked;
  }
  function affecting(adv, version) {
    var v = parse(version);
    if (!v) return null;
    var hit = null;
    rangesFor(adv, v).some(function (r) {
      if (r.from && compare(v, r.from) < 0) return false;
      if (r.below && compare(v, r.below) >= 0) return false;
      hit = r;
      return true;
    });
    return hit;
  }

  function rangeText(r) {
    if (!r.below) return r.product + ' (every version)';
    return r.product + (r.from ? ' from ' + r.from + ' and' : '') + ' before ' + r.below;
  }
  function match(adv, r, version, subject) {
    var fix = r.fix || r.below || null;
    return {
      cve: adv.cve, ssa: adv.ssa, component: adv.component, name: adv.name, product: r.product,
      version: version, from: r.from || null, below: r.below || null, fix: fix,
      text: subject + '; ' + rangeText(r) + ' ' + adv.does + ' (' + adv.cve + ').',
      fixText: r.below ? 'Fixed in ' + fix + '.' : fix + '.',
      note: adv.note || null, link: adv.link, published: adv.published
    };
  }

  // Does a page or snippet place this widget? Read from the structure
  // mpr.js keeps (a widget's `type` is its name, "Rich Text").
  function usesWidget(model, name) {
    var seen = 0;
    function walk(n, depth) {
      if (!n || typeof n !== 'object' || depth > 60 || ++seen > 400000) return false;
      if (Array.isArray(n)) return n.some(function (x) { return walk(x, depth + 1); });
      if (n.type === name && typeof n.kind === 'string') return true;
      for (var k in n) if (n[k] && typeof n[k] === 'object' && walk(n[k], depth + 1)) return true;
      return false;
    }
    return (model.pages || []).concat(model.snippets || []).some(function (p) { return p && walk(p.structure, 0); });
  }

  function check(model) {
    model = model || {};
    var all = [], notChecked = [];
    var mv = (model.meta && model.meta.mendixVersion) || null;
    var mendix = { version: mv, state: parse(mv) ? 'checked' : 'not-recorded', matches: [] };
    if (mendix.state === 'checked') {
      ADVISORIES.forEach(function (a) {
        if (a.component !== 'runtime') return;
        var r = affecting(a, mv);
        if (r) mendix.matches.push(match(a, r, mv, 'This model is on Mendix ' + mv));
      });
    } else {
      notChecked.push({ kind: 'mendix', name: 'Mendix', text: 'This model does not record the Mendix version it was saved with, so the runtime’s advisories were not checked.' });
    }
    all = all.concat(mendix.matches);

    var modules = (model.modules || []).filter(function (m) { return m && m.name && m.fromAppStore; })
      .map(function (m) {
        var about = ADVISORIES.filter(function (a) { return a.modules && a.modules.test(m.name); });
        var version = m.version || null;
        var row = { name: m.name, version: version, about: about.length ? about[0].name : null,
          state: parse(version) ? 'checked' : 'no-version', matches: [] };
        if (row.state === 'checked') {
          about.forEach(function (a) {
            var r = affecting(a, version);
            if (r) row.matches.push(match(a, r, version, 'Module ' + m.name + ' is at ' + version + ' in this model'));
          });
        } else if (about.length) {
          notChecked.push({ kind: 'module', name: m.name, text: 'Module ' + m.name + ' (' + about[0].name + ') has no version recorded in this model, so its advisories (' +
            about.map(function (a) { return a.cve; }).join(', ') + ') were not checked. Replace the model from the Mendix project folder to read it.' });
        }
        return row;
      })
      .sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; });
    modules.forEach(function (m) { all = all.concat(m.matches); });

    var widgets = [];
    ADVISORIES.filter(function (a) { return a.component === 'widget'; }).forEach(function (a) {
      if (!usesWidget(model, a.widget)) return;
      var w = widgets.filter(function (x) { return x.name === a.widget; })[0];
      if (!w) {
        w = { name: a.widget, advisories: [], text: '' };
        widgets.push(w);
      }
      w.advisories.push(a.cve);
      w.text = 'A page in this model uses the ' + a.widget + ' widget. The .mpr does not record a widget’s version, so this was not checked: ' +
        a.ranges.map(rangeText).join('; ') + ' ' + a.does + ' (' + a.cve + '). Look at the widget’s file in the project’s widgets folder.';
      notChecked.push({ kind: 'widget', name: a.widget, text: w.text, link: a.link });
    });

    return { checkedOn: CHECKED_ON, source: SOURCE, mendix: mendix, modules: modules, widgets: widgets, matches: all, notChecked: notChecked };
  }

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    if (!model || typeof model !== 'object' || !cache) return check(model);
    if (!cache.has(model)) cache.set(model, check(model));
    return cache.get(model);
  }

  window.MxAdvisories = { CHECKED_ON: CHECKED_ON, SOURCE: SOURCE, list: ADVISORIES, parse: parse, compare: compare, affecting: affecting, check: check, of: of };
})();
