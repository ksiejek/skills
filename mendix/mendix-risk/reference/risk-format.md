# Formats: fact sheet, leads, claims, risk

Four artefacts, one per stage. The first three are working material (files
when you have a file system); only the risk goes to MxScout.

## Fact sheet (stage A)

Plain lines, grouped by the nine points of stage A. One fact per line:

```
Sales.Order | rule[2] role Sales.User: read all rows, write Status, Note; delete | read_raw AccessRules[2]
Sales.ACT_Order_Cancel | allowed: Sales.User; param Order; changes Order.Status; no compare with current user | pack
project | strict mode: off | read_raw ProjectSecurity
```

Facts only. No "risky", no "should". A fact you could not read is a line too:
`Sales.JA_Export | Java action, not read | —`.

## Leads (end of stage A)

```
14 | Sales.ACT_Order_Cancel | changes Order.Status with no owner or state decision
16 | Sales.Order | Sales.User reads all rows; entity has Note (text) and Order_Customer
```

The number is the check in part 2 of `checks`. An engine lead is listed by
its own id and check:

```
mx-guard-page-hides-sales-act-credentials-issue | guard-page-hides | Sales.ACT_Credentials_Issue, Sales.Account
```

## Lead verdicts (stages B and C)

One object per engine lead you opened. It is what the next run reads instead
of the model, so the reason must stand on its own.

```json
[
  { "id": "mx-guard-page-hides-sales-act-credentials-issue", "verdict": "confirmed",
    "reason": "Creates and commits a credential for the account from the parameter; no decision compares it with the caller.",
    "risk": "shop-t3-02-credentials-for-any-account" },
  { "id": "mx-guard-escalation-sales-act-address-delete-past-xpath", "verdict": "dropped",
    "reason": "Sales.Address has one rule for Sales.Customer, own rows, with delete: the role can only hand over an address it may delete." },
  { "id": "mx-service-op-unscoped-sales-prs-order-get", "verdict": "undecided",
    "reason": "Whether each caller has a token of its own is set in the environment, not in the model." }
]
```

- `verdict`: `confirmed` (with `risk`, the id of the risk it went into),
  `dropped`, `undecided`.
- `reason`: one sentence, at most 300 characters, naming the element read
  and what it says. Never a way in, never a value.
- A lead you did not open has no object: it stays open.

## Claims (stages B and C)

One object per claim. Stage B fills the first five fields, stage C the last
two. This is what makes a risk checkable, and what a later run reads to see
whether the risk still holds.

```json
{
  "risk": "shop-t3-04-order-cancelled-by-anyone",
  "step": 2,
  "claim": "The flow changes the status without comparing the order's owner with the current user.",
  "element": "Sales.ACT_Order_Cancel",
  "source": "pack, steps 1-6; calls Sales.SUB_Order_SetStatus (read to the end)",
  "verdict": "agrees",
  "note": ""
}
```

- `element` is one qualified name. A claim about two documents is two claims.
- `source` says where the sentence was read: the pack, or the `read_raw`
  path. For a denial it says what was searched ("search 'Cancel', 4 hits,
  all read; dependencies of Sales.Order.Status").
- `verdict`: `agrees`, `disagrees`, `not decided` (the model cannot say; the
  note names the test).

## Risk (stage D): `{ id, level, title, detail, fix, theme, where, from }`

| Field | Rule |
|---|---|
| `id` | Stable. Existing risks keep theirs. New: `<app>-<tier>-<nn>-<slug>`, lower case |
| `level` | `P1`, `P2`, `P3` by `risk-levels` and stage B point 6 |
| `title` | The consequence in business words, under 90 characters: who can do what. "To verify: …" or "Worth knowing: …" when the evidence is that kind. No module names in the title |
| `theme` | One key from `risk-levels`, "Patterns" |
| `where` | Every element a claim names, qualified, the deciding one first |
| `from` | The ids of the engine leads this risk confirms, when it came from any. Left out for a risk no lead pointed at |
| `fix` | As a ticket would say it: module, document, what exactly to change. One change per sentence. At most 1,000 characters |
| `detail` | The layout below, in the project's language. At most 3,000 characters: a long chain keeps its steps and shortens the prose, never the other way round |
| `test` | From files only (a Team server does not keep it yet): `{ who, given, steps[], real, safe }`, at most 12 steps. On a Team server the same content is the "Test:" line of `detail` |
| `repair` | From files only: the fix as lines a developer follows, the module first, at most 30 lines |

At most 40 places in `where`. Titles up to 300 characters are kept; aim for 90.

### Layout of `detail`

```
<id short> · <tier name> · <single fact | chain | profile> · <finding | to verify | worth knowing>
Role needed: <user roles, counted from project security>.

<Two to four sentences for a business reader: what can happen, to whose
data, and why it matters. No Mendix terms beyond the names.>

How it happens:
1. <claim>: <Module.Element>.
2. <claim>: <Module.Element>.
3. …

Not confirmed: <what the model cannot decide, one line each; or "nothing">.
Test: <who signs in, what must exist first, what they do in the application
as a tester, what tells a real risk from a safe one>.
Checked: model <version>, <date>; searched: <what was searched for the denials>.
```

- Every numbered step is one claim from `claims.json` with verdict `agrees`.
  A claim marked `not decided` goes under "Not confirmed", never into the
  steps.
- Steps name elements, not line numbers or internal ids.
- The test is what a tester does on a test environment: through the
  application's pages, or with one read in the browser's console of the kind
  MxScout's own checks use. Never a request that changes or deletes data,
  never a script, never the value of a secret. From files, write it into
  `test` and leave the "Test:" line out of `detail`.
- A profile has "What the role can do:" with counted facts instead of "How it
  happens:", and no test.

### Example (invented application)

```json
{
  "id": "shop-t3-04-order-cancelled-by-anyone",
  "level": "P1",
  "theme": "access",
  "title": "Any sales employee can cancel another employee's confirmed order",
  "where": ["Sales.ACT_Order_Cancel", "Sales.SUB_Order_SetStatus", "Sales.Order"],
  "fix": "In Sales.ACT_Order_Cancel add a decision that the order's owner is the current user or the caller has Sales.Manager, and that Status is Draft or Confirmed. Remove the allowed role Sales.User from Sales.SUB_Order_SetStatus.",
  "detail": "T3-04 · Business roles · single fact · finding.\nRole needed: SalesEmployee, SalesAssistant (2 of 5 user roles hold Sales.User).\n\nAn order confirmed to a customer can be cancelled by any colleague in sales, not only by the person who owns it or by a manager. The customer's confirmation and the planned delivery are lost with it.\n\nHow it happens:\n1. The cancel action may be called by the module role Sales.User and takes the order as its parameter: Sales.ACT_Order_Cancel.\n2. It sets the status to Cancelled without comparing the order's owner with the current user and without reading the current status: Sales.ACT_Order_Cancel, Sales.SUB_Order_SetStatus.\n3. Sales.User may read every order (no XPath) and write Status: Sales.Order.\n4. The order has no before-commit handler and no validation rule on Status: Sales.Order.\n\nNot confirmed: nothing.\nTest: sign in as a SalesEmployee who does not own a confirmed order of a colleague; open it from the overview and choose Cancel. Real risk: the status becomes Cancelled. Safe: the action is refused.\nChecked: model v12, 2026-11-15; searched: every flow that changes Order.Status (5, all read), handlers and validation rules of Sales.Order."
}
```

## Verdict on an existing risk (checking somebody else's)

Per risk: `confirmed in the model` (every claim agrees), `partly` (the effect
stands, some sentences do not), `to test` (the effect stands on something the
model does not decide), `rejected` (the claim the effect stands on
disagrees). With it: the claims table, what speaks against it, where the same
cause appears elsewhere, and the proposed change (text, level, split, merge,
none).

## Report to the person

1. Counts: risks per level, and per kind of evidence.
2. Against the previous list: new, changed, proposed to close, unchanged.
3. The engine's leads per check: confirmed, dropped, undecided, not opened;
   and how many were skipped because an earlier verdict still stands.
4. Not checked, with the reason for each (Java, a module the pack leaves out,
   platform behaviour, environment).
5. The tests for a test environment, deduplicated: one platform behaviour
   often decides many risks.
6. The cost line from `report_usage`.
