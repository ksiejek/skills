/* MxCraft theme-scss — a small CSS scanner shared by convert.js and compare.js.
 *
 * Not a full CSS parser: it knows strings, comments, parentheses and braces, which is all the theme
 * conversion needs. topLevel() cuts a stylesheet into its top-level items (comments, rules, at-statements)
 * so the converter can split it on rule boundaries; mapValues() rewrites only declaration values (never
 * selectors, strings, comments or custom properties); parseRules() flattens compiled CSS into a list of
 * rules with their at-rule context and declarations, which compare.js matches one by one.
 */
'use strict';

// Index just past a string starting at i (text[i] is the quote), honouring backslash escapes.
function skipString(text, i) {
  const q = text[i];
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') { j++; continue; }
    if (text[j] === q || text[j] === '\n') return j + 1;
  }
  return text.length;
}

// Index just past a /* comment */ starting at i.
function skipComment(text, i) {
  const end = text.indexOf('*/', i + 2);
  return end < 0 ? text.length : end + 2;
}

// Index of the brace that closes the block opened at text[open] === '{'.
function matchBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") { i = skipString(text, i) - 1; continue; }
    if (c === '/' && text[i + 1] === '*') { i = skipComment(text, i) - 1; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  throw new Error(`niezamknięty blok od znaku ${open}`);
}

// Top-level items of a stylesheet: { type: 'comment'|'rule'|'at', start, end, prelude, body }.
// For a rule, prelude is the text before '{' and body the text between the braces.
function topLevel(text) {
  const items = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text[i] === '/' && text[i + 1] === '*') {
      const end = skipComment(text, i);
      items.push({ type: 'comment', start: i, end, text: text.slice(i, end) });
      i = end; continue;
    }
    let j = i, paren = 0;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '"' || c === "'") { j = skipString(text, j) - 1; continue; }
      if (c === '/' && text[j + 1] === '*') { j = skipComment(text, j) - 1; continue; }
      if (c === '(') paren++;
      else if (c === ')') paren--;
      else if (paren === 0 && (c === '{' || c === ';')) break;
      else if (paren === 0 && c === '}') throw new Error(`nadmiarowe „}” na znaku ${j}`);
    }
    if (j >= text.length) throw new Error(`niedokończona instrukcja od znaku ${i}`);
    if (text[j] === ';') {
      items.push({ type: 'at', start: i, end: j + 1, prelude: text.slice(i, j) });
      i = j + 1; continue;
    }
    const close = matchBrace(text, j);
    items.push({ type: 'rule', start: i, end: close + 1, prelude: text.slice(i, j), body: text.slice(j + 1, close) });
    i = close + 1;
  }
  return items;
}

// Applies fn to the parts of text outside strings, comments and url(...).
function outsideLiterals(text, fn) {
  let out = '', from = 0, i = 0;
  const flush = (to) => { out += fn(text.slice(from, to)); };
  while (i < text.length) {
    const c = text[i];
    let end = -1;
    if (c === '"' || c === "'") end = skipString(text, i);
    else if (c === '/' && text[i + 1] === '*') end = skipComment(text, i);
    else if (/^url\(/i.test(text.slice(i, i + 4)) && !/[\w-]/.test(text[i - 1] || '')) {
      const close = text.indexOf(')', i);
      end = close < 0 ? text.length : close + 1;
    }
    if (end < 0) { i++; continue; }
    flush(i); out += text.slice(i, end); from = i = end;
  }
  flush(text.length);
  return out;
}

// Rewrites declaration values in a stylesheet fragment: fn(prop, value) returns the new value.
// Selectors, at-rule preludes, comments, strings and custom properties (--x) are left untouched.
// inBlock: the fragment is the inside of a block (bare declarations).
function mapValues(text, fn, inBlock = false) {
  let out = '', stmt = 0, depth = inBlock ? 1 : 0, i = 0;
  const declaration = (end) => {
    const s = text.slice(stmt, end);
    let colon = -1;
    for (let k = 0; k < s.length; k++) {
      const c = s[k];
      if (c === '"' || c === "'") { k = skipString(s, k) - 1; continue; }
      if (c === '/' && s[k + 1] === '*') { k = skipComment(s, k) - 1; continue; }
      if (c === ':') { colon = k; break; }
    }
    if (colon < 0 || depth < 1) return s;
    const prop = s.slice(0, colon).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!prop || prop.startsWith('--') || /[\s{}]/.test(prop)) return s;
    return s.slice(0, colon + 1) + fn(prop, s.slice(colon + 1));
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") { i = skipString(text, i); continue; }
    if (c === '/' && text[i + 1] === '*') {
      if (text.slice(stmt, i).trim() === '') { out += text.slice(stmt, skipComment(text, i)); stmt = i = skipComment(text, i); continue; }
      i = skipComment(text, i); continue;
    }
    if (c === '(') { i = matchParen(text, i); continue; }
    if (c === '{') { out += text.slice(stmt, i + 1); depth++; stmt = ++i; continue; }
    if (c === ';' || c === '}') {
      out += declaration(i) + c;
      if (c === '}') depth--;
      stmt = ++i; continue;
    }
    i++;
  }
  return out + (text.slice(stmt).trim() ? declaration(text.length) : text.slice(stmt));
}

// Index just past the parenthesis group opened at text[open] === '('.
function matchParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") { i = skipString(text, i) - 1; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i + 1;
  }
  return text.length;
}

// Declarations of a block body as [prop, value] pairs (comments dropped, order kept).
function declarations(body) {
  const list = [];
  let stmt = '', i = 0;
  const push = () => {
    const s = stmt.trim(); stmt = '';
    if (!s) return;
    const colon = s.indexOf(':');
    if (colon < 0) list.push([s, '']);
    else list.push([s.slice(0, colon).trim(), s.slice(colon + 1).trim()]);
  };
  while (i < body.length) {
    const c = body[i];
    if (c === '/' && body[i + 1] === '*') { i = skipComment(body, i); continue; }
    if (c === '"' || c === "'") { const e = skipString(body, i); stmt += body.slice(i, e); i = e; continue; }
    if (c === '(') { const e = matchParen(body, i); stmt += body.slice(i, e); i = e; continue; }
    if (c === ';') { push(); i++; continue; }
    stmt += c; i++;
  }
  push();
  return list;
}

// True when a block body holds nested blocks (an @media, @supports or @keyframes body).
function hasBlocks(body) {
  return topLevelSafe(body).some((it) => it.type === 'rule');
}

// topLevel() that treats a declarations-only body as having no items instead of failing on it.
function topLevelSafe(body) {
  try { return topLevel(body); } catch { return []; }
}

// Flattens a stylesheet into { context, selector, decls } entries in source order: context is the
// chain of enclosing at-rule preludes ('@media (max-width: 640px)'), selector the rule prelude.
function parseRules(css, context = '') {
  const rules = [];
  for (const it of topLevel(css)) {
    if (it.type === 'comment') continue;
    const prelude = it.prelude.trim();
    if (it.type === 'at') { rules.push({ context, selector: prelude, decls: [] }); continue; }
    if (prelude.startsWith('@') && hasBlocks(it.body)) {
      rules.push(...parseRules(it.body, context ? `${context} > ${prelude}` : prelude));
      continue;
    }
    rules.push({ context, selector: prelude, decls: declarations(it.body) });
  }
  return rules;
}

module.exports = { topLevel, mapValues, outsideLiterals, declarations, parseRules, skipComment };
