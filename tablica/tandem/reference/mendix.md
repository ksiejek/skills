# Tandem · Mendix: dwie drogi, szybka pętla, drugi pas, MxScout, porty, nauka Qwen
Plik pomocniczy skilla tandem (tekst przeniesiony bez zmian z SKILL.md, TAN-225). Czytasz go tylko w projekcie Mendix.

**Drugi pas Mendix (TAN-208).** Gdy w projekcie Mendix buduje się jedna historyjka z modelem, `tandem-watch` może
uruchomić obok jedną małą (ocena orkiestratora: trywialna albo błąd, który nie jest złożony), gdy oceny obszaru obu nie
mają wspólnego pliku ani dokumentu modelu (`Moduł.Dokument`, `Moduł.*`). Taka sesja dostaje w prompcie systemowym kopię
folderu `<folder>-wt/<KLUCZ>` z gałęzi testowej: model zmieniasz i mx check uruchamiasz tylko tam, aplikacji testowej
nie uruchamiasz, commitujesz na gałęzi `tandem/<klucz>` (temat „KLUCZ: …”), w `result.branch` podajesz tę gałąź. Po
Done Tandem przenosi Twoje commity na gałąź testową w głównym folderze i usuwa kopię. `story_next` z kluczem odmówi
(`waiting`), gdy obszary się pokrywają albo pas jest zajęty: powiedz to jednym zdaniem i stop.

**MxScout (TAN-26).** Jeśli odpowiedź `story_next` ma `scoutBriefing` (dokumentacja z MxScout: logika biznesowa, ryzyka
P1–P3 i opisy elementów, których dotyczy historyjka; `scoutRead` mówi, co przeczytano i trafia do historii ticketu),
przeczytaj ją **przed** planem, wspomnij o niej w pierwszym kroku i nie powtarzaj ryzyk P1 bez wzmianki. `scoutWarning`
znaczy, że MxScout jest niedostępny albo projekt nie jest wybrany: planuj dalej i dopisz to do „do sprawdzenia przez
Ciebie”. Po Done Tandem sam skanuje model w MxScout i dopisuje notatkę zmiany; nieudane odświeżenie widać w Ustawieniach →
Mendix → „Projekt MxScout” (Ty niczego w dokumentacji MxScout nie edytujesz ręcznie).


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

**Ticket planistyczny** (np. „zaplanuj moduł w License 2.0”): wynikiem jest plan w MxScout, nie zmiana. To opakowanie
Tandem dla planu skilla `mendix-plan`; jak z przyjętego planu powstają tickety sprintu (z `rules` i `dependsOn`), w jakiej
kolejności się buduje i co ma sprint startowy: skill sprinter, `reference/od-planu-do-sprintu.md`.
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

**Szybka pętla sprintu (TAN-195, projekt Mendix w trybie wsadowym, `pipeline.tests` „batch”, domyślnie).** Ticket budowy
kończy się bez testów: budujesz przez JSON / tools/mpr, krok Model check robi jeden `mx check` (pełny mxbuild tylko przy
zmianie Java albo widgetów, TAN-103). Błąd z `mx check` poprawiasz od razu na tym tickecie, zanim weźmiesz następny.
Po Done Tandem sam robi jeden commit historyjki w folderze aplikacji („KLUCZ: tytuł”, tylko jej pliki i model; Ty go nie
robisz i nie mieszasz dwóch kluczy w jednym commicie). Następną historyjkę bierze nowa sesja od razu, bez czekania na
testy. Gdy w sprincie nic nie zostało w To do ani Running, idzie raz pełna partia testów (TAN-191). Projekt z gałęzią ACCP
(TAN-209, `pipeline.mendix.acceptBranch`): po zielonej partii każda jej historyjka sama trafia na gałąź testową na serwerze
(Mac, wpis „Na serwerze na gałęzi TEST”), a „Na prod” scala gałąź testową do ACCP; Ty niczego nie wypychasz. Gdy pada, Tandem
wskazuje winną historyjkę: po elementach z błędu (Moduł.Nazwa, pliki) i po commitach historyjek, a gdy to niejasne,
bisect (tylko padający test na kolejnych commitach, polecenie `pipeline.mendix.bisectTest`). Winna wraca do Do zrobienia
z `fixes` (znaleziska partii) i `batchTests.state` „fixing”: poprawiasz tylko ją, a Tandem sprawdza `mx check`
i tylko padające przypadki, commituje „KLUCZ: fixup after test batch N” i puszcza całą partię jeszcze raz. Po drugiej
nieudanej poprawce tej samej historyjki, albo gdy winnej nie widać, partia staje u Karola z kandydatami. Sam możesz
sprawdzić winną: `node "$TANDEM_DIR/modules/mendix/bin/sprint-culprit.js" culprit --dir <folder> --keys A,B
--finding "<błąd>" [--bisect "<polecenie testu>"]`; czas sprintu i porównanie z bazowym: `… sprint-culprit.js time
<projekt> <sprint> [--baseline <sprint>]`. Raport partii pokazuje czas budowy i mx check każdej historyjki, wynik
testów, poprawiane historyjki i porównanie z bazowym sprintem.


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


