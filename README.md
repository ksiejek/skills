# Skills

Karol's Claude Code skills. Private repository: it is not to be made public.

Each top-level folder except `mendix-docs-source/` is one installable skill.
The folder name is the skill's `name:` in its `SKILL.md`.

| Skill | What it does | Canonical home |
|---|---|---|
| `mendix-describe/` | Writes business-readable documentation of a Mendix app from an MxScout AI pack (a `.mxscout-ai-pack.md` file, or a running MxScout sharing a project with an agent) as a descriptions file MxScout imports. | **The MxScout Dev repository** (`skills/mendix-describe/`), which has everything the public MxScout's copy has plus risk triage (risk ids, re-checking fixed risks, false positives, risks people raised in comments). This folder is a copy of the Dev one. |
| `mendix-ticket-check/` | Checks a ticket reported on a Mendix app (a Jira issue, a bug report) against the model: bug, works as designed, data or configuration, or cannot tell — with the evidence, a reply to paste back, and for a bug a proposed fix; the result goes to MxScout's Tickets page. Uses mendix-describe's tools, so it is installed beside it. | **The MxScout Dev repository** (`skills/mendix-ticket-check/`). This folder is a copy. |
| `mendix-docs/` | Documents a Mendix app straight from its `.mpr`, with nothing else running, as one offline HTML report (the same report MxScout exports). | **Here.** `mendix-docs/` is the installable copy, packed from `mendix-docs-source/`. |
| `app-report-presentation/` | How to lay out any application's documentation as a readable report or small portal, with a ready visual kit in `assets/` (tokens, components, icons, renderer, `build.js`, an example report). **Draft for review**, as its `SKILL.md` says. | **Here.** |

`mendix-docs-source/` holds mendix-docs' own files (`SKILL.md`, `docs.js`,
`README.md`, `CHANGELOG.md`) and the two tools that build and check it:
`pack-skill.js` and `selftest.js`. Everything else in `mendix-docs/` (the
engine, the checker, the references) is taken from MxScout when it is packed,
so it cannot drift. Edit `mendix-docs-source/`, never `mendix-docs/` by hand.

A Polish guide to using the skills, with dated reviews: [`docs/przewodnik.md`](docs/przewodnik.md).

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
node mendix-docs-source/selftest.js --mxscout ~/Projects/MxScout   # expect "14 passed, 0 failed"
```

`pack-skill.js` empties the destination first. To install straight from the
source, pack into `~/.claude/skills/mendix-docs` instead.

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
engine, and runs the selftest.

A change to mendix-describe belongs in MxScout Dev first (and in the public
MxScout too when it is not about a Dev-only feature), then `./sync.sh` here. A change to mendix-docs goes into `mendix-docs-source/`,
then `./sync.sh`.

## Never commit client data

No `.mpr`, `mprcontents/`, `.mxscout` package, AI pack, generated report or
descriptions file written for a real application goes into this repository;
`.gitignore` excludes them. Examples in the skills use made-up applications
only (Sales, orders, clerks).
