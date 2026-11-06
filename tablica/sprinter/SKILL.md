---
name: sprinter
description: Zasady Sprintera, wspólnego rdzenia MxCraft i Tandem – tygodniowe sprinty, historyjki z kryteriami (standard „Dla Ciebie” + „Dla Claude · polecenie”: jak pisać historyjkę, żeby Karol zrozumiał ją od razu), tablica To do · Running · Done (z pipeline: Draft · To do · Running · Automated Testing · Done · On Prod), testy automatyczne i kto co robi (Karol mówi, czego chce, i wypuszcza na prod; Claude buduje; testu człowieka w Tandem nie ma). Mówi, jak brać historyjki z To do w kolejności sprintu, kiedy przesuwać je między kolumnami, kto ustawia Done (Claude albo pipeline, nie Karol) i jak zapisywać historię, kryteria i zmiany w modelu w tickecie, nie w czacie. Używaj w każdym projekcie prowadzonym w MxCraft albo Tandem, gdy planujesz, szacujesz, budujesz albo zmieniasz status pracy; skill tandem dokłada do tego raportowanie kroków i tokenów.
---

# Sprinter: jak pracuje zespół Karol + Claude

Wersja 0.16 · 2026-11-06 (TAN-193: bez kolumny Planowanie; ticket planistyczny z planem do MxScout prosto do Done, ticket budowy buduje z planu albo bez. 0.15 · 2026-11-05: TAN-191: testy partiami – w projekcie z `pipeline.tests` = batch, domyślnie Mendix, ticket idzie do Done po buildzie, mx check i samoocenie kryteriów, a Security, Database, Migracje i UI test biegną raz na partię; partia nie trzyma kolejki buildów. 0.14 · 2026-11-01: TAN-121: „Jak pisać do Karola”, pięć reguł z przykładami; serwer MCP odrzuca podsumowanie bez części dla Karola. 0.13: TAN-118: polskie nazwy kolumn, zakładek, kroków i stanów na ekranie, id bez zmian. 0.12: TAN-65: bez tagu „kto”; kto ma ticket, mówi tylko przypisanie (Karol / Claude), zmieniane z nagłówka ticketu razem ze statusem. 0.11: TAN-28: blokada historyjek w wydaniu na prod, „Anuluj wydanie”. 0.10: TAN-14: bez punktów i ról, tylko imiona; opis dla Karola krótki i jasny, polecenie dla Claude zawsze szczegółowe; TAN-19: Pauza zamiast „Tylko odczyt”. 0.9: GEN-33: tag „kto” na tickecie: kto robi, blokada przed przypadkowym startem. 0.8: GEN-26: bez testu człowieka – kolumny Testing i Human Testing, testy dla Karola i Done na jego commit znikają; koniec historyjki to Done albo Automated Testing. 0.7: Pomysły: miejsce przed historyjkami, zamiana tylko po pytaniu Draft czy To do. 0.6: tablica projektu z pipeline: Draft → On Prod, kto co przesuwa; Automated Testing i Draft po nieudanym przebiegu też są „jednym jobem”. 0.5: kryteria ocenia Claude w raporcie końcowym; rozmiar do czytania przez konektor: najwyżej 24 KB, sekcje, podsumowanie na górze)

Ten plik mieszka w Tandem (`skills/sprinter/SKILL.md`, od GEN-19). Kopia w repo MxCraft
zostaje tylko do jego wyłączenia (GEN-20); nie zmieniaj jej. `$TANDEM_DIR` to folder repo Tandem.

Sprinter to wspólny rdzeń MxCraft i Tandem: te same sprinty, historyjki i tablica,
zapisane jako pliki JSON w folderze roboczym MxCraft (`workspace/`).
Strony odświeżają się same, gdy coś zapiszesz. Karol patrzy na postęp tam, nie w czacie.

## Kto co robi

Na tickecie widać tylko imiona: Claude, Karol. Ról (tester, deweloper) ani punktów nie ma.

- **Karol** mówi, czego chce, ustala kolejność,
  odpowiada na pytania z refinementu i wypuszcza na prod („Na prod”). W Tandem nie
  testuje: przed wydaniem sam sprawdza, co chce, a historyjkę z Done może odesłać
  („Popraw z uwagami”).
- **Claude** zapisuje historyjki według standardu niżej (część dla Karola
  i polecenie dla siebie), bierze je z To do w kolejności sprintu, jedną naraz, buduje,
  dopisuje testy automatyczne, ocenia kryteria i przenosi do Done (z pipeline: do
  Automated Testing).

## Sprint i tablica

- Sprinty są tygodniowe. Aktywny jest tylko jeden. Historyjki spoza aktywnego sprintu
  są w backlogu („Do refinementu” → „Gotowe do sprintu” → „Następny sprint”).
- Kolumny: **To do · Running · Done** (Backlog jest poza tablicą). Kolejność w To do ustala Karol
  w Tandem („Następne w sprincie”): mniejsze `order` idzie pierwsze, potem numer.
- Historyjka ma: `key`, `title`, `type` (story, bug, task, refinement), `points`
  (1 2 3 5 8 13), `prompt` (polecenie, które Claude pisze dla siebie), `intent`, `acceptance` (kryteria),
  `questions`, `decisions`, `changes` (zmiany w modelu), `assignee` (karol | claude),
  `log` (historia). Testów dla Karola (ticketów typu test) już nie ma.

### Nazwy na ekranie (TAN-118)

Identyfikatory kolumn w plikach, MCP i konektorze się nie zmieniają; ekran, historia ticketu i konektor pokazują
polskie nazwy z jednego słownika (`shared/labels.js`). W tym skillu i w poleceniach dalej piszemy też nazwy dawne.

| id | dawna nazwa | na ekranie |
|---|---|---|
| `draft` | Draft | Szkic |
| `todo` | To do | Do zrobienia |
| `running` | Running | Claude buduje |
| `autotest` | Automated Testing | Testy |
| `testing` | Human Testing | Test Karola (tylko z `pipeline.humanTesting`) |
| `done` | Done | Gotowe |
| `prod` | On Prod / Produkcja | Na produkcji (Mendix: Acceptance) |

Zakładki ticketu: Dla Ciebie · Kryteria · Dla Claude · Przebieg · Historia. Kroki: Sprawdzenie kodu (`codeCheck`),
Sprawdzenie modelu (`modelCheck`), Bezpieczeństwo (`security`), Testy (`unitTests`), Baza (`database`), Test ekranu
(`uiTest`), Scalenie z główną gałęzią (`mainMerge`). Stany: zielone (`pass`), czerwone (`fail`), w toku, pominięte
(`skipped`, z powodem: „pominięte: brak polecenia w profilu”), z ostrzeżeniem (`warning`). Własna nazwa kolumny projektu
(Ustawienia → Kolumny, np. Qwen: „Qwen pracuje”) wygrywa ze słownikiem. W `story_move` i `move_ticket` podajesz zawsze id.

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
| Acceptance | `prod` | Karol przenosi tu, co ma iść na akceptację; skrypt przenosi (cherry-pick) commity tych historyjek z test na ACCP i dopisuje wynik w tickecie. Konflikt: ticket zatrzymany w Acceptance z plikami w powodzie – wtedy, i tylko wtedy, wkracza Claude. Bez `gitFlow` tu kończy wdrożenie. Claude nie przesuwa tu narzędziem. Kiedy wdrożenie rusza, mówi tryb wdrożenia projektu (profil, `deployMode`): `manual` (domyślny) – Karol klika „Release na prod” nad tablicą i jeden job wdraża całe Done; `each` – po każdym Done; `off` – nigdy. Zamknięcie sprintu niczego nie wdraża. |

Human Testing (`testing`) zostaje tylko w projekcie z pipeline i `pipeline.humanTesting: true` (GEN-29): wtedy
Karol robi Human Test na stronie, ustawia Done albo odsyła do Draft z uwagami. Poza tym testu człowieka nie ma (GEN-26).

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

**Jeden job na projekt** obejmuje tu Running i Automated Testing (i Human Testing, gdzie jest; Done nigdy nie blokuje; karta „Partia testów” nigdy nie blokuje, TAN-191):
`story_next` nic nie bierze, gdy historyjka jest w `autotest` („czeka na testy
automatyczne”), a `tandem-watch` nie startuje sesji także wtedy, gdy historyjka jest
zatrzymana (MXC-137): nieudany krok albo wdrożenie nie cofają jej do Draft,
tylko zostawiają w jej kolumnie z polem `halt` (`sprint_read.halted`: kolumna, krok,
jedno zdanie powodu), czerwoną ramką i przypisaniem do Karola. Karol decyduje: „Wznów”
(krok od nowa, z tego samego miejsca), „Pomiń krok” albo sam przenosi ją do Draft lub
To do – wtedy powód trafia do `fixes`, a Ty bierzesz ją jak każdą inną i zaczynasz od
`fixes`. Zatrzymanej historyjki nie przesuwasz sam.

## Blokada w wydaniu na prod (TAN-28)

Gdy wydanie na prod stoi w kolejce albo trwa, jego historyjki mają kłódkę z powodem i nie da się ich przenieść,
zmienić (tytuł, opis, kryteria, polecenie) ani usunąć: na stronie (też wsadowo), przez konektor i MCP. Komentarz
i historia przechodzą. Blokada leży w zapisie wydania (`pipeline/release`), więc przeżywa restart, i znika sama po
sukcesie, błędzie albo anulowaniu. „Anuluj wydanie” zatrzymuje wydanie, którego Mac jeszcze nie wziął;
wdrożenia w toku nie przerywa.

## Rytm historyjki

1. **Weź następną** z To do w kolejności sprintu (`story_next`). Nie bierz dwóch naraz.
   **Na jednym projekcie pracuje jedna historyjka naraz**: gdy inna jest w Running albo
   w Automated Testing (`story_next` zwraca listy `running` / `autotest`), nic nie bierze;
   Done nie blokuje. Wtedy, tak samo
   jak przy pauzie albo pustej kolejce, powiedz to jednym zdaniem i stop.
2. **Przeczytaj wszystko, co dostałeś**: polecenie, intencję, kryteria, pytania,
   uwagi Karola z poprzedniej rundy (`fixes`), listę „do sprawdzenia” (`review`).
   Moduły z modelu czytaj przez `model_read`, nie z pamięci.
3. **Running.** Historyjka jest już w Running po `story_next`. Pracuj według polecenia
   i kryteriów. Decyzje zapisuj w tickecie (`story_comment` z `decision`), zmiany
   w modelu też (`story_comment` z `change`: moduł, rodzaj, przed, po).
4. **Pytanie, na które sam nie odpowiesz**, dopisz do „do sprawdzenia” (`run_ask`)
   z rozsądnym założeniem i idź dalej. Nie zatrzymuj się na pytaniu w czacie.
   Gdy bez odpowiedzi nie da się iść dalej, `run_wait`: ticket stoi w swojej kolumnie
   z oznaczeniem „Potrzebna odpowiedź” i wraca od tego samego kroku po odpowiedzi Karola;
   nie cofaj go do To do (skill tandem, „Przebieg”, pkt 4).
5. **Sprawdź sam.** Gdy skończysz, sprawdź całość sam (testy jednostkowe, przeglądarka,
   kopia projektu, Studio Pro, gdy się da) i wpisz wynik w komentarzu. Testu dla Karola
   nie zakładasz: w Tandem nie ma testu człowieka, zakładki „Test” ani ticketów do testu.
   W projekcie z pipeline możesz podać przypadki dla automatycznego kroku testu UI
   (`test_cases_set`); to scenariusze dla pipeline'u, nie dla Karola. Historyjek
   „środowisko testowe” nie zakładaj sam, tylko gdy Karol o to poprosi. Karol czyta
   historyjkę, żeby wiedzieć, co zrobiłeś; przed wydaniem na prod sam sprawdza, co chce.
   Nie pytaj go po każdej historyjce, czy chce coś sprawdzić: jeśli już, to po partii
   zmian (kilka historyjek jednej funkcjonalności, koniec sprintu), jednym `run_ask`
   w ostatniej historyjce partii.
6. **Oceń kryteria.** Przed przeniesieniem do Done (z pipeline: do Automated Testing) oceń
   każde kryterium akceptacji w `run_report.criteria`: `[{ index, done, evidence }]`
   (`index` od 0, jak w `acceptance` ze `story_next`; `evidence` to jedno zdanie, skąd
   wiesz: test, zrzut, wynik w przeglądarce). Niespełnione oznacz `done: false` i w `evidence`
   napisz powód. Tandem zapisuje przy kryterium `by: 'claude'`; `story_move` przypomni
   o kryteriach bez oceny. Karol niczego nie odhacza: czyta ocenę; gdy się nie zgadza,
   sam zmienia oznaczenie na stronie historyjki (`by: 'karol'`) albo odsyła z uwagami.
7. **Done.** Przenieś historyjkę do Done (`story_move` do `done`; z pipeline do `autotest`,
   a po zielonych testach automatycznych pipeline sam przeniesie ją do Done i zapisze to
   w historii; w trybie partiami po buildzie, mx check i Twojej ocenie kryteriów, testy idą potem w partii). Dawne `story_move` do `testing` serwer też przyjmie jako koniec budowy,
   ale pisz `done` / `autotest`. Zapisz podsumowanie, wynik i przebieg zmian dla Karola
   (`run_report` z `summary`, `result` i `walk`; kształt `walk` niżej, „Przebieg zmian”).
   Done nie czeka na Karola ani na jego commit; ustawiasz je Ty albo pipeline.
8. **Uwagi Karola.** Karol może odesłać historyjkę z Done („Popraw z uwagami”): wraca do
   To do jako następna, z jego uwagami w `fixes` (`story_next` je zwraca); weź ją jak każdą
   inną i zacznij od uwag. Gdy Tandem czegoś odmówi, powiedz to jednym zdaniem; nie omijaj
   go zapisem w plikach. Gdy Karol sam commituje (np. model Mendix), commit nie zmienia
   statusu historyjki.
9. **Następna w nowej sesji.** Rytm jest zawsze ten sam: jedna historyjka pracuje, kończy
   w Done (z pipeline: w Automated Testing), dopiero wtedy rusza kolejna. Po Done nie
   bierzesz następnej; zrobi to nowa sesja, gdy w projekcie nic nie jest w Running ani
   w Automated Testing.

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
nie widział rozmowy, w której historyjka powstała. **Krótko i jasno**: po co jest
historyjka i co ma powstać, nic więcej. To pierwszy widok strony historyjki w Tandem
(„Opis”, pod nim pliki); kryteria są w osobnej zakładce, polecenie w zakładce „Dla Claude”.

- **Intencja** (`intent`) ma trzy akapity, oddzielone pustą linią:
  - **Dziś:** co jest nie tak albo czego brakuje, z punktu widzenia Karola (jedno–dwa zdania).
  - **Po zrobieniu:** co będzie prawdą, kiedy historyjka jest skończona (jedno–dwa zdania).
  - **Kto:** jedna linia w kształcie
    `Kto: Claude <co robi>. Ty (Karol): <co dokładnie robisz>.`
    Karol ma z niej wiedzieć, czy i kiedy ma coś zrobić: decyzja, kliknięcie
    na GitHubie, założenie tokenu, rozmowa próbna. Jeśli nic:
    `Ty (Karol): nic.` Jeśli historyjka czeka na inną albo na
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

**Zawsze szczegółowa**, nawet gdy opis dla Karola ma dwa zdania: techniczna i konkretna,
tyle, żeby nowa sesja z pustym kontekstem zrobiła historyjkę bez pytań: kontekst (repozytorium, od czego zależy), pliki, kroki, ograniczenia
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

Historyjki w Running, Automated Testing ani w Done nie zmieniasz (`story_edit` odmawia). Gdy jej opis
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

## Zasady

- Informacja dla Claude (TAN-72): Karol dopisuje wskazówki do historyjki w każdej kolumnie (zakładka „Dla Claude”,
  w czacie `add_note`). Czytasz je przy planowaniu, budowie i ponownym przebiegu, a w Running przy najbliższym kroku;
  każdą potwierdzasz w historii (`acks`): uwzględnione albo dlaczego nie.
- Historia, kryteria, decyzje i zmiany w modelu żyją w tickecie, nie w czacie.
  W czacie zostaw jedno zdanie: co zrobiłeś i klucz historyjki.
- Krótkie zdania, po polsku, jak Karol. W poleceniu i w komentarzach technicznych
  słownictwo Mendix (entity, microflow, sub-microflow, page, snippet, module role, XPath);
  w części dla Karola prosty język według standardu wyżej.
- Nic nie przechodzi między modułami bez wyraźnego polecenia. Moduły Marketplace
  zostają w spokoju.
- Przed zmianą w modelu prawdziwej aplikacji obowiązuje zasada backupu Karola:
  kopia repo na dysku i tag w git.
- Gdy Karol wstrzymał Tandem (Pauza na Teraz), nie bierzesz nowej historyjki; bieżącą kończysz. Przy wyłączniku
  awaryjnym czytasz i proponujesz, niczego nie zapisujesz. Zmiany w Mendix idą zawsze przez pliki (TAN-19).
- Plany, raporty i dokumentację piszesz w Markdown z podsumowaniem na górze i sekcjami do 24 KB
  (zob. „Rozmiar: Claude czyta przez konektor”).

- Nigdy sam (TAN-108): obejście strażnika albo zmiana jego ustawień („Prawdziwy projekt”), prawdziwe dane i `.mpr`
  prawdziwego projektu bez zgody, rotacja kluczy, scalenie w mxcraft-skills bez „gotowe”, wydanie na prod, DNS
  i Cloudflare, usuwanie gałęzi i plików spoza obszaru ticketu. Resztę błędów najpierw klasyfikujesz i próbujesz
  obejść według skilla tandem („Eskalacja”) i Atlasu „Gdy pipeline staje”; Karola pytasz po wyczerpaniu prób.

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
`story_comment`, `story_attach`, `run_report`, `run_ask`, `model_read`). Strony odświeżają
się w chwili wywołania, a tokeny per krok dochodzą na bieżąco.

Bez MCP: te same pliki przez `node "$TANDEM_DIR/bin/db.js"` (`list`, `get`, `update`, `log`,
`next-key`). `update` scala obiekty, a tablice zastępuje w całości, więc przy
`acceptance`, `questions`, `log`, `review` wysyłaj całą nową listę.
