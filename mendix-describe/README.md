# Describing a Mendix app with AI, from MxScout

How to have an AI agent write the business descriptions for a project you
have in MxScout: what the application is for, its main processes and its
modules — each as a short summary and a long description of several
paragraphs — a sentence or two on each microflow and nanoflow, the risks it
sees ranked P1 to P3, and what a developer should know before changing the
model. MxScout reads the
model; it does not write prose about it. This skill does, on your machine,
from the project folder MxScout writes (or the pack it shares) — no MCP server,
no Studio Pro, and no connection beyond your own machine.

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

## 2. Give the agent the project

(No agent that runs code — only Microsoft 365 Copilot in the browser? Skip this
skill: MxScout's Documentation has *Without an agent tool*, which cuts the model
into files a chat assistant takes and reads its answers back.)

**The project's folder — the first way.** Keep the project in a folder: New
project offers it first; for a project already in MxScout, its ⋯ menu →
**Keep in a folder…**, or **Move all projects to folders…** on the project
list. A folder that came from git or another machine opens with **Open a
project folder…**, and a `.mxscout` package opened as a new project goes into a
folder too. MxScout writes the folder as you work — `project.json`,
`model.json`, `descriptions.json`, `documentation.md`, `ai-pack.md`,
`README.md` and `inbox/` — and **Documentation → Folder** shows it, with the
line to paste:

```
Use the mendix-describe skill on the MxScout project in ~/Projects/OrderPortal/mxscout.
```

(MxScout knows only the folder's name; type its path once on the Folder tab
and the line uses it — or start the agent inside the folder and say "Use the
mendix-describe skill on this folder".) The agent reads `README.md`,
`project.json`, `documentation.md` first and `ai-pack.md` one module at a
time, and writes its result into `inbox/` (`node agent.js send … --folder`).
While the project is open in MxScout, it is taken within a few seconds —
saved at once with **Undo**, or, a whole file that would replace the
descriptions you have, waiting for **Import them** — and moved to
`inbox/done/`. Nothing has to be started, and the agent needs no token. Skip
step 4.

**Through MxScout's agent channel (no folder).** Open the project →
**Documentation** → **Agent channel** → **Share with an agent**, then **Copy
for the agent** and paste that line into
the agent's chat, together with the request below. The agent reads the pack
from MxScout one module at a time, and when it is done MxScout saves what it
sent at once, with **Undo** beside it — a whole file that would replace the
descriptions you have waits for **Import them**, and the card has a switch to
make everything wait. While you share, the pack sits in
the MxScout server's memory behind a token — with the documentation as
Markdown beside it once the project has descriptions, which the agent reads
first as its map; **Stop sharing**, a reload or closing the tab takes both
away. Skip step 4.

The agent reads the token from `MXSCOUT_TOKEN` in its environment, which the
skill tells it to prefer over `--token`: an argument is visible to other
processes on the machine (`ps`) and stays in the shell's history. It talks only
to MxScout on this machine, follows no redirect, and gives up on a call that
has no answer within 30 seconds (`MXSCOUT_TIMEOUT_MS` changes that).

The line alone does not set the agent describing: it connects, tells you what
it sees, and asks what you want — describe the application (all or some
modules), bring it up to date, one more process, a change, or a question
about how something works — a ticket, a Jira issue or an idea is
mendix-assist's. Say it in the same message to skip the
question.

**Or as a file.**

In MxScout: open the project → **Documentation** → **Without an agent tool** → **Export AI pack**.

You get `<Project>.mxscout-ai-pack.md`: the model as the documentation reads
it — every own module, its entities, and every flow step by step with the
values each step sets. Marketplace modules are left out. Put it in a folder
of its own, for example next to the project.

The pack is **not encrypted**. It is meant for an agent on your machine; keep
it where you keep the project.

## 3. Run the skill

**The language.** Everything the agent writes is in one language per project,
**English by default**. MxScout keeps it with the project (Settings, or the
Folder tab: *Language of written content*); the agent reads it first, and asks
"In which language should I write? (default: English)" only when it is not set
yet — the answer is kept for the project, and it never asks again. To change it
later, change the setting, or tell the agent ("from now on, write in Polish"):
it says so and marks its result so MxScout changes the setting. Headings,
labels and field names stay English whatever the language.

Open Claude Code in the project folder (or wherever the pack is) and ask, for example:

```
Run the mendix-describe skill on this folder.
Write the descriptions for a business reader: they have to make
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

`work.<Module>.md` is the agent's own notes on a module, which SKILL.md asks it
to keep while it reads that module: where each case starts, the statuses it
sets, the decisions, the records looked up by name, the messages that go out.
The main processes are traced from those notes afterwards, not from the module
summaries. The files stay in the working folder: they are never imported into
MxScout and never sent to it, and you may delete them when the work is done.

The same in Polish:

```
Uruchom skill mendix-describe na tym folderze.
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

(The Polish prompt asks for Polish: when the project's language is not set
yet, the agent takes that as the answer to its question and MxScout keeps it.)

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
MxScout on the project's **Assist** page (its Ideas tab): how it works now beside the proposal,
both drawn when they branch, and the model changes in a table. Ask again with
your answers and it sends the change again under the same id, replacing it.

## A ticket, a Jira issue, an idea

To check a Service Desk ticket (is it a bug, does it work as designed, is it
the data), work out a Jira issue or an idea, or keep any other help, use the
**mendix-assist** skill beside this one (`skills/mendix-assist`, its README
says how). It uses this skill's tools, so install both. What it writes is an
Assist item with a status and a planned date, kept in MxScout on this machine
and never in the exported documentation.

## When the model changes

In a project folder there is nothing to do: MxScout rewrites `ai-pack.md` and
`documentation.md` when the model is replaced, and `node check-descriptions.js
todo --folder <folder>` lists what is left. Otherwise export a new pack, or share again. Every flow in it carries a fingerprint, so MxScout marks a
description whose flow changed as out of date instead of passing it off as
current, and the checker lists only what is left to do:

```bash
node ~/.claude/skills/mendix-describe/check-descriptions.js todo <Project>.mxscout-ai-pack.md descriptions.json
```

In a folder, or shared with an agent, ask it to *update the documentation*: it
reads the documentation (`documentation.md`, or `node agent.js docs`), gives that to the checker
in place of `descriptions.json`, and describes only the new flows and the ones
marked out of date — not the whole application again.

## A question about the application

In a folder, or shared with an agent, you can also just ask — "who can reopen a closed case?".
It reads the documentation first, checks the flows it points to in the pack,
and answers citing them; it writes nothing unless you ask.

The other two commands:

- `check <pack> <descriptions.json>` — checks a file against the pack before
  you import it.
- `merge <out.json> <part.json> …` — joins per-module parts into one file,
  by the rules MxScout imports a file that adds by; parts that all add make a
  file that adds.

The formats are in `reference/pack-format.md` and
`reference/descriptions-format.md`.
