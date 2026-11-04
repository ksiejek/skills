# mendix-plan on an MxScout Team server

This is the skill as an agent uses it through the MxScout Team server's MCP
tools (the MCP server `mxscout`). The server hands it out with `read_skill`,
so it is always the copy the server runs. There are no files here: no
`agent.js`, no work folder, no story files on disk, and nothing to import by
hand. Everything you produce goes into the project with `write_story`, and
the numbered business rules it rests on with `write_brief`.

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
4. Get the numbered business rules: `read_brief` for the project. It answers
   the business brief the server keeps — what the team's own documents say
   the application should be — with its rules numbered BR-1, BR-2 … Keep
   those numbers. If it answers `brief: null`, the project has no brief yet:
   write one first with `write_brief` (`read_skill` with `name: "brief"` says
   how, from the documents the person gives you), and only then the plan, so
   the rules the plan rests on are written down once and can be pointed at
   later. Never leave a rule unnumbered and never renumber one.
5. `read_testcases` when the plan touches a part that is already tested: a
   rule whose text changes needs its cases written again
   (`read_skill` with `name: "testcases"`).

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
    MxScout draws in the plan layer and in the prototype. The kit is this
    server's own: `read_skill` plan, part `design-kit`, gives its class names
    and snippets — the company's kit when an admin imported one, else the
    neutral one. And `purpose`: the one line of the page a business reader
    sees — the heading above that mockup and the "what you see" line in the
    prototype. One sentence in the business's words: who comes to this screen,
    what they see, what they can do, BR numbers at the end. Never a
    non-persistent copy, a popup, a validation or an entity name; those go in
    `changes` and `widgets`.
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

- Never change the model. `write_story`, `write_brief`, `write_testcases` and
  `write_descriptions` are the only things you write, and a plan writes the
  story.
- Never invent a business rule to close a gap. The gap becomes P-n in
  `solution` and is repeated in the process it touches. A rule you do write
  belongs in the brief (`write_brief`), numbered, not only in the plan's
  prose.
- Never write a second story for the same plan.
- Never put personal data in a story — no names, addresses, record ids from
  production. The server hides what slips through and says so.
