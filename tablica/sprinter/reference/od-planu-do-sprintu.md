# Sprinter · Od planu do sprintu
Plik pomocniczy skilla sprinter (GEN-89). Jedno miejsce na złącza między fazami budowy aplikacji Mendix: jak z planu
powstają tickety, w jakiej kolejności się buduje, sprint startowy każdej nowej aplikacji, „gotowe do sprintu”,
„zrobione” i który rodzaj przypadków testowych do czego służy. Inne skille odsyłają tutaj i tego nie powtarzają.

## Od planu do ticketów

Jedna droga planowania. Plan robi skill `mendix-plan`: procesy dla biznesu, model, makiety i podział na sprinty w
MxScout, potwierdzone przez właściciela i biznes. Ticket planistyczny w Tandem (skill tandem, `reference/mendix.md`)
to opakowanie tej pracy: Tandem prosi o plan, sesja pisze go według `mendix-plan`, a `plan_save` zapisuje go przy
tickecie i wiąże z nim tickety budowy (`modelPlan.from`). Dawny `mxcraft-plan` jest wycofany (GEN-87).

Wejście: plan w stanie `ready` (`read_rounds`: właściciel i biznes przyjęli najnowszą rundę). Ma procesy, encje,
mikroflowy, strony, podział na sprinty (`guide.steps` i „Podział na sprinty”) i reguły `BR-n` w briefie. Planu,
który nie jest `ready`, nie zamieniasz w tickety do To do.

Wyjście: tickety budowy jednego sprintu, każdy według standardu (`reference/standard-historyjki.md`):
- jedna rzecz, którą Karol zobaczy; najwyżej 6 kryteriów i około 7 zmienianych plików;
- `rules` z numerami reguł, które ticket buduje, gdy projekt ma brief (`["BR-3", "BR-4"]`);
- `dependsOn` w kolejności budowy (niżej), tak by `story_next` brał je po kolei;
- otwarte pytanie planu (`P-n`), które blokuje ticket, w jego `questions`; decyzja to 2–4 opcje po jednym zdaniu
  i założenie przyjęte bez odpowiedzi;
- zakładane do Draft; Draft czy To do rozstrzyga Karol (`reference/narzedzia.md`, pomysły).

Kto: sesja planująca (ticket planistyczny albo refinement). Czyta kod i model raz i każdemu ticketowi wpisuje Where,
Check i Out of scope, żeby sesja budowy zaczynała od wskazówek, a nie od szukania.

Przykład: sprint 1 planu ma proces „Zgłoszenie urlopu” i reguły BR-2 (limit dni), BR-3 (akceptuje przełożony).
- „Wniosek urlopowy ma swoje dane i uprawnienia” · rules BR-2 · bez dependsOn
- „Pracownik składa wniosek, a limit dni go zatrzymuje” · rules BR-2 · dependsOn: poprzedni
- „Przełożony akceptuje albo odrzuca wniosek” · rules BR-3 · dependsOn: poprzedni

### Rozmiar ticketu przy planowaniu

Planujesz tak, żeby każdy ticket zbudowała jedna sesja z małym kontekstem. Dużych ticketów nie dzielisz potem:
podział przy pobraniu z To do jest tylko awaryjny. Zanim zapiszesz tickety sprintu (`plan_save`, `story_add`,
`create_ticket`), policz dla każdego z nich, z planu, nie z pamięci:
- kryteria: najwyżej 6;
- zmieniane pliki kodu: około 7 (testy, CHANGELOG i dokumenty się nie liczą);
- dokumenty modelu Mendix z planu (nowe i zmienione): około 10; encje jednej domeny to jeden dokument, każdy mikroflow,
  strona i snippet osobno;
- kroki Karola (Studio Pro, logowanie, konto, telefon): najwyżej jeden, na starcie, nigdy w środku budowy.

Ticket ponad limitem tniesz od razu, według kolejności budowy niżej: najpierw warstwy (dane, dostęp, logika, strony),
potem funkcje. Każda część dostaje własne kryteria, Where, Check i Out of scope, a `dependsOn` wskazuje poprzednią.
W odpowiedzi z planem wypisz przy każdym tickecie liczby (kryteria · pliki · dokumenty modelu), żeby Karol widział
rozmiar bez czytania polecenia. Liczby i powód są w `standard-historyjki.md`, „Podział”.

Przykład: LIC-24 „Sprint Zero 1/3: aplikacja startuje w wyglądzie Raben, z logowaniem, rolami i modułami Marketplace”
była już częścią podziału, a i tak zrobiła 590 nowych elementów modelu za 15,5 mln tokenów. Powinna być trzema
ticketami:
- „Aplikacja ma moduły z Marketplace, a moduł przykładowy jest usunięty” · bez dependsOn
- „Aplikacja wygląda jak Raben (design system i motyw)” · dependsOn: poprzedni
- „Każda rola loguje się i widzi swoją stronę startową” · dependsOn: poprzedni

## Kolejność budowy w sprincie

Wewnątrz sprintu budujesz warstwami, zawsze w tej kolejności:
1. model domeny: encje, atrybuty, asocjacje, enumeracje;
2. bezpieczeństwo: module roles, user roles, access rules encji;
3. logika: mikroflowy, walidacje, zdarzenia;
4. strony i nawigacja;
5. dane testowe: konta, dane bazowe, migracja danych (`DM_`).

Ticket to pionowy plaster jednej funkcji (encja, dostęp, mikroflow, strona), gdy mieści się w limicie rozmiaru.
Gdy się nie mieści, warstwy idą osobnymi ticketami połączonymi `dependsOn` w kolejności wyżej.

Kolejność między sprintami i funkcjami (każdy sprint kończy się czymś, co biznes kliknie; najpierw najbardziej ryzykowna
integracja; odczyt przed zapisem) jest w `mendix-plan`, `reference/sprints.md`; tu jej nie powtarzam. „Sprint 0” z tego
pliku to sprint startowy niżej. Dawne znaczenie z `mxcraft-plan` („Karol przyjmuje plan”) nie obowiązuje: przyjęcie
planu to stan `ready` w MxScout, przed sprintem startowym.

## Sprint startowy każdej nowej aplikacji

Ogólny, dla każdej aplikacji. Aplikacja Raben dokłada swoją warstwę przez skill `raben-app` (moduły startowe, OIDC,
dane z HeadQuarters, Raben Design System); gdzie się różnią, wygrywa `raben-app`. Każda pozycja to zwykle jeden ticket
albo jego część:
- szkielet aplikacji z szablonu wyglądu: skill `mxcraft-template` (moduł wyglądu w aplikacji);
- moduły i foldery według standardów: `mxcraft-model`, `reference/build-rules.md`; własny moduł nie nosi nazwy modułu
  z Marketplace (`AppAdmin`, nie `Administration`);
- bezpieczeństwo projektu włączone, user roles i module roles: `mxcraft-model` (zapis przez `tools/mpr`);
- nawigacja ze stroną startową dla każdej roli: `mxcraft-model`;
- konta testowe, jedno na rolę: `seed_accounts.py` (`mxcraft-model`), na Teście pipeline sam zakłada konta testerów
  (`pipeline.mendix.testSeed`, TAN-46); hasło nigdy w pliku ani w tickecie, tylko w zmiennej środowiska;
- dane bazowe testu: `pipeline.mendix.testSeed.baseline` (SQL, który da się powtórzyć, dane syntetyczne; ustawia
  właściciel projektu), zmiana danych historyjki to mikroflow `DM_` (`data_migration.py`);
- aplikacja testowa za bramką: aplikacja testowa projektu w Tandem z „Zaloguj jako…” dla kont testerów; polecenia
  na Macu Claude tylko proponuje, Karol zatwierdza (TAN-200);
- pierwsza partia testów zielona: przypadki `test_cases_set` dla kryteriów ticketów startowych, krok testów pipeline;
- pierwsza instrukcja dla testerów: skill `instrukcja-testow`.

Biznes zobaczy: „zalogowałem się kontem testowym swojej roli i widzę swoją stronę startową”.

## Gotowe do sprintu i zrobione

### Gotowe do sprintu

Ticket idzie do To do, gdy:
- plan, z którego pochodzi, jest `ready` (właściciel i biznes przyjęli najnowszą rundę);
- ma obie części standardu: intencję (Dziś, Po zrobieniu, Kto), 3–6 sprawdzalnych kryteriów i polecenie z Where,
  Check i Out of scope;
- ma `rules`, gdy projekt ma brief, i `dependsOn` w kolejności budowy;
- w projekcie Mendix ma `standards` i kryterium „Zgodne ze standardami: …” (`mxcraft-workflow`, „Standardy budowania”);
- mieści się w rozmiarze („Rozmiar ticketu przy planowaniu” wyżej), inaczej jest podzielony;
- pytania, które go blokują (`P-n` z „Potrzebne wcześniej”), mają odpowiedź, a dostępy i konta są znane;
- w backlogu stał w „Gotowe do sprintu”, do To do przesuwa go Karol.

### Zrobione

Ticket jest zrobiony, gdy:
- każde kryterium ma ocenę z dowodem (`run_report.criteria`);
- każde kryterium ma przypadek testowy pipeline (`test_cases_set` z `criterion`) albo zapisany powód, dlaczego nie da
  się go zautomatyzować (`story_comment`);
- `rules` są wypełnione, gdy projekt ma brief, a przypadki reguły mają jej numer (`rule`);
- pipeline jest zielony (z Automated Testing do Done przenosi pipeline; Mendix: build i `mx check` bez błędów);
- MxScout nie zgłasza nowego ryzyka P1 (bramka MxScout);
- kryterium „Zgodne ze standardami” jest spełnione, odstępstwo zapisane w `decisions` z powodem;
- ticket zmienia istniejące dokumenty: przypadki obejmują też to, co je woła (zestaw regresji, TAN-234);
- decyzje i zmiany w modelu są w tickecie, a `result.files` wymienia każdy zmieniony plik (commit robi Tandem przy Done).

## Przypadki testowe: kto jest źródłem

- `TC-n` w MxScout (skill `mendix-testcases`): co musi być prawdą dla biznesu, co najmniej jeden przypadek na każdą
  regułę `BR-n`. To źródło. Powstają w dwóch krokach: po potwierdzeniu planu z briefu (rola, warunki, kroki, oczekiwany
  wynik, a w `model` dokumenty tak, jak je nazywa plan), po budowie `model` dostaje prawdziwe dokumenty, numery zostają.
- Przypadki pipeline (`test_cases_set`): wersja automatyczna. Każdy wskazuje kryterium (`criterion`), a gdy ticket
  buduje regułę, także ją (`rule`); kroki bierzesz z `TC-n` tej reguły, gdy są.
- Instrukcja dla testerów (skill `instrukcja-testow`): wersja dla ludzi, ze scenariuszami z `TC-n` (`read_testcases`),
  gdy projekt je ma, inaczej z ticketów.
- `QA-n` dawnego skilla `qa` jest wycofany (GEN-87); regresję przejmuje zestaw regresji (TAN-234).
- Numer przypadku nadany raz zostaje przy nim; zmieniony przypadek zachowuje numer, nowy bierze następny wolny.
