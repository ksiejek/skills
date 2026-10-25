/* MxScout — Marketplace modules: what each one is, whether the app uses it,
 * and which user roles hold its roles.
 *
 * WHY. A Marketplace module is somebody else's code, installed in a minute
 * and then forgotten. The documentation used to leave these modules out, so
 * whatever was true of them had nowhere to land — and the one thing that
 * matters most about them is not in their code at all but in App Security:
 * somebody installs Excel Importer, gives its configuration role to the
 * ordinary user role so a test works, and from then on every user can run
 * imports into the app's tables (Karol, 2026-10-18).
 *
 * WHAT IT SAYS, per Marketplace module (modules[].fromAppStore), from the
 * model alone:
 *   - what the module is, from CATALOGUE below (one or two sentences and the
 *     Mendix documentation page), or "not in the catalogue";
 *   - the version it came in at (modules[].version, mpr.js reads AppStoreVersion);
 *   - whether the app USES it: something of the app's own calls one of its
 *     flows, shows or places one of its pages, snippets or layouts, reads,
 *     creates or is associated with one of its entities, specializes one,
 *     or names one of its actions, constants or enumerations — or a
 *     Marketplace module the app uses needs it. A module with nothing the
 *     model can follow (widgets, JavaScript actions, styling) that nothing
 *     names is "not known", never "unused";
 *   - each module role: the user roles that carry it, what it may do in the
 *     module (its entities, flows and pages), and whether it is the module's
 *     ADMINISTRATIVE role.
 *
 * THE ADMINISTRATIVE ROLE. The catalogue's word wins; a role the catalogue
 * does not list is administrative when its name says so (Admin,
 * Administrator, Manager — not a read-only variant), or when it may create
 * and delete, with no XPath, every entity of the module that has access
 * rules AND run a configuration, import or export flow of it.
 *
 * THE APPLICATION'S ADMINISTRATOR: the user role App Security names as the
 * administrator's (security.adminUserRole), and any user role that may
 * manage every role (manageAllRoles).
 *
 * WHAT IT CONCLUDES:
 *   FINDING  — an administrative module role of a Marketplace module carried
 *              by a user role that is not the application's administrator.
 *   WORTH KNOWING — a Marketplace module installed and not used (Mendix:
 *              remove what the app does not use); a module role carried by a
 *              user role and named by nothing in its module.
 *
 * WHERE THE CATALOGUE CAME FROM. Each entry was written on CHECKED_ON from the
 * module's page on docs.mendix.com (the `link`). Role names the Mendix
 * documentation names are `source: 'docs'`; a role the documentation does
 * not name is listed only when it was seen in a real model (`source:
 * 'model'`), and what it may do is then what that model's access rules gave
 * it at the version named — never guessed. The skill's
 * reference/marketplace-modules.md is made from this table
 * (tools/build-marketplace.js), so the two cannot disagree.
 *
 * A pure function of the model: no DOM, no state, nothing sent anywhere.
 * Every text here is set as text by whoever draws it.
 */
(function () {
  'use strict';

  var CHECKED_ON = '2026-10-19';
  var DOCS = 'https://docs.mendix.com/appstore/modules/';

  // name: the module's name in Studio Pro; match: other names it is installed under.
  // roles: [{ name, admin, may, source: 'docs' | 'model', version? }] — source 'docs': the Mendix documentation names the role;
  // 'model': only a real model does. `version`: the module version at which what the role may do was read from a real model's
  // access rules (where the documentation does not say it); without it, `may` is the documentation's.
  var CATALOGUE = [
    { name: 'Administration', link: DOCS + 'administration/',
      about: 'Pages for managing the app’s own local user accounts, with read-only views of active sessions, scheduled events and runtime statistics.',
      roles: [
        { name: 'Administrator', admin: true, source: 'docs', may: 'Creates and deletes accounts, reads and changes other accounts’ name and email, and sets other users’ passwords.' },
        { name: 'User', source: 'docs', may: 'Edits its own name and email and reads other users’ name and email; the documentation says the finer roles replace it.' },
        { name: 'ReadOwnDetails', source: 'docs', may: 'Reads its own name and email.' },
        { name: 'EditOwnDetails', source: 'docs', may: 'Reads and edits its own name and email.' },
        { name: 'EditOwnPassword', source: 'docs', may: 'Changes its own password.' },
        { name: 'ReadOthersFullName', source: 'docs', may: 'Reads other users’ full names.' },
        { name: 'ReadOthersEmail', source: 'docs', may: 'Reads other users’ email addresses.' }
      ] },
    { name: 'AmazonTranslateConnector', link: DOCS + 'aws/amazon-translate/',
      about: 'Translates text through Amazon Translate, lists its languages and manages custom terminology; it signs in to AWS through AWS Authentication.',
      roles: [] },
    { name: 'Atlas_Core', link: DOCS + 'atlas-core/',
      about: 'The base look of the app: the layouts, the styling and the design properties its widgets use.',
      roles: [] },
    { name: 'Atlas_Web_Content', link: 'https://docs.mendix.com/howto/front-end/get-started/',
      about: 'Ready-made page templates and building blocks for web pages; it comes with the blank starter app and may be removed.',
      roles: [{ name: 'Anonymous', source: 'model', version: '3.8.0', may: 'Runs the sign-in flows of the module’s login page (ACT_Login, DS_LoginContext) and their non-persistable LoginContext.' }] },
    { name: 'AuditTrail', link: DOCS + 'audit-trail/',
      about: 'Keeps a history of changes to chosen records — what changed, when and by whom — as the whole record or only the changed fields.',
      roles: [
        { name: 'MxAdministrator', admin: true, source: 'model', version: '10.2.2', may: 'Reads the change log and may create and delete log entries (all five of the module’s entities with rules), on the log pages.' },
        { name: 'BasicRightsAudittrail', source: 'model', version: '10.2.2', may: 'Reads the change log on the log pages.' }
      ] },
    { name: 'AWSAuthentication', link: DOCS + 'aws/aws-authentication/',
      about: 'Holds the AWS credentials — fixed keys or short-lived ones — that the other AWS connectors sign in with.',
      roles: [
        { name: 'Admin', admin: true, source: 'model', version: '4.0.0', may: 'Edits, saves, validates and deletes the AWS credential settings.' },
        { name: 'User', source: 'model', version: '4.0.0', may: 'Nothing in the module’s pages or flows.' }
      ] },
    { name: 'Calendar', link: DOCS + 'calendar-module/',
      about: 'Shows calendar events and lets users create and move them.',
      roles: [
        { name: 'User', source: 'model', version: '2.2.0', may: 'Creates, changes and deletes calendar events.' },
        { name: 'Viewer', source: 'model', version: '2.2.0', may: 'Reads calendar events.' }
      ] },
    { name: 'CommunityCommons', link: DOCS + 'community-commons-function-library/',
      about: 'A toolbox of reusable server-side actions for dates, text, files, batches and configuration.',
      roles: [
        { name: 'Administrator', source: 'model', version: '11.1.0', may: 'Full rights on two non-persistable helper entities (ImageDimensions, SplitItem); no page or flow.' },
        { name: 'User', source: 'model', version: '11.1.0', may: 'Full rights on two non-persistable helper entities (ImageDimensions, SplitItem); no page or flow.' }
      ] },
    { name: 'CopyToClipboard', link: null,
      about: 'A widget that copies a value to the clipboard (no page on docs.mendix.com).',
      roles: [] },
    { name: 'DataWidgets', link: DOCS + 'data-widgets/',
      about: 'Widgets for lists and tables of data — Data Grid 2, Gallery, filters, sorting, selection and tree node — and an export to Excel.',
      roles: [{ name: 'User', source: 'model', version: '3.9.0', may: 'Nothing in the module’s pages, flows or entities.' }] },
    { name: 'Email_Connector', match: /^email_?connector$/i, link: DOCS + 'email-connector/',
      about: 'Sends and receives email through the organisation’s own mail server, with templates, signing and encryption, as building blocks rather than a finished feature.',
      roles: [
        { name: 'EmailConnectorAdmin', admin: true, source: 'docs', version: '6.2.0', may: 'Configures the email accounts, templates and keys; the documentation asks to review its preset access before giving it to anyone.' },
        { name: 'ServiceDeskUser', source: 'model', version: '6.2.0', may: 'Reads two of the module’s entities and writes one.' }
      ] },
    { name: 'Encryption', link: DOCS + 'encryption/',
      about: 'Encrypts and decrypts stored text, such as passwords to other systems, with a key kept on the server; it can also encrypt files.',
      roles: [{ name: 'User', admin: true, source: 'model', version: '11.0.0', may: 'Opens the module’s key and certificate pages (CertificateManagement, PrivateKey_NewEdit) and creates and deletes PGP certificates and stored passwords — the module’s only role, and an administrative one.' }] },
    { name: 'ExcelImporter', match: /^excel_?importer$/i, link: DOCS + 'excel-importer/',
      about: 'Imports Excel sheets into the app’s data by a mapping of columns to attributes, creating or changing records.',
      roles: [
        { name: 'Configurator', admin: true, source: 'model', version: '11.1.0', may: 'Creates, changes and deletes import templates and runs imports into any entity a template names.' },
        { name: 'Readonly', source: 'model', version: '11.1.0', may: 'Reads the import templates.' }
      ] },
    { name: 'FileUploader', link: DOCS + 'file-uploader/',
      about: 'A drag-and-drop upload widget for files and images, several at once, with previews.',
      roles: [{ name: 'User', source: 'model', version: '2.2.1', may: 'Uploads files and images (creates and deletes the module’s file documents).' }] },
    { name: 'MCPServer', link: 'https://docs.mendix.com/agents/agents-kit-2/reference-guide/mcp-modules/mcp-server/',
      about: 'Opens the app to outside AI tools through the Model Context Protocol, offering chosen microflows as tools and prompts; without an authentication microflow anyone can reach it.',
      roles: [] },
    { name: 'MxModelReflection', link: DOCS + 'model-reflection/',
      about: 'Gives the running app a readable copy of its own entities, attributes and microflows, mostly to pick them in configuration pages.',
      roles: [
        { name: 'ModelAdministrator', admin: true, source: 'docs', version: '9.1.0', may: 'Creates and deletes the records of the model copy and opens its pages (the documentation gives it to the Administrator role).' },
        { name: 'Readonly', source: 'docs', version: '9.1.0', may: 'Reads the model copy.' },
        { name: 'TokenUser', source: 'docs', version: '9.1.0', may: 'Reads the model copy and creates and deletes tokens and test patterns.' }
      ] },
    { name: 'NanoflowCommons', link: DOCS + 'nanoflow-commons/',
      about: 'Common client-side actions for web and mobile — device storage, navigation, device features; what it keeps on the device is outside entity access.',
      roles: [{ name: 'User', source: 'model', version: '5.2.1', may: 'Full rights on two non-persistable entities (Geolocation, Position); no page or flow.' }] },
    { name: 'NativeMobileResources', link: DOCS + 'native-mobile-resources/',
      about: 'Widgets and actions for native and hybrid mobile apps.',
      roles: [{ name: 'User', source: 'model', version: '10.1.17', may: 'Full rights on two non-persistable entities (DeviceInfo, ImageMetaData); no page or flow.' }] },
    { name: 'OQL', link: DOCS + 'oql-module/',
      about: 'Lets microflows run free-form OQL queries and get rows, counts or a CSV file; the query is not checked and runs without entity access.',
      roles: [{ name: 'Administrator', admin: true, source: 'model', version: '4.0.0', may: 'Runs OQL queries of its own on the example pages (ACT_ExecuteOQL).' }] },
    { name: 'PushNotifications', link: DOCS + 'push-notifications/',
      about: 'Sends notifications to users’ phones and browsers when they are not using the app.',
      roles: [
        { name: 'Administrator', admin: true, source: 'model', version: '8.0.3', may: 'Configures the messaging services and keys and manages registered devices.' },
        { name: 'User', source: 'model', version: '8.0.3', may: 'Registers its own device for notifications.' },
        { name: 'Anonymous', source: 'model', version: '8.0.3', may: 'Registers a device for notifications before signing in.' }
      ] },
    { name: 'SAML20', match: /^saml(20)?$/i, link: DOCS + 'saml/',
      about: 'Single sign-on with SAML 2.0: users sign in at the organisation’s identity provider, and accounts can be created on first sign-in with a set user role.',
      roles: [
        { name: 'Administrator', admin: true, source: 'model', version: '4.2.3', may: 'Configures identity providers, keys, attribute mapping and user provisioning.' },
        { name: 'Admin_ReadSAMLEntities', source: 'model', version: '4.2.3', may: 'Reads the SAML configuration and log.' }
      ] },
    { name: 'UserCommons', link: DOCS + 'oidc/',
      about: 'The user provisioning shared by the OIDC, SAML and SCIM modules (no page of its own on docs.mendix.com).',
      roles: [
        { name: 'Administrator', admin: true, source: 'docs', version: '2.4.0', may: 'Configures user provisioning and claims (the OIDC documentation gives it to the Administrator role).' },
        { name: 'Admin_ReadOnly', source: 'model', version: '2.4.0', may: 'Reads the provisioning configuration.' }
      ] },
    { name: 'WebActions', link: DOCS + 'web-actions/',
      about: 'Small browser actions: move the focus, scroll to an element, take a picture with the camera.',
      roles: [] },
    { name: 'ZipHandling', link: null,
      about: 'Java actions to zip and unzip files (no page on docs.mendix.com).',
      roles: [{ name: 'User', source: 'model', version: '5.0.2', may: 'Nothing in the module’s pages, flows or entities.' }] },
    { name: 'OIDC', match: /^oidc$/i, link: DOCS + 'oidc/',
      about: 'Single sign-on with OpenID Connect; it can take user roles from the identity provider’s token and protect the app’s APIs with access tokens.',
      roles: [
        { name: 'Administrator', admin: true, source: 'docs', may: 'Configures the identity providers on OIDC_Client_Overview.' },
        { name: 'User', source: 'docs', may: 'Signs in through OIDC.' }
      ] },
    { name: 'LDAP', match: /^ldap(module)?$/i, link: DOCS + 'ldap/',
      about: 'Synchronises users, their groups and active state from a directory such as Active Directory, maps groups to user roles, and can require an LDAP sign-in.',
      roles: [{ name: 'LdapAdmin', admin: true, source: 'docs', may: 'Configures the directory connection, the synchronisation and the group-to-role mapping.' }] },
    { name: 'ForgotPassword', match: /^forgot_?password$/i, link: DOCS + 'forgot-password/',
      about: 'Self-service sign-up and password reset for local accounts by an emailed link.',
      roles: [
        { name: 'Administrator', admin: true, source: 'docs', may: 'Sets the email template and deep link and sees open reset requests — the documentation says for the administrator only.' },
        { name: 'Guest_ResetPassword', source: 'docs', may: 'Asks for a password reset (for the guest and the signed-in user).' },
        { name: 'Guest_SignUp', source: 'docs', may: 'Signs up (for the guest).' }
      ] },
    { name: 'WorkflowCommons', match: /^workflow_?commons$/i, link: DOCS + 'workflow-commons/',
      about: 'A starting kit for workflows: a task inbox, dashboards, an admin centre and reassigning the tasks of people who leave.',
      roles: [
        { name: 'Administrator', admin: true, source: 'docs', may: 'Administers workflows, sees workflow and task performance and the workflow audit trail.' },
        { name: 'User', source: 'docs', may: 'Completes its user tasks, sees its own performance and follows the workflows it started.' }
      ] }
  ];

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function modOf(qn) { qn = str(qn); var i = qn.indexOf('.'); return i < 0 ? '' : qn.slice(0, i); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function list(a) { a = a || []; return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  function lookup(name) {
    var n = str(name).toLowerCase();
    var hit = CATALOGUE.filter(function (c) { return c.name.toLowerCase() === n; })[0];
    return hit || CATALOGUE.filter(function (c) { return c.match && c.match.test(str(name)); })[0] || null;
  }

  // A role's name says it administers: Admin, Administrator, Manager — not a read-only variant of one.
  var ADMIN_NAME = /admin|manager/i, READ_ONLY = /read|view|only/i;
  var CONFIG_FLOW = /config|setting|setup|import|export|template|mapping|admin/i;
  // Kinds of caller that are the application itself rather than a module.
  var APP_LEVEL = { menu: true, navigation: true, 'App Settings': true };

  // Every "Module.Name" string in what an element is made of — its drawing, its data sources, its widgets — that
  // names a Marketplace module. Its own callers and its documentation are not what it uses.
  function scan(x, market, found, depth) {
    if (depth > 14 || x === null || x === undefined) return;
    if (typeof x === 'string') {
      var i = x.indexOf('.');
      if (i > 0) {
        var m = x.slice(0, i);
        if (market[m] && /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_]/.test(x)) found[m] = found[m] || x;
      }
      return;
    }
    if (typeof x !== 'object') return;
    if (Array.isArray(x)) { for (var k = 0; k < x.length; k++) scan(x[k], market, found, depth + 1); return; }
    for (var key in x) {
      if (key === 'calledBy' || key === 'documentation' || key === 'caption' || key === 'title' || key === 'text') continue;
      scan(x[key], market, found, depth + 1);
    }
  }

  function check(model) {
    model = model || {};
    var market = {}, mods = (model.modules || []).filter(function (m) { return m && m.name && m.fromAppStore; });
    mods.forEach(function (m) { market[m.name] = true; });
    var out = { checkedOn: CHECKED_ON, modules: [], findings: [], notes: [], appAdmins: [], counts: { modules: mods.length, used: 0, unused: 0, unknown: 0, catalogued: 0, findings: 0, notes: 0 } };
    if (!mods.length) return out;

    var sec = model.security || {};
    var admins = {};
    if (sec.adminUserRole) admins[sec.adminUserRole] = true;
    (model.userRoles || []).forEach(function (u) { if (u && u.manageAllRoles) admins[u.name] = true; });
    out.appAdmins = Object.keys(admins).sort();

    // What is in each module, by kind, so a name can say what it is.
    var kindOf = {}, size = {};
    mods.forEach(function (m) { size[m.name] = { microflows: 0, nanoflows: 0, pages: 0, snippets: 0, entities: 0 }; });
    [['microflows', 'flow'], ['nanoflows', 'flow'], ['pages', 'page'], ['snippets', 'snippet'], ['entities', 'entity']].forEach(function (p) {
      (model[p[0]] || []).forEach(function (x) {
        if (!x || !x.qualifiedName) return;
        kindOf[x.qualifiedName] = p[1];
        var mm = x.module || modOf(x.qualifiedName);
        if (size[mm]) size[mm][p[0]]++;
      });
    });
    function verb(ref) {
      var k = kindOf[ref] || kindOf[ref.split('.').slice(0, 2).join('.')];
      return k === 'flow' ? 'calls' : k === 'page' ? 'shows' : k === 'snippet' ? 'places' : k === 'entity' ? 'uses the entity' : /Layout/i.test(ref) ? 'uses the layout' : 'names';
    }
    function isOwn(name) { var m = modOf(name); return !!m && !market[m] && m !== 'System'; }

    // Who uses what: uses[market module] = [{ from, verb, to }]; needs[A][B] = a Marketplace module A names B.
    var uses = {}, needs = {};
    mods.forEach(function (m) { uses[m.name] = []; needs[m.name] = {}; });
    function record(fromQn, fromMod, found) {
      Object.keys(found).forEach(function (m) {
        if (m === fromMod) return;
        if (market[fromMod]) { needs[fromMod][m] = true; return; }
        if (uses[m].length < 200) uses[m].push({ from: fromQn, verb: verb(found[m]), to: found[m] });
      });
    }
    ['microflows', 'nanoflows', 'pages', 'snippets', 'entities', 'publishedServices', 'automation'].forEach(function (k) {
      (model[k] || []).forEach(function (x) {
        if (!x) return;
        var from = x.module || modOf(x.qualifiedName);
        if (!from || from === 'System') return;
        var found = {};
        scan(x, market, found, 0);
        record(x.qualifiedName || x.name, from, found);
      });
    });
    (model.associations || []).forEach(function (a) {
      if (!a) return;
      [[a.owner, a.other], [a.other, a.owner]].forEach(function (p) {
        var m = modOf(p[1]);
        if (!market[m]) return;
        var fm = modOf(p[0]);
        if (isOwn(p[0])) uses[m].push({ from: p[0], verb: 'is associated with', to: p[1] });
        else if (market[fm] && fm !== m) needs[fm][m] = true;
      });
    });
    // Called from the navigation, the menus or App Settings: the app itself.
    ['microflows', 'nanoflows', 'pages'].forEach(function (k) {
      (model[k] || []).forEach(function (x) {
        var m = x && (x.module || modOf(x.qualifiedName));
        if (!m || !market[m]) return;
        (x.calledBy || []).forEach(function (c) {
          if (!c) return;
          if (APP_LEVEL[c.kind]) uses[m].push({ from: c.kind === 'App Settings' ? 'App Settings' : 'the ' + c.kind, verb: k === 'pages' ? 'shows' : 'calls', to: x.qualifiedName });
          else if (c.name && isOwn(c.name) && !uses[m].some(function (u) { return u.from === c.name && u.to === x.qualifiedName; })) uses[m].push({ from: c.name, verb: k === 'pages' ? 'shows' : 'calls', to: x.qualifiedName });
        });
      });
    });

    // Used: by the app's own, or needed by a Marketplace module the app uses.
    var used = {}, via = {};
    mods.forEach(function (m) { if (uses[m.name].length) used[m.name] = true; });
    for (var changed = true; changed;) {
      changed = false;
      mods.forEach(function (m) {
        if (!used[m.name]) return;
        Object.keys(needs[m.name]).forEach(function (n) { if (!used[n]) { used[n] = true; via[n] = m.name; changed = true; } });
      });
    }

    var byUser = {};
    (model.userRoles || []).forEach(function (u) { (u.moduleRoles || []).forEach(function (mr) { (byUser[mr] = byUser[mr] || []).push(u.name); }); });

    mods.slice().sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; }).forEach(function (m) {
      var cat = lookup(m.name), s = size[m.name];
      var traceable = s.microflows + s.nanoflows + s.pages + s.snippets + s.entities > 0;
      var state = used[m.name] ? 'used' : traceable ? 'unused' : 'unknown';
      var ents = (model.entities || []).filter(function (e) { return e && e.module === m.name; });
      var ruled = ents.filter(function (e) { return e.persistable !== false && (e.accessRules || []).length; });
      var flows = (model.microflows || []).concat(model.nanoflows || []).filter(function (f) { return f && f.module === m.name; });
      var pages = (model.pages || []).filter(function (p) { return p && p.module === m.name; });
      var services = (model.publishedServices || []).filter(function (p) { return p && modOf(p.qualifiedName) === m.name; });
      var roles = (model.moduleRoles || []).filter(function (r) { return r && r.module === m.name; }).map(function (r) {
        var qn = r.qualifiedName || m.name + '.' + r.name;
        var access = { entities: [], flows: [], pages: [] };
        ents.forEach(function (e) {
          var rule = (e.accessRules || []).filter(function (x) { return x.moduleRole === qn; })[0];
          if (!rule) return;
          var write = 0;
          [rule.attrAccess || {}, rule.assocAccess || {}].forEach(function (mm) { Object.keys(mm).forEach(function (k) { if (mm[k] === 'rw') write++; }); });
          access.entities.push({ entity: e.qualifiedName, create: !!rule.allowCreate, delete: !!rule.allowDelete, write: write, xpath: rule.xpathConstraint || null });
        });
        flows.forEach(function (f) { if ((f.allowedModuleRoles || []).indexOf(qn) !== -1) access.flows.push(f.qualifiedName); });
        pages.forEach(function (p) { if ((p.allowedModuleRoles || []).indexOf(qn) !== -1) access.pages.push(p.qualifiedName); });
        var inService = services.some(function (sv) { return (sv.allowedModuleRoles || []).indexOf(qn) !== -1; });
        var catRole = cat ? (cat.roles || []).filter(function (x) { return x.name.toLowerCase() === str(r.name).toLowerCase(); })[0] : null;
        var admin = false, why = null;
        if (catRole) { admin = !!catRole.admin; why = admin ? 'catalogue' : null; }
        else if (ADMIN_NAME.test(r.name) && !READ_ONLY.test(r.name)) { admin = true; why = 'name'; }
        else if (ruled.length && ruled.every(function (e) {
          var x = access.entities.filter(function (a) { return a.entity === e.qualifiedName; })[0];
          return x && x.create && x.delete && !x.xpath;
        }) && access.flows.some(function (f) { return CONFIG_FLOW.test(f.slice(f.indexOf('.') + 1)); })) { admin = true; why = 'full access'; }
        var unusedRole = !access.entities.length && !access.flows.length && !access.pages.length && !inService;
        return { moduleRole: qn, name: r.name, admin: admin, why: why, may: catRole ? catRole.may : null, catalogued: !!catRole,
          userRoles: (byUser[qn] || []).slice().sort(), access: access, unused: unusedRole };
      });
      var row = { name: m.name, version: m.version || null, catalogued: !!cat, about: cat ? cat.about : null, link: cat ? cat.link : null,
        used: state, uses: uses[m.name].slice(0, 12), usesCount: uses[m.name].length, neededBy: via[m.name] || null,
        size: s, roles: roles };
      out.modules.push(row);
      out.counts[state === 'used' ? 'used' : state]++;
      if (cat) out.counts.catalogued++;

      roles.forEach(function (r) {
        // A name that says Admin or Manager is a hint: the role is shown to administer only by the catalogue, or by
        // what it may do in the module — a create, delete or write right, a flow or a page of its own.
        var does = r.access.entities.some(function (a) { return a.create || a.delete || a.write; }) || r.access.flows.length || r.access.pages.length;
        var sure = r.why !== 'name' || does;
        if (r.admin) r.userRoles.forEach(function (u) {
          if (admins[u]) return;
          out.findings.push({ kind: 'admin-role', module: m.name, moduleRole: r.moduleRole, userRole: u, why: r.why,
            confidence: sure ? 'confirmed' : 'suspected',
            doubts: sure ? [] : ['Only its name says ' + r.moduleRole + ' administers ' + m.name + ': it holds no create, delete or write right, flow or page there that MxScout sees — look at what it is for.'],
            evidence: sure ? [r.why === 'catalogue' ? 'The catalogue built into MxScout names ' + r.moduleRole + ' the administrative role of ' + m.name + '.' : r.why === 'full access' ? r.moduleRole + ' may create and delete every entity of ' + m.name + ' it has a rule on, and run its configuration flows.' :
              r.moduleRole + ' may ' + [r.access.entities.some(function (a) { return a.create || a.delete || a.write; }) ? 'change data of ' + m.name : null, r.access.flows.length ? 'run ' + r.access.flows.length + ' of its flows' : null, r.access.pages.length ? 'open ' + r.access.pages.length + ' of its pages' : null].filter(Boolean).join(', ') + '.'] : [],
            text: 'User role "' + u + '" carries ' + r.moduleRole + ', the administrative role of the Marketplace module ' + m.name + ' — ' + mayText(r) +
              ' "' + u + '" is not the application’s administrator' + (out.appAdmins.length ? ' (' + list(out.appAdmins.map(function (a) { return '"' + a + '"'; })) + ')' : '') + ', so everybody given it may do the same.',
            fix: 'Take ' + r.moduleRole + ' off the user role "' + u + '" in App Security › User roles, and give it to the administrator — or to a user role made for the few people who really run ' + m.name + '.' });
        });
        if (r.unused && r.userRoles.length) out.notes.push({ kind: 'unused-role', module: m.name, moduleRole: r.moduleRole, userRoles: r.userRoles,
          text: list(r.userRoles.map(function (u) { return '"' + u + '"'; })) + (r.userRoles.length === 1 ? ' carries ' : ' carry ') + r.moduleRole + ', which nothing in ' + m.name + ' names: no access rule, flow, page or published service of the module is for it.',
          fix: 'Take ' + r.moduleRole + ' off ' + (r.userRoles.length === 1 ? 'that user role' : 'those user roles') + ' in App Security, unless a newer version of the module needs it.' });
      });
      if (state === 'unused') out.notes.push({ kind: 'unused-module', module: m.name, moduleRole: null, userRoles: [],
        text: 'The Marketplace module ' + m.name + (m.version ? ' ' + m.version : '') + ' is installed and nothing of the app’s own uses it: no flow, page or entity of the app calls its flows, shows its pages, uses its entities or names anything in it' +
          ', and no Marketplace module the app uses needs it. Mendix’s security best practices say to remove unused modules: an unused module still brings its pages, flows, roles and access rules.',
        fix: 'Delete ' + m.name + ' in App Explorer (and its module roles from the user roles), after checking nothing outside the model needs it — a widget, a Java action, a deployment setting. Deleting a module deletes its data in the database.' });
    });
    out.counts.findings = out.findings.length;
    out.counts.notes = out.notes.length;
    return out;
  }

  // What an administrative role may do, in a sentence: the catalogue's words, or what the model gives it.
  function mayText(r) {
    if (r.may) return r.may.replace(/\.?$/, '.');
    var a = r.access, c = a.entities.filter(function (e) { return e.create; }).length, d = a.entities.filter(function (e) { return e.delete; }).length;
    var bits = [];
    if (a.entities.length) bits.push('it reads ' + plural(a.entities.length, 'entity', 'entities') + ' of the module' + (c || d ? ', creating objects of ' + c + ' and deleting objects of ' + d : ''));
    if (a.flows.length) bits.push('runs ' + plural(a.flows.length, 'of its flows', 'of its flows').replace(/^1 of its flows/, 'one of its flows'));
    if (a.pages.length) bits.push('opens ' + plural(a.pages.length, 'of its pages', 'of its pages').replace(/^1 of its pages/, 'one of its pages'));
    return bits.length ? bits.join(', ') + '.' : 'the module gives it nothing today, but a role of that kind is meant to administer it.';
  }

  // One line about a module, for the AI pack and the documentation: what it is, or that it is not in the catalogue.
  function aboutText(row) {
    if (row.about) return row.about;
    var s = row.size;
    return 'Not in the catalogue — described from its name and its contents: ' + [plural(s.microflows + s.nanoflows, 'flow', 'flows'), plural(s.pages, 'page', 'pages'), plural(s.entities, 'entity', 'entities')].join(', ') + '.';
  }
  function usedText(row) {
    if (row.used === 'used') {
      if (!row.usesCount && row.neededBy) return 'used — the Marketplace module ' + row.neededBy + ', which the app uses, needs it';
      var u = row.uses[0];
      return 'used — ' + u.from + ' ' + u.verb + ' ' + u.to + (row.usesCount > 1 ? ' (and ' + (row.usesCount - 1) + ' more)' : '');
    }
    if (row.used === 'unused') return 'not used — nothing of the app’s own calls, shows or uses anything in it';
    return 'not known — it holds nothing the model can follow (widgets, JavaScript or Java actions, styling), and nothing names it';
  }

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    if (!model || typeof model !== 'object' || !cache) return check(model);
    if (!cache.has(model)) cache.set(model, check(model));
    return cache.get(model);
  }

  window.MxMarketplace = { CHECKED_ON: CHECKED_ON, CATALOGUE: CATALOGUE, lookup: lookup, check: check, of: of, mayText: mayText, aboutText: aboutText, usedText: usedText };
})();
