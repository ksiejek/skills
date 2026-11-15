# The catalogue of leads

A **lead** is a place worth reading, never a risk. Leads come from two
sources:

1. **MxScout's engine** computes some by rule, without AI, and hands them
   over under fixed ids (`mx-…`). It is cheap and it cannot prove anything:
   in a review of a large real application about half of what it pointed at
   was a real problem. Every one of them ends with your verdict: confirmed,
   dropped or undecided (part 1).
2. **You** find the rest: what a rule cannot see. Run the checks of part 2
   over the fact sheet of stage A; a hit is one line with the check number,
   the element and the fact.

Stage B reads "what to read" and decides; what drops or clears a lead is what
stage C looks for. Names in the examples are invented (`Sales.Order`).

## Part 1: the engine's leads

### How to take them

1. **Get them.** On a Team server `list_risks` with `leads: true` (narrow
   with `check` or `module`); from files the `leads` of
   `check-security.js --json`. A lead has `id`, `check`, `title`, `detail`,
   `fix`, `where` (the documents it is about), `facts` (what the engine
   read) and `rank` (1 first). It has no level: the level is yours.
2. **Skip what is settled.** A lead that carries a `decision` and is not
   `stale` was confirmed or dropped in an earlier run and nothing it rests on
   changed: count it as decided, do not read it again. A stale one is read
   again.
3. **Say the size first.** Tell the person how many open leads there are per
   check before you start. The cost follows the number of documents in
   `where`, not the number of leads.
4. **Group by document.** Many leads name the same flow or entity. Read each
   document once, whole, with every microflow it calls, and settle all its
   leads together.
5. **Order:** rank 1, then rank 2. Rank 3 (`access-wider`,
   `access-unwritten`) is one lead per entity: take the entities with free
   text, files or links to people first.
6. **Give each lead a verdict:**
   - `confirmed`: it is a step of a scenario with an effect. It goes into a
     risk; the risk's `from` lists the lead ids, the decision names the risk.
   - `dropped`: one sentence that names the element you read and what it says
     there. A drop is a claim like any other: "nothing compares" and "only
     administrators" are search results (rule 3).
   - `undecided`: what you could not read, or what the model does not decide,
     with the test that would.
7. **The engine's `facts` are not evidence.** They tell you where to look.
   Reopen the document; a claim in a risk is what you read in this run.
8. **One cause, one risk.** Ten leads with one cause are one risk with ten
   places. A lead is often one link of a chain: follow it to the effect
   before you set a level.
9. **Never drop unread.** When the budget ends, the leads you did not open
   stay open, and the report counts them per check.
10. **Keep the verdicts.** On a Team server `write_risks` with `leads`
    (`{ id, verdict, reason, risk }`); from files `lead-decisions.json` in
    the work folder, handed to the next run with `--decisions`. A dropped
    lead is your verdict, not a person's "false positive": a person may
    reopen it.

What the engine lists as **risks** (`risks`, also `mx-…`) is on the Risks
list already. Do not write it again; when you add a consequence it cannot
state, name its id in your risk.

### What each check saw, and what settles it

| `check` | What the engine saw | Read | Confirmed when | Dropped when |
|---|---|---|---|---|
| `guard-escalation` | A flow with "apply entity access" off changes, commits or deletes an object the calling role's own rules would not let it change | The flow whole, with sub-microflows; the role's rules on the entity (the XPath for reading against the XPath for writing); where the object comes from | The role can read rows it may not change, or the flow fetches the object itself by a parameter's value; nothing compares the object with the current user before the step; and what is written matters to somebody else | One rule, or the same XPath for reading and writing: the client can only hand over an object the role may read, so only what it may change anyway. A comparison with the current user or a membership check before the step. The write is trivial (a file name in lower case) |
| `guard-page-hides` | A page shows the trigger only under a condition; the flow does not check it | The flow whole; what it stores; who may call it | It stores, deletes or creates persistent data for an object from a parameter and neither compares it with the caller nor reads the state again | It only opens a page or prepares a working object; a decision in the flow reads the same state; the role may make the same change by its own rule on the same rows. The kind of page condition (state or owner) settles nothing |
| `guard-role-wider` | A flow is allowed to more roles than the pages offer it to | The flow; the extra roles, counted | An extra business role can store, delete or send with it for an object that is not its own | The flow only reads what the role may read anyway; the extra role holds it for a page the engine did not connect |
| `guard-scope-set` | A flow the client can call sets an association that access rules use to decide whose rows these are, and never looks at the caller | Which rules scope by that association; where the target comes from | A business role can link itself or another account to rows (a team, a board, an owner). Follow it: what the new membership reads, changes or deletes | The server sets the target to the current user; the object is new and the caller's own; only roles that manage that membership may call it |
| `guard-account-param` | A flow takes an account from the client and changes it or gives it objects | The flow; what is written on the account and what is linked to it | It writes roles, credentials, tokens or membership on, or creates records in the name of, an account that is not the caller's, with no comparison | The account is compared with the current user; the flow returns a list (`DS_`); it only reads a name. An account passed from the client is never itself a check of who calls |
| `guard-sub-callable` | A helper flow (`SUB_`, or one only microflows call) has allowed roles and stores or sends | What it does called alone with any object the role can read; strict mode | It skips the check its caller makes and a business role holds it | No business role is allowed; it stores only what the role may write anyway |
| `guard-auth-loose` | An authentication microflow matches text loosely | The whole microflow; what it returns on a partial match; whether it checks that the account is active | The secret or the user is matched with contains, find or starts-with, or a blocked account passes | An exact comparison of a hashed secret, and the account's state is checked |
| `service-op-unscoped` | A published operation finds a record by a key from the request and does not narrow it to the caller | The operation's microflow, the service's authentication, who holds the role, what is returned or changed | Callers are people (a personal token, a user) and each reaches other people's records | A system-to-system integration with one service account, where finding by key is the purpose; a sign-in callback |
| `access-not-inherited` | A role reads every row of an entity that points to a parent the same role sees only in part (the association does not delete the child with the parent) | Which way the association really points; what the child holds; the role count | The child carries the parent's content (text, time, files) and a counted business role reads all of it | Reference data or a catalogue; the "parent" is incidental (an account pointing to its own view setting) |
| `access-text-open` | An entity with long text or files is read in full by a business role | The roles, counted; what the text is; strict mode; the pages that reach it | Other people's free text, mail or files, readable from the client. With strict mode off this is a finding by the rule alone | Templates, dictionaries, texts of the application itself; administrators only |
| `access-wider` | A rule gives more than any page or flow of the role uses | The entity's rules for that role, all of them | The unused right reads or writes other people's rows with content that matters | A right nothing can reach with strict mode on; the caller's own row; reference data. Tidying, not a risk |
| `access-unwritten` | A rule gives write on a member nothing writes | The member; whose rows the rule covers | A member that decides something (a role, an owner, a state, a sync flag) is writable on rows that are not the caller's | The caller's own preference (a colour, a theme) |
| `secret-attribute` | A text attribute named like a secret is readable beyond its own row | What is stored there (a cipher text, a hash, plain text) and who reads it | A plain or reversible secret readable by a role other than its owner | A hash; the caller's own row; an entity of a module the application does not use |
| `scope-delete-state` | An owner rule gives delete with no condition on the state | The states the record goes through; what the delete takes with it (`read_raw`, delete behaviour); before-delete handlers | The record has a workflow, the delete takes history, time records or files with it, and nothing refuses it | The XPath or a handler limits it to a draft; the record has no life after creation |
| `accounts` | A role writes members of the account entity nothing in the application writes | The member; whose account | It can be written on somebody else's account and it matters | The caller's own settings; reading names is a staff directory, worth knowing at most |
| `market-admin` | A Marketplace module's administrator role is held by a role that is not an administrator | What the module's administration pages and flows do for that role | The role reaches mail settings, keys, logs or user data through them | A module role made for a user role of the same name in a customised module; nothing of it is reachable |

A check that is not in this table is new: read its `detail` and `fix`, apply
the general test (who may call it, with whose object, what is checked before
the effect, whose data changes) and say in the report that the catalogue does
not know it.

## Part 2: what the engine cannot see

### Project and platform (tier t1)

| # | Lead | What to read next | What clears it |
|---|---|---|---|
| 1 | Strict mode is off | Nothing more: it is a fact of project security. It also decides how checks 9 and 10 are judged. | Strict mode on. |
| 2 | Guest access is on | The guest role's module roles, the entities and flows they reach. | The guest role reaches only the sign-in pages. |
| 3 | Demo users or a default administrator name in the model | Which roles they hold. Whether they exist in an environment is not in the model: at most P2, to confirm. | None are defined. |
| 4 | A constant has a default value and a name or use that says secret (password, key, token, secret, credential) | `read_raw` for the presence of `DefaultValue`; where the constant is used. The value is never read and never written into the risk. | No default (the value comes from the environment), or the value is public by nature (a public key, a URL). Exposed-to-client constants with a secret-looking name are the engine's: do not repeat them. |
| 5 | One key or one account protects many stored secrets or integrations | Where the key is used, what is stored with it, who can read the stored values. | Each use has its own key, or the stored values are not readable by a business role. |
| 6 | A published REST, OData or SOAP service | Authentication, allowed roles, each operation's microflow, what a custom authentication microflow compares. | Authentication required, roles narrow, operations check the caller. |
| 7 | A custom authentication microflow compares text (contains, find, starts-with) or does not check that the account is active and not blocked | The whole microflow and what it returns on a partial match. | Exact comparison of a hashed secret and a check of the account's state. |
| 8 | A file upload entity with no limit on type or size, readable by other roles | The entity's rules and the pages that show the file. | A validation on the type, or the file is only readable by its owner. |

### Privileged roles (tier t2)

| # | Lead | What to read next | What clears it |
|---|---|---|---|
| 9 | A user role may manage all roles, or a list of roles | Which roles are on the list; whether a role on the list is higher than the manager's own. | The role is the application's administrator by evidence. For an administrator write a profile (worth knowing), not a finding. |
| 10 | A service or reporting role holds user management or a module's administration | Why it has it (often a side effect of needing to read an account's name); what the service account can call. | The role holds only the module role its service needs. |

A profile of a privileged role is facts with counts: which roles it can
grant, how many entities it can read in full, write, delete, which
administration pages and services it reaches. No adjectives.

### Business roles: single documents (tier t3)

| # | Lead | What to read next | What clears it |
|---|---|---|---|
| 11 | A flow a business role may call takes an account, a team, a person or another role's object as a parameter and writes, creates or changes roles with it, without comparing it with the current user | The flow and its sub-microflows; the access rules of the entity it writes. A data source flow (`DS_`) that only returns a list is not this lead. | A comparison with the current user or a membership check before the effect; "apply entity access" with rules that already narrow the object. |
| 12 | A helper flow (`SUB_`, or one only microflows call) has allowed roles | What it does when called alone with any object the role can read. With strict mode off the client can call it directly. | No allowed roles; or it only reads and returns what the role may read anyway. |
| 13 | A decision reads an attribute of a non-persistable object, or of an object the role may write, and the effect depends on it | Who sets the attribute and whether the server sets it again before the decision. | The value is read again from the database, or the role cannot write the member. |
| 14 | A flow deletes or changes a record with no decision on the owner and on the state | The entity's access rules, before-delete and before-commit handlers, validation rules. | A handler or rule refuses it; the access rule already limits the role to its own rows in an open state. |
| 15 | A permission condition has a term that does not depend on the caller (`… or $Order/Flag`) | The full expression (`read_raw` when the pack cut it), and who can set the flag. | Every term depends on the caller or on a state the role cannot set. |
| 16 | An entity access rule gives a business role read of all rows (no XPath) on an entity with free text, files or links to people | Strict mode (check 1); the pages and data sources that role reaches; other rules of the same entity for the same role. | Strict mode on and nothing the role reaches lists the rows; the entity holds reference data. |
| 17 | An owner rule gives delete, or write of the content, with no condition on the state | The states the record goes through; what a delete takes with it (check 18). | The rule's XPath limits it to a draft state. |
| 18 | A role may delete a record whose associations delete the children too | `read_raw` on each association's delete behaviour; what the children are (history, time records, files). | The children are kept, or the delete is refused when children exist. |
| 19 | A flow copies protected data into an entity with a wider access rule (a log, a mail, an export, a notification) | The rules of the source and the target entity for the same roles. | The target is as narrow as the source. |
| 20 | A flow sends record content to an external service, or writes personal data into the log | Which fields leave, to where (the constant's name, not its value), whether a role or a setting decides it. Error handlers and log content are partly the engine's: do not repeat its findings. | The fields are not personal or confidential; the call is behind a setting an administrator controls. |
| 21 | A flow that sends mail or a notification takes the sender, the recipient or the text from its parameters | Whether a business role may call it and what the recipient sees as the sender. | The sender is fixed on the server and the recipient list is checked. |
| 22 | A page hides a button or makes an input read-only, and the flow behind it does not check the same state | `risk-levels`, "A condition on a page is a hint, not proof". | The flow or an access rule enforces the same state. |
| 23 | An expression or XPath names a role that does not exist in the project | The project's user roles. | The role exists. A branch for a missing role is dead: it lowers the effect of the flow, it does not raise it. |

### Chains across modules (tier t3)

A chain is not a check on one document. After stage A is complete:

1. List every value a permission depends on: role assignment, team or
   department membership, owner, status, an "is operator / is approver" flag,
   an API account's roles.
2. For each value, list who can write it: access rules that give write on the
   member, and client-callable flows that change it (leads 11–15).
3. A chain exists when a business role can write a value that gives it, or
   someone else, a permission it does not have. Follow it to the effect: what
   the new permission reads, changes or deletes.
4. Write each link as a claim with its element. A chain with an unread link
   is "to verify", naming the link.

## What neither part covers

Java actions, widgets, the running configuration (constants set in the
environment, scheduled events switched on there), data, and platform
behaviour the model does not state. Each belongs on the not-checked list, or
in a risk's "Not confirmed" with its test.
