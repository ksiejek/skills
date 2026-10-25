/* MxScout — secrets in the model are masked before an agent sees them (MXS-43).
 *
 * A constant never carries its value past the Worker that reads the .mpr
 * (mpr.js keeps a verdict instead). Everything else in the model is read as
 * written: a microflow's expressions, a REST call's headers, a Java action's
 * arguments, an attribute's default. Someone who pasted a key, a password or
 * a token there hands it to whoever reads the AI pack. This file finds those
 * and puts a mask in their place, saying what was there in words that do not
 * quote it — the same words mpr.js uses for a constant.
 *
 * What counts:
 *   a shape     anywhere in the text: a private key block, an AWS access key
 *               id, a signed token (JWT), a Stripe, GitHub, Slack or Google
 *               key, a password in an address (user:password@host — the
 *               password only), a password in a connection string, a secret
 *               in a JSON setting, "Bearer …" or "Basic …" with a credential.
 *   a literal   a string in quotes ('…' as Mendix writes them, or "…") that is
 *               long and random-looking, as a key is; or any literal without
 *               spaces right after a word that names a secret (password,
 *               secret, api key, token, authorization, credential).
 * A name is never masked, nor a $variable, a GUID, an address without a
 * password, a path or a sentence. A mask keeps the quotes and never changes
 * the number of lines, so the pack's index still points at the right lines.
 *
 * Used by describe.js pack() — every AI pack, so Share with an agent, the
 * project folder's ai-pack.md, the skill and npm run push — and by push.js
 * and team-projects.js on the model itself, so a Team server never keeps one.
 *
 * PURE: no DOM, no storage, no network. In the browser and in a vm it is
 * window.MxRedact; required from Node it is module.exports.
 */
(function (root) {
  'use strict';

  var MASK = 'masked by MxScout: ';
  var SHAPES = [
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, 'a private key'],
    [/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, 'an AWS access key id'],
    [/\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g, 'a signed token (JWT)'],
    [/\b(sk|rk)_(live|test)_[0-9A-Za-z]{10,}/g, 'a Stripe secret key'],
    [/\bgh[pousr]_[0-9A-Za-z]{20,}/g, 'a GitHub token'],
    [/\bxox[abposr]-[0-9A-Za-z-]{10,}/g, 'a Slack token'],
    [/\bAIza[0-9A-Za-z_-]{35}/g, 'a Google API key']
  ];
  // These keep what is around the secret and mask the secret alone (the group named last).
  var AROUND = [
    [/(\b[a-z][a-z0-9+.-]*:\/\/[^\/\s:@'"]+:)([^\/\s@'"]+)(@)/gi, 'a password in an address'],
    [/((?:^|[;'"\s])(?:password|pwd|accountkey|sharedaccesskey|clientsecret)\s*=\s*)([^;\s'"]+)/gi, 'a password in a connection string'],
    [/("(?:client_?secret|password|passwd|api_?key|secret|private_?key|access_?token)"\s*:\s*")([^"]+)(")/gi, 'a secret in a JSON setting'],
    [/(\b(?:Bearer|Basic)\s+)([A-Za-z0-9+\/=._~-]{12,})/g, 'a credential in an Authorization header']
  ];
  var NAMED = /(pass(word|wd)?|pwd|secret|api[ _-]?key|token|authori[sz]ation|credential|private[ _-]?key)\W{0,8}$/i;
  var LITERAL = /'((?:[^'\n]|'')*)'|"((?:[^"\\\n]|\\.)*)"/g;

  function mask(what) { return '[' + MASK + what + ']'; }
  function lines(s) { var n = 0; for (var i = 0; i < s.length; i++) if (s[i] === '\n') n++; return n; }

  // A literal's own text that is long, random-looking, as a key or a password is (mpr.js constantVerdict).
  function randomLooking(v) {
    if (v.length < 16 || /\s/.test(v) || /^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /^[\/\\.~$@]/.test(v) || /@/.test(v)) return null;
    if (/^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(v)) return null;
    if (/^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(v) || /^[\[{]/.test(v)) return null;
    var counts = {}, n = v.length, h = 0;
    for (var j = 0; j < n; j++) counts[v[j]] = (counts[v[j]] || 0) + 1;
    Object.keys(counts).forEach(function (ch) { var p = counts[ch] / n; h -= p * Math.log(p) / Math.LN2; });
    var classes = (/[a-z]/.test(v) ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/[0-9]/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
    if (/^[0-9a-f]{32,}$/i.test(v) && h >= 3) return 'long, random-looking hexadecimal text, as a key is';
    if (h >= 3.5 && classes >= 2 && /[0-9]/.test(v)) return 'long, random-looking text, as a key or a password is';
    return null;
  }

  // { text, count, kinds: { what: n } } — text with every secret masked.
  function text(s) {
    var out = { text: typeof s === 'string' ? s : '', count: 0, kinds: {} };
    if (!out.text) return out;
    function hit(what) { out.count++; out.kinds[what] = (out.kinds[what] || 0) + 1; }
    var t = out.text;
    SHAPES.forEach(function (sh) {
      t = t.replace(sh[0], function (m) { hit(sh[1]); return mask(sh[1]) + new Array(lines(m) + 1).join('\n'); });
    });
    AROUND.forEach(function (a) {
      t = t.replace(a[0], function () {
        var g = Array.prototype.slice.call(arguments, 1, -2);
        if (g[1].indexOf(MASK) >= 0 || /^[$@]/.test(g[1])) return g.join('');
        hit(a[1]);
        return g[0] + mask(a[1]) + (g[2] || '');
      });
    });
    t = t.replace(LITERAL, function (m, single, double, at, all) {
      var q = single !== undefined ? "'" : '"';
      var v = single !== undefined ? single.replace(/''/g, "'") : double;
      if (!v || v.indexOf(MASK) >= 0) return m;
      var why = randomLooking(v);
      if (!why && v.length >= 4 && !/\s/.test(v) && NAMED.test(all.slice(Math.max(0, at - 60), at)) && !/^[$@]/.test(v)) why = 'a value given beside a word that names a secret';
      if (!why) return m;
      hit(why);
      return q + mask(why) + q;
    });
    out.text = t;
    return out;
  }

  // A model (or any JSON value) with every string in it masked the same way: a copy, and how many.
  function model(value) {
    var count = 0;
    function walk(v) {
      if (typeof v === 'string') { var r = text(v); count += r.count; return r.text; }
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        var o = {};
        Object.keys(v).forEach(function (k) { o[k] = walk(v[k]); });
        return o;
      }
      return v;
    }
    var out = walk(value);
    return { model: out, count: count };
  }

  var api = { text: text, model: model, MASK: MASK };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MxRedact = api;
})(typeof window !== 'undefined' ? window : this);
