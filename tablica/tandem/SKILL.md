---
name: tandem
description: Prowadzenie jednej historyjki ze sprintu w Tandem – Claude bierze dokładnie jedną historyjkę z To do (następną albo wskazaną kluczem), raportuje kroki z czasem i tokenami wejścia i wyjścia (miara zużycia; orientacyjny koszt w dolarach liczy bin/tokens.js), ostrzeżenia i ostatni komunikat, dopisuje pytania do „do sprawdzenia przez Ciebie” zamiast pytać w czacie, ocenia kryteria, przenosi do Done (z pipeline: do Automated Testing) i zapisuje podsumowanie z wynikiem (zmiany w modelu, w Sprinterze, w plikach) i kończy turę: następną historyjkę bierze nowa sesja z pustym kontekstem (pętla bin/tandem-loop.js). Używaj, gdy Karol pisze "/tandem", "weź następną historyjkę", "pracuj ze sprintu", "co jest w sprincie", "zrób kolejkę", albo gdy sesja ma wykonywać historyjki z MxCraft/Tandem bez rozmowy o każdym kroku. Wymaga skilla sprinter (zasady) i serwera MCP tandem albo plików projektu.
argument-hint: [next | status | <KLUCZ>]
---

# Tandem: historyjka od wzięcia do Done, z tokenami

Wersja 0.10 · 2026-10-24 (GEN-26: bez testu człowieka; skrypty z folderu Tandem: `$TANDEM_DIR`, GEN-19. 0.9: praca równoległa w osobnym worktree, TRIO-68)

Karol patrzy na postęp w Tandem (http://127.0.0.1:4291/), nie w czacie. Twoja praca
ma być tam widoczna krok po kroku: co robisz, ile to trwa i ile kosztuje w tokenach.
Zasady zespołu są w skillu `sprinter`; ten skill mówi, **jak raportować**.
Kontekst trzymaj mały według skilla `lean-context` (grep przed cat, bez drugiego
czytania pliku, Edit zamiast przepisywania): każde wywołanie narzędzia czyta cały kontekst od nowa.

## Jedna historyjka na sesję

`/tandem` bierze **dokładnie jedną** historyjkę i na niej kończy. Po ocenie kryteriów,
`story_move` do Done (z pipeline: do Automated Testing) i podsumowaniu kończysz turę zdaniem
**„Następną weźmie nowa sesja.”** Nie wołasz `story_next` drugi raz i nie bierzesz
kolejnej w tym samym kontekście, nawet gdy kolejka nie jest pusta. Powód: każda
kolejna historyjka w tej samej sesji wlecze za sobą kontekst poprzedniej, a tokeny
są jedyną miarą kosztu. Kolejną bierze nowa sesja z pustym kontekstem: Karol
uruchamia `/tandem` jeszcze raz albo pętlę `node bin/tandem-loop.js` z repo Tandem,
która startuje `claude -p "/tandem"` w nowym procesie dla każdej historyjki.

Serwer MCP tego pilnuje: drugie `story_next` bez `key` w tej samej sesji zwraca
`sessionDone: true` i nic nie bierze. Wyjątki:

- `/tandem KLUCZ` – Karol sam wskazał historyjkę; bierzesz ją, nawet jeśli w tej
  sesji była już inna. Po niej znów koniec.
- `alreadyRunning` – historyjka została w Running po poprzedniej sesji; dokończ ją.
  To jest Twoja jedna historyjka.
- Przełącznik „Jedna historyjka na sesję” wyłączony w Tandem (ekran Skille,
  `settings.oneStoryPerSession: false`): po podsumowaniu wołasz `story_next` i idziesz
  dalej w tej samej sesji, dopóki kolejka nie jest pusta albo `paused`.

Niezależnie od przełącznika obowiązuje zasada **jeden job na projekt**: dopóki
historyjka projektu jest w Running albo w Automated Testing, `story_next` nic nie bierze
(zwraca listy `running` / `autotest`, „czeka na testy automatyczne”), a pętle
`tandem-loop` i `tandem-watch` czekają. Done nigdy nie blokuje: następną bierze nowa
sesja, gdy poprzednia jest w Done. `tandem-watch` nie startuje sesji także przy
historyjce zatrzymanej przez pipeline (`halted` w `sprint_read`: zostaje w swojej
kolumnie z czerwoną ramką, nigdy nie wraca sama do Draft, MXC-137) – kolumny i kto co
przesuwa: skill sprinter, „Tablica z pipeline”. Done ustawiasz Ty (`story_move` do
`done`) albo, w projekcie z pipeline, sam pipeline po zielonych testach automatycznych;
nie czeka na Karola ani na jego commit.

## Start

- `/tandem` albo `/tandem next`: `sprint_read`, potem `story_next`. Jeśli zwróci
  `paused`, `sessionDone` albo pustą kolejkę, powiedz to jednym zdaniem i stop.
  `alreadyRunning` znaczy: dokończ tę, która jest w Running.
- `/tandem status`: `sprint_read` i trzy zdania: co w Running (w pipeline też Automated Testing), na co Karol ma odpowiedzieć (`run_wait`, `run_ask`),
  ile tokenów w sprincie. Niczego nie zmieniaj.
- `/tandem SD-15`: `story_next` z `key`; to Twoja jedyna historyjka w tej sesji.

**Kto prowadzi.** Przy każdym `story_next` podaj `host` (nazwa komputera: na Macu
`scutil --get LocalHostName`, gdzie indziej `hostname -s`)
i `session` (pierwsze 8 znaków id tej sesji Claude Code, czyli nazwy pliku
`~/.claude/projects/<folder>/<id-sesji>.jsonl`; bez dostępu pomiń, serwer da losowy id).
Serwer zajmuje historyjkę atomowo i zapisuje Cię w `run.by`; Karol widzi komputer i sesję
na karcie, w pasku „Claude pracuje” i na Teraz. Dwie sesje nigdy nie dostaną tej samej
historyjki. `runningElsewhere` znaczy: historyjkę prowadzi inna sesja – niczego nie bierz,
powiedz to jednym zdaniem i stop. Po 30 min bez `run_report` historyjka ma „bez sygnału”
i Karol może ją zwolnić w MxCraft albo w Tandem; gdy `run_report` odpowie, że Karol ją zwolnił, zakończ
turę bez dalszej pracy.

Historyjki przypisane do Karola mogą stać w To do, ale ich sam nie bierzesz: kolejka
(`sprint_read.queue`) i `story_next` bez `key` je pomijają (są w `forKarol`), bierzesz
taką tylko wtedy, gdy Karol poda jej klucz.

**Skrypty.** `$TANDEM_DIR` to folder repo Tandem (zwykle `~/Projects/Tandem`; bez zmiennej podstaw
ten folder). Liczenie tokenów i zapis do bazy są w `$TANDEM_DIR/bin/`, skrypty Mendix
(model, porty, silnik) w `$TANDEM_DIR/modules/mendix/bin/`. Stare ścieżki z folderu MxCraft
przekierowują tu do czasu jego wyłączenia (GEN-20).

Projekt: ten wybrany w Tandem (`tandem/current`). Gdy narzędzie poprosi o `project`,
podaj id z listy, którą zwróciło.

**Porty aplikacji testowej (projekt Mendix).** Zaraz po `story_next`, na komputerze, który
uruchamia aplikację testową (Mac), sprawdź jej porty:
`node "$TANDEM_DIR/modules/mendix/bin/mxcraft-ports.js" <projekt>`.
Skrypt porównuje port aplikacji i port admina projektu z portami innych projektów Mendix
(tablica i `~/Mx/tandem-watch.json`) i z tym, co teraz nasłuchuje na 127.0.0.1. Kod 0: wolne
albo projekt bez aplikacji testowej, nic nie mów. Kod 1: kolizja – przekaż Karolowi w jednym
zdaniu linię ze skryptu (kto trzyma port i „Użyj wolnych portów X/Y”) i dopisz to do „do
sprawdzenia przez Ciebie”. Portów sam nie zmieniaj: Karol ustawia je w Ustawieniach projektu →
Narzędzia Mendix (formularz podpowiada tę samą parę). Projekt bez Mendix: pomiń ten krok.

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
5. **Decyzje i zmiany w modelu** → `story_comment` z `decision` albo `change`,
   w chwili, gdy je podejmujesz, nie na końcu.
   Raport, log albo zrzut, który Karol ma przeczytać, dołącz do ticketu
   (`story_attach` z `text` albo `base64`), zamiast odsyłać go do pliku w repo.
6. **Stop.** Gdy `run_report` zwróci `stop: true`, Karol zlecił zatrzymanie: dokończ
   bieżący krok, wyślij `summary` i `result`, zostaw historyjkę w Running (albo
   przenieś do Done / Automated Testing, jeśli praca jest skończona) i zakończ jednym zdaniem.
7. **Praca równoległa** (TRIO-68). Gdy watch uruchomił Cię w worktree (`<repo>-wt/<KLUCZ>`,
   gałąź `tandem/<klucz>`, mówi o tym dopisek w prompcie systemowym), zmieniasz pliki tylko tam,
   commitujesz na tej gałęzi (temat „KLUCZ: …”), nie pushujesz i nie scalasz; w `run_report`
   `result.branch` to ta gałąź. Scala wdrożenie po Done, po kolei z innymi historyjkami.
8. **Nic w tle.** Sesja bez terminala (`claude -p`, np. z `tandem-watch`) kończy się
   razem z turą i zabija wszystko, co puściłeś w tle: testy giną, historyjka zostaje
   w Running. Każde polecenie, także pełny zestaw testów, uruchamiaj na pierwszym
   planie, z `timeout` do 1800000 ms (30 min) i wynikiem przez `| tail -30`. Tury nie
   kończ zdaniem „dokończę, gdy testy się skończą”: koniec tury to historyjka
   w Done albo Automated Testing (albo zatrzymanie z punktu 6).

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

1. **Sprawdź sam** całość (testy jednostkowe, przeglądarka, kopia projektu) i opisz wynik
   w `story_comment`. Testu dla Karola nie zakładasz: w Tandem nie ma testu człowieka.
   W projekcie z pipeline możesz podać przypadki dla automatycznego kroku testu UI
   (`test_cases_set`); to scenariusze dla pipeline'u, nie dla Karola. Historyjek dla
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
5. `run_report` z `summary` (3–5 zdań po polsku, nazwy z modelu w nawiasach
   monospace nie są potrzebne, Tandem je wyróżni) i `result`:
   - `model`: `["ServiceDesk.SE_Ticket_Escalate · nowe zdarzenie co 60 min", …]`
   - `sprinter`: `["SD-15 · Running → Done"]` (z pipeline: `"SD-15 · Running → Automated Testing"`)
   - `files`: `["descriptions.json · 1 nowy opis"]` – ścieżka od korzenia repo przed „ · ”, każdy
     zmieniony plik. Wdrożenie po Done commituje tylko te pliki; bez listy przy cudzych zmianach
     w folderze projektu staje (D26).
   - `branch`: gałąź z Twoim kodem, gdy pracowałeś w worktree (`claude/mxc-91-…`); wdrożenie
     sprawdzi, czy jest scalona z origin, i niczego nie commituje za Ciebie.
6. **Treść commitu po angielsku**, gdy commit robi Karol (model Mendix w Studio Pro,
   repo, którego nie commitujesz sam): pierwsza linia do 72 znaków z kluczem
   („SD-22: Let accounting raise myConnect tickets from SD”), pusta linia, potem 3–8
   punktów „- ” z tym, co zmieniłeś (nazwy dokumentów z modelu, nowe atrybuty,
   gałęzie), i na końcu numer zlecenia, jeśli jest (US#…). Zapisz ją w tickecie przez
   `story_attach` jako `commit-message.txt` i pokaż w czacie w bloku kodu. Po
   każdej poprawce po odrzuceniu nowa treść tylko o tej poprawce. Commit Karola
   nie zmienia statusu historyjki; Done nie czeka na niego.
7. W czacie dwa zdania (plus blok z commitem) i koniec tury: „SD-15 w Done; 412k
   tokenów, 11:27. Następną weźmie nowa sesja.” (z pipeline: „SD-15 w Automated Testing; …”) Nie wołasz `story_next`.
   (Tylko gdy `settings.oneStoryPerSession` jest `false`: `story_next` – następna,
   chyba że `paused`.)

## Zakładanie i zmiana historyjek (`story_add`, `story_edit`)

Każda historyjka, którą zakładasz albo zmieniasz, trzyma się standardu „Jak pisać
historyjkę” ze skilla sprinter: część **Dla Ciebie** dla Karola (intencja: dziś, po
zrobieniu, linia „Kto: Claude … Ty (Karol): …”, kryteria jako sprawdzalne zdania)
i część **Dla Claude · polecenie** (`prompt`), którą piszesz sam i według której potem
pracujesz. Linię „Kto” możesz podać osobno w `who: { claude, karol }`; Tandem dopisze ją
na końcu intencji. Gdy odpowiedź ma `hint`, popraw historyjkę od razu przez `story_edit`.
Historyjkę w Running, Automated Testing albo Done tylko komentujesz (`story_comment`).

## Gdy Karol odrzucił

Karol może odesłać historyjkę z Done przez „Popraw z uwagami”. Wtedy
`story_next` zwraca `fixes` (jego uwagi) i
`review` (co odhaczył, a co nie). Zacznij od uwag: pierwszy krok planu to „Czytam uwagi
Karola”, a `summary` na końcu mówi, co zmieniło się względem poprzedniej rundy.

## Bez serwera MCP (transport „przez pliki projektu”)

Te same pola zapisujesz przez `node "$TANDEM_DIR/bin/db.js" update projects/<p>/stories/<KLUCZ> -`
z JSON-em na stdin: `run` (cały obiekt z `steps`), `tokens`, `timeSec`, `review`,
`assignee`, `status`; wpis do historii przez `node "$TANDEM_DIR/bin/db.js" log <p> <KLUCZ> "tekst"`.
Tablice idą w całości. Strona odświeży się po zapisie pliku.
