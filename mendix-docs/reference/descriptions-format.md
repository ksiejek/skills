# The descriptions file (`mxscout-descriptions` 1)

JSON. MxScout imports it in a project's Documentation section and shows every
sentence as an agent's: marked **✦ AI**, or under a line saying an agent wrote
it. MxScout keeps only what is listed here, as plain
text — anything else in the file is ignored.

```json
{
  "format": "mxscout-descriptions",
  "version": 1,
  "project": "Sales",
  "language": "en",
  "by": "Claude, mendix-describe skill",
  "written": "2026-10-08",

  "app": {
    "summary": "Sales is the order desk of … Two to four sentences: what it is for, who works in it, what it achieves.",
    "story": "The long description, several paragraphs.

Paragraphs are separated by a blank line …",
    "audience": [
      { "who": "Customers", "what": "Place orders and follow them until they are delivered." },
      { "who": "Clerks", "what": "Check and confirm the orders, in teams per region." },
      { "who": "Managers", "what": "Watch the delivery dates of their region." }
    ],
    "processes": [
      {
        "name": "Confirming an order",
        "summary": "A clerk takes an order from the region's queue, checks it and confirms it.",
        "story": "What happens to an order from the moment it is placed, in a few paragraphs …",
        "steps": ["The order arrives in the region's queue", "A clerk takes it", "…"],
        "flows": ["Orders.ACT_TakeOrder", "Orders.ACT_ConfirmOrder"],
        "diagram": [
          { "step": "The order arrives in the region's queue", "by": "app" },
          { "decision": "Is everything in stock?", "ways": [
            { "label": "no", "then": [{ "step": "Asks the customer about a later delivery", "who": "Clerk" }], "end": "Waits for the customer" },
            { "label": "yes" }
          ] },
          { "step": "Confirms it and sets the delivery date", "who": "Clerk" },
          { "end": "Confirmed" }
        ]
      }
    ]
  },

  "modules": {
    "Orders": {
      "summary": "The heart of the app: orders, their lines, delivery dates and history.",
      "story": "What the module does for the people using it, in a few paragraphs …",
      "notes": [
        { "title": "Key entities", "table": { "columns": ["Entity", "Role in the business"], "rows": [["Orders.Order", "What a customer ordered"]] } },
        { "title": "Naming and layout", "items": ["ACT_ flows are started from a page by a button."] }
      ]
    }
  },
  "microflows": {
    "Orders.ACT_ConfirmOrder": {
      "hash": "5c0e7d21",
      "text": "Confirms an order: checks that it has lines, records the confirmation and asks for the confirmation note when the customer's region requires one. Only a clerk may do it."
    }
  },
  "nanoflows": {
    "Orders.ACT_ConfirmOrderStart": { "hash": "…", "text": "…" }
  },
  "pages": {
    "Orders.Order_Edit": { "text": "The order screen clerks work in." }
  },
  "entities": {
    "Orders.Order": { "hash": "…", "text": "What a customer ordered, from placing to delivery." }
  },

  "risks": [
    {
      "level": "P1",
      "theme": "access",
      "title": "Every clerk can read every order",
      "detail": "The read rule on Order for Clerk has no XPath, while every page a clerk reaches lists only the orders of their own region. The client can still fetch the rest.",
      "where": ["Orders.Order", "Orders.Order_Overview_Clerk"],
      "fix": "Add the region constraint to the entity access rule, so the database holds the line the pages draw."
    }
  ],

  "c4": {
    "context": { "nodes": [{ "id": "app", "name": "Sales", "kind": "app" }], "links": [] },
    "containers": { "nodes": [], "links": [] },
    "open": ["Where the application is hosted cannot be told from the model."]
  },

  "context": {
    "where": [
      { "topic": "Where an order's delivery date is set", "place": "Orders.SUB_Order_SetDeliveryDate, called on every status change, not on create." }
    ],
    "conventions": [
      { "pattern": "ACT_", "meaning": "Started from a page by a button." }
    ],
    "pitfalls": [
      "Changing Order.Status outside Orders.ACT_ChangeStatus skips the history record and the delivery date."
    ]
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `format`, `version` | yes | exactly as above, or MxScout refuses the file |
| `add` | no | `true`: the file adds to the descriptions MxScout keeps instead of replacing them — one more process, or flows described since. A process of the same name is replaced and a new one added at the end; a flow, page, entity or module in the file replaces its old description; a risk whose title is already kept is not added twice; everything else stays. Without it, an import replaces what was kept |
| `replace` | no | with `"add": true` only: `["app"]` — the file's `app` (summary, story, who uses it, every process) replaces the overview kept, as when the overview was written again from the start; flows, modules, risks and the rest are still added to |
| `project`, `language`, `by`, `written` | no | `by` is shown as who wrote the descriptions |
| `app.summary` | no, but write it | the first thing a business reader sees: 2–4 sentences, always shown |
| `app.story` | no, but write it | the long description, paragraphs separated by a blank line; shown under the summary, folded |
| `app.audience` | no | the groups of people who use the app, as many as there are: `{ "who", "what" }`, a short name and one sentence. The documentation's overview shows each group on a line of its own. A single sentence, as files before this were written, is still read and shown as one paragraph |
| `app.processes[]` | no | every main process the application has, each with `name`, `summary` and `story` (one case, stage by stage, 200–400 words — `business-narrative.md`, "A process"); `steps`: one sentence each, naming who does what, as many as the case has; `diagram`, only when the process branches (`business-narrative.md`): a list of `{ "step", "who", "by": "person" \| "app" }`, `{ "decision", "ways": [{ "label", "then": [ … ], "end" }] }` and `{ "end" }` — a way with an `end` finishes there, one with `"join": "<a step's text>"` goes on at that step further on (rules tried in turn that all lead to the same next step), one with neither rejoins the main path, and `then` holds steps and decisions of its own; `flows` are qualified names from the pack and become links |
| `modules` | no | module name → `{ "summary", "story", "notes" }`; a plain string is read as the summary. `notes`: sections for a developer, see `module-notes.md` |
| `c4` | no | the architecture, levels 1 and 2: `context` and `containers` (nodes and links) and `open` (what the model does not show), see `c4.md` |
| `microflows`, `nanoflows`, `pages`, `entities` | no | qualified name → `{ "hash", "text" }`, or just the text |
| `risks[]` | no, but write it | `level` (`P1`, `P2` or `P3`, by `risk-levels.md`) and `title` are required, or MxScout drops the risk; `detail`, `where` (qualified names, they become links) and `fix` are what make it useful; `theme` is its pattern, one of the ten keys in `risk-levels.md` — the Risks page groups and filters by it, and guesses it from the title when it is missing |
| `changes[]` | no | changes the person asked to be worked out (`SKILL.md`, "A change, when the person asks"), shown on the Changes page; see "Changes" below. In a file with `"add": true`, a change whose `id` is already kept replaces it and a new one is added at the end |
| `context.where[]` | no | `{ "topic", "place" }`: what a developer looks for, and where it is when the name does not say |
| `context.conventions[]` | no | `{ "pattern", "meaning" }`: a prefix or naming rule the modules follow |
| `context.pitfalls[]` | no | sentences: what breaks easily, and what to check before a change |

What goes into a `summary` and a `story`, and how long each is, is defined in
`business-narrative.md`, for both skills that write this file. Both are plain text: no markup, no lists; a blank line
starts a new paragraph.

Keys are **qualified names exactly as in the pack** (`Module.Name`). They are
in separate tables because a microflow and a page can share a name.

Risks and context are not tied to a fingerprint: they describe the model as a
whole, and are written again with the application's part when the model
changes. A qualified name in `where`, or inside a `place` or a pitfall, links to
that flow, page or entity in the documentation when the model has it.

A description without `hash` is shown but never marked out of date; with one,
MxScout compares it to the flow's current fingerprint each time it builds the
documentation, and flags the ones that changed since.

## Changes

A change is something the person wants made to the application, worked out
before anyone builds it: how that part works **now**, the **proposal**, and the
concrete changes to the model it needs. MxScout shows it on the Changes page —
the request quoted, now and the proposal side by side, both diagrams drawn, the
model changes as a table grouped by kind — and nothing of it is applied
anywhere. It is sent as a part of its own, with `"add": true` and only
`changes` in it:

```json
{
  "format": "mxscout-descriptions",
  "version": 1,
  "add": true,
  "project": "Sales",
  "language": "en",
  "by": "Claude, mendix-describe skill",
  "changes": [
    {
      "id": "cancel-order",
      "title": "Customers can cancel an order until it ships",
      "asked": "Customers should be able to cancel an order themselves, as long as it has not been shipped yet.",
      "date": "2026-10-14",
      "status": "proposed",
      "now": {
        "summary": "Today an order, once placed, only goes forward: a clerk confirms it, the warehouse ships it. A customer who changes their mind has to call the order desk, and a clerk deletes the order by hand.",
        "story": "A customer places an order from the shop page. Orders.ACT_Order_Place checks that it has lines, sets its Status to Placed and puts it in the region's queue.\n\nA clerk takes it from the queue … (the case stage by stage, 150–400 words: who acts, what is checked and set, which statuses it passes through, how it ends).\n\nNothing in the model lets a customer take an order back. The only way out is Orders.ACT_Order_Delete, which a clerk may start from the order screen; it deletes the order and its lines and records nothing.",
        "steps": [
          "The customer places the order from the shop page",
          "A clerk takes it from the region's queue and confirms it",
          "The warehouse marks it shipped when it leaves",
          "To stop an order, a clerk deletes it by hand"
        ],
        "flows": ["Orders.ACT_Order_Place", "Orders.ACT_Order_Confirm", "Orders.ACT_Order_Ship", "Orders.ACT_Order_Delete"],
        "diagram": [
          { "step": "Places the order", "who": "Customer" },
          { "step": "Takes and confirms it", "who": "Clerk" },
          { "decision": "Does the customer call to stop it?", "ways": [
            { "label": "yes", "then": [{ "step": "Deletes the order by hand", "who": "Clerk" }], "end": "Deleted, with no record" },
            { "label": "no" }
          ] },
          { "step": "Marks it shipped", "who": "Warehouse" },
          { "end": "Shipped" }
        ]
      },
      "proposal": {
        "summary": "A Cancel button on the customer's order page, shown until the order ships, sets a new status Cancelled through the flow every status change already goes through, so the history and the delivery date stay right.",
        "story": "The customer opens their order and presses Cancel. … (the solution in plain words, for the people who use it: what they see, what is checked, what is recorded, who is told, what happens when it is too late.)",
        "steps": [
          "The customer opens their order and presses Cancel",
          "The application checks the order has not shipped",
          "It sets the status to Cancelled and records who cancelled it and when",
          "The clerks of the region see it leave their queue"
        ],
        "diagram": [
          { "step": "Presses Cancel on the order", "who": "Customer" },
          { "decision": "Has it shipped?", "ways": [
            { "label": "yes", "end": "Refused: the order is on its way" },
            { "label": "no" }
          ] },
          { "step": "Sets the status to Cancelled", "by": "app" },
          { "end": "Cancelled" }
        ],
        "changes": [
          { "kind": "enumeration", "target": "Orders.ENUM_OrderStatus", "action": "change", "what": "Gets the value Cancelled." },
          { "kind": "attribute", "target": "Orders.Order.CancelledOn", "action": "add", "what": "A date and time, empty until the order is cancelled." },
          { "kind": "microflow", "target": "Orders.ACT_Order_Cancel", "action": "add", "what": "Started by the Cancel button: checks the status is not Shipped and calls Orders.SUB_Order_ChangeStatus with Cancelled." },
          { "kind": "microflow", "target": "Orders.SUB_Order_ChangeStatus", "action": "change", "what": "Accepts Cancelled, sets CancelledOn and skips the delivery date for it." },
          { "kind": "page", "target": "Orders.Order_Detail_Customer", "action": "change", "what": "Gets a Cancel button, visible while the status is Placed or Confirmed." },
          { "kind": "security", "target": "Orders.Customer", "action": "change", "what": "The module role Customer may start Orders.ACT_Order_Cancel, and write CancelledOn on their own orders only." }
        ]
      },
      "impact": {
        "flows": ["Orders.SUB_Order_ChangeStatus", "Orders.DS_Order_QueueForClerk"],
        "roles": ["Customer", "Clerk"],
        "data": "Existing orders keep their status; none becomes Cancelled. The queue's data source must leave Cancelled orders out."
      },
      "risks": [
        { "level": "P2", "title": "An order shipped at the same moment could still be cancelled", "detail": "The warehouse and the customer act on the same order; the button's visibility is decided when the page opens.", "fix": "Check the status again inside Orders.ACT_Order_Cancel, not only on the button." }
      ],
      "open": [
        "Is the payment of a cancelled order refunded, and by whom?",
        "May a clerk cancel on a customer's behalf?"
      ],
      "effort": "small: one new microflow, two changed, one attribute and one enumeration value"
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | a slug — lower-case letters, digits and hyphens (`cancel-order`); a change with an id MxScout keeps replaces it. Without one, or without `title`, MxScout drops the change |
| `title` | yes | the change in a line, as the person would say it |
| `asked` | no, but write it | the request in the person's own words; the page opens with it, quoted |
| `date`, `status` | no | `status`: `proposed` (the default), `accepted`, `done` or `dropped` |
| `now` | yes | how it works today: `summary` (1–3 sentences), `story` (one case stage by stage, 150–400 words, as `business-narrative.md` says under "A process"), `steps`, `flows` (qualified names from the pack; they become links) and `diagram` when it branches — the same shape as a process's |
| `proposal` | yes | the solution: `summary`, `story` (in plain words, for the people who use it), `steps`, `diagram` when it branches, and `changes` |
| `proposal.changes[]` | yes | one per model change: `kind` (`microflow`, `nanoflow`, `page`, `entity`, `attribute`, `association`, `enumeration`, `security`, `scheduled event`, `integration` or `other`), `target` (a qualified name — an existing one as the pack names it, a new one by the app's conventions; an attribute as `Module.Entity.Attribute`), `action` (`add`, `change` or `remove`; anything else is dropped) and `what` (one or two sentences). An existing target becomes a link; an added one is marked new |
| `impact` | no | `flows` (existing flows it affects; links), `roles` (user roles that gain or lose something), `data` (what happens to the records already there) |
| `risks[]` | no | as the top-level risks: `level` (`P1`–`P3`) and `title` required, `detail`, `fix` |
| `open[]` | no | the questions the model cannot answer — for the person |
| `effort` | no | a rough size, in words |

MxScout keeps up to 100 changes, 60 model changes per change, 100 steps and 60
flows on each side, 30 risks, 30 open questions and 30 roles; text is cut at the
lengths the rest of the file is. Both stories are plain prose like every other
`story`: paragraphs separated by a blank line, no markup.
