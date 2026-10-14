# mendix-docs — changes

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
