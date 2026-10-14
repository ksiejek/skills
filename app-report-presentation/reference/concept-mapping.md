# Mapping a technology onto the report

The report has fixed page types; every technology names its parts
differently. Map once, at the start, and write the map down — it decides the
menu, the labels and the kind tags.

## The generic page types

| Type | A unit of it is | It must be able to show |
|---|---|---|
| Part | a unit the application is divided into, owned by a team | what is in it, what it uses, what uses it |
| Flow | a unit of behaviour with a start, steps and ends | steps in order, decisions, calls, what it reads and writes |
| Record | a kind of stored thing | fields, relations, who may access it |
| Screen | something a user sees | who opens it, from where, what it starts |
| Background work | something that runs without a user | schedule, on/off, what it runs |
| Integration | a connection in or out | direction, partner, what goes over |
| Role | a kind of user | which parts and records it reaches |
| Process | a business case end to end | written from the units above |

## Rules

1. **Label with the technology's words.** The generic name is internal. The
   menu of a Mendix report says *Microflows*, of a Spring report *Services*,
   of a database report *Procedures*.
2. **Several kinds, several entries.** When the technology distinguishes
   kinds of flow the reader cares about (server vs client logic, sync vs
   background), each kind gets its own menu entry and count under Structure.
3. **Kind tags from the technology's vocabulary**, 2–4 letters, explained in
   a legend or tooltip once. If there is no established abbreviation, use the
   word.
4. **No counterpart, no page.** Do not create an empty Screens page for a
   back-end service, or a Processes page with nothing described.
5. **Extra concepts go under the closest group with their own name**
   (BPMN workflows, message topics, report definitions, ETL jobs). Do not
   force them into "flows" if they cannot be drawn as steps.
6. **Granularity: what a reader would look up.** A Java report lists public
   service methods and endpoints, not every private helper; a front-end
   report lists routes, not every component. Say in the page's header line
   what is included ("Public service methods; private helpers are listed under
   their class.").
7. **Own vs third-party.** Generated code, vendor modules, libraries and
   platform modules are separated from the team's own parts and shown
   second.

## Worked examples

These are examples of the mapping's shape. Check them against the actual
application; the analysis may expose more or fewer kinds.

### Model-driven low-code (Mendix)

| Type | Label | Tag |
|---|---|---|
| Part | Modules (Own · Marketplace) | — |
| Flow | Microflows · Nanoflows | `MF` · `NF` |
| Record | Entities (persistable · non-persistable · view) | `EN` |
| Screen | Pages | `PG` |
| Background | Scheduled events | `SCH` |
| Integration | Published / consumed REST, OData, web services | `REST` `ODATA` `WS` |
| Role | User roles → module roles | — |

Menu: Application (Overview, Processes, Modules, Architecture) · Model
(Entities, Microflows, Nanoflows, Pages) · Review (Risks, Model quality, For
developers).

### Java / Spring back end

| Type | Label | Tag |
|---|---|---|
| Part | Modules (Maven/Gradle) or top-level packages | — |
| Flow | Endpoints · Services · Scheduled jobs · Listeners | `API` `SVC` `JOB` `LSN` |
| Record | Entities (JPA) | `EN` |
| Screen | none (unless server-side views exist) | — |
| Background | `@Scheduled` jobs, message listeners | as above |
| Integration | REST clients, message queues, outgoing calls | `REST` `MQ` |
| Role | Spring Security roles / authorities | — |

A flow's drawing comes from the method body: calls, branches, loops,
try/catch as the error way out.

### .NET web application

| Type | Label | Tag |
|---|---|---|
| Part | Projects / bounded contexts | — |
| Flow | Controller actions · Handlers · Background services | `CTL` `HND` `BG` |
| Record | Entities (EF Core) | `EN` |
| Screen | Razor pages / views, or front-end routes | `VW` |
| Role | Policies and roles | — |

### Database-centred application (SQL)

| Type | Label | Tag |
|---|---|---|
| Part | Schemas | — |
| Flow | Stored procedures · Functions · Triggers | `SP` `FN` `TRG` |
| Record | Tables · Views | `TB` `VW` |
| Background | Agent / cron jobs | `JOB` |
| Role | Database roles and grants | — |

Data model is the centre of this report: put it first in Structure.

### Front-end single-page application

| Type | Label | Tag |
|---|---|---|
| Part | Feature folders / packages | — |
| Flow | Actions / stores / effects (only those with logic) | — |
| Record | API types the screens use (not stored) | — |
| Screen | Routes | — |
| Integration | API endpoints it calls | `API` |

Screens are the centre here; Records may be dropped if the types are trivial.

## Writing the map down

Put the map at the top of your working notes, and in the report itself only
where a reader benefits: a one-line legend on a list page ("`SP` stored
procedure · `FN` function · `TRG` trigger"), and on the Overview's At a glance
panel as the labels of the counts. The reader should never see the generic
names.
