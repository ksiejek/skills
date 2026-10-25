# mendix-docs — changes

## 3.9.0 – 2026-10-19

- **Every module, Marketplace ones too** (MxScout MXS-13): `build` describes
  all of the app's own modules — no choosing — and every Marketplace module in
  a sentence or two, from its short block at the end of the pack (what it is,
  its version, whether the app uses it, the user roles on its module roles)
  and `reference/marketplace-modules.md`, the catalogue MxScout carries;
  never from its flows, which the pack does not list.
- The report has every module by default, the Marketplace ones in a group of
  their own, each with a note on what it is, its version, its use, its known
  advisories and its roles; `--own` leaves them out (`--all` still works).
- `engine/` gains `marketplace.js` (and `docs.js` loads it with
  `advisories.js`), and `check-security.js` reports who holds a Marketplace
  module's administrative role (`mx-market-admin-…`, P2), and a module or a
  module role nothing uses (P3). The engine and `check-security.js` are packed
  from MxScout's current branch, so they also carry MXS-9 to MXS-12 (verify
  `still: true`, the recipes, the Security review page).

## 3.8.0 – 2026-10-18

- **Security from MxScout's own engine** (MxScout MXS-8): `check-security.js`,
  mendix-describe's, is packed beside `docs.js`, with the security checks in
  `engine/` (anonrole, accessuse, accounts, guards, editscope, selfreg,
  constants, advisories, accessrule, secrisks — MxScout's files, unchanged).
  `node check-security.js <app.mpr> --json --out security.json` gives the
  risks with fixed ids (`mx-…`) as a part to merge; build and update merge it,
  and the agent writes no security risk of its own about what it covers.
- `docs.js` loads `engine/docs-triage.js`, which MxScout's report has needed
  since 1.18.0; without it the packed skill could not read a project.

## 3.7.0 – 2026-10-15

- **The Mendix project stays clean** (mendix-describe's rule, MxScout 1.14.3):
  everything made while working — the pack, the parts, `descriptions.json`,
  notes — goes into a **work folder** outside the project, which the new
  **`docs.js workdir [<app.mpr>]`** prints and `status` names: `$MXSCOUT_WORK`
  when set, else `mxscout-work/<project>` in the system's temporary folder,
  the same one mendix-describe uses (its `check-descriptions.js`, packed
  beside `docs.js`, holds the rule). A file named without a path is there, and
  every file written is said by its full path. A working file inside the
  project is refused, as before. The report goes where it always did —
  `--out`, or its default name in the current folder — except when that is
  inside the project: then into the work folder, said plainly, instead of
  refused. `SKILL.md` says it first, as a rule, and every example names the
  work folder; for real work, set `MXSCOUT_WORK` to a folder the person keeps
  (`<project's parent>/<App>-docs`), since `descriptions.json` is the only copy.

## 3.6.0 – 2026-10-15

- **`docs.js repo <MendixProject>`** — for a project kept inside the Mendix
  project (`mxscout/`, shared through the app's git): writes `mxscout/docs/`
  — the documentation by topic, `index.md` the map, `manifest.json` with every
  file's SHA-256 — from the `.mpr` beside `mxscout/`, the descriptions in
  `mxscout/descriptions/` and the solved cases in `mxscout/knowledge/`, byte for
  byte as MxScout writes it (its own `repodocs.js`, and `modelversion.js` for
  the commit the model is at, now in `engine/`). Nothing is written when
  `docs/manifest.json` says `docs/` is made from these already; a file only
  when its text changed; nowhere in the Mendix project but `mxscout/docs/`. It
  never runs git.
- The index lists the solved cases (id, title, the problem in a line, the
  path) and the manifest names each case file, as MxScout 1.11.0 does.

## 3.5.0 – 2026-10-15

- **An MxScout project folder works in place of the `.mpr`.** Named where a
  command takes `<app.mpr>`, or with `--model <folder>`: the model is read
  from its `model.json` (no `.mpr` needed), its `descriptions.json` is the
  descriptions when none is named, and `status` prints the project's language
  of written content. Nothing is written into that folder — `docs.js` refuses,
  as it refuses the Mendix project's — except by the new
  **`send <folder> <descriptions.json>`**, which writes the file whole into
  its `inbox/` (a hidden temporary file, renamed), for MxScout to take while
  the project is open in it or the next time it is opened, with Undo. Never
  into `descriptions.json`: MxScout rewrites it on every save.
- **One language per project, English by default.** The skill reads the
  project's language first (`contentLanguage` in an MxScout folder's
  project.json, or `"language"` of an earlier descriptions file), asks once —
  "In which language should I write? (default: English)" — only when it is
  not set, never switches on its own, and marks a requested change with
  `"setLanguage": true`. `docs` writes `Write in: …` in the header when it
  reads an MxScout folder. Headings and labels stay English.

## 3.4.1 – 2026-10-14

- **Nothing is written into the project's folder.** `docs.js` refuses any file
  inside the `.mpr`'s folder — `--out`, the pack's file, and the report's
  default name when run from inside it — by real paths, links followed, and
  says to work in a folder outside the project.
- **Clearer failures:** `--out` with no file name after it, `module` with no
  name, `--modules` that names nothing (it no longer builds an empty report),
  a file that cannot be written (said as such, not as a project that cannot be
  read), and, run from its source with no engine, the hint to set
  `MXSCOUT_DIR`.
- **The report's page is in the descriptions' language** (`"language"`), when
  that is a language tag; English otherwise.
- **`pack-skill.js` empties only an empty folder or an earlier copy of the
  skill** (one holding `SKILL.md` and `VERSION`) and refuses any other, so a
  mistyped path loses nothing. `VERSION` names the MxScout commit the skill was
  packed from: `3.4.1 (MxScout <commit>)`.
- mendix-describe's checker: its `merge` joins parts by the rules MxScout
  imports by (who uses it in a part that adds, a risk told again at another
  level, the context without repeats; parts that all add make a file that
  adds), and `check` warns about everything past the bounds MxScout keeps
  (`reference/descriptions-format.md`, "What MxScout keeps"), a diagram step
  `"by"` neither person nor app, a way that both ends and joins, and
  `"replace"` without `"add"`. A flow's description: under 300 characters.

## 3.4.0 – 2026-10-14

- **`docs <app.mpr> [descriptions.json] [--out docs.md]`**: the documentation
  as Markdown — the same text MxScout gives an agent it shares a project with:
  the Markdown copy of the own modules under a header (project, Mendix version,
  when, how many flows are described and how many are out of date), every
  description whose flow changed since marked *out of date*. Without
  descriptions it says plainly there is none yet.
- **The skill asks before it starts.** With no argument it runs `status`, says
  what it sees and asks what the person wants — describe, update, one more
  process, a change, a ticket, or a question — and never starts a full
  description unasked.
- **The documentation is the map, the model is the proof.** For an update, a
  process, a change, a ticket or a question the agent reads `docs.md` first
  (processes, module notes, For developers, earlier changes and tickets), then
  verifies in the pack what it pointed to, and says so where the two disagree.
- **`question <what>`**: an answer about how the app works, citing the flows,
  with no file written.
- mendix-describe's checker: `todo` takes `docs.md` in place of a descriptions
  file.

## 3.3.0 – 2026-10-14

- **`ticket <text>`**: a ticket reported on the application checked against
  the model — bug, works as designed, data or configuration, or cannot tell
  (and what would settle it) — with the evidence, a reply to paste back and,
  for a bug, a proposed fix on the Changes page. It follows the
  mendix-ticket-check skill, installed beside this one.
- The engine carries MxScout's `docs-tickets.js`: the report and its Markdown
  copy have the Tickets page.

## 3.2.0 – 2026-10-14

- **`change <what>`**: a change the person wants, described as the
  application works today and with a proposed solution — the model changes
  by kind (add, change, remove), impact, risks, open questions and effort —
  on the report's new **Changes** page. The agent proposes; it never changes
  the model.
- The engine carries MxScout's `docs-changes.js`, so the report and its
  Markdown copy have the Changes page.

## 3.1.0 – 2026-10-14

- **Processes are traced, not summarised.** A first run gave short, general
  processes: the skill wrote them from the module descriptions. Now the agent
  keeps what processes are made of while reading each module
  (`work.<Module>.md`: where cases start, statuses, decisions, records looked
  up by name, messages, deadlines, calls into other modules), then traces
  every main process through its flows across modules, with a diagram
  whenever the case branches, and reads them through before merging.
- The checker (mendix-describe's) warns about a process story under 150
  words, an overview under 300, or a process with fewer than two flows.
- The language is the person's when they did not name one, not English.
- The engine is MxScout's current one: Documentation built once per model.

## 3.0.1 – 2026-10-14

- **A Mendix 10+ `.mpr` copied without `mprcontents/`** stops with a message
  saying what is missing, instead of reading as an empty model.
- **`update` cannot lose descriptions any more:** its parts get names of their
  own (`update.<Module>.json`, `update.app.json`) and are merged on top of the
  earlier `descriptions.json`, with the exact command in SKILL.md.
- Searching the pack for a process: `| head -50`, so a common word cannot
  flood the context.
- Examples (here and in mendix-describe's references) use an invented sales
  application; the engine is MxScout's current files, with the page drawing.
- `selftest.js` also runs a Mendix 10+ project, with and without
  `mprcontents/`.

## 3.0.0 – 2026-10-14

The skill is now mendix-describe without MxScout, and its report is MxScout's
(Karol: "exactly the same skill, except that it builds the report itself").

- **The model** is read from the `.mpr` (and `mprcontents/` for Mendix 10+)
  by MxScout's own engine, run in Node by `docs.js` — the same code MxScout
  runs in the browser, so the model, the AI pack and the report are the same.
  The MCP mode is gone: only what is saved in Studio Pro is read.
- **The work** is mendix-describe's: the same SKILL.md order, the same
  reference files (business narrative, risk levels, module notes, C4, the pack
  and descriptions formats) and the same checker, copied in by `pack-skill.js`
  rather than kept twice.
- **The report** is one offline HTML file, the file MxScout's "Export
  documentation" writes: Overview, Processes, Modules, Architecture, Entities,
  Microflows, Nanoflows, Pages, Risks, Model quality, For developers.
- **One more process:** `process <what>` analyses a process the person names
  after reading the documentation and adds it as a main process
  (`"add": true` in the descriptions file).
- **Removed:** the Orbit Desk portal and its engine, documents 01–03,
  `translate`, `write docs` (writing into Studio Pro's Documentation field),
  `export`, `init-app` / `update-app` and the workspace template.

**After updating:** an old workspace's `docs/` is not read. Build again
(`/mendix-docs build`) in a new folder; module notes from version 2 can be
given to the agent as reading, not imported.
