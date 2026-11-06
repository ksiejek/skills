---
name: tandem
description: Prowadzenie jednej historyjki ze sprintu w Tandem – Claude bierze dokładnie jedną historyjkę z To do (następną albo wskazaną kluczem), raportuje kroki z czasem i tokenami wejścia i wyjścia (miara zużycia; orientacyjny koszt w dolarach liczy bin/tokens.js), ostrzeżenia i ostatni komunikat, dopisuje pytania do „do sprawdzenia przez Ciebie” zamiast pytać w czacie, ocenia kryteria, przenosi do Done (z pipeline: do Automated Testing) i zapisuje podsumowanie z wynikiem (zmiany w modelu, w Sprinterze, w plikach) i kończy turę: następną historyjkę bierze nowa sesja z pustym kontekstem (pętla bin/tandem-loop.js). Używaj, gdy Karol pisze "/tandem", "weź następną historyjkę", "pracuj ze sprintu", "co jest w sprincie", "zrób kolejkę", albo gdy sesja ma wykonywać historyjki z MxCraft/Tandem bez rozmowy o każdym kroku. Wymaga skilla sprinter (zasady) i serwera MCP tandem albo plików projektu.
argument-hint: [next | status | <KLUCZ>]
---

# Tandem: historyjka od wzięcia do Done, z tokenami

Wersja 0.15 · 2026-11-06 (TAN-193: bez kolumny Planowanie i „Buduj bez planowania”; ticket planistyczny idzie To do → Running → Done z planem w MxScout, bez budowy i testów; ticket budowy buduje z planu albo bez niego. 0.14 · 2026-11-01: scalone dwie linie tego skilla: TAN-121: „Jak pisać do Karola”: podsumowanie dla Karola i summaryTech, krok jako czasownik, wpis historii ludzki i techniczny, „do sprawdzenia” jako akcja, zatrzymanie: co się stało, prod, co zrobić; ML-38: nauka Qwen, praca równoległa w nowych projektach. TAN-85: mniej wywołań w budowie: raport razem z innym narzędziem, polecenia w jednym Bash, duże odczyty przez subagenta, zwijanie przy ok. 150 tys. 0.11.5: TAN-55: gałąź w innym repo zgłaszasz w `result.repos`; bez scalenia w main tego repo ticket czeka w Automated Testing. 0.11.4: TAN-28: historyjka w wydaniu na prod jest zablokowana (przeniesienie i edycja), odmowę czytasz w odpowiedzi narzędzia. 0.11.3: TAN-19: bez ekranu Skille, Pauza zamiast „Tylko odczyt”, „Równolegle agenci” w ustawieniach aplikacji. 0.11.2: TAN-13: konektor zmienia ustawienia projektu po zgodzie Karola. 0.11.1: TAN-12: reguła kolumny w story_next. 0.11: GEN-42: kontekst projektu czytany przed pracą. 0.10: GEN-26: bez testu człowieka; skrypty z folderu Tandem: `$TANDEM_DIR`, GEN-19. 0.9: praca równoległa w osobnym worktree, TRIO-68)

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
- `settings.oneStoryPerSession: false` w ustawieniach projektu (bez przełącznika na stronie,
  ekranu Skille nie ma od TAN-19): po podsumowaniu wołasz `story_next` i idziesz
  dalej w tej samej sesji, dopóki kolejka nie jest pusta albo `paused`.

Niezależnie od tego obowiązuje zasada **jeden job na projekt**, dopóki „Równolegle agenci”
w Ustawieniach → Tandem (jedna wartość dla wszystkich projektów, domyślnie 1, projekt Mendix
zawsze 1) to 1: dopóki
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
i Karol może ją zwolnić w Tandem; gdy `run_report` odpowie, że Karol ją zwolnił, zakończ
turę bez dalszej pracy.

Historyjki przypisane do Karola mogą stać w To do, ale ich sam nie bierzesz: kolejka
(`sprint_read.queue`) i `story_next` bez `key` je pomijają (są w `forKarol`), bierzesz
taką tylko wtedy, gdy Karol poda jej klucz.

**Kontekst projektu (GEN-42).** Jeśli odpowiedź `story_next` ma `projectContext` (tekst, który Karol
pisze w Ustawieniach projektu → „Kontekst projektu”, z `updatedAt` i `updatedBy`) i/albo `projectRules`
(reguły gałęzi i wdrożenia z ustawień projektu), przeczytaj je **przed** planem i pracą i trzymaj się ich.
Pierwszy krok planu mówi to wprost, np. „Czytam kontekst projektu i uwagi”, a jego `message` w `run_report`
mówi jednym zdaniem, co z kontekstu wpływa na tę historyjkę. Bez tych pól (projekt bez kontekstu) nic
nie robisz i niczego nie zgłaszasz. Kontekst dla testów (`context-tests`) dostają tylko sesje kroków
testowych, nie Ty. Sam kontekstu nie zmieniasz: zmienia go właściciel w Tandem; z czatu czyta go
konektor (`get_project_context`, wszystkie ustawienia: `get_project_settings`), a zmienia
`update_project_settings` (TAN-13): najpierw podgląd bez `confirm`, zapis z `confirm=true` dopiero po
„tak” Karola; każda zmiana jest w Ustawienia → Historia zmian.

**Zrzuty z ticketu (TAN-165).** Jeśli odpowiedź `story_next` ma `images` (obrazy z Plików ticketu, np. zrzut z komentarza
testera `zrzut-<id>.png`, każdy ze ścieżką `path`), **przed krokiem 1 i przed każdym pytaniem** odczytaj je narzędziem
Read (Claude Code czyta obrazy) i przeczytaj, skąd zgłoszenie (`story.source`: strona, rola, tester). Potem zgłoś to w
`run_report` z `viewedImages: ["nazwa.png", …]`: Tandem zapisuje w historii „Obejrzałem zrzut(y) z ticketu: …”. Pytasz
Karola (`run_wait`, `run_ask`) tylko wtedy, gdy zrzut naprawdę nie wystarcza; `run_wait` odmawia („najpierw obejrzyj
zrzuty”), dopóki ich nie obejrzałeś. Ticket ze zrzutem albo z komentarza testera nie idzie na Haiku (minimum Sonnet).

**Logowania na starcie (TAN-105).** `story_next` (z wzięciem historyjki) sprawdza za Ciebie, jakie logowania i tokeny
będą potrzebne (lista `credentials` w Ustawienia → Pipeline, plus narzędzia wymienione w poleceniu: op, gh z zakresami,
az, cloudflared, konta testowe) i zwraca `credentials`. Gdy `credentials.ok` jest `true`, nie pytasz o logowania wcale.
Gdy są `missing`, **przed jakąkolwiek pracą** wysyłasz JEDNO `run_wait` z `credentials.wait` (`question` z pełną listą:
co, po co, jedna linia naprawy; `why`; `gate`), `run_report` z tokenami i kończysz turę. Nie pytasz o logowania po
kolei w trakcie pracy: to, co dało się sprawdzić na starcie, jest sprawdzone. Wartości sekretów nigdy nie są
wypisywane. Trafiłeś w trakcie na logowanie spoza listy: dopisz je do jednego `run_wait` z całą resztą, której
jeszcze brakuje, a Karolowi zaproponuj dopisanie go do `credentials` projektu.

**Reguła kolumny (TAN-12).** Każda kolumna tablicy ma regułę dla Claude (Ustawienia → Kolumny;
domyślna dla kolumn systemowych, projekt może ją nadpisać, kolumna własna ma tylko swoją).
`story_next` zwraca `columnRule` (`column`, `name`, `rule`, `source`: domyślna albo projektu):
regułę kolumny, z której bierzesz historyjkę, gdy to kolumna własna z regułą (np. Refinement),
a dla To do regułę Running. Trzymaj się jej obok polecenia i kontekstu projektu. Historyjka
z kolumny własnej przychodzi z `karolNotes` (komentarze Karola od końca poprzedniego przebiegu):
od nich zaczynasz, potem idziesz zwykłą drogą do Done. `story_move` oddaje `columnRule` kolumny,
do której historyjka wchodzi; Tandem zapisuje każdą w `run.columnRules`. Kolumna własna z regułą
jest w kolejce przed To do; bez reguły tylko parkuje historyjki dla Karola.

**MxScout (TAN-26).** Jeśli odpowiedź `story_next` ma `scoutBriefing` (dokumentacja z MxScout: logika biznesowa, ryzyka
P1–P3 i opisy elementów, których dotyczy historyjka; `scoutRead` mówi, co przeczytano i trafia do historii ticketu),
przeczytaj ją **przed** planem, wspomnij o niej w pierwszym kroku i nie powtarzaj ryzyk P1 bez wzmianki. `scoutWarning`
znaczy, że MxScout jest niedostępny albo projekt nie jest wybrany: planuj dalej i dopisz to do „do sprawdzenia przez
Ciebie”. Po Done Tandem sam skanuje model w MxScout i dopisuje notatkę zmiany; nieudane odświeżenie widać w Ustawieniach →
Mendix → „Projekt MxScout” (Ty niczego w dokumentacji MxScout nie edytujesz ręcznie).

**Skrypty.** `$TANDEM_DIR` to folder repo Tandem (zwykle `~/Projects/Tandem`; bez zmiennej podstaw
ten folder). Liczenie tokenów i zapis do bazy są w `$TANDEM_DIR/bin/`, skrypty Mendix
(model, porty, silnik) w `$TANDEM_DIR/modules/mendix/bin/`. MxCraft jest wyłączony (GEN-20):
nie wołaj skryptów z jego folderu.

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

## Dwie drogi w projekcie Mendix: ticket planistyczny i ticket budowy (TAN-193)

Kolumny Planowanie już nie ma (TAN-193 zastąpił TAN-22/TAN-110), a przełącznika „Buduj bez planowania” też nie.
Rodzaj ticketu mówi `story.planning` w odpowiedzi `story_next` (Karol zaznacza „Ticket planistyczny” przy zakładaniu
w Tandem albo w konektorze: `create_ticket` / `update_ticket` z `planning`; na karcie znaczek „Planistyczny”).

**Ticket planistyczny** (np. „zaplanuj moduł w License 2.0”): wynikiem jest plan w MxScout, nie zmiana.
1. `plan_read` z `key`: polecenie, kryteria, `claudeNotes` (uwzględnij i potwierdź w `acks`), uwagi do planu
   (`planNotes`), dotychczasowy plan, tickety budowy, które plan może objąć (`candidates`: backlog, Szkic, Do zrobienia)
   i plany już przyjęte (`ahead`).
2. `model_read` dla modułów, których dotyczy (albo `mx-model.js`); model tylko czytasz.
3. Plan: kolejność (`order`) i zależności (`dependsOn`), dla ticketu (i każdego ticketu budowy, który obejmuje)
   `summary` dla Karola (architektura, decyzje, pytania) i `elements`: procesy biznesowe (`process`: `qn` to nazwa
   procesu, `steps`, `description`), moduły, encje z atrybutami, asocjacje (`from` = właściciel, `to`, `type` reference
   albo reference set), mikroflowy i nanoflowy rozpisane do pojedynczych aktywności i decyzji (`activities: { no, type,
   text, why }`, decyzja z `branches`: pierwsza tak, druga nie; `to` to numer aktywności albo „koniec”, `next` mówi,
   dokąd idzie ostatnia aktywność gałęzi), strony (`widgets`); każdy element `state` new, chg albo del i `why`.
   Do tego **widok biznesowy** (TAN-71) `business`: `summary` prostym językiem, bez nazw z modelu, co zmieni się dla
   użytkownika i w procesie, i `process { actors, steps: [{ actor, text, branches, next }] }` – kto co robi, po kolei,
   gdzie proces się rozgałęzia. Z niego powstaje diagram procesu, a z `activities` diagram każdego mikroflowa.
4. Jeden `plan_save` z `key` ticketu planistycznego. Serwer odrzuca plan bez samego ticketu, ticket budowy już w pracy
   albo zbudowany, kolejność wbrew zależnościom, mikroflow bez aktywności, decyzję z jedną gałęzią, aktywność bez
   uzasadnienia, plan bez widoku biznesowego i nazwę z modelu w widoku biznesowym. Ticket budowy objęty planem dostaje
   go z `modelPlan.from` = klucz ticketu planistycznego. Gotowy plan sam trafia do MxScout (TAN-68, `scout` w odpowiedzi)
   i do makiety dla biznesu (TAN-32).
5. Pytanie, bez którego plan nie powstanie: `run_wait` (ticket czeka na Karola). Bez pytań: oceń kryteria i
   `story_move` do `done` – prosto do Gotowe, bez Automated Testing (serwer zamienia `autotest` na `done`, a bez
   zapisanego planu odmawia).

Ticket planistyczny niczego nie zmienia: bez zmian w modelu i kodzie, bez budowy aplikacji, mx check i testów
(`run_report` odmawia `result.model`, sesja z runnera i z `tandem-watch` nie ma Edit ani Write). Plan akceptuje Karol
w MxScout (TAN-111; ticket zostaje w Gotowe, ticket budowy ze Szkicu przechodzi do Do zrobienia). Uwagi biznesu
(TAN-112, „Popraw plan”) i „Planuj ponownie” na tickecie zwracają ticket planistyczny do Do zrobienia; następna sesja
odpowiada na uwagi w `replies` i zapisuje nową wersję.

**Ticket budowy** po prostu buduje: z planem (`story.modelPlan`, zwykle z ticketu planistycznego) według niego,
a odstępstwo zapisujesz w `story_comment` z `decision`; bez planu buduje bez etapu planowania.

## Blokada wydania (TAN-28)

Historyjka w wydaniu na prod (kolejka albo w toku) jest zablokowana: `story_move`, konektor i strona odmawiają
przeniesienia i zmiany, odmowa mówi dlaczego. Nie obchodź jej; poczekaj na koniec wydania albo napisz do Karola,
że może je anulować („Anuluj wydanie”, tylko gdy Mac go jeszcze nie wziął). Komentarz (`story_comment`) zawsze przechodzi.

## Eskalacja: najpierw spróbuj obejść (TAN-108)

Czerwony krok albo błąd dostaje klasę, zanim zapytasz Karola. Katalog obejść i pełna tabela są w Atlasie
(`proces-eskalacja`, „Gdy pipeline staje”); tu tylko reguła:

| Klasa | Co robisz |
| --- | --- |
| Przejściowy (timeout, przydział, niestabilny test, własny port) | ponawiasz po 1, 5 i 15 min; stajesz po 3 porażkach |
| Wina otoczenia (czerwone też na origin/main, konflikt z cudzym plikiem, stary Mac) | ostrzeżenie zamiast zatrzymania, ticket naprawczy, obejście z Atlasu; stajesz, gdy poprawka wychodzi poza obszar ticketu |
| Wina ticketu (test czerwony tylko u Ciebie, nazwy w modelu, własny konflikt) | poprawiasz sam na gałęzi ticketu, krok jeszcze raz; stajesz po drugiej porażce |
| Tylko Karol (logowanie, Studio Pro, push do Team Server, prawdziwy projekt, zakres) | od razu `run_wait` z jedną akcją i całą listą potrzeb w jednym pytaniu |

Pięć kroków przed zatrzymaniem (klasy 1–3):

1. Przeczytaj `halt.explain` i sprawdź, czy ta przyczyna wraca.
2. Uruchom padający test albo krok na origin/main: ta sama porażka = nie wina ticketu.
3. Zastosuj znane obejście z Atlasu „Gdy pipeline staje” (nie kopiuj go do ticketu).
4. Ponów raz. Nigdy nie powtarzaj identycznej akcji bez zmiany (kodu, ustawienia, stanu otoczenia).
5. Dopiero wtedy `run_wait` ze zgłoszeniem niżej.

**Zgłoszenie błędu** (pola jak `halt.explain` z TAN-107, w `question` i `why` albo w `story_comment`):
1. Co się stało (krok, polecenie, kod wyjścia, ostatnie linie).
2. Przyczyna i klasa, z dowodem.
3. Co próbowałem (każda próba z wynikiem).
4. Proponowana poprawka (gotowa po „tak”).
5. Jedna akcja dla Karola (przycisk albo polecenie).
6. Czy wraca (inne tickety z tą przyczyną, ticket naprawczy).

**Nigdy sam** (zawsze pytasz, nawet przy dobrym obejściu): obejście strażnika albo zmiana jego ustawień („Prawdziwy
projekt”), prawdziwe dane i `.mpr` prawdziwego projektu bez zgody, rotacja kluczy, scalenie w mxcraft-skills bez
„gotowe”, wydanie na prod, DNS i Cloudflare, usuwanie gałęzi i plików spoza obszaru ticketu.

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

## Nauka Qwen (ML-38)

W projekcie z nauką (`node ~/Projects/MacLab/nauka/bin/nauka.js czy <projekt>`, kod 0) każdy element, który budujesz
(enumeracja, encja, mikroflow, XPath, formularz, kawałek kodu), robi równolegle Qwen. Nowy projekt w Tandem (założony
po 26.10.2026) przy pierwszej historyjce rejestrujesz: `nauka.js projekt <id> [--wlasny] [--mendix <folder>]`
(`--wlasny` tylko dla własnego kodu Karola: kod klienta nigdy nie idzie do treningu). Na element:

1. `nauka.js zadanie <projekt> <typ> --tresc @zadanie.txt --zrodlo <KLUCZ>`; zrób go sam jak zwykle.
2. `nauka.js claude <id> --rozwiazanie @plik --kroki @kroki.md --wyjasnienie @dlaczego.md`: kroki na poziomie Mendix
   z uzasadnieniem, bez gotowego pliku (narzędzie odrzuci kroki z kawałkiem rozwiązania).
3. `nauka.js qwen <id>`: Qwen dostaje reguły, pasujące lekcje (RAG) i Twoje kroki; wynik walidacji MxCraft i porównanie
   z Twoim rozwiązaniem dostajesz od razu.
4. `nauka.js ocena <id> dobrze` albo `zle --krytyka "co i dlaczego"` (bez odpowiedzi) `[--lekcja "jedno zdanie"]`, potem
   znów `qwen`, aż „dobrze” albo limit prób; po limicie zadanie czeka na Karola (`nauka.js karol`).

Do modelu idzie zawsze Twoje rozwiązanie; Qwen buduje sam tylko typy, które w profilu (MxCraft `docs/local-model.md`) mają
„Qwen”. Każde „nie” Karola zapisujesz od razu: `nauka.js poprawka --tytul "lekcja jednym zdaniem" --co-zle … --jak …
--dlaczego … [--przed @a --po @b] --tagi … --typ … --projekt …`; na koniec sesji pokaż Karolowi `nauka.js karol`, a jego
decyzję wpisz `nauka.js zatwierdz <id…>` (dopiero zatwierdzone mają najwyższą wagę). Treści zadań, rozwiązań i poprawek
nie wpisujesz do ticketów: zostają w bazie na Macu. Tokeny tej pracy liczą się jako budowa.

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

## Jak pisać do Karola (TAN-121)

Wszystko, co Claude zgłasza w tickecie (podsumowanie, kroki, wpisy historii, „do sprawdzenia”, zatrzymania),
czyta Karol, nie Claude. Pięć reguł, każda z przykładem „dziś → tak”:

1. **Podsumowanie dla Karola: najwyżej trzy zdania, bez nazw plików, narzędzi, ścieżek i hashy.** Technikalia idą
   osobno (`run_report.summaryTech`); strona pokazuje podsumowanie jako „Co zrobił Claude”, a technikalia zwija pod
   „Szczegóły techniczne”. Serwer MCP odrzuca podsumowanie dłuższe niż 60 słów albo z kodem bez `summaryTech`
   (odmowa ma `error`, `why` i `example`: przepisz i wyślij jeszcze raz).
   - Dziś: „Dodano lib/report-standard.js i pole summaryTech w mcp/server.js; testy w test/report-standard.test.js.”
   - Tak: „Serwer odrzuca podsumowanie pisane do Claude. Strona pokazuje część dla Ciebie, a techniczną zwija. Testy
     przechodzą.” + `summaryTech`: „lib/report-standard.js, mcp/server.js, test/report-standard.test.js”.
2. **Krok to czasownik i przedmiot**, nie lista rzeczowników po przecinku. Serwer ostrzega (`stepWarnings` w
   odpowiedzi `run_report`), ale nie blokuje.
   - Dziś: „Atlas, CHANGELOG, commit”.
   - Tak: „Dopisuję dokumentację i zapisuję zmiany”.
3. **Wpis w historii ma linię ludzką i techniczną.** Ludzka po polsku, co to znaczy dla Karola; techniczna (commit,
   komputer, polecenie) w `tech`, strona pokazuje ją po kliknięciu „szczegóły” (`lib/log-line.js`, `logLine(human, tech)`).
   - Dziś: „Run 1: Scalenie z main — pass (Mac). Scalono origin/main (c92b3ce)…”.
   - Tak: „Scalone z główną gałęzią, testy zielone, wysłane do repozytorium”, pod spodem „commit c92b3ce · Mac”.
4. **„Do sprawdzenia przez Ciebie” to zawsze jedna akcja z rodzajem**: Kliknij, Zdecyduj albo Sprawdź, z miejscem
   i tym, co zrobić. Polecenia i wyjaśnienia idą pod spód, nie na początek.
   - Dziś (TAN-8): „Przed restartem Tandem wpisz TANDEM_ACCESS_AUD (Application Audience Tag z Cloudflare Zero Trust →
     Access → Applications) do ~/Mx/secrets/tandem.env. Nigdzie go nie było…” (akapit z trzema poleceniami).
   - Tak: „Kliknij: Cloudflare Zero Trust → Access → Applications → Tandem, skopiuj „Application Audience Tag” i wklej
     go do ustawień Tandem jako AUD; bez niego Tandem po restarcie nie wystartuje.”
5. **Zatrzymanie mówi po kolei: co się stało, czy coś poszło na prod, co masz zrobić.** Log polecenia idzie pod
   „Szczegóły”. Tak samo pytanie: jedno pełne zdanie z założeniem, które przyjmujesz.
   - Dziś (CRAFT-65): „Release na prod (mac:192.168.31.59) nie przeszedł: sh bin/release.sh → kod 1 (1.5 s): release:
     tools/sanitize.py --check found client traces; merge undone, nothing pushed.”
   - Tak: „Wydanie zatrzymało się, bo w kodzie zostały ślady klienta. Na produkcję nic nie poszło. Zdecyduj, czy
     usunąć te ślady i wydać jeszcze raz.” + w „Szczegóły” polecenie i jego log.
   - Pytanie dziś (SD-19): „„BU/OCL/AC? lub ECL” to flagi kategorii Category.OCL/ACL/ECL/TCL…? (AC = ACL?)”.
   - Tak: „Zakładam, że „AC” w opisie to kategoria ACL, tak jak w formularzu myConnect; jeśli chodzi o inną, napisz
     którą.”

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

**Pauza.** Karol wstrzymuje Tandem przyciskiem Pauza/Wznów na Teraz: `story_next` zwraca `paused`,
bieżąca historyjka idzie do końca. Trybu „Tylko odczyt” nie ma (TAN-19); stary zapis czyta się jako pauza.
Zmiany w aplikacji Mendix robisz zawsze przez pliki (silnik, tools/mpr), nigdy przez MCP Studio Pro.

## Bez serwera MCP (zapis przez pliki projektu)

Te same pola zapisujesz przez `node "$TANDEM_DIR/bin/db.js" update projects/<p>/stories/<KLUCZ> -`
z JSON-em na stdin: `run` (cały obiekt z `steps`), `tokens`, `timeSec`, `review`,
`assignee`, `status`; wpis do historii przez `node "$TANDEM_DIR/bin/db.js" log <p> <KLUCZ> "tekst"`.
Tablice idą w całości. Strona odświeży się po zapisie pliku.
