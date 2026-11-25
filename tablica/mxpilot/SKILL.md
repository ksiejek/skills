---
name: mxpilot
description: Oddanie sprintu aplikacji Mendix do odbioru biznesu w MxPilot – zawsze w tej samej kolejności, per sprint (Karol, 2026-11-19 – „zanim wydasz historyjki testowe, musisz je najpierw przetestować”). Push modelu z notatkami Studio Pro, paczka i podmiana demo (*.seajack.dev), potem Claude sam przechodzi w przeglądarce każdy krok jako każda rola sprintu, a dopiero potem zapisuje kroki odbioru w MxPilot (write_sprint_demo z tested), czyta werdykty biznesu (read_sprint_verdicts) i z każdego odrzuconego kroku robi diagnozę i ticket. Używaj, gdy sprint (albo poprawki zrobione w sesji) ma iść do testów biznesu: „oddaj sprint”, „wystaw do odbioru”, „Odbiór w MxPilot”, „historyjki testowe”, „write_sprint_demo”, „wystaw na demo i oddaj”, „co biznes odrzucił”, „/mxpilot”.
---

# mxpilot – sprint do odbioru, zawsze tak samo

Biznes testuje sprint na stronie „Odbiór · Sprint N” w MxPilot („Sprawdź w 5 minut”), w aplikacji na demo.
Kroki, które tam trafiają, Claude **najpierw sam przechodzi** w tej aplikacji jako ten użytkownik. Kroku, który nie
przeszedł, nie oddajesz: robisz diagnozę i ticket. Ta kolejność obowiązuje każdy sprint i każdą paczkę poprawek
zrobionych w sesji (bez pipeline), także drobną.

Zasady obok: `sprinter` (tablica, kolumny, kto co robi), `raben-app` pkt 8 (demo Raben), `mxcraft-model` reguła 8.10
(commity Mendix: po angielsku, notatka `mx_metadata`), `instrukcja-testow` (jak pisać kroki dla nietechnicznego testera).

## 1. Kiedy

- Wszystkie historyjki sprintu są w Done (pipeline) albo Karol mówi „oddaj sprint” / „wystaw do odbioru”.
- Po poprawkach zrobionych w sesji, zanim powiesz Karolowi „gotowe do testów”.
- Gdy biznes odrzucił krok i poprawka już jest: ten sam cykl od kroku 2.
- Kto zaczyna (Karol, 2026-11-25: „mialo byc tak: robisz scenariusz, potem testujesz, potem ja to dostaję”): pipeline ani
  Tandem nie robią tego same. Każda sesja, która widzi, że ostatnia historyjka sprintu przeszła do Done (albo że sprint
  jest skończony, a w MxPilot nie ma kroków „Sprawdź w 5 minut” dla niego), sama zaczyna ten cykl albo w podsumowaniu
  mówi Karolowi wprost: „Sprint N bez kroków odbioru: uruchomić /mxpilot?”. Sprint nie jest skończony, dopóki kroki nie
  są zapisane z `tested`.
- Przypadki testowe ticketów w Tandem (`testCases`, krok „Test ekranu”) to test automatyczny pipeline, nie odbiór:
  zielona partia testów nie zastępuje kroków w MxPilot.

## 2. Model w repozytorium

1. Commity w `main` aplikacji, komunikaty po angielsku, każdy z notatką Studio Pro:
   `node ~/Projects/mxcraft-skills/tools/mxnotes/mx-notes.js ensure <repo> HEAD main`.
2. `git fetch`: gdy origin ma commit, którego nie masz (np. „Before update” ze Studio Pro), najpierw merge, potem notatka
   na commit merge.
3. Push gałęzi i notatek: `git push origin main`, potem `mx-notes.js push <repo> origin`; `mx-notes.js check <repo>
   <od>..HEAD` musi wypisać `ok`. Push robisz na polecenie Karola albo w ramach tego cyklu, gdy Karol o niego prosi.

## 3. Paczka i demo

1. Z folderu aplikacji (cwd decyduje, co się buduje):
   `node ~/Projects/Tandem/bin/mendix-release.js check --project <id>` (mxbuild, paczka w `~/Mx/run/mendix-release/<id>/<commit>.mda`),
   potem `... deploy --project <id>` (podmienia paczkę z rejestru `~/Mx/demo-domains.json`, stara zostaje jako `.prev`,
   restart, demo musi odpowiedzieć; nieudany start wraca do starej paczki).
2. Sprawdź: adres publiczny daje 302 do logowania Cloudflare Access, port lokalny 200, a `deploy` wypisał właściwy commit.
3. Dane demo: listy, które sprint pokazuje, nie mogą być puste. Pusta lista, która powinna mieć dane startowe, to
   blokada odbioru, nie „brak danych”: diagnoza (stałe demo w `local-constants.json`, seed w After startup, log
   `runtime.log` w folderze demo), ticket, i dopiero po poprawce dalej.
4. Folderów serwerów (`~/Mx/*-runner`, `~/Mx/<projekt>`) nie zmieniasz; demo zmieniasz tylko przez `mendix-release.js`
   albo `~/Projects/Tandem/bin/demo-domain.js`.

## 4. Przejście w przeglądarce (obowiązkowe przed oddaniem)

1. Kroki bierzesz z przypadków testowych sprintu (`read_testcases` w MxScout, kryteria historyjek) i piszesz je od razu
   tak, jak zobaczy je tester: 1–7 kroków, po polsku, z perspektywy użytkownika, bez kluczy ticketów i nazw technicznych.
2. Przechodzisz **dokładnie te kroki** w Claude in Chrome (skill `chrome-browser`) na demo, jako każda rola, której
   kroki dotyczą: na bramce demo przełącznik ról (np. „Test Administrator”), bez hasła. Własna karta, zamknięta na końcu.
3. Na każdy krok: co kliknięte, co widać (zrzut tylko jako dowód), czy wynik zgadza się z „expect”. Na końcu błędy
   konsoli (`read_console_messages`, onlyErrors) i nowe ERROR/WARNING w `runtime.log` demo.
4. Nie klikasz rzeczy, które niszczą dane testerów (wgranie danych testowych od nowa, usuwanie cudzych rekordów), chyba
   że krok tego wymaga; zapis z niezmienionymi wartościami albo własny rekord testowy jest w porządku.
5. Krok nie przeszedł: nie trafia do odbioru jako sprawdzony. Diagnoza (model, log, dane), ticket (bug) w projekcie
   aplikacji z przyczyną i dokładną zmianą, a gdy taki ticket już jest, komentarz do niego. Sprint czeka, aż poprawka
   wejdzie i przejście się powtórzy, chyba że Karol zdecyduje oddać część kroków.

## 5. Zapis odbioru w MxPilot

`write_sprint_demo` przez MCP MxPilot (`POST http://127.0.0.1:4297/mcp`, token agenta przez `~/Mx/bin/op-sa-token`
z `op://Praca/mxpilot-agent-token/credential`; tokenu nie wypisujesz):

- `sprint`: klucz sprintu z tablicy (`s4`) albo numer;
- `steps` (1–7): `title`, `do[]` (krótkie zdania), `expect`, `role`, `account` (NAZWA konta testowego, nigdy hasło),
  `case` (TC-n, tylko numer przypadku, który MxPilot ma w Przypadkach testowych; numerów z ticketów nie podawaj), `rules` (BR-n),
  `tested` (true albo czas ISO) **tylko** dla kroku przejścia z pkt 4, który przeszedł, `key` (stały klucz kroku; przy
  przepisaniu kroku zostaw ten sam, żeby jego oś czasu została);
- `summary`: jedno–dwa zdania po polsku, co sprint dał biznesowi;
- `url`: https adres demo (przycisk „Otwórz aplikację”).

Teksty muszą być po polsku (MxPilot odrzuca angielskie i hasła). Nowy zapis to nowa wersja; liczy się najnowsza.

## 6. Po odbiorze: „Mam uwagi” przy kroku

Tester przy każdym kroku klika „Akceptuję” albo „Mam uwagi” (tekst i zrzuty ekranu, wklejone Ctrl+V albo upuszczone).
Uwagi trafiają do kolejki Claude: `list_ready` zwraca zdarzenie `type: step_feedback`, `id: "step-<n>"` z krokiem
(numer, key, tytuł, czynności, rola, konto), notatką i zrzutami (z pinezkami). Na każde takie zdarzenie (Karol, 2026-11-19):

1. `write_step_status { sprint, step, status: "working", text }`: jedno zdanie, co znalazłeś. Tester widzi „Claude pracuje”.
2. Zrzuty czytasz `read_document` (kind `attachment`), potem diagnoza. Poprawka aplikacji Mendix idzie ticketem na tablicę
   aplikacji („nic bokiem”); ticket do To do.
3. Gdy poprawka jest na demo: `write_step_status … "testing"`, przechodzisz krok w przeglądarce jako ta rola, razem z tym,
   co opisał tester. Nie przechodzi: wracasz do pkt 2.
4. Przechodzi: `write_sprint_demo` z tym krokiem `tested` (ten sam `key`), poprawionym opisem, gdy był niejasny, i **nowym
   krokiem**, gdy uwaga pokazała przypadek, którego kroki nie obejmowały.
5. `write_step_status … "ready"`, potem `ack_ready ["step-<n>"]`. Tester widzi „Poprawione · sprawdź ponownie”, a cała droga
   (uwagi, zrzuty, Twoje statusy, przejścia, nowe kroki) jest pod przyciskiem „Oś czasu” kroku.

`read_sprint_verdicts { sprint }` daje przegląd: przy każdym kroku „accepted”, „rejected” (uwagi) albo nic. Karolowi mówisz
w kilku liniach: co przyjęte, jakie uwagi, jakie tickety powstały.

## 7. Przykład: License 2.0 (Raben)

Projekt Tandem `license` (`~/Mendix/RabenLicense-main`), MxPilot `license-2-0`, demo `https://licence-demo.seajack.dev`
(port 8520, baza `mxcraft_test_license_demo`, stała `License.DemoData=true`, testerzy `raben-group.com`), role na bramce:
Test Administrator, Test Edytor limitów, Test Lokalne IT, Test RMS. 2026-11-19: przejście jako administrator znalazło
puste listy typów licencji i grup (seed demo nie rusza, stała nie dochodzi do runnera) i błąd 405 udawanego Graph;
oba są w LIC-52 i blokują odbiór sprintu do czasu poprawki.
