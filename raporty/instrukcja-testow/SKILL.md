---
name: instrukcja-testow
description: Instrukcja testów dla nietechnicznych testerów aplikacji Mendix Karola, sprawdzona przejściem w przeglądarce. Zakłada ticket w projekcie aplikacji ze stałego szablonu, sam wybiera z ticketów tylko funkcje widoczne dla użytkownika (pomija zmiany techniczne i drobne poprawki), pisze po polsku z perspektywy użytkownika, bez numerów ticketów i nazw technicznych, zawsze od wejścia na środowisko: lokalne na Mac Studio (bramka, kod z maila, konto per rola, uruchomienie, samo wyłączanie) albo testowe w chmurze Mendix (strona logowania, konta z jednym wspólnym hasłem, którego skill nigdy nie zapisuje). Dokument powstaje skillem dokumentacja (HTML, .docx, .md) albo jako paczka osobnych plików HTML w ZIP-ie (jeden temat na plik), a Claude przechodzi w przeglądarce dokładnie napisane kroki tymi samymi kontami, aż przejdą wszystkie, ze zrzutem na scenariusz. Używaj, gdy Karol prosi o instrukcję dla testerów aplikacji albo sprintu: „/instrukcja-testow”, „instrukcja dla testerów”, „przygotuj testy dla biznesu”, „scenariusze dla testerów”, „daj to do przetestowania”, „paczka dla testerów”.
argument-hint: "<projekt Tandem> [zakres: sprint, tickety, od daty] [--pack]"
---

# Instrukcja testów dla testerów nietechnicznych

Wersja 0.3 · 2026-10-31 (GEN-50). Wygląd i pliki: skill `dokumentacja` (GEN-47), nigdy własny styl.
Przeglądarka: sterownik CDP z Tandem (`$TANDEM_DIR/modules/mendix/lib/cdp.js`, Chrome z Maca, bez npm).
`$SKILL` to folder tego skilla (`~/.claude/skills/instrukcja-testow`), `$TANDEM_DIR` repo Tandem (`~/Projects/Tandem`).
Przykłady: `przyklad/instrukcja.json` (bramka lokalna, jeden dokument, zbudowane pliki obok) i
`przyklad/paczka-chmura/instrukcja.json` (Test w chmurze Mendix, paczka plików; z przebiegu SD-97 na Service Desku).

Instrukcja jest gotowa dopiero, gdy **cała** przechodzi w przeglądarce. Tekst i przejście biorą się z jednego pliku
`instrukcja.json`: każdy krok ma zdanie dla testera (`text`) i to samo jako akcje przeglądarki (`do`).

## Dwa środowiska, dwie postaci dokumentu

| | Bramka lokalna (Mac Studio) | Chmura (Mendix Cloud, środowisko Test) |
| --- | --- | --- |
| `access.kind` | `gate` (domyślnie) | `cloud` |
| Wejście | bramka, kod z maila, konto ze strony wyboru, bez hasła | strona logowania (`access.url`, np. `…/login-admin.html`), login konta i wspólne hasło testerów |
| Hasło | nie ma | w 1Password (`access.passwordOp`: odnośnik `op://Sejf/Pozycja/password`, z sejfem, bo service account go wymaga; `walkthrough.js` czyta je raz przez `op`: na Macu Karola tokenem service accountu „Praca” z `~/Mx/bin/op-sa-token`, jak sesje budujące Tandem (SD-83), inaczej po `op signin` Karola; pozycja musi być w sejfie „Praca”) albo w zmiennej środowiska o nazwie z `access.passwordEnv`; nigdy w `instrukcja.json`, w plikach skilla ani w dokumencie (tester dostaje je od Karola osobno) |
| Konto w `loginAs` | nazwa ze strony wyboru | `id` albo `login` z tabeli kont |

Postać: **jeden dokument** (`guide.js`: .html, .docx, .md przez skill `dokumentacja`) albo **paczka** (`guide.js --pack`):
folder `<name>/` ze spisem `index.html`, stroną `01-wejscie-na-<środowisko>.html` i jedną stroną na scenariusz, czcionki
w środku (otwiera się dwuklikiem bez internetu), spakowany do `<name>.zip`. Paczka to postać dla testerów biznesowych
(tak oddano SD-97); jeden dokument wystarcza, gdy scenariuszy jest kilka i czyta je jedna osoba.

## Przebieg

1. **Ticket ze stałego szablonu.** W projekcie aplikacji w Tandem załóż ticket według `$SKILL/szablon-ticketu.md`
   (`story_add`; tytuł, intencja z linią „Kto”, sześć kryteriów i polecenie podstawiasz tylko w `{…}`). Jeśli ticket
   na tę instrukcję już jest (Draft, To do), uzupełnij go `story_edit` zamiast zakładać drugi. Pracę nad instrukcją
   raportujesz w tym tickecie (`story_comment`, `story_attach`).
2. **Wybór zmian.** `node $SKILL/bin/tickets.js <projekt> [--status done,prod] [--since RRRR-MM-DD]` dzieli tickety
   na „widoczna”, „drobna”, „tech” (pierwsza ocena po tytule i typie). Przeczytaj intencję każdego „widocznego” i
   zdecyduj sam:
   - bierzesz tylko to, co użytkownik zobaczy albo zrobi w przeglądarce;
   - pomijasz zmiany techniczne (nazwy, porządki w modelu, refaktor, pipeline, wydajność, infrastruktura, analizy,
     testy, konfiguracja) i drobne poprawki błędów jako osobne scenariusze; drobna poprawka może być oczekiwanym
     wynikiem w scenariuszu funkcji, której dotyczy;
   - grupujesz według funkcji, nie według ticketów: jeden scenariusz to jedna rzecz, którą tester sprawdza;
   - tego, czego lokalnie nie da się sprawdzić (brak danych, maile, inne systemy), nie opisujesz jako scenariusz:
     trafia do `notInGuide` jednym zdaniem dla testera.
   Listę wybranych i pominiętych (z powodem) zapisz w tickecie `story_comment`; to jedyne miejsce z numerami ticketów.
3. **Poznaj ekrany, zanim napiszesz kroki.** Uruchom aplikację tak jak tester i przejdź funkcję z `--explore`
   (`walkthrough.js` drukuje tekst strony po każdym kroku; w chmurze z hasłem w zmiennej, jak w kroku 6). Kroki piszesz
   z tego, co naprawdę widać: nazwy przycisków, pól i zakładek dokładnie jak na ekranie, numery spraw z danych testowych.
4. **Napisz `instrukcja.json`** (wzory: `przyklad/instrukcja.json`, `przyklad/paczka-chmura/instrukcja.json`):
   - `name` (nazwa plików), `app`, `env` (nazwa środowiska, np. Test), `title`, `lead`, `audience`, `date`;
   - `access` (zawsze pełny, zawsze pierwszy rozdział). Bramka: `gate` (adres bramki), `login` (e-mail i kod z maila),
     `loginSteps`, `start` („Uruchom aplikację” / „Spróbuj ponownie”), `autoStop` (2 h bez ruchu, 1–2 h licencja
     próbna), `restart`, `popup`; `walkUrl` to droga Claude do tej samej bramki (tailnet Karola), nie trafia do dokumentu.
     Chmura: `kind: "cloud"`, `url` (strona logowania), `passwordOp` (odnośnik `op://Sejf/Pozycja/password`) albo `passwordEnv` (nazwa
     zmiennej z hasłem), `login` (zdanie, skąd tester ma hasło), `loginSteps` [{ `text`, `expect` }], `notes`, `accountsIntro`, `accountsNote`, `switch` (jak zmienić
     konto), `switchNote`, `dismiss` (okienka do zamknięcia po zalogowaniu, np. „Don't show again”), `form` (etykiety
     logowania, gdy inne niż „User name”, „Password”, „Sign in”), `lead`, `summary` (karta w spisie paczki);
   - `accounts`: `id`, `role`, `login` (chmura), `name` (bramka: dokładnie jak na stronie wyboru konta), `what`,
     `op: true` dla operatora (zielona plakietka w paczce);
   - `scenarios`: `id` (S0, S1… albo A, B…), `title`, `goal`, `account` (konto domyślne), opcjonalnie `before`, `lead`,
     `summary` (karta w spisie), `eyebrow`, `file` (nazwa strony w paczce), `hint`, `accountsNote`, `sections` (własne
     rozdziały przed krokami: bloki `p`, `table`, `note` skilla dokumentacja), `steps`, `notes` (po krokach),
     `expect` { `text`, `do` }. S0 na bramce to zawsze wejście na środowisko.
     Wpisy `steps`: krok { `text`, `expect` (co powinno się stać: kolumna w paczce), `account` (gdy inne niż konto
     scenariusza), `do` } albo wpis tylko do dokumentu: { `section` } (nowy rozdział z numerem), { `heading` }
     (śródtytuł), { `p` } (akapit), { `note` }. Numeracja kroków biegnie przez cały scenariusz;
   - `troubles` (gdy coś nie działa) i `notInGuide`.
   Akcje `do`: `open` (ścieżka albo adres), `loginAs` (bramka: nazwa ze strony wyboru; chmura: `id` albo `login`,
   przeglądarka czyści ciasteczka i loguje od nowa), `click` (tekst na ekranie; `optional` dla okienek „gdy się
   pojawi”), `fill` (etykieta pola, `value`; `selector`, gdy dwa pola mają tę samą etykietę; `secret: true` wpisuje hasło testerów zamiast `value`), `choose` (lista
   natywna albo rozwijany widżet; `value` jak na liście), `click` z `selector` (zapas dla przycisku bez tekstu, np.
   czerwone ×), `see`, `seeNot`, `wait`. `{run}` w `value`, `click`, `see` to znacznik przebiegu (GGMM): tytuł sprawy
   zostaje unikalny przy powtórce. Krok, którego przeglądarka nie zrobi (kod z maila), ma `human` z powodem zamiast `do`.
   Krok z `account` innym niż zalogowane konto: przeglądarka sama zmienia konto przed akcjami (chmura: wyloguj i
   zaloguj; bramka: strona wyboru). Po zmianie konta akcje mogą zaczynać się od dojścia do sprawy, bo tester ma ją
   otwartą w drugim oknie; tekst kroku tego nie powtarza.
5. **Sprawdź zasady:** `node $SKILL/bin/guide.js instrukcja.json --check` odrzuca numer ticketu, nazwę techniczną
   (mikroflow, encja, moduł, prefiksy `ACT_`, `SUB_`…), lukę w wejściu na środowisko (chmura: `url`, `passwordEnv`,
   login każdego konta), scenariusz bez celu, konta, kroków albo wyniku, konto spoza tabeli kont (po `id`, `login`
   albo nazwie) i hasło testerów w którymkolwiek tekście (gdy zmienna jest ustawiona).
6. **Przejdź w przeglądarce:** `TANDEM_DIR=… node $SKILL/bin/walkthrough.js instrukcja.json [folder]`; w chmurze
   hasło bierze z 1Password (`passwordOp`, po `op signin` Karola) albo z linii poleceń: `SD_TEST_PASSWORD=… node …`
   (zmienna o nazwie z `passwordEnv`); skill nie czyta hasła z żadnego pliku i nigdy go nie wypisuje. Prawdziwe kliknięcia myszą i pisanie z klawiatury, okno 1440 × 900, to
   samo konto co w scenariuszu; element zasłonięty okienkiem to błąd, jak dla testera. Odrzucone logowanie (złe hasło,
   zablokowane konto) przerywa **całe** przejście od razu (kod 3), bo kilka nieudanych logowań blokuje konto.
   Wynik: `przejscie/walkthrough.md`, `walkthrough.json`, zrzut `S<n>.png` na scenariusz, a przy błędzie `S<n>-blad.png`
   i `S<n>-blad.txt` (widoczne pola, przyciski i listy z ich tekstami: do poprawy kroków bez przeglądarki). Każdy krok,
   który nie przeszedł:
   - instrukcja była nieścisła (inny przycisk, brak kroku, okienko) → popraw tekst **i** akcje w `instrukcja.json`;
   - aplikacja działa źle → zgłoś błąd ticketem w projekcie aplikacji (`story_add`, typ bug) i usuń scenariusz z
     instrukcji albo opisz obejście; nigdy nie dopasowuj oczekiwanego wyniku do błędu;
   - potem **całość od nowa**, aż wszystkie scenariusze przechodzą.
7. **Zbuduj dokument:** `node $SKILL/bin/guide.js instrukcja.json [folder] --walk przejscie/walkthrough.json`
   (plus `--pack` dla paczki) → `<name>.html`, `.docx`, `.md` przez skill `dokumentacja` albo `<name>/` i `<name>.zip`;
   wynik przejścia z datą stoi w plakietce „Status” i w notce („W skrócie” dokumentu, spis paczki). Bez zielonego
   przejścia status to „Niesprawdzona” i takiej wersji testerom się nie wysyła.
8. **Oddaj:** w tickecie `story_attach` trzy pliki (albo ZIP paczki), `walkthrough.md` i zrzut każdego scenariusza;
   w czacie ścieżki i jedno zdanie. Ticket przechodzi do Done tylko po zielonym przejściu całości.

## Zasady instrukcji

- Po polsku, z perspektywy użytkownika: „kliknij **New message**”, „zobaczysz…”. Napisy z aplikacji cytujesz dokładnie,
  także po angielsku.
- Bez numerów ticketów, nazw dokumentów modelu, ról technicznych i żargonu. Numer sprawy w aplikacji (#8821) jest
  w porządku: tester go widzi.
- Każdy scenariusz: cel, konto, ponumerowane kroki, oczekiwany wynik, który da się zobaczyć na ekranie.
- Nigdy haseł ani sekretów w instrukcji: na bramce konta wybiera się bez hasła; w chmurze hasło testerów jest tylko
  w zmiennej środowiska, a tester dostaje je od Karola osobno.
- Dane testowe zmieniane przez scenariusz (nowa wiadomość) są w porządku na środowisku testowym; scenariusz nie może
  zależeć od czegoś, czego poprzedni nie zostawił (`before`). Tytuły spraw zakładanych w teście zaczynają się od „TEST”.
- Bez rozdziału „jak raportować” czy „jak zgłosić błąd” i bez pól na wynik, datę i podpis: nikt ich nie wypełnia.
  Tester pisze Karolowi po swojemu, co zobaczył (0.2).

## Środowisko lokalne na Mac Studio (Mendix)

- Bramka testowa: `https://<aplikacja>-test.seajack.dev` (Cloudflare Access: e-mail z domeny firmy i kod z maila),
  potem strona wyboru konta „Wybierz, kim chcesz być w aplikacji” (`/_gate/as`), konta testowe projektu z Tandem
  (Ustawienia projektu → konta testowe). Lista domen: `node $TANDEM_DIR/bin/demo-domain.js list`.
- Aplikacja śpi, gdy nikt jej nie używa: strona startowa ma „Uruchom aplikację”, po awarii albo końcu licencji
  „Spróbuj ponownie”. Sama się wyłącza po 2 h bez ruchu i po 1–2 h pracy (licencja próbna Mendix, 6 sesji naraz).
- Claude wchodzi tą samą bramką przez tailnet Karola (`tailnet` we wpisie domeny, np.
  `https://mac-studio-karol.tailaf34e0.ts.net:8443`) jako właściciel: kod z maila to jedyny krok `human`.

## Środowisko testowe w chmurze (Mendix Cloud)

- Logowanie lokalne jest pod `/login-admin.html`; zwykły adres przekierowuje do logowania firmowego (SSO), którego
  konta testowe nie mają. Loginy kont `test.*` są w Tandem (Ustawienia projektu → konta testowe; hasło zamaskowane).
- Jedno wspólne hasło testerów: Karol podaje je testerom osobno i ustawia w zmiennej środowiska na czas przejścia;
  trzy błędne logowania blokują konto do restartu środowiska, dlatego `walkthrough.js` po pierwszym odrzuceniu
  przerywa całość.
- Po zalogowaniu może wyskoczyć „Install the app”: `access.dismiss`. Środowisko ma kopię danych produkcyjnych, maile
  i roboty są wyłączone; zmieniaj tylko sprawy z tytułem od „TEST”.
