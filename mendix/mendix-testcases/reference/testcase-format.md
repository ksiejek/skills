# The test cases' format (mxscout-testcases, version 1)

One JSON file, `testcases.json`, checked whole by MxScout: one error and
nothing is kept.

```json
{
  "format": "mxscout-testcases",
  "version": 1,
  "title": "EventHub",
  "language": "en",
  "brief": 3,
  "cases": [
    {
      "id": "TC-1",
      "rule": "BR-2",
      "title": "An attendee cannot hold a third ticket for one event",
      "role": "Attendee",
      "preconditions": ["An event with free places", "The attendee already holds two tickets for it"],
      "steps": ["Sign in as the attendee", "Open the event", "Press Register"],
      "expected": "The registration is refused with a message that two tickets is the limit; no third ticket appears under My tickets.",
      "model": ["Events.ACT_Register", "Events.Registration_NewEdit"],
      "finding": "logic-ticket-limit"
    }
  ]
}
```

| Field | Required | What it is |
|---|---|---|
| `title` | yes | The application's name, as the brief calls it. |
| `language` | no | `en`, `pl`, `de` … — the language the cases are written in. |
| `brief` | no | The version of the business brief the cases were written from (the number on its page, in `brief.md`'s first comment). |
| `cases[].id` | yes | `TC-1`, `TC-2` … — unique; a number keeps meaning the same case from one hand-in to the next. |
| `cases[].rule` | yes | The rule it checks, `BR-n`, as numbered in the brief. Every rule of the brief needs at least one case. |
| `cases[].title` | yes | What the case checks, in a few words (≤ 200 characters). |
| `cases[].role` | yes | Who carries it out: a user role of the application, never a person's name. |
| `cases[].preconditions` | no | What must be true before the first step: the data, the settings, the state. |
| `cases[].steps` | yes | What the tester does, one action each, in the running application. |
| `cases[].expected` | yes | What the tester should see when the rule holds — something visible, not "it works". |
| `cases[].model` | yes | Where in the model the rule is built (or should be): one or more `Module.Name` — a page, a microflow, a nanoflow, an entity. |
| `cases[].finding` | no | The id of a risk (a logic finding, `logic.rule` = this rule) the case shows is fixed. MxScout shows that risk's remediation story beside the case. |

Limits: 2000 cases, 40 steps and 20 preconditions a case, 20 model
elements, 4000 characters a text.
