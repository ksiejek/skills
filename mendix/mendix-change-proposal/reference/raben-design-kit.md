# Raben design mockup kit

The kit draws a proposed page the way a Mendix page in the Raben design will look. It is HTML and CSS only.

| Part | Where |
|---|---|
| Look (tokens, layout, buttons, forms, data grid, tabs, tags, alerts, KPI tiles, navigation shell) | `public/mockkit.css` in MxScout (copy it next to the mockup when a mockup is shown outside MxScout) |
| Widget snippets to copy from, and a sketch of a page from its widget tree | `public/mockkit.js` (`MxMockKit.CATALOGUE`, `MxMockKit.fromPage`) |
| Version | `MxMockKit.VERSION` and `MxMockKit.SOURCE`, and `KIT-VERSION` in the header of `mockkit.css` |

**Version:** kit 1.0.0, made from the RabenDesign module as the demo app `RabenDesignSystem` at commit `c8db48a` (2026-10-28).
Files read: `themesource/rabendesign/web/raben/_tokens.scss`, `_widgets.scss`, `_layouts.scss`.

## Writing a mockup

- Use the class names of the module (Atlas + Raben): `card`, `btn btn-primary`, `form-group`, `form-control`, `table`, `badge badge-*`, `nav-tabs`, `alert alert-*`, `rb-kpi`, `raben-layout`.
- Plain elements only: no script, handler, link or picture but `data:`; MxScout removes them.
- A page proposal that has a widget tree and no mockup is sketched by `MxMockKit.fromPage`.

## Updating the kit when Raben design changes

1. Ask Karol which version of the RabenDesign module to follow (Marketplace version, or the commit of the demo app).
2. In that source read `_tokens.scss` and compare the `--rb-*` values with the variables at the top of `.rb-mock` in `mockkit.css`; copy the changed colours, radii and type sizes.
3. Compare `_widgets.scss` and `_layouts.scss` for new or changed widgets (buttons, forms, data grid, tabs, tags, alerts, cards); change the matching rules, add new ones, add a snippet to `CATALOGUE`.
4. Bump `VERSION` and `SOURCE` in `mockkit.js` and `KIT-VERSION` and the source line in the `mockkit.css` header; add a line to the CHANGELOG.
5. Run `npm test` (test 100 checks the version, the tokens and the sketch).
