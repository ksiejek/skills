# Skills

Karol's Claude Code skills. Private repository: it is not to be made public.

Each top-level folder except `mendix-docs-source/` is one installable skill.
The folder name is the skill's `name:` in its `SKILL.md`.

| Skill | What it does | Canonical home |
|---|---|---|
| `mendix-describe/` | Writes business-readable documentation of a Mendix app from an MxScout AI pack (a `.mxscout-ai-pack.md` file, or a running MxScout sharing a project with an agent) as a descriptions file MxScout imports. | **The MxScout repository** (`skills/mendix-describe/`), where it ships with the app. This folder is a copy. |
| `mendix-docs/` | Documents a Mendix app straight from its `.mpr`, with nothing else running, as one offline HTML report (the same report MxScout exports). | **Here.** `mendix-docs/` is the installable copy, packed from `mendix-docs-source/`. |
| `app-report-presentation/` | How to lay out any application's documentation as a readable report or small portal. **Draft for review**, as its `SKILL.md` says. | **Here.** |

`mendix-docs-source/` holds mendix-docs' own files (`SKILL.md`, `docs.js`,
`README.md`, `CHANGELOG.md`) and the two tools that build and check it:
`pack-skill.js` and `selftest.js`. Everything else in `mendix-docs/` (the
engine, the checker, the references) is taken from MxScout when it is packed,
so it cannot drift. Edit `mendix-docs-source/`, never `mendix-docs/` by hand.

A Polish guide to using the skills, with dated reviews: [`docs/przewodnik.md`](docs/przewodnik.md).

## Install

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

`agent.js` talks to MxScout at `http://127.0.0.1:4289` by default, which is
the public, reporting MxScout. MxScout Dev runs on port 4288. Choose the app
with `--url` or `MXSCOUT_URL`:

```
MXSCOUT_URL=http://127.0.0.1:4288 node agent.js status --token <token>
node agent.js status --url http://127.0.0.1:4288 --token <token>
```

## Rebuild mendix-docs from MxScout

```
node mendix-docs-source/pack-skill.js mendix-docs --mxscout ~/Projects/MxScout
node mendix-docs-source/selftest.js --mxscout ~/Projects/MxScout   # expect "10 passed, 0 failed"
```

`pack-skill.js` empties the destination first. To install straight from the
source, pack into `~/.claude/skills/mendix-docs` instead.

## Keep in sync

After MxScout changes (its engine in `public/`, or `skills/mendix-describe/`):

```
./sync.sh                                # MxScout at ~/Projects/MxScout
MXSCOUT_DIR=/path/to/MxScout ./sync.sh   # anywhere else
git status && git diff --stat            # review, then commit
```

`sync.sh` copies `skills/mendix-describe/` from MxScout over `mendix-describe/`
(and names any file MxScout no longer has, without deleting it), re-packs
`mendix-docs/` from `mendix-docs-source/` and MxScout, and runs the selftest.

A change to mendix-describe belongs in the MxScout repository first, then
`./sync.sh` here. A change to mendix-docs goes into `mendix-docs-source/`,
then `./sync.sh`.

## Never commit client data

No `.mpr`, `mprcontents/`, `.mxscout` package, AI pack, generated report or
descriptions file written for a real application goes into this repository;
`.gitignore` excludes them. Examples in the skills use made-up applications
only (Sales, orders, clerks).
