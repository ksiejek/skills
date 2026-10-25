# Fixing a finding: the recipe, three ways, and the check after

A security risk from `check-security.js` is not the end. Each one carries a
**recipe**: the change that removes it, in Mendix's words. This file says how
to read the recipe, which of three ways may make the change, what guards each
way, and how to prove afterwards that the risk is gone. SKILL.md's "Fixing a
finding" is the short form; this is the whole of it.

Nothing here involves MxScout's server. The recipe comes from MxScout's engine
(`engine/secrisks.js`, the file the Security screen runs); the change is made
in Studio Pro, by a person or through Studio Pro's own MCP server on the
developer's machine; the check after is `check-security.js` again.

## 1. The recipe

```
node check-security.js <MendixProject | folder | app.mpr> --fix <id>          # to read
node check-security.js <MendixProject | folder | app.mpr> --fix <id> --json   # the same as JSON
```

It prints the risk, then:

- **Module** — the module the change is in. "Marketplace" when it is one.
- **Never changed here** — the change would be inside a Marketplace module.
  Such a module is never changed, by any way: the next update overwrites the
  change, and the module is not the team's. The numbered steps are then what
  can be done *outside* the module (in App Security, or deciding to keep it and
  marking the risk a false positive); "Inside …, were it the team's own module"
  lists the change itself, for the person to weigh — some teams have changed a
  Marketplace module already, and that is their call, made by hand.
- **Verify first** — the risk is to verify, not a finding: the model suggests
  it and does not prove it (a page's condition that may be a setting, a check
  MxScout cannot read in front of the step, a commit check that may refuse
  it). Look at what it names with the person before anything else. If it does
  not hold, nothing in the model changes: the risk is marked a false positive
  with that reason.
- **Decide first** — something a person settles before anything changes: which
  rows a visitor may see, which module roles a user role is for, whether a flow
  should be offered at all. Ask it; change nothing until it is answered.
- **Only by a person** — a password (an agent never writes one), an update of
  Mendix or of a Marketplace module. Way (c) only.
- **Numbered steps** — each one change, with where it is in Studio Pro in
  brackets, e.g. `[Studio Pro: Shop › Domain model › Note › Access rules › the
  rule for Shop.Guest]`. A step that begins "Or" is the alternative to the one
  before it; offer both, the person picks.
- **Then** — what the check after must show: `check-security.js` no longer
  lists the id.

In JSON each step is `{ do, in, text, … }` with the names spelled out:
`entity`, `moduleRole` (the access rule is the entity's rule for that module
role), `userRole`, `members` (attributes and associations), `rights`
(`create`, `write`, `delete`), `xpath`, `flow`, `condition` (a microflow
expression on the flow's own parameter), `setting` and `value`. `do` is one of
`set`, `remove`, `take-off`, `add-xpath`, `add-decision`, `give`, `update`,
`decide` (a person's choice, not a change).

## 2. The three ways, in this order

`--fix` ends with "Ways to make it": which are open for this risk, and why one
is closed. Offer the open ones in this order and let the person choose.

### (c) By hand — always open

The person makes the change in Studio Pro from the recipe, saves (Ctrl+S /
Cmd+S), and tells you. You stay with them: read each step out, say where it is,
answer questions. Then the check after (section 3).

### (a) Studio Pro's MCP server — when its tools are in your session

Studio Pro 11.10 and later is itself an MCP server: what Maia can do in Studio
Pro, an agent can do through it, and the change shows in Studio Pro at once.
It runs on the developer's machine, beside Studio Pro; MxScout plays no part.

**Is it there?** Look at the tools in your session for ones from the Studio
Pro MCP server (the name the person gave it in `claude mcp add`). Mendix does
not publish their list — read what they say they do. **When there are none,
say so plainly** — "Studio Pro's MCP server is not connected in this session,
so I cannot make the change in Studio Pro" — give the recipe for (c), and tell
the person how to connect it if they want (a) next time:

1. Studio Pro 11.10 or later, signed in, online, the project open.
2. **Preferences › AI › MCP Server › Enable MCP Server.** The port is set on
   the same page (7782 by default; from 11.13 Studio Pro takes a free one when
   that is busy and shows it in the status bar).
3. In a terminal: `claude mcp add studio-pro --transport http
   http://localhost:<port>/mcp`, then start a new Claude Code session.

Tokens used through it are billed by the person's own LLM provider account
(Mendix's docs: Studio Pro MCP Server).

**Closed** when Tandem's "Read only" is on, when the change is in a
Marketplace module, or when the recipe says "Only by a person".

**When it is there:**

1. **The backup first** (Karol's rule for any change to a real Mendix
   project): a copy of the project's repository under `~/Mendix/_backups/`
   (`<project>_<yyyymmdd-hhmm>_before-<id>`) and a git tag
   (`mxscout-fix-<yyyymmdd-hhmm>`). Ask the person to make them, or make them
   with their yes; do not go on without both.
2. **One step at a time, each with the person's yes.** Show the step (its text
   and where it is), ask "Make this change?", and only on a clear yes call the
   tool for exactly that step — nothing the recipe does not say, nothing in
   another module. Read back what Studio Pro answered.
3. **Stop at the first error** or anything you did not expect; say what
   happened; the person decides (Studio Pro's Undo, or the backup).
4. **The person saves** in Studio Pro — the check after reads the model from
   disk.
5. The check after (section 3).

### (b) MxCraft's engine — when it has an op for the recipe

MxCraft (Karol's tool, `~/Projects/MxCraft`, or `$MXCRAFT_DIR`) writes the
`.mpr`'s documents directly. `--fix` says (b) is open only when all hold:

- the model is a Mendix project's `.mpr` with `mprcontents/` beside it (not a
  project folder's `model.json`, not the old single-file layout);
- there is no `<app>.mpr.lock` — Studio Pro has the project closed;
- MxCraft's engine has an op that applies a recipe (`engine/ops/fix.js`).
  **Today it has none**: it moves, renames and creates documents (MXC-16,
  MXC-24), it does not change an existing access rule, a retrieve or a flow —
  so (b) is closed, and says so;
- not "Read only", not a Marketplace module, not "Only by a person".

When it is open, MxCraft's own safety holds, as in its `mxcraft-run.js`
(MXC-16): a copy under `~/Mendix/_backups` and a git tag before the write,
`mx check` on the `.mpr` after it, and **a stop on the first error with the
copy put back**. Then the check after.

## 3. The check after — and MxScout marking it fixed

```
node check-security.js <MendixProject | folder | app.mpr> --fixed <id> --note "what was changed" --out fixed.json
node agent.js send <work>/fixed.json
```

`--fixed` reads the model again:

- **Still there** → it says so and exits with 1. Do not send anything. Say it
  plainly: the change did not remove it (was Studio Pro saved? was the right
  rule changed?) and go back to the recipe.
- **Gone** → the part it writes carries `verify: [{ "id", "still": false,
  "why": "not seen in the model", "fixed": "<your note>" }]`. Sent, MxScout
  marks the risk **Verified**, with "fixed: <note>" in its history — whatever
  it was before (open, reopened, marked fixed). The note is what a reviewer
  reads: say what changed, in Mendix words ("Took create and write off the
  rule for Shop.Guest on Shop.Note").
- An id MxScout has never been given (not in `triage.json`, not in the
  descriptions) is refused: hand the security part in first, then fix.

`--fixed` takes several ids, comma-separated, when one change removed them
all. When the fix was one of the items `node agent.js review` proposed (SKILL.md,
"After the model changed"), tick that item off as it says.

## 4. Never

- Never change a Marketplace module's documents, by any way.
- Never change anything with Tandem's "Read only" on — the recipe only.
- Never make two changes in one step, or a change the person did not say yes
  to, or one the recipe does not name.
- Never write a password, or update a module or Mendix, for the person.
- Never edit `review.json`, `triage.json` or the `.mpr` by hand, and never
  write a `verify` entry with `fixed` yourself — `--fixed` writes it, after it
  has looked.
