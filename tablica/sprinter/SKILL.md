---
name: sprinter
description: Zasady Sprintera, wspólnego rdzenia MxCraft i Tandem – tygodniowe sprinty, historyjki z kryteriami (standard „Dla Ciebie” + „Dla Claude · polecenie”: jak pisać historyjkę, żeby Karol zrozumiał ją od razu), tablica To do · Running · Done (z pipeline: Draft · To do · Running · Automated Testing · Done · On Prod), testy automatyczne i kto co robi (Karol mówi, czego chce, i wypuszcza na prod; Claude buduje; testu człowieka w Tandem nie ma). Mówi, jak brać historyjki z To do w kolejności sprintu, kiedy przesuwać je między kolumnami, kto ustawia Done (Claude albo pipeline, nie Karol) i jak zapisywać historię, kryteria i zmiany w modelu w tickecie, nie w czacie. Używaj w każdym projekcie prowadzonym w MxCraft albo Tandem, gdy planujesz, szacujesz, budujesz albo zmieniasz status pracy; skill tandem dokłada do tego raportowanie kroków i tokenów.
---

# Sprinter: jak pracuje zespół Karol + Claude

Wersja 0.23 · 2026-11-11 (GEN-86: commit historyjki robi Tandem przy Done; historia wersji w skillu tandem, `reference/historia-decyzji.md`.)

Sprinter to wspólny rdzeń MxCraft i Tandem: sprinty, historyjki i tablica.
Ten plik mieszka w Tandem (`skills/sprinter/SKILL.md`); `$TANDEM_DIR` to folder repo Tandem. Sesja budowy ma potrzebne zasady w skillu `tandem`; ten czytasz przy planowaniu, refinemencie i zakładaniu historyjek. Pliki `reference/*.md` czytasz na żądanie (spis na końcu).

## Kto co robi

Na tickecie widać tylko imiona: Claude, Karol (ról ani punktów nie ma).
- **Karol** mówi, czego chce, ustala kolejność, odpowiada na pytania z refinementu i wypuszcza na prod („Na prod”). W Tandem nie testuje; historyjkę z Done może odesłać („Popraw z uwagami”).
- **Claude** zapisuje historyjki według standardu niżej, bierze je z To do w kolejności sprintu, jedną naraz, buduje, dopisuje testy automatyczne, ocenia kryteria i przenosi do Done (z pipeline: do Automated Testing).

## Sprint i tablica

- Sprinty tygodniowe, aktywny jeden; reszta w backlogu („Do refinementu” → „Gotowe do sprintu” → „Następny sprint”).
- Kolumny: **To do · Running · Done** (Backlog poza tablicą). Kolejność w To do ustala Karol w Tandem („Następne w sprincie”): mniejsze `order` pierwsze, potem numer; mały błąd (trywialny wg orkiestratora) idzie przed resztą, chyba że Karol ustawił kolejność ręcznie (`orderManual`, TAN-208).
- Historyjka: `key`, `title`, `type` (story, bug, task, refinement), `prompt`, `intent`, `acceptance`, `questions`, `decisions`, `changes`, `assignee`, `log`.
- Projekt z pipeline: Draft · To do · Running · Automated Testing · Done · Acceptance (`prod`). Draft przesuwa Karol; To do = „buduj”; Running: oceniasz kryteria i `story_move` do `autotest` (ticket planistyczny prosto do Done); Automated Testing to pipeline (fail = `halt`, czerwona ramka, zatrzymanej nie przesuwasz sam; po zielonych testach pipeline sam daje Done, w trybie partiami testy idą raz na partię); Done: skrypt commituje historyjkę (temat „KLUCZ: …”); Acceptance przesuwa Karol, Claude nie. Jeden job na projekt: Running i Automated Testing (Done i karta „Partia testów” nie blokują). Pełna tabela, partie, układ rodzinny, orkiestrator, dwie drogi Mendix: `reference/tablica-pipeline.md`.
- Wydanie na prod blokuje swoje historyjki (przeniesienie, edycja, usunięcie); komentarz przechodzi: `reference/wydanie-blok.md`.
- Ekran pokazuje polskie nazwy (`todo` Do zrobienia, `running` Claude buduje, `autotest` Testy, `done` Gotowe); w `story_move` podajesz zawsze id. Słownik: `reference/nazwy-na-ekranie.md`.

## Rytm historyjki (skrót; pełny tekst `reference/rytm-historyjki.md`)

1. `story_next` (jedna naraz; gdy inna w Running albo Automated Testing, pauza lub pusta kolejka: jedno zdanie i stop).
2. Przeczytaj polecenie, intencję, kryteria, pytania, `fixes` i `review`; model Mendix czytaj przez `model_read`, nie z pamięci.
3. Pracuj według polecenia; decyzje i zmiany w modelu w `story_comment` (`decision`, `change`).
4. Pytanie bez odpowiedzi: `run_ask` z założeniem i idź dalej; gdy bez odpowiedzi nie ruszysz: `run_wait` (nie cofaj do To do).
5. Sprawdź sam, wynik w komentarzu; Karola nie pytaj po każdej historyjce, najwyżej raz po partii zmian.
6. Oceń kryteria (`run_report.criteria`: `index`, `done`, `evidence`); Karol czyta ocenę i ewentualnie sam ją zmienia.
7. `story_move` do `done` (z pipeline `autotest`), potem `run_report` z `summary`, `result` i `walk`. Done nie czeka na Karola.
8. Uwagi Karola wracają historyjkę do To do z `fixes`: zaczynasz od nich. Commit robi Tandem przy Done (skill tandem, „Koniec historyjki”); żaden commit nie zmienia statusu.
9. Po Done nie bierzesz następnej; zrobi to nowa sesja.

## Jak pisać historyjkę (skrót; pełny standard `reference/standard-historyjki.md`, wzór `reference/przyklad-ab3.md`)

Dwie części, strona pokazuje je osobno; obie krótkie, bo Karol czyta, żeby wiedzieć, co Claude zrobił:
1. **Dla Ciebie** (`intent` + `acceptance`), prosty polski, pełne zdania, bez żargonu sesji, tak, jakby czytał ktoś, kto nie widział rozmowy.
   - `intent` to trzy akapity oddzielone pustą linią: **Dziś:** (co jest nie tak, 1–2 zdania), **Po zrobieniu:** (co będzie prawdą, 1–2 zdania), **Kto:** jedna linia `Kto: Claude <co robi>. Ty (Karol): <co dokładnie robisz>.` (bez zadania: `Ty (Karol): nic.`; czekanie na inną historyjkę albo decyzję napisz tu).
   - Każdą nazwę wyjaśnij jednym słowem; nazwy plików, ścieżki, funkcje i pola JSON idą do polecenia.
   - `acceptance`: jedno sprawdzalne zdanie na pozycję, opisane tym, co Karol zobaczy, zwykle 3–6; ocenia je Claude.
   - Tytuł mówi, co zmieni się dla Karola. Pytania i decyzje w `questions`, `decisions`, nie w opisie.
2. **Dla Claude · polecenie** (`prompt`): zawsze szczegółowe i techniczne, tak, by nowa sesja z pustym kontekstem zrobiła historyjkę bez pytań. Po kontekście zawsze trzy części, w tej kolejności: **Where** (pliki i funkcje do zmiany, z jednym istniejącym wzorem do naśladowania), **Check** (dokładne polecenie i oczekiwany wynik), **Out of scope** (czego nie ruszać). Gdy coś musi zrobić Karol, polecenie mówi, kiedy zapytać przez `run_ask` i jaką ścieżkę kliknięć mu podać.
- **Podział (TAN-227)**: jedna historyjka = jedna rzecz, którą Karol zobaczy; najwyżej 6 kryteriów i około 7 zmienianych plików. Większa praca to kilka historyjek połączonych `dependsOn`, w kolejności, w jakiej muszą wejść. Dolna granica: każda historyjka płaci stały start (ok. 34 tys. tokenów kontekstu i swoje kroki pipeline), więc drobne zmiany w tym samym miejscu zostają w jednej; poniżej ok. 3 plików nie dzielisz, chyba że części są niezależne. Szczegóły i przykład: `reference/standard-historyjki.md`, „Podział”.
- Forma pól: akapity i listy z „- ”; bez nagłówków, emoji, pogrubień, tabel i numeracji. `story_add` i `story_edit` (w konektorze `create_ticket`, `update_ticket`) zwracają `hint`, gdy brakuje „Kto:”, intencja wygląda jak polecenie albo historyjka ma ponad 6 kryteriów lub ponad 8 plików do zmiany: popraw albo podziel od razu.
- Historyjek w Running, Automated Testing i Done nie zmieniasz (`story_edit` odmawia); nieczytelną opisz w `story_comment`.
- Konektor Trio oddaje najwyżej 24 KB naraz: plany, raporty i dokumentacja w Markdown z podsumowaniem na górze i sekcjami do 24 KB; dłuższy materiał jako plik `.md` (`story_attach`) albo `create_doc`.
- Makieta do akceptacji (TAN-223): zawsze załącznik ticketu `<KLUCZ>.mockup.html`, potem pytanie „makieta w zakładce Pliki ticketu”; ścieżka do pliku nie wystarcza.
- Przebieg zmian (`walk`: `lead` i 2–5 kroków z `title`, `text`, `docs`, `check`) przy raporcie końcowym z zmianą w modelu: kształt w `reference/standard-historyjki.md`.

## Jak pisać do Karola (TAN-121)

Pięć reguł jest w skillu tandem („Jak pisać do Karola”); przykłady i uzasadnienia: `reference/jak-pisac-do-karola.md`.

## Zasady

- Informacja dla Claude (TAN-72): Karol dopisuje wskazówki do historyjki w każdej kolumnie (zakładka „Dla Claude”, w czacie `add_note`). Czytasz je przy planowaniu, budowie i ponownym przebiegu, a w Running przy najbliższym kroku; każdą potwierdzasz w historii (`acks`): uwzględnione albo dlaczego nie.
- Historia, kryteria, decyzje i zmiany w modelu żyją w tickecie, nie w czacie; w czacie jedno zdanie i klucz historyjki.
- Krótkie zdania, po polsku, jak Karol. W poleceniu i komentarzach technicznych słownictwo Mendix (entity, microflow, sub-microflow, page, snippet, module role, XPath); w części dla Karola prosty język.
- Nic nie przechodzi między modułami bez wyraźnego polecenia. Moduły Marketplace zostają w spokoju.
- Przed zmianą w modelu prawdziwej aplikacji: kopia repo na dysku i tag w git (zasada backupu Karola).
- Pauza na Teraz: nie bierzesz nowej historyjki, bieżącą kończysz. Przy wyłączniku awaryjnym czytasz i proponujesz, niczego nie zapisujesz. Zmiany w Mendix zawsze przez pliki (TAN-19).
- Nigdy sam (TAN-108): obejście strażnika albo zmiana jego ustawień („Prawdziwy projekt”), prawdziwe dane i `.mpr` prawdziwego projektu bez zgody, rotacja kluczy, scalenie w mxcraft-skills bez „gotowe”, wydanie na prod, DNS i Cloudflare, usuwanie gałęzi i plików spoza obszaru ticketu. Resztę błędów klasyfikujesz i próbujesz obejść według skilla tandem („Eskalacja”) i Atlasu „Gdy pipeline staje”; Karola pytasz po wyczerpaniu prób.

## Pomysły i narzędzia

Pomysł (zakładka Pomysły, `<PREFIX>-I<n>`) to rozmowa przez kilka sesji przed historyjkami, nie ticket. W konektorze Trio: `idea_create`, `idea_get`, `idea_update` (`note`, status `ready`); `idea_to_stories` tylko po decyzji Karola (najpierw lista, pytanie Draft czy To do; `todo` wymaga `confirm=true`). Planowanie (refinement, `idea_to_stories`): sesja planująca czyta kod raz i wpisuje każdej zakładanej historyjce części Where, Check i Out of scope, żeby sesja budowy zaczynała od wskazówek, a nie od szukania. Narzędzia (serwer MCP `tandem`, bez MCP `bin/db.js`): `reference/narzedzia.md`.

## Pliki pomocnicze (`reference/`, obok tego pliku)

- `reference/tablica-pipeline.md`: tabela kolumn pipeline, testy partiami, układ rodzinny, orkiestrator, dwie drogi Mendix, jeden job. Czytaj, gdy sprawa dotyczy kolumn, testów, wdrożenia albo zatrzymanej historyjki.
- `reference/standard-historyjki.md`: pełny standard historyjki, podział na mniejsze, `walk`, forma, rozmiar. Czytaj przy zakładaniu, zmianie, refinemencie historyjki i przy raporcie z modelem.
- `reference/przyklad-ab3.md`: wzór historyjki przed i po. Czytaj, gdy piszesz historyjkę i chcesz wzór.
- `reference/rytm-historyjki.md`: pełny tekst rytmu. Czytaj, gdy skrót nie rozstrzyga.
- `reference/jak-pisac-do-karola.md`: pięć reguł z przykładami. Czytaj, gdy serwer odrzuci podsumowanie albo piszesz zatrzymanie, pytanie, wpis historii.
- `reference/nazwy-na-ekranie.md`: słownik polskich nazw kolumn, zakładek, kroków i stanów. Czytaj, gdy potrzebujesz nazwy z ekranu.
- `reference/wydanie-blok.md`: blokada historyjek w wydaniu na prod. Czytaj, gdy narzędzie odmawia zmiany.
- `reference/narzedzia.md`: pomysły (konektor) i praca bez MCP. Czytaj, gdy Karol mówi o pomyśle albo brak serwera MCP.
