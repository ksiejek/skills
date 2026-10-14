# Presenting risks and quality

How findings are shown: levels, patterns, grouping by cause, where and what to
do, and why judged risks and measured checks are two different pages. This
file does not say what counts as a risk in a given technology — the analysis
decides that. It says how a finding, once found, should look.

## Two kinds of finding, two pages

| | Risks | Quality |
|---|---|---|
| What it is | a **judgement**: this can hurt someone, fix it by then | a **measurement**: this many elements break this rule |
| Who made it | an analyst or an agent | a tool, counting |
| Shown as | ranked findings, one at a time | checks with counts, against a quoted rule |
| Can be wrong because | the judgement or the reading was wrong | the rule does not fit this case |
| Provenance line | "An agent wrote this finding from the source. It sees only the source, not the data or the configuration in production." | "Nothing on this page was written by an agent." |

Never mix them on one list. A count of 41 unused flows is a fact; "these
flows are dead code and should be removed" is a judgement and, if made,
becomes one P3 risk that names them.

## Levels

P1–P3 in every report, whatever the technology or the client. When a client
uses its own scale (Critical/High/Medium/Low, Blocker/Major/Minor …), map it
onto P1–P3 once, write the mapping in the report's notes, and show P1–P3 —
never two scales side by side.

Three levels, named by **when to fix**, judged by the **worst consequence the
facts show** — not by how much code is involved, how often it repeats, or how
untidy it looks.

| Level | Name | When to fix | Typical consequence |
|---|---|---|---|
| **P1** | Security and data | Before the next release | someone sees, changes or deletes what they should not; data lost or half-written; a secret exposed |
| **P2** | Functional errors | In one of the next releases | a process gives a wrong result or stops, in a case the facts show can happen |
| **P3** | Maintenance | When you next work on it | nothing fails today, but every change is slower or riskier |

Calibration, to keep the list readable:

1. **One risk per cause.** Ten places with the same missing check are one
   finding with ten places, not ten findings.
2. **Between two levels, take the lower one** and say why in one sentence.
   A list with too many P1s reads as noise and the real P1 gets lost.
3. **What depends on something the facts do not show** (environment
   settings, production configuration, who calls an API) is at most P2 and
   says what must be confirmed.
4. How many places a finding has goes into its text, not into its level.

Show levels always as the letters (`P1`) on a tinted badge, plus the name
where there is room ("P1 · Security and data"). The colours are reserved for
levels (see `visual-rules.md`).

## Patterns (themes)

Besides its level, each finding belongs to **one pattern** — what goes wrong,
not where. Patterns let a reader see that "most of the P1s are one problem".

- **The pattern list is technology-specific.** Use the themes the
  technology's analysis defines. Do not invent a taxonomy for a technology
  that has none; then group by part only.
- Keep the list short (≤ 10), each with a display name in the reader's
  language and one sentence explaining it.
- A finding with no pattern goes under the most general one, not under
  "Other".

Example — the themes a model-driven low-code platform uses (an example of the
shape, not a list to copy into another technology):

| Key | Shown as | One sentence |
|---|---|---|
| `access` | Missing access checks | Logic that acts on any record without checking who calls it. |
| `secrets` | Secrets in the source | Keys, passwords and tokens written where anyone with the source can read them. |
| `logic` | Logic and data errors | Conditions and calculations that give the wrong answer in some cases. |
| `silent` | Errors that vanish | Failures caught and dropped, so nobody learns something went wrong. |
| `delete` | Deletes too much | Deletes that reach further than the record they were meant for. |
| `loops` | Saves in loops | Records saved one at a time inside a loop: slow, and half done when one fails. |
| `schedule` | Relies on switched-off jobs | Work that depends on scheduled jobs switched off in the source. |
| `dead` | Unused or duplicated | Code nothing uses, or the same logic kept twice. |
| `hardcoded` | Values written into code | Values that belong in configuration or constants. |
| `naming` | Names and messages | Names and messages that mislead whoever reads them. |

A Java service might instead have injection, transaction boundaries, N+1
queries, exception swallowing; a SQL estate might have missing indexes,
cursor loops, dynamic SQL. Same shape, the technology's own words.

## The Risks page

Three regions on a wide screen, stacked on a narrow one.

### 1. The profile (facets)

Before any single finding, how bad and where:

- **Severity**: a thin stacked bar P1/P2/P3 proportional to the counts, then
  three rows: badge, level name, when to fix, count.
- **Patterns**: one row per pattern: name, `2 P1` when it has P1s, count,
  a thin bar relative to the largest. Patterns with none are dimmed, not
  hidden.
- **Parts**: one row per part: name (monospace), a small stacked bar of its
  P1/P2/P3, count. In one stable order (most findings first) that **a click
  does not change**.

Every row is a filter toggle; a "Show all" appears on a facet when it is
active. **A facet's counts leave out its own filter** (but apply the others),
so each count says how many a click on that value would bring.

**The conclusion sentence.** When one pattern holds more than half of the P1
findings, say it in one bold sentence above the patterns: "5 of the 7 P1
findings are missing access checks." When nothing dominates, say nothing —
do not manufacture an insight.

### 2. The list

- Header: "38 findings", or "9 of 38 findings" when filtered, and a Group
  control: **Severity · Part**.
- Active filters as removable chips under the header ("P1 · Security and
  data ×", "Orders ×").
- Group headers: the level badge, its name, when to fix, the count (or the
  part's name and count).
- Each row: level badge, the **title** in bold, and one grey line
  "Orders · Missing access checks · 3 places". The whole row is the link.
- The list keeps its scroll position when a finding is opened.

### 3. One finding

Top to bottom:

1. Previous / next buttons and "P1 · 3 of 7"; the finding's stable ID on the
   right (`R-012`), so people can refer to it.
2. Pills: the level with its name, the pattern, the part — the last two are
   buttons that filter the list by them.
3. **The title** as heading. Then "Fix before the next release."
4. `WHAT HAPPENS` — why it matters, in two to four sentences. The
   consequence first, the mechanism second.
5. `WHAT TO DO` — the fix, in one sentence, in a block marked with the accent
   (and a check icon). This is the block a reader is looking for.
6. `WHERE · 3 PLACES` — each place: kind tag, qualified name (part muted),
   "Open flow →". Each a link to that element.
7. `SAME PATTERN ELSEWHERE` — up to six other findings of this pattern, with
   "All 8 with this pattern". `ALSO IN ORDERS` — the part's level counts and
   up to five other findings there, with "All 5 in Orders".
8. The provenance line.

### Writing a finding

| Field | Rule | Good | Bad |
|---|---|---|---|
| Title | says **what is wrong**, specific, ≤ ~70 characters | "Every clerk can read every customer's orders" | "Security issue in Orders" |
| What happens | consequence, then mechanism; names the role or the case | "The read rule on `Order` for Clerk has no constraint, while every screen a clerk reaches lists only their own region's orders. The client can still fetch the rest." | "Access rules may not be configured optimally." |
| What to do | one sentence, an action | "Add the region constraint to the access rule, so the database holds the line the screens draw." | "Review access rules." |
| Where | every place, qualified names | `Orders.Order`, `Orders.Order_Overview` | "several places in Orders" |

Do not:

- write questions for the owner into findings ("Is this intended?"). If
  something cannot be told from the facts, say what must be confirmed;
- list a finding without a place, or without a fix;
- rank by how much there is: forty naming slips are one P3;
- copy secrets into a finding: say a key exists, never its value;
- use severity colours for anything else on the page.

## Risks elsewhere in the report

A finding is written once, on the Risks page, and **referred to** everywhere
else:

- **Overview**: three level tiles with counts and the titles of the P1s,
  each a link.
- **A part's page**: a Risks tab, P1 first: badge, title, the fix as one grey
  line.
- **A process**: "Risks along the way" — the findings whose places include
  one of the process's flows, P1 first.
- **A flow's page**: the findings that name it, as badges with titles.
- **The menu**: the Risks entry with its count.

## The Quality page

Measured checks. Each check:

- belongs to a small **group** (Unused · Background · Size · Naming ·
  Security) shown as a label with a dot (warning or neutral);
- has **a count, with its total when there is one** ("41 of 860");
- has a **one-line label** and a one-line sub ("No caller, no screen, no
  menu, no role");
- when opened: a paragraph saying **what the count means and what it does
  not** ("Code that only reflection calls shows up here too; third-party
  parts are left out"); the **rule it is measured against, quoted with its
  source**; and the elements as a table (≤ 6 columns), long lists capped with
  "+ n more".

Rules for checks:

- **A check without a published rule carries no quote.** Never invent a
  guideline to make a check look authoritative.
- **A check states its blind spots.** What the tool cannot see is in the
  paragraph, not left for the reader to discover.
- **"This is the platform default, not an error"** when that is true — a
  check that counts a default is information, not an accusation.
- Checks are neutral in tone. "41 flows have more than 25 steps; 6 of them
  more than 50" — not "41 flows are too long".
