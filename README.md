# Skills

Karol's Claude Code skills. Private repository: it is not to be made public.

**This repository is the one place every Claude Code skill on Karol's Mac Studio
is edited** (2026-10-25). `skills.tsv` lists each skill's source folder here,
the copies other projects carry, and the retired copies. `install.sh` links the
sources into `~/.claude/skills/`; Atlas (section Skille) and Tandem's knowledge
base read the same file.

| Folder | Skills |
|---|---|
| `mendix/` | `mendix-assist`, `mendix-describe`, `mendix-brief`, `mendix-change-proposal`, `mendix-testcases`, `mxscout-project`, `mendix-docs` (packed from `mendix-docs-source/`) |
| `budowa/` | `mxcraft-model`, `mxcraft-workflow`, `mxcraft-theme-scss` — building a Mendix model from Tandem |
| `tablica/` | `tandem`, `sprinter`, `lean-context` — the board and how a session works |
| `raporty/` | `app-report-presentation` |
| `retired/mxcraft/` | MxCraft's five old copies: never linked, kept for history and the knowledge base |
| `bin/skills.js` | writes the copies other projects carry |

## Copies in other projects

MxScout ships its skills (`/api/skills`, its own `skills/install.sh`, CI) and
Tandem's code reads its own, so both keep a **copy** in their `skills/` folder
(`copy` rows of `skills.tsv`). Never edit a copy:

```
node bin/skills.js check              # every copy: ok, behind, edited
node bin/skills.js publish [names…]   # writes the sources over their copies; then commit there too
node bin/skills.js pull <name>        # an edit someone made in a copy, back into the source
```

`publish` refuses a copy edited since it was last written (`.published.json`
keeps what was written) and says to `pull` it first; `--force` throws the edit
away. `mendix-describe/engine/` is MxScout's shared core: `check` and `publish`
refresh it from MxScout's `public/` first, so edit the engine in MxScout.

`mendix-docs-source/` holds mendix-docs' own files (`SKILL.md`, `docs.js`,
`README.md`, `CHANGELOG.md`) and the two tools that build and check it:
`pack-skill.js` and `selftest.js`. Everything else in `mendix/mendix-docs/` (the
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
and removes links that point at a retired folder, a copy in another project,
into MxCraft, or at a folder in `~/Projects` that has no `SKILL.md` any more.
It is safe to run again: a link that is already right is left alone.
`./install.sh --check` only says what it would change (exit 1 when something
would). Because they are links, updating is only a `git pull` here, then a new
Claude Code session. `./install.sh mendix-docs` links
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
cp -R mendix/mendix-docs              ~/.claude/skills/mendix-docs
cp -R raporty/app-report-presentation ~/.claude/skills/app-report-presentation
```

To replace an installed copy, remove the old folder first so files deleted
here do not linger. Node 18 or later for the two Mendix skills; no
dependencies, nothing to install.

## Rebuild mendix-docs from MxScout

```
node mendix/mendix-docs-source/pack-skill.js mendix/mendix-docs --mxscout ~/Projects/MxScout
node mendix/mendix-docs-source/selftest.js --mxscout ~/Projects/MxScout   # expect "36 passed, 0 failed"
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

A change to any skill is made here, then `node bin/skills.js publish` when it
has a copy elsewhere. A change to mendix-docs goes into
`mendix/mendix-docs-source/`, then `./sync.sh`. A new skill, or one moved or
retired: its folder under the right family, its row in `skills.tsv`, then
`./install.sh`.

## Never commit client data

No `.mpr`, `mprcontents/`, `.mxscout` package, AI pack, generated report or
descriptions file written for a real application goes into this repository;
`.gitignore` excludes them. Examples in the skills use made-up applications
only (Sales, orders, clerks).
