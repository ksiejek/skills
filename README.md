# Skills

Karol's Claude Code skills. Private repository: it is not to be made public.

**`skills.tsv` is the list of every Claude Code skill on Karol's Mac Studio** — the
ones kept here and the ones that live in the MxScout and Tandem repositories —
with the one folder that is each skill's source of truth and whether it is
`active` or `retired`. `install.sh` links every active row into
`~/.claude/skills/`; Atlas (section Skille) and Tandem's knowledge base read the
same file. Edit a skill in its source folder only.

| Where | Skills | Status |
|---|---|---|
| here (`~/Projects/Skills`) | `app-report-presentation`, `mendix-docs` | active |
| `~/Projects/MxScout/skills` | `mendix-assist`, `mendix-describe`, `mendix-brief`, `mendix-change-proposal`, `mendix-testcases`, `mxscout-project` | active |
| `~/Projects/Tandem/skills` | `tandem`, `sprinter`, `lean-context`, `mendix/mxcraft-model`, `mendix/mxcraft-workflow`, `mendix/mxcraft-theme-scss` | active |
| `~/Projects/MxCraft/skills` | the five older copies of the Tandem ones | retired (2026-10-25): never linked, kept for history and the knowledge base |

`mendix-describe/` and `mendix-assist/` are no longer copied here (2026-10-25):
their one home is MxScout's `skills/` (MxScout Dev 2.0 has no skills).

| Skill kept here | What it does |
|---|---|
| `mendix-docs/` | Documents a Mendix app straight from its `.mpr` (or an MxScout project folder's `model.json`, handing results back into its `inbox/`; or, with `docs.js repo`, writing a Mendix project's committed `mxscout/docs/` as MxScout does), with nothing else running, as one offline HTML report (the same report MxScout exports). `mendix-docs/` is the installable copy, packed from `mendix-docs-source/`. |
| `app-report-presentation/` | How to lay out any application's documentation as a readable report or small portal, with a ready visual kit in `assets/` (tokens, components, icons, renderer, `build.js`, an example report). |

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

`install.sh` links every active skill of `skills.tsv` into `~/.claude/skills/`
(an older folder there is moved to `~/.claude/skills-backup/`, never deleted),
and removes links that point at a retired folder, into MxCraft, or at a folder
in `~/Projects` that has no `SKILL.md` any more. It is safe to run again: a
link that is already right is left alone. `./install.sh --check` only says
what it would change (exit 1 when something would). A skill whose repository
is not cloned (no MxScout or Tandem beside this one) is skipped with a note.
Because they are links, updating is only a `git pull` in the skill's own
repository, then a new Claude Code session. `./install.sh mendix-docs` links
one skill only.

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
cp -R mendix-docs             ~/.claude/skills/mendix-docs
cp -R app-report-presentation ~/.claude/skills/app-report-presentation
```

To replace an installed copy, remove the old folder first so files deleted
here do not linger. Node 18 or later for the two Mendix skills; no
dependencies, nothing to install.

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

After MxScout changes (the engine in `public/`, or `skills/mendix-describe/`):

```
./sync.sh                                         # ~/Projects/MxScout
MXSCOUT_DIR=… ./sync.sh                           # anywhere else
git status && git diff --stat                     # review, then commit
```

`sync.sh` re-packs `mendix-docs/` from `mendix-docs-source/` and MxScout's
engine and mendix-describe's checker, copies MxScout's
`public/guide-team.html` to `docs/guide.html`, and runs the selftest.

A change to mendix-describe or mendix-assist belongs in MxScout's `skills/`.
A change to mendix-docs goes into `mendix-docs-source/`, then `./sync.sh`.
A new skill, or one moved or retired: change its row in `skills.tsv`, then
`./install.sh`.

## Never commit client data

No `.mpr`, `mprcontents/`, `.mxscout` package, AI pack, generated report or
descriptions file written for a real application goes into this repository;
`.gitignore` excludes them. Examples in the skills use made-up applications
only (Sales, orders, clerks).
