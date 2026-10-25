#!/usr/bin/env node
// PostToolUse hook for Bash: replace oversized stdout with head + tail and a note,
// so the dump does not sit in the context window for the rest of the session.
// Env: LEAN_BASH_MAX (default 8000 chars), LEAN_BASH_HEAD (6000), LEAN_BASH_TAIL (1200).
const MAX = +process.env.LEAN_BASH_MAX || 8000;
const HEAD = +process.env.LEAN_BASH_HEAD || 6000;
const TAIL = +process.env.LEAN_BASH_TAIL || 1200;

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { return process.exit(0); }
  if (input.tool_name !== 'Bash') return process.exit(0);
  const r = input.tool_response;
  if (!r || typeof r !== 'object' || typeof r.stdout !== 'string') return process.exit(0);
  const out = r.stdout;
  if (out.length <= MAX) return process.exit(0);
  const cut = out.length - HEAD - TAIL;
  const stdout =
    out.slice(0, HEAD) +
    `\n\n[lean-context: trimmed ${cut} chars of ${out.length}; narrow the command (grep -n, sed -n A,Bp ≤120 lines, | head) instead of re-running it]\n\n` +
    out.slice(-TAIL);
  const updated = { ...r, stdout };
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: updated },
  }));
  process.exit(0);
});
