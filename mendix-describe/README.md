# Describing a Mendix app with AI, from MxScout

How to have an AI agent write the business descriptions for a project you
have in MxScout: what the application is for, its main processes and its
modules — each as a short summary and a long description of several
paragraphs — a sentence or two on each microflow and nanoflow, the risks it
sees ranked P1 to P3, and what a developer should know before changing the
model. MxScout reads the
model; it does not write prose about it. This skill does, on your machine,
from the pack MxScout shares with it — no MCP server, no Studio Pro, and the
only connection is to the MxScout on your own machine.

`SKILL.md` in this folder is what the agent reads. This file is for you.

## What you need

- MxScout, with the project loaded.
- [Claude Code](https://claude.com/claude-code), or another coding agent that
  reads skills.

## 1. Install the skill (once)

Copy this folder into your skills folder:

```bash
cp -r skills/mendix-describe ~/.claude/skills/
```

On Windows that is `C:\Users\<you>\.claude\skills\mendix-describe`.

## 2. Give the agent the pack

(No agent that runs code — only Microsoft 365 Copilot in the browser? Skip this
skill: MxScout's Documentation has *Without an agent*, which cuts the model into
files a chat assistant takes and reads its answers back.)

**Straight from MxScout (no files).** Open the project → **Documentation** →
**Share with an agent**, then **Copy for the agent** and paste that line into
the agent's chat, together with the request below. The agent reads the pack
from MxScout one module at a time, and when it is done MxScout offers **Import
them** — nothing is kept until you press it. While you share, the pack sits in
the MxScout server's memory behind a token; **Stop sharing**, a reload or
closing the tab takes it away. Skip step 4.

**Or as a file.**

In MxScout: open the project → **Documentation** → **Export AI pack**.

You get `<Project>.mxscout-ai-pack.md`: the model as the documentation reads
it — every own module, its entities, and every flow step by step with the
values each step sets. Marketplace modules are left out. Put it in a folder
of its own, for example next to the project.

The pack is **not encrypted**. It is meant for an agent on your machine; keep
it where you keep the project.

## 3. Run the skill

Open Claude Code in that folder and ask, for example:

```
Run the mendix-describe skill on <Project>.mxscout-ai-pack.md.
Write the descriptions in English, for a business reader: they have to make
sense, you may be creative, but never invent what the model does not show.
Work module by module, in parallel subagents: per module a
descriptions.<Module>.json, with the module's notes for developers inside it
(reference/module-notes.md), and your own working file work.<Module>.md. Then
write the overview of the application and its main processes from those — for
the application, each process and each module both layers of
reference/business-narrative.md, a summary and a long description. Draw the
architecture, levels 1 and 2 (reference/c4.md). Also write the risks you find,
ranked by reference/risk-levels.md, and the context for developers. Merge
everything into
descriptions.json and check it with check-descriptions.js. Read long flows in
full, never from a truncated excerpt. At the end, tell me how many were
described, what stayed unclear, and how many tokens it took.
```

The same in Polish:

```
Uruchom skill mendix-describe na paczce <Projekt>.mxscout-ai-pack.md.
Opisy po polsku, z perspektywy biznesu: ma to mieć sens, możesz być
kreatywny, ale nie wymyślaj faktów, których nie ma w modelu.
Rób to moduł po module, równolegle subagentami: na każdy moduł
descriptions.<Moduł>.json, a w nim notatki modułu dla developera
(reference/module-notes.md), i własny plik roboczy work.<Moduł>.md. Potem z nich
napisz opis aplikacji i główne procesy — dla aplikacji, każdego procesu i każdego
modułu obie warstwy z reference/business-narrative.md, podsumowanie i długi
opis. Narysuj architekturę, poziomy 1 i 2 (reference/c4.md). Dopisz ryzyka wg
reference/risk-levels.md i kontekst dla developera.
Scal wszystko w descriptions.json
i sprawdź check-descriptions.js. Długie flowy czytaj w całości, nie
z ucinanych fragmentów. Na koniec podaj, ile opisano, co zostało
niejasne i ile tokenów to zużyło.
```

For a large project, add: *"Keep your progress in RESUME.md so the work can
be resumed in a new session."*

## 4. Import the result (file route only)

In MxScout: **Documentation** → **Import descriptions…** → pick
`descriptions.json`.

The descriptions appear in the previews and in the exported documentation
file, each shown as an agent's — marked **✦ AI**, or under a line saying an
agent wrote it — so a reader can always tell what an agent wrote
from what the model says.

## A change you want made

With the project shared (or the pack exported), ask the agent for a change —
not a description, a proposal:

```
Use the mendix-describe skill: I want customers to be able to cancel an order
until it ships. Show me how it works now and propose a solution, as a change.
```

It asks what is unclear first, then traces how that part of the application
works today, designs the solution the way the application already does things —
which microflows, pages, entities, attributes, enumerations and security rules
to add, change or remove — and lists what it touches, its risks and the
questions the model cannot answer. It changes nothing in the model. What it
sends (or the file it writes, `"add": true`, holding only `changes`) appears in
MxScout on the project's **Changes** page: how it works now beside the proposal,
both drawn when they branch, and the model changes in a table. Ask again with
your answers and it sends the change again under the same id, replacing it.

## When the model changes

Export a new pack. Every flow in it carries a fingerprint, so MxScout marks a
description whose flow changed as out of date instead of passing it off as
current, and the checker lists only what is left to do:

```bash
node ~/.claude/skills/mendix-describe/check-descriptions.js todo <Project>.mxscout-ai-pack.md descriptions.json
```

The other two commands:

- `check <pack> <descriptions.json>` — checks a file against the pack before
  you import it.
- `merge <out.json> <part.json> …` — joins per-module parts into one file.

The formats are in `reference/pack-format.md` and
`reference/descriptions-format.md`.
