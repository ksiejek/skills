# Design kit for page mockups

MxScout draws a proposed page's mockup inside a box with the class `mk-mock`, with the stylesheet of one design kit.
The mockup is HTML only.

| Where MxScout runs | The kit |
|---|---|
| A Team server whose admin imported a company's kit (Team settings, or `npm run design-kit -- import kit.json`) | That kit: `read_skill` with name `assist`, part `design-kit`, gives its class names, snippets and instructions |
| A Team server without one, and every other MxScout | MxScout's neutral kit (`public/mockkit.css`, `public/mockkit.js`, `MxMockKit.CATALOGUE`) |

## Writing a mockup

- Use the class names of a Mendix page with Atlas: `card` with `card-title`, `row` / `col-4` / `col-6`, `toolbar`,
  `btn btn-primary` / `btn-danger` / `btn-link`, `form-group` with `label` and `form-control`, `table`, `pagination`,
  `badge badge-*`, `alert alert-*`, `nav-tabs` with `.active`.
- The kit's own: `mk-header` with `mk-brand` (the top bar), `mk-kpi`, `mk-kv`, `mk-search`, `mk-empty`, `mk-placeholder`,
  and the shell `app-layout` with `app-sidebar`, `app-topbar`, `app-content`. A company's kit may add class names of its
  own; its instructions say which.
- Plain elements only: no script, handler, link or picture but `data:`; MxScout removes them.
- A page proposal that has a widget tree and no mockup is sketched by `MxMockKit.fromPage`, in the kit in use.

## A company's own kit

One JSON file, imported on the Team server:

```json
{ "mxscout": "design-kit", "format": 1,
  "name": "…", "version": "1.0.0", "source": "what it was made from",
  "brand": "the text in a sketched page's header",
  "css": "rules under .mk-mock, for the class names above and the company's own",
  "instructions": "Markdown for an agent: which class names to use",
  "snippets": [{ "name": "Data grid", "html": "<div class=\"card\">…</div>" }] }
```

The stylesheet may not import or fetch anything (`@import`, `url()` but `data:`). A company keeps its kit with its
own skills, never in MxScout, and imports it again when its design changes.
