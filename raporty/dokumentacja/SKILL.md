---
name: dokumentacja
description: Dokumentacja dla Karola i biznesu zawsze w tym samym stylu MxScout (jasny motyw, karty, tabele, plakietki), po polsku, jako jeden plik HTML plus .docx i .md. Typy dokumentów: opis zmian dla biznesu z instrukcją testów (co się zmieniło, po co, jak sprawdzić, gdzie, jak wejść na środowisko), dokumentacja techniczna i instrukcja dostępu do środowiska. Struktura wzorowana na dokumentacji Intercom → Qlik (OData). Używaj, gdy Karol prosi o dokumentację, opis zmian, release notes, instrukcję testów, instrukcję dostępu albo „zrób z tego dokument”; „/dokumentacja”, „napisz dokumentację”, „opis zmian dla biznesu”, „instrukcja testowania”, „jak wejść na środowisko”.
argument-hint: "[opis-zmian | techniczna | dostep] [temat]"
---

# Dokumentacja w stylu MxScout

Wersja 0.1 · 2026-10-27 (GEN-47). Wzór: dokument „Intercom → Qlik: przyrostowy feed danych” (`~/Projects/Intercom/docs/qlik-delta-feed-proposal.pl.html`).
Wygląd: tokeny jasnego motywu MxScout (`public/tokens.css`), akcent kobaltowy, Instrument Sans i JetBrains Mono.

Skill nie zmienia kodu aplikacji. Robi trzy pliki z jednego opisu (JSON): `.html`, `.docx`, `.md`.

## Przebieg

1. **Wybierz typ** z argumentu albo z prośby Karola: `opis-zmian`, `techniczna`, `dostep` (szkielety niżej). Niejasny typ: `opis-zmian`.
2. **Zbierz fakty**, zanim napiszesz: ticket i jego historia, diff, model, środowisko. Niczego nie zmyślaj; czego nie wiesz, wpisz do sekcji „Do sprawdzenia”.
3. **Napisz opis dokumentu** jako `<nazwa>.json` w folderze wyniku (domyślnie `docs/` projektu albo załącznik ticketu). Pola: `type`, `lang` (`pl`), `eyebrow`, `title`, `lead`, `meta` (chipy: Dla kogo, Autor, Status, Data), `sections` (`id`, `title`, `blocks`), `footer`. Przykład: `przyklad/opis-zmian-tan-50.json`.
4. **Zbuduj pliki**: `node "$SKILL/bin/build.js" <nazwa>.json [folder]`, gdzie `$SKILL` to folder tego skilla (`~/.claude/skills/dokumentacja`). Powstają `<nazwa>.html`, `.docx`, `.md`. Zero zależności; `.docx` pakuje systemowe `zip`.
5. **Sprawdź**: otwórz `.html` (zrzut z przeglądarki), `textutil -convert txt <nazwa>.docx` na Macu. Nie wymyślaj stylu: zmiany wyglądu robi się w `szablon.css`, nie w dokumencie.
6. **Oddaj**: w czacie tylko ścieżki trzech plików i jedno zdanie, o czym jest dokument. W tickecie Tandem dołącz je przez `story_attach`.

## Struktura (jak w Intercom/OData)

Każdy dokument ma ten sam układ: nagłówek (nadtytuł, tytuł, zdanie wiodące `lead`, chipy), spis treści, potem ponumerowane sekcje `01`, `02`…

- **W skrócie** zawsze pierwsza: 2–3 zdania prozą i para kart „Dziś” / „Po zmianie” (`grid`).
- Sekcje o stanie i rozwiązaniu: `table` dla porównań, `cards` z numerem (`3.1`) dla elementów rozwiązania, `note` dla luk i wyjątków.
- Kroki procesu: `flow` (do czterech kroków ze strzałkami), `steps` (kroki dalsze), `verify` (numerowana lista „do sprawdzenia”), `checks` (korzyści z ptaszkami).
- Ostatnia sekcja: „Następne kroki” (`steps` albo `checks`).
- Poziom szczegółów: pierwsza strona czytelna dla biznesu bez przewijania; szczegóły techniczne w kartach i `code`, nie w „W skrócie”.
- Ton: krótkie zdania, „Ty” do Karola, pogrubienie tylko dla rzeczy, które decydują. Bez żargonu bez wyjaśnienia (pierwsze użycie: nazwa + po polsku, co to).

Bloki: `p`, `ul`, `ol`, `code`, `note` (`kind`: `bad` | `acc`), `table` (`head`, `rows`), `grid` (`cap`, `text`, `accent`), `cards` (`no`, `title`, `text`/`list`/`code`), `checks`, `verify` (`title`, `text`), `steps`, `flow` (`title`, `text`, `src`, `mx`). W tekście: `**pogrubienie**` i `` `kod` ``.

## Typy dokumentów

**opis-zmian** — dla biznesu, z instrukcją testów:
1. W skrócie (co i dla kogo; Dziś / Po zmianie)
2. Po co ta zmiana (korzyść jako `ul`, wyjątki jako `note`)
3. Co się zmieniło (`table`: Obszar · Było · Jest)
4. Jak to sprawdzić: środowisko i adres, konto i rola, `steps` (co kliknąć, co zobaczyć), `verify` (przypadki brzegowe)
5. Gdzie to jest (strony, menu, ścieżka w aplikacji)
6. Znane ograniczenia i Do sprawdzenia
7. Następne kroki

**techniczna** — dla zespołu:
1. W skrócie · 2. Jak jest dziś (`table`) · 3. Rozwiązanie (`cards`, `code` na zapytania i konfigurację) · 4. Przebieg (`flow`) · 5. Bezpieczeństwo i dostęp · 6. Do sprawdzenia (`verify`) · 7. Następne kroki

**dostep** — instrukcja dostępu do środowiska:
1. W skrócie (do czego i dla kogo) · 2. Adresy i środowiska (`table`: Środowisko · Adres · Do czego) · 3. Konta i role (nigdy haseł w dokumencie: tylko gdzie je wziąć, np. nazwa wpisu w 1Password) · 4. Pierwsze logowanie (`steps`) · 5. Gdy nie działa (`verify`) · 6. Do kogo pisać

## Zasady

- Domyślnie po polsku; angielski tylko na prośbę (`lang: "en"`, etykiety „Spis treści” zostają w szablonie do zmiany tą samą drogą).
- Nigdy nie wpisuj haseł, tokenów ani kluczy; wskaż, gdzie leżą.
- Jeden dokument = jeden temat. Dokument, który Karol ma przeczytać, dołącz do ticketu, nie odsyłaj do ścieżki w repo.
- Wygląd zmieniasz tylko w `szablon.css`; zmiana trafia do wszystkich dokumentów od następnego budowania.
