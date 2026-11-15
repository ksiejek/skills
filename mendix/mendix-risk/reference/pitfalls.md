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

## Writing

| Trap | What it looks like | What to do |
|---|---|---|
| Two causes in one risk | Muting alarms and a service's authentication in one entry | Split: a person decides about each cause on its own |
| The same sentence in two risks | A platform risk repeats a finding's sentence | Keep it in one; the other points to it by id |
| Two sessions write the same risks | The second undoes a person's decision on a level without knowing | One writer; read the server before writing; compare with your copy |
| A correction that is itself wrong | A verifier "fixes" a true sentence | A verifier's disagreement is a claim too: it needs its element and its full read before anything is changed on the server |
