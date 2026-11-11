# Sprinter · Pomysły i narzędzia
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go, gdy Karol mówi o pomyśle albo pracujesz bez serwera MCP.

## Pomysły

Pomysł (zakładka Pomysły, `<PREFIX>-I<n>`) to miejsce na to, o czym Karol i Claude rozmawiają przez
kilka sesji, zanim powstaną historyjki. Nie jest ticketem: nie ma go na tablicy, nie idzie do pipeline'u
i niczego nie uruchamia. W konektorze Trio: `idea_create`, gdy Karol mówi „zapisz to jako pomysł”;
`idea_get` przed rozmową o nim; `idea_update` z `note` na ustalenia z rozmowy (nie zapis rozmowy) i ze
statusem `ready`, gdy Karol uzna go za gotowy. `idea_to_stories` tylko po decyzji Karola: najpierw pokaż
mu listę historyjek (według standardu „Jak pisać historyjkę”) i zapytaj, czy do Draft, czy do To do;
`todo` startuje build i wymaga `confirm=true`. Nic nie zamienia się samo.

Lista historyjek z pomysłu albo z refinementu trzyma zasadę podziału (`standard-historyjki.md`,
„Podział”): jedna widoczna rzecz na historyjkę, najwyżej 6 kryteriów i ok. 7 plików, kolejność
przez `dependsOn`. Przed zapisem sesja planująca czyta kod raz i wpisuje każdej historyjce
części `Where:`, `Check:` i `Out of scope:` (TAN-227).

## Narzędzia

Zalecane: serwer MCP `tandem` (`sprint_read`, `story_next`, `story_move`, `story_assign`,
`story_comment`, `story_attach`, `run_report`, `run_ask`, `model_read`). Strony odświeżają
się w chwili wywołania, a tokeny per krok dochodzą na bieżąco.

Bez MCP: te same pliki przez `node "$TANDEM_DIR/bin/db.js"` (`list`, `get`, `update`, `log`,
`next-key`). `update` scala obiekty, a tablice zastępuje w całości, więc przy
`acceptance`, `questions`, `log`, `review` wysyłaj całą nową listę.

