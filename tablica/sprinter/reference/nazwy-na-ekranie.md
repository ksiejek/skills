# Sprinter · Nazwy na ekranie (TAN-118)
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go, gdy potrzebujesz polskiej nazwy kolumny, zakładki, kroku albo stanu.

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

