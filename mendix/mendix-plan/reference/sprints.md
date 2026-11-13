# Splitting the plan into sprints

The sprint split is part of the plan, not a separate document. It lives in
the guide's `steps` (the build order, one sentence per sprint, which MxScout
shows on the story) and, written out, in a `## Podział na sprinty` section of
the story's `solution`.

## The five rules

1. **Weekly sprints, and every one ends with something the business
   clicks.** Not "the Assignment module is done" — a demo where a person
   searches for an employee and the limit blocks them. A sprint whose result
   cannot be shown is a sprint whose result cannot be checked.

2. **The riskiest unknown goes first, and read-only before write.** In almost
   every application the unknown is an integration: how the other system
   really behaves, with real data, under real permissions. Plan one sprint
   that only *reads* from it and puts the result on a screen. It costs a week
   and it either confirms the whole design or saves the next four sprints.

3. **Sprint 0 is the starting pattern, not features.** Modules, sign-in,
   design system, the data that arrives from other systems, a demo
   environment. In a Raben application this is `raben-app` and it is not open
   to discussion. The business sees: "I signed in with my own account and I
   can see my company".

4. **Each open question is pinned to the sprint it blocks.** Write, under the
   sprint: "Potrzebne wcześniej: P-5, P-6". Questions that touch the data
   model (where does this record come from, how is this number counted) must
   be answered before the sprint that builds it — list them again at the end
   under "Co blokuje start".

5. **Say what the split does not include.** The features the business may
   assume are there and are not, each with the sentence "osobny sprint, jeśli
   biznes zdecyduje" and the open question it hangs on. This is where a
   project is saved from a surprise in UAT.

## The usual shape

For an application of the size MxScout plans well (20–40 entities, 40–70
flows, 10–20 pages), eight sprints:

| Sprint | What |
|---|---|
| 0 | Starting pattern: modules, sign-in, design system, master data, demo environment |
| 1 | The core domain **without** the integration: the records, the rules, the limits, the log |
| 2 | The integration, **read only**: real data on a real screen |
| 3 | The main process end to end, with its validations |
| 4 | The hard cases: the multi-step operation, the background checks, the issue list |
| 5 | Reporting and exports, then a pass over roles and permissions |
| 6 | Migration or switch-over from whatever is there today |
| 7 | Business testing (one case per BR), fixes, user instructions, go-live |

Shift it to fit, but keep the order of 1, 2 and 3: domain, then read, then
write. Building the write path before you have seen the other system's real
answers is the most expensive mistake available.

## A sprint is several build tickets, each one session long

A sprint is not a ticket. When the plan turns into build tickets, cut every
sprint into tickets small enough for one build session: at most 6 criteria,
about 7 code files and about 10 new or changed model documents (one domain's
entities count once; every microflow, page and snippet counts on its own),
chained in build order (data, access, logic, pages, test data). Sprint 0 alone
is at least three tickets: Marketplace modules, the design system with its
theme, and roles with sign-in and a home page per role. A step only a person
can do (Studio Pro, an account, a phone) goes first, never in the middle of a
build. Write the counts next to each ticket in the split, so the owner sees
the size at a glance. In Tandem the full rule is in the sprinter skill,
`reference/od-planu-do-sprintu.md`, "Rozmiar ticketu przy planowaniu".

## What each sprint says

Four short paragraphs, no more:

- **Cel** — one sentence, in build terms.
- **Biznes zobaczy** — the demo, in the business's words.
- **Potrzebne wcześniej** — decisions (P-n), accesses, test environments,
  permissions somebody else must grant. Be specific: "zgoda zespołu
  Microsoft 365 na uprawnienia odczytu" is actionable, "dostępy" is not.
- Nothing else. A sprint description that lists entity names is a backlog,
  not a plan, and the guide already holds the entity names.

## Estimating

Do not put day counts on sprints you have not started. A week per sprint is
the unit; if a sprint plainly does not fit in a week, it is two sprints. If
the business asks for a date, give them the number of sprints and the date
the first one can start once the blocking questions are answered — and say
which questions those are.
