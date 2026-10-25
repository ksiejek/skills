# Building standards for Mendix

<!-- Made by tools/build-standards.js from standards.json — edit that file, then run the script. -->

What MxScout finds wrong in a Mendix model, turned into how to build it right. Every security check MxScout runs (public/secrisks.js, and the mendix-describe skill's check-security.js, which runs the same file) has one entry here, under the check's own id: the risks it reports carry that id in theirs ('mx-' + the check's id + '-' + what it is about). Each entry says what is wrong, the standard to build by, how to fix a model that already has it, Mendix's own code where Mendix has one, and where it comes from. Two more parts hold standards no check of MxScout's reaches: what an agent judges by the risk levels (risk-levels.md), and Mendix's naming conventions. Edit standards.json; standards.md is made from it by tools/build-standards.js, and the test suite fails when a check has no entry here.

**How to use it.** Refining a story that changes the model: name the standards it touches by id (for example 'anon', 'scope-write', 'conv-microflow-prefix'), and build to them. Fixing a risk MxScout reported: the part of its id after 'mx-' and before the subject is the entry to read.

Three parts: **Checked by MxScout** (29 standards, one per check, under the check’s id), **Judged by an agent** (12, no check) and **Conventions** (7, no check).

## Checked by MxScout

| Id | Check | Level | OWASP | Mendix |
|---|---|---|---|---|
| `security-level` | Security level | P1, P2 | LCNC-SEC-05 | — |
| `demo-password` | Demo user password | P2 | LCNC-SEC-04 | — |
| `role-no-module-role` | User role without module roles | P2 | LCNC-SEC-05 | — |
| `strict-mode-off` | Strict mode | P3 | LCNC-SEC-05 | — |
| `page-url-check` | Page URL check | P3 | LCNC-SEC-05 | — |
| `role-manages-all` | User role that manages every role | P3 | LCNC-SEC-02 | — |
| `service-open` | Published service with nothing in front of it | P3 | LCNC-SEC-04 | — |
| `anon` | Anonymous role (Mendix MXS003–MXS010) | P1, P3 | LCNC-SEC-02 | MXS003–MXS010 |
| `selfreg` | Self-registration | P1, P2, P3 | LCNC-SEC-01 | — |
| `accounts` | User accounts | P1, P2, P3 | LCNC-SEC-01 | — |
| `guard-page-hides` | Hidden on the page, not checked in the flow | P1, P2 | LCNC-SEC-02 | — |
| `guard-bypass-xpath` | Microflow retrieves past the role’s XPath | P1, P2 | LCNC-SEC-02 | — |
| `guard-same-entity` | Two objects of the same entity from the client | P3 | LCNC-SEC-02 | — |
| `scope-write` | Written wider than edited | P1, P2 | LCNC-SEC-02 | — |
| `scope-delete` | Deleted wider than the Delete buttons | P1, P2 | LCNC-SEC-02 | — |
| `scope-note` | Write scope | P3 | LCNC-SEC-02 | — |
| `access-wider` | Reads every row, sees fewer | P3 | LCNC-SEC-03 | — |
| `access-unused` | Granted, never used | P3 | LCNC-SEC-02 | — |
| `access-unwritten` | May write, nothing writes | P3 | LCNC-SEC-02 | — |
| `access-fails` | May run it, may not do what it does | P2 | LCNC-SEC-05 | — |
| `access-finds-nothing` | May run it, finds nothing | P3 | LCNC-SEC-05 | — |
| `access-past` | Does for a role what its rules do not allow | P3 | LCNC-SEC-02 | — |
| `access-rule` | Access rule MxScout cannot follow | — | LCNC-SEC-02 | — |
| `secret-constant` | Constant the browser receives that looks like a secret | P1, P2 | LCNC-SEC-08 | — |
| `constant-note` | Constants | P3 | LCNC-SEC-08 | — |
| `advisory` | Known security advisory | P3 | LCNC-SEC-07 | — |
| `market-admin` | Administrative role of a Marketplace module on a user role | P2 | LCNC-SEC-02 | — |
| `market-unused` | Marketplace module the app does not use | P3 | LCNC-SEC-07 | — |
| `market-role-unused` | Marketplace module role that grants nothing | P3 | LCNC-SEC-02 | — |

### `security-level` — Security level

*finding · P1 or P2 · access · LCNC-SEC-05 · no Mendix code · risk id `mx-security-level-<security level>`*

**What is wrong.** Security is Off or Prototype / demo: with Off the running app enforces no rule at all, with Prototype / demo it does not check entity access.

**Build it this way.** Build with the security level set to Production from the first sprint: every entity has access rules, every page, microflow and nanoflow names the module roles allowed to use it, and Studio Pro's consistency check shows no security errors.

**Fix an existing model.** In App Security set Security level to Production, then work through the consistency errors Studio Pro lists: access rules on each entity, allowed module roles on each page, microflow and nanoflow.

**Source.** [App Security](https://docs.mendix.com/refguide/app-security/) · MxScout `public/secrisks.js`

### `demo-password` — Demo user password

*finding · P2 · secrets · LCNC-SEC-04 · no Mendix code · risk id `mx-demo-password-<user name>`*

**What is wrong.** A demo user's password is weak: shorter than the project's password policy, a common password, or the same as the user name.

**Build it this way.** Use demo users only to try the user roles out in development, give each a password that meets the project's password policy, and switch demo users off before the app reaches an environment other people use.

**Fix an existing model.** In App Security, Demo users, give the user a strong password or switch demo users off. Switching them off does not remove their accounts from the database: delete those in every environment where they were created.

**Source.** [Demo Users](https://docs.mendix.com/refguide/demo-users/) · MxScout `public/secrisks.js`

### `role-no-module-role` — User role without module roles

*finding · P2 · access · LCNC-SEC-05 · no Mendix code · risk id `mx-role-no-module-role-<user role>`*

**What is wrong.** A user role carries no module role: somebody given it can sign in and reach nothing.

**Build it this way.** A user role is a job; it combines at least one module role, and each module role says what that job may do in one module.

**Fix an existing model.** In App Security, User roles, add the module roles the job needs, or delete the user role if nobody is meant to hold it.

**Source.** [User Roles](https://docs.mendix.com/refguide/user-roles/) · MxScout `public/secrisks.js`

### `strict-mode-off` — Strict mode

*worth knowing · P3 · access · LCNC-SEC-05 · no Mendix code · risk id `mx-strict-mode-off-project`*

**What is wrong.** Strict mode is off: the browser can do more than the app's own pages and flows do when an access rule is set up too wide.

**Build it this way.** Build with strict mode on in App Security (React client), as a second line behind the access rules, never instead of them; design pages so they fetch only what they define.

**Fix an existing model.** Switch strict mode on in App Security, after checking that the pages fetch only what they define.

**Source.** [Strict Mode](https://docs.mendix.com/refguide/strict-mode/) · [App Security](https://docs.mendix.com/refguide/app-security/) · MxScout `public/secrisks.js`

### `page-url-check` — Page URL check

*worth knowing · P3 · access · LCNC-SEC-05 · no Mendix code · risk id `mx-page-url-check-project`*

**What is wrong.** Strict page URL checking is off: the security of a page reachable only by its URL is not checked by Studio Pro.

**Build it this way.** Keep Strict page URL checking on in App Security, so Studio Pro's consistency check also checks the pages that are reachable only through their page URL.

**Fix an existing model.** Switch Strict page URL checking on in App Security and work through the consistency errors it adds.

**Source.** [App Security: Strict Page URL Checking](https://docs.mendix.com/refguide/app-security/) · MxScout `public/secrisks.js`

### `role-manages-all` — User role that manages every role

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-role-manages-all-<user role>`*

**What is wrong.** A user role can assign every other user role, including roles above its own.

**Build it this way.** Give User management only to the user roles that administer accounts, and name the user roles each may manage instead of all of them; no role manages a role with more rights than its own.

**Fix an existing model.** In App Security, User roles, open the role's User management and select only the user roles it is meant to hand out.

**Source.** [User Roles](https://docs.mendix.com/refguide/user-roles/) · MxScout `public/secrisks.js`

### `service-open` — Published service with nothing in front of it

*worth knowing · P3 · access · LCNC-SEC-04 · no Mendix code · risk id `mx-service-open-<service>`*

**What is wrong.** A published REST, OData or web service has no list of allowed module roles and no authentication.

**Build it this way.** Every published REST, OData and web service has authentication and names the module roles allowed to call it; a service meant for anyone is published for the anonymous role on purpose, and gives it only what it publishes.

**Fix an existing model.** In the published service's Security settings choose the authentication it needs and select the allowed module roles.

**Source.** [Published REST Service](https://docs.mendix.com/refguide/published-rest-service/) · [Published OData Services](https://docs.mendix.com/refguide/published-odata-services/) · [Published Web Services](https://docs.mendix.com/refguide/published-web-services/) · MxScout `public/secrisks.js`

### `anon` — Anonymous role (Mendix MXS003–MXS010)

*finding or worth knowing · P1 or P3 · access · LCNC-SEC-02 · Mendix MXS003, MXS004, MXS005, MXS006, MXS007, MXS008, MXS009, MXS010 · risk id `mx-anon-<code>-<entity or role>`*

**What is wrong.** Anonymous visitors, who never sign in, get more than a visitor needs: sensitive entities, write access, user management, the administrator's role or Administration's module roles, or every row of an entity.

**Build it this way.** Allow anonymous users only when the app has content for people who do not sign in. Give them a user role of their own (Mendix names it Anonymous), with module roles made for anonymous use alone, read access constrained by XPath, no write on persistable entities and no user management; take a visitor's input in a non-persistable entity and check it in a microflow before anything is stored.

**Fix an existing model.** Work through the codes below in App Security and on the access rules of the entities named; if the app has no use for anonymous users, set Allow anonymous users to No.

- **MXS003** Disable anonymous users — Allow anonymous users = No, unless the app is meant to be used without signing in.
- **MXS004** Avoid granting anonymous users access to sensitive entities — No access rule for an anonymous module role on an entity that inherits from System (System.User, System.FileDocument and their specializations).
- **MXS005** Do not use the administrator user role for anonymous access — The anonymous user role is never the administrator's user role.
- **MXS006** Avoid granting anonymous users write access to persistable entities — No create, write or delete for an anonymous module role on a persistable entity.
- **MXS007** Do not let anonymous users manage user roles — The anonymous user role has nothing under User management.
- **MXS008** Do not share module roles between anonymous and other user roles — A module role the anonymous user role carries belongs to no other user role.
- **MXS009** Do not map Administration module roles to the anonymous user role — The anonymous user role carries no module role of the Administration module.
- **MXS010** Constrain the read access of anonymous users — Every read rule for an anonymous module role has an XPath that limits the rows to what a visitor may see.

**Source.** [Security Recommendations (Best Practice Recommender)](https://docs.mendix.com/refguide/security-best-practices/) · [Anonymous Users](https://docs.mendix.com/refguide/anonymous-users/) · MxScout `public/anonrole.js`

### `selfreg` — Self-registration

*finding or worth knowing · P1 or P2 or P3 · access · LCNC-SEC-01 · no Mendix code · risk id `mx-selfreg-<flow>-<role or constant>`*

**What is wrong.** A way to register without signing in (a microflow the anonymous role may run, or a REST operation with no authentication) creates an account with a user role that is administrative, manages other roles, or reads account or personal data without an XPath.

**Build it this way.** A self-registration flow gives a newcomer one fixed user role, named in the flow, with the least the newcomer needs; never a role taken from the request or decided by a constant, and the role reads personal and account data only through an XPath to [%CurrentUser%].

**Fix an existing model.** Give the role the registration flow hands out only what a newcomer needs, and keep personal and account data behind an XPath to [%CurrentUser%].

**Source.** [Anonymous Users](https://docs.mendix.com/refguide/anonymous-users/) · [Access Rules](https://docs.mendix.com/refguide/access-rules/) · MxScout `public/selfreg.js`

### `accounts` — User accounts

*finding or worth knowing · P1 or P2 or P3 · access · LCNC-SEC-01 · no Mendix code · risk id `mx-accounts-<kind>-<user role>-<entity>`*

**What is wrong.** A user role changes other people's accounts, hands out user roles without User management, changes other people's names or e-mail, or reads other people's personal fields.

**Build it this way.** Account data (System.User and its specializations, such as Administration.Account: name, e-mail, password, active, blocked, user roles) is changed only through User management in App Security, or by a role whose access rule keeps it to its own account with an XPath to [%CurrentUser%]; other people's personal fields are readable only by the roles that need them.

**Fix an existing model.** Take write access on the account's fields off the access rule for that role, or constrain the rule with an XPath to [%CurrentUser%]; give account administration to a role with User management of only the roles it may hand out.

**Source.** [User Roles](https://docs.mendix.com/refguide/user-roles/) · [Access Rules](https://docs.mendix.com/refguide/access-rules/) · MxScout `public/accounts.js`

### `guard-page-hides` — Hidden on the page, not checked in the flow

*finding or to verify · P1 or P2 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-guard-page-hides-<microflow>`*

**What is wrong.** A page hides or disables a button by a condition (the object's state, its owner), and the microflow behind the button does not check that condition: anyone allowed to run the microflow can call it directly. MxScout ranks it P1 only when the model proves the scenario: the condition is a state the role cannot set itself (an enumeration or a boolean, read-only for the role or changed only behind a check of its own value) or an owner it can read past, and a stored step is unchecked with nothing in front of it that MxScout cannot read — a rule, a Java action, a before-commit microflow that may refuse it. Every way in to the same operation is weighed together: when the same role is offered the microflow on another page, or the very change on a form, without the condition, it is to verify. Otherwise it is to verify (P2), with what to look at: a page's condition is a hint, not proof.

**Build it this way.** Every microflow a role may call checks, with a decision at its start, the same condition its page uses to hide, disable or make read-only the button that runs it; what a page shows is convenience, the microflow and the access rules are the security.

**Fix an existing model.** Add a decision at the start of the microflow that checks the same condition the page uses to hide the button, and end the flow when it does not hold.

**Source.** [Microflows](https://docs.mendix.com/refguide/microflow/) · [Implementing Best Practices for App Security](https://docs.mendix.com/howto/security/best-practices-security/) · MxScout `public/guards.js`

### `guard-bypass-xpath` — Microflow retrieves past the role’s XPath

*finding or to verify · P1 or P2 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-guard-bypass-xpath-<microflow>`*

**What is wrong.** A microflow that does not apply entity access retrieves objects the role's own access rule keeps from it, and returns them to that role. P1 only when the model shows where the rows go — returned to the caller, shown on a page, changed and committed, or deleted; a retrieve whose rows go nowhere a person sees, or a return the model does not show, is to verify (P2): Apply entity access off alone is not a finding.

**Build it this way.** A microflow a role may call either applies entity access, or gives every Retrieve the XPath of the role's own access rule; it never hands the client objects its role could not retrieve itself.

**Fix an existing model.** Give the Retrieve in the microflow the XPath of the role's own access rule, or let the microflow apply entity access.

**Source.** [Retrieve](https://docs.mendix.com/refguide/retrieve/) · [XPath Constraints](https://docs.mendix.com/refguide/xpath-constraints/) · MxScout `public/guards.js`

### `guard-same-entity` — Two objects of the same entity from the client

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-guard-same-entity-<microflow>`*

**What is wrong.** A microflow takes two objects of the same entity from the client and changes one of them, without checking that they belong together.

**Build it this way.** When a microflow takes more than one object from the client, it checks that they belong together (the same owner, or one associated to the other) before it changes either.

**Fix an existing model.** Check in the microflow that the two objects belong together, the same owner or one associated to the other, before it changes either.

**Source.** [Microflows](https://docs.mendix.com/refguide/microflow/) · MxScout `public/guards.js`

### `scope-write` — Written wider than edited

*finding or to verify · P1 or P2 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-scope-write-<entity>`*

**What is wrong.** An access rule lets a role change an attribute in every state of the object, while every page and microflow that role uses edits it only in some states. P1 only when at least one state attribute is an enumeration or a boolean the role cannot set itself (read-only for it, or changed only behind a check of its own value) and no before-commit microflow may refuse the write; a setting the role may write, a String only its name calls a status, or a commit check MxScout cannot read makes it to verify (P2).

**Build it this way.** When an object may be edited only in some states (a Status enumeration, a Submitted boolean), the role gets two access rules: one that reads every state, and one with the write rights whose XPath names the editable states, such as [Status = 'Draft']. Or the write right is left off and a microflow makes the change after checking the state.

**Fix an existing model.** Move the write rights into an access rule whose XPath names the states the pages edit in, or take the write right off and let a microflow that checks the state make the change.

**Source.** [Access Rules](https://docs.mendix.com/refguide/access-rules/) · [XPath Constraints](https://docs.mendix.com/refguide/xpath-constraints/) · MxScout `public/editscope.js`

### `scope-delete` — Deleted wider than the Delete buttons

*finding or to verify · P1 or P2 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-scope-delete-<entity>`*

**What is wrong.** An access rule lets a role delete an object in every state, while every Delete button and microflow the role uses deletes it only in some. P1 only when at least one state attribute is an enumeration or a boolean the role cannot set itself and no before-delete microflow may refuse the delete; otherwise it is to verify (P2).

**Build it this way.** Allow delete only in an access rule whose XPath names the states a Delete button or microflow exists for, or leave delete off and let a microflow that checks the state delete the object.

**Fix an existing model.** Move Allow delete into an access rule whose XPath names the states the Delete buttons work in, or take it off and delete through a microflow that checks the state.

**Source.** [Access Rules](https://docs.mendix.com/refguide/access-rules/) · MxScout `public/editscope.js`

### `scope-note` — Write scope

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-scope-note-<kind>-<microflow>`*

**What is wrong.** Worth knowing: one before-commit microflow guards several entities, or a role holds create rights nothing it reaches uses.

**Build it this way.** Grant create only to the module roles whose pages or microflows create the object; a before-commit event that refuses a change counts as a guard only when it checks the same state the pages do.

**Fix an existing model.** Take the create right off the rules where nothing the role reaches creates; check that the shared before-commit microflow refuses what the pages do not allow, or name the state in the access rule.

**Source.** [Access Rules](https://docs.mendix.com/refguide/access-rules/) · [Event Handlers](https://docs.mendix.com/refguide/event-handlers/) · MxScout `public/editscope.js`

### `access-wider` — Reads every row, sees fewer

*worth knowing · P3 · access · LCNC-SEC-03 · no Mendix code · risk id `mx-access-wider-model`*

**What is wrong.** A read access rule has no XPath, while nothing the role reaches lists every row: a page is not a security boundary, the rule is what the client may fetch.

**Build it this way.** Every read access rule carries the XPath its pages narrow by, such as [System.owner = '[%CurrentUser%]'] or a path to the current user's account; a rule with no XPath is a decision that every row may be read.

**Fix an existing model.** Give each read rule the XPath its pages narrow by, or confirm that every row may be read.

**Source.** [Access Rules](https://docs.mendix.com/refguide/access-rules/) · [XPath Constraints](https://docs.mendix.com/refguide/xpath-constraints/) · MxScout `public/accessuse.js`

### `access-unused` — Granted, never used

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-access-unused-model`*

**What is wrong.** A module role holds an access rule on an entity that nothing the role reaches shows, reads, takes or returns.

**Build it this way.** Give a module role an access rule only on the entities its pages, microflows, nanoflows and published services use.

**Fix an existing model.** Take the rule off the module role, unless a Java action or a published service needs it.

**Source.** [Module Security](https://docs.mendix.com/refguide/module-security/) · MxScout `public/accessuse.js`

### `access-unwritten` — May write, nothing writes

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-access-unwritten-model`*

**What is wrong.** A module role may write, create or delete an entity, and no input on its pages, no New or Delete button and no flow that runs with its rights does.

**Build it this way.** Give write, create and delete only where a page, a button or a flow the role runs uses them; read-only is the default.

**Fix an existing model.** Take the unused write, create and delete rights off the rule.

**Source.** [Access Rules](https://docs.mendix.com/refguide/access-rules/) · MxScout `public/accessuse.js`

### `access-fails` — May run it, may not do what it does

*finding · P2 · logic · LCNC-SEC-05 · no Mendix code · risk id `mx-access-fails-<flow>`*

**What is wrong.** A microflow or nanoflow a role may run changes, creates or deletes an entity the role has no right on, so it fails for that role.

**Build it this way.** What a role may run, it can complete: a nanoflow, and a microflow that applies entity access, need the role's rights on everything they change; a microflow that must do more than the role may runs without entity access and checks the caller itself.

**Fix an existing model.** Give the roles that may run the flow the access it needs, or stop offering it to them.

**Source.** [Microflows](https://docs.mendix.com/refguide/microflow/) · [Module Security](https://docs.mendix.com/refguide/module-security/) · MxScout `public/accessuse.js`

### `access-finds-nothing` — May run it, finds nothing

*worth knowing · P3 · access · LCNC-SEC-05 · no Mendix code · risk id `mx-access-finds-nothing-model`*

**What is wrong.** A flow a role may run reads an entity that role cannot read, so it finds nothing for that role.

**Build it this way.** The module roles allowed to run a flow can read what the flow retrieves, or the flow is not offered to them.

**Fix an existing model.** Give the role read access, or stop offering the flow to it.

**Source.** [Module Security](https://docs.mendix.com/refguide/module-security/) · MxScout `public/accessuse.js`

### `access-past` — Does for a role what its rules do not allow

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-access-past-model`*

**What is wrong.** Worth knowing: a microflow does for a role what the role's own access rules do not allow.

**Build it this way.** A microflow that does for a role what its access rules do not allow is the one controlled way to do it: it checks who calls it and the object's state, and its documentation says why it runs past the rules.

**Fix an existing model.** Nothing, if each is the controlled way to let the role do it; otherwise give it the decisions that check the caller and the state.

**Source.** [Microflows](https://docs.mendix.com/refguide/microflow/) · MxScout `public/accessuse.js`

### `access-rule` — Access rule MxScout cannot follow

*not checked · access · LCNC-SEC-02 · no Mendix code · not a risk: said as not checked*

**What is wrong.** An access rule's XPath goes through the System module and keeps going: MxScout cannot follow it, so the rule is said to be not checked, not to be wrong.

**Build it this way.** Keep access rule XPaths readable: to the current user through [%CurrentUser%] or System.owner, and otherwise through associations of the app's own modules, not through System members and beyond.

**Fix an existing model.** Nothing is wrong by this alone: check the rule in the running app as each role, or rewrite the path through an association of the app's own.

**Source.** [XPath Constraints](https://docs.mendix.com/refguide/xpath-constraints/) · MxScout `public/accessrule.js`

### `secret-constant` — Constant the browser receives that looks like a secret

*finding or to verify · P1 or P2 · secrets · LCNC-SEC-08 · no Mendix code · risk id `mx-secret-constant-<module-constant>`, triage key `m:secrets:<Module.Constant>`*

**What is wrong.** A constant with Expose to client on has a name or a default value that looks like a key, a password or a token: every browser of the app receives its value. P1 when its default value looks like a secret (or its name is itself shaped like a key); one only its name calls a secret is to verify (P2) — what value an environment gives it is not in the model.

**Build it this way.** A secret (an API key, a password, a token, a client secret) is never in a constant with Expose to client, and never a default value in the model: it is in a constant that is not exposed, with no default, set per environment, and read only in microflows.

**Fix an existing model.** Switch Expose to client off and empty the default value; set the value in each environment. If the value ever was in the model or reached a browser, replace the secret at its issuer.

**Source.** [Constants](https://docs.mendix.com/refguide/constants/) · MxScout `public/constants.js`

### `constant-note` — Constants

*worth knowing · P3 · secrets · LCNC-SEC-08 · no Mendix code · risk id `mx-constant-note-<kind>-<constant>`*

**What is wrong.** Worth knowing: a constant the browser receives has a default value kept in the model, or a name that is itself a key.

**Build it this way.** A constant's default value is what a developer runs with locally, never a value of a real environment; each environment sets its own, and a constant's name says what it is, never holds a value.

**Fix an existing model.** Empty the default value and set it per environment; rename a constant whose name is a key, and replace that key at its issuer.

**Source.** [Constants](https://docs.mendix.com/refguide/constants/) · MxScout `public/constants.js`

### `advisory` — Known security advisory

*worth knowing · P3 · access · LCNC-SEC-07 · no Mendix code · risk id `mx-advisory-<cve>-<component>`*

**What is wrong.** Worth knowing: the Mendix version or a Marketplace module is in the range a published security advisory names.

**Build it this way.** Keep the Mendix version on a supported patch release and every Marketplace module at a version past each advisory that names it; read the security advisories when upgrading or adding a module.

**Fix an existing model.** Upgrade the Mendix version or the module to the version the advisory names as fixed.

**Source.** [Security Advisories](https://docs.mendix.com/releasenotes/security-advisories/) · [Siemens ProductCERT](https://cert-portal.siemens.com/productcert/) · MxScout `public/advisories.js`

### `market-admin` — Administrative role of a Marketplace module on a user role

*finding or to verify · P2 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-market-admin-<module role>-<user role>`*

**What is wrong.** A user role that is not the application’s administrator carries the administrative module role of a Marketplace module, so everybody given it may configure the module, run its imports or manage its data. A role only its name calls administrative (Admin, Manager), that holds no right, flow or page in the module, is to verify (P2): the catalogue or what the role may do decides, not its name.

**Build it this way.** Give a Marketplace module’s administrative module role only to the administrator’s user role, or to a user role made for the few people who run that module; an ordinary user role carries only the module roles it needs.

**Fix an existing model.** In App Security, User roles, take the module role off that user role, and give it to the administrator or to a dedicated user role.

**Source.** [User Roles](https://docs.mendix.com/refguide/user-roles/) · [Module Security](https://docs.mendix.com/refguide/module-security/) · MxScout `public/marketplace.js`

### `market-unused` — Marketplace module the app does not use

*worth knowing · P3 · access · LCNC-SEC-07 · no Mendix code · risk id `mx-market-unused-<module>`*

**What is wrong.** Worth knowing: a Marketplace module is installed and nothing of the app’s own calls its flows, shows its pages or uses its entities.

**Build it this way.** Install only the Marketplace modules the app uses, and remove a module once nothing uses it any more; a module that stays is kept at a supported version.

**Fix an existing model.** Delete the module in App Explorer after checking that nothing outside the model needs it; deleting a module deletes its data.

**Source.** [Implement Best Practices for App Security](https://docs.mendix.com/howto/security/best-practices-security/) · [Using Marketplace Content](https://docs.mendix.com/appstore/use-content/) · MxScout `public/marketplace.js`

### `market-role-unused` — Marketplace module role that grants nothing

*worth knowing · P3 · access · LCNC-SEC-02 · no Mendix code · risk id `mx-market-role-unused-<module role>`*

**What is wrong.** Worth knowing: user roles carry a module role of a Marketplace module that no access rule, flow, page or published service of the module names.

**Build it this way.** A user role carries only the module roles that give it something it needs.

**Fix an existing model.** In App Security, take the module role off those user roles, unless a newer version of the module needs it.

**Source.** [User Roles](https://docs.mendix.com/refguide/user-roles/) · MxScout `public/marketplace.js`

## Judged by an agent — no check

What a rule cannot see, an agent judges by `risk-levels.md`; the standard to build by is the same kind of sentence. No check of MxScout’s reports these.

### `judged-evidence` — A risk with its evidence

*no check · P1 or P2 or P3 · access*

A risk is ranked by what the model proves, not by what it suggests. A P1 names who can do what, what in the model shows it (the access rule, the flow, the missing check) and what follows; a missing check, a write, or Apply entity access off is a lead, not a P1, until the scenario is shown. A visibility or editability condition says what a page offers, not what a role may not do: tell a permission, an owner or a state the application keeps from a setting the role switches itself, without exceptions by role name, by Marketplace module or by attribute name. What the model suggests and does not prove is 'To verify: …', at most P2, with what to look at; that nothing proves a problem never proves it safe.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-secret-in-model` — A secret written into the model

*no check · P1 · secrets*

No password, token or API key is a constant's default value or a literal in an expression; secrets are set per environment.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-delete-checked` — Delete or bulk change with no check

*no check · P1 · delete*

A microflow that deletes or changes many objects checks who may do it and what the objects belong to before it starts, and deletes only what it was meant for.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-error-handler` — Service call with no error handler

*no check · P2 · silent*

Every call to a REST, OData or web service has a custom error handler that logs the error and ends the flow in a known way, telling the user when one waits; no call is left to fail silently.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-commit-in-loop` — Commit inside a loop

*no check · P2 · loops*

Inside a loop, change objects and add them to a list; commit the list once, after the loop.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-validate-in-flow` — Validated on the page only

*no check · P2 · logic*

What a page validates is validated again in the microflow that saves the object, in a VAL_ sub-microflow both can use.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-scheduled-event` — Depends on a switched-off scheduled event

*no check · P2 · schedule*

A process that depends on a scheduled event says so in the event's documentation, and whether the event runs is set and checked per environment.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-hardcoded` — Values written into flows

*no check · P3 · hardcoded*

A value that differs per environment or is a business rule (a URL, a limit, a rate) is a constant or a configuration entity, not a literal in a flow.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-dead-code` — Unused or duplicated

*no check · P3 · dead*

Flows and pages nothing reaches are deleted, not kept as _New, _Old or copies; disabled activities are removed from a flow before it is committed.

**Source.** MxScout `skills/mendix-describe/reference/risk-levels.md`

### `judged-retrieve-range` — Whole list retrieved for one object or a count

*no check · P3 · performance*

A database retrieve whose list is used only for its first element (head(), a Head list operation) or only for count() in an expression loads every row to keep one or a number. Retrieve with Range First for one object, Custom with limit 2 to check that there is exactly one, and Aggregate list right after the retrieve for a count (one COUNT query).

**Source.** 

### `judged-flow-size` — Microflow too large to read

*no check · P3 · logic*

A microflow keeps to 25 activities or fewer; a larger one is split into sub-microflows (validation and data-copy flows may be longer). One with more than 10 activities or more than 2 decisions starts with an annotation saying its purpose, parameters and result.

**Source.** 

### `judged-invented-prefix` — Name with a prefix no standard has

*no check · P3 · naming*

A document's prefix comes from how it is used (conv-microflow-prefix, conv-other-prefix) or from the project's own naming standard, which wins over Mendix's. A prefix neither defines (for example SEED_ for a start-up data seed, which is ASU_ or SUB_) is a finding; so is a document the project standard gives a prefix (for example CONST_) that does not carry it.

**Source.** 

## Conventions — no check

Mendix’s own naming and structure conventions. No check of MxScout’s reports them; a refinement names them like any other standard.

### `conv-module-name` — Modules and module roles

*no check*

A module is named in UpperCamelCase after its responsibility (CustomerManagement, SharePointIntegration) and works as a replaceable service; module roles are named in English after the access they give (Administrator, Employee).

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)

### `conv-entity-name` — Entities and attributes

*no check*

An entity is named in the singular, in PascalCase, without abbreviations or underscores (Customer, LogEntry); attributes in PascalCase (FirstName); an attribute kept only for technical reasons starts with an underscore (_Imported).

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)

### `conv-association-name` — Associations

*no check*

Keep the association name Studio Pro generates (Order_Customer); when two entities have more than one association, extend each name with its purpose (Person_Address_Delivery).

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)

### `conv-folders` — Folders

*no check*

Documents are grouped in folders by process and its steps, and by entity for what belongs to one entity (its overview pages, validation and event microflows); folder names are unique and say what is in them.

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)

### `conv-microflow-prefix` — Microflow names and prefixes

*no check*

A microflow is named {PREFIX}_{Entity}_{Operation} (ACT_Vendor_StartWorkflow): ACT_ for a button or menu item, SUB_ for a sub-microflow, DS_ for a data source, VAL_ for validation, OCH_ / OEN_ / OLE_ for on change, enter and leave, BCO_ / ACO_ / BCR_ / ACR_ / BDE_ / ADE_ / BRO_ / ARO_ for entity events, CAL_ for a calculated attribute, SCE_ for a scheduled event, ASU_ / BSD_ / HCH_ for what after startup, before shutdown and the health check call, CWS_ / CRS_ / PWS_ / PRS_ / POS_ for integrations, WFA_ / WFS_ / WFC_ for workflows, TEST_ or UT_ for unit tests; a microflow that fits none has no prefix.

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)

### `conv-page-suffix` — Page names

*no check*

A page ends in its purpose: _Overview, _New, _Edit, _NewEdit, _View, _Select, _MultiSelect, _Tooltip, _Workflow; home pages are Home_Desktop_Default or Home_Desktop_{User role} (and _Tablet_, _Phone_).

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)

### `conv-other-prefix` — Other documents

*no check*

Enumerations start with ENUM_ (ENUM_ShippingStatus), snippets with SNIP_, layouts with their device (Responsive_, Phone_, Popup_ …), and integration documents with IMM_, EXM_, XSD_ and JSON_.

**Source.** [Naming Convention Best Practices](https://docs.mendix.com/refguide/naming-convention-best-practices/)
