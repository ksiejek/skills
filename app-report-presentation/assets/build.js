#!/usr/bin/env node
/* Builds one self-contained report file from a data JSON. Node only, no
 * dependencies, writes nothing but the files it is asked for.
 *
 *   node build.js data.json out.html [--title "X"] [--lang en|pl|de] [--md out.md]
 *
 * It inlines tokens.css (with the two fonts as data: URIs), report.css,
 * icons.svg and report.js, and puts the data in a <script type="application/json">
 * block with every "<" escaped, so no text from the data can end the block or
 * become markup. The page then renders itself with Report.mount. Nothing in the
 * file loads anything from anywhere.
 *
 * template.html in this folder is this build run on example-data.json:
 *   node build.js example-data.json template.html */
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const args = process.argv.slice(2);
function opt(name) { const i = args.indexOf(name); if (i === -1) return null; const v = args[i + 1]; args.splice(i, 2); return v; }
const title = opt('--title');
const lang = opt('--lang');
const mdOut = opt('--md');
const [dataPath, outPath] = args;
if (!dataPath || !outPath) {
  console.error('Usage: node build.js data.json out.html [--title "X"] [--lang en|pl|de] [--md out.md]');
  process.exit(2);
}

const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
let data;
try { data = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch (e) { console.error('Cannot read ' + dataPath + ': ' + e.message); process.exit(1); }
if (lang) {
  if (!['en', 'pl', 'de'].includes(lang)) { console.error('--lang must be en, pl or de'); process.exit(2); }
  data.lang = lang;
}
const docLang = ['en', 'pl', 'de'].includes(data.lang) ? data.lang : 'en';

// tokens.css names its fonts as url("fonts/X.woff2"); each becomes a data: URI.
let tokens = read('tokens.css');
tokens = tokens.replace(/url\("fonts\/([A-Za-z0-9_-]+\.woff2)"\)/g, (m, f) =>
  'url("data:font/woff2;base64,' + fs.readFileSync(path.join(HERE, 'fonts', f)).toString('base64') + '")');
const css = (tokens + '\n' + read('report.css')).replace(/<\/style/gi, '<\\/style');
const icons = read('icons.svg').replace(/<!--[\s\S]*?-->/g, '').trim();
const js = read('report.js').replace(/<\/(script)/gi, '<\\/$1');
const payload = JSON.stringify(data).replace(/</g, '\\u003c');
const appName = (data.app && data.app.name) || 'Application';
const pageTitle = String(title || appName + ' – documentation').replace(/[<>&"]/g, '');
const CLOSE = '</' + 'script>';

const html = [
  '<!doctype html>',
  '<html lang="' + docLang + '" data-theme="light">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="color-scheme" content="light dark">',
  '<title>' + pageTitle + '</title>',
  // The theme before the first paint, so a dark reader never sees a light flash.
  '<script>(function(){var c="auto";try{c=localStorage.getItem("report-theme")||"auto"}catch(e){}var d=c==="dark"||(c==="auto"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")})();' + CLOSE,
  '<style>\n' + css + '\n</style>',
  '</head>',
  '<body>',
  icons,
  '<div id="report"></div>',
  '<noscript><p style="padding:24px;font:15px system-ui">This report needs JavaScript to draw its pages. Its content is in the data block of this file.</p></noscript>',
  '<script type="application/json" id="report-data">' + payload + CLOSE,
  '<script>\n' + js + '\n' + CLOSE,
  '<script>Report.mount(JSON.parse(document.getElementById("report-data").textContent), document.getElementById("report"));' + CLOSE,
  '</body>',
  '</html>',
  ''
].join('\n');

fs.writeFileSync(outPath, html);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log('Wrote ' + outPath + ' — ' + kb(Buffer.byteLength(html)) + ', ' + appName + ' (' + docLang + ')');
if (mdOut) {
  const Report = require(path.join(HERE, 'report.js'));
  fs.writeFileSync(mdOut, Report.markdown(data));
  console.log('Wrote ' + mdOut);
}
