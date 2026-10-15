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

For a project MxScout keeps in a folder, give that folder in place of the
`.mpr` (or `--model <folder>`): the model comes from its `model.json`, the
descriptions from its `descriptions.json`, and `node docs.js send <folder>
descriptions.json` hands the result back through its `inbox/`.

## What it does not do

It writes nothing into the Mendix project — a file named inside its folder is
refused — and reads only the `.mpr` and `mprcontents/` (or, from an MxScout
project folder, its `project.json`, `model.json` and `descriptions.json`,
writing only into its `inbox/`, with `send`). It opens no connection. It sees what is saved in Studio Pro,
not unsaved work. Version 2 (the Orbit Desk portal, documents 01–03, `translate`,
`write docs` and `export`) is gone: see CHANGELOG.md.
