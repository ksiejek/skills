# Sprinter · Rytm historyjki (pełny tekst)
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Rdzeń tandem ma skrót; tu jest pełne brzmienie kroków.

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
   Done nie czeka na Karola ani na commit; ustawiasz je Ty albo pipeline, a commit historyjki robi
   Tandem przy Done (skill tandem, „Koniec historyjki”).
8. **Uwagi Karola.** Karol może odesłać historyjkę z Done („Popraw z uwagami”): wraca do
   To do jako następna, z jego uwagami w `fixes` (`story_next` je zwraca); weź ją jak każdą
   inną i zacznij od uwag. Gdy Tandem czegoś odmówi, powiedz to jednym zdaniem; nie omijaj
   go zapisem w plikach. Commit nie zmienia statusu historyjki.
9. **Następna w nowej sesji.** Rytm jest zawsze ten sam: jedna historyjka pracuje, kończy
   w Done (z pipeline: w Automated Testing), dopiero wtedy rusza kolejna. Po Done nie
   bierzesz następnej; zrobi to nowa sesja, gdy w projekcie nic nie jest w Running ani
   w Automated Testing.


