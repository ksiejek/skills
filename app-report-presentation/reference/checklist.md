# Readability review before hand-over

Run this over the finished report — or over an existing report with
`review`. Look at the report as rendered (open the file, both themes, a
narrow window), not at its source. **Measure, then claim**: every item you
mark as failing must point at a page and an element you actually saw.
Findings made before looking have been wrong before.

Report the result as a short list: what fails, where, the fix — severity
first. Keep a withdrawn finding visible as withdrawn rather than deleting it,
so nobody finds it again.

## 1. The Trunk Test, on every page type

Open each page type cold, as if dropped there from a link. Within a few
seconds, can a reader answer:

| Question | Passes when |
|---|---|
| What application is this? | the application's name and mark are top-left on every page |
| What page am I on? | a page heading names it (not only a highlighted menu entry), with its one-line purpose |
| What are the major sections? | the menu with its three groups is visible (or one tap away on a phone) |
| What are my options here? | the page's own controls are visible and labelled; the list or tabs say what they hold |
| Where am I in the hierarchy? | the eyebrow or breadcrumb says the level ("Process 02 of 5", "Orders › Order") |
| Where is search? | the search field is visible, and Ctrl K works on this page too |

## 2. Structure

- [ ] The menu has three groups in order: what it is · what it is made of ·
      what needs attention.
- [ ] Every menu entry has content; no empty page, no "coming soon".
- [ ] Every menu count equals the number on its page and on the Overview.
- [ ] The Overview answers, in order: what · who · talks to · does · needs
      attention · where next — and holds no full lists.
- [ ] Each page's header line says what the page is for, with its numbers.
- [ ] Own parts come before third-party / generated ones and are separated.
- [ ] Every state worth sending someone has an address; "Copy link" opens
      exactly that state in a new tab.

## 3. Prose

- [ ] The application, each process and each part have both layers: a
      summary that stands on its own, and a description one step away.
- [ ] Summaries are 2–4 sentences (1–3 for processes and parts), no bullets,
      no bold.
- [ ] Prose blocks are stacked, full width of the reading column — no tiles.
- [ ] Business prose is ≤ ~85 characters per line.
- [ ] Each process's steps are one sentence each, naming who does what.
- [ ] A diagram exists only for processes that branch.

## 4. Accuracy

- [ ] **Claims sweep**: search every sentence the report itself says (labels,
      hints, empty states, provenance lines, About text) for *never, only,
      always, nothing, all, none, cannot* — check each against the facts.
      Small grey lines first: that is where false claims hide.
- [ ] Read facts and written prose are distinguishable on every page
      (mark or provenance line).
- [ ] Where something is a guess, the sentence says so.
- [ ] Nothing is drawn or named that the facts do not show; open questions
      are listed as such.
- [ ] No secrets, no personal data, no production records anywhere —
      including the Markdown copy and tooltips.

## 5. Links

- [ ] Every identifier the report has a page for is a link to it — in
      prose, lists, tables, findings, developer notes.
- [ ] Every number on the Overview and in a part's facts opens what it
      counts.
- [ ] No link leads to an empty or missing page. Names the report does not
      have are plain code font, not dead links.
- [ ] Following a link to a filtered page shows the linked item (filters
      cleared on arrival).

## 6. Visual

- [ ] **Squint test**: blur the page — heading, lead, body and captions still
      read as four levels.
- [ ] **Grayscale test**: levels, kinds and states still read (letters,
      outlines, words).
- [ ] Every size and colour comes from the tokens; count the distinct font
      sizes and spacing values in the stylesheet — off-scale values are
      findings.
- [ ] Space between groups is larger than space inside them, on every
      stacked list.
- [ ] Severity colours appear only on severity; parts have no colours.
- [ ] One accent colour for links, current place and primary action.
- [ ] Both themes checked; text contrast ≥ 4.5:1 in both, captions included.
- [ ] Long identifiers wrap inside their box; nothing overflows; nothing is
      truncated without the full name available.
- [ ] Tables have ≤ 6 columns, numbers right-aligned and tabular.
- [ ] At ~375px wide: no sideways page scroll, 16px gutter, lists and details
      stack; wide drawings and matrices scroll inside their own box.
- [ ] Print preview: no menu or controls, light theme, drawings have their
      text equivalent.

## 7. Empty, partial and large states

- [ ] Every empty block says what nothing means, in one sentence.
- [ ] A filter that matches nothing says so and offers "Show all".
- [ ] A section whose data is missing is absent, not empty.
- [ ] The largest part and the longest flow are still readable (drawn around
      the chosen item, capped lists with "+ n more", a filter on long lists).

## 8. Findings

- [ ] One finding per cause; every finding has a title that says what is
      wrong, what happens, what to do in one sentence, and every place.
- [ ] P1 is rare enough to mean something; each P1 survives "between two
      levels, take the lower".
- [ ] Findings depending on things the facts do not show are ≤ P2 and say
      what to confirm.
- [ ] Pattern names come from the technology's analysis, or are absent.
- [ ] The conclusion sentence appears only when one pattern holds most P1s.
- [ ] Measured checks (Quality) and judged risks (Risks) are on separate
      pages; checks quote a real rule or none.

## 9. Language

- [ ] One language for everything the report says; set on the document.
- [ ] No identifier translated, re-cased, inflected or hyphenated.
- [ ] Identifiers inside prose are in code font and wrapped in a noun that
      carries the grammar.
- [ ] Plurals right for 0, 1, 2, 5, 12, 22 (Polish and other multi-form
      languages).
- [ ] Dates with the month as a word; numbers with the locale's separators;
      code values untouched.
- [ ] The same thing has the same name in menu, headers, links and prose.
- [ ] Labels: pages are nouns, buttons are verbs, sentence case.

## 10. The file

- [ ] Opens offline: no request to any server (check the browser's network
      panel — zero external requests).
- [ ] Text from the application is set as text; nothing from the source is
      interpreted as markup.
- [ ] Theme choice is remembered where storage works and the report still
      renders where it does not.
- [ ] The Markdown copy has the same pages in the same order and the same
      numbers.
- [ ] It says what it was read from and when.

## Scoring (optional)

If the person wants a number: start at 10, subtract 2 for each failing
section that blocks a reader's task (they cannot find, cannot trust, or cannot
read something), 1 for each that only slows them. State the score with the
two or three findings that cost the most, not as a bare figure.
