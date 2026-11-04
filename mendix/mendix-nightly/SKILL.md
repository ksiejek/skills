---
name: mendix-nightly
description: The nightly job of an MxScout Team server - a scheduled run of Claude that keeps the documentation of the Mendix applications up to date by itself. It asks the server what changed (work_queue), describes only the new and changed documents and the descriptions that went out of date, a module at a time, within the AI budget and a 2-hour time box, reports the tokens it used and the run (job_report), and never deletes anything. For a Team server only - the skill is read with read_skill name "nightly" on the MCP server, there is nothing to install. Use when a scheduler starts Claude with "run the nightly job", or when told "use mendix-nightly", "opisz zmiany z main line", "nocny job".
---

# mendix-nightly: describe what changed, once a night

This skill is for an **MxScout Team server** and is read through its MCP
tools, not from a folder: call `read_skill` with `name: "nightly"` on the
`mxscout` MCP server. The server hands out the copy it runs, so the job always
works by the current instructions. There is nothing to install and no file to
write.

The job is a scheduled run of Claude with an account of its own (an ordinary
user that sees only the projects an admin gave it). The server's Git watcher
follows each project's main line and makes a model version for every commit; the
job **only describes**. Whoever sets the schedule starts it with the prompt the
admin's "Connect a job" card in Team settings gives; this skill is what that
prompt points to.

The working instructions are in `reference/team.md` - `read_skill` with
`name: "nightly"` answers with it.
