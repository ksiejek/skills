---
name: mendix-comments
description: Work through the comments the business and the team pinned on the screens of a plan's prototype in MxScout Team - read the new ones with the team's replies, add your own understanding where nobody replied, group them into tickets on the team's board (one ticket may cover several comments), mark them in progress with the ticket keys, and after the fix mark them done with a note of what changed. Never rejects a comment - that is the owner's. For a Team server only - the skill is read with read_skill name "comments" on the MCP server, there is nothing to install. Use when told "use mendix-comments", "take the prototype comments", "weź komentarze z prototypu", "zrób tickety z komentarzy", "komentarze do budowy", "oznacz komentarze jako zrobione".
---

# mendix-comments: from a comment on the prototype to a ticket, and back

This skill is for an **MxScout Team server** and is read through its MCP
tools, not from a folder: call `read_skill` with `name: "comments"` on the
`mxscout` MCP server. The server hands out the copy it runs, so the work always
follows the current instructions. There is nothing to install and no file to
write.

A comment on the prototype is pinned on a screen of the plan (or on the
prototype as a whole). It has a status - **new**, **in progress** (with the
ticket keys that carry it), **done** (with a note of what changed) or
**rejected** (with the owner's reason) - and a thread of replies, where the
owner and the team say how they want it.

The working instructions are in `reference/team.md` - `read_skill` with
`name: "comments"` answers with it.
