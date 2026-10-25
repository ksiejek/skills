/* MxScout — the app's constants, and which of them hand a secret to the browser.
 *
 * A Mendix constant marked “Expose to client” (ExposedToClient) is sent to
 * every browser that opens the app, in mx.session.sessionData.constants —
 * with anonymous access on, to visitors who have not signed in. Pentesters
 * and scanners read that object first. Until this file, a secret in a
 * constant was found only when an AI agent happened to describe it, so the
 * answer depended on the session; now it is worked out from the model, the
 * same on every load.
 *
 * NEVER A VALUE. mpr.js reads each constant in the Web Worker that parses
 * the .mpr and keeps, of its default value, only whether there is one
 * (`hasDefault`) and a verdict (`defaultVerdict`: 'empty' | 'looks-secret' |
 * 'plain', with `defaultWhy` in words that do not quote it). This file sees
 * the verdict and the name; it has no value to show, and a model imported
 * from JSON is cleaned to the same fields before it is kept (clean()).
 *
 *   P1 finding   a constant exposed to the client whose default value
 *                looks like a secret, or whose name is itself shaped like a
 *                key. Each is also a RISK with a fixed id
 *                ('m:secrets:<Module.Constant>'), so what a person decides
 *                about it on the Risks page (triage.js) holds across loads.
 *   to verify    (P2, "To verify: …") one exposed to the client that only its
 *                NAME calls a secret (password, secret, token, key, …): what
 *                value an environment gives it is not in the model. A name is
 *                a hint, never proof either way — the same id, so a decision
 *                about it holds.
 *   worth knowing  a secret-looking constant that has a default value in
 *                the model (Mendix advises leaving it empty there and
 *                setting it per environment at deployment), and a name
 *                that is itself shaped like a key.
 *   the list     every constant exposed to the client, by name, with its
 *                verdict.
 * Marketplace modules are checked too, and say so (fromAppStore).
 *
 * PURE: no DOM, no storage, no network. security.js draws what it returns;
 * the skill's engine carries the same file byte for byte.
 *
 * Model shape read: model.meta.readsConstants, model.constants[{ module,
 * name, qualifiedName, type, exposedToClient, hasDefault, defaultVerdict,
 * defaultWhy?, nameWhy?, excluded? }], model.modules[{ name, fromAppStore }],
 * model.security{ guestAccess }.
 */
(function () {
  'use strict';

  // Words that make a name a secret wherever they sit in it…
  var STRONG = /password|passwd|passphrase|secret|token|apikey|api_key|privatekey|private_key|credential|accesskey|access_key/i;
  // …and short ones that do only as a whole word of the name (Api·Key, Bridge·Pass, sms_pwd), so
  // Keyboard, Passage and Bypass do not.
  var WEAK = { key: true, pass: true, pwd: true, pw: true, pin: true };
  // A public key is meant to be public; and a name that ends in what it is about (Token·Url,
  // ApiKey·Header, Password·Length) names a setting beside the secret, not the secret.
  var PUBLIC = /public|publishable/i;
  var BESIDE = { url: true, uri: true, endpoint: true, host: true, path: true, header: true, name: true, expiry: true, lifetime: true, length: true, type: true, policy: true };

  function words(name) {
    return String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\s_\-.]+/).filter(Boolean).map(function (w) { return w.toLowerCase(); });
  }
  function secretName(name) {
    var n = String(name || '');
    var w = words(n);
    if (!n || PUBLIC.test(n) || (w.length > 1 && BESIDE[w[w.length - 1]])) return false;
    if (STRONG.test(n)) return true;
    return w.some(function (x) { return WEAK[x]; });
  }

  // A model imported from JSON (an MxSonar export) may carry a constant's value under any name: only these
  // fields are kept, and nothing is read out of the rest.
  function clean(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (c) { return c && typeof c === 'object' && typeof c.qualifiedName === 'string'; }).map(function (c) {
      var qn = c.qualifiedName, dot = qn.indexOf('.');
      return {
        module: typeof c.module === 'string' ? c.module : dot > 0 ? qn.slice(0, dot) : '',
        name: typeof c.name === 'string' ? c.name : dot > 0 ? qn.slice(dot + 1) : qn,
        qualifiedName: qn, type: typeof c.type === 'string' ? c.type : 'String',
        exposedToClient: c.exposedToClient === true
      };
    });
  }

  function check(model) {
    model = model || {};
    var list = Array.isArray(model.constants) ? model.constants : [];
    var out = { state: 'checked', anonymous: !!(model.security && model.security.guestAccess), list: [], exposed: [], findings: [], notes: [], risks: [] };
    if (!list.length) { out.state = model.meta && model.meta.readsConstants ? 'none' : 'not-read'; return out; }
    var market = {};
    (model.modules || []).forEach(function (m) { if (m && m.fromAppStore) market[m.name] = true; });

    list.forEach(function (c0) {
      if (!c0 || !c0.qualifiedName) return;
      var c = {
        qualifiedName: c0.qualifiedName, module: c0.module || String(c0.qualifiedName).split('.')[0], name: c0.name || String(c0.qualifiedName).split('.').slice(1).join('.'),
        type: c0.type || 'String', exposedToClient: c0.exposedToClient === true, excluded: c0.excluded === true,
        hasDefault: c0.hasDefault === true, defaultVerdict: c0.defaultVerdict || 'unknown', defaultWhy: c0.defaultWhy || null, nameWhy: c0.nameWhy || null
      };
      c.marketplace = !!market[c.module];
      c.nameSecret = c.type === 'String' && secretName(c.name);
      c.valueSecret = c.defaultVerdict === 'looks-secret';
      c.secret = !c.excluded && (c.nameSecret || c.valueSecret || !!c.nameWhy);
      c.verdictText = verdictText(c);
      out.list.push(c);
      if (c.exposedToClient && !c.excluded) out.exposed.push(c);

      if (c.secret && c.exposedToClient) {
        // Only the name says so: no value in the model looks like a secret, so the model does not prove one.
        var named = c.nameSecret && !c.valueSecret && !c.nameWhy;
        var f = { kind: 'exposed-secret', priority: named ? 'P2' : 'P1', constant: c.qualifiedName, module: c.module, marketplace: c.marketplace,
          reason: reasonOf(c), key: 'm:secrets:' + c.qualifiedName, confidence: named ? 'suspected' : 'confirmed' };
        if (named) f.doubts = ['Only its name says ' + c.qualifiedName + ' is a secret: ' + (c.defaultVerdict === 'empty' ? 'it has no default value in the model' : c.defaultVerdict === 'plain' ? 'its default value does not look like one' : 'its default value was not judged') +
          ', so whether an environment gives it a secret value is not in the model — look at the deployment’s constants.'];
        else f.evidence = [c.valueSecret ? 'Its default value ' + (c.defaultWhy || 'looks like a secret') + ', and the browser receives it.' : c.nameWhy + ', and the browser receives the name.'];
        f.text = 'Every browser that opens the app receives the constant ' + c.qualifiedName + (c.marketplace ? ' (Marketplace module ' + c.module + ')' : '') +
          ' — Mendix sends constants marked “Expose to client” with the session' +
          (out.anonymous ? ', and anonymous access is on, so visitors who have not signed in receive it too' : '') + '. ' + whyText(c) + '.';
        f.fix = 'Untick “Expose to client” on ' + c.qualifiedName + ' and use it in a microflow on the server. If the browser really needs it, it must not be a secret' +
          ' (a public key, an address); then mark this a false positive and say so.';
        out.findings.push(f);
        if (named) f.text += ' To verify — the model does not prove it: ' + f.doubts[0];
        out.risks.push({
          id: 'model-secrets-' + c.qualifiedName, key: f.key, origin: 'model', level: f.priority, theme: 'secrets', confidence: f.confidence, doubts: f.doubts || null, evidence: f.evidence || null,
          title: (named ? 'To verify: the browser receives the constant ' + c.qualifiedName + ', whose name says it is a secret' : 'The browser receives the constant ' + c.qualifiedName + ', which looks like a secret'),
          detail: f.text, fix: f.fix, where: [c.qualifiedName]
        });
      } else if (c.secret && c.hasDefault) {
        out.notes.push({ kind: 'default-in-model', constant: c.qualifiedName, module: c.module, marketplace: c.marketplace,
          text: c.qualifiedName + (c.marketplace ? ' (Marketplace module ' + c.module + ')' : '') + ' has a default value in the model. ' + whyText(c) +
            '. The value is in every copy of the model, its history and every package; Mendix advises leaving such a constant empty in the model and setting it per environment at deployment.',
          fix: 'Empty the default value of ' + c.qualifiedName + ' and set it in each environment’s configuration; change the secret if the model was ever shared.' });
      }
      if (c.nameWhy && !c.excluded) {
        out.notes.push({ kind: 'name-is-key', constant: c.qualifiedName, module: c.module, marketplace: c.marketplace,
          text: 'The name of ' + c.qualifiedName + ' — ' + c.nameWhy.replace(/^the name itself /, 'itself ') + '. Every screen and file that lists the constants shows it.',
          fix: 'Rename the constant and, if it was a real key, change the key.' });
      }
    });
    return out;
  }
  function reasonOf(c) {
    return c.nameSecret && c.valueSecret ? 'both' : c.nameSecret ? 'name' : c.valueSecret ? 'value' : 'name-shape';
  }
  function whyText(c) {
    var why = [];
    if (c.nameSecret) why.push('its name says it is a secret');
    if (c.valueSecret) why.push('its default value ' + (c.defaultWhy || 'looks like a secret'));
    else if (c.hasDefault && c.nameSecret) why.push('it has a default value in the model');
    if (c.nameWhy) why.push(c.nameWhy);
    var s = why.join(', and ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // The one-line verdict beside a constant — what MxScout concluded, never the value.
  function verdictText(c) {
    if (c.excluded) return 'excluded from the app';
    var parts = [];
    if (c.nameSecret) parts.push('secret by its name');
    if (c.defaultVerdict === 'looks-secret') parts.push('default value ' + (c.defaultWhy || 'looks like a secret'));
    else if (c.defaultVerdict === 'empty') parts.push('no default value');
    else if (c.defaultVerdict === 'plain') parts.push('default value does not look like a secret');
    else parts.push('default value not judged (read from a JSON export)');
    if (c.nameWhy) parts.push(c.nameWhy);
    return parts.join(' · ');
  }

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function of(model) {
    if (!model || typeof model !== 'object' || !cache) return check(model);
    var hit = cache.get(model);
    if (!hit) { hit = check(model); cache.set(model, hit); }
    return hit;
  }
  function risks(model) { return of(model).risks; }
  // What this model cannot say about the constants, so a risk about one is not taken as gone: all of them when
  // the constants were not read, and each whose default value was not judged (a model from a JSON export).
  // → { all: bool, keys: { 'm:secrets:<qn>': why } }
  function unchecked(model) {
    var c = of(model), out = { all: c.state === 'not-read', keys: {} };
    c.list.forEach(function (x) { if (x.defaultVerdict === 'unknown') out.keys['m:secrets:' + x.qualifiedName] = 'its default value was not judged in this model'; });
    return out;
  }

  window.MxConstants = { check: check, of: of, risks: risks, unchecked: unchecked, clean: clean, secretName: secretName, words: words };
})();
