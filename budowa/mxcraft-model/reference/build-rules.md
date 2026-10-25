# Build rules — what every microflow, entity and page written from a session follows

From Mendix's own guides (read 2026-10-25): App setup, General best practices, Community best
practices for app performance, Security best practices — and MxScout's performance checks
(`MxScout/public/perfrisks.js`, ids `mx-perf-*`). Anything here that MxScout flags is marked
**[perf-…]**: if you write it, MxScout will report it on the next scan.

Check the plan of every new or changed microflow against this list *before* writing the spec,
and the result *after* (one `doc` read). A rule broken on purpose gets one line in the ticket.

## 0. One standard with MxScout (Craft ↔ Scout)

Writing must be at least as good as checking. MxScout's standard is the shared one:
`~/Projects/Skills/mendix/mendix-describe/reference/standards.md` — one entry per MxScout check
(`mx-<check>-…`), plus what an agent judges (`judged-*`) and Mendix naming (`conv-*`). Read the entries
for what you are about to build. Developing Scout develops Craft and the other way round:

- a new MxScout check → its standards.md entry → Craft follows it from the next build;
- a Craft lesson MxScout cannot check yet → a proposal (ticket) for MxScout.

Craft keeps what Scout knows here, so you follow it while writing — no MxScout run after each story
(the CRAFT-2 audit was a one-off, Karol 2026-10-25). Before writing a document, name the standards it touches.

## 1. Retrieves

1. **One object → retrieve `Range: First`, never all + `head()`.** `head($List)` after a
   database retrieve loads every row to keep one. In the spec: `"Range": {"$Type":
   "Microflows$ConstantRange", "SingleObject": true}` (Studio Pro: "First"). Same for
   "does any exist?": retrieve First + `!= empty`, not `count() > 0` on a full list.
   "Exactly one?" (ambiguity check): `Range: Custom`, limit `2`, then `head()` + Find the other —
   never all rows. (ServiceDesk SD-39 did all + `head()` twice; fixed 2026-10-25.)
2. **Count/sum → retrieve + Aggregate list right after it, list used nowhere else.** The runtime
   then sends one `SELECT COUNT(*)`. If the list is used later too, it loads all rows — retrieve
   again later instead.
3. **Over an association, not the database, when the object is in memory.** Association
   retrieve returns the in-memory state (uncommitted changes included) and costs no query when
   already loaded. Database retrieve only when the stored value is needed.
4. **Pass objects and lists as parameters** instead of retrieving them again in a sub-microflow.
5. **Never a database retrieve inside a loop [perf-retrieve-in-loop].** Retrieve the whole set
   before the loop (one XPath with `[Assoc = $Parent]` or an `id` list), then *Find* /
   *Filter* list operations inside. A sub-microflow called in the loop that retrieves counts
   the same **[perf-call-in-loop]**.
6. **A count per item in a loop → aggregate before the loop or a view entity (grouped OQL)
   [perf-view-entity].**
7. Sort and limit in the retrieve (Sorting, `Range: Custom` with limit/offset), not with list
   operations afterwards. Large sets: batches of 500–2000 with offset.

## 2. XPath

1. Positive comparisons: `[Active = true()]` not `[not(Active = false())]`, `[Status = 'A' or
   Status = 'B']` not `[Status != 'C']`.
2. Join paths to the same entity in one bracket: `[A_B/B[X = 1 and Y = 2]]`, not two.
3. Avoid `contains()`/`ends-with()` and paths over 3+ associations on large entities
   **[perf-xpath]** — use `starts-with()` or an exact match when the meaning allows.
4. **Every attribute filtered or sorted on in an XPath of an entity that will exceed ~100 rows
   gets an index [perf-no-index]** (3+ places: P2). Most selective attribute first, max 3
   attributes per index, no two indexes with the same leading attribute. Booleans need none.
5. Keep XPath simple; no `false()` in a read-only access rule.

## 3. Commits, deletes, loops

1. **No Commit or Delete activity inside a loop [perf-commit-in-loop, perf-delete-in-loop].**
   Add objects to a `<Entity>CommitList` / `<Entity>DeleteList` in the loop, one Commit/Delete
   list after it. Large volumes: commit every N items, then *Change list → Clear*.
2. Commit as late as possible and once per object (build in memory, one commit) — commits lock rows.
3. `with events` only when a before/after-commit handler must run; `Refresh in client` only
   from a flow the client called.
4. Minimum work inside a loop; decisions that can be an XPath go into the retrieve.
5. Don't rely on delete behaviour for bulk deletes; delete children explicitly as a list.

## 4. Domain model

1. **No calculated attributes** on anything listed or retrieved often **[perf-calculated]**;
   store the value and update it in the flow that changes its inputs — or calculate on demand.
2. No new event handlers; call a `SUB_` explicitly before the commit.
3. Inheritance at most 2 levels; never specialise `System.User` with business data (associate
   1–1 to `Administration.Account` instead).
4. Avoid reference sets on large entities; no temporary associations on persistable entities —
   use non-persistable helpers. Non-persistables tied to `System.Session`/`System.User` need
   cleanup **[perf-held-objects]**.
5. No intermediary values stored "for display" (TotalPrice) unless denormalisation is a
   decision recorded in the ticket together with its sync flow.
6. **Access rules on every new entity — only for the roles that use it** (MxScout `access-unused`,
   `access-fails`, `access-past`), "Default rights for new members" = None, system-set
   attributes (status, owner, dates) read-only for users. Data limits go into the access rule's
   XPath, never only into a widget/data source constraint.

## 5. Microflows: shape

1. ≤ 25 activities; more → `SUB_` microflows (validation and copy flows may exceed).
2. Annotation at the start when > 10 activities or > 2 decisions: purpose, parameters, return.
3. Main flow left to right, errors down; no crossing lines.
4. No nested `if` in expressions — use decisions. Few parameters.
5. **Every REST/web service/Java call has error handling** (custom without rollback where the
   caller continues) and **logs the error** (log node = module name, with the request id).
6. Microflows called from the client validate their inputs (empty, range, format) — even
   read-only attributes; the client can send anything.
7. Microflow access: only the module roles that need it; a flow with `Apply entity access =
   No` that the client can call must check the user itself.

## 6. Pages

1. **No data view / data source per row of a list [perf-row-query]**; show the associated
   attribute through the list's own path, or a view entity.
2. **≤ 7 data sources per page** (8–11 P3, 12+ P2 **[perf-heavy-page]**); split the page; no two
   identical data sources.
3. Few conditional visibilities; progress indicator for anything > 2 s; e-mails and
   integrations the user does not wait for → task queue.
4. Drop-down filters over associations constrained (`[Order_Customer/Order]`).

## 7. Security and secrets

1. Credentials in constants with an **empty default**, set per environment in the Portal; never
   in a constant's default, a shared configuration or a plain attribute.
2. Sensitive attributes encrypted (Encryption module).
3. Published REST: `Requires authentication = Yes` when possible; if No — headers as
   parameters, validate first, abort with 401/403, IP restriction.
4. HTML from users through XSSSanitize; values rendered as HTML through HTMLEncode; external DB
   queries as prepared statements.
5. No anonymous create/write on persistable entities.

## 8. Naming and hygiene

1. English names, one language per app; user roles singular UpperCamelCase.
2. Naming standard of the project (ServiceDesk: `STANDARD-NAZW.md`) wins over these; Mendix's own is
   standards.md `conv-*`.
3. Microflows `PREFIX_Entity_Operation`, prefix from how the flow is used (ACT_, SUB_, DS_, VAL_, OCH_,
   SCE_, ASU_, CRS_, PRS_, MCP_ …). **Never invent a prefix** (ServiceDesk got `SEED_` — not in the standard;
   a one-off data seed called at start-up is `ASU_`, otherwise `SUB_`).
4. Other documents: `ENUM_`, `SNIP_`, `JSON_`, `EXM_`, `IMM_`, `JA_`; constants `CONST_` where the project
   standard says so (ServiceDesk does: 11 new constants were missing it).
5. Entities singular PascalCase; a non-persistable wrapper holding a list is still one object — name it after
   what it is (`CategorySearchResult`), not `CategoryList`.
6. No new warnings from `mx check`; unused documents removed before the story is done.
7. Never modify a Marketplace module — extension module instead.

## 9. Lessons (Craftsman)

Every lesson from a Craftsman story lands here as a rule above (with the date), on the Atlas page
`craftsman-lekcje` and in the knowledge base. The story ends with a "Czego się nauczyłem" list.

**The outcome of every Craftsman story** (Karol 2026-10-25), all of it, each confirmed in the ticket:

1. the rule in this file (Craft) — and, when MxScout could look for it, a standard in
   `mendix-describe/reference/standards.json` (Scout): `node tools/build-standards.js` in MxScout, its tests,
   then `node bin/skills.js pull mendix-describe` and `publish`;
2. a dated entry on the Atlas page `craftsman-lekcje` (`~/Atlas`, commit);
3. the knowledge base: `node bin/tandem-knowledge.js reindex` in Tandem, `search` as proof;
4. git: commit in Skills, Tandem, MxScout, Atlas — and **push Skills** (`~/Projects/Skills`, origin main);
5. a readable report for Karol and Mikołaj: what I learned, what I fixed, what is left;
6. one ticket per practice, with each criterion marked met or not met and its evidence; a ticket goes to
   Done only when every criterion is met — what is left stays out of Done with the reason.

**Written to be read — by Karol and by Mikołaj.** A lesson list, a ticket comment, a summary: a heading,
then a short numbered list or a table, one fact per line, the number first ("0 new security findings").
Never one long run-on string of commits, paths and semicolons; paths and ids go in a table column or at
the end of the line.

- 2026-10-25 (CRAFT-1): Mendix best-practice guides + MxScout perf checks → sections 1–8; the ServiceDesk
  audit found all + `head()` twice, missing indexes on own entities, 3 queries per category in search_categories.
- 2026-10-25 (CRAFT-2): MxScout on my ServiceDesk work, new findings only (base 44d47b67): security 0 new;
  performance 27 new (2 × P2 missing index, 25 × P3: SUB in a loop, `contains()`); naming 15 (11 constants
  without `CONST_`, 4 × invented `SEED_`). Rules added: section 0, 4.6, 8.3–8.5.
