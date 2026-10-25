---
name: mxcraft-model
description: Jak sesja czyta i zmienia model Mendix bez wczytywania go do kontekstu – snapshot modelu w MxCraft (model.json + listy modułów), jeden dokument na wywołanie przez $TANDEM_DIR/modules/mendix/bin/mx-model.js albo Tandem model_read, zapis przez silnik (move, rename), tools/mpr (nowe dokumenty) albo MCP Studio Pro, po zapisie mx check i odświeżenie snapshotu. Używaj, gdy historyjka w MxCraft albo Tandem dotyka modelu Mendix (.mpr) – "przeczytaj mikroflow", "co to woła", "dodaj mikroflow / stronę / enumerację", "zmień nazwę", "przenieś do folderu", "zaimportuj model", "odśwież model", "jak wygląda encja".
---

# mxcraft-model — the Mendix model from a session

The .mpr (plus `mprcontents/`) in `~/Mendix/<project>` is the source of truth. MxCraft keeps a
snapshot of it per project: `projects/<pid>/model.json` and `modules/*.json` in the workspace
(`MXCRAFT_WORKSPACE`), the same files the story pages draw from and Tandem's `model_read` lists.
The snapshot is a cache: refresh it after every batch of writes, never edit it by hand.
Context rules: skill `lean-context`.

## Read: one document per call

- `node "$TANDEM_DIR/modules/mendix/bin/mx-model.js" ls <pid>` — modules with counts, own modules first. No model → export first.
- `node "$TANDEM_DIR/modules/mendix/bin/mx-model.js" find <pid> <text> [--module M] [--kind microflow]` — documents and entities
  by name or folder, with how many places call them.
- `node "$TANDEM_DIR/modules/mendix/bin/mx-model.js" doc <pid> Module.Name [--fields parameters,returnType,calledBy] [--related]` —
  one document as MxScout exports it (a microflow ≈ 7k chars, p90 19k; a page ≈ 3k, p90 11k;
  an entity ≈ 1k). `--fields` when you need less; `--related` adds the snippets, entities and
  enumerations a page uses and an entity's associations.
- In Tandem the MCP tool `model_read` does what `ls` and `find` do.
- Never: `cat model.json`, read `.mpr` or `.mxunit` bytes into the context, dump units, or read
  through Studio Pro's MCP server (≈ 17k tokens per session, 4–20 s per call —
  `docs/research/mcp-vs-files_2026-10-19.md`).

## Write: pick the tool, back up first

Before the first write: clone the Mendix repo to `~/Mendix/_backups` and tag it. Studio Pro must
not have the project open (`<name>.mpr.lock`); one story per .mpr at a time.

- Move documents into folders, rename documents or modules:
  `node "$TANDEM_DIR/modules/mendix/bin/mxcraft-engine.js" move|rename|rename-module <dir> … --dry-run` first, then for real.
  Every reference follows (`engine/README.md`).
- Create a document (microflow, nanoflow, page, snippet, enumeration…) from the learned specs:
  `python3 -I tools/mpr/document_create.py <dir> <Module> <Folder|-> values.json [--dry-run]`;
  delete one: `document_delete.py`; a page title: `page_set_title.py`. The specs were verified
  byte for byte for 273 types (`tools/mpr/registry/status.json`); an unverified type is refused
  unless `--unverified`. Examples: `tools/mpr/examples/`.
- A simple create.json (enumeration, entity, a short microflow, a create/edit form; `engine/README.md`,
  "Creating documents"): let the local model write it first (ML-19, MxCraft's `docs/local-model.md`):
  `node "$TANDEM_DIR/modules/mendix/bin/mxcraft-local-write.js" <dir> task.txt --out create.json` – Qwen in Ollama, MxCraft's
  validation, one correction. Then review every XPath and expression it lists (MxCraft does not
  check them), fix the file, and write with `node "$TANDEM_DIR/modules/mendix/bin/mxcraft-create.js" <dir> create.json --reviewed`.
  Exit 2 or Ollama down: write the file yourself.
- A value for an existing enumeration:
  `python3 -I tools/mpr/enum_add_value.py <dir> <Module> <Enum> <Value> --caption en_US=Text --caption pl_PL=Tekst [--after Value] [--dry-run]`.
  Widgets whose visibility or editability depends on that enumeration get a condition for the new
  value too (`--conditions hide` by default, `show`, `like:Value`, `skip`), so mx check gives no CE0456.
- Activities into an existing microflow or nanoflow: `python3 -I tools/mpr/microflow_insert.py list <dir> <Module> <Name>`
  shows each object (short id, what it does, position) and its flows; then
  `microflow_insert.py insert <dir> <Module> <Name> spec.json [--dry-run]` with
  `{"after": "<id>", "case": "true", "activities": [{"$Type": "Microflows$ActionActivity", "Action": {…}}]}`
  (or `"before"`, or `"flow"`). It rewires the flow, chains the new activities, moves what lies beyond
  (down a decision branch: only that column) and grows an enclosing loop. A `MicroflowCall` needs
  `"QueueSettings": null`; values as in `tools/mpr/examples/`. mx check after the batch.
- Everything else (a page's widgets, a decision of its own): Studio Pro's MCP server while Studio Pro
  has the project open (probe `"$TANDEM_DIR/modules/mendix/bin/mendix-mcp.js"`; `ped_check_errors` after a
  batch), or a new `tools/mpr` script built on `elementgen.py` and the specs. Never hand-written BSON.

## After a batch of writes

1. `"/Applications/Mendix Studio Pro <version>.app/Contents/modeler/mx" check -w -d <dir>/App.mpr -j /tmp/check.json`
   (≈ 30 s; the path is `MX` in `tools/mpr/learn.py`) — at most three per story; read the error
   count and the first errors, not the whole file.
2. `node "$TANDEM_DIR/modules/mendix/bin/mx-model.js" export <dir> --project <pid>` — the snapshot, the module lists and the
   drawings on the story page are current again (≈ 15 s for a 3 300-document project).
3. The change goes into the ticket (changes, history), not into the chat — skill `sprinter`.

## Budget

One read per document, one call per change, three checks per story, one-line results.
Target for a large story: 8–12 M tokens; today's scripts and dumps cost 80–150 M.
