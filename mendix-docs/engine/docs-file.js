/* MxScout — the documentation as one file.
 *
 * MxScout's "Export documentation" (docs.js) writes it in the browser; a
 * tool that reads a .mpr itself can write the same file in Node, loading
 * these same files (Karol, 2026-10-14: "exactly the report MxScout builds").
 * So how the file is put together lives here, once, and each program only
 * says where the stylesheets and scripts come from: fetched from this
 * server, or read from disk.
 *
 * The file: the documentation's data as JSON in a block the browser never
 * runs, the reader (docs-view.js) and the flow screen it shows microflows
 * with (flowview.js and what it draws with), and one stylesheet with its
 * fonts inlined. Nothing in it loads anything from anywhere. */
(function () {
  'use strict';

  // In this order: tokens.css first (its fonts are inlined by the caller, see fontsIn), docs.css last.
  var SHEETS = ['tokens.css', 'explorer.css', 'flowgraph.css', 'studioview.css', 'pagepreview.css', 'microflows.css', 'docs.css'];
  // "Microflows & pages" in the file is MxScout's own Microflows screen (flowview.js, redesign spec
  // 14), so the file carries it and what it draws with — a page with pagepreview.js — as the files themselves, unchanged.
  // The Changes page (docs-changes.js) and the Tickets page (docs-tickets.js) are drawn by files of their own as well, carried the same way.
  var SCRIPTS = ['flowtrace.js', 'flowgraph.js', 'studioview.js', 'pagepreview.js', 'flowview.js', 'docs-changes.js', 'docs-tickets.js'];

  // The fonts tokens.css names, as they are written in it: url("fonts/X.woff2").
  function fontsIn(tokens) { return tokens.match(/url\("fonts\/[A-Za-z0-9_-]+\.woff2"\)/g) || []; }
  function fontPath(u) { return u.slice(5, -2); }

  // What the report's pages work out from the data (reportdata.js), put on it once.
  function withDerived(data) {
    data.derived = window.MxReportData.derive(data);
    data.derived.domain = {};
    data.modules.forEach(function (m) { if (m.entities.length) data.derived.domain[m.name] = window.MxReportData.domain(data, m.name); });
    return data;
  }

  // The documentation of the chosen modules only. Flows and entities of the
  // others are left out; a call or an association that leads to one of them
  // stays named, as a reference this file does not follow.
  function subset(data, keep) {
    var out = Object.assign({}, data);
    out.modules = data.modules.filter(function (m) { return keep[m.name]; });
    out.flows = {};
    Object.keys(data.flows).forEach(function (k) { if (keep[data.flows[k].module]) out.flows[k] = data.flows[k]; });
    out.entities = {};
    Object.keys(data.entities).forEach(function (q) { if (keep[data.entities[q].module]) out.entities[q] = data.entities[q]; });
    out.associations = data.associations.filter(function (a) { return out.entities[a.from] || out.entities[a.to]; });
    var disabled = 0;
    function countOff(list) {
      (list || []).forEach(function (b) {
        if (b.card && b.card.off) disabled++;
        countOff(b.body); countOff(b.error);
        (b.branches || []).forEach(function (x) { countOff(x.body); });
      });
    }
    var kinds = { microflow: 0, nanoflow: 0, page: 0 };
    Object.keys(out.flows).forEach(function (k) { kinds[out.flows[k].kind]++; countOff(out.flows[k].workflow); });
    out.quality = Object.assign({}, data.quality, {
      unreached: data.quality.unreached.filter(function (k) { return out.flows[k]; }), disabled: disabled
    });
    out.kpi = Object.assign({}, data.kpi, {
      modules: out.modules.filter(function (m) { return !m.marketplace; }).length,
      marketplace: out.modules.filter(function (m) { return m.marketplace; }).length,
      microflows: kinds.microflow, nanoflows: kinds.nanoflow, pages: kinds.page,
      entities: Object.keys(out.entities).length
    });
    return out;
  }

  var CLOSE_SCRIPT = '</' + 'script>';
  // The data rides as JSON in a block the browser never runs, with every "<"
  // escaped, so no text from the model can end that block or become markup.
  function payload(data) { return JSON.stringify(data).replace(/</g, '\\u003c'); }
  function mountScript() {
    return [
      '(function(){',
      '  var d = JSON.parse(document.getElementById("mxscout-data").textContent);',
      '  window.MxDocsView.mount(d, document.getElementById("doc"), { hash:true, theme:"light" });',
      '})();'
    ].join('\n');
  }

  // css: the sheets of SHEETS joined, fonts inlined; scripts: the sources of SCRIPTS, in order.
  function build(data, css, title, scripts) {
    return [
      '<!doctype html>',
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      // The project's documentation, not the tool's (redesign spec 10 §1): no tool is named in it.
      '<title>' + String(title).replace(/[<>&"]/g, '') + ' – documentation</title>',
      '<style>html,body{margin:0;height:100%}#doc{height:100vh}\n' + css.replace(/<\/style/gi, '') + '</style>',
      '</head><body>',
      '<div id="doc"></div>',
      '<script type="application/json" id="mxscout-data">' + payload(data) + CLOSE_SCRIPT,
      (scripts || []).map(function (src) { return '<script>' + src.replace(/<\/(script)/gi, '<\\/$1') + CLOSE_SCRIPT; }).join('\n'),
      '<script>window.MxDocsView=' + window.MxDocsView.source + ';' + CLOSE_SCRIPT,
      '<script>' + mountScript() + CLOSE_SCRIPT,
      '</body></html>'
    ].join('\n');
  }

  function fileName(data) {
    return String(data.project).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') + '-documentation-' + String(data.generatedAt).slice(0, 10) + '.html';
  }

  window.MxDocsFile = { SHEETS: SHEETS, SCRIPTS: SCRIPTS, fontsIn: fontsIn, fontPath: fontPath, withDerived: withDerived, subset: subset, build: build, fileName: fileName };
})();
