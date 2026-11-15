---
name: mendix-risk
description: Find, prove and write the risks of a Mendix application from MxScout (who can see, change or delete what they should not, where data can be lost, which secrets sit in the model) as risks ranked P1-P3 that a person can check claim by claim. Works in four stages kept apart (read the access facts, judge them into risks, try to refute every claim, write), so the reading can run on a cheaper model and the judging stays exact. Also checks risks somebody else wrote, and the risks of what a sprint changed. For an MxScout Team server (MCP) and for a project kept in files; separate from mendix-describe, which writes the business documentation. Needs mendix-describe beside it. Use when told "use mendix-risk", "review the risks", "write the risks", "verify these risks", "check the risks after this sprint", "przegląd ryzyk", "zrób ryzyka", "sprawdź ryzyka", "zweryfikuj ryzyka", "ryzyka po sprincie".
---

# Risks of a Mendix application: found, proved, written

MxScout reads a Mendix model, and its engine finds by rule what a rule can
see. This skill is for what a rule cannot: read who may do what, put the facts
together into a scenario with an effect, prove each sentence of it from the
model, and write it so a person can check it in minutes.

It is a skill of its own, apart from mendix-describe, because the two jobs
differ: a description is a sentence for the business that nobody checks word
by word; a risk is a list of claims, each of which must be true. Describing
may run on a cheaper model. A risk is only as good as its weakest claim.

## Which way you work

- **An MxScout Team server** (the MCP tools of the server `mxscout` are
  there: `list_projects`, `read_module`, `write_risks` …):
  `reference/team.md` is the whole skill. Read it and follow it; the rest of
  this file is not for you.
- **A project in files** (an MxScout project folder, `mxscout/` in a Mendix
  project, a running MxScout that shares a project, or a
  `.mxscout-ai-pack.md` file): read `reference/team.md` first. Its seven
  rules and its four stages apply unchanged. This file says what stands for
  the MCP tools, and what the files add.

In both, read `reference/checks.md` (the catalogue of leads),
`reference/pitfalls.md` (what produces false alarms) and
`reference/risk-format.md` (fact sheet, leads, claims, risk) once, and
`../mendix-describe/reference/risk-levels.md` for the levels P1–P3, the kinds
of evidence and the patterns: that file is the one definition of the levels.

## Keep the Mendix project clean

Write nothing into the Mendix project. The fact sheet, the leads, the claims
and the risks file go in the work folder
`node ../mendix-describe/agent.js workdir` prints (`<work>` below). Never run
git that writes: committing is the person's.

## From files: what stands for what

| On a Team server | From files |
|---|---|
| `list_projects`, `read_index` | `node ../mendix-describe/agent.js status` (add `--folder <folder>` outside the project folder): the project, its language, its modules |
| `read_module` | `node ../mendix-describe/agent.js module <Name> --out <work>/m.md`, one module at a time |
| `search`, `read_document` | `node ../mendix-describe/agent.js pack <work>/pack.md` once, then search that file and read the lines of the one document |
| `read_raw` | There is none. What the pack does not show (an association's delete behaviour, whether a constant has a default, the cut part of a long expression) is "not decided": the claim goes under "Not confirmed", naming where in Studio Pro to look |
| what MxScout's engine finds | `node ../mendix-describe/check-security.js <MendixProject or folder or app.mpr>`: its summary, and with `--json` its risks under fixed ids (`mx-…`) |
| `list_risks` | The pack's `## risk triage` section (what was written and what a person decided), and `node ../mendix-describe/agent.js docs --out <work>/docs.md` |
| `write_risks` | A descriptions part with `"add": true` that holds only `risks`, handed over with `node ../mendix-describe/agent.js send <work>/risks.json` |
| `estimate_task`, `start_task`, `report_usage` | There is no ledger. Tell the person your model and the tokens the work used, when you can see them |

## From files: what each stage adds

**Stage A.** Run `check-security.js` first and read its summary. What it
lists is the engine's: the anonymous role, the accounts, self-registration,
what a page hides and its microflow does not check, writes wider than the
pages, entity access against its use, constants the browser receives, the
security settings. Those are facts for your fact sheet and leads already
handled: you do not write risks about what it covers. Your leads are what it
cannot see: who a flow acts for, what a decision reads, what a delete takes
with it, chains across modules.

**Stage C.** Duplicates are checked against the engine's ids and against the
`## risk triage` lines, by the rules of mendix-describe's "Risk triage": a
risk a person marked a false positive is not raised again unless the model
changed so that their reason no longer holds; a risk marked fixed is read
again in the model; a risk a person raised is theirs and is never rewritten.
A risk of yours that adds a consequence to an engine finding names that
finding's id in its `detail`.

**Stage D.** Write the risks in the descriptions format
(`../mendix-describe/reference/descriptions-format.md`, `risks[]`), with the
two fields a file keeps and a Team server does not: `test` (`who`, `given`,
`steps`, `real`, `safe`) and `repair` (the lines a developer follows). The
file has `"add": true` and nothing but `risks`, so it changes no description.
Every risk keeps its `id`. Run
`node ../mendix-describe/check-descriptions.js check <work>/pack.md <work>/risks.json`
before you hand it over. A risk you can no longer support is not left out
silently: tell the person which claim fell, and let them decide.

**Dry run.** When the person asks for a comparison, a test or "do not write",
leave `risks.json`, `claims.json`, the fact sheet and the not-checked list in
`<work>` and send nothing.

## What a person gets at the end

1. The risks, per level and per kind of evidence (finding, to verify, worth
   knowing).
2. Against the previous list: new, changed, proposed to close, unchanged.
3. What was not checked, and why (Java, a module the pack leaves out,
   platform behaviour, the environment).
4. The few tests on a test environment that would settle what the model
   cannot.
5. What it cost: the ledger's line on a Team server, your model and tokens
   from files.

## Files

```
SKILL.md                  this file
reference/team.md         the skill itself: seven rules, four stages, after a sprint, cost
reference/checks.md       the catalogue of leads: what to read next, what clears each
reference/pitfalls.md     traps that produce false alarms and false all-clears
reference/risk-format.md  fact sheet, leads, claims, the risk and its detail layout
```
