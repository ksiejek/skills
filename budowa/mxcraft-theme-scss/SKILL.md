---
name: mxcraft-theme-scss
description: Przepis na zamianę własnych plików CSS motywu aplikacji Mendix (theme/web/*.css z settings.json) na partiale SCSS z paletą kolorów, bez zmiany wyglądu – z dowodem kompilatorem sass, którego używa Studio Pro, reguła po regule. Używaj, gdy Karol pisze „zamień CSS motywu na SCSS”, „przenieś ui.css do SCSS”, „zrób paletę z :root”, „sprawdź, czy SCSS daje ten sam CSS”, albo gdy motyw ma duże pliki CSS w cssFiles obok theme.compiled.css.
---

# Motyw: CSS → SCSS bez zmiany wyglądu

Przepis powstał przy Service Desk (historyjka SD-12 w projekcie Service Desk): 1730 linii ui.css, fonts.css
i darkmode.css zamienione na 15 partiali SCSS. Działa tak samo w każdej aplikacji Mendix, której motyw ładuje
własne pliki CSS przez `theme/web/settings.json`.

Zasada jest jedna: po zamianie przeglądarka dostaje ten sam CSS. Sprawdza to skrypt, nie oko.

## Co jest w tym folderze

- `convert.js` – konwerter (Node, bez zależności). Najpierw układa plan, potem pisze partiale.
- `compare.js` – dowód: kompiluje stare CSS i nowe SCSS sassem ze Studio Pro i porównuje regułę po regule.
- `css.js` – mały skaner CSS, z którego korzystają oba skrypty.
- `examples/servicedesk.json` – plan użyty dla Service Desk (nazwy partiali, tytuły, linie cięcia).

Skrypty uruchamiasz z tego folderu: `node convert.js …`, `node compare.js …` (Node 22 albo nowszy).

## Co robi konwerter i dlaczego wygląd się nie zmienia

1. Tnie plik z paletą (np. ui.css) na granicach reguł najwyższego poziomu i importuje części w tej samej
   kolejności. Kolejność reguł się nie zmienia, więc kaskada też nie. Linia cięcia w środku reguły albo
   w `@media` to błąd – konwerter odmawia i mówi, która linia.
2. Paletę z `:root` zamienia na mapy Sass (skale tonów, np. `--gray-100` … `--gray-900` → `$hd-gray`
   i funkcja `hd-gray(600)`) i zmienne (`$hd-bg-color`). Blok `:root` generuje z nich, z tymi samymi
   nazwami i wartościami. Reszta motywu dalej używa `var(--gray-600)`, więc tryb ciemny działa jak dawniej.
3. Kolor wpisany na sztywno, który jest dokładnie równy tonowi z palety (albo `#fff` / `#000`), zamienia
   na funkcję lub zmienną palety. Tylko w wartościach deklaracji – nigdy w selektorach (`#add` to może być
   id), napisach, komentarzach i zmiennych CSS (`--x: #fff` zostaje, bo Sass nie liczy wartości zmiennych
   CSS). Kolorów znaczeniowych (`--bg-color`, `--default-color`) nie podstawia: w trybie ciemnym mają inną
   wartość i ktoś czytający SCSS pomyślałby, że kolor się przełącza, a on jest stały.
4. W pliku trybu ciemnego reguły `.darkMode X {…}` zagnieżdża pod `.darkMode { X {…} }`. Łączy tylko
   reguły stojące obok siebie, więc ich kolejność względem pozostałych też się nie zmienia.

Wartości, które Sass mógłby przeliczyć (z `/`, `calc()`, `!important`) albo powtórzone nazwy w `:root`,
zostają w `:root` dosłownie; konwerter wypisuje wtedy uwagę.

## Kroki

0. Kopia. Nigdy nie pracuj na oryginalnym projekcie ani na projekcie otwartym w Studio Pro. Zrób kopię
   repozytorium do `~/Mendix/_backups` i tag w git (`cp -c -R <projekt> ~/Mendix/_backups/<Projekt>_<data>_scss`).
1. Zbierz pliki. W `theme/web/settings.json` lista `cssFiles` mówi, co motyw ładuje po `theme.compiled.css`.
   Skopiuj te pliki i settings.json do folderu roboczego, np. `~/Mendix/_scss-work/<aplikacja>/orig/`.
2. Plan:
   `node convert.js --plan --in <folder>/orig --name <nazwa> --prefix <skrót> --app "<Aplikacja>" > <folder>/plan.json`
   Nazwa to folder partiali (Service Desk: `helpdesk`), skrót to początek zmiennych (`hd`). Plan zawiera
   pliki w kolejności z settings.json, linie cięcia (przy komentarzach co najmniej 60 linii od siebie)
   i tytuły. Popraw nazwy części i tytuły, przesuń linie cięcia tam, gdzie zaczyna się nowy temat;
   w `palette.colors` możesz wypisać, które zmienne to kolory (reszta trafi do „Rozmiary i układ”).
   Wzór: `examples/servicedesk.json`.
3. Konwersja:
   `node convert.js --config <folder>/plan.json --in <folder>/orig --out <folder>/out`
   Wynik: `out/<nazwa>/_*.scss` i `out/_<nazwa>.scss` (importuje wszystko po kolei). Końce linii jak
   w źródle (`"eol": "crlf"` albo `"lf"` w planie wymusza).
4. Dowód: porównanie (niżej). Musi napisać „TAKIE SAME”. Jeśli nie, popraw plan albo źródło i wróć do 3.
5. Wstawienie do kopii projektu:
   - `out/<nazwa>/` i `out/_<nazwa>.scss` do `themesource/<moduł motywu>/web/` (Service Desk:
     `themesource/helpdesktheme/web/`);
   - na samym końcu `theme/web/main.scss`: `@import "../../themesource/<moduł>/web/<nazwa>";` –
     na końcu, bo stare pliki CSS ładowały się po całym theme.compiled.css, czyli po Atlasie;
   - w `theme/web/settings.json`: `"cssFiles": ["theme.compiled.css"]`, a stare pliki CSS usuń z theme/web.
6. Uruchom aplikację lokalnie w Studio Pro (on skompiluje theme.compiled.css) i obejrzyj jeden ekran w trybie
   jasnym i ciemnym. Dowodem jest krok 4; to tylko sprawdzenie, że import trafił we właściwe miejsce.

## Porównanie: jak je samemu powtórzyć

`node compare.js --before <folder>/orig --after <folder>/out/_<nazwa>.scss`

`--before` z folderem bierze pliki z jego settings.json (bez theme.compiled.css); można też podać pliki po
kolei. Skrypt sam szuka sassa w Studio Pro; inny podasz przez `--sass <ścieżka>` albo zmienną `MENDIX_SASS`.

Co robi: kompiluje stare pliki CSS i nowy SCSS tym samym sassem, rozkłada wynik na listę reguł (kontekst
`@media`/`@keyframes`, selektor, deklaracje po kolei) i porównuje pozycja po pozycji. Wypisuje liczbę reguł
i deklaracji przed i po, a przy różnicy pierwsze rozbieżne reguły. Kod wyjścia 0 to „takie same”, 1 to różnice.

Co uznaje za to samo: różnice zapisu, które przeglądarka czyta tak samo – spacje (`rgba(0,0,0,.1)` i
`rgba(0, 0, 0, .1)`), wielkość liter i długość hex (`#FFF` i `#ffffff`), cudzysłów `'` i `"`. Do tego ten
sam kolor zapisany inną funkcją: Sass w SCSS przepisuje `rgb(0 0 0 / 40%)` na `rgba(0, 0, 0, 0.4)`. Każdy
taki kolor skrypt wypisuje z nazwy, a gdy wartość była poza zakresem (np. `rgba(2555, …)` – literówka),
dopisuje to; Sass i przeglądarka przycinają ją tak samo do 255.

`--dump <folder>` zapisuje obie listy jako `before.txt` i `after.txt` (reguła w linii), do obejrzenia
`diff before.txt after.txt`. `--json` daje wynik dla skryptu.

## Gdzie jest sass Studio Pro

macOS, Studio Pro 11.12.6: `/Applications/Mendix Studio Pro 11.12.6 Beta.app/Contents/modeler/tools/sass/osx-arm64/sass`
(dart-sass 1.68.0). Dla innej wersji: `ls -d "/Applications/Mendix Studio Pro"*.app/Contents/modeler/tools/sass/*/sass`.
Na Windows skrypt szuka w `C:\Program Files\Mendix\<wersja>\modeler\tools\sass\` – tej ścieżki nie sprawdzałem.
Ważne, żeby był to sass ze Studio Pro: nowsze wersje ostrzegają przed `@import`, a 1.68 nie.

## Pułapki

- Plik CSS, którego Sass nie przyjmie jako SCSS (np. stare hacki IE), wyjdzie w kroku 4 jako błąd
  kompilacji z numerem linii. Popraw go w kopii źródła albo zostaw ten plik w cssFiles.
- Nie zmieniaj niczego ręcznie w partialach przed porównaniem. Porządki (nazwy, grupowanie) rób po dowodzie,
  osobną zmianą, i powtórz porównanie.
- Liczby linii w planie odnoszą się do źródła sprzed zamiany. Po zmianie źródła ułóż plan od nowa (krok 2).

## Wynik dla Service Desk (SD-12, 2026-10-18)

Przed (fonts.css + ui.css + darkmode.css): 1307 reguł, 3221 deklaracji. Po (_helpdesk.scss): 1307 reguł,
3221 deklaracji, ta sama kolejność, te same wartości. 3 deklaracje różnią się tylko spacją, 5 to ten sam
kolor zapisany przez Sass inaczej (w tym literówka `rgba(2555,255,255,0.4)` w `.red .queueType`). Konwerter
z `examples/servicedesk.json` daje pliki bajt w bajt takie same jak w Helpdesk-main: 15 partiali, 17 reguł
trybu ciemnego zagnieżdżonych, 67 kolorów podstawionych (65 × `$hd-white`, 1 × `hd-gray(50)`, 1 × `$hd-black`).
