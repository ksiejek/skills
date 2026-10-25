# Language

Writing for two kinds of reader, translating labels and prose while never
translating identifiers, plurals, dates and numbers, reports in a language
other than the source's, and terminology lists to start from.

## Which language

- The report is in the language **the person asked for**. If they did not
  say, the language they wrote to you in. If unclear, ask once.
- **One language per report** for everything the report itself says: menu,
  headers, captions, empty states, prose, findings. Only identifiers and
  quoted source text stay as they are.
- Record the language in the report (`<html lang="pl">`, and in the data if
  there is any), so search, hyphenation and screen readers follow it.

## Two registers

The same fact is written differently for the business reader and the
developer. Each page has an owner (see `information-architecture.md`); write
in that owner's register.

| | Business reader | Developer |
|---|---|---|
| Talks about | what happens to a case, who does it, what the business gets | where it is, what calls what, what breaks |
| Names | the business words ("an order", "the clerk"); an identifier only when the reader will want to look it up, explained in words | qualified identifiers, exactly |
| Sentences | full, plain, one idea each | short, may be fragments in lists and tables |

Good (business): "A clerk checks a new order and confirms it; the customer
gets a confirmation e-mail, and the order waits for payment."

Bad (business): "ACT_Order_Confirm retrieves Order, sets Status=Confirmed,
calls SUB_SendMail."

Good (developer): "Changing `Order.Status` outside `Orders.ChangeStatus`
skips the history record and the deadline."

Bad (developer): "Be careful when changing order statuses, as this could
potentially cause issues."

General rules for both:

- **Say what the source shows, nothing more.** When a purpose is a guess, say
  so ("probably", "the name suggests"). A confident wrong sentence is worse
  than a short true one: the reader will act on it.
- **A sentence that asserts behaviour is a claim** ("never", "only",
  "always", "nothing", "all"). Check each one before hand-over; small grey
  helper lines are where false claims hide.
- Explain a business term the first time it appears.
- No marketing ("powerful", "seamless", "simply"), no exclamation marks, no
  "please note".

## Labels

- **Sentence case** for everything: "Read the full description", not "Read
  The Full Description". Captions are rendered upper case by style, not
  typed in capitals.
- **Pages are nouns** ("Risks", "Data model"); **buttons are verbs**
  ("Copy link", "Show all", "Download as Markdown"); **section headings are
  the reader's question** where it reads naturally ("Who uses it", "What
  needs attention", "Where to go next").
- The same thing has **one name** everywhere: menu, header, links, prose,
  the Markdown copy. Decide "entity" or "record" once and keep it.
- A label that counts says what it counts: "Flows that carry it · 4", not
  "Related · 4".

## Translate the words, never the names

Never translate, re-case, inflect or abbreviate:

- identifiers: modules, packages, classes, tables, columns, flows, methods,
  screens, roles, constants, enumeration values;
- file names, paths, endpoints, queue and topic names;
- the technology's own product terms when it has no official translation
  (keep "microflow" if the platform's documentation in that language keeps
  it).

Do translate:

- every label the report itself shows;
- the display names of levels, themes and kinds (keep their internal keys);
- prose.

Identifiers inside translated prose sit in **code font** and are wrapped in a
common noun that carries the grammar, so the identifier never has to be
inflected:

| Language | Good | Bad |
|---|---|---|
| Polish | "w module `Orders`", "encja `Order` ma pole `Status`" | "w `Orders`ie", "`Order`a" |
| German | "im Modul `Orders`", "die Entität `Order`" | "in `Orders`s" |
| English | "the `Orders` module" | "Orders's flows" |

**Text quoted from the application** (captions, messages, enumeration
captions) is quoted verbatim in its own language, in quotation marks of the
report's language. Add a translation in parentheses only when the reader
needs it: „Zamówienie przyjęte" ("Order accepted").

## Plurals

Never build a plural by adding a letter. Use the language's plural rules
(in code: `Intl.PluralRules`), with one string per category.

| Language | Categories | Example |
|---|---|---|
| English | one, other | 1 module · 2 modules |
| German | one, other | 1 Modul · 2 Module |
| Polish | one, few, many | 1 moduł · 2 moduły · 5 modułów · 22 moduły · 12 modułów |
| Czech | one, few, many, other | 1 modul · 2 moduly · 5 modulů |

Polish "few" is 2–4 except 12–14; everything else that is a whole number is
"many". Write every counted noun in all its forms in the terminology list.

Small counts as words in sentences where the language reads better ("three
main processes" / „trzy główne procesy"); digits in tables, badges and the
menu.

## Dates and numbers

- **Dates**: unambiguous, with the month as a word, in the report's locale.
  Never a numeric date that reads differently across countries (10/11/12).

  | Locale | Date |
  |---|---|
  | en | 14 Oct 2026 |
  | pl | 14 października 2026 |
  | de | 14. Oktober 2026 |

  Machine-readable dates (data, file names) stay ISO: `2026-10-14`.
- **Numbers**: the locale's separators (in code: `Intl.NumberFormat`).

  | Locale | 12345.6 | 1234 |
  |---|---|---|
  | en | 12,345.6 | 1,234 |
  | pl | 12 345,6 (non-breaking space) | 1234 (no grouping under 10 000) |
  | de | 12.345,6 | 1.234 |

  Identifiers and code values are never re-formatted (`timeout = 30000`
  stays `30000`).
- **Times and durations**: 24-hour clock unless the locale prefers 12-hour;
  durations in words for prose ("about two minutes"), in units for tables
  ("1.8 s" / „1,8 s").

## Mixed-language reports

A common case: the source is in English (identifiers, comments), the
application's captions are in a third language, the report is in Polish.

- The report's own words: Polish.
- Identifiers: as in the source, code font.
- Captions shown to users of the application: verbatim, quoted.
- Search must find all three; matching ignores case and accents.
- The Markdown copy follows the same rules.
- If the source mixes languages in its naming, do not normalise it; a
  developer will search for the name as it is written.

## Terminology lists

Starting points. Have a native speaker check before a report in that language
goes out; add each report's own terms (its business nouns) to the list and
keep it next to the report.

### Menu and pages

| English | Polish | German |
|---|---|---|
| Application (group) | Aplikacja | Anwendung |
| Structure (group) | Budowa | Aufbau |
| Review (group) | Ocena | Prüfung |
| Overview | Przegląd | Übersicht |
| Processes | Procesy | Prozesse |
| Modules | Moduły | Module |
| Architecture | Architektura | Architektur |
| Data model | Model danych | Datenmodell |
| Flows | Przepływy | Abläufe |
| Screens | Ekrany | Masken |
| Risks | Ryzyka | Risiken |
| Quality | Jakość | Qualität |
| For developers | Dla programistów | Für Entwickler |

### Overview and pages

| English | Polish | German |
|---|---|---|
| At a glance | W skrócie | Auf einen Blick |
| Who uses it | Kto z niej korzysta | Wer sie nutzt |
| What it talks to | Z czym się łączy | Womit sie verbunden ist |
| What it does | Co robi | Was sie tut |
| What needs attention | Co wymaga uwagi | Was Aufmerksamkeit braucht |
| Where to go next | Dokąd dalej | Wie es weitergeht |
| Read the full description | Przeczytaj pełny opis | Vollständige Beschreibung lesen |
| Steps | Kroki | Schritte |
| How it works | Jak to działa | So funktioniert es |
| Flows that carry it | Przepływy, które go realizują | Abläufe, die ihn tragen |
| Risks along the way | Ryzyka po drodze | Risiken auf dem Weg |
| Uses · Used by | Używa · Używany przez | Nutzt · Genutzt von |
| Own · Third-party | Własne · Zewnętrzne | Eigene · Fremde |
| What the source does not show | Czego źródło nie pokazuje | Was die Quelle nicht zeigt |

### Findings

| English | Polish | German |
|---|---|---|
| P1 · Security and data | P1 · Bezpieczeństwo i dane | P1 · Sicherheit und Daten |
| Fix before the next release | Naprawić przed następnym wydaniem | Vor dem nächsten Release beheben |
| P2 · Functional errors | P2 · Błędy działania | P2 · Funktionale Fehler |
| Fix in one of the next releases | Naprawić w jednym z najbliższych wydań | In einem der nächsten Releases beheben |
| P3 · Maintenance | P3 · Utrzymanie | P3 · Wartung |
| Fix when you next work on it | Naprawić przy najbliższej pracy nad tym miejscem | Bei der nächsten Arbeit daran beheben |
| What happens | Co się dzieje | Was passiert |
| What to do | Co zrobić | Was zu tun ist |
| Where | Gdzie | Wo |
| Same pattern elsewhere | Ten sam wzorzec gdzie indziej | Dasselbe Muster anderswo |

### Controls and states

| English | Polish | German |
|---|---|---|
| Search | Szukaj | Suchen |
| Filter | Filtruj | Filtern |
| Show all | Pokaż wszystko | Alle anzeigen |
| Copy link · Link copied | Kopiuj link · Skopiowano link | Link kopieren · Link kopiert |
| Download as Markdown | Pobierz jako Markdown | Als Markdown herunterladen |
| Light · Dark · Auto | Jasny · Ciemny · Systemowy | Hell · Dunkel · System |
| None. | Brak. | Keine. |
| No finding matches these filters. | Żadne ustalenie nie pasuje do filtrów. | Kein Befund passt zu diesen Filtern. |
| Written by an agent from the source. | Napisane przez agenta na podstawie źródła. | Von einem Agenten aus der Quelle geschrieben. |
