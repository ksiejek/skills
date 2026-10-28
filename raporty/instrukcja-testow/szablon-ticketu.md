<!-- The fixed ticket template of the "instrukcja-testow" skill: step 1 fills it (story_add / story_edit) in the app's
     project before any guide is written. {aplikacja}, {zakres}, {srodowisko} are filled in; nothing else changes. -->

# Ticket: instrukcja testów {aplikacja}

**Tytuł:** Instrukcja dla testerów {aplikacja}: {zakres}, przejście jej w przeglądarce przed Done

**Typ:** task · **Kto:** Claude

## Dla Ciebie (intent)

Dziś testerzy {aplikacja} dostają instrukcje pisane za każdym razem od nowa i nikt ich nie przeszedł tak, jak tester.
Po zrobieniu: jest instrukcja po polsku (skill instrukcja-testow, wygląd ze skilla dokumentacja): tylko funkcje widoczne
dla użytkownika, bez numerów ticketów i nazw technicznych, z wejściem na {srodowisko}. Claude przeszedł ją w
przeglądarce krok po kroku tymi samymi kontami; ticket jest gotowy dopiero, gdy wszystkie scenariusze przechodzą.

Kto: Claude wybiera zmiany, pisze instrukcję i przechodzi ją w przeglądarce. Ty (Karol): wysyłasz instrukcję testerom.

## Kryteria akceptacji

1. **Zakres:** instrukcja obejmuje funkcje widoczne dla użytkownika z ticketów {zakres}, pogrupowane według funkcji; zmiany techniczne i drobne poprawki są pominięte (lista pominiętych jest w komentarzu ticketu).
2. **Język:** w instrukcji nie ma numerów ticketów ani nazw technicznych; każdy krok mówi, co tester kliknie i zobaczy.
3. **Wejście:** instrukcja zaczyna się od wejścia na {srodowisko}: adres bramki, logowanie kodem z maila, konto testowe per rola, uruchomienie aplikacji, samo wyłączanie i ponowne uruchomienie.
4. **Scenariusze:** każdy ma cel, konto, ponumerowane kroki i oczekiwany wynik.
5. **Pliki:** .html, .docx i .md zbudowane skillem dokumentacja są dołączone do ticketu.
6. **Test w przeglądarce:** Claude przeszedł w przeglądarce dokładnie kroki z instrukcji, tymi samymi kontami; każdy krok, który nie przeszedł, jest poprawiony w instrukcji albo zgłoszony jako błąd; ostatnie przejście przechodzi w całości, a zrzut każdego scenariusza jest dołączony.

## Dla Claude · polecenie (prompt)

Use the instrukcja-testow skill for {aplikacja}, scope {zakres}, environment {srodowisko}. Read the project's tickets
(bin/tickets.js), pick only user-visible functionality, write instrukcja.json, check it (guide.js --check), walk it in
the browser (walkthrough.js) until every scenario passes, fixing the guide or filing a bug on each failed step, then
build the documents (guide.js --walk) and attach the three files, walkthrough.md and one screenshot per scenario.
