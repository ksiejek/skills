# Sprinter · Jak pisać historyjkę, przebieg zmian (walk), rozmiar
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go przy zakładaniu, zmianie i refinemencie historyjki oraz przy raporcie z modelem.

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

Po kontekście polecenie ma zawsze trzy części, w tej kolejności (TAN-227), każdą jako akapit
zaczynający się od jej nazwy:

- `Where:` pliki i funkcje do zmiany, z jednym istniejącym wzorem do naśladowania
  („follow the hint of humanHint in lib/story-standard.js”). To lista dla sesji budowy:
  zaczyna od tych miejsc, zamiast szukać.
- `Check:` dokładne polecenie i oczekiwany wynik (`node --test test/x.test.js` → all pass;
  `npm test` → 0 failures).
- `Out of scope:` czego nie ruszać (inne moduły, historyjki w To do i dalej, pliki wspólne).

Sesja planująca (refinement, `idea_to_stories`, zakładanie kilku historyjek z rozmowy)
czyta kod raz i wpisuje te trzy części do każdej historyjki, którą zakłada. Sesja budowy
dostaje wtedy wskazówki, a nie zadanie szukania.
Gdy coś musi zrobić Karol (token, klik na GitHubie), polecenie mówi, kiedy o to
poprosić przez `run_ask` i jaką dokładnie ścieżkę kliknięć mu podać.

### Podział: jedna historyjka, jedna widoczna rzecz (TAN-227)

Pomiar z 14 dni: historyjka wymienia średnio 10 plików (co czwarta 14 i więcej); trudna
zużywa 4,7 mln tokenów wejścia, zwykła 1,4 mln; co piąta sesja rośnie ponad 150 tys.
kontekstu, przy którym model gorzej pamięta początek pracy. Mniejsze historyjki trzymają
kontekst mały i każdą sprawdza się osobno.

- **Górna granica**: jedna historyjka daje jedną rzecz, którą Karol zobaczy; najwyżej
  6 kryteriów i około 7 zmienianych plików (testy, CHANGELOG i dokumenty idą za zmianą
  i się nie liczą).
- **Większa praca** to kilka historyjek połączonych `dependsOn`, w kolejności, w jakiej
  muszą wejść (najpierw podstawa, potem to, co z niej korzysta). Każda ma własne kryteria
  i własne Where, Check, Out of scope.
- **Dolna granica**: każda historyjka płaci stały start (ok. 34 tys. tokenów kontekstu
  i swoje kroki pipeline). Drobne zmiany w tym samym miejscu zostają w jednej historyjce;
  poniżej ok. 3 plików nie dzielisz, chyba że części są od siebie niezależne.
- Tandem pokazuje na karcie w Szkicu podpowiedź „Za duża”, gdy historyjka ma ponad
  6 kryteriów albo ponad 8 plików do zmiany (ślad plików albo pliki wymienione w poleceniu
  przed `Out of scope:`); tę samą podpowiedź zwracają `story_add`, `story_edit`
  i w konektorze `create_ticket`, `update_ticket`. Liczy kryteria i pliki, nigdy długości
  polecenia (TAN-226).

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
- Makieta, którą Karol ma zaakceptować (TAN-223), jest zawsze załącznikiem ticketu `<KLUCZ>.mockup.html`
  (`story_attach`; jeden plik bez skryptów i bez zasobów z zewnątrz, Tandem rysuje jako stronę tylko końcówkę
  `.mockup.html`). Najpierw załącznik, potem pytanie „makieta w zakładce Pliki ticketu”; sama ścieżka do pliku w repo
  albo na Macu nie wystarcza, bo Karol czyta tickety z laptopa (`run_wait` takie pytanie odrzuca).


