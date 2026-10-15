#!/usr/bin/env python3
"""Builds the team guide as one HTML page, English and Polish, from MxScout's public/guide-team.md.

    python3 docs/build-guide-html.py                  -> docs/guide.html (a whole page, to forward)
    python3 docs/build-guide-html.py --artifact out   -> the same page without <html>/<head>, for a claude.ai artifact

MXSCOUT_DIR points at the MxScout checkout (default ~/Projects/MxScout). The page is self-contained: MxScout's
two fonts are inside it as data: URIs, nothing is fetched, and it opens offline. No dependencies: Python 3.
"""
import base64, html, os, re, sys

MX = os.environ.get('MXSCOUT_DIR', os.path.expanduser('~/Projects/MxScout'))
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(MX, 'public', 'guide-team.md')


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', lambda m: '<code>' + m.group(1) + '</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*([^*\n]+)\*(?![*\w])', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\2">\1</a>', t)
    return t


def slug(s):
    s = re.sub(r'<[^>]+>', '', s).lower()
    return re.sub(r'[^a-z0-9ąćęłńóśźż]+', '-', s).strip('-')


def convert(md, lang):
    """The subset guide-team.md uses: ### sections, bold-only lines as sub-headings, paragraphs, nested
    lists, tables, blockquotes. Returns (html, toc)."""
    lines = md.split('\n')
    out, toc, i = [], [], 0
    para = []

    def flush():
        if para:
            text = ' '.join(x.strip() for x in para)
            m = re.fullmatch(r'\*\*([^*]+)\*\*(.*)', text)
            if m and (not m.group(2).strip() or re.fullmatch(r'\s*\*\([^)]*\)\*', m.group(2))):
                extra = m.group(2).strip()
                out.append('<h4>' + inline(m.group(1)) + (' <span class="tag">' + inline(extra.strip('*()')) + '</span>' if extra else '') + '</h4>')
            else:
                out.append('<p>' + inline(text) + '</p>')
            para.clear()

    def list_block(start):
        # Gathers a list (with continuation lines and nested items) and renders it.
        j = start
        items = []  # (indent, ordered, text)
        while j < len(lines):
            ln = lines[j]
            m = re.match(r'^(\s*)(-|\d+\.)\s+(.*)$', ln)
            if m:
                items.append([len(m.group(1)), m.group(2) != '-', m.group(3)])
            elif ln.strip() and ln.startswith(' ') and items:
                items[-1][2] += ' ' + ln.strip()
            else:
                break
            j += 1

        def render(k, indent):
            ordered = items[k][1]
            parts = ['<ol>' if ordered else '<ul>']
            while k < len(items) and items[k][0] >= indent:
                if items[k][0] > indent:
                    sub, k = render(k, items[k][0])
                    parts[-1] = parts[-1][:-5] + sub + '</li>'
                    continue
                parts.append('<li>' + inline(items[k][2]) + '</li>')
                k += 1
            parts.append('</ol>' if ordered else '</ul>')
            return ''.join(parts), k

        h, _ = render(0, items[0][0])
        return h, j

    while i < len(lines):
        ln = lines[i]
        if not ln.strip() or ln.strip() == '---' or ln.startswith('<a id='):
            flush(); i += 1; continue
        if ln.startswith('## '):
            flush(); i += 1; continue
        if ln.startswith('### '):
            flush()
            title = ln[4:].strip()
            m = re.match(r'(\d+)\.\s+(.*)', title)
            num, name = (m.group(1), m.group(2)) if m else ('', title)
            sid = lang + '-' + (num or slug(name))
            toc.append((sid, num, name))
            out.append('<h3 id="%s"><span class="num">%s</span>%s</h3>' % (sid, num, inline(name)))
            i += 1; continue
        if ln.startswith('|'):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            head, body = rows[0], [r for r in rows[1:] if not all(re.fullmatch(r':?-{3,}:?', c) for c in r)]
            t = ['<div class="table"><table><thead><tr>'] + ['<th>' + inline(c) + '</th>' for c in head] + ['</tr></thead><tbody>']
            for r in body:
                t.append('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in r) + '</tr>')
            t.append('</tbody></table></div>')
            out.append(''.join(t)); continue
        if ln.startswith('>'):
            flush()
            q = []
            while i < len(lines) and lines[i].startswith('>'):
                q.append(lines[i][1:].strip()); i += 1
            parts = [inline(x.strip()) for x in ' '.join(q).split(' · ')]
            out.append('<div class="asks">' + ''.join('<span class="ask">' + p + '</span>' for p in parts) + '</div>')
            continue
        if re.match(r'^\s*(-|\d+\.)\s+', ln):
            flush()
            h, i = list_block(i)
            out.append(h); continue
        para.append(ln); i += 1
    flush()
    return '\n'.join(out), toc


def font(path):
    with open(path, 'rb') as f:
        return 'data:font/woff2;base64,' + base64.b64encode(f.read()).decode('ascii')


def build():
    md = open(SRC, encoding='utf-8').read()
    en_md = md[md.index('<a id="english"></a>'):md.index('<a id="polski"></a>')]
    pl_md = md[md.index('<a id="polski"></a>'):]
    en, en_toc = convert(en_md, 'en')
    pl, pl_toc = convert(pl_md, 'pl')
    version = '?'
    try:
        version = re.search(r'"version":\s*"([^"]+)"', open(os.path.join(MX, 'package.json')).read()).group(1)
    except Exception:
        pass

    def toc_html(toc, label):
        return '<nav class="toc" aria-label="%s"><p class="toc-h">%s</p><ol>' % (label, label) + ''.join(
            '<li><a href="#%s"><span class="num">%s</span>%s</a></li>' % (sid, num, inline(name)) for sid, num, name in toc) + '</ol></nav>'

    css = CSS.replace('{{SANS}}', font(os.path.join(MX, 'public', 'fonts', 'InstrumentSans.woff2'))) \
             .replace('{{MONO}}', font(os.path.join(MX, 'public', 'fonts', 'JetBrainsMono.woff2')))
    body = BODY.replace('{{EN}}', en).replace('{{PL}}', pl) \
               .replace('{{EN_TOC}}', toc_html(en_toc, 'Contents')).replace('{{PL_TOC}}', toc_html(pl_toc, 'Spis treści')) \
               .replace('{{VERSION}}', html.escape(version))
    return '<title>MxScout Team Guide</title>\n<style>\n' + css + '</style>\n' + body + '\n<script>\n' + JS + '</script>\n'


CSS = r"""
/* A reference page for a team: one reading column, the contents beside it on wide screens, one language at a time. */
@font-face { font-family: "Instrument Sans"; src: url({{SANS}}) format("woff2"); font-weight: 400 700; font-stretch: 75% 100%; font-display: swap; }
@font-face { font-family: "JetBrains Mono"; src: url({{MONO}}) format("woff2"); font-weight: 100 800; font-display: swap; }
:root {
  --bg: #F7F8FA; --panel: #FFFFFF; --line: #E4E6EA; --line2: #D3D7DD;
  --ink: #121417; --ink2: #3B4048; --muted: #646A74;
  --acc: #3461F5; --acc-text: #2448C8; --acc-soft: #E8EEFF; --ok: #15803D; --okbg: #E7F6EC;
  --sans: "Instrument Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "SF Mono", Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0D0E11; --panel: #111215; --line: #22252B; --line2: #30333A;
  --ink: #EDEEF0; --ink2: #BCC1C9; --muted: #8B919B;
  --acc: #3461F5; --acc-text: #8EA8FF; --acc-soft: #172038; --ok: #4ADE80; --okbg: #112417; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #0D0E11; --panel: #111215; --line: #22252B; --line2: #30333A;
  --ink: #EDEEF0; --ink2: #BCC1C9; --muted: #8B919B;
  --acc: #3461F5; --acc-text: #8EA8FF; --acc-soft: #172038; --ok: #4ADE80; --okbg: #112417; color-scheme: dark; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 72px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }
a { color: var(--acc-text); text-underline-offset: 2px; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; border-radius: 4px; }
.bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.bar-in { max-width: 1120px; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.mark { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.mark b { font-weight: 700; font-stretch: 85%; font-size: 18px; letter-spacing: -0.01em; }
.mark span { color: var(--muted); font-size: 13px; }
.langs { margin-left: auto; display: inline-flex; border: 1px solid var(--line2); border-radius: 8px; padding: 2px; background: var(--panel); }
.langs button { font: 600 13px var(--sans); color: var(--muted); background: none; border: 0; padding: 5px 12px; border-radius: 6px; cursor: pointer; letter-spacing: 0.04em; }
.langs button[aria-pressed="true"] { background: var(--acc); color: #fff; }
.wrap { max-width: 1120px; margin: 0 auto; padding-inline: 16px; padding-block: 40px 80px; display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 56px; }
@media (max-width: 860px) { .wrap { grid-template-columns: minmax(0, 1fr); gap: 24px; padding-block: 24px 64px; } .toc { position: static !important; } }
.toc { position: sticky; top: 76px; align-self: start; font-size: 14px; }
.toc-h { margin: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.toc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.toc a { display: flex; gap: 10px; padding: 5px 8px; border-radius: 6px; color: var(--ink2); text-decoration: none; line-height: 1.35; }
.toc a:hover { background: var(--acc-soft); color: var(--ink); }
.toc .num { font: 500 12px/1.6 var(--mono); color: var(--muted); min-width: 18px; }
main { min-width: 0; max-width: 70ch; }
.hero { padding-bottom: 28px; margin-bottom: 8px; border-bottom: 1px solid var(--line); }
.eyebrow { font: 500 12px var(--mono); color: var(--acc-text); letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 10px; }
h1 { margin: 0 0 12px; font-size: clamp(30px, 5vw, 44px); line-height: 1.08; font-weight: 700; font-stretch: 80%; letter-spacing: -0.02em; text-wrap: balance; }
.lede { margin: 0; color: var(--ink2); font-size: 18px; line-height: 1.55; }
.ways { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 8px; }
.ways span { font-size: 13px; border: 1px solid var(--line2); border-radius: 999px; padding: 4px 12px; color: var(--ink2); background: var(--panel); }
h3 { margin: 48px 0 12px; font-size: 24px; line-height: 1.2; font-weight: 700; font-stretch: 85%; letter-spacing: -0.01em; text-wrap: balance; display: flex; gap: 14px; align-items: baseline; }
h3 .num { font: 500 14px var(--mono); color: var(--acc-text); background: var(--acc-soft); border-radius: 6px; padding: 2px 8px; flex: none; }
h3 .num:empty { display: none; }
h4 { margin: 28px 0 8px; font-size: 17px; font-weight: 650; }
h4 .tag { font: 500 11px var(--mono); color: var(--ok); background: var(--okbg); border-radius: 4px; padding: 2px 6px; margin-left: 6px; vertical-align: 2px; }
p { margin: 10px 0; }
ul, ol { margin: 10px 0; padding-left: 22px; }
li { margin: 5px 0; }
li > ul, li > ol { margin: 4px 0; }
main > ol > li::marker { font: 600 14px var(--mono); color: var(--acc-text); }
code { font: 0.88em var(--mono); background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; overflow-wrap: anywhere; }
strong { font-weight: 650; }
em { color: var(--ink2); }
.asks { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }
.ask { background: var(--panel); border: 1px solid var(--line2); border-left: 3px solid var(--acc); border-radius: 6px; padding: 8px 12px; font-size: 15px; color: var(--ink2); }
.table { overflow-x: auto; margin: 14px 0; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding: 10px 14px; border-bottom: 1px solid var(--line2); }
td { padding: 10px 14px; border-top: 1px solid var(--line); vertical-align: top; }
td em { color: var(--ink); font-style: normal; }
tbody tr:first-child td { border-top: 0; }
.foot { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
[lang]:not(.show) { display: none; }
@media print { .bar, .toc { display: none; } .wrap { display: block; padding: 0; } body { background: #fff; color: #000; } }
"""

BODY = r"""
<header class="bar"><div class="bar-in">
  <div class="mark"><b>MxScout &amp; Claude</b><span data-en="Team guide" data-pl="Przewodnik dla zespołu">Team guide</span></div>
  <div class="langs" role="group" aria-label="Language / Język">
    <button type="button" id="b-en" data-lang="en" aria-pressed="true">EN</button>
    <button type="button" id="b-pl" data-lang="pl" aria-pressed="false">PL</button>
  </div>
</div></header>
<div lang="en" class="show"><div class="wrap">
  {{EN_TOC}}
  <main>
    <div class="hero">
      <p class="eyebrow">MxScout {{VERSION}} · team guide</p>
      <h1>Document a Mendix app once. Let the whole team, and Claude, use it.</h1>
      <p class="lede">How to set up the documentation of an application, keep it current, and get help with tickets, Jira issues and ideas — with Claude alone, with MxScout, or without the repository.</p>
      <div class="ways"><span>Claude only</span><span>Claude + MxScout</span><span>A package, without the repository</span></div>
    </div>
    {{EN}}
    <p class="foot">Written for MxScout {{VERSION}}. The same guide is in each project as mxscout/GUIDE.md.</p>
  </main>
</div></div>
<div lang="pl"><div class="wrap">
  {{PL_TOC}}
  <main>
    <div class="hero">
      <p class="eyebrow">MxScout {{VERSION}} · przewodnik dla zespołu</p>
      <h1>Opisz aplikację Mendix raz. Niech korzysta z tego cały zespół i Claude.</h1>
      <p class="lede">Jak założyć dokumentację aplikacji, utrzymywać ją aktualną i dostawać pomoc przy ticketach, Jirach i pomysłach — z samym Claude'em, z MxScoutem albo bez repozytorium.</p>
      <div class="ways"><span>Tylko Claude</span><span>Claude + MxScout</span><span>Paczka, bez repozytorium</span></div>
    </div>
    {{PL}}
    <p class="foot">Napisane dla MxScout {{VERSION}}. Ten sam przewodnik jest w każdym projekcie jako mxscout/GUIDE.md.</p>
  </main>
</div></div>
"""

JS = r"""
(function () {
  var blocks = document.querySelectorAll('div[lang]');
  function set(lang, keep) {
    blocks.forEach(function (b) { b.classList.toggle('show', b.getAttribute('lang') === lang); });
    document.querySelectorAll('.langs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    document.querySelectorAll('[data-en]').forEach(function (n) { n.textContent = n.dataset[lang]; });
    document.documentElement.lang = lang;
    if (keep) { try { localStorage.setItem('mxscout-guide-lang', lang); } catch (e) {} }
  }
  document.querySelectorAll('.langs button').forEach(function (b) {
    b.addEventListener('click', function () { set(b.dataset.lang, true); window.scrollTo(0, 0); });
  });
  var h = (location.hash || '').slice(1), saved = null;
  try { saved = localStorage.getItem('mxscout-guide-lang'); } catch (e) {}
  var start = /^pl/.test(h) || h === 'polski' ? 'pl' : /^en/.test(h) || h === 'english' ? 'en'
    : saved || (/^pl/i.test(navigator.language || '') ? 'pl' : 'en');
  set(start, false);
})();
"""

if __name__ == '__main__':
    page = build()
    if len(sys.argv) > 2 and sys.argv[1] == '--artifact':
        open(sys.argv[2], 'w', encoding='utf-8').write(page)
        print('wrote', sys.argv[2])
    else:
        out = os.path.join(HERE, 'guide.html')
        full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' \
            + page.replace('</style>\n', '</style>\n</head>\n<body>\n', 1) + '</body>\n</html>\n'
        open(out, 'w', encoding='utf-8').write(full)
        print('wrote', out, len(full) // 1024, 'KB')
