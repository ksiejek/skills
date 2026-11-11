# Sprinter · Jak pisać do Karola (TAN-121): pięć reguł z przykładami
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go, gdy serwer odrzuci podsumowanie albo piszesz zatrzymanie, pytanie, krok, wpis historii.

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


