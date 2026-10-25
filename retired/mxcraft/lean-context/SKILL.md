---
name: lean-context
description: Working rules that keep the context window small, so every tool call re-reads less and a story costs a fraction of the tokens – one task per session, grep before cat, no second read of the same file, Edit instead of rewriting, bulk reading delegated to a cheap subagent, one screenshot as proof. Use at the start of any coding or analysis session in MxCraft, Tandem, MxScout or a Mendix project, when Karol says "oszczędnie", "lean", "mało tokenów", "pilnuj kontekstu", or when a session has already crossed ~150k tokens of context.
---

# lean-context

The bill is calls × context. Every tool call re-sends the whole window; a file dumped once is paid for on every later call until the session ends. Measured on Karol's Mendix work: median context 300–550k per call, half the tokens spent on calls above 400k, and 45% of the window made of Bash dumps and repeated reads. The rules below are what cuts that.

## 1. One task per session
- One story, ticket or "krok" per session. When it reaches Testing (or the step is reported), end the turn; the next piece starts in a fresh session (Tandem loop does this by itself).
- Never continue a session from a previous day. `/clear` beats `/compact` on an old session.
- If the context passes ~150k mid-task: finish the current step, write the state down (story comment, run_report, or a note file), then recommend a new session.

## 2. Read narrowly
- Locate first: `grep -n`, `rg -n`, `ls`, `wc -l`. Then read only the lines you need: `sed -n 'A,Bp'` with B−A ≤ 120, or Read with offset/limit.
- Never `cat` a whole file, never `head -c 20000`, never slice a big HTML/JS file in chunks "to see it all". If the whole file is needed, delegate (rule 4).
- Never read the same file twice in one session. You already have it; scroll your own context. If it changed after your Edit, you know what you changed.
- Pipe command output through `head -40`, `tail -20`, `grep -c`, `cut -c1-200`. Test runs: `| tail -30` (failures are at the end). Build logs: `| grep -iE 'error|warn' | head`.
- Combine related commands in one Bash call; separate unrelated ones only when the second depends on the first.
- MCP and browser: `read_page` / `get_page_text` with a `max_chars`, `find` for one element; a screenshot only as final proof, not for navigation.

## 3. Write without echo
- Change files with Edit (old → new), not by rewriting the whole file. Write is for new files only.
- Do not print a file back after writing it to "verify" – the tool error would have told you.
- No `cat <<EOF` of large files in Bash when Write does the same: both cost the same once, but Write is not re-quoted in stderr on failure.
- Keep assistant text short; findings go into the story, test or file, not into chat.

## 4. Delegate bulk reading
- "Where is X handled", "summarise this module", "list all microflows that…": run it in a subagent (Explore, or a `model: haiku` read-only agent) and keep only its summary in the main window.
- Ask the subagent for a conclusion with file:line pointers, never for the file contents.

## 5. Fewer calls
- Plan the next 3–5 actions before the first call; batch independent calls in one message.
- Don't poll (no sleep-and-check loops); `/loop` and scheduled tasks re-send the full window every tick.
- Don't re-run a command to re-see output that is already in the window.

## 6. Know the number
- `/context` shows the grid; `/usage` the cache hit share. `bin/token-usage.py --since <date> <project>` in MxCraft sums real usage from transcripts.
- Report tokens in `run_report` as the transcript sums them, never as an estimate.

The hard rules (trimmed Bash output above 8k chars, auto-compaction at 200k) are enforced by `hooks/trim-bash-output.js` and the user settings, see docs/research/token-usage_2026-10-18.md in MxCraft.
