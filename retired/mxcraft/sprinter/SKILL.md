---
name: sprinter
description: Zasady Sprintera, wspólnego rdzenia MxCraft i Tandem – tygodniowe sprinty, historyjki z kryteriami (standard „Dla Ciebie” + „Dla Claude · polecenie”: jak pisać historyjkę, żeby Karol zrozumiał ją od razu), tablica To do · Running · Testing · Done (z pipeline: Draft · To do · Running · Automated Testing · Human Testing · Done · On Prod), testy i role (Karol jest Product Ownerem, Scrum Masterem i Testerem, Claude Developerem). Mówi, jak brać historyjki z To do w kolejności sprintu, kiedy przesuwać je między kolumnami, dlaczego Done ustawia tylko Karol i jak zapisywać historię, kryteria i zmiany w modelu w tickecie, nie w czacie. Używaj w każdym projekcie prowadzonym w MxCraft albo Tandem, gdy planujesz, szacujesz, budujesz, testujesz albo zmieniasz status pracy; skill tandem dokłada do tego raportowanie kroków i tokenów.
---

# Sprinter: jak pracuje zespół Karol + Claude

Wersja 0.7 · 2026-10-20 (Pomysły: miejsce przed historyjkami, zamiana tylko po pytaniu Draft czy To do. 0.6: tablica projektu z pipeline: Draft → On Prod, kto co przesuwa; Automated Testing i Draft po nieudanym przebiegu też są „jednym jobem”. 0.5: Done po commicie Karola jednym story_move z commitConfirmed; kryteria ocenia Claude w raporcie końcowym, Karol tylko ustawia Done; rozmiar do czytania przez konektor: najwyżej 24 KB, sekcje, podsumowanie na górze)

Ten plik jest w dwóch repozytoriach, w obu taki sam: MxCraft `skills/sprinter/SKILL.md`
i Tandem `skills/sprinter/SKILL.md`. Zmieniasz jeden, kopiujesz do drugiego.

Sprinter to wspólny rdzeń MxCraft i Tandem: te same sprinty, historyjki, tablica
i testy, zapisane jako pliki JSON w folderze roboczym MxCraft (`workspace/`).
Strony odświeżają się same, gdy coś zapiszesz. Karol patrzy na postęp tam, nie w czacie.

## Role

- **Karol** – Product Owner, Scrum Master i Tester. Mówi, czego chce, ustala kolejność,
  odpowiada na pytania z refinementu, wykonuje testy i ustawia Done.
- **Claude** – Developer. Zapisuje historyjki według standardu niżej (część dla Karola
  i polecenie dla siebie), bierze je z To do w kolejności sprintu, jedną naraz, buduje,
  dopisuje testy, przenosi do Testing i podpina test pod Karola.

## Sprint i tablica

- Sprinty są tygodniowe. Aktywny jest tylko jeden. Historyjki spoza aktywnego sprintu
  są w backlogu („Do refinementu” → „Gotowe do sprintu” → „Następny sprint”).
- Kolumny: **To do · Running · Testing · Done**. Kolejność w To do ustala Karol
  w Tandem („Następne w sprincie”): mniejsze `order` idzie pierwsze, potem numer.
- Historyjka ma: `key`, `title`, `type` (story, bug, task, refinement, test), `points`
  (1 2 3 5 8 13), `prompt` (polecenie, które Claude pisze dla siebie), `intent`, `acceptance` (kryteria),
  `questions`, `decisions`, `changes` (zmiany w modelu), `assignee` (karol | claude),
  `log` (historia). Test ma `parent`, `steps`, `expected`, `result` (pending | pass | fail),
  `evidence` i zawsze `assignee: "karol"`.

## Tablica z pipeline

Projekt z włączonym pipeline (Ustawienia → Pipeline, `project.pipeline.enabled`) ma
siedem kolumn; `sprint_read` zwraca je w `columns`, a historyjki w `draft`, `autotest`
i `prod` obok `queue`, `running`, `testing`, `done`.

| Kolumna | Status | Kto przesuwa dalej |
|---|---|---|
| Draft | `draft` | Karol do To do, gdy historyjka gotowa. Pipeline nigdy nie cofa tu historyjki sam; trafia tu tylko, gdy Karol przeniesie zatrzymaną (`failedRun`, powód w `fixes`). |
| To do | `todo` | Claude (`story_next`) albo pipeline sam startuje sesję; To do znaczy „buduj”. |
| Running | `running` | Claude: `story_move` do `autotest`, nie do `testing` (serwer i tak zamieni). |
| Automated Testing | `autotest` | Pipeline: kroki testów automatycznych. Krok, który czeka na Claude, zgłaszasz przez `step_report` (`pipeline_status` pokazuje który). Fail → historyjka zostaje tu zatrzymana (`halt`, czerwona ramka, jedno zdanie), wszystko zaliczone → Human Testing. |
| Human Testing | `testing` | Karol: Human Test (`record_human_result`), Done albo odesłanie do Draft z uwagami. Done po jego commicie jak w pkt 8 niżej. |
| Done | `done` | Tandem: commit, push i wdrożenie z profilu projektu (MxCraft niczego nie wdraża; bez polecenia wdrożenia historyjka zostaje w Done). |
| On Prod | `prod` | Tandem po udanym wdrożeniu; nikt nie przesuwa tu ręcznie ani narzędziem. Koniec. |

**Jeden job na projekt** obejmuje tu Running, Automated Testing i Human Testing:
`story_next` nic nie bierze, gdy historyjka jest w `autotest` („czeka na testy
automatyczne”), a `tandem-watch` nie startuje sesji także wtedy, gdy historyjka jest
zatrzymana (MXC-137): nieudany krok, Human Test albo wdrożenie nie cofają jej do Draft,
tylko zostawiają w jej kolumnie z polem `halt` (`sprint_read.halted`: kolumna, krok,
jedno zdanie powodu), czerwoną ramką i przypisaniem do Karola. Karol decyduje: „Wznów”
(krok od nowa, z tego samego miejsca), „Pomiń krok” albo sam przenosi ją do Draft lub
To do – wtedy powód trafia do `fixes`, a Ty bierzesz ją jak każdą inną i zaczynasz od
`fixes`. Zatrzymanej historyjki nie przesuwasz sam.

## Rytm historyjki

1. **Weź następną** z To do w kolejności sprintu (`story_next`). Nie bierz dwóch naraz.
   **Na jednym projekcie pracuje jedna historyjka naraz**: gdy inna jest w Running albo
   w Testing (czeka na test i commit Karola), `story_next` nic nie bierze. Wtedy, tak samo
   jak przy pauzie albo pustej kolejce, powiedz to jednym zdaniem i stop.
2. **Przeczytaj wszystko, co dostałeś**: polecenie, intencję, kryteria, pytania,
   uwagi Karola z poprzedniej rundy (`fixes`), listę „do sprawdzenia” (`review`),
   testy. Moduły z modelu czytaj przez `model_read`, nie z pamięci.
3. **Running.** Historyjka jest już w Running po `story_next`. Pracuj według polecenia
   i kryteriów. Decyzje zapisuj w tickecie (`story_comment` z `decision`), zmiany
   w modelu też (`story_comment` z `change`: moduł, rodzaj, przed, po).
4. **Pytanie, na które sam nie odpowiesz**, dopisz do „do sprawdzenia” (`run_ask`)
   z rozsądnym założeniem i idź dalej. Nie zatrzymuj się na pytaniu w czacie.
5. **Test.** Gdy skończysz, załóż jeden test na całą funkcjonalność (`test_add`): kilka
   kroków, które obejmują całość, nie osobny krok na każdy ekran, rozmiar czy motyw.
   Wykonaj go sam (w przeglądarce, na kopii projektu, w Studio Pro, gdy się da) i wpisz
   Test zapisuje się w tej samej historyjce (zakładka „Test”, `humanTests`), nie jako
   osobny ticket: po testach automatycznych ten sam ticket przechodzi do Human Testing
   (bez pipeline: do Testing) i Karol wpisuje wynik w zakładce (MXC-138). Historyjek
   „środowisko testowe” ani innych ticketów do testu nie zakładaj sam, tylko gdy Karol
   o to poprosi.
   wynik w komentarzu. Karol zwykle nie chce testować; czyta historyjkę, żeby wiedzieć,
   co zrobiłeś. Nie pytaj go po każdej historyjce, czy chce coś sprawdzić: pytaj po
   partii zmian (kilka historyjek jednej funkcjonalności, wdrożenie, koniec sprintu),
   jednym `run_ask` w ostatniej historyjce partii. Test i tak należy do niego: on
   oznacza go zaliczonym i ustawia Done, na podstawie Twojego raportu albo własnej próby.
6. **Oceń kryteria.** Przed przeniesieniem do Testing oceń każde kryterium akceptacji
   w `run_report.criteria`: `[{ index, done, evidence }]` (`index` od 0, jak w `acceptance`
   ze `story_next`; `evidence` to jedno zdanie, skąd wiesz: test, zrzut, wynik w przeglądarce).
   Niespełnione oznacz `done: false` i w `evidence` napisz powód. Tandem zapisuje przy
   kryterium `by: 'claude'`; `story_move` do Testing przypomni o kryteriach bez oceny.
   Karol niczego nie odhacza: czyta ocenę, ustawia Done albo odsyła z uwagami; gdy się
   nie zgadza, sam zmienia oznaczenie na stronie historyjki (`by: 'karol'`).
7. **Testing.** Przenieś historyjkę do Testing (`story_move`), zapisz podsumowanie,
   wynik i przebieg zmian dla Karola (`run_report` z `summary`, `result` i `walk`;
   kształt `walk` niżej, „Przebieg zmian”). Historyjka trafia do Karola
   („Czeka na Ciebie”).
8. **Done po commicie Karola.** Historyjka czeka w Testing, aż Karol napisze, że
   skomitował (osobnej kolumny „czeka na commit” nie ma: commit jest per historyjka).
   Wtedy sam, bez pytania, jednym wywołaniem: `story_move { status: "done",
   commitConfirmed: "<jego dosłowne słowa>" }`. Tandem zalicza testy historyjki (evidence
   „Karol potwierdził commit: «…» (<data>)”), ustawia Done i zapisuje w historii, że to
   Claude na jego potwierdzenie commitu – także przy „Testy zawsze do Karola”.
   `commitConfirmed` to wyłącznie cytat z wiadomości Karola w tej rozmowie, nigdy
   założenie. Działa tylko z Testing. Bez tej wiadomości Done nie ustawiasz ani nie
   wpisujesz wyniku testu (`test_result` zostaje Karola). Gdy Tandem odmówi, powiedz to
   jednym zdaniem; nie omijaj go zapisem w plikach. Gdy Karol odrzuci („Popraw z uwagami”,
   „Test niezaliczony”), historyjka wraca do To do jako następna, z jego uwagami
   w `fixes`; weź ją jak każdą inną i zacznij od uwag.
9. **Następna dopiero po Karolu.** Rytm jest zawsze ten sam: jedna historyjka pracuje,
   Karol ją testuje i commituje, dopiero wtedy rusza kolejna. Po Testing nie bierzesz
   następnej; zrobi to nowa sesja, gdy poprzednia jest w Done albo wróciła z uwagami.

## Jak pisać historyjkę

Karol przeczytał historyjkę i nie wiedział, czy jest dla niego, czy dla Claude, ani czy
ma coś zrobić. Dlatego każda historyjka ma dwie części i strona pokazuje je osobno.
Obie mają być krótkie: Karol czyta historyjki, żeby mieć pracę podzieloną na kawałki
i wiedzieć, co Claude zrobił, nie żeby wszystko testować. Tyle zdań, żeby to wiedział,
i ani jednego więcej.

1. **Dla Ciebie** – dla Karola. Pola `intent` i `acceptance`. Karol rozumie ją od razu,
   bez pytania Claude, co to znaczy.
2. **Dla Claude · polecenie** – pole `prompt`. Claude pisze je sam, kiedy zakłada
   historyjkę, i według niego potem pracuje. Karol nie musi go czytać.

Ten standard obowiązuje każdą sesję Claude w MxCraft i w Tandem: przy `story_add`,
`story_edit`, przy refinemencie i przy zakładaniu historyjki z rozmowy.

### Część dla Karola (`intent` + `acceptance`)

Prosty polski, pełne zdania, bez żargonu sesji. Pisz tak, jakby czytał ją ktoś, kto
nie widział rozmowy, w której historyjka powstała.

- **Intencja** (`intent`) ma trzy akapity, oddzielone pustą linią:
  - **Dziś:** co jest nie tak albo czego brakuje, z punktu widzenia Karola (jedno–dwa zdania).
  - **Po zrobieniu:** co będzie prawdą, kiedy historyjka jest skończona (jedno–dwa zdania).
  - **Kto:** jedna linia w kształcie
    `Kto: Claude <co robi>. Ty (Karol): <co dokładnie robisz>.`
    Karol ma z niej wiedzieć, czy i kiedy ma coś zrobić: test, decyzja, kliknięcie
    na GitHubie, założenie tokenu, rozmowa próbna. Jeśli nic poza testem:
    `Ty (Karol): nic – tylko test na końcu.` Jeśli historyjka czeka na inną albo na
    decyzję Karola, napisz to tu.
- **Każdą nazwę wyjaśnij jednym słowem**: klucz innej historyjki („historyjka AB-2,
  w której powstał serwer”), narzędzie („`start_conversation`, czyli pierwsze wywołanie
  na start rozmowy”), skrót („MCP, łącznik dla Claude”). Nazwy plików, ścieżki, nazwy
  funkcji i pól JSON nie należą do tej części; idą do polecenia.
- **Kryteria** (`acceptance`): jedno sprawdzalne zdanie na pozycję, opisane tym, co Karol
  zobaczy albo sprawdzi („Na pytanie »jakie mam projekty« Claude wymienia…”), nie tym,
  jak to jest zbudowane. Zwykle 3–6 kryteriów. Na końcu historyjki ocenia je Claude
  (spełnione albo nie, z jednym zdaniem uzasadnienia), nie Karol.
- **Tytuł** mówi, co się zmieni dla Karola, a nie jak to zbudować.
- **Pytania i decyzje** idą do swoich pól (`questions`, `decisions`), nie do opisu.
  Pytanie do Karola jest pełnym zdaniem z założeniem, które Claude przyjmie bez odpowiedzi.
- **Test** (typ `test`): jeden na całą funkcjonalność; `steps` to kilka czynności
  („Otwórz…”, „Kliknij…”), które obejmują całość, `expected` jednym zdaniem. Claude
  wykonuje go sam i pyta Karola, czy chce coś sprawdzić; zwykle nie chce.

### Przebieg zmian (`walk`, sekcja „Zmiany w modelu”)

Przy raporcie końcowym (`run_report`) Claude opisuje, co zmienił w modelu, tak, żeby
Karol przeszedł przez zmiany jak przez opowieść; strona rysuje przy każdym kroku
mikroprzepływ, stronę albo encję z modelu projektu.

- **Wstęp** (`lead`): jedno–dwa zdania, o co chodziło i co się zmieniło.
- **Kroki** (`steps`), w kolejności, w jakiej Karol ma na nie patrzeć; każdy ma:
  - `title`: co ten krok daje („Model domeny: co pamiętamy o tickecie do usunięcia”),
  - `text`: dwa–cztery zdania w formie „ty”, prostym polskim, żargon wyjaśniony przy
    pierwszym użyciu („asocjacja, czyli powiązanie między encjami”); nazwy dokumentów
    pisz tak, jak są w modelu (`MDM.TicketToDelete`), strona je wyróżni,
  - `docs`: dokumenty tego kroku: `kind` (microflow | nanoflow | page | entity | enum
    | constant), `qn` (`Moduł.Nazwa`), `state` (new | chg | del), dla zmian `was`
    i `now` jednym zdaniem; `draw: false`, gdy rysunek nic nie wnosi,
  - `check`: jedna do trzech podpowiedzi „Sprawdź”: co Karol ma zobaczyć na rysunku
    albo w Studio Pro, żeby uwierzyć, że krok jest zrobiony.
- Intencja zostaje trzema akapitami (dziś, po zrobieniu, Kto); szczegóły techniczne
  (pliki, algorytm, dlaczego tak) idą do polecenia albo decyzji, nie do przebiegu.
- Jeden krok na jedną rzecz, którą Karol ma zrozumieć, nie na jeden dokument; zwykle 2–5 kroków.

### Część dla Claude (`prompt`)

Techniczna i konkretna, tyle, żeby nowa sesja z pustym kontekstem zrobiła historyjkę
bez pytań: kontekst (repozytorium, od czego zależy), pliki, kroki, ograniczenia
(czego nie ruszać), testy, jak raportować. Wolno używać nazw plików, funkcji, pól
i skrótów. Claude pisze polecenie od razu przy zakładaniu historyjki, nie czeka na Karola.
Gdy coś musi zrobić Karol (token, klik na GitHubie), polecenie mówi, kiedy o to
poprosić przez `run_ask` i jaką dokładnie ścieżkę kliknięć mu podać.

### Forma

W polach tekstowych wolno: akapity (pusta linia) i listy z „- ” na początku linii.
Bez nagłówków markdown, emoji, pogrubień, tabel i numeracji w treści. Tyle tekstu,
ile trzeba, żeby wszystko było jasne, i ani zdania więcej. MCP Tandem (`story_add`,
`story_edit`) zwraca wskazówkę `hint`, gdy brakuje linii „Kto:” albo intencja wygląda
jak polecenie (ścieżki, nazwy plików, nagłówki); popraw historyjkę od razu.

Historyjki w Running albo Testing nie zmieniasz (`story_edit` odmawia). Gdy jej opis
jest nieczytelny, dopisz komentarz (`story_comment`) z częścią dla Karola według tego
standardu: dziś, po zrobieniu, kto co robi, jak sprawdzić.

### Rozmiar: Claude czyta przez konektor

Claude w aplikacji claude.ai (czat i głos) czyta historyjki, plany, raporty i dokumentację
przez konektor Trio, który oddaje najwyżej 24 KB naraz. Dłuższy tekst dzieli po nagłówkach
na strony ze spisem treści; tekst bez nagłówków dzieli tylko po akapitach i czyta się go gorzej.
Dlatego od teraz każda nowa historyjka, plan, raport i dokumentacja MxScout jest pisana tak:

- Markdown, a na górze podsumowanie w 2–3 zdaniach: co to jest i co z tego wynika.
- Sekcje z nagłówkami (`#`, `##`, `###`), każda sekcja najwyżej 24 KB; listy w punktach
  zamiast długich akapitów.
- Historyjka zostaje krótka (pola historyjki są bez nagłówków, zob. „Forma”); dłuższy materiał
  idzie jako plik `.md` przy tickecie (`story_attach`) albo jako dokument (`create_doc`
  w konektorze), podzielony na sekcje. `create_doc` odmawia sekcji większej niż 24 KB.

### Przykład: AB-3 przed i po

Przed (Karol nie wiedział, czy to dla niego i czy ma coś zrobić):

> Tytuł: Czytanie dokumentacji projektu z gita: projekty, stan, PRD, wyszukiwanie.
> Intencja: W trakcie rozmowy Claude musi wiedzieć, jak projekt wygląda dziś: stan,
> architektura, plan i PRD funkcjonalności. Czyta to z repo advisor-bridge, bez Google Drive.
> Kryterium: start_conversation(projekt) w jednym wywołaniu zwraca wszystko na start
> rozmowy: streszczenie projektu, STATE, ARCHITECTURE, PLAN, listę dokumentów…

Po:

Tytuł: Claude w rozmowie na telefonie od razu zna aktualny stan projektu

Intencja:

```
Dziś, kiedy rozmawiasz z Claude na telefonie o którymś projekcie, Claude nic o nim nie wie: ani jaki jest jego stan, ani co jest w planie. Musisz mu to za każdym razem opowiadać.

Po tej historyjce Claude na początku rozmowy sam czyta aktualne dokumenty projektu z repozytorium advisor-bridge na GitHubie (repozytorium to folder z plikami projektu) i od pierwszego zdania wie, o czym mówicie. Google Drive nie jest już do tego potrzebny.

Kto: Claude dopisuje czytanie dokumentów do serwera „Projekty” (łącznik, przez który Claude na telefonie sięga do Twoich projektów; powstaje w historyjce AB-2) i sprawdza je na kopii repozytorium. Ty (Karol): zakładasz na GitHubie klucz dostępu tylko do odczytu tego jednego repozytorium (Claude poda Ci, gdzie kliknąć), a na końcu robisz jedną próbną rozmowę na telefonie.
```

Kryteria:

- Gdy zaczynasz rozmowę o projekcie, Claude mówi „chwilę, czytam projekt” i potem zna jego streszczenie, stan, plan i listę dokumentów bez dalszego czekania.
- Na pytanie „jakie mam projekty?” Claude wymienia je z nazwą, jednym zdaniem opisu i tym, gdzie trafiają ich historyjki (Tandem albo ClickUp).
- Na pytanie o szczegół (np. „co mówi opis funkcji o eskalacji?”) Claude znajduje i czyta właściwy dokument.
- Claude może tylko czytać i tylko repozytorium advisor-bridge: niczego w nim nie zmieni i nie zajrzy do innych repozytoriów.
- Każda odpowiedź zaczyna się od dwóch–trzech zdań streszczenia, które dobrze brzmią czytane na głos.

Polecenie (dla Claude):

```
Kontekst: serwer MCP „Projekty” z AB-2 (repo advisor-bridge). Zaczynasz dopiero, gdy AB-2 jest w Done.

Dodaj narzędzia:
- start_conversation(project): jedno wywołanie zwraca summary projektu, STATE.md, ARCHITECTURE.md, PLAN.md, listę plików .md z jednym zdaniem o każdym i otwarte szkice (AB-4; do czasu AB-4 pusta lista). Jedno wywołanie, bo wywołania w trybie głosowym są wolne (wynik AB-1).
- list_projects(): rejestr projects.json w repo: name, slug, summary, target (tandem | clickup).
- read_doc(project, path) i search_docs(project, query) nad plikami .md projektu (docs/, PRD).

GitHub: fine-grained token, tylko Contents: read, tylko repo advisor-bridge, w zmiennej środowiskowej na serwerze, nigdy w repo. Token zakłada Karol: przez run_ask podaj mu ścieżkę GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token, z wyborem repo i uprawnień, i gdzie go wpisać na serwerze.

Każda odpowiedź ma najpierw pole summary (2–3 zdania do czytania na głos), potem treść. Testy na lokalnej kopii repo (fixture), bez sieci. README: nowe narzędzia i zmienna z tokenem. Decyzje w tickecie.
```

## Zasady

- Historia, kryteria, decyzje i zmiany w modelu żyją w tickecie, nie w czacie.
  W czacie zostaw jedno zdanie: co zrobiłeś i klucz historyjki.
- Krótkie zdania, po polsku, jak Karol. W poleceniu i w komentarzach technicznych
  słownictwo Mendix (entity, microflow, sub-microflow, page, snippet, module role, XPath);
  w części dla Karola prosty język według standardu wyżej.
- Nic nie przechodzi między modułami bez wyraźnego polecenia. Moduły Marketplace
  zostają w spokoju.
- Przed zmianą w modelu prawdziwej aplikacji obowiązuje zasada backupu Karola:
  kopia repo na dysku i tag w git.
- Gdy Karol włączył „Tylko odczyt”, czytasz i proponujesz, niczego nie zapisujesz.
- Plany, raporty i dokumentację piszesz w Markdown z podsumowaniem na górze i sekcjami do 24 KB
  (zob. „Rozmiar: Claude czyta przez konektor”).

## Pomysły

Pomysł (zakładka Pomysły, `<PREFIX>-I<n>`) to miejsce na to, o czym Karol i Claude rozmawiają przez
kilka sesji, zanim powstaną historyjki. Nie jest ticketem: nie ma go na tablicy, nie idzie do pipeline'u
i niczego nie uruchamia. W konektorze Trio: `idea_create`, gdy Karol mówi „zapisz to jako pomysł”;
`idea_get` przed rozmową o nim; `idea_update` z `note` na ustalenia z rozmowy (nie zapis rozmowy) i ze
statusem `ready`, gdy Karol uzna go za gotowy. `idea_to_stories` tylko po decyzji Karola: najpierw pokaż
mu listę historyjek (według standardu „Jak pisać historyjkę”) i zapytaj, czy do Draft, czy do To do;
`todo` startuje build i wymaga `confirm=true`. Nic nie zamienia się samo.

## Narzędzia

Zalecane: serwer MCP `tandem` (`sprint_read`, `story_next`, `story_move`, `story_assign`,
`story_comment`, `story_attach`, `test_add`, `run_report`, `run_ask`, `model_read`). Strony odświeżają
się w chwili wywołania, a tokeny per krok dochodzą na bieżąco.

Bez MCP: te same pliki przez `node <MxCraft>/bin/db.js` (`list`, `get`, `update`, `log`,
`next-key`). `update` scala obiekty, a tablice zastępuje w całości, więc przy
`acceptance`, `questions`, `log`, `review` wysyłaj całą nową listę.
