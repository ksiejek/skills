---
name: mendix-compare
description: Say what changed lately in a Mendix application kept on an MxScout Team server (the last two versions that changed something) and show them as the change page - one HTML file shown in the conversation (after the last changes it asks "Przygotować stronę zmian i pokazać ją tutaj?"): tiles by kind and state; a click opens a microflow or nanoflow as a diagram before and after, a page as a wireframe, an entity in its domain model. It costs almost no tokens: the server answers a one-time link the agent downloads with one curl. For an MxScout Team server only - the skill is read with read_skill name "compare" on the MCP server, there is nothing to install; it needs no git access, no Mendix project folder and no Studio Pro. Use when told "use mendix-compare", "what were the last two changes in this app", "what changed lately", "show this microflow before and after", "show the changes", "change page", "compare versions", "jakie były dwie ostatnie zmiany w tej aplikacji", "co się ostatnio zmieniło", "pokaż mikroflow przed i po", "pokaż zmiany", "strona zmian", "przed i po", "porównaj wersje".
---

# mendix-compare: what changed lately, and one flow before and after

This skill is for an **MxScout Team server** and is read through its MCP
tools, not from a folder: call `read_skill` with `name: "compare"` on the
`mxscout` MCP server. The server hands out the copy it runs, so the work always
follows the current instructions. There is nothing to install.

It answers two questions about an application:

1. **What were the last changes?** From `list_versions` and `changes`, in plain words.
2. **What do the changes look like?** The change page, one HTML file made by the server and shown to the person in the
   conversation: `change_page` answers a one-time link, one `curl` downloads it. One flow alone is still
   `compare_document` with `format: "html"`.

The working instructions are in `reference/team.md` - `read_skill` with
`name: "compare"` answers with it.
