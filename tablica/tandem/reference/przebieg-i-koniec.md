# Tandem · Przebieg, tokeny i koniec historyjki (pełny tekst)
Plik pomocniczy skilla tandem (tekst przeniesiony bez zmian z SKILL.md, TAN-225). Czytasz go, gdy rdzeń nie wystarcza: szczegóły raportowania, liczenia tokenów, tablicy rodzinnej, treści commitu.

## Przebieg: zgłaszaj, zanim zrobisz

1. **Plan kroków na start.** Zaraz po `story_next` wyślij `run_report` z `plan`:
   3–6 kroków po polsku, np. `["Czytam model i SD-22", "Buduję sekcję SLA na stronie",
   "Uruchamiam testy", "Oceniam kryteria, przenoszę do Done", "Podsumowanie i tokeny"]`.
2. **Każdy krok dwa razy.** Na początku `step: { no, status: "now" }` i `message`
   jednym zdaniem. Na końcu `step: { no, status: "done", tokensIn, tokensOut }`
   oraz `note`, jeśli coś ostrzegło (test z ostrzeżeniem, pusty temat szablonu).
3. **Komunikat** (`message`) to jedno zdanie o tym, co się właśnie dzieje:
   „Test 2 z 4 przechodzi, uruchamiam test 3”. Pojawia się w panelu „Claude pracuje”.
4. **Pytanie bez odpowiedzi** → `run_ask` z założeniem, które przyjmujesz
   („48 h liczę kalendarzowo; jeśli robocze, napisz, użyję SUB_CheckDayOff”). Idź dalej.
   **Pytanie, bez którego nie da się iść dalej** (żadne założenie nie jest bezpieczne:
   zły kierunek zmarnowałby pracę albo dotknąłby danych) → `run_wait` z `question`, `why`
   (czego bez odpowiedzi nie zrobisz) i opcjonalnie `step`. Ticket zostaje w swojej kolumnie
   z oznaczeniem „Potrzebna odpowiedź” (czerwona ramka, strona „Potrzebna Twoja odpowiedź”);
   **nigdy nie cofaj go do To do** (`story_move` odmówi). Potem `run_report` z tokenami do
   tej chwili i koniec tury jednym zdaniem. Po odpowiedzi Karola `tandem-watch` uruchamia
   `/tandem KLUCZ`, a `story_next` zwraca `resumeFrom` (krok i odpowiedzi) i hint: wznawiasz
   od tego kroku na istniejącym planie (bez nowego `plan`). `story_next` przy pytaniu bez
   odpowiedzi zwraca `waitingForAnswer` i nic nie bierze.
5. **Informacja dla Claude (TAN-72).** Karol może w każdej kolumnie dopisać do historyjki wskazówkę. Nieprzeczytane
   przychodzą w `claudeNotes` (`story_next`, `sprint_read`, `plan_read`, a w trakcie pracy w odpowiedzi na `run_report`
   i `step_report`, bez przerywania przebiegu). Uwzględnij każdą i potwierdź w `acks: [{ id, text }]` (`run_report` albo
   `story_comment`): co zrobiłeś albo dlaczego nie. Nieuwzględnionej nie zostawiaj bez potwierdzenia.
6. **Decyzje i zmiany w modelu** → `story_comment` z `decision` albo `change`,
   w chwili, gdy je podejmujesz, nie na końcu.
   Raport, log albo zrzut, który Karol ma przeczytać, dołącz do ticketu
   (`story_attach` z `text` albo `base64`), zamiast odsyłać go do pliku w repo.
   **Makieta do akceptacji** (TAN-223): Karol ogląda ją na laptopie, więc ścieżka do pliku na Macu nic mu nie daje.
   Dołącz ją `story_attach` jako `<KLUCZ>.mockup.html`: jeden samodzielny plik, style w środku, obrazy tylko jako
   `data:`, bez skryptów i bez zasobów z zewnątrz. Tandem rysuje jako stronę (w piaskownicy) tylko plik z końcówką
   `.mockup.html`; inny `.html` pokaże jako tekst. Najpierw załącznik, potem `run_wait`, a pytanie mówi „makieta
   w zakładce Pliki ticketu”, nigdy ścieżka w repo. `run_wait` z ścieżką `.html` w `docs/` albo `mockups/` bez
   załącznika `*.mockup.html` odmawia i mówi, co zrobić.
   **Wynik w załączniku** (TAN-76): gdy wynikiem jest paczka, ZIP albo eksport, dołącz go `story_attach`, trzymaj
   źródła paczki w `dist/` (albo w ścieżkach `pipeline.deliverablePaths` projektu) i wpisz je w `result.files`;
   pipeline pominie testy aplikacji z notką „wynik w załączniku: <plik>”, scali gałąź z main i da Done.
   Nie zmieniaj obok kodu aplikacji, modelu ani bazy: wtedy testy idą jak zawsze.
7. **Stop.** Gdy `run_report` zwróci `stop: true`, Karol zlecił zatrzymanie: dokończ
   bieżący krok, wyślij `summary` i `result`, zostaw historyjkę w Running (albo
   przenieś do Done / Automated Testing, jeśli praca jest skończona) i zakończ jednym zdaniem.
8. **Praca równoległa** (TRIO-68). Gdy watch uruchomił Cię w worktree (`<repo>-wt/<KLUCZ>`,
   gałąź `tandem/<klucz>`, mówi o tym dopisek w prompcie systemowym), zmieniasz pliki tylko tam,
   commitujesz na tej gałęzi (temat „KLUCZ: …”), nie pushujesz i nie scalasz; w `run_report`
   `result.branch` to ta gałąź. Scala wdrożenie po Done, po kolei z innymi historyjkami.
9. **Nic w tle.** Sesja bez terminala (`claude -p`, np. z `tandem-watch`) kończy się
   razem z turą i zabija wszystko, co puściłeś w tle: testy giną, historyjka zostaje
   w Running. Każde polecenie, także pełny zestaw testów, uruchamiaj na pierwszym
   planie, z `timeout` do 1800000 ms (30 min) i wynikiem przez `| tail -30`. Tury nie
   kończ zdaniem „dokończę, gdy testy się skończą”: koniec tury to historyjka
   w Done albo Automated Testing (albo zatrzymanie z punktu 7).
10. **Mniej wywołań** (TAN-85). Każde wywołanie narzędzia wysyła całą rozmowę od nowa, więc koszt budowy to
   liczba wywołań × kontekst (SD-94: 126 wywołań, 15,7 mln). Jakość się nie zmienia: te same testy i sprawdzenia,
   tylko w mniejszej liczbie wywołań.
   - **Raport razem z pracą.** `run_report`, `step_report` i `story_comment` wysyłasz w tym samym bloku co następne
     narzędzie (koniec kroku N + start kroku N+1 + pierwsze polecenie kroku N+1 w jednej wiadomości), nigdy jako
     osobne wywołanie przed albo po pracy. Sam raport tylko na końcu tury (`summary`, `result`).
   - **Polecenia w jednym Bash.** Kilka poleceń, które od siebie nie zależą albo zależą tylko po kolei
     (`grep …; sed -n …; wc -l …`, edycja i od razu testy `&& node --test … | tail -30`), łączysz w jedno wywołanie.
     Osobno tylko wtedy, gdy kolejny krok zależy od tego, co zobaczysz (wybór pliku po grepie), albo polecenie
     zmienia coś trudnego do cofnięcia (git, baza, wdrożenie): wtedy jedno na raz, żeby zobaczyć błąd.
   - **Duże odczyty przez subagenta.** Przegląd wielu plików, cały moduł, duży dokument modelu Mendix (mikroflow,
     strona, eksport) albo wynik powyżej ok. 3 tys. tokenów: subagent (Explore albo `model: haiku`) zwraca streszczenie
     z `plik:linia`, nie treść. Sam czytasz tylko linie, które zmieniasz.
   - **Zwijanie przy ok. 150 tys.** Sesje z `tandem-watch` zwijają rozmowę same przy 75% okna (ok. 150 tys. z 200 tys.,
     `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` w `lib/executor.js`). Zanim kontekst tam dojdzie, stan pracy ma być w tickecie,
     nie tylko w rozmowie: plan i ukończone kroki w `run_report`, decyzje w `story_comment`. Po zwinięciu zaczynasz
     od `sprint_read` / `story_next` z `key` tej historyjki (kryteria, plan, kroki, decyzje wracają z serwera)
     i idziesz od pierwszego kroku bez `done`.


## Tokeny: jak je liczyć

Tokeny wejścia i wyjścia to miara zużycia. Dolary liczy skrypt (`usd` niżej), nie Ty: odczyty z cache są
większością wejścia i kosztują ułamek zwykłego wejścia, więc mnożenie całego wejścia przez cenę zawyża koszt
około dziesięć razy (Karol, 2026-10-18).

- Prawdziwe zużycie jest w zapisie sesji Claude Code: `~/.claude/projects/<folder>/<id-sesji>.jsonl`,
  w każdej linii `type: "assistant"` pole `message.usage` (licz każdy `message.id` raz).
  Wejście = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`
  (odczyty z cache też są tokenami), wyjście = `output_tokens`. Suma od pierwszej
  wiadomości sesji (analiza, pisanie historyjki) do podsumowania: `estimated: false`.
  Na koniec historyjki wyślij ją w `run_report` jako `tokens` (suma dla całej historyjki);
  per krok podawaj różnicę tej sumy między początkiem a końcem kroku.
- Licz to skryptem Tandem, który od razu dzieli tokeny na rodzaj pracy (analiza, pytania,
  budowa, testy, wdrożenie, ticket i raport):
  `node "$TANDEM_DIR/bin/tokens.js" <id-sesji> --since <czas startu historyjki>` (`--table` pokazuje tabelę).
  Wynik JSON (`in`, `out`, `estimated: false`, `parts`, `usd`, `byKind`) wyślij w całości jako `run_report.tokens`;
  sprint w MxCraft i Tandem pokazuje z tego, na co poszły tokeny, a z `parts` i `usd` orientacyjny koszt tej
  pracy przez firmowe API (Vertex AI, endpoint wybrany w ustawieniach).
- Licznik `total_tokens … left` w sesji to budżet kontekstu, nie zużycie: nie raportuj
  jego różnic (MXC-7 wyszło z niego 422 tys., a naprawdę było 18,6 mln).
- Bez dostępu do zapisu sesji **szacuj**: znaki ÷ 4 za wejście i wyjście, z `estimated: true`;
  Tandem pokaże „≈”. Karol chce liczb faktycznych, więc szacunek to ostateczność.
- Nie zaokrąglaj do zera. Krok bez tokenów to krok, którego nie było.

## Koniec historyjki

0. **Tablica rodzinna (GEN-77).** Gdy `sprint_read.columns` ma tylko `todo`, `running` i `done` w projekcie z pipeline (projekt
   dziecka, ustawienie `columns.preset` = `family`), nie ma kolumny Testy: budowa sprawdza się sama. Przed `story_move` uruchom
   albo otwórz to, co zbudowałeś (strona: otwórz w przeglądarce i sprawdź, że się rysuje i że przyciski działają; aplikacja albo
   gra: uruchom i przejdź jedną rundę, przy logice mały skrypt testowy; prezentacja: otwórz i sprawdź, że slajdy się
   wyświetlają; dokument: otwórz PDF) i zapisz wynik w `run_report` z `selfCheck: [{ what, result, evidence }]`: `what` co
   uruchomiłeś albo otworzyłeś, `result` pass, fail albo skipped, `evidence` linia wyniku, otwarta strona albo ścieżka zrzutu.
   Bez zapisu z tej rundy `story_move` do `done` odmawia, z czerwonym sprawdzeniem też. Popraw i sprawdź jeszcze raz. Do Gotowe
   idzie rzecz, która się uruchomiła. Dziecko czyta prosty polski; nazwy kroków pipeline'u zostają dla Ciebie.

1. **Sprawdź sam** całość (testy jednostkowe, przeglądarka, kopia projektu) i opisz wynik
   w `story_comment`. Testu dla Karola nie zakładasz: w Tandem nie ma testu człowieka.
   W projekcie z pipeline każde kryterium dostaje przypadek dla automatycznego kroku testu UI
   (`test_cases_set` z `criterion`, przy regule też `rule`) albo zapisany powód, dlaczego nie da się go
   zautomatyzować (`reference/od-planu-do-sprintu.md` w skillu sprinter, „Zrobione”); to scenariusze
   dla pipeline'u, nie dla Karola. Historyjek dla
   środowiska testowego nie zakładaj bez polecenia Karola.
2. **Oceń kryteria** przed `story_move`: `run_report` z `criteria: [{ index, done, evidence }]`
   dla każdego kryterium (`index` od 0, jak w `acceptance` ze `story_next`). `evidence`
   to jedno zdanie, skąd wiesz (test, zrzut, wynik w przeglądarce); przy niespełnionym
   `done: false` i powód. Karol niczego nie odhacza; gdy się nie zgadza, odsyła
   z uwagami. `story_move` przypomni w `hint` o kryteriach bez oceny.
3. `run_ask` „Chcesz coś sprawdzić sam przed wydaniem?” najwyżej po partii zmian (kilka
   historyjek jednej funkcjonalności, koniec sprintu), nie po każdej historyjce.
   Karol nie testuje w Tandem; historyjka ma mu powiedzieć, co zrobiłeś.
4. `story_move` do `done`. W projekcie z pipeline: do `autotest` (Automated Testing);
   po zielonych testach automatycznych pipeline sam przeniesie ją do Done (GEN-29: bez Human
   Testing, chyba że projekt ma `pipeline.humanTesting`) i zapisze to w historii, a z `gitFlow`
   skrypt commituje ją na gałęzi test. Dawne `testing` serwer przyjmie jako koniec budowy
   (→ done / autotest), ale pisz `done` / `autotest`. Konflikt cherry-picku na ACCP (ticket
   zatrzymany w Acceptance) rozwiązujesz Ty: commity tej historyjki z test na ACCP,
   `git cherry-pick -x`, jeden commit nigdy dla dwóch historyjek.
5. `run_report` z `summary` (najwyżej 3 zdania po polsku dla Karola, bez nazw plików i narzędzi; technikalia
   w `summaryTech`, „Jak pisać do Karola”; nazwy z modelu w nawiasach monospace nie są potrzebne, Tandem je
   wyróżni) i `result`:
   - `model`: `["ServiceDesk.SE_Ticket_Escalate · nowe zdarzenie co 60 min", …]`
   - `sprinter`: `["SD-15 · Running → Done"]` (z pipeline: `"SD-15 · Running → Automated Testing"`)
   - `files`: `["descriptions.json · 1 nowy opis"]` – ścieżka od korzenia repo przed „ · ”, każdy
     zmieniony plik. Wdrożenie po Done commituje tylko te pliki; bez listy przy cudzych zmianach
     w folderze projektu staje (D26).
   - `branch`: gałąź z Twoim kodem, gdy pracowałeś w worktree (`claude/mxc-91-…`); wdrożenie
     sprawdzi, czy jest scalona z origin, i niczego nie commituje za Ciebie.
   - `repos`: każda gałąź, którą zostawiłeś w **innym** repo niż projekt (np. mxcraft-skills),
     `[{ repo: "mxcraft-skills", branch: "skill/ml-74-consolidate", commit: "1234776" }]` (`dir`, gdy kopia
     nie leży w `~/Projects/<repo>`). Taki ticket nigdy nie jest „dokumentem”: „Scalenie z main” sprawdza,
     czy commit jest w main tego repo, inaczej wypycha gałąź, otwiera PR (`gh`) i ticket czeka w Automated
     Testing („czeka na scalenie …”). Do main obcego repo nie scalasz sam (TAN-55).
6. **Commit robi Tandem przy Done** (Mendix w trybie partiami: jeden commit „KLUCZ: tytuł” w folderze aplikacji,
   tylko pliki historyjki i model, `modules/mendix/lib/pipeline/sprint-loop.js`; kod: wdrożenie z `result.files`;
   worktree: Twoje commity na gałęzi, scala wdrożenie). W folderze projektu sam nie commitujesz.
   **Treść commitu po angielsku** piszesz tylko, gdy nikt nie commituje za Ciebie (Mendix z
   `pipeline.mendix.commitPerStory: false`, wtedy commit robi Karol): pierwsza linia do 72 znaków z kluczem
   („SD-22: Let accounting raise myConnect tickets from SD”), pusta linia, potem 3–8
   punktów „- ” z tym, co zmieniłeś (nazwy dokumentów z modelu, nowe atrybuty,
   gałęzie), i na końcu numer zlecenia, jeśli jest (US#…). Zapisz ją w tickecie przez
   `story_attach` jako `commit-message.txt` i pokaż w czacie w bloku kodu. Po
   każdej poprawce po odrzuceniu nowa treść tylko o tej poprawce. Commit nie zmienia
   statusu historyjki; Done nie czeka na niego.
7. W czacie dwa zdania (plus blok z treścią commitu, gdy ją pisałeś) i koniec tury: „SD-15 w Done; 412k
   tokenów, 11:27. Następną weźmie nowa sesja.” (z pipeline: „SD-15 w Automated Testing; …”) Nie wołasz `story_next`.
   (Tylko gdy `settings.oneStoryPerSession` jest `false`: `story_next` – następna,
   chyba że `paused`.)


