# mendix-docs

A Claude Code skill that documents a Mendix application from its `.mpr` file
alone, as one offline HTML report — the same report MxScout exports.

It is the `mendix-describe` skill without MxScout running. `docs.js` reads the
model with MxScout's own engine (in `engine/`, the browser files MxScout runs,
loaded in Node unchanged) and writes the AI pack; the agent writes the
descriptions file by the same rules (`reference/`) and checks it with the same
checker (`check-descriptions.js`); `docs.js report` builds the report with the
descriptions on it.

## Install

The skill is private: its source is `mendix-docs-source/` in the private
`ksiejek/skills` repository. The installable copy is put together with the
engine and the shared rules taken from the public MxScout repository, where
they live:

```
node mendix-docs-source/pack-skill.js ~/.claude/skills/mendix-docs --mxscout ~/Projects/MxScout
```

`node mendix-docs-source/selftest.js --mxscout ~/Projects/MxScout` checks it on
MxScout's own test fixture.

Node 18 or later. No dependencies, nothing to install.

## Use

In Claude Code, in a folder outside the Mendix project: `/mendix-docs build`,
`/mendix-docs update`, `/mendix-docs process <what>`, `/mendix-docs change <what>`,
`/mendix-docs ticket <text>`, `/mendix-docs question <what>`, `/mendix-docs report`.
With no argument it asks what you want. SKILL.md says what each does.
`docs.js docs` writes the documentation as Markdown, the agent's map for
everything after the first build.

Everything the agent makes while it works — the pack, the parts,
`descriptions.json`, its notes — goes into a work folder outside the Mendix
project, which `node docs.js workdir <app.mpr>` prints: `$MXSCOUT_WORK` when
set, else `mxscout-work/<project>` in the system's temporary folder (on macOS
under `/var/folders/…/T/`, on Windows `%TEMP%\mxscout-work\<project>`). The
temporary folder may be cleared, and `descriptions.json` is the only copy of
what was described: for real work, set `MXSCOUT_WORK` to a folder you keep,
outside the project (`<project's parent>/<App>-docs`).

For a project MxScout keeps in a folder, give that folder in place of the
`.mpr` (or `--model <folder>`): the model comes from its `model.json`, the
descriptions from its `descriptions.json`, and `node docs.js send <folder>
<work>/descriptions.json` hands the result back through its `inbox/`.

For a project kept inside the Mendix project (`mxscout/`, shared through the
app's git), `node docs.js repo <MendixProject>` writes `mxscout/docs/` — the
documentation by topic, its manifest, the index of the solved cases in
`mxscout/knowledge/` — from the `.mpr`, the descriptions in
`mxscout/descriptions/` and the case notes, byte for byte as MxScout does, and
nothing when `docs/manifest.json` says it is current.

## What it does not do

It writes nothing into the Mendix project — a working file named inside its
folder is refused, a report that would land there goes into the work folder
instead; the one exception is `repo`, which writes `mxscout/docs/` and nothing
else — and reads only the `.mpr` and `mprcontents/` (or, from an MxScout
project folder, its `project.json`, `model.json` and `descriptions.json`,
writing only into its `inbox/`, with `send`). It opens no connection. It sees what is saved in Studio Pro,
not unsaved work. Version 2 (the Orbit Desk portal, documents 01–03, `translate`,
`write docs` and `export`) is gone: see CHANGELOG.md.
