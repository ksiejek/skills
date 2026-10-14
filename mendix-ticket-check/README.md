# Checking a ticket against a Mendix model, from MxScout

Paste a ticket reported on your Mendix application — a Jira issue, a bug
report, a user's e-mail — and an AI agent checks it against the application's
model and tells you whether it holds:

- **Bug in the model** — the model does what the ticket says, and that is a
  fault; it proposes the fix as a change, on MxScout's Changes page.
- **Works as designed** — the model was built to do it; a misunderstanding, or
  a wish for a change.
- **Data or configuration** — the model is right; a record, a constant, a
  scheduled event or a role decides what the ticket sees.
- **Cannot tell from the model** — and what would settle it: the logs, the
  data, the steps to reproduce, the version deployed.

Each with how sure it is, the reasoning, what the model does, the places in the
model that show it, and a reply you can paste back into the ticket. The result
appears in MxScout on the project's **Tickets** page and in the exported
documentation.

It never changes the model, never opens the ticket's address and never talks to
Jira or anything else: the only connection is the one mendix-describe makes, to
the MxScout on your own machine. `SKILL.md` is what the agent reads. This file
is for you.

## What you need

- MxScout, with the project loaded.
- The **mendix-describe** skill installed **beside** this one. This skill has no
  tools of its own: it uses mendix-describe's `agent.js` and
  `check-descriptions.js` and its format, by the path `../mendix-describe/`.

## Install (once)

Copy both folders into your skills folder, side by side:

```bash
cp -r skills/mendix-describe skills/mendix-ticket-check ~/.claude/skills/
```

or link them, so a `git pull` of MxScout updates them:

```bash
ln -s "$PWD/skills/mendix-describe" "$PWD/skills/mendix-ticket-check" ~/.claude/skills/
```

## Use it

In MxScout: open the project → **Documentation** → **Share with an agent** →
**Copy for the agent**. Paste that line into the agent's chat, then:

```
Use the mendix-ticket-check skill on this ticket:

PROJ-12 Cancelled orders still appear in the clerk's queue
When a customer cancels an order it still shows up in my queue the next
morning and I have to skip it by hand. Expected: cancelled orders are gone.
```

The same in Polish:

```
Sprawdź to zgłoszenie skillem mendix-ticket-check — czy ma rację bytu:

PROJ-12 Anulowane zamówienia nadal widać w kolejce sprzedawcy
…
```

(Or export the AI pack — **Documentation** → **Export AI pack** — and give the
agent the file instead of the line.)

It restates what the ticket expects and asks only what blocks the check, traces
that case through the model, and sends the result. MxScout offers **Import
them** in the Documentation (from a file: **Import descriptions…**); then open
**Tickets** in the sidebar. Several tickets can go in one request. A ticket
checked again — with the logs you found, after the model changed — replaces
the one kept under the same key.

The verdict is an agent's judgement from the model, marked **✦ AI** on the
page. The model shows how the application is built, not what it did on a given
day: read the reasoning before you answer the ticket.
