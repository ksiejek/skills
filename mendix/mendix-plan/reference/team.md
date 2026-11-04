# mendix-plan on an MxScout Team server

This is the skill as an agent uses it through the MxScout Team server's MCP
tools (the MCP server `mxscout`). The server hands it out with `read_skill`,
so it is always the copy the server runs. There are no files here: no
`agent.js`, no work folder, no story files on disk. Everything you produce
goes into the project with `write_story`.

How to read a model, write in the project's language and cite it is the
describe skill's: `read_skill` with `name: "describe"` when you have not read
it in this conversation.

## What you are making

One **solution story with a build guide**, on the project the plan is for,
under the ticket key the work has (`external`). That single story is the plan:
the business reads its processes on the **Processes** screen, the developer
reads its entities, flows and pages on the model's own screens, and the
prototype is drawn from the mockups in its pages. Rewriting the plan means
calling `write_story` again with the same `number` — never a second story.

## Before you write anything

1. `list_projects`, then `read_index` for the project. A project planned
   before it exists has almost no model — that is normal; the guide's modules
   may be ones nobody has built yet.
2. `list_stories` for the project. If a plan story is already there,
   `read_story` it and change that one.
3. `read_descriptions` for what is already written, and the project's
   architecture if it has one.
4. Get the numbered business rules. On a Team server the business brief is
   not written over MCP today — it is imported into the project by the person
   who owns it (format `mxscout-brief`). Ask for it, read the rules from it,
   and keep their numbers (BR-1, BR-2 …). If the project has no brief, say so
   and write the rules into the plan yourself, numbered the same way, so the
   brief can be made from them later; do not leave rules unnumbered.

## Writing the plan

`write_story` with:

- `external` — the ticket key (LIC-3, HQ-12 …).
- `summary` — what was asked and what the plan rests on, a short paragraph.
- `solution` — the plan in prose: the goal, the roles, the integrations, the
  modules, the domain model, what is out of scope, the sprint split
  (`## Podział na sprinty`, see the sprints part) and the open questions
  (`## Pytania otwarte`, numbered P-1 … P-n). Markdown is drawn here.
- `touched` — the modules and documents the plan names.
- `guide` — the buildable half:
  - `why` — the business reason, a few sentences.
  - `steps` — the build order, one sentence per sprint.
  - `processes` — the business processes, in the exact shape the process
    format part gives. This is what the business confirms.
  - `entities`, `microflows`, `pages` — the model to build. A page carries
    `mockup`: the sketch of its widgets in the design system's kit, which
    MxScout draws in the plan layer and in the prototype.
  - `checks` — how to tell the built thing works.

Nothing in `guide` may be a field the server does not know: unknown keys on a
process or an entity are dropped without a word, so check what came back with
`read_story` before you tell anyone the plan is in.

## The two halves must not drift

The same fact appears twice — once as prose a business reader confirms, once
as a step a developer builds. They must say the same thing. When you change a
rule after a conversation, change both, in the same `write_story` call.

A process names its screens; a screen belongs to a process. A page in `pages`
that no process names is either a page nobody asked for, or a process you
forgot to write.

## After you hand it in

`read_story` to see what the server kept. Then tell the person, in a few
lines and nothing more:

- what the business has to confirm (the processes, by name);
- which open questions block which sprint;
- what you could not decide and why.

Do not also paste the plan into the conversation. It is in MxScout; that is
the point.

## What you never do here

- Never change the model. `write_story` and `write_descriptions` are the only
  things you write, and a plan writes the story.
- Never invent a business rule to close a gap. The gap becomes P-n in
  `solution` and is repeated in the process it touches.
- Never write a second story for the same plan.
- Never put personal data in a story — no names, addresses, record ids from
  production. The server hides what slips through and says so.
