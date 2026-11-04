---
name: mendix-plan
description: Plan a Mendix application before it is built, so the business can confirm it and a developer can build it — from the team's documents to a plan MxScout shows: business processes written for a business reader to approve, the entities, microflows and pages to build, a clickable prototype of every page, and a sprint split. Needs mendix-describe beside it to reach MxScout, and mendix-brief first for the numbered business rules. Use when told "use mendix-plan", "plan this application", "zaplanuj aplikację", "rozpisz to na sprinty", "przygotuj plan dla biznesu", "biznes ma to potwierdzić", "co zbudować w tej aplikacji", or when a new application or a large new module has documents but no model yet.
---

# mendix-plan: the plan a business can confirm and a developer can build

A new application starts as a pile of documents: a requirements paper, a
security note, an old application nobody wants to touch, a meeting. Between
that pile and the first microflow there is a step that usually goes wrong —
somebody writes a design document, the business skims it, nobody really
agrees to anything, and the disagreement surfaces in sprint four.

This skill is that step done so it holds. You produce **one plan in MxScout**
that is at once:

- what the **business reads and confirms**, process by process, in their own
  words, with the rules numbered so they can accept or reject each one;
- what a **developer (or an agent) builds from**: entities, microflows with
  their steps, pages — in modules that do not exist yet;
- a **clickable prototype**: every page carries a mockup, so a process can be
  shown, not only read;
- a **sprint split** that puts the riskiest unknown in the first weeks.

It is one artefact, not four documents, so it cannot drift apart.

## Before you start

- **The business brief comes first.** The numbered rules (BR-1, BR-2 …) and
  the open questions come from it. No brief → run `mendix-brief` first; the
  plan then cites its rules and never invents new ones silently.
- **Know how you reach MxScout.** On a Team server you work through the MCP
  tools alone — read `reference/team.md`, and no files are involved. With a
  local MxScout you write story files and let the sync send them; the project
  README or `mendix-describe` says which.
- **In a Raben application, load `raben-app` first.** The starting modules,
  `MDM_Generic` + `MDM`, `MDM.Account`, OIDC, the Raben Design System and the
  Queues module are Sprint Zero, not a decision to make.
- **Write in the project's language.** Polish project → the whole plan in
  Polish, including the process names. Element names stay as they will be in
  the model.

## The rule that decides everything else

Every sentence of the plan is one of three things, and you must always know
which: **it comes from a document** (say which, S1 §3), **it is a decision
somebody made** (say who and when), or **it is an open question** (number it
P-1, P-2 … and put it where it hurts). Nothing else goes in. The moment you
write a fourth kind — what you assume such applications usually do — the
business confirms something nobody promised, and you find out in testing.

## Steps

1. **Read the documents and the brief.** Number the sources S1, S2 … as the
   brief does. Where two sources disagree, neither wins silently: pick one,
   say you picked it, and make the disagreement an open question.

2. **Cut the application into business processes.** A process is a thing
   somebody does from beginning to end and can recognise by name —
   "Przypisanie licencji", not "Assignment module". Between five and twelve
   for a whole application. An automatic process (a nightly refresh, a
   background check) is a process too; it just has no screen. Name them in
   the business's words, never after a module.

3. **Write each process so the business can confirm it.** This is the heart
   of the skill and it has an exact shape — `reference/process-format.md`,
   with a worked example. Short version: purpose, then how it runs, then the
   rules it enforces each tied to a BR number, then what happens when it
   fails, then what it will not do, then the open questions. No microflow
   names, no API verbs, no entity names in the process text.

4. **Design the model: entities, microflows, pages.** Entities with their
   attributes and associations, each microflow with its steps in order, each
   page with its purpose, roles and widgets. This is the developer's half and
   it is deliberately detailed: a step list that says "validate" is not a
   plan. Modules that do not exist yet are fine — that is what planning is.

   **A page's `purpose` is the one line in it a business reader sees.** It is
   the heading above the mockup in MxScout, and the "what you see" line in the
   clickable prototype — the sentence somebody reads before they can say
   whether the screen is right. So write it in the business's words: who comes
   to this screen, what they see, what they can do, and the BR numbers at the
   end. No non-persistent copies, no popups, no validation, no entity or
   widget names — those belong in `changes` and `widgets`, which only the
   developer reads.

   > Yes: "Lokalne IT wyszukuje pracownika swoich jednostek i widzi jego
   > licencje (BR-2)."
   >
   > No: "Popup zmiany limitu na niepersystentnej kopii z blokadą ponad pulę
   > tenanta (BR-17)." — every word of it is for the person building it, and
   > the person who has to confirm the screen cannot tell what it is.

   The test: read the sentence to somebody who has never seen Mendix. If they
   cannot say what the screen is for, it is a note to a developer, not a
   purpose.

5. **Give every page a mockup.** A page without a mockup is a page the
   business cannot judge. Draw the mockup in the design system's kit (in
   Raben: the mockup kit MxScout ships, same class names the real page will
   use), and name each process's pages so the process can be opened as a
   prototype.

6. **Split it into sprints.** `reference/sprints.md`. Short version: weekly,
   each sprint ends with something the business clicks on a demo, the riskiest
   integration goes in early and read-only first, and every open question is
   pinned to the sprint it blocks.

7. **Hand it in and say what you need back.** The plan goes to MxScout as one
   solution story with a build guide, under the ticket key the work has. Then
   tell the person, in a few lines: what the business must confirm, which
   questions block which sprint, and what you could not decide.

8. **Test cases come after confirmation, not before.** Once the business has
   confirmed the rules, `mendix-testcases` turns BR-1 … BR-n into one manual
   test each. Writing them earlier means writing them twice.

## What makes a plan good

- **The business recognises its own work in it.** If a process description
  reads like a summary of a model, it is wrong, even when every fact in it is
  true. The test: could a person who has never seen Mendix say "no, that is
  not how we do it" — and point at the sentence?
- **Every rule has a number and every number has an owner.** BR-n from the
  brief, P-n for what is open. A business reader can say "BR-17 yes, BR-3 no,
  P-11 the second option" and you know exactly what changed.
- **What is not in scope is written down.** The plan says, in each process,
  what the application will not do. Scope creep is cheapest to stop here.
- **The developer never has to guess.** Each microflow's steps are in order,
  with the data they read and change; each page says which flows it opens.
- **The uncomfortable parts are first.** If the plan's hardest unknown is in
  sprint six, the plan is wrong.

## What this skill never does

- It never changes a Mendix model. The plan is a proposal; building it is a
  separate job (in a Raben project: `mxcraft-model` and the sprint board).
- It never invents a business rule to fill a hole. The hole becomes P-n.
- It never promises what the documents do not say, and never quietly drops a
  requirement it finds inconvenient — a dropped requirement is a decision,
  with a name and a date on it.
- It never writes a process as if it had a screen when it has none.
