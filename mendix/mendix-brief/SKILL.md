---
name: mendix-brief
description: Write the business brief of an application — what it is meant to be, as the team's own documents say it — from user stories, design documents and notes (Markdown, Word, PDF, an export of the stories), and hand it to MxScout, where it is kept as a version on the Business brief page and exported as HTML or Markdown. Purpose, roles, processes, numbered business rules (BR-1, BR-2 …), the data it expects and what the documents leave open, every statement with the document it came from. Needs mendix-describe beside it to hand the brief in. Use when told "use mendix-brief", "write the business brief", "opis biznesowy", "zbierz historyjki w opis", "co ma robić aplikacja według dokumentów", "update the brief, there are new stories".
---

# mendix-brief: what the application is meant to be

A team keeps what an application is for in many places: user stories, a
design document, meeting notes, a spreadsheet of requirements. You read them
and write **one business brief**: what the application is for, who uses it,
the processes it supports, the business rules — numbered, so a ticket or a
later check against the model can point at one — the data it expects, and
what the documents leave open or contradict. MxScout keeps it as a version on
the project's **Business brief** page and exports it as HTML (to read) and
Markdown (for an agent).

The brief says what the **documents** say. It is not a description of the
model, and you do not read the model for it: what the model does is
mendix-describe's job, and comparing the two is a separate step. When a
document and your idea of how such apps usually work disagree, the document
wins; when two documents disagree, say so under `open`.

## Keep the Mendix project clean

Write nothing into the Mendix project or the documents' folder: the brief, a
draft and any text you extract go in the work folder
`node ../mendix-describe/agent.js workdir` prints (`<work>` below). Never
commit anything. `check-brief.js` only reads.

## Steps

1. **Find the documents.** Ask the person where they are if they did not say
   (a folder, a few files). List them:

   ```sh
   node check-brief.js sources <folder or files …>
   ```

   It numbers them S1, S2 … and says how to read each. Keep those numbers:
   they are the brief's `sources`. Leave out a file that says nothing about
   the application (a logo, a build script) — and its number with it,
   renumbering what is left from S1.

2. **Read them.** Text, Markdown, CSV and HTML as they are; a Word document
   with `node check-brief.js text <file.docx>` (headings come out as `#`);
   a PDF with your own file reader. An older `.doc`, `.odt` or a spreadsheet
   cannot be read here: ask for it as `.docx`, `.pdf` or `.csv`. Read a long
   document by its headings, not whole into the conversation, and keep notes
   in `<work>` as you go: which statement came from which source and where
   (`S2 §3.1`, `S1 US-14`).

3. **Is there a brief already?** For a project kept in a folder, MxScout
   writes the newest one as `brief.md` beside `documentation.md` (inside the
   Mendix project: in its local part — `node ../mendix-describe/agent.js
   status` names the folder). If there is one, start from it: **keep every
   rule's number**. A changed rule keeps its number with the new text; a new
   one takes the next free number; a dropped one's number is never given to
   another rule. Say what changed in your answer to the person.

4. **Write the brief** as `<work>/brief.json` — the format is in
   `reference/brief-format.md`. The parts:
   - `summary` — what the application is for, whom it serves and what it
     replaces or improves: a few sentences a manager would sign.
   - `roles` — who uses it, in the documents' words.
   - `processes` — what people do with it, each a short description and,
     where the documents give them, its `steps`.
   - `rules` — the business rules: one checkable statement each ("An attendee
     may hold at most two tickets per event"), BR-1, BR-2 …, with the
     `process` it belongs to when it belongs to one.
   - `data` — what the application keeps (an event, a registration), with the
     `fields` the documents name.
   - `open` — what the documents leave undecided, and where they disagree.

   Every role, process, rule and data entry names its `sources`. Write in the
   documents' language unless the person asks for another; say it in
   `language`. **No personal data**: a role, never a person's name; no
   e-mail addresses or phone numbers, even when the documents have them.

5. **Check it** — fix every error, read every warning:

   ```sh
   node check-brief.js check <work>/brief.json
   ```

   It uses the same file MxScout reads the brief with, so a brief that passes
   here is taken there.

6. **Hand it in:**
   - **Project folder:** `node ../mendix-describe/agent.js send
     <work>/brief.json --folder <folder>` writes it into the folder's
     `inbox/` (inside the Mendix project, its local `inbox/`). MxScout takes
     it while the project is open, saves it as the next version and shows it
     with **Undo**.
   - **Agent channel** (Share with an agent pressed in MxScout):
     `node ../mendix-describe/agent.js send <work>/brief.json`.
   - **Neither:** tell the person the full path of `brief.json` and to press
     **Import a brief…** on the Business brief page.

7. **Tell the person** in a few lines: how many processes and rules, the
   open questions worth their attention, and — when it updates an earlier
   brief — which rule numbers were added, changed or dropped.

## What not to do

- Do not invent a rule the documents do not state, to make the brief look
  complete: an `open` entry saying what is missing is worth more.
- Do not read the Mendix model to fill gaps. The brief is the plan; the model
  is what was built.
- Do not paste a document's text whole into `summary` or a process: say it in
  your words and name the source.
- Do not renumber the rules of an earlier brief.
