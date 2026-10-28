---
name: instrukcja-testow
description: Instrukcja testów dla nietechnicznych testerów aplikacji Mendix Karola, sprawdzona przejściem w przeglądarce. Zakłada ticket w projekcie aplikacji ze stałego szablonu, sam wybiera z ticketów tylko funkcje widoczne dla użytkownika (pomija zmiany techniczne i drobne poprawki), pisze po polsku z perspektywy użytkownika, bez numerów ticketów i nazw technicznych, zawsze od wejścia na lokalne środowisko na Mac Studio (bramka, kod z maila, konto per rola, uruchomienie, samo wyłączanie). Dokument powstaje skillem dokumentacja (HTML, .docx, .md), a Claude przechodzi w przeglądarce dokładnie napisane kroki tymi samymi kontami, aż przejdą wszystkie, ze zrzutem na scenariusz. Używaj, gdy Karol prosi o instrukcję dla testerów aplikacji albo sprintu: „/instrukcja-testow”, „instrukcja dla testerów”, „przygotuj testy dla biznesu”, „scenariusze dla testerów”, „daj to do przetestowania”.
argument-hint: "<projekt Tandem> [zakres: sprint, tickety, od daty]"
---

# Instrukcja testów dla testerów nietechnicznych

Wersja 0.1 · 2026-10-28 (GEN-50). Wygląd i pliki: skill `dokumentacja` (GEN-47), nigdy własny styl.
Przeglądarka: sterownik CDP z Tandem (`$TANDEM_DIR/modules/mendix/lib/cdp.js`, Chrome z Maca, bez npm).
`$SKILL` to folder tego skilla (`~/.claude/skills/instrukcja-testow`), `$TANDEM_DIR` repo Tandem (`~/Projects/Tandem`).
Przykład z przebiegu na Service Desku: `przyklad/instrukcja.json` i zbudowane z niego pliki.

Instrukcja jest gotowa dopiero, gdy **cała** przechodzi w przeglądarce. Tekst i przejście biorą się z jednego pliku
`instrukcja.json`: każdy krok ma zdanie dla testera (`text`) i to samo jako akcje przeglądarki (`do`).

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
   (`walkthrough.js` drukuje tekst strony po każdym kroku). Kroki piszesz z tego, co naprawdę widać: nazwy przycisków,
   pól i zakładek dokładnie jak na ekranie, numery spraw z danych testowych.
4. **Napisz `instrukcja.json`** (wzór: `przyklad/instrukcja.json`):
   - `access` (zawsze pełny, zawsze pierwszy rozdział): `gate` (adres bramki), `login` (e-mail i kod z maila),
     `loginSteps`, `start` („Uruchom aplikację” / „Spróbuj ponownie”), `autoStop` (2 h bez ruchu, 1–2 h licencja
     próbna), `restart`, `popup`; `walkUrl` to droga Claude do tej samej bramki (tailnet Karola), nie trafia do dokumentu;
   - `accounts`: rola, konto dokładnie jak na stronie wyboru konta, do czego służy;
   - `scenarios`: `id` (S0, S1…), `title`, `goal`, `account`, opcjonalnie `before`, `steps` [{ `text`, `do` }],
     `expect` { `text`, `do` }. S0 to zawsze wejście na środowisko;
   - `troubles` (gdy coś nie działa) i `notInGuide`.
   Akcje `do`: `open` (ścieżka albo adres), `loginAs` (konto ze strony wyboru), `click` (tekst na ekranie; `optional`
   dla okienek „gdy się pojawi”), `fill` (etykieta pola, `value`), `choose` (lista, `value`), `see`, `seeNot`, `wait`.
   Krok, którego przeglądarka nie zrobi (kod z maila), ma `human` z powodem zamiast `do`.
5. **Sprawdź zasady:** `node $SKILL/bin/guide.js instrukcja.json --check` odrzuca numer ticketu, nazwę techniczną
   (mikroflow, encja, moduł, prefiksy `ACT_`, `SUB_`…), lukę w wejściu na środowisko, scenariusz bez celu, konta,
   kroków albo wyniku, konto spoza tabeli kont.
6. **Przejdź w przeglądarce:** `TANDEM_DIR=… node $SKILL/bin/walkthrough.js instrukcja.json [folder]`. Prawdziwe
   kliknięcia myszą i pisanie z klawiatury, okno 1440 × 900, to samo konto co w scenariuszu; element zasłonięty
   okienkiem to błąd, jak dla testera. Wynik: `przejscie/walkthrough.md`, `walkthrough.json`, zrzut `S<n>.png` na
   scenariusz i `S<n>-blad.png` przy błędzie. Każdy krok, który nie przeszedł:
   - instrukcja była nieścisła (inny przycisk, brak kroku, okienko) → popraw tekst **i** akcje w `instrukcja.json`;
   - aplikacja działa źle → zgłoś błąd ticketem w projekcie aplikacji (`story_add`, typ bug) i usuń scenariusz z
     instrukcji albo opisz obejście; nigdy nie dopasowuj oczekiwanego wyniku do błędu;
   - potem **całość od nowa**, aż wszystkie scenariusze przechodzą.
7. **Zbuduj dokument:** `node $SKILL/bin/guide.js instrukcja.json [folder] --walk przejscie/walkthrough.json` →
   `<name>.html`, `.docx`, `.md` przez skill `dokumentacja`; w „W skrócie” stoi wynik przejścia z datą.
8. **Oddaj:** w tickecie `story_attach` trzy pliki, `walkthrough.md` i zrzut każdego scenariusza; w czacie ścieżki
   i jedno zdanie. Ticket przechodzi do Done tylko po zielonym przejściu całości.

## Zasady instrukcji

- Po polsku, z perspektywy użytkownika: „kliknij **New message**”, „zobaczysz…”. Napisy z aplikacji cytujesz dokładnie,
  także po angielsku.
- Bez numerów ticketów, nazw dokumentów modelu, ról technicznych i żargonu. Numer sprawy w aplikacji (#8821) jest
  w porządku: tester go widzi.
- Każdy scenariusz: cel, konto, ponumerowane kroki, oczekiwany wynik, który da się zobaczyć na ekranie.
- Nigdy haseł ani sekretów: konta testowe wybiera się na stronie bramki bez hasła.
- Dane testowe zmieniane przez scenariusz (nowa wiadomość) są w porządku na środowisku testowym; scenariusz nie może
  zależeć od czegoś, czego poprzedni nie zostawił (`before`).

## Środowisko lokalne na Mac Studio (Mendix)

- Bramka testowa: `https://<aplikacja>-test.seajack.dev` (Cloudflare Access: e-mail z domeny firmy i kod z maila),
  potem strona wyboru konta „Wybierz, kim chcesz być w aplikacji” (`/_gate/as`), konta testowe projektu z Tandem
  (Ustawienia projektu → konta testowe). Lista domen: `node $TANDEM_DIR/bin/demo-domain.js list`.
- Aplikacja śpi, gdy nikt jej nie używa: strona startowa ma „Uruchom aplikację”, po awarii albo końcu licencji
  „Spróbuj ponownie”. Sama się wyłącza po 2 h bez ruchu i po 1–2 h pracy (licencja próbna Mendix, 6 sesji naraz).
- Claude wchodzi tą samą bramką przez tailnet Karola (`tailnet` we wpisie domeny, np.
  `https://mac-studio-karol.tailaf34e0.ts.net:8443`) jako właściciel: kod z maila to jedyny krok `human`.
