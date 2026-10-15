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
      "id": "p1-operator-reads-all-tickets",
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
| `add` | no | `true`: the file adds to the descriptions MxScout keeps instead of replacing them — one more process, or flows described since. The application's `summary`, `story` and `audience`, when the file has them, replace the ones kept; a process of the same name is replaced and a new one added at the end; a flow, page, entity or module in the file replaces its old description; a risk already kept — the same `id`, or the same level and title, case and spacing aside — is replaced in its place by the new copy (so a risk ranked at another level under the same `id` takes the old one's place), a new one is added at the end; a `context` entry already kept is not added twice; `project`, `language` and `by` stay as kept (the file's when none is), `written` is the file's; everything else stays. Without it, an import replaces what was kept. `check-descriptions.js merge` joins parts by the same rules, and when every part says `"add": true` the merged file says it too |
| `describedAt` | no — **MxScout writes it** | the model version the descriptions were saved against: `{ "commit", "short", "branch", "date", "message" }`, from the Mendix project's git. MxScout sets it on every save of what an agent sends, to the model's version at that moment, and keeps it in `descriptions.json` and in a package — inside the Mendix project, in `mxscout/mxscout.json`, where `agent.js write` sets it to the commit HEAD names; do not write it yourself |
| `replace` | no | with `"add": true` only: `["app"]` — the file's `app` (summary, story, who uses it, every process) replaces the overview kept, as when the overview was written again from the start; flows, modules, risks and the rest are still added to. Without `"add": true` it is ignored (the checker warns) |
| `project`, `language`, `by`, `written` | no | `by` is shown as who wrote the descriptions. `language` is the code of the language the content is written in (`"en"`, `"pl"`) — the project's language of written content (SKILL.md, "The language you write in"). The first file MxScout takes that names a language sets the project's when it has none; a file in another language is kept, with a warning to the person |
| `setLanguage` | no | `true`, with `language`: the person asked for another language, and MxScout changes the project's language of written content to this one. Not kept with the descriptions |
| `app.summary` | no, but write it | the first thing a business reader sees: 2–4 sentences, always shown |
| `app.story` | no, but write it | the long description, paragraphs separated by a blank line; shown under the summary, folded |
| `app.audience` | no | the groups of people who use the app, as many as there are: `{ "who", "what" }`, a short name and one sentence. The documentation's overview shows each group on a line of its own. A single sentence, as files before this were written, is still read and shown as one paragraph |
| `app.processes[]` | no | every main process the application has, each with `name`, `summary` and `story` (one case, stage by stage, 200–400 words — `business-narrative.md`, "A process"); `steps`: one sentence each, naming who does what, as many as the case has; `diagram`, only when the process branches (`business-narrative.md`): a list of `{ "step", "who", "by": "person" \| "app" }`, `{ "decision", "ways": [{ "label", "then": [ … ], "end" }] }` and `{ "end" }` — a way with an `end` finishes there, one with `"join": "<a step's text>"` goes on at that step further on (rules tried in turn that all lead to the same next step), one with neither rejoins the main path, and `then` holds steps and decisions of its own; `flows` are qualified names from the pack and become links. A step's `by` is `person` (the default) or `app`; a way has an `end` or a `join`, not both — with both it ends there |
| `modules` | no | module name → `{ "summary", "story", "notes" }`; a plain string is read as the summary. `notes`: sections for a developer, see `module-notes.md` |
| `c4` | no | the architecture, levels 1 and 2: `context` and `containers` (nodes and links) and `open` (what the model does not show), see `c4.md` |
| `microflows`, `nanoflows`, `pages`, `entities` | no | qualified name → `{ "hash", "text" }`, or just the text |
| `risks[]` | no, but write it | `level` (`P1`, `P2` or `P3`, by `risk-levels.md`) and `title` are required, or MxScout drops the risk; `detail`, `where` (qualified names, they become links) and `fix` are what make it useful; `theme` is its pattern, one of the ten keys in `risk-levels.md` — the Risks page groups and filters by it, and guesses it from the title when it is missing |
| `risks[].id` | no, but write it | a short slug — lower-case letters, digits and single hyphens, at most 80 characters (`p1-anon-delete-ticket`) — unique in the file. **Keep it the same for the same risk on every update** and invent a new one only for a new risk: it is how MxScout knows the risk again, merges it, and keeps what a person decided about it (fixed, false positive — see "Risk triage" in `SKILL.md`). Without it MxScout knows a risk by its level and title, so a reworded title becomes a new risk |
| `verify[]` | no | for risks a **person** raised (listed as `raised by …` under `## risk triage` in the pack) and marked fixed: `{ "id": "c-…", "still": true \| false, "why": "…" }` — whether the model still shows it, with the id the pack gives. MxScout reopens or verifies the risk by it; risks a person raised are never yours to write in `risks` |
| `changes[]` | no | changes the person asked to be worked out (`SKILL.md`, "A change, when the person asks"), shown on the Assist page, under Ideas; see "Changes" below. In a file with `"add": true`, a change whose `id` is already kept replaces it and a new one is added at the end |
| `tickets[]` | no | **older files only** — tickets checked against the model, which MxScout now moves to the Assist page; write Assist items instead (`../../mendix-assist/reference/assist-format.md`); see "Tickets" below. In a file with `"add": true`, a ticket whose `id` is already kept replaces it and a new one is added at the end |
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
changes — the whole list each time, each risk under the id it had before. A
risk a full file no longer lists is taken as gone; a file with `"add": true`
says nothing about the risks it does not list. A qualified name in `where`, or inside a `place` or a pitfall, links to
that flow, page or entity in the documentation when the model has it.

A description without `hash` is shown but never marked out of date; with one,
MxScout compares it to the flow's current fingerprint each time it builds the
documentation, and flags the ones that changed since.

## Changes

A change is something the person wants made to the application, worked out
before anyone builds it: how that part works **now**, the **proposal**, and the
concrete changes to the model it needs. MxScout shows it on the Assist page, under Ideas —
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

MxScout keeps up to 100 changes, 60 model changes per change, 100 steps on each
side, 60 flows in `now` and 60 in `impact`, 30 risks, 30 open questions and 30
roles; text is cut at the lengths "What MxScout keeps" below gives. Both stories are plain prose like every other
`story`: paragraphs separated by a blank line, no markup.

## Tickets

A ticket is something reported on the application — a Jira issue, an e-mail
from a user — checked against the model. **Older files only**: the mendix-assist
skill (`../../mendix-assist/SKILL.md`) writes Assist items instead, and MxScout
moves a ticket an older file carries onto its Assist page. As it was: the ticket as it was
pasted, a **verdict** with how sure it is, the reasoning, what the model does,
the places in the model that show it, what would settle it, a reply to paste
back into the ticket and, for a bug, the change that would fix it. MxScout shows
it on the Assist page, under Tickets, and acts on none of it: nothing is sent to the tracker,
and `source` is shown as text — an address in it is never opened. It is sent as
a part of its own, with `"add": true` and only `tickets` in it — and `changes`
when a fix is proposed:

```json
{
  "format": "mxscout-descriptions",
  "version": 1,
  "add": true,
  "project": "Sales",
  "language": "en",
  "by": "Claude, an earlier ticket-check skill",
  "tickets": [
    {
      "id": "PROJ-12",
      "title": "Cancelled orders still appear in the clerk's queue",
      "reported": "When a customer cancels an order it still shows up in my queue the next morning and I have to skip it by hand. Expected: cancelled orders are gone from the queue.\n\nSteps: cancel order 10423 as the customer, log in as a clerk of the North region, open My queue.",
      "source": "Jira, https://jira.example.com/browse/PROJ-12",
      "date": "2026-10-14",
      "verdict": "bug",
      "confidence": "high",
      "summary": "The ticket is right: the clerk's queue lists every order of the region that has not shipped, and nothing in it leaves out the status Cancelled. It is a fault in the model, not in the data.",
      "story": "The ticket expects an order a customer cancelled to leave the clerk's queue at once. The reporter is a clerk of the North region, and the case is one order cancelled before it shipped.\n\nIn the model, the queue page Orders.Queue_Clerk is filled by Orders.DS_Order_QueueForClerk. That flow retrieves the orders of the clerk's region whose Status is not Shipped, sorted by the date placed. Cancelling (Orders.ACT_Order_Cancel) sets Status to Cancelled through Orders.SUB_Order_ChangeStatus and changes nothing else, so a cancelled order still matches the queue's condition and stays on the page until it is deleted by hand.\n\nThe list on the queue page shows what that flow returns, so the flow's condition is the queue's condition. Orders.ENUM_OrderStatus has the value Cancelled, and nothing in the condition names it. The model behaves this way for every region and every clerk; the data of order 10423 is not needed to see it.",
      "traced": {
        "steps": [
          "The customer cancels the order; the status becomes Cancelled",
          "The clerk opens My queue; the application lists the region's orders that have not shipped",
          "The cancelled order matches, and is listed with the others"
        ],
        "flows": ["Orders.ACT_Order_Cancel", "Orders.SUB_Order_ChangeStatus", "Orders.DS_Order_QueueForClerk"],
        "diagram": [
          { "step": "Opens My queue", "who": "Clerk" },
          { "decision": "Status is Shipped?", "ways": [
            { "label": "yes", "end": "Left out" },
            { "label": "no" }
          ] },
          { "end": "Listed — Cancelled among them" }
        ]
      },
      "evidence": [
        { "kind": "microflow", "target": "Orders.DS_Order_QueueForClerk", "what": "Retrieves the region's orders with Status != Shipped; Cancelled is not left out." },
        { "kind": "microflow", "target": "Orders.SUB_Order_ChangeStatus", "what": "Sets Status to Cancelled and nothing else; the order is not removed from any list." },
        { "kind": "enumeration", "target": "Orders.ENUM_OrderStatus", "what": "Has the value Cancelled beside Placed, Confirmed and Shipped." },
        { "kind": "page", "target": "Orders.Queue_Clerk", "what": "Opens with its list filled by Orders.DS_Order_QueueForClerk, which is what decides the queue." }
      ],
      "needs": [],
      "reply": "Thanks — confirmed. The clerk's queue leaves out shipped orders but not cancelled ones, so a cancelled order stays listed until someone removes it. We will change the queue to leave out cancelled orders too (change queue-leaves-out-cancelled). Until then, cancelled orders can be skipped safely: they cannot be confirmed.",
      "change": "queue-leaves-out-cancelled",
      "risk": "c-7d3f2a9e",
      "risks": [
        { "level": "P3", "title": "Other lists may miss the new status as well", "detail": "Cancelled came after the lists were built.", "fix": "Check every retrieve on Orders.Order that filters by Status." }
      ]
    }
  ]
}
```

The change it names, `queue-leaves-out-cancelled`, is a `changes` entry in the
same file, written as "Changes" above says — how the queue works now, and the
retrieve with `Status != Cancelled` added.

| Field | Required | Notes |
|---|---|---|
| `id` | yes | the ticket's key as it was given (`PROJ-12`), or a slug when it has none — letters, digits, dots, hyphens and underscores, up to 80. A ticket with an id MxScout keeps replaces it; without one MxScout drops the ticket |
| `title` | yes | the ticket's title, or what it reports in a line |
| `reported` | no, but write it | the ticket's text as the person pasted it, trimmed — its own language, its line breaks; MxScout keeps 8,000 characters and shows it quoted, folded when it is long |
| `source`, `date` | no | `source`: where it came from (`"Jira"`, the ticket's address) — kept and shown as text, never opened; `date`: when it was checked |
| `verdict` | yes | `bug` (the model does what the ticket reports, and that is a fault), `as-designed` (the model was built to do it: a misunderstanding, or a wish for a change), `data-config` (the model is right; the data, a constant, a scheduled event switched on or off, a setting or an integration's other side decides it), `cannot-tell` (the model does not settle it: it needs logs, the data, steps to reproduce, the deployed version). Anything else drops the ticket |
| `confidence` | no, but write it | `high`, `medium` or `low` (the default) — how sure the model lets you be |
| `summary` | yes | the answer in one to three sentences; MxScout drops a ticket without it |
| `story` | yes | the reasoning in paragraphs, at least 80 words: what the ticket expects, what the model does instead, why that is or is not a fault — the model's facts and the judgement on them kept apart |
| `traced` | no, but write it | the behaviour as the model has it: `steps` (one sentence each), `flows` (qualified names from the pack; links) and `diagram` when it branches — the same shape as a process's |
| `evidence[]` | no, but write it | the places the verdict rests on: `kind` (as a change's: `microflow`, `nanoflow`, `page`, `entity`, `attribute`, `association`, `enumeration`, `security`, `scheduled event`, `integration` or `other`), `target` (a qualified name, as the pack has it; a link when the documentation has it) and `what` (what it shows, in a sentence) |
| `needs[]` | for `cannot-tell` or `low` | what would settle it: the logs of that day, the record's data, the steps to reproduce, the version deployed |
| `reply` | no | a short answer to paste back into the ticket, in the ticket's language; the page has a button that copies it |
| `change` | for a bug | the `id` of the `changes` entry with the proposed fix — in the same file, or one MxScout keeps; the page links to it |
| `risk` | when it matches one | the `id` of the known risk the ticket is about — the very problem a risk already describes: an agent's risk by its slug (`p2-saved-twice`) or one a person raised in a comment by its `c-…` id, exactly as the pack's `## risk triage` lists it (or as this file's `risks` or the documentation's Risks section give it). MxScout links the ticket to that risk on the Risks page and the risk back to the ticket ("Ticket PROJ-12: Bug in the model"). Never an id you made up; none matching, leave it out — a new risk the ticket shows goes in `risks` |
| `risks[]` | no | as a change's: `level` (`P1`–`P3`) and `title` required, `detail`, `fix` |

MxScout keeps up to 200 tickets, 60 evidence rows, 100 steps and 60 flows per
ticket, 30 needs and 30 risks; text is cut at the lengths "What MxScout keeps"
below gives. The story is plain prose like every other `story`.

## What MxScout keeps

MxScout reads the file within bounds, and past them it drops the rest of a list
or cuts a text short — without a word. `check-descriptions.js check` warns about
each one a file goes past ("MxScout keeps N; the rest is dropped"). The numbers
are generous: a description that respects `business-narrative.md` never meets
them. A text is counted once trimmed.

| Where | Entries kept | Characters kept |
|---|---|---|
| `project`, `language`, `by`, `written` | | 200, 20, 200, 40 |
| `app` | | `summary` 6,000, `story` 16,000; `audience` as one sentence 1,000 |
| `app.audience[]` | 30 groups | `who` 120, `what` 600 |
| `app.processes[]` | 200 | `name` 200, `summary` 2,000, `story` 16,000 |
| a process's `steps[]`, `flows[]` | 100 steps, 60 flows | a step 600, a flow 300 |
| a `diagram` (a process's, a change's, a ticket's) | 60 items in each list, 6 ways per decision; a way's `then` nests at most 6 levels under the top list, deeper is dropped | `step` and `decision` 200, `who` 60, `label` 60, `end` 160, `join` 200 |
| `modules`, `microflows`, `nanoflows`, `pages`, `entities` | | the text (or a module's `summary`) 4,000, a `story` 16,000 |
| a module's `notes[]` | 16 sections; 60 `items`, 6 `columns` and 80 `rows` in each | `title` 160, `text` 6,000, an item 800, a column 60, a cell 500 |
| `c4.context`, `c4.containers` | 100 nodes, 250 links | a node's `id` 40, `name` 80, `note` 140, `group` 60; a link's `label` 60; the diagram's `note` 600 |
| `c4.open[]` | 30 | 500 each |
| `risks[]` | 2,000; 40 places in each `where` | `id` up to 80 (a longer one is dropped, and the risk known by its level and title), `title` 300, `detail` 3,000, `fix` 1,000, a place 300 |
| `verify[]` | 500 | `why` 1,000 |
| `context.where[]`, `context.conventions[]`, `context.pitfalls[]` | 80 each | `topic` and `pattern` 300, `place`, `meaning` and a pitfall 1,000 |
| `changes[]` | 100; per change 100 steps on each side, 60 flows in `now`, 60 model changes, 60 `impact.flows`, 30 `impact.roles`, 30 risks, 30 `open` | `id` 80, `title` 200, `asked` 2,000, `date` 40, each side's `summary` 2,000 and `story` 16,000, a step 600, a flow 300, a model change's `target` 300 and `what` 1,000, a role 120, `impact.data` 3,000, a question 1,000, `effort` 300 |
| `tickets[]` | 200; per ticket 100 traced steps, 60 traced flows, 60 evidence rows, 30 `needs`, 30 risks | `id` 80, `title` 200, `reported` 8,000, `source` 300, `date` 40, `summary` 2,000, `story` 16,000, a step 600, a flow 300, an evidence row's `target` 300 and `what` 1,000, a need 1,000, `reply` 4,000 |
| a change's or a ticket's `risks[]` | 30 | `title` 300, `detail` 3,000, `fix` 1,000 |

## Inside the Mendix project: the same file, split

A project kept inside the Mendix project (`mxscout/`, shared through the app's
git) keeps this file split into small files, so a git conflict stays small:

```
mxscout/descriptions/app.json                 format, version, project, language, by, written,
                                              app { summary, story, audience }, processes: [file names, in order]
mxscout/descriptions/processes/<name>.json    one process, as in app.processes
mxscout/descriptions/modules/<Module>.json    { module, summary (the module's entry), microflows, nanoflows, pages, entities }
                                              — every flow, page and entity of that module, by its qualified name
mxscout/descriptions/risks.json               the risks, as in "risks"
mxscout/descriptions/c4.json                  the architecture, as in "c4"
mxscout/descriptions/context.json             the developers' context, as in "context"
mxscout/mxscout.json                          describedAt
```

You still write one descriptions file as above; `node agent.js write
descriptions.json --folder <MendixProject>` splits it exactly as MxScout does
(`repodocs.js`, MxScout's own code) and writes only the files that changed.
Never edit the split files or `mxscout/docs/` by hand.
