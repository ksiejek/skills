---
name: mendix-testcases
description: Write manual test cases for a Mendix application from its business brief — at least one case for every business rule (BR-1, BR-2 …), each with the role that carries it out, the preconditions, the steps, the expected result, the rule it checks and where in the model the rule is built — and hand them to MxScout, where they are shown on the project's Test cases page beside the remediation stories of the logic findings they are about, and exported as HTML or Markdown. Needs a business brief (mendix-brief) and mendix-describe beside it. Never runs a test. Use when told "use mendix-testcases", "write test cases", "przypadki testowe", "scenariusze testowe z reguł", "jak przetestować reguły biznesowe", "update the test cases, the brief changed".
---

# mendix-testcases: how to check by hand that the rules hold

The business brief (mendix-brief) says what the application must do, rule by
rule. You write, for **every rule**, at least one test case a person can carry
out by hand in the running application: who does it, what must be true
first, the steps, and what they should see when the rule holds. Each case
names the rule (`BR-n`) and the place in the model where that rule is built,
so a tester who finds it broken knows where to look. MxScout keeps the cases
on the project's **Test cases** page and exports them as HTML (for the tester)
and Markdown (for an agent or a test tool).

You write tests; you never run them, and you change nothing in the model.

## Keep the Mendix project clean

Write nothing into the Mendix project: `testcases.json` and your notes go in
the work folder `node ../mendix-describe/agent.js workdir` prints (`<work>`
below). Never commit anything. `check-testcases.js` only reads.

## Steps

1. **Find the brief.** MxScout writes the newest one as `brief.md` beside
   `documentation.md` in the project's folder (inside a Mendix project: its
   local part — `node ../mendix-describe/agent.js status` names the folder).
   No brief: stop and tell the person to write one with mendix-brief first.
   List the rules you must cover:

   ```sh
   node check-testcases.js rules <folder>/brief.md
   ```

   Note the brief's version from the first comment of `brief.md`
   (`version 3`): it goes in `"brief"`.

2. **Find each rule in the model.** Read `ai-pack.md` (mendix-describe's
   pack) by module, not whole: for each rule, the page where the person does
   it, the microflow that decides it, the entity it is about. Those
   qualified names go in the case's `model`. A rule the model does not build
   still gets a case — `model` names where it should be (the page the person
   would use) — and is exactly the case worth running first.

3. **Read the logic findings.** The documentation's risks with a `logic`
   part (mendix-describe, MXS-62) compare the model with the brief: a rule
   not built, built differently, or an element missing. When a case checks a
   rule such a finding is about, put the finding's id in `finding`: MxScout
   shows its remediation story beside the case, and the case is how the
   fix is seen to work.

4. **Are there cases already?** MxScout exports the current ones as
   Markdown from the Test cases page; if the person has them, start from
   them and **keep every case's number** — a changed case keeps its number,
   a new one takes the next free number, a dropped one's number is never
   given again. For a rule whose text changed in the brief, read its cases
   again.

5. **Write the cases** as `<work>/testcases.json` — the format is in
   `reference/testcase-format.md`. For each case:
   - `role` — a user role of the application, as the brief or the model
     names it; never a person's name.
   - `preconditions` — the data and the state needed first ("an event with
     free places", "the attendee already holds two tickets").
   - `steps` — one action each, in the words of the screens ("Open the
     event", "Press Register"), no technical detail a tester cannot see.
   - `expected` — what is visible when the rule holds: a message, a value,
     a button that is not there. Never "it works".
   - For a rule with a limit or a condition, a case on each side of it
     (two tickets allowed, the third refused) is worth two cases.

   Write in the brief's language unless the person asks for another. **No
   personal data**: no names, e-mail addresses or passwords — "a test
   attendee account".

6. **Check them** — fix every error, read every warning:

   ```sh
   node check-testcases.js check <work>/testcases.json <folder>/brief.md
   ```

   It uses the same file MxScout reads the cases with, and refuses a set
   that leaves a rule without a case.

7. **Hand them in:**
   - **Project folder:** `node ../mendix-describe/agent.js send
     <work>/testcases.json --folder <folder>` writes them into the folder's
     `inbox/`. MxScout takes them while the project is open, shows them on
     the Test cases page and offers **Undo**.
   - **Agent channel** (Share with an agent pressed in MxScout):
     `node ../mendix-describe/agent.js send <work>/testcases.json`.
   - **Neither:** tell the person the full path of `testcases.json` and to
     press **Import test cases…** on the Test cases page.

   A new set replaces the previous one whole (with Undo); keep the numbers so
   a tester's notes still match.

8. **Tell the person** in a few lines: how many cases for how many rules,
   the cases about a logic finding (run those first), and the rules the
   model does not seem to build.

## What not to do

- Do not run the tests, open the application or change data in it.
- Do not invent a rule the brief does not state; a case checks a `BR-n`.
- Do not leave a rule without a case to make the set shorter.
- Do not renumber the cases of an earlier set.
