# The AI pack (`mxscout-ai-pack 1`)

A text file MxScout writes from a Mendix model (Documentation → **Export AI
pack**). Markdown-like, but read it as lines, not as a document to render.

## Header

```
# MxScout AI pack
format: mxscout-ai-pack 1
project: Sales
mendix: 10.18.0
generated: 2026-10-08T09:00:00.000Z
read with: the mendix-describe skill …
roles: Administrator, Clerk, Customer, …          user roles of the app
scheduled events: Name → Module.Microflow (off)  what runs on a timer
published services: Module.Service (REST); …     what the app offers outside
not included: 12 Marketplace modules — …         left out on purpose
legend: …
```

Marketplace modules are not in the pack: they are other people's components,
and the business documentation is about this application.

**The documentation is not in the pack.** When MxScout shares a project that
has descriptions, it also shares the documentation as Markdown, separately
(`node agent.js docs`; from files, the Markdown copy exported from
Documentation). It starts with `# MxScout documentation — <project>` and a
header of `key: value` lines (`project`, `mendix`, `generated`, `modules`,
`flows described: N of M`, `out of date: N`), then the documentation's pages
in the order of its menu. A description whose flow changed since it was
written ends in `(out of date — the microflow changed since this was
written)`. It is what an agent wrote earlier: read it as a map to what matters,
and take the facts from this pack.

## Index

```
## index
module | lines | microflows | nanoflows | pages | entities
Orders | 1204-3310 | 48 | 6 | 17 | 9
```

`lines` is the module's range in this file, 1-based and inclusive. Read a
module by reading exactly that range.

## A module

```
## module Orders
### entities
E Order #1a2b3c4d | attrs: Number:String(20), Status:Enumeration Orders.ENUM_OrderStatus | refs: → Customers.Customer (*-1) via Order_Customer, ← Orders.OrderLine (*-1) via OrderLine_Order | doc: …
```

- `E Name #hash` — an entity; `(not persistable)`, `extends X` when so.
- `attrs:` name:type. `refs:` `→` this entity owns an association to the
  other; `←` the other owns one to this. `(*-1)` a reference, `(*-*)` a set.
- `doc:` the entity's Documentation field in the model, when it has one.

Then one block per microflow, nanoflow and page:

```
### MF Orders.ACT_ConfirmOrder #5c0e7d21
roles: Administrator, Clerk                who may run it directly
in: Order: Orders.Order; …                 its parameters
from: nanoflow ACT_ConfirmOrderStart; page Order_Edit   what calls or opens it
returns: Orders.ConfirmationNote
doc: …                                     its Documentation field, if any
steps:
- 2 retrieve from database Order · [id = $Order]
- 3 if "Has lines?" $OrderDB/Orders.OrderLine_Order != empty:
  - false:
    - 4 show message An order needs at least one line. · Information, blocking
    - end returns empty
  - true:
    - 9 create object ConfirmationNote · $Note {OrderStatus=Orders.ENUM_OrderStatus.Confirmed; Required=true}
    - 15 call microflow Documents.CreateConfirmation {Template=$Template; Note=$Note}
    - end returns $Note
```

- `MF` microflow, `NF` nanoflow, `PG` page. `#5c0e7d21` is the fingerprint —
  copy it into the description's `"hash"`.
- Steps run top to bottom. The number is the step's number in MxScout's
  documentation. Indentation is nesting: the branches of an `if`, the body of
  a `for each` / `while`, an `on error:` path.
- `{member=value; …}` is the data a step sets (create, change) or passes (a
  call, a page). `member add value` / `member remove value` for list members.
  Values are Mendix expressions, cut at 200 characters with `…`.
- `↪ step N` — the flow continues at a step already listed.
- `↩ back to step N` — the flow goes back up to step N and runs it again: a
  loop built from a jump rather than a `for each` / `while`.
- `(disabled)` — Studio Pro skips that step.
- Pages carry `roles`, `in` and `from` only.
