# The catalogue of leads

Run every check over the fact sheet of stage A. A hit is a **lead**, not a
risk: one line with the check number, the element and the fact. Stage B reads
"what to read next" and decides; "what clears it" is what stage C looks for.

Names in the examples are invented (`Sales.Order`).

## Project and platform (tier t1)

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

## Privileged roles (tier t2)

| # | Lead | What to read next | What clears it |
|---|---|---|---|
| 9 | A user role may manage all roles, or a list of roles | Which roles are on the list; whether a role on the list is higher than the manager's own. | The role is the application's administrator by evidence. For an administrator write a profile (worth knowing), not a finding. |
| 10 | A service or reporting role holds user management or a module's administration | Why it has it (often a side effect of needing to read an account's name); what the service account can call. | The role holds only the module role its service needs. |

A profile of a privileged role is facts with counts: which roles it can
grant, how many entities it can read in full, write, delete, which
administration pages and services it reaches. No adjectives.

## Business roles: single documents (tier t3)

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

## Chains across modules (tier t3)

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

## What these checks do not cover

Java actions, widgets, the running configuration (constants set in the
environment, scheduled events switched on there), data, and platform
behaviour the model does not state. Each belongs on the not-checked list, or
in a risk's "Not confirmed" with its test.
