# Skills

Karol's Claude Code skills. Private repository: it is not to be made public.

Each top-level folder except `mendix-docs-source/` is one installable skill.
The folder name is the skill's `name:` in its `SKILL.md`.

| Skill | What it does | Canonical home |
|---|---|---|
| `mendix-describe/` | Writes business-readable documentation of a Mendix app from an MxScout project — the project folder MxScout keeps on disk (the first way: `project.json`, `documentation.md`, `ai-pack.md`, results into `inbox/`), a running MxScout sharing a project with an agent, or a `.mxscout-ai-pack.md` file — as a descriptions file MxScout takes in. | **The MxScout Dev repository** (`skills/mendix-describe/`), which has everything the public MxScout's copy has plus risk triage (risk ids, re-checking fixed risks, false positives, risks people raised in comments). This folder is a copy of the Dev one. |
| `mendix-assist/` | Your help on a Mendix app against its model, kept as Assist items: a Service Desk ticket checked (bug, works as designed, data or configuration, or cannot tell — with the evidence, a reply to paste back and for a bug a proposed fix), a Jira issue worked out, an idea worked out as a change, or other help. Asks the kind and the number first, notices what is missing and says what to ask the reporter, takes the reporter's answer back, and sets an item's status and planned date. One file per item in the project folder (`assist/<kind>/<id>.json`); never in a package or an export. Replaces mendix-ticket-check. Uses mendix-describe's tools, so it is installed beside it. | **The MxScout Dev repository** (`skills/mendix-assist/`). This folder is a copy. |
| `mendix-docs/` | Documents a Mendix app straight from its `.mpr` (or an MxScout project folder's `model.json`, handing results back into its `inbox/`; or, with `docs.js repo`, writing a Mendix project's committed `mxscout/docs/` as MxScout does), with nothing else running, as one offline HTML report (the same report MxScout exports). | **Here.** `mendix-docs/` is the installable copy, packed from `mendix-docs-source/`. |
| `app-report-presentation/` | How to lay out any application's documentation as a readable report or small portal, with a ready visual kit in `assets/` (tokens, components, icons, renderer, `build.js`, an example report). | **Here.** |

`mendix-docs-source/` holds mendix-docs' own files (`SKILL.md`, `docs.js`,
`README.md`, `CHANGELOG.md`) and the two tools that build and check it:
`pack-skill.js` and `selftest.js`. Everything else in `mendix-docs/` (the
engine, the checker, the references) is taken from MxScout when it is packed,
so it cannot drift. Edit `mendix-docs-source/`, never `mendix-docs/` by hand.

The guide to forward to people, in English and Polish in one file: [`docs/guide.md`](docs/guide.md) (built by `sync.sh` from MxScout's team guide plus [`docs/guide-mendix-docs.md`](docs/guide-mendix-docs.md) — edit those, not `guide.md`), and the team's guide as one offline HTML page with a language switch, [`docs/guide.html`](docs/guide.html) — a copy of MxScout's `public/guide-team.html`, the one canonical page (MxScout makes it from its `public/guide-team.md` with `tools/build-guide.js`, serves it as Team guide and writes it into each project as `mxscout/GUIDE.html`; anyone can download it from <https://github.com/ksiejek/mxscout/blob/main/public/guide-team.html>). `./sync.sh` copies it here; it is not built in this repository. Karol's working notes, with dated reviews (Polish): [`docs/przewodnik.md`](docs/przewodnik.md).

## Install — and keep up to date with git

On a new machine (or for someone you give access to):

```
git clone https://github.com/ksiejek/skills.git ~/Projects/Skills
~/Projects/Skills/install.sh
```

`install.sh` links each skill folder into `~/.claude/skills/` (an older copy
there is moved to `~/.claude/skills-backup/`, never deleted). Because they are
links, updating is only:

```
git -C ~/Projects/Skills pull
```

then start a new Claude Code session. `./install.sh mendix-docs` links one
skill only.

**Codex.** The skills are plain Markdown and Node scripts, not tied to Claude.
`./install.sh --codex` links them into Codex's skills folders as well —
`~/.agents/skills/`, where Codex looks now, and `$CODEX_HOME/skills/` (or
`~/.codex/skills/` when `CODEX_HOME` is not set), which older versions read —
for newer Codex versions that load skills in the same `SKILL.md` format (an
older folder of that name there goes to `skills-backup/` beside it). It
combines with names: `./install.sh --codex mendix-docs`. Restart Codex after.
`/mendix-assist` and `/mendix-docs` are Claude Code's; in Codex, say "use the
mendix-assist skill". In a Mendix project with `mxscout/`, Codex does not load
`.claude/skills/` by itself: the team guide's "Using Codex" (section 4) says
what to add to the repository's root `AGENTS.md`.

### Copying instead of linking

Copy a skill's folder into `~/.claude/skills/<name>/`:

```
cp -R mendix-describe         ~/.claude/skills/mendix-describe
cp -R mendix-docs             ~/.claude/skills/mendix-docs
cp -R app-report-presentation ~/.claude/skills/app-report-presentation
```

To replace an installed copy, remove the old folder first so files deleted
here do not linger. Node 18 or later for the two Mendix skills; no
dependencies, nothing to install.

### mendix-describe: which MxScout

This is MxScout Dev's copy, so `agent.js` talks to `http://127.0.0.1:4288`
(MxScout Dev) by default. For the public, reporting MxScout on port 4289,
choose it with `MXSCOUT_URL` (better than `--token` on the command line, the
token stays out of `ps` and shell history):

```
MXSCOUT_URL=http://127.0.0.1:4289 MXSCOUT_TOKEN=<token> node agent.js status
```

Against the public MxScout the risk-triage parts simply do not come up: its
pack has no `## risk triage` section.

## Rebuild mendix-docs from MxScout

```
node mendix-docs-source/pack-skill.js mendix-docs --mxscout ~/Projects/MxScout
node mendix-docs-source/selftest.js --mxscout ~/Projects/MxScout   # expect "36 passed, 0 failed"
```

`pack-skill.js` empties the destination first — only when it is empty or holds
an earlier copy of the skill (`SKILL.md` and `VERSION`); any other folder is
refused. `VERSION` names the MxScout commit it was packed from. To install
straight from the source, pack into `~/.claude/skills/mendix-docs` instead.

## Keep in sync

After MxScout or MxScout Dev changes (the engine in `public/`, or `skills/mendix-describe/`):

```
./sync.sh                                         # ~/Projects/MxScout and ~/Projects/MxScout-Dev
MXSCOUT_DIR=… MXSCOUT_DEV_DIR=… ./sync.sh         # anywhere else
git status && git diff --stat                     # review, then commit
```

`sync.sh` copies `skills/mendix-describe/` from **MxScout Dev** over
`mendix-describe/` (and names any file Dev no longer has, without deleting it),
re-packs `mendix-docs/` from `mendix-docs-source/` and the public MxScout's
engine, copies the public MxScout's `public/guide-team.html` to
`docs/guide.html`, and runs the selftest.

A change to mendix-describe belongs in MxScout Dev first (and in the public
MxScout too when it is not about a Dev-only feature), then `./sync.sh` here. A change to mendix-docs goes into `mendix-docs-source/`,
then `./sync.sh`.

## Never commit client data

No `.mpr`, `mprcontents/`, `.mxscout` package, AI pack, generated report or
descriptions file written for a real application goes into this repository;
`.gitignore` excludes them. Examples in the skills use made-up applications
only (Sales, orders, clerks).
