---
name: tandem
description: Prowadzenie jednej historyjki ze sprintu w Tandem – Claude bierze dokładnie jedną historyjkę z To do (następną albo wskazaną kluczem), raportuje kroki z czasem i tokenami wejścia i wyjścia (miara zużycia; orientacyjny koszt w dolarach liczy bin/tokens.js), ostrzeżenia i ostatni komunikat, dopisuje pytania do „do sprawdzenia przez Ciebie” zamiast pytać w czacie, ocenia kryteria, przenosi do Done (z pipeline: do Automated Testing) i zapisuje podsumowanie z wynikiem (zmiany w modelu, w Sprinterze, w plikach) i kończy turę: następną historyjkę bierze nowa sesja z pustym kontekstem (pętla bin/tandem-loop.js). Używaj, gdy Karol pisze "/tandem", "weź następną historyjkę", "pracuj ze sprintu", "co jest w sprincie", "zrób kolejkę", albo gdy sesja ma wykonywać historyjki z MxCraft/Tandem bez rozmowy o każdym kroku. Wymaga skilla sprinter (zasady) i serwera MCP tandem albo plików projektu.
argument-hint: "[next | status | <KLUCZ>]"
---

# Tandem: historyjka od wzięcia do Done, z tokenami

Wersja 0.23 · 2026-11-12 (GEN-89: przypadek testowy pipeline na każde kryterium, ticket planistyczny odsyła do „od planu do sprintu” w skillu sprinter; historia wersji w `reference/historia-decyzji.md`.)

Karol patrzy na postęp w Tandem (http://127.0.0.1:4291/), nie w czacie: każdy krok widoczny, z czasem i tokenami. Kontekst trzymaj mały (skill `lean-context`). Rdzeń dla sesji budowy: potrzebne zasady ze skilla `sprinter` są niżej („Tablica i kto co robi”), sprintera czytasz tylko
przy planowaniu, refinemencie i zakładaniu historyjek. Pliki `reference/*.md`
leżą obok tego pliku i czytasz je na żądanie (spis na końcu).

## Jedna historyjka na sesję

`/tandem` bierze dokładnie jedną historyjkę i na niej kończy: po ocenie kryteriów, `story_move` i podsumowaniu kończysz
turę zdaniem „Następną weźmie nowa sesja.” Nie wołasz `story_next` drugi raz (serwer zwróci `sessionDone: true`).
- `/tandem` albo `/tandem next`: `sprint_read`, `story_next`. `paused`, `sessionDone` albo pusta kolejka: jedno zdanie i stop.
- `/tandem status`: `sprint_read`, trzy zdania (co w toku, na co Karol ma odpowiedzieć, tokeny sprintu); niczego nie zmieniaj.
- `/tandem KLUCZ`: `story_next` z `key`; to Twoja jedyna historyjka w tej sesji.
- `alreadyRunning`: dokończ tę z Running. `runningElsewhere`: prowadzi ją inna sesja, nic nie bierz, jedno zdanie i stop.
- `settings.oneStoryPerSession: false`: po podsumowaniu `story_next` i dalej, dopóki kolejka nie jest pusta albo `paused`.
- Jeden job na projekt: gdy historyjka projektu jest w Running albo Automated Testing, `story_next` nic nie bierze
  (Done nie blokuje; Mendix: drugi pas i dokumenty, `reference/mendix.md`, `reference/rzadkie-przypadki.md`).
- Przy `story_next` podaj `host` (Mac: `scutil --get LocalHostName`, gdzie indziej `hostname -s`) i `session`
  (pierwsze 8 znaków id sesji, nazwy pliku `~/.claude/projects/<folder>/<id>.jsonl`). Brak kroku i raportu przez 30 min =
  „bez sygnału”; gdy `run_report` odpowie, że Karol zwolnił historyjkę, kończysz bez dalszej pracy.
- Historyjki przypisane do Karola (`forKarol`) bierzesz tylko, gdy poda ich klucz.

## Co czytasz po `story_next`

Przed planem i pracą przeczytaj wszystko, co przyszło (szczegóły: `reference/rzadkie-przypadki.md`):
- `projectContext` i `projectRules`: trzymaj się ich; pierwszy krok planu to „Czytam kontekst projektu i uwagi”, a jego `message` mówi jednym zdaniem, co z kontekstu wpływa na historyjkę. Kontekstu sam nie zmieniasz.
- `columnRule` (reguła kolumny) i `karolNotes`, `fixes`, `review` (uwagi Karola z poprzedniej rundy: zaczynasz od nich, pierwszy krok „Czytam uwagi Karola”; `summary` mówi, co się zmieniło).
- `images` (zrzuty z ticketu): odczytaj Read-em przed krokiem 1 i przed każdym pytaniem, zgłoś `viewedImages` w `run_report`.
- `credentials`: `ok: true` = nic nie pytasz; `missing` = przed pracą JEDNO `run_wait` z `credentials.wait`, `run_report` z tokenami, koniec tury.
- `claudeNotes` (informacja Karola dla Claude, TAN-72): uwzględnij każdą i potwierdź w `acks: [{ id, text }]` (`run_report` albo `story_comment`).
- `scoutBriefing` (Mendix): przeczytaj przed planem, ryzyka P1 uwzględnij; `scoutWarning` = planuj dalej, dopisz do „do sprawdzenia”.
- `resumeFrom`: wznów od tego kroku na istniejącym planie (bez nowego `plan`); `waitingForAnswer`: nic nie bierz.
- Projekt Mendix: zaraz po `story_next` sprawdź porty (`node "$TANDEM_DIR/modules/mendix/bin/mxcraft-ports.js" <projekt>`, kod 1 = kolizja, jedno zdanie do Karola, sam portów nie zmieniasz). Rodzaj ticketu mówi `story.planning`: planistyczny i budowy opisuje `reference/mendix.md`; model zmieniasz zawsze przez pliki (tools/mpr), nigdy przez MCP Studio Pro.
- `$TANDEM_DIR` to folder repo Tandem (zwykle `~/Projects/Tandem`); skrypty: `$TANDEM_DIR/bin/`, Mendix `$TANDEM_DIR/modules/mendix/bin/`. MxCraft jest wyłączony (GEN-20), jego skryptów nie wołasz.

## Tablica i kto co robi (z sprintera, dla sesji budowy)

- Karol mówi, czego chce, ustala kolejność, odpowiada na pytania i sam wypuszcza na prod. W Tandem nie testuje (testu człowieka nie ma, GEN-26). Claude buduje, dopisuje testy automatyczne, ocenia kryteria i przenosi do Done (z pipeline: do Automated Testing). Done ustawiasz Ty albo pipeline, nigdy Karol; Done nie czeka na jego commit.
- Kolumny: To do · Running · Done. Projekt z pipeline: Draft · To do · Running · Automated Testing · Done · Acceptance/On Prod. Draft to Karol; To do = „buduj”; Running = Twoja budowa; Automated Testing = pipeline (zatrzymanego `halt` nie przesuwasz sam); Acceptance/Prod przesuwa Karol. Tablica rodzinna (tylko To do, Running, Done): przed Done `selfCheck` (`reference/przebieg-i-koniec.md`).
- Ticket planistyczny idzie To do → Running → Done z planem w MxScout, bez budowy; ticket budowy buduje.
- Historyjka w wydaniu na prod jest zablokowana (przeniesienie i edycja); nie obchodź, komentarz przechodzi (`reference/rzadkie-przypadki.md`).
- Historia, kryteria, decyzje i zmiany w modelu żyją w tickecie, nie w czacie; w czacie jedno zdanie i klucz. Nigdy nie omijaj odmowy Tandem zapisem w plikach.
- Pauza (Pauza/Wznów na Teraz): nie bierzesz nowej, bieżącą kończysz.
- Przed zmianą prawdziwej aplikacji: kopia repo i tag w git. Nic nie przechodzi między modułami bez polecenia; Marketplace zostaje w spokoju.
- Nigdy sam (TAN-108), zawsze pytasz: obejście strażnika albo jego ustawień, prawdziwe dane i `.mpr` bez zgody, rotacja kluczy, scalenie w mxcraft-skills bez „gotowe”, wydanie na prod, DNS i Cloudflare, usuwanie gałęzi i plików spoza obszaru ticketu.

## Przebieg: zgłaszaj, zanim zrobisz

1. **Plan** zaraz po `story_next`: `run_report` z `plan` (3–6 kroków po polsku, każdy to czasownik i przedmiot).
2. **Każdy krok dwa razy**: `step: { no, status: "now" }` + `message` (jedno zdanie, co się dzieje); na końcu `step: { no, status: "done", tokensIn, tokensOut }` + `note`, gdy coś ostrzegło. Krok bez tokenów to krok, którego nie było.
3. **Pytanie bez odpowiedzi**: `run_ask` z założeniem i idź dalej. **Pytanie, bez którego nie da się iść dalej**: `run_wait` (`question`, `why`, `step`), potem `run_report` z tokenami i koniec tury. Ticket zostaje w swojej kolumnie z „Potrzebna odpowiedź”; nigdy nie cofaj go do To do. Po odpowiedzi wznawia go `/tandem KLUCZ` z `resumeFrom`.
4. **Decyzje i zmiany w modelu**: `story_comment` z `decision` albo `change` w chwili decyzji. Raport, log, zrzut dla Karola: `story_attach`. Makieta do akceptacji (TAN-223): `story_attach` jako `<KLUCZ>.mockup.html` (jeden plik, style w środku, obrazy `data:`, bez skryptów i zasobów z zewnątrz), dopiero potem `run_wait` z „makieta w zakładce Pliki ticketu”, nigdy ścieżka. Wynik w paczce (ZIP, eksport): `story_attach`, źródła w `dist/` (albo `pipeline.deliverablePaths`) i w `result.files`.
5. **Stop**: gdy `run_report` zwróci `stop: true`, dokończ krok, wyślij `summary` i `result`, historyjkę zostaw w Running (albo Done / Automated Testing, jeśli skończona) i zakończ jednym zdaniem.
6. **Worktree** (dopisek w prompcie systemowym, `<repo>-wt/<KLUCZ>`, gałąź `tandem/<klucz>`): zmieniasz pliki tylko tam, commitujesz na tej gałęzi (temat „KLUCZ: …”), nie pushujesz i nie scalasz; `result.branch` to ta gałąź. Scala wdrożenie po Done.
7. **Nic w tle**: sesja bez terminala (`claude -p`) ginie z turą i zabija procesy w tle. Wszystko na pierwszym planie, `timeout` do 1800000 ms, wynik przez `| tail -30`. Nie kończ tury zdaniem „dokończę, gdy testy się skończą”: koniec tury to historyjka w Done / Automated Testing albo stop z pkt 5.
8. **Mniej wywołań** (TAN-85): koszt to liczba wywołań × kontekst. `run_report`, `step_report`, `story_comment` wysyłaj w tym samym bloku co następne narzędzie, nie osobno; niezależne polecenia w jednym Bash; duże odczyty (wiele plików, duży dokument Mendix, wynik >3 tys. tokenów) przez subagenta, który zwraca streszczenie z `plik:linia`. Przy ok. 150 tys. kontekstu (sesja zwija się sama przy 75%) stan pracy ma być w tickecie (plan i kroki w `run_report`, decyzje w `story_comment`); po zwinięciu zaczynasz od `story_next` z `key` i idziesz od pierwszego kroku bez `done`.
9. **Gdy krok staje** (TAN-108): najpierw klasa błędu i obejście, dopiero potem Karol; reguły i tabela w `reference/eskalacja.md`. Skrót: przejściowy = ponów po 1, 5, 15 min (stajesz po 3 porażkach); wina otoczenia (czerwone też na origin/main) = ostrzeżenie, ticket naprawczy; wina ticketu = poprawiasz sam, stajesz po drugiej porażce; tylko Karol (logowanie, Studio Pro, push do Team Server, prawdziwy projekt, zakres) = od razu jedno `run_wait` z jedną akcją i całą listą potrzeb. Nigdy nie powtarzaj identycznej akcji bez zmiany. Zgłoszenie błędu (sześć pól) w `reference/eskalacja.md`.

## Tokeny

Miara zużycia: prawdziwe tokeny z zapisu sesji (`~/.claude/projects/<folder>/<id-sesji>.jsonl`, linie `assistant`, `message.usage`, każde `message.id` raz; wejście = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`). Licz skryptem, nie z licznika `total_tokens … left` (to budżet kontekstu):
`node "$TANDEM_DIR/bin/tokens.js" <id-sesji> --since <czas startu historyjki>` (`--table` pokazuje tabelę). Cały wynik JSON wyślij jako `run_report.tokens`; per krok podajesz różnicę. Dolary liczy skrypt, nie Ty. Bez zapisu sesji szacuj (znaki ÷ 4) z `estimated: true`. Nie zaokrąglaj do zera. Nauka Qwen (ML-38): `reference/mendix.md`.

## Koniec historyjki

1. **Sprawdź sam** całość (testy, przeglądarka, kopia projektu) i opisz wynik w `story_comment`. Testu dla Karola nie zakładasz; w pipeline każde kryterium dostaje przypadek dla kroku testu UI (`test_cases_set` z `criterion`) albo zapisany powód, dlaczego nie da się go zautomatyzować. Tablica rodzinna: `selfCheck` w `run_report` przed `story_move` (`reference/przebieg-i-koniec.md`).
2. **Oceń kryteria**: `run_report` z `criteria: [{ index (od 0), done, evidence }]` dla każdego; `evidence` to jedno zdanie, skąd wiesz; niespełnione `done: false` z powodem. Karol niczego nie odhacza.
3. `run_ask` „Chcesz coś sprawdzić sam przed wydaniem?” najwyżej po partii zmian (kilka historyjek jednej funkcjonalności, koniec sprintu), nie po każdej.
4. **`story_move`** do `done`; w projekcie z pipeline do `autotest` (po zielonych testach pipeline sam daje Done; Mendix w trybie wsadowym: build, `mx check` i Twoja ocena kryteriów, pełne testy raz na partię, szczegóły `reference/mendix.md`). Pisz `done` / `autotest`, nie `testing`. Ticket planistyczny: prosto do `done`.
5. **`run_report`** z `summary` (najwyżej 3 zdania i 60 słów po polsku, bez nazw plików, narzędzi, ścieżek i hashy; technikalia w `summaryTech`, inaczej odmowa), `result` i `handover`:
   - `model`: `["ServiceDesk.SE_Ticket_Escalate · nowe zdarzenie co 60 min"]`; `sprinter`: `["SD-15 · Running → Done"]` (z pipeline `→ Automated Testing`);
   - `files`: ścieżki od korzenia repo przed „ · ”, każdy zmieniony plik (wdrożenie commituje tylko te; bez listy przy cudzych zmianach staje);
   - `branch`: gałąź z kodem, gdy pracowałeś w worktree; `repos`: każda gałąź w innym repo niż projekt (`[{ repo, branch, commit }]`), taki ticket czeka w Automated Testing na scalenie w main tego repo (TAN-55), do main obcego repo nie scalasz sam.
6. **Commit robi Tandem przy Done**, nie Ty i nie Karol: Mendix jeden commit „KLUCZ: tytuł” w folderze aplikacji (tylko pliki historyjki i model, `modules/mendix/lib/pipeline/sprint-loop.js`), kod: wdrożenie z `result.files`. W worktree commitujesz sam na gałęzi (pkt 6 „Przebieg”), scala wdrożenie. Tylko gdy nikt nie commituje za Ciebie (Mendix z `pipeline.mendix.commitPerStory: false`): treść po angielsku w `commit-message.txt` (`reference/przebieg-i-koniec.md`, pkt 6).
7. W czacie dwa zdania i koniec tury: „SD-15 w Done; 412k tokenów, 11:27. Następną weźmie nowa sesja.” (z pipeline „w Automated Testing”). Nie wołasz `story_next`.

## Jak pisać do Karola (TAN-121)

Wszystko w tickecie czyta Karol. Pięć reguł (przykłady „dziś → tak”: skill `sprinter`, `reference/jak-pisac-do-karola.md`, czytaj, gdy serwer odrzuci podsumowanie):
1. `summary` najwyżej trzy zdania, bez nazw plików, narzędzi, hashy; technikalia w `summaryTech`.
2. Krok to czasownik i przedmiot („Dopisuję dokumentację i zapisuję zmiany”), nie lista rzeczowników.
3. Wpis historii ma linię ludzką i techniczną (`logLine(human, tech)`).
4. „Do sprawdzenia przez Ciebie” to jedna akcja z rodzajem (Kliknij, Zdecyduj, Sprawdź), z miejscem i tym, co zrobić.
5. Zatrzymanie mówi po kolei: co się stało, czy coś poszło na prod, co masz zrobić; pytanie to jedno pełne zdanie z założeniem.

Historyjkę, którą zakładasz albo zmieniasz (`story_add`, `story_edit`), piszesz według standardu ze skilla `sprinter` (Dla Ciebie: Dziś / Po zrobieniu / Kto + kryteria; Dla Claude: szczegółowe polecenie z częściami Where, Check, Out of scope; większą pracę dzielisz na kilka historyjek, „Podział”). Historyjki w Running, Automated Testing i Done tylko komentujesz.

## Pliki pomocnicze (`reference/`, obok tego pliku)

- `reference/przebieg-i-koniec.md`: pełny tekst „Przebieg”, „Tokeny” i „Koniec historyjki” (tablica rodzinna, treść commitu, `walk`). Czytaj, gdy rdzeń nie wystarcza.
- `reference/rzadkie-przypadki.md`: wyjątki sesji, „Kto prowadzi”, kontekst, zrzuty, logowania, reguła kolumny, blokada wydania, zakładanie historyjek, odrzucenie przez Karola, praca bez MCP. Czytaj, gdy zdarzy się taki przypadek.
- `reference/mendix.md`: ticket planistyczny i budowy, szybka pętla sprintu, drugi pas, MxScout, porty, nauka Qwen. Czytaj tylko w projekcie Mendix.
- `reference/eskalacja.md`: klasy błędów, pięć kroków, zgłoszenie błędu, „Nigdy sam”. Czytaj, gdy krok jest czerwony albo masz stanąć.
- `reference/historia-decyzji.md`: historia wersji obu skilli z kluczami ticketów.
