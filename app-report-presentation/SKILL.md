---
name: app-report-presentation
description: Lay out the documentation of a software application as a readable report or small documentation portal — the menu and its groups, the order of the pages, what each page shows first, the two layers of business prose, when a diagram helps, how findings and risks are listed, type, spacing and colour, light and dark, and the language of labels and prose. For any application in any technology (low-code, Java, .NET, Node, SQL, ERP customisations…) and in any report language. Use when asked to present, lay out, design or restyle application documentation, to turn analysis results into a report people will read ("make this readable", "zrób z tego raport", "jak to pokazać"), or to review an existing documentation report for readability. It says how to PRESENT what was found, not how to analyse the application.
argument-hint: plan | build | review
---

# Presenting an application's documentation as a readable report

> **Status: DRAFT for review.** Distilled from a documentation reader that
> works well in practice (a model-driven app explorer's exported report).
> Every rule here is meant to hold for any technology and any language;
> where a rule came from one technology, it says so.

This skill is about **presentation only**. Whatever examined the application —
a parser, a static analyser, a person, another skill — has already produced
the facts: the parts, the flows, the data model, the roles, the integrations,
the findings. This skill decides how those facts become pages that a business
owner, a newcomer and a developer can each read in the time they have.

It does not tell you what to look for in the code, how to rank a defect in a
given technology, or what a framework's best practice is. Where a page needs
that knowledge (risk themes, quality checks, kind labels), the technology's
own analysis supplies it and this skill only says how to show it.

| Argument | What it does |
|---|---|
| `plan` | Map the technology's concepts onto page types and write the menu, before anything is built |
| `build` | Lay out the whole report from the facts and texts you have |
| `review` | Run `reference/checklist.md` over an existing report and list what to fix |

No argument: ask which, briefly, in the person's language.

## The ten rules that matter most

1. **The report belongs to the application, not to the tool.** Its title and
   mark are the application's (its name, its initial). Say once, quietly, what
   it was read from and when ("Read from the source of 14 Oct 2026"). Never
   brand it with the tool that made it.
2. **Three groups in the menu, in this order: what the application is, what
   it is made of, what needs attention.** Default names *Application*,
   *Structure*, *Review*. Pages inside each group in the order a newcomer
   would ask for them. See `reference/information-architecture.md`.
3. **A page exists only when it has something to show.** No empty menu entry,
   no "coming soon". When the data is missing for one section, the section
   goes; when a list is empty, it says in one sentence what that means.
4. **Every page opens with what it is for, in one line, with its numbers.**
   "12 findings in 5 modules. An agent wrote them from the source; check each
   one before you act on it." Not a bare title.
5. **Two layers of prose, never one.** A summary of two to four sentences,
   always visible, that stands on its own; a long description under it, one
   step away (a closed fold or a linked page). Blocks one under another, full
   width — never tiles side by side. See `reference/page-patterns.md`.
6. **Link, do not repeat.** Every name of a part the report has a page for is
   a link to that page. Every number links to the list it counts. A fact is
   written in full in one place and referred to everywhere else.
7. **Tell read facts from written prose.** What was read from the source
   (counts, names, steps, structure) and what an agent or a person wrote
   (descriptions, risks, judgements) must be distinguishable at a glance — a
   mark, or one provenance line per page. A sentence that asserts behaviour is
   a claim, whatever its font size; it has to be true.
8. **Colour by kind, never by module.** A small fixed set of colours means
   *what sort of thing* (data read, data saved, a call, a decision) and three
   reserved colours mean *how bad* (P1, P2, P3). One accent for links and the
   current place. Everything still reads in grayscale. See
   `reference/visual-rules.md`.
9. **Translate the words, never the names.** Labels and prose follow the
   reader's language; identifiers (modules, classes, tables, flows, fields)
   stay exactly as in the source, in code font. See `reference/language.md`.
10. **A diagram must earn its place.** Draw a process only when it branches;
    draw a flow top to bottom with the main path straight down and the other
    ways to the side; draw context grouped by direction of traffic. A straight
    sequence is a numbered list, not a picture.

## Map the technology first

Before laying out anything, map what this technology calls things onto the
report's generic page types. Use the technology's own words on the page; the
generic type only decides **where** it goes and **how** it is laid out.

| Generic page type | It holds | Examples by technology |
|---|---|---|
| **Processes** | business processes told end to end | the same everywhere: written from the parts below |
| **Modules** (parts) | the units the application is divided into | Mendix modules · Maven/Gradle modules or top packages · .NET projects · npm workspaces · Django apps · DB schemas · ABAP packages |
| **Flows** (logic) | the units of behaviour, each drawable as steps | Mendix microflows/nanoflows · Spring service methods and endpoints · .NET controller actions and handlers · stored procedures and triggers · OutSystems actions · Power Automate flows |
| **Data model** | what the application stores and how it relates | entities · tables · JPA/EF/ORM classes · document collections |
| **Screens** | what users see and from where | Mendix pages · routes/views of a web front end · forms · reports |
| **Architecture** | context, runtime parts, dependencies, roles | systems around it; services, jobs, queues; module dependency matrix; roles × parts |
| **Risks** | judged findings, ranked | written by an analyst or agent |
| **Quality** | measured checks against a stated rule | counted by a tool |
| **For developers** | where things are, naming, what breaks easily | written by an analyst or agent |

Rules for the mapping, in full in `reference/concept-mapping.md`:

- **Keep the technology's labels.** A Mendix report says *Microflows*, a
  Spring report says *Services* or *Endpoints*, a database report says
  *Procedures*. The generic word ("flows") is for you, not for the reader.
- **Several kinds of flow are several menu entries** under one group, each
  with its own count, when the technology distinguishes them (Mendix:
  microflows, nanoflows; .NET: controllers, background jobs).
- **Kind tags and risk themes only where the technology has them.** Short
  tags (`MF`, `NF`, `PG`; `SP`, `TRG`; `CTL`, `JOB`) come from the
  technology's own vocabulary. If it has none, use words. Never invent a
  taxonomy to fill a column.
- **No counterpart, no page.** A technology with no screens has no Screens
  page. A concept with no generic page (BPMN workflows, message topics,
  report definitions) goes under the closest group with its own name.

## Work in this order

1. **Inventory what you have.** List the facts read from the source and the
   texts written about it, separately. Note which exist for the whole
   application, which per part, which per flow. Do not lay out what you do not
   have, and do not write what you were not given.
2. **Map the concepts** (above) and write the menu: groups, entries, counts.
   `plan` stops here and shows it to the person.
3. **Lay out each page** by its pattern in `reference/page-patterns.md`:
   the header line, what is shown first, at-a-glance blocks, lists or tables,
   prose layers, diagrams, empty states.
4. **Present findings** by `reference/risks-and-quality.md`: levels, grouping
   by cause, where and fix, risks apart from measured checks.
5. **Apply the visual rules** in `reference/visual-rules.md`: one type scale,
   one spacing scale, colour by kind, light and dark, long names, numbers.
6. **Language pass** by `reference/language.md`: labels in the reader's
   language, identifiers untouched, plurals, dates and numbers in the
   reader's locale.
7. **Review** with `reference/checklist.md` before handing the report over.
   The Trunk Test on every page type, the accuracy sweep, the counts that must
   agree.

## The output

Default: **one self-contained HTML file** that opens offline in any browser —
styles, scripts, fonts and data inside it, nothing loaded from anywhere. It
has a sidebar menu, a page header, a search (Ctrl K), Light/Dark/Auto, a
print stylesheet, and an address for every state worth sending to someone
("Copy link"). Next to it, offer a **Markdown copy with the same content** in
the same page order: drawings become tables and numbered lists. That copy is
what reads well in AI tools and in a repository.

If the person asks for another medium (a wiki space, a PDF, a Word file, a
slide deck), keep the information architecture, the page patterns and the
language rules; drop only what the medium cannot do (interactive filters
become grouped lists, the fold becomes a sub-heading "Full description").

When text from the application (names, captions, messages, comments) goes
into HTML, it is **text, never markup**: set it as text or escape it. The
report never carries secrets or personal data, even when the source does —
note that a key exists, never its value.

## Files

- `reference/information-architecture.md` — the menu: groups, page order,
  what each page answers, the landing page, how a reader moves between pages,
  addresses and search.
- `reference/page-patterns.md` — each page type: header line, first view,
  at-a-glance blocks, lists vs tables vs prose, the two narrative layers,
  diagrams, empty states, counts and badges.
- `reference/visual-rules.md` — type and spacing scales, colour by kind, one
  accent, light and dark, density, tables, long names, numbers, icons, print.
- `reference/language.md` — business reader vs developer, translating labels
  and prose but not identifiers, plurals, dates and numbers, mixed-language
  reports, terminology lists.
- `reference/risks-and-quality.md` — presenting findings: levels, patterns,
  grouping by cause, where and fix, measured checks vs judged risks.
- `reference/concept-mapping.md` — mapping a technology's concepts onto the
  page types, with worked examples.
- `reference/checklist.md` — the readability review before hand-over.
