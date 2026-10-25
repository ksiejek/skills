# Risk levels P1–P3

One definition, used by both skills: mendix-describe and mendix-docs. The
canonical copy is in MxScout, `skills/mendix-describe/reference/`; edit it
there. The skills repository carries a copy of it, and mendix-docs gets the public MxScout's copy when its installable copy is
put together.

A risk is something in the model that can hurt the people using the
application or the people changing it. Its level says **how soon it should be
fixed**, judged by the worst consequence the model shows. Not by how much code
is involved, how often it repeats, or how untidy it looks.

## P1: security and data

Fix before the next release.

Someone can see, change or delete data they should not, data can be lost or
left half-written, or a secret is exposed.

- An entity access rule lets a role read every row, while every page and flow
  that role reaches shows only its own rows. The narrowing lives in the pages,
  not in the rule, so the client can still fetch the rest.
- A microflow the client can call changes or deletes records without checking
  who calls it, or what the record belongs to.
- A password, token or API key is the default value of a constant, or sits in
  an expression.
  (A constant the browser receives — “Expose to client” — whose name or
  default value looks like a secret MxScout finds itself, from the model, with
  a fixed id; the pack's risk triage lists it as "found by MxScout". Do not
  report that one again.)
- A delete or a bulk change runs with no check of who may do it.

## Risks worked out, and risks from an agent

Two kinds of risk land on the same Risks page. **Worked out**: MxScout's
security engine (`engine/secrisks.js`, run by `check-security.js` in the
skill and by MxScout's Security screen) finds them in the model by rule — the
same model gives the same risks under the same ids (`mx-…`), every time. A
finding about data or accounts is P1 (or the P1 or P2 its check gives), a
finding about a setting — Prototype security, a weak demo password, a user
role with no module role — is P2, what a check suspects and the model does
not prove is P2, its title beginning "To verify:", and what is worth knowing
is P3, its title beginning "Worth knowing:". **From an agent**: everything a rule cannot see —
logic, error handling, commits in loops, dead code, values written into flows
— judged by the levels below. An agent hands the worked-out risks over as
they are and never writes its own about what they cover; a second risk on the
same thing under another id would only split what a person decides about it.

## Evidence: a finding, to verify, worth knowing

The level says how soon; the evidence says whether it is a risk at all. Both
kinds of risk — worked out and from an agent — are kept apart in three:

- **A finding** names a concrete scenario the model shows — who can do what,
  to which data — the evidence for it (the access rule, the flow, the missing
  check, by name) and its realistic effect. Only a finding can be P1.
- **To verify** is what the model suggests and does not prove. Its title
  begins "To verify:", it is at most P2, and its detail says what to look at.
  It is not a finding, and it is not a sign that all is well.
- **Worth knowing** is true, and possibly deliberate: P3.

What decides:

- **A condition on a page is a hint, not proof.** "Shown when", "editable
  when", a hidden button, a read-only input say what the page offers. They are
  security only when the state they read is one the application keeps — an
  enumeration or a boolean the role cannot set itself (read-only for it, or
  changed only behind a check of its own value) — or an owner, a permission.
  A setting the role switches itself on a form (a "use a coupon" checkbox, an
  "all day" toggle, a configuration flag) is how the form behaves.
- **The whole scenario, not one step.** Who may call it (the allowed roles),
  what that role may read and change (its access rules), what the flow and the
  microflows it calls check before the effect, and what the server checks
  first — a before-commit or before-delete microflow, a validation rule. A
  check you cannot read (a Java action, a rule, a flow beyond what you
  followed) in front of the step makes it to verify, named.
- **Every way in, together.** Before you call a hidden button a risk, look
  for the same operation elsewhere: the same microflow from another page, or
  the same change on a form. Compare who may reach each (the roles), with
  which object (the parameters) and under which condition. When the same
  role is offered it elsewhere without the condition, the condition is how
  one page behaves — to verify how that other way in is reached, not a P1.
  A way in only another role has changes nothing for this one.
- **Follow the helpers.** A microflow the flow calls with the object — a
  validation sub-microflow, a Marketplace module's — that stops with an error
  event when its check says no is the check, wherever it lives. One you cannot
  read is a doubt, named; never ignore it, never count it as nothing.
- **Each operation as it is, for the roles that run it.** "Create list" makes
  an empty list, not an object, and needs no create right. A flow a page names
  runs only for a role that may call it (its allowed roles) and sees what runs
  it — not for every role that opens the page.
- **Never P1 on one fact alone.** A missing check, a commit, Apply entity
  access set to No: each is a lead. P1 is the scenario they make together,
  with its effect — rows the role may not read reach it, a record changes in
  a state the application does not allow, data is lost.
- **No blanket exceptions.** Not for an administrator role, not for a
  Marketplace module, not by an attribute's or a flow's name. A name is a hint
  (a String called Status may be a status, a constant called ApiKey may hold
  a key, a role called Admin may administer), never proof either way: the
  value, the rights, what the role may do decide. That a
  role may edit a configuration does not, by itself, clear a risk about it.
- **A Marketplace module's own administration is set aside — by evidence.**
  Inside a Marketplace module, a risk nothing in the application leads to
  (no page, menu, navigation item, scheduled event or flow outside the module
  opens or calls it), or one only the application's administrators reach, is
  not reported. An administrator is what the model says: the administrator
  role in App Security, a role that may assign every role, or one that may
  give users its own role — never a name. A regular role holding something
  administrative is still reported. The Administration module is never set
  aside: its Account entity and account pages hold personal data and are
  read in full. MxScout's engine lists what it set aside, and why.
- **Every risk says how to show it and how to fix it.** A test case: who
  signs in, what has to be there first, the steps in the running application,
  and what tells a real risk from a safe one. A fix as a ticket would say it:
  the module, the document, what exactly to change.
- **No proof of a problem is no proof of safety.** Say what you could not
  check, in the risk to verify or in "not checked". And a risk you cannot see
  this time because the model lacks what it needs — the constants not read, a
  flow without its drawing — is **not checked**, not gone: what was decided
  about it stays (MxScout's engine says so in `unchecked`).
- **Keep the real ones.** A rule the pages enforce and the server does not —
  an input editable only in Draft while the access rule lets the role write it
  in any state, a button hidden in a state its microflow does not check — is a
  finding when the state is one the application keeps.

## P2: functional errors

Fix in one of the next releases.

A process gives a wrong result, or stops, in a case the model shows can happen.

- A REST, OData or web service call has no error handler.
- A flow fails for a role that can start it, because it reads an entity that
  role cannot read.
- A commit sits inside a loop. It is slow, and a failure halfway leaves part of
  the records changed.
- A process depends on a scheduled event that is disabled in the model. It may
  be enabled in the environment, so say that it is to be confirmed.
- A page validates a value, but the microflow that saves it does not.

## P3: maintenance

Fix when you next work on that part of the application.

Nothing goes wrong for a user today, but every change is slower or riskier.

- Dead code: flows and pages nothing reaches, and duplicates (`_New`, `_Old`,
  copies, spikes).
- Values that belong in a constant or in configuration are written into flows.
- Disabled steps are left in a flow.
- Names break the module's own conventions, or are misspelt.

## Patterns

Besides its level, give each risk the one pattern it belongs to, as `theme`.
The Documentation's Risks page counts and filters findings by pattern, and
says so when one pattern holds most of the P1 findings. Pick by what goes
wrong, not by where:

| `theme` | Shown as | When |
|---|---|---|
| `access` | Missing access checks | a flow acts on any record without checking who calls it; a role reaches what it should not |
| `secrets` | Secrets in the model | a key, password or token is written into the model |
| `logic` | Logic and data errors | a condition or calculation gives the wrong answer in some cases |
| `silent` | Errors that vanish | a failure is caught and dropped, so nobody learns of it |
| `delete` | Deletes too much | a delete reaches further than the record it was meant for |
| `loops` | Commits in loops | objects committed one at a time inside a loop |
| `schedule` | Relies on switched-off events | work depends on a scheduled event switched off in the model |
| `dead` | Unused or duplicated | nothing reaches it, or the same logic is kept twice |
| `hardcoded` | Values written into flows | a value belongs in a constant or in configuration |
| `naming` | Names and messages | a name or a message misleads whoever reads it |
| `performance` | Slow pages and queries | a query per item of a loop or per row of a list, a filter with no index, a value worked out on every read |

## Calibrating

1. **The worst realistic consequence the model shows decides.** How many places
   it appears in goes into the description, not into the level.
2. **Only what the model shows.** Some risks depend on what the model cannot
   show: environment settings, who calls an API, how a scheduled event is set in
   the cloud. Such a risk is at most P2, and it says what has to be confirmed.
3. **Between two levels, take the lower one**, and say why in one sentence. A
   list with too many P1s reads as noise, and the real P1 gets lost in it.
   Between a finding and one to verify, the evidence decides ("Evidence"
   above) — never lower every risk to make the list shorter, and never drop
   one because it is inconvenient.
4. **One risk per cause.** Ten flows with the same missing error handler are
   one risk with ten places, not ten risks.
5. **Every risk says where and what to do.** It names the qualified name of each
   flow, page or entity it is in, and gives the fix in one sentence.
6. **A risk keeps its id.** The same risk carries the same `id` on every
   update, so whoever works through the list — marking one fixed, or a false
   positive with the reason — finds their decision still on it next time. A
   risk marked a false positive is not raised again unless the model changed
   so the reason no longer holds (mendix-describe, "Risk triage"). A risk that
   goes because the rules changed, not the model, is **withdrawn**, never
   fixed: MxScout's engine says so (`"withdrawn": true` in `verify`), and a
   person's "fixed" on it stays to verify.

## Where each tool writes it

`risks` in the descriptions file (`descriptions-format.md`), the same for both
skills. The documentation — MxScout's, or the report mendix-docs builds —
shows them on a Risks page, filtered by level, pattern (`theme`, one of the
ten keys in `descriptions-format.md`) and module, each saying an agent wrote
it.
