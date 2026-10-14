# Information architecture

The menu, the order of the pages, what each page answers, where a reader
lands, and how they move from one page to another.

## Three readers, one report

Design every page knowing which of these three it serves first. The others
must be able to use it, but one is the owner.

| Reader | Comes with | Needs first | Pages they own |
|---|---|---|---|
| Business owner, manager, auditor | "What is this and is it in good shape?" | prose, a few numbers, what needs attention | Overview, Processes, Risks (the top) |
| Newcomer (analyst, tester, new team member) | "How does it work and where is what?" | the parts, the processes, the structure | Modules, Architecture, the structure pages |
| Developer about to change it | "What breaks if I touch this?" | names, places, rules, pitfalls | flows, data model, Quality, For developers |

## The menu

Three groups, in this order. The group label is a small caption above its
entries, not a clickable item.

```
APPLICATION            what it is
  Overview               (landing page)
  Processes        5
  Modules         14
  Architecture
STRUCTURE              what it is made of
  Data model     212
  <flow kind 1>  840      e.g. Microflows / Services / Procedures
  <flow kind 2>  130      e.g. Nanoflows / Jobs / Triggers
  Screens        310      e.g. Pages / Views / Forms
REVIEW                 what needs attention
  Risks           38
  Quality          9
  For developers  41
```

- **Group names.** Default *Application · Structure · Review*. A report on a
  model-driven platform may call the middle group *Model*; keep the meaning
  ("what it is made of"), not the word.
- **Order inside a group** follows the reader's questions: what it is → what
  it does → how it is divided → how it fits around. Data before logic (a
  reader needs to know the records before the flows that move them make
  sense), logic before screens.
- **Every entry carries a count** of what its page lists, right-aligned, in
  tabular figures. Overview and Architecture carry none (they are documents,
  not lists). Risks may carry the P1 count instead of the total if the person
  prefers; never both in the menu.
- **Each entry has an icon** from one set, beside its label, never instead of
  it.
- **An entry exists only when its page has content.** No risks written: no
  Risks entry. No processes described: no Processes entry. The Overview
  always exists.
- **The menu does not move.** It is the same on every page, the current entry
  is marked (accent background or bar, plus `aria-current`), and nothing in it
  reorders when the reader clicks.
- **At the foot of the menu:** download the Markdown copy, theme switch
  (Light / Dark / Auto). Nothing else.
- **At the top of the menu:** the application's mark (its initial on a tile),
  its name, and one small line saying what it was read from and when
  ("Java 21 · source of 14 Oct 2026", "Mendix 10.18 · model of 14 Oct 2026").

Bad: a menu with fourteen flat entries in alphabetical order. Bad: a group
called "Misc". Bad: the tool's own logo above the application's name.

## What each page answers

Write this sentence for every page before laying it out. If you cannot, the
page is not ready.

| Page | Answers | First thing on screen |
|---|---|---|
| Overview | What is this, who uses it, what does it talk to, what does it do, what needs attention, where do I go next? | the application's name, its one-sentence lead, the at-a-glance facts |
| Processes | How does a case go from start to end? | the list of processes, then one process: name, summary, steps |
| Modules | What is each part for, what is in it, what does it lean on? | the list of parts, then one part: name, summary, facts |
| Architecture | What surrounds it, what does it run as, how do the parts depend, who reaches what? | numbered sections with an anchor bar |
| Data model | What is stored and how does it relate? | one part's records drawn, the chosen record in full beside them |
| Flows (each kind) | What exactly does this unit of logic do? | the list, then one flow drawn step by step |
| Screens | What can a user see and from where? | the list, then one screen: who may open it, from where, what it calls |
| Risks | What should be fixed, how soon, where? | the profile (how bad, which patterns, where) then one finding |
| Quality | What does the source measure badly against its own rules? | the checks as cards with counts, one open |
| For developers | Where is what, how are names built, what breaks easily? | three tabs, a filter, the list |

## The landing page: Overview

The Overview is one scrolling document, in the order a newcomer asks. Each
section is a heading, a one-line subheading with its numbers, an optional
"more" link to the full page on the right of the heading, and the body.

1. **About** — eyebrow ("<Technology> application · documentation"), the
   application's name large, the **first sentence of the summary** as the
   lead, the rest of the summary under it, a primary button "Read the full
   description", and one provenance line. Beside it (wide screens) or under
   it (narrow): an **At a glance** panel — label/value rows, each value a link
   to the page that lists it.
2. **Who uses it** — one row per group of users: an icon, the group's name,
   one sentence on what they do. Then one sentence linking to the formal
   roles ("The source gives them 7 user roles").
3. **What it talks to** — the systems around it, in at most five groups,
   placed by direction of traffic (see `page-patterns.md`, Architecture).
   "More" link: "Every partner and what it exchanges".
4. **What it does** — one numbered row per main process: `01`, name in bold,
   its one-line summary, and a small "6 steps · 4 flows". Each row links to
   that process.
5. **What needs attention** — the count per risk level as three tiles
   (P1 fix first · P2 plan a fix · P3 worth knowing), the titles of the P1
   findings with their part, and a few facts read directly from the source
   (unused elements, disabled steps, switched-off jobs), each a link.
6. **Where to go next** — three intents, each a heading, a sentence and
   two or three links with counts:
   - *Understand the application* → Modules, Architecture, Processes
   - *Read the logic* → flows, Data model
   - *Change it safely* → Risks, Quality, For developers

On a wide screen, an "On this page" contents list sits to the right and
follows the scroll; it also holds a short "This file" note (one HTML file,
opens offline, a Markdown copy exists).

Do not put the full description, a full risk list, or a full table of parts
on the Overview. It points; the pages hold.

## List and detail

Every page that holds many things of one kind (processes, parts, flows,
screens, findings) uses the same pattern:

- **a list on the left** (or on top, on a narrow screen): each row is the
  name, one small grey line of facts ("12 flows · 4 screens · 9 records"),
  and at most one badge on the right (P1 count, or a status);
- **one item in full on the right**, chosen from the list; the first item is
  chosen when the address names none;
- **the list keeps its scroll position and its order** when an item is picked.
  A pick never moves the list, never moves the picked row to the top, never
  scrolls the whole page;
- **sort and scope controls sit above the list** (Sort: A–Z · Size · Risks;
  Own · Third-party), as a small segmented control, never as a dropdown with
  one option.

Separate the application's own parts from third-party or library parts (Own
· Marketplace, Own · Vendor, Own · Generated). Own first. A reader cares
about what the team wrote.

## Moving between pages

- **Links instead of repetition.** A name of a flow, record, screen or part
  inside any sentence, list or table becomes a link to its page when the
  report has it. A name the report does not have stays plain code font.
- **A number links to what it counts.** "Entities 212" opens the Data model;
  "Scheduled jobs 9 · 3 on" opens the list of jobs.
- **Arriving from elsewhere starts clean.** Following a link to Risks clears
  the Risks filters, so the finding named in the link is on the list.
- **Breadcrumbs only where there is depth** (part › record). Two-level pages
  do not need them; the menu and the page title say where you are.
- **Previous / next** inside a filtered list of findings: two arrow buttons
  and "P1 · 3 of 7".

## Addresses

Every state a reader may want to send someone has its own address, so "Copy
link" copies exactly what is on screen:

```
#/                         Overview          ?s=users  → one section
#/processes/2              process 2 (0 = the whole application)
#/modules/Orders           one part          ?tab=contents
#/flows/Orders.SubmitOrder one flow          ?step=7   → one step
#/data/Orders/Order        one record
#/risks/R-012              one finding       ?lv=P1&th=access → filters
#/architecture?s=roles     one section
```

- Old addresses keep opening after the report is rebuilt.
- "Copy link" answers on the button itself ("Link copied", back after two
  seconds). No toast.

## Search

One search for the whole report, opened from a field at the top of the menu
or the header, and from Ctrl K (⌘K):

- a dialog over the page, focus kept inside it, Esc closes it;
- **names first**, grouped by what they are (parts, processes, flows,
  screens, records, findings), each with its kind tag;
- **then text**: the places the words occur in the prose (descriptions,
  findings, developer notes), the match highlighted;
- matching ignores case and accents (a Polish reader types "zrodlo" for
  "źródło");
- each result goes to the address of what it found.

Do not add a second search box on a page beside the global one. A page that
needs narrowing gets a *filter* labelled as such ("Filter, e.g. a word, a
prefix, a part"), only where the list is long.

## How big a report can get

- Lists of thousands of items: a filter field above the list and grouping
  (by part, by name prefix) instead of pages of rows.
- A part too big to draw whole: draw around the chosen item, list the rest.
- A matrix too wide: it scrolls sideways inside its own box; the page does
  not.
- The Markdown copy: a flow nobody described, no risk touches and no process
  uses is one line, not a section.
