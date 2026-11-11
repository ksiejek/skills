# Tandem · Eskalacja: najpierw spróbuj obejść (TAN-108)
Plik pomocniczy skilla tandem (tekst przeniesiony bez zmian z SKILL.md, TAN-225). Czytasz go, gdy krok jest czerwony albo masz zatrzymać pracę.

## Eskalacja: najpierw spróbuj obejść (TAN-108)

Czerwony krok albo błąd dostaje klasę, zanim zapytasz Karola. Katalog obejść i pełna tabela są w Atlasie
(`proces-eskalacja`, „Gdy pipeline staje”); tu tylko reguła:

| Klasa | Co robisz |
| --- | --- |
| Przejściowy (timeout, przydział, niestabilny test, własny port) | ponawiasz po 1, 5 i 15 min; stajesz po 3 porażkach |
| Wina otoczenia (czerwone też na origin/main, konflikt z cudzym plikiem, stary Mac) | ostrzeżenie zamiast zatrzymania, ticket naprawczy, obejście z Atlasu; stajesz, gdy poprawka wychodzi poza obszar ticketu |
| Wina ticketu (test czerwony tylko u Ciebie, nazwy w modelu, własny konflikt) | poprawiasz sam na gałęzi ticketu, krok jeszcze raz; stajesz po drugiej porażce |
| Tylko Karol (logowanie, Studio Pro, push do Team Server, prawdziwy projekt, zakres) | od razu `run_wait` z jedną akcją i całą listą potrzeb w jednym pytaniu |

Pięć kroków przed zatrzymaniem (klasy 1–3):

1. Przeczytaj `halt.explain` i sprawdź, czy ta przyczyna wraca.
2. Uruchom padający test albo krok na origin/main: ta sama porażka = nie wina ticketu.
3. Zastosuj znane obejście z Atlasu „Gdy pipeline staje” (nie kopiuj go do ticketu).
4. Ponów raz. Nigdy nie powtarzaj identycznej akcji bez zmiany (kodu, ustawienia, stanu otoczenia).
5. Dopiero wtedy `run_wait` ze zgłoszeniem niżej.

**Zgłoszenie błędu** (pola jak `halt.explain` z TAN-107, w `question` i `why` albo w `story_comment`):
1. Co się stało (krok, polecenie, kod wyjścia, ostatnie linie).
2. Przyczyna i klasa, z dowodem.
3. Co próbowałem (każda próba z wynikiem).
4. Proponowana poprawka (gotowa po „tak”).
5. Jedna akcja dla Karola (przycisk albo polecenie).
6. Czy wraca (inne tickety z tą przyczyną, ticket naprawczy).

**Nigdy sam** (zawsze pytasz, nawet przy dobrym obejściu): obejście strażnika albo zmiana jego ustawień („Prawdziwy
projekt”), prawdziwe dane i `.mpr` prawdziwego projektu bez zgody, rotacja kluczy, scalenie w mxcraft-skills bez
„gotowe”, wydanie na prod, DNS i Cloudflare, usuwanie gałęzi i plików spoza obszaru ticketu.


