# The business brief's format (`mxscout-brief`, version 1)

One JSON file. MxScout checks it with `brief-format.js` — the same file
`check-brief.js check` uses — and refuses it whole on any error.

```json
{
  "format": "mxscout-brief",
  "version": 1,
  "title": "EventHub",
  "language": "en",
  "summary": "EventHub lets an organiser publish events and sell a limited number of tickets, and lets attendees register and pay online, replacing the registration spreadsheet.",
  "sources": [
    { "id": "S1", "name": "stories-export.csv", "kind": "stories" },
    { "id": "S2", "name": "EventHub design v3.docx", "kind": "document", "note": "the agreed version, March" }
  ],
  "roles": [
    { "name": "Organiser", "text": "Creates events, sets capacity and prices, sees who registered.", "sources": ["S1 US-2", "S2 §2"] },
    { "name": "Attendee", "text": "Finds an event, registers and pays.", "sources": ["S2 §2"] }
  ],
  "processes": [
    { "name": "Register for an event", "text": "An attendee picks an event, chooses tickets and pays; the place is held while they pay.",
      "steps": ["Choose the event", "Choose up to two tickets", "Pay within 15 minutes"], "sources": ["S1 US-14", "S2 §4"] }
  ],
  "rules": [
    { "id": "BR-1", "text": "An attendee may hold at most two tickets per event.", "process": "Register for an event", "sources": ["S1 US-14"] },
    { "id": "BR-2", "text": "A place held for payment is released after 15 minutes without payment.", "process": "Register for an event", "sources": ["S2 §4.2"] }
  ],
  "data": [
    { "name": "Registration", "text": "One attendee's tickets for one event.", "fields": ["event", "attendee", "number of tickets", "paid on"], "sources": ["S2 §5"] }
  ],
  "open": [
    { "text": "S1 says a cancelled event is refunded automatically; S2 says the organiser decides.", "sources": ["S1 US-21", "S2 §6"] }
  ]
}
```

## Fields

| Field | Required | What it is |
|---|---|---|
| `title` | yes | The application's name, as the documents call it. |
| `language` | no | The language the brief is written in: `en`, `pl`, `de-CH` … |
| `summary` | yes | What it is for. Paragraphs separated by a blank line. |
| `sources` | yes, ≥ 1 | `id` S1, S2 … (unique), `name` (the file or the document's title), `kind` — `stories`, `document`, `notes` or `other` — and an optional `note`. Every source should be referred to somewhere. |
| `roles` | yes, ≥ 1 | `name`, `text`, `sources`. |
| `processes` | yes, ≥ 1 | `name` (unique), `text`, optional `steps` (sentences, in order), `sources`. |
| `rules` | yes, ≥ 1 | `id` BR-1, BR-2 … (unique, never reused for another rule), `text` — one checkable statement — optional `process` (a process's `name`), `sources`. |
| `data` | no | `name`, `text`, optional `fields` (short phrases), `sources`. |
| `open` | no | `text` — what is undecided or contradictory — and `sources`. |

A **reference** in `sources` is a source's id, optionally followed by a space
and where in it: `"S2"`, `"S2 §4.2"`, `"S1 US-14"`, `"S3 p. 7"`. The id must
be one of `sources`.

Limits: 200 sources, 100 roles, 200 processes, 1000 rules, 300 data entries,
200 open questions; a text at most 8,000 characters, the summary 12,000.

## Versions

Every brief MxScout takes becomes the project's next version (the same brief
twice is kept once). The page shows the newest, lets the person look at an
earlier one and says what changed since the one before: rules added, changed
and removed by number, processes added and removed by name. That is why a
rule's number must keep meaning the same rule.
