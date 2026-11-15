# Traps that produce false alarms and false all-clears

Every one of these happened in a real review. Apply them in stage C to the
claims they fit.

## What the pack shows wrongly or not at all

| Trap | What it looks like | What to do |
|---|---|---|
| The `access` line of a specialisation with no attributes of its own | "read all · write all" whatever the rule says | Read the rule with `read_raw` (`AccessRules`) before any claim about that entity |
| A long expression is cut | The condition looks complete and ends in "…" | `read_raw` for the full expression; the deciding term is often in the cut part |
| Delete behaviour of associations | Not in the pack | `read_raw` on each association of an entity a role may delete |
| Whether a constant has a default value | Not in the pack | `read_raw`: the key `DefaultValue` is present only when a default is set. The value itself is withheld |
| A Marketplace module that holds application entities (accounts) | Neither its entities nor its flows are in the pack | `list_raw` and `read_raw`; say what you could not read |
| An absent key in `read_raw` | Looks like a failed read | An absent key is the default or empty: no `XPathConstraint` is all rows, no `AllowedRoles` is not callable from the client, no `Events` is no handlers |

## Reading too little

| Trap | What it looks like | What to do |
|---|---|---|
| The check is in a sub-microflow | The top flow looks open | Follow every call to the end before writing "nothing checks" |
| A filtered view of a flow | You looked only for creates and log messages and missed a call that writes a row | Read the flow whole. A denial about a flow ("it only logs") needs every step and every flow it calls |
| A rule assumed by analogy | "The supervisor rule is the same here": that module has no such role | Read the rule of this entity in this module |
| "Every role has it" | A module role held by six of eight business roles | Count the user roles from project security and name them |
| A role named in an expression | The branch looks like an escalation | Check that the role exists in the project; if not, the branch is dead |

## Reading too much into a name or a right

| Trap | What it looks like | What to do |
|---|---|---|
| A constant called Key | "Secret exposed to the client" | Look at what it is used for: a public key is not a secret |
| A flow that "creates an account" | Looks like anyone can make a user | Read which role it gives (does it exist?) and whether the password is returned |
| Delete in an owner rule | Looks like a fault | Drafts need it. The fault is the missing condition on the state |
| User management on a reporting role | Looks like a deliberate grant | It is often switched on so a service can read the account's name. Say it is a side effect and still report the right |
| An engine finding counted as a service call | Import and export mappings listed as "calls a service with no error handler" | A mapping is not a call. Do not build a risk on an engine finding without reading the flow |
| Places raise the level | A filter used in four places of a small table becomes P2 | The level follows the effect, the places go into `where` |

## What an engine lead looks like and is not

Each of these was a lead of MxScout's engine that a review of a real
application found false or harmless. They are the drops of part 1 of
`checks`, as traps.

| Trap | What it looks like | What to do |
|---|---|---|
| A flow without entity access "works on anybody's object" | The role's rule is own rows, the flow has no check | The client can hand a microflow only an object the caller may read. One rule, or the same XPath for reading and writing, means the role passes only what it may change anyway. It is real when the role reads more rows than it may change, or the flow fetches the object itself |
| An account from the client counted as a check | The flow uses `$Account` and looks scoped | An account passed as a parameter is the client's word. Only a comparison with the current user, or a membership read on the server, is a check |
| The page condition decides | "Hidden by state" judged harmless, "hidden by owner" judged serious | What the flow stores decides. A flow that only opens a page is nothing; a flow behind a "state" condition that issues credentials is the worst of its kind |
| A parent by any association | The child is read in full, the "parent" is narrowed | Without delete-with-parent the link is often incidental (an account pointing to its view setting, a category pointing to a board). Read what the child holds |
| An attribute called Key, Token or Password | "Secret readable" | A yes/no flag called IsKey, a hash, the caller's own row and the sample entities of an unused module are not secrets others can read |
| A state that is not a workflow | "Write in every state" | A feature flag or a kind (page type, task type) in an XPath is not a state. Only a workflow enumeration (status, phase) counts |
| A service that finds by key | "Any record by its number" | Between two systems with one service account, finding by key is the purpose. It is a risk when callers are people with a credential each |
| A module role named like a user role | "A non-administrator holds the module's administration" | In a customised Marketplace module a module role is often made for the user role of the same name. Read what it reaches |
| A call with no error handler "goes on" | "The flow continues with half the data" | Without an error handler the flow stops and the transaction is rolled back. That is behaviour to know, not a way in |
| A scheduled event switched off | "The clean-up never runs" | In the cloud a scheduled event is switched on per environment. The model does not say |
| Many leads, one cause | Thirty leads on one module read as thirty problems | Group by cause before judging the size: one missing comparison in a shared sub-microflow is one risk |

## Writing

| Trap | What it looks like | What to do |
|---|---|---|
| Two causes in one risk | Muting alarms and a service's authentication in one entry | Split: a person decides about each cause on its own |
| The same sentence in two risks | A platform risk repeats a finding's sentence | Keep it in one; the other points to it by id |
| Two sessions write the same risks | The second undoes a person's decision on a level without knowing | One writer; read the server before writing; compare with your copy |
| A correction that is itself wrong | A verifier "fixes" a true sentence | A verifier's disagreement is a claim too: it needs its element and its full read before anything is changed on the server |
