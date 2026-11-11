# Sprinter · Tablica z pipeline, układ rodzinny, orkiestrator, jeden job
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go, gdy sprawa dotyczy kolumn pipeline, testów partiami, wdrożenia albo zatrzymanej historyjki.

## Tablica z pipeline

Projekt z włączonym pipeline (Ustawienia → Pipeline, `project.pipeline.enabled`) ma
sześć kolumn (także projekt Mendix: kolumny Planowanie nie ma od TAN-193; otwarte tickety planistyczne są w `sprint_read.planning`) (Human Testing tylko z `pipeline.humanTesting`, GEN-29); `sprint_read` zwraca je w `columns`, a historyjki w `draft`, `autotest`
i `prod` obok `queue`, `running`, `done` (i `testing`, gdy projekt ma Human Testing).

| Kolumna | Status | Kto przesuwa dalej |
|---|---|---|
| Draft | `draft` | Karol do To do, gdy historyjka gotowa. Pipeline nigdy nie cofa tu historyjki sam; trafia tu tylko, gdy Karol przeniesie zatrzymaną (`failedRun`, powód w `fixes`). |
| To do | `todo` | Claude (`story_next`) albo pipeline sam startuje sesję; To do znaczy „buduj”. |
| Running | `running` | Claude: oceniasz kryteria i `story_move` do `autotest` (dawne `testing` serwer też przyjmie jako koniec budowy, ale pisz `autotest`). Ticket planistyczny (TAN-193) idzie stąd prosto do Done. |
| Automated Testing | `autotest` | Pipeline: kroki testów automatycznych. Krok, który czeka na Claude, zgłaszasz przez `step_report` (`pipeline_status` pokazuje który). Fail → historyjka zostaje tu zatrzymana (`halt`, czerwona ramka, jedno zdanie), wszystko zaliczone → pipeline sam przenosi do Done (GEN-29: bez Human Testing) i zapisuje to w historii. **Testy partiami** (TAN-191, ustawienie Testy = partiami, domyślne dla Mendix): tu biegnie tylko build ticketu (Model check z mx check i odczytem zmienionych dokumentów; w stosie Code check i Unit tests), potem samoocena kryteriów (każde ocenione przez Ciebie, inaczej zatrzymanie) i Done; Security, Database, Migracje i UI test robi raz karta „Partia testów N” (`PARTIA-N`) dla wszystkich ticketów od ostatniej partii, a znaleziska wracają do ticketów (`batchTests`). Partii nie bierzesz i nie przesuwasz; rusza sama przy pustym To do albo przyciskiem Karola. Bez testów od razu do Done idą: ticket z samymi dokumentami (GEN-38) i ticket z wynikiem w załączniku (TAN-76: plik dołączony przez `story_attach` w tym przebiegu i zmiany tylko w plikach paczki – `dist/` albo lista `pipeline.deliverablePaths`, `.gitignore`, dokumenty; bez załącznika oznacz go `pipeline.deliverable: true`); jego gałąź i tak scala się z main. Zmiana kodu, modelu albo bazy obok paczki = testy jak zawsze. |
| Done | `done` | Z `gitFlow` w profilu: skrypt commituje historyjkę na gałęzi test (temat „KLUCZ: …”, tylko jej pliki i zmienione pliki modelu MPR v2, nigdy dwie historyjki w jednym commicie). Bez `gitFlow`: commit, push i wdrożenie z profilu projektu (bez polecenia wdrożenia historyjka zostaje w Done). |
| Acceptance | `prod` | Karol przenosi tu, co ma iść na akceptację; skrypt przenosi (cherry-pick) commity tych historyjek z test na ACCP i dopisuje wynik w tickecie. Konflikt: ticket zatrzymany w Acceptance z plikami w powodzie – wtedy, i tylko wtedy, wkracza Claude. Bez `gitFlow` tu kończy wdrożenie. Projekt Mendix z gałęzią ACCP (TAN-209, Ustawienia → Środowiska: gałąź Test i gałąź Acceptance): historyjka już po zaliczonych testach (partia albo testy ticketu) sama trafia na gałąź testową na serwerze, a „Na prod” scala gałąź testową do ACCP i ją wypycha; konflikt tylko w pliku modelu rozwiązuje się sam ze sprawdzeniem spójności, każdy inny konflikt albo błąd sprawdzenia zatrzymuje historyjki z powodem i nic nie idzie na serwer. Claude nie przesuwa tu narzędziem. Kiedy wdrożenie rusza, mówi tryb wdrożenia projektu (profil, `deployMode`): `manual` (domyślny) – Karol klika „Release na prod” nad tablicą i jeden job wdraża całe Done; `each` – po każdym Done; `off` – nigdy. Zamknięcie sprintu niczego nie wdraża. |

Human Testing (`testing`) zostaje tylko w projekcie z pipeline i `pipeline.humanTesting: true` (GEN-29): wtedy
Karol robi Human Test na stronie, ustawia Done albo odsyła do Draft z uwagami. Poza tym testu człowieka nie ma (GEN-26).

**Układ rodzinny (GEN-77).** Projekt dziecka (Staś, Franek, Basia) ma ustawienie układu tablicy `family`
(`update_project_settings`, sekcja `columns`, `values { preset: "family" }`; `{ preset: null }` oddaje zwykły układ; to jedyne
ustawienie, osobnego kodu dla żadnego dziecka nie ma). Tablica ma wtedy trzy kolumny: Do zrobienia (`todo`), Claude buduje
(`running`) i Gotowe (`done`), bez Backlogu, Szkicu, Testów i Na produkcji. Pipeline zostaje włączony: jego ukryte stany
(`draft`, `autotest`, `prod`) stoją w kolumnie, do której należą (Szkic jak Do zrobienia, Testy jak Claude buduje, Na produkcji
jak Gotowe), więc tanie sprawdzenia silnika (skan sekretów, kroki z profilu) dalej idą niewidocznie dla dziecka. Budowa
sprawdza się sama: przed końcem budowy Claude uruchamia albo otwiera to, co zrobił, i zapisuje to w `run_report` w polu
`selfCheck: [{ what, result: pass | fail | skipped, evidence }]` (sekcja „Sprawdzone” przy karcie); `story_move` do `done`
i strażnik Done odmawiają bez zapisu z bieżącej rundy, z czerwonym sprawdzeniem albo gdy żadne się nie udało.

**Orkiestrator** (GEN-24). Przy założeniu i przy wzięciu historyjki Tandem sam ustala jej
rodzaj (kod, UI, dokument, research, konfiguracja, wdrożenie), trudność, potrzebne kroki
pipeline (z jednym zdaniem, dlaczego pominięty) i model budowania (Haiku, Sonnet, Opus);
`story_next` zwraca to w `story.orchestration`. Pominięty krok kończy się jako „nie
uruchomiono” z powodem i znika z zakładek. Kroków ani modelu nie zmieniasz sam: robi to
Karol na tickecie do startu budowy.

**Dwie drogi w projekcie Mendix (TAN-193).** Ticket **planistyczny** (Karol zaznacza „Ticket planistyczny” przy
zakładaniu, w aplikacji albo konektorem `planning`; na karcie znaczek „Planistyczny”) idzie To do → Running → Done:
Claude pisze plan do MxScout (architektura, moduły, encje, mikroflowy, strony, decyzje i pytania; `plan_read`,
`plan_save`, szczegóły w skillu tandem), nie zmienia modelu ani kodu i nie uruchamia budowy aplikacji, mx check ani
testów; z pytaniem czeka na Karola (`run_wait`), bez pytań przechodzi prosto do Done. Plan akceptuje Karol w MxScout
(TAN-111), uwagi biznesu do planu (TAN-112) wracają ticket do To do na nową wersję. Ticket **budowy** buduje: z planem
(`modelPlan`, także z ticketu planistycznego) według niego, bez planu bez etapu planowania.

**Jeden job na projekt** obejmuje tu Running i Automated Testing (i Human Testing, gdzie jest; Done nigdy nie blokuje; karta „Partia testów” nigdy nie blokuje, TAN-191; w Mendix obok jednej historyjki z modelem może iść jedna mała w kopii folderu, gdy ich pliki i dokumenty modelu się nie pokrywają, TAN-208, skill tandem):
`story_next` nic nie bierze, gdy historyjka jest w `autotest` („czeka na testy
automatyczne”), a `tandem-watch` nie startuje sesji także wtedy, gdy historyjka jest
zatrzymana (MXC-137): nieudany krok albo wdrożenie nie cofają jej do Draft,
tylko zostawiają w jej kolumnie z polem `halt` (`sprint_read.halted`: kolumna, krok,
jedno zdanie powodu), czerwoną ramką i przypisaniem do Karola. Tak samo build bez postępu przez „Limit bez postępu” projektu (domyślnie 30 min; TAN-208, źródło `stall`): bez kroku, raportu, tokenów, wpisu w historii i pracy sesji Claude. Karol decyduje: „Wznów”
(krok od nowa, z tego samego miejsca), „Pomiń krok” albo sam przenosi ją do Draft lub
To do – wtedy powód trafia do `fixes`, a Ty bierzesz ją jak każdą inną i zaczynasz od
`fixes`. Zatrzymanej historyjki nie przesuwasz sam.

