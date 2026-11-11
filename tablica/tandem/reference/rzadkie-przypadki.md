# Tandem · Rzadkie przypadki: wyjątki sesji, start, blokada wydania, zakładanie, odrzucenie, bez MCP
Plik pomocniczy skilla tandem (tekst przeniesiony bez zmian z SKILL.md, TAN-225). Czytasz go, gdy zdarzy się przypadek z listy w SKILL.md.

## Jedna historyjka na sesję

`/tandem` bierze **dokładnie jedną** historyjkę i na niej kończy. Po ocenie kryteriów,
`story_move` do Done (z pipeline: do Automated Testing) i podsumowaniu kończysz turę zdaniem
**„Następną weźmie nowa sesja.”** Nie wołasz `story_next` drugi raz i nie bierzesz
kolejnej w tym samym kontekście, nawet gdy kolejka nie jest pusta. Powód: każda
kolejna historyjka w tej samej sesji wlecze za sobą kontekst poprzedniej, a tokeny
są jedyną miarą kosztu. Kolejną bierze nowa sesja z pustym kontekstem: Karol
uruchamia `/tandem` jeszcze raz albo pętlę `node bin/tandem-loop.js` z repo Tandem,
która startuje `claude -p "/tandem"` w nowym procesie dla każdej historyjki.

Serwer MCP tego pilnuje: drugie `story_next` bez `key` w tej samej sesji zwraca
`sessionDone: true` i nic nie bierze. Wyjątki:

- `/tandem KLUCZ` – Karol sam wskazał historyjkę; bierzesz ją, nawet jeśli w tej
  sesji była już inna. Po niej znów koniec.
- `alreadyRunning` – historyjka została w Running po poprzedniej sesji; dokończ ją.
  To jest Twoja jedna historyjka.
- `settings.oneStoryPerSession: false` w ustawieniach projektu (bez przełącznika na stronie,
  ekranu Skille nie ma od TAN-19): po podsumowaniu wołasz `story_next` i idziesz
  dalej w tej samej sesji, dopóki kolejka nie jest pusta albo `paused`.

Niezależnie od tego obowiązuje zasada **jeden job na projekt**, dopóki „Równolegle agenci”
w Ustawieniach → Tandem (jedna wartość dla wszystkich projektów, domyślnie 1, projekt Mendix
zawsze 1) to 1: dopóki
historyjka projektu jest w Running albo w Automated Testing, `story_next` nic nie bierze
(zwraca listy `running` / `autotest`, „czeka na testy automatyczne”), a pętle
`tandem-loop` i `tandem-watch` czekają. Done nigdy nie blokuje: następną bierze nowa
sesja, gdy poprzednia jest w Done. `tandem-watch` nie startuje sesji także przy
historyjce zatrzymanej przez pipeline (`halted` w `sprint_read`: zostaje w swojej
kolumnie z czerwoną ramką, nigdy nie wraca sama do Draft, MXC-137) – kolumny i kto co
przesuwa: skill sprinter, „Tablica z pipeline”. Done ustawiasz Ty (`story_move` do
`done`) albo, w projekcie z pipeline, sam pipeline po zielonych testach automatycznych;
nie czeka na Karola ani na commit (commit robi Tandem przy Done).


**Kto prowadzi.** Przy każdym `story_next` podaj `host` (nazwa komputera: na Macu
`scutil --get LocalHostName`, gdzie indziej `hostname -s`)
i `session` (pierwsze 8 znaków id tej sesji Claude Code, czyli nazwy pliku
`~/.claude/projects/<folder>/<id-sesji>.jsonl`; bez dostępu pomiń, serwer da losowy id).
Serwer zajmuje historyjkę atomowo i zapisuje Cię w `run.by`; Karol widzi komputer i sesję
na karcie, w pasku „Claude pracuje” i na Teraz. Dwie sesje nigdy nie dostaną tej samej
historyjki. `runningElsewhere` znaczy: historyjkę prowadzi inna sesja – niczego nie bierz,
powiedz to jednym zdaniem i stop. Po 30 min bez `run_report` i bez pracy sesji (zapis jej transkryptu) historyjka ma
„bez sygnału” i Karol może ją zwolnić w Tandem; gdy `run_report` odpowie, że Karol ją zwolnił, zakończ
turę bez dalszej pracy. Po „Limicie bez postępu” projektu (domyślnie 30 min, TAN-208) bez kroku, raportu, tokenów, wpisu
w historii i pracy sesji Tandem zatrzymuje historyjkę (`halt`, źródło `stall`) i przypisuje ją Karolowi; sesji nie zamyka.
Długie polecenie bez raportu nie jest zawieszeniem, dopóki sesja pracuje, ale krok i tak zgłaszaj przed nim.

Historyjki przypisane do Karola mogą stać w To do, ale ich sam nie bierzesz: kolejka
(`sprint_read.queue`) i `story_next` bez `key` je pomijają (są w `forKarol`), bierzesz
taką tylko wtedy, gdy Karol poda jej klucz.

**Kontekst projektu (GEN-42).** Jeśli odpowiedź `story_next` ma `projectContext` (tekst, który Karol
pisze w Ustawieniach projektu → „Kontekst projektu”, z `updatedAt` i `updatedBy`) i/albo `projectRules`
(reguły gałęzi i wdrożenia z ustawień projektu), przeczytaj je **przed** planem i pracą i trzymaj się ich.
Pierwszy krok planu mówi to wprost, np. „Czytam kontekst projektu i uwagi”, a jego `message` w `run_report`
mówi jednym zdaniem, co z kontekstu wpływa na tę historyjkę. Bez tych pól (projekt bez kontekstu) nic
nie robisz i niczego nie zgłaszasz. Kontekst dla testów (`context-tests`) dostają tylko sesje kroków
testowych, nie Ty. Sam kontekstu nie zmieniasz: zmienia go właściciel w Tandem; z czatu czyta go
konektor (`get_project_context`, wszystkie ustawienia: `get_project_settings`), a zmienia
`update_project_settings` (TAN-13): najpierw podgląd bez `confirm`, zapis z `confirm=true` dopiero po
„tak” Karola; każda zmiana jest w Ustawienia → Historia zmian.

**Zrzuty z ticketu (TAN-165).** Jeśli odpowiedź `story_next` ma `images` (obrazy z Plików ticketu, np. zrzut z komentarza
testera `zrzut-<id>.png`, każdy ze ścieżką `path`), **przed krokiem 1 i przed każdym pytaniem** odczytaj je narzędziem
Read (Claude Code czyta obrazy) i przeczytaj, skąd zgłoszenie (`story.source`: strona, rola, tester). Potem zgłoś to w
`run_report` z `viewedImages: ["nazwa.png", …]`: Tandem zapisuje w historii „Obejrzałem zrzut(y) z ticketu: …”. Pytasz
Karola (`run_wait`, `run_ask`) tylko wtedy, gdy zrzut naprawdę nie wystarcza; `run_wait` odmawia („najpierw obejrzyj
zrzuty”), dopóki ich nie obejrzałeś. Ticket ze zrzutem albo z komentarza testera nie idzie na Haiku (minimum Sonnet).

**Logowania na starcie (TAN-105).** `story_next` (z wzięciem historyjki) sprawdza za Ciebie, jakie logowania i tokeny
będą potrzebne (lista `credentials` w Ustawienia → Pipeline, plus narzędzia wymienione w poleceniu: op, gh z zakresami,
az, cloudflared, konta testowe) i zwraca `credentials`. Gdy `credentials.ok` jest `true`, nie pytasz o logowania wcale.
Gdy są `missing`, **przed jakąkolwiek pracą** wysyłasz JEDNO `run_wait` z `credentials.wait` (`question` z pełną listą:
co, po co, jedna linia naprawy; `why`; `gate`), `run_report` z tokenami i kończysz turę. Nie pytasz o logowania po
kolei w trakcie pracy: to, co dało się sprawdzić na starcie, jest sprawdzone. Wartości sekretów nigdy nie są
wypisywane. Trafiłeś w trakcie na logowanie spoza listy: dopisz je do jednego `run_wait` z całą resztą, której
jeszcze brakuje, a Karolowi zaproponuj dopisanie go do `credentials` projektu.

**Reguła kolumny (TAN-12).** Każda kolumna tablicy ma regułę dla Claude (Ustawienia → Kolumny;
domyślna dla kolumn systemowych, projekt może ją nadpisać, kolumna własna ma tylko swoją).
`story_next` zwraca `columnRule` (`column`, `name`, `rule`, `source`: domyślna albo projektu):
regułę kolumny, z której bierzesz historyjkę, gdy to kolumna własna z regułą (np. Refinement),
a dla To do regułę Running. Trzymaj się jej obok polecenia i kontekstu projektu. Historyjka
z kolumny własnej przychodzi z `karolNotes` (komentarze Karola od końca poprzedniego przebiegu):
od nich zaczynasz, potem idziesz zwykłą drogą do Done. `story_move` oddaje `columnRule` kolumny,
do której historyjka wchodzi; Tandem zapisuje każdą w `run.columnRules`. Kolumna własna z regułą
jest w kolejce przed To do; bez reguły tylko parkuje historyjki dla Karola.


## Blokada wydania (TAN-28)

Historyjka w wydaniu na prod (kolejka albo w toku) jest zablokowana: `story_move`, konektor i strona odmawiają
przeniesienia i zmiany, odmowa mówi dlaczego. Nie obchodź jej; poczekaj na koniec wydania albo napisz do Karola,
że może je anulować („Anuluj wydanie”, tylko gdy Mac go jeszcze nie wziął). Komentarz (`story_comment`) zawsze przechodzi.


## Zakładanie i zmiana historyjek (`story_add`, `story_edit`)

Każda historyjka, którą zakładasz albo zmieniasz, trzyma się standardu „Jak pisać
historyjkę” ze skilla sprinter: część **Dla Ciebie** dla Karola (intencja: dziś, po
zrobieniu, linia „Kto: Claude … Ty (Karol): …”, kryteria jako sprawdzalne zdania)
i część **Dla Claude · polecenie** (`prompt`), którą piszesz sam i według której potem
pracujesz. Linię „Kto” możesz podać osobno w `who: { claude, karol }`; Tandem dopisze ją
na końcu intencji. Gdy odpowiedź ma `hint`, popraw historyjkę od razu przez `story_edit`.
Historyjkę w Running, Automated Testing albo Done tylko komentujesz (`story_comment`).

## Gdy Karol odrzucił

Karol może odesłać historyjkę z Done przez „Popraw z uwagami”. Wtedy
`story_next` zwraca `fixes` (jego uwagi) i
`review` (co odhaczył, a co nie). Zacznij od uwag: pierwszy krok planu to „Czytam uwagi
Karola”, a `summary` na końcu mówi, co zmieniło się względem poprzedniej rundy.

**Pauza.** Karol wstrzymuje Tandem przyciskiem Pauza/Wznów na Teraz: `story_next` zwraca `paused`,
bieżąca historyjka idzie do końca. Trybu „Tylko odczyt” nie ma (TAN-19); stary zapis czyta się jako pauza.
Zmiany w aplikacji Mendix robisz zawsze przez pliki (silnik, tools/mpr), nigdy przez MCP Studio Pro.

## Bez serwera MCP (zapis przez pliki projektu)

Te same pola zapisujesz przez `node "$TANDEM_DIR/bin/db.js" update projects/<p>/stories/<KLUCZ> -`
z JSON-em na stdin: `run` (cały obiekt z `steps`), `tokens`, `timeSec`, `review`,
`assignee`, `status`; wpis do historii przez `node "$TANDEM_DIR/bin/db.js" log <p> <KLUCZ> "tekst"`.
Tablice idą w całości. Strona odświeży się po zapisie pliku.

