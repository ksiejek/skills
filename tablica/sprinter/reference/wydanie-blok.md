# Sprinter · Blokada w wydaniu na prod (TAN-28)
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go, gdy narzędzie odmawia zmiany historyjki w wydaniu.

## Blokada w wydaniu na prod (TAN-28)

Gdy wydanie na prod stoi w kolejce albo trwa, jego historyjki mają kłódkę z powodem i nie da się ich przenieść,
zmienić (tytuł, opis, kryteria, polecenie) ani usunąć: na stronie (też wsadowo), przez konektor i MCP. Komentarz
i historia przechodzą. Blokada leży w zapisie wydania (`pipeline/release`), więc przeżywa restart, i znika sama po
sukcesie, błędzie albo anulowaniu. „Anuluj wydanie” zatrzymuje wydanie, którego Mac jeszcze nie wziął;
wdrożenia w toku nie przerywa.

