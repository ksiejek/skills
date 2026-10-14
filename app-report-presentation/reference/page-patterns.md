# Page patterns

How each page type is laid out: what is shown first, the at-a-glance blocks,
when to use a list, a table or prose, the two layers of narrative, when a
diagram helps, what an empty state says, and how counts and badges look.

Every pattern here is built in `assets/` (`report.js` draws the pages from a
data JSON, `report.css` styles them; `assets/template.html` shows them all on
an example). Start from the kit: build the data JSON and run
`assets/build.js`; change only `assets/tokens.css` to restyle; never rebuild
the components from scratch. The kit's data model page is a list of records
(fields, relations, access), not yet the drawing described below.

## Shared parts

### The page header

Every page has the same header: the page name, and **one line saying what the
page is for, with its numbers**. Then, on the right, the page's own controls
(Copy link, a segmented control), and the global search.

Good:
- "Modules — 14 own modules and 6 third-party. Each holds part of the
  application: its flows, screens and records."
- "Risks — 38 findings in 9 modules. An agent wrote them from the source, so
  check each one before you act on it."
- "Quality — Six checks counted straight from the source and measured
  against the platform's own guidelines. Nothing here was written by an agent."

Bad: "Modules" alone. Bad: "Welcome to the modules page." Bad: a subheading
that repeats the title in other words.

### Captions, eyebrows and sections

- A **caption** names a block inside a page: small, upper case, letter-spaced,
  muted — `STEPS`, `HOW IT WORKS`, `FLOWS THAT CARRY IT · 4`. It may carry a
  count after a middle dot.
- An **eyebrow** sits above a page's main heading and says what kind of thing
  this is: `PROCESS 02 OF 5`, `OWN MODULE`, `ORDERS · FULL DESCRIPTION`. In
  the accent colour.
- A **numbered section** (Architecture) has a number in a small square, a
  heading, and one sentence under it that says how to read what follows
  ("Read across a row: the row part uses the column part.").

### Provenance

The reader must always know whether a sentence was **read from the source**
or **written about it**:

- per page, once: a muted line at the end ("Written by an agent from the
  source. Step lists and flow names come from the source; check the wording
  before you quote it.");
- per inline sentence in a list, where read and written facts mix: a small
  mark (`✦ AI`) with a tooltip "Written by an AI agent from this source, not
  read from it";
- on the Overview, once, beside the first call to action: "Numbers and
  structure are read from the source. The texts were written from it by an
  agent and can be wrong where the source is ambiguous."

A page with no written text says so too ("Everything here is read from the
source.").

### Empty states

An empty block says, in one sentence, **what nothing means here**. Never a
blank box, never "No data".

| Block | Good empty state |
|---|---|
| risks on a process | "No risk touches these flows." |
| a part's background work | "Nothing. Everything here starts from a screen or from another part." |
| a part's description | "No description of this part was written." |
| a record's own fields | "None of its own — it inherits those of `Party`." |
| access rules | "No access rule: no role reaches it from the client." |
| a filtered list | "No finding matches these filters." + a "Show all" button |
| a list of P1s | "None." |

### Counts and badges

- A count after a caption or a tab: `Contents 42`, `Uses · 3`. Muted, tabular
  figures.
- **One badge per row**, on the right, only when it changes what the reader
  does: `2 P1`, `switched off`, `both ways`. Not three pills.
- **Kind tags** (2–4 letters, monospace, outlined): `MF` `NF` `PG` `EN` for a
  Mendix report, the technology's own words elsewhere. Same width so the
  names after them line up.
- **Level badges**: `P1` `P2` `P3`, monospace, coloured text on a tinted
  background, always the letters, never colour alone.
- Facts on a part's header are **buttons that open the tab they count** ("12
  microflows" opens Contents).

## The two narrative layers

Applies to: the application, each main process, each part (module).

**Summary.** Two to four sentences of plain prose: what it is, who it is for,
what it achieves. Always visible. A reader who stops here knows what this is
for. No bullets, no bold, no list of features.

**Description.** Several paragraphs, below the summary, **one step away**:

- either a fold that opens on "Read the full description" (closed by
  default, the label says what opening it gives), or
- a page of its own, linked by a primary button "Read the full description"
  (the Overview does this for the application: the lead and summary on the
  Overview, the full text on Processes as item 0, "The application").

Pick one realisation per report and keep it.

| Part | Summary | Description |
|---|---|---|
| The application | 2–4 sentences | 4–10 paragraphs |
| A main process | 1–3 sentences | 3–5 short paragraphs, one per stage |
| A part (module) | 1–3 sentences | 2–6 paragraphs |
| A flow, screen, record | 1–2 sentences, under ~300 characters, shown in lists | none |

How the prose is shown:

- **Vertically, one block under another, full width of the reading column.**
  Never as tiles or cards side by side; a reader reads prose down, not across.
- **Paragraphs only.** The prose has no headings, bullets, tables or bold of
  its own. Facts that belong in a list (steps, flows, records, roles) are
  shown next to the prose already, in their own blocks.
- **The Overview's lead** is the summary's first sentence, larger; the rest of
  the summary sits under it at body size.
- **Reading width**: business prose at most about 75–85 characters per line.
  Tables and lists may use the full width.
- **Names inside prose** are in code font and link to their page when the
  report has them.

## Overview

See `information-architecture.md` → The landing page. Layout notes:

- One column of sections with generous space between them (the largest step
  of the spacing scale), so each section reads as its own block.
- The hero: name very large (display size), lead at ~22px, the rest at body
  prose size. The At a glance panel: a bordered card, label left (muted),
  value right (monospace), a hairline between rows, a P1 count in the P1
  colour.
- "Who uses it" and "What it talks to" may sit side by side on a wide screen
  — they are short and parallel. Prose never does.
- "What it does": numbered rows (`01`, `02`), name bold, summary under it,
  "6 steps · 4 flows" small, a chevron on the right. The whole row is the
  link.
- "Where to go next": three columns on a wide screen, stacked on a narrow one.

## Processes

A list on the left: item `—` "The application" (the full description), then
`01` … `0n`, each with "6 steps · 4 flows · 2 risks".

One process, top to bottom:

1. Eyebrow `PROCESS 02 OF 5`, the process name as heading, the summary as
   the lead.
2. `STEPS` — a numbered list, **one sentence each, naming who does what**:
   "A clerk checks the order and confirms it", not "Confirmation". As many as
   the case has.
3. `DIAGRAM` — only when the process branches (below).
4. Two columns on a wide screen: `HOW IT WORKS` — the description, one
   paragraph per stage — on the left; on the right `FLOWS THAT CARRY IT · 4`
   (kind tag, part prefix muted, name, "12 steps", each a link) and
   `RISKS ALONG THE WAY · 2` (level badge, title, each a link; empty state
   "No risk touches these flows.").
5. The provenance line.

The application (item 0): eyebrow `<APP> · FULL DESCRIPTION`, heading "The
application", the summary as lead, "Who uses it." as a short list (group in
bold, then what they do), then `HOW IT WORKS` (the description) beside the
list of processes.

### A process page holds what was traced

A process page is only as good as the tracing behind it. Before writing it,
whoever analyses the application (a person or an agent) follows one case
through the code that carries it, across parts: where it starts (a screen's
button, a schedule, an incoming call or message, a workflow), every decision
that changes its course and on what data, what is recorded (which status,
which field), the records the logic looks up by name (a team, a queue, a
template — often a literal in a query), who is told and how, what has a
deadline, what happens when something fails or is refused, and how it ends.
The description then tells that case stage by stage, about 200–400 words;
the steps are one sentence each; the flows on its way are listed. A process
written from the summaries of the parts it touches reads well and says
nothing — trace it again.

### When a process gets a diagram

Decide per process:

- **Draw it** when the case can go different ways: a decision that sends it
  elsewhere, rules tried in turn until one fits, a refusal or failure that
  ends it early.
- **Do not draw it** when it is a straight sequence. The numbered steps
  already say it; a column of boxes adds nothing.
- **Simplified**: the business steps, the decisions a business reader cares
  about in their words ("Is the customer known?"), the ends ("Order
  rejected"). Not every check a flow makes.
- Each step says who acts: a person (person icon, role as kicker) or the
  application (screen icon).
- Rules tried in turn are a chain of decisions, each with its way out
  ("found") that joins the step they all lead to, and the main path going on
  down ("not found").

## Parts (modules)

A list on the left: name (monospace), a grey line "12 flows · 4 screens · 9
records", on the right a `2 P1` badge and the total risk count. Above it:
Sort (A–Z · Size · Risks) and Own · Third-party.

One part:

1. Eyebrow `OWN MODULE` / `THIRD-PARTY MODULE`, the name (monospace) as
   heading, the summary as lead.
2. A row of **facts as buttons**: `12 flows` `4 screens` `9 records`
   `3 · 5 uses · used by` `2 P1 · 4 P2` — each opens its tab.
3. Tabs: **About · Contents · Connections · Risks**, each with its count.
   - **About**: `WHAT IT DOES` (the description, paragraphs) and then the
     developer notes as sections: a caption, then paragraphs, a short list,
     or one small table (≤ 6 columns, plain text; the first column monospace).
   - **Contents**: the part's items **grouped by the first part of each
     name** — a naming prefix the technology uses (`ACT_`, `SUB_`; `get`,
     `handle`) or the record the flows work on. Each group: the prefix in
     monospace, what the prefix means ("Page actions", "Sub-flows"), a count;
     inside, one column per kind with a caption (`MICROFLOWS · 7`). Items
     nothing reaches are struck through, and a hint line above the groups
     says so.
   - **Connections**: `USES · n` and `USED BY · n` (each row: the other
     part, "4 calls · 2 associations", a `both ways` badge when mutual) and
     `RUNS ON ITS OWN` (scheduled jobs with on/off, published services).
   - **Risks**: the part's findings, P1 first: badge, title, the fix in one
     muted line, "Open →".

## Architecture

One document in numbered sections, an anchor bar at the top (`1 Context`
`2 Runtime` `3 Modules` `4 Roles` `5 Open questions`). A section exists only
when its data does.

1. **Context.** The application in the middle; the groups of people and
   systems around it, **placed by direction of traffic**: people and systems
   that only send to it on the left, systems it only calls on the right, a
   group that goes both ways above it. At most five groups. Each group is a
   dashed frame with its name and chips (system name bold, what goes over in
   small text). Arrows between groups and the application, each with a one-
   or two-word label. Under the picture, the same as a table: `Partner ·
   Group · Direction · What goes over` (`→ App`, `App →`, `↔ App`).
2. **Runtime.** What the application runs as: people and callers on the
   left, the runtime's parts inside one dashed frame, stores and called
   systems on the right; orthogonal lines with labels. Then the read facts:
   published services (kind tag + name) and scheduled jobs (on/off dot, name,
   schedule), with a hint "Switched off in the source. Which ones run in
   production is set per environment."
3. **Dependencies between parts.** A dependency structure matrix: a row uses
   a column; cells with the count; a pair that depends both ways in the P1
   colour. Least-used parts at the top, the core at the bottom. Clicking a
   part lists its Uses and Used by.
4. **Roles and access.** User roles × parts: a mark (and count) where the
   role reaches the part.
5. **What the source does not show.** A numbered list of things to confirm
   (hosting, database, single sign-on, instance count). Written by an agent
   and labelled so.

Never draw a system you cannot name from the facts. Put it in section 5.

## Data model

- **One part at a time**, its records drawn as boxes on a grid, relations
  as orthogonal lines that never cross a box; each relation its own line
  (two relations between the same records are two parallel lines);
  multiplicity at the ends (`1`, `*`).
- **Kind told two ways**: header colour and outline style (solid = stored,
  dashed = not stored, dotted = view), with a legend. Not colour alone.
- Links to records in other parts sit at the foot of each box, as chips.
- **Nothing is picked on arrival**, so every record is drawn in full; a click
  picks one and greys the others; a click on the empty canvas lets go.
- A part too large to draw whole is drawn around the chosen record; a
  **List** view (Diagram | List switch) always holds the whole part.
- **The chosen record in full** in a panel beside the drawing: its
  description, fields (name, type, default), relations (owned and referring),
  and who can access it — role by role, read/write per field, write in the
  "ok" colour, read plain, no access faded.
- Zoom changes the view's scale only, never the layout. Ctrl/⌘ + wheel and a
  pinch zoom around the pointer.
- Access constraints written in a query language are laid out to be read:
  each condition on its own line, a path as `Order › Customer › Owner`, an
  operator as a word ("is", "is not", "is at least"), special tokens in words
  ("the current user", "now"); the exact text under it in code font.

## Flows (units of logic)

The list: grouped by part, one kind at a time (the menu entry picks the
kind), each row the name and "12 steps", a filter above. The detail: the
description (1–2 sentences, marked as written), parameters and result, who
may start it and from where, what calls it, then the drawing.

The drawing, **top to bottom**:

- the start at the top with what the flow takes; the ends at the bottom with
  what it returns;
- **the main path runs straight down**; the other way out of a decision
  leaves to the right with its own steps under its label, and either says
  "rejoins the main path" / "continues at step 7" or ends there;
- a loop is a dashed frame with its body inside it;
- error handling leaves to the right like another way out, labelled "error";
- every step is a card with its **family's colour and icon** (read data,
  create/change, save, delete, call, decision, show screen, message), a
  number in reading order, a short title, and a short plain value when it has
  one ("from $Order", "'Paid'");
- an expression with logic in it (if/then/else, long conditions) is **not**
  on the card — it makes the card as wide as the expression; it is shown in
  the step's details, laid out with `then`/`else` on their own lines and long
  conditions broken before `and`/`or`;
- a click on a card pins everything that step says (the values each field
  gets); a variable can be traced through the flow.

Use the same drawing for a process diagram (simplified) and for a flow, so the
two read alike.

## Screens

Same list/detail as flows. The detail: what the screen is for (1–2
sentences), who may open it, from where it is opened (menu, buttons on other
screens, flows), which flows its buttons start, and which records it shows.
A screen is not drawn as a mock-up unless the source gives its layout.

## Quality

Measured checks, not opinions. Cards in a row, one per check: a group label
(`Unused`, `Size`, `Naming`, `Security`) with a dot (warning or neutral), the
count large ("41", or "41 of 120"), the check's label, one small line ("No
caller, no screen, no menu, no role"). One card is open below:

- the check's title, **one paragraph explaining what the count means** and
  what it does not ("Code that only reflection calls shows up here too");
- **the rule it is measured against, quoted, with its source** (the
  platform's or team's guideline) — or nothing, when there is no published
  rule; never an invented one;
- the elements found, as a table with a caption row; long lists show the top
  n and "+ 32 more";
- a strip of chips "Where they are" (part and count) when it helps.

See `risks-and-quality.md` for why checks and risks stay apart.

## Risks

See `risks-and-quality.md`.

## For developers

Three tabs, each a different kind of text, each in its own form:

| Tab | Holds | Form |
|---|---|---|
| Where things are | questions a newcomer asks, and where the answer lives when the name does not say | question in bold, answer under it with names as links |
| Naming | the prefixes and naming rules the parts follow | a table: Pattern · What it means here · How many names |
| Before you change | what breaks easily | a numbered list, `01` … |

A filter over the text, and the parts each item names as a facet on the left
(with counts, "Across the app" first). Items grouped by part. Switching tab
clears the part facet.
