# Visual rules

Type, spacing, colour, density, tables, names, numbers, icons, themes and
print. The aim is a report that reads as one system: every value chosen from
a scale, every colour carrying one meaning.

The single lesson behind this file: a report "looks amateur" not because of
taste but because **every value was chosen once, alone, with nothing to be
consistent with**. Measured on a real documentation app: 23 distinct spacing
values and 17 font sizes, three quarters of them off any scale. Fix the
system, not the screens.

## Define tokens first

Write every size and colour as a named variable (CSS custom properties) in
one place, then use only the names. Components never contain a literal
colour or an ad-hoc pixel value.

**This is already done in `assets/`.** `assets/tokens.css` holds the scales
and the default palette below, light and dark; `assets/report.css` builds
every component from those names only. Start from the kit: build the data
JSON and run `assets/build.js`; to restyle, change only `tokens.css`; never
rebuild the components from scratch. The rest of this file is what the kit
does and why — read it to judge a report, or to extend the kit in its own
style.

## Spacing scale

```
--space-1   4px    inside a control: icon to label
--space-2   8px    between items of one group: rows of a list, chips
--space-3  16px    between a caption and its block; card padding
--space-4  24px    between blocks of one section
--space-5  32px    between sections of a page
--space-6  48px    page padding (wide), between major regions
--space-7  64px    between the Overview's sections
```

**The grouping rule:** the space *between* groups is always larger than the
space *inside* a group. If the gap between two steps of a list equals the gap
inside one step, the eye cannot tell where a step ends. Check it on every
stacked list: inside ≤ 8px, between ≥ 16px.

Separate a destructive or irreversible control from its neighbours by
distance and a hairline, not by colour alone (8px between ordinary buttons,
24px before the dangerous one).

## Type scale

```
--text-xs    12px   captions (upper case), kind tags, small grey lines
--text-sm    14px   body text in lists, tables and panels
--text-base  16px   business prose (descriptions, the Overview)
--text-lg    18px   lead paragraphs of a part or process
--text-xl    20px   headings inside a page
--text-2xl   24px   page headings
display      32–64px  the application's name on the Overview only
```

- **Two families**: a sans-serif for the interface and prose, a monospace for
  identifiers, numbers in tables, kind tags and code. No third.
- **Weights**: 400 (text), 500 (values, leads), 600 (headings, names in bold,
  buttons). 700 only for very small text that must hold its own (tags). No
  650s, no 800s.
- **Line height**: 1.5 for interface text, 1.6–1.7 for business prose, ~1.2
  for headings, 1.0 for the display name.
- **Prose measure**: business prose at most ~75–85 characters per line
  (≈ 680–760px at 16px). Dense reference (tables, lists of names, notes for
  developers) may run wider; that is a deliberate choice for a developer
  audience, not an oversight.
- **Captions** are 11–12px, upper case, letter-spaced (~0.08em), muted. They
  name blocks; they are never sentences.
- Use `text-wrap: pretty` (or the medium's equivalent) on leads and prose to
  avoid single-word last lines.

## Colour

### Roles, not hues

| Role | Meaning | Used for |
|---|---|---|
| chrome | the window around the pages | sidebar background |
| panel / raised / sunken | surfaces | the page, cards, wells |
| line / line-2 | hairlines | borders, row dividers |
| ink / ink-2 / muted | text, three strengths | body, secondary, captions and grey lines |
| **accent** (one) | where you are, where you can go | links, the current menu entry, the primary button, eyebrows, focus ring |
| **P1 / P2 / P3** (reserved) | how bad | level badges, severity bars, the P1 count — nothing else |
| ok | done, allowed, on | write access, a job switched on |
| **kind colours** (≤ 6) | what sort of thing | step families in drawings, kinds of records |

Each coloured role has two values: the colour itself (text, icon, line) and a
tinted background (`p1` + `p1bg`). Badges are coloured text on the tint, not
white text on a saturated block.

### Colour by kind, never by module

- **A fixed, small set of kind colours** (six is plenty) means the same thing
  in every drawing of the report: read data, create or change, save, call,
  decision, plain variable. A reader learns them once.
- **Parts (modules) get no colour.** There are too many; colours run out,
  repeat, and end up meaning nothing. A part is told by its name.
- **Severity colours are reserved.** Red/amber/grey mean P1/P2/P3 and
  nothing else — not "deleted", not "error step", not "important". An error
  path in a drawing uses its own label ("error") and the danger hue only if
  that hue is not also P1's.
- **One accent.** If everything that is clickable, current, primary and
  highlighted shares one colour, the reader knows where to look.

### Default palette

A starting point, from the report this skill was distilled from. Replace it
freely, keep the roles.

| Token | Light | Dark |
|---|---|---|
| chrome | `#ECEDF0` | `#0A0B0D` |
| panel | `#FFFFFF` | `#111215` |
| raised | `#F6F7F9` | `#16171B` |
| line | `#E4E6EA` | `#22252B` |
| ink | `#121417` | `#EDEEF0` |
| ink-2 | `#3B4048` | `#BCC1C9` |
| muted | `#646A74` | `#8B919B` |
| accent | `#2A57F0` (text `#2148D0`) | `#3461F5` (text `#8EA8FF`) |
| P1 / bg | `#C9302C` / `#FCE9E8` | `#FF6B6B` / `#2E1618` |
| P2 / bg | `#B45309` / `#FBF0E2` | `#F5A524` / `#2B2112` |
| P3 / bg | `#5B616B` / `#EEF0F3` | `#A0A6B0` / `#22252B` |
| ok / bg | `#15803D` / `#E7F6EC` | `#4ADE80` / `#112417` |
| kind: read data | `#1A74B0` | `#5BB4F0` |
| kind: create/change | `#B4580A` | `#F09A52` |
| kind: save | `#16804F` | `#4CC38A` |
| kind: call | `#6D4BC9` | `#B194F5` |
| kind: decision | `#8A6A00` | `#E0C25B` |
| kind: variable | `#5B6472` | `#9AA4B2` |

Grey surfaces may be tinted slightly toward the accent; untinted greys are
acceptable.

### Tests every screen passes

- **Grayscale**: every meaning carried by colour is also carried by text,
  shape or position (`P1` letters on the badge; solid/dashed/dotted outlines
  for kinds; a word "off" beside a grey dot).
- **Squint / blur**: the hierarchy (heading → lead → body → captions) still
  reads.
- **Contrast**: body text ≥ 4.5:1 against its background in both themes;
  muted captions ≥ 4.5:1 too, because they carry information. Error and
  warning text gets its own treatment, never the muted grey of helper text.

## Light and dark

- Both themes are designed, not inverted: each token has a value per theme.
- A switch **Light · Dark · Auto** at the foot of the menu; Auto follows the
  system; the choice is remembered when the medium allows (and the report
  works when storage is blocked).
- Shadows are softer in light, deeper in dark; borders carry more of the
  structure in dark.
- Drawings use the same tokens, so they switch with the page.

## Density

- **The interface is compact, the prose is airy.** Lists and tables at 14px
  with 6–9px row padding; prose at 16px with paragraph spacing.
- **No cards for prose.** Prose sits on the page surface. Cards are for
  things you click or compare (a check, a process row, a fact panel).
- **No more than one level of boxes.** A card inside a card inside a panel
  is noise. Use a hairline or space instead.
- Rows in a list are the link, whole. A tiny "Open" link at the end of a row
  is a second target for the same thing; keep it only as a visual hint.

## Tables

- **At most six columns.** More is a sign the content is two tables, or that
  some columns belong in the detail view.
- Header cells: caption style (small, muted). No bold body cells.
- **Numbers right-aligned**, monospace or tabular figures, so they line up.
- First column: the name, monospace when it is an identifier.
- Hairlines between rows, none between columns.
- Wide tables scroll sideways inside their own box; the page never scrolls
  sideways.
- A table with one row is a sentence. A table with one column is a list.
- Embedded bars (a share of a total) are thin, start at the left of their
  cell, and carry the number beside them.

## Long names

Identifiers in real applications are long (`Orders.ACT_Order_SubmitForApproval_Validate`).

- **Qualified names show the part muted and the name in ink**:
  `Orders.`**`SubmitOrder`**. In a list already filtered to one part, drop the
  part prefix; in a group by prefix, drop the prefix (`ACT_` group shows
  `SubmitOrder`).
- **Wrap, never truncate silently.** Allow breaks anywhere in an identifier
  (`overflow-wrap: anywhere`) rather than overflowing the box. If space truly
  forces truncation, use an ellipsis and keep the full name in a tooltip and
  in the detail view.
- Never hyphenate identifiers; a hyphen inserted into a name changes the
  name.
- Columns sized to their content, not stretched: a card three times wider
  than its name looks empty.

## Numbers

- In tables, badges and counts: **digits**, tabular, right-aligned.
- In sentences: small counts as words when the language reads better that way
  ("Three main processes", "five groups"), larger ones as digits ("38
  findings").
- **A count with its total**, not a percentage alone: "7 of 120 microflows
  apply access rules". Percentages only for large bases, and then with the
  count too.
- Correct plurals, always: "1 step", "2 steps". Generate them through the
  language's plural rules (see `language.md`), never by adding "s".
- Zero is shown as "0" in a count, as "None." in a list, as "—" in a table
  cell where a value is not applicable (not where it is zero).

## Icons

- **One set**, 16-unit grid, stroked (1.5), round caps, same visual weight.
- **Decorative**: always beside a text label (`aria-hidden`), never the only
  signifier — except for universally understood controls (search, theme,
  previous/next), which still carry an accessible name.
- One icon per menu entry; icons on step cards for the step family; a person
  vs a screen icon on process diagrams. Not on every row of every list.
- Kind tags are **text** (`MF`, `SP`), not icons: text survives grayscale,
  print and the Markdown copy.

## Drawings

- Lines are **orthogonal** (horizontal and vertical segments), never cross a
  box, each with its own lane when several share a channel.
- Arrows point the way the data or request goes; labels are one or two words.
- Groups are dashed frames with their name inside the top-left corner.
- Flows read **top to bottom**; context reads **left (who uses / sends) →
  middle (the application) → right (what it calls)**.
- Anything wider than the column scrolls sideways inside its own box.
- A drawing has a text equivalent nearby (the steps list, the partners table)
  for print, screen readers and the Markdown copy.

## Motion and feedback

- No decorative animation. Transitions ≤ 150ms on hover and selection.
- A control answers on itself: "Copy link" → "Link copied" for two seconds,
  then back. No toast for something the reader just did.
- A click never moves the reader: lists keep their scroll position when the
  page redraws; the chosen row is brought into view only if it is not visible,
  by scrolling the list, not the page.
- Focus is always visible (2px accent outline, 2px offset).

## Narrow screens and print

- Below ~720px: the menu becomes a wrapped row at the top, the list and the
  detail stack, side-by-side blocks stack, the 16px side gutter stays, the
  page never scrolls sideways.
- **Print**: hide the menu, the lists and the controls; print the light
  theme; let the main column run the full page; keep the drawing's text
  equivalent. A security reviewer or an auditor will take it away as a PDF.
