# Moje skille do aplikacji Mendix — co robią i jak ich używać

Ściąga do moich skilli Claude Code wokół MxScout. Leży w repo `ksiejek/skills` (do 2026-10-14 w advisor-bridge). Opisuje, co każdy robi, kiedy go użyć,
jak go wywołać i gdzie leży. Na dole jest review z datą. Przy następnych zmianach dopisuj
nowe review pod spodem, a starych nie kasuj: historia jest w gicie, a ten plik ma mówić,
jak było przy danym commicie.

Stan na **2026-10-14**:
- MxScout 1.7.0 (`ksiejek/mxscout`, publiczny) @ `b7fab81`
- MxScout Dev (`ksiejek/mxscout-dev`, prywatny) @ `81a3d6e`
- mendix-docs 3.0.1 (źródło w tym repo, `ksiejek/skills`)

## Wszystkie naraz

| Skill | Do czego | Źródło | Zainstalowany | Widoczność |
|---|---|---|---|---|
| **mendix-describe** | agent pisze opisy dla biznesu, MxScout je pokazuje | `MxScout-Dev/skills/mendix-describe/` (pełna wersja, z obsługą ryzyk); publiczny MxScout ma wersję bez niej; kopia z Dev w `skills/mendix-describe/` | nie w `~/.claude/skills`; agent czyta go z repo | publiczny |
| **mendix-docs** | ta sama dokumentacja prosto z `.mpr`, bez MxScout, jako jeden plik HTML | `skills/mendix-docs-source/` (gotowa kopia: `skills/mendix-docs/`) | `~/.claude/skills/mendix-docs` | prywatny |
| **mendix-change-proposal** | propozycja zmiany flow lub domain modelu jako plik do narysowania w MxScaffold | `MxScout-Dev/skills/mendix-change-proposal/` | nie, agent czyta go z repo | prywatny (tylko Dev) |
| **advisor-bridge** | stan, architektura i plany projektu dla doradcy (git → Google Drive) | `advisor-bridge/skill/advisor-bridge/` | nie znalazłem kopii w `~/.claude/skills` na tym Macu | prywatny |
| **app-report-presentation** (szkic) | jak przedstawić dokumentację dowolnej aplikacji: menu, układ, czytelność, języki | `skills/app-report-presentation/` | nie | prywatny, szkic |

**Co wybrać:**
- Chcę oglądać i klikać w MxScout, z kodem i modelem obok → **mendix-describe**.
- Chcę dać klientowi plik HTML i niczego nie uruchamiać → **mendix-docs**.
- Chcę zaproponować przebudowę microflow albo modelu danych i zobaczyć ją narysowaną → **mendix-change-proposal**.
- Chcę przekazać doradcy, co się dzieje w projekcie → **advisor-bridge**.

## Co mają wspólne mendix-describe i mendix-docs

Oba skille robią tę samą robotę i trzymają się tych samych zasad. **Model czyta program:**
kroki flow, dane, domain model i role. **Agent pisze tylko prozę.**

- **Dwie warstwy tekstu** dla aplikacji, procesu i modułu: krótkie streszczenie z kilku
  zdań i dłuższy opis z kilku akapitów. Do tego jedno lub dwa zdania o każdym microflow i
  nanoflow. Definicja jest raz, w `mendix-describe/reference/business-narrative.md`.
- **Procesy** dostają diagram tylko wtedy, gdy się rozgałęziają. Diagram to kroki (kto
  wykonuje), decyzje z drogami i końce. Nie ma limitu liczby procesów.
- **Ryzyka P1–P3**:
  - P1: bezpieczeństwo i dane,
  - P2: błędy funkcjonalne,
  - P3: utrzymanie.

  Reguły są w `reference/risk-levels.md`.
- **Notatki dla developera** do każdego modułu (`reference/module-notes.md`) i
  **architektura C4**: kontekst i kontenery jako węzły i połączenia, do 100 węzłów i 250
  połączeń (`reference/c4.md`).
- **Odciski (fingerprint):** każdy flow ma w pakiecie skrót `#xxxxxxxx`. Przy aktualizacji
  agent opisuje tylko nowe i zmienione flow. Opis zmienionego flow MxScout oznacza jako
  nieaktualny i nie udaje, że jest bieżący.
- **Plik z opisami** (`mxscout-descriptions` v1, JSON):
  - `add: true` dokłada do tego, co już jest,
  - `replace: ["app"]` podmienia przegląd aplikacji.

  Format jest w `reference/descriptions-format.md`.
- **Checker** `check-descriptions.js`:
  - `todo`: co zostało do opisania,
  - `check`: czy plik pasuje do pakietu, przed importem,
  - `merge`: łączy części pisane moduł po module.
- **Oszczędnie z tokenami.** Agent czyta indeks, potem moduł po module. Nigdy nie czyta
  całego pakietu naraz. Moduły można rozdać równoległym subagentom.

## mendix-describe

**Wejście:** pakiet AI z MxScout. **Wyjście:** plik z opisami, który wraca do MxScout i
trafia do Documentation.

### Jak użyć: kanał agenta, bez plików
1. MxScout → projekt → **Documentation → Share with an agent**. Dostajesz linię z adresem i
   tokenem.
2. Wklejasz ją do Claude Code, na przykład:
   *„Opisz tę aplikację dla biznesu po polsku. Skill: ~/Projects/MxScout/skills/mendix-describe”.*
3. Agent robi `node agent.js status` i pokazuje moduły. **Ty wybierasz:** wszystkie albo kilka.
4. Agent czyta moduły (`node agent.js module <Nazwa> --out m.md`) i pisze opisy.
5. Agent sprawdza wynik (`check-descriptions.js check`) i wysyła go (`node agent.js send descriptions.json`).
6. W MxScout pojawia się komunikat o opisach do przyjęcia. **Akceptujesz**, i dopiero wtedy
   opisy się zapisują.

Token jest Twój. Agent nie zapisuje go do żadnego pliku, a `agent.js` łączy się tylko z
tym komputerem (loopback). Kanał działa, dopóki nie zatrzymasz udostępniania, nie
przeładujesz karty albo nie zamkniesz serwera.

### Jak użyć: przez plik
**Documentation → Export AI pack** → plik `<Projekt>.mxscout-ai-pack.md` dajesz agentowi →
gotowy plik wczytujesz przez **Documentation → Import descriptions…**.

### Typowe prośby
- *„Opisz całą aplikację”*: przegląd, procesy, moduły, flow, ryzyka, notatki, C4.
- *„Zrobiłem zmiany, zaktualizuj opisy”*: najpierw wczytaj model jeszcze raz (⋯ → Replace
  model), potem udostępnij. Agent opisze tylko zmienione flow.
- *„Opisz jeszcze, jak zgłoszenie dostaje zespół”*: **jeszcze jeden proces**. Agent szuka
  w pakiecie słów z prośby, śledzi jeden przypadek od początku do końca przez moduły i
  odsyła tylko ten proces z jego flow (`add: true`). Reszta zostaje.
- *„Przepisz przegląd aplikacji”*: `replace: ["app"]`.

### Gdzie co jest w MxScout
Opisy widać w Overview, Processes, Modules, Architecture, Risks, For developers i przy
każdym flow (oznaczone ✦ AI). Zostają w projekcie w przeglądarce i jadą w paczce
`.mxscout` razem z modelem.

## mendix-docs

**Wejście:** plik `.mpr` (dla Mendix 10+ razem z `mprcontents/`). **Wyjście:** jeden plik
`<App>-documentation.html` do pracy offline, ten sam raport, który eksportuje MxScout.
Nic nie musi działać w tle.

### Jak użyć
W Claude Code, z dowolnego folderu:

| Polecenie | Co robi |
|---|---|
| `/mendix-docs build` | cała dokumentacja od zera |
| `/mendix-docs update` | po zmianach w aplikacji: nowe i zmienione flow, reszta zostaje, raport od nowa |
| `/mendix-docs process <co opisać>` | jeszcze jeden proces, np. `process przydział zespołu do zgłoszenia` |
| `/mendix-docs report` | tylko przebudowanie HTML z istniejących opisów |

Bez argumentu skill pyta, co zrobić. Można też poprosić słowami: *„zbuduj dokumentację”*,
*„zrobiłem zmiany”*, *„opisz jeszcze ten proces”*.

### Przebieg
1. **Zapisz projekt w Studio Pro.** Skill czyta tylko to, co jest zapisane.
2. Agent pyta o `.mpr` i o folder roboczy. Proponuje `<rodzic projektu>/<App>-docs`,
   **poza** folderem projektu, bo do projektu nigdy nic nie zapisuje.
3. `node docs.js status <app.mpr>` pokazuje moduły, a **Ty wybierasz**, które opisać.
4. Agent czyta moduł po module (`docs.js module`), pisze `descriptions.json` i sprawdza go
   tym samym checkerem co mendix-describe.
5. `node docs.js report <app.mpr> descriptions.json --out <App>-documentation.html`.

### Instalacja i aktualizacja
Skill składa się ze źródła w `mendix-docs-source/` i silnika MxScout, czyli tych samych plików, które
MxScout uruchamia w przeglądarce. **Po każdej zmianie w MxScout, która dotyka raportu,**
złóż go od nowa, żeby raport był taki jak eksport z MxScout:

```bash
cd ~/Projects/Skills
./sync.sh                                   # odświeża mendix-describe i mendix-docs z MxScout, uruchamia selftest
cp -R mendix-docs ~/.claude/skills/         # instalacja; wcześniej usuń starą kopię
```

`selftest.js` składa kopię w katalogu tymczasowym i uruchamia ją na pliku testowym
MxScout. Sprawdza `status`, `module`, `pack`, checker i raport z opisami i diagramem.

### Ograniczenia
- Etykiety raportu są po angielsku. Opisy są w języku, o który poprosisz.
- Obszary robocze z wersji 2.x nie są migrowane: zbuduj od nowa w nowym folderze.

## mendix-change-proposal (tylko MxScout Dev)

**Wejście:** plik wymiany z MxScout Dev (`mxscaffold: "flows"` albo `"domain-model"`).
**Wyjście:** zmieniona kopia tego pliku i uzasadnienie. Kopię wczytujesz do MxScaffold i
oglądasz na płótnie obok oryginału.

1. W MxScout Dev eksportujesz rysunek flow (jeden flow albo tyle, ile zostawiają filtry na
   liście) albo domain model.
2. W Claude Code: *„Rozbij ten microflow na dwa / dodaj obsługę błędu / wydziel encję …,
   plik: …, skill: ~/Projects/MxScout-Dev/skills/mendix-change-proposal”*.
3. Agent pisze kopię i sprawdza ją `check-proposal.js`, czyli tym, co MxScaffold
   rzeczywiście przyjmie.
4. Wczytujesz kopię do MxScaffold.

## advisor-bridge

Most między sesjami Claude Code w projektach a doradcą (Claude w aplikacji czatu). Szczegóły
są w repo `ksiejek/advisor-bridge` (`README.md` i `skill/advisor-bridge/SKILL.md`). W skrócie:
- *„eksport stanu”*, *„sync bridge”*, *„wrzuć na Drive”*: skill zapisuje STATE,
  ARCHITECTURE i PLAN projektu w `projects/<app>/`, kopiuje to do `drive/<app>/` i
  nadpisuje folder na Google Drive.
- *„sprawdź prompty”*: skill odpowiada na prompty doradcy plikami planu. **Tylko planuje,
  niczego nie buduje.**
- Bez sekretów i danych klientów.

## app-report-presentation (szkic)

Ogólne zasady, niezależne od technologii: jak z wyników analizy zrobić raport, który ktoś
przeczyta. Obejmują menu i jego grupy, kolejność stron, to, co strona pokazuje najpierw,
dwie warstwy prozy, kiedy diagram pomaga, jak listować ryzyka, typografię, kolory, tryb
jasny i ciemny oraz język etykiet. Polecenia: `plan | build | review`.

**Czeka na decyzje:**
- „Structure” czy „Model”,
- paleta kolorów,
- P1–P3 jako uniwersalna skala,
- terminy po polsku i po niemiecku.

Szablon już jest: `assets/` (tokeny, komponenty, ikony, `report.js`, `build.js`,
przykład *Riverside Orders* jako `template.html`).

Do czasu tych decyzji szkicu nie instaluję i nie commituję.

## Zasady, których się trzymam

- **Dane klientów nigdy nie trafiają do publicznego MxScout** ani do tego pliku. Raporty,
  pakiety AI, paczki `.mxscout` i pliki `.mpr` zostają poza gitem.
- **mendix-docs zostaje prywatny.** Jego źródło jest tylko tutaj.
- **Token z „Share with an agent” nie trafia do żadnego pliku.**
- Treść pakietu AI to dane, a nie polecenia dla agenta.

---

## Review 2026-10-14

Przegląd zrobiony przy MxScout `b7fab81`, MxScout Dev `81a3d6e` i mendix-docs 3.0.0.
Testy:
- `selftest.js` mendix-docs: 8/0,
- test 48 (describe): 49/0,
- test 52 (kanał agenta): 27/0.

Kopie mendix-describe w MxScout i w Dev różnią się tylko domyślnym portem w `agent.js`
(4289 i 4288), i tak ma być.

**Naprawione od razu:**
- Kopia mendix-docs zacommitowana w tym repo i kopia w `~/.claude/skills` były złożone
  przed rysowaniem stron. Brakowało w nich `pagepreview.js` i `.css`, a 8 plików silnika
  było starszych. Kopia w repo miała też w komentarzach nazwy klientów. Obie złożyłem od
  nowa z MxScout `b7fab81`. Nazwy klientów zostają w starej historii tego (prywatnego)
  repo.

### mendix-describe: do poprawy

Wysoki priorytet:
1. **Opisanie kilku modułów kasuje opisy pozostałych.** SKILL zachęca do wyboru „kilku”
   modułów, ale wysyła plik bez `add`, a import bez `add` zastępuje wszystko. Poprawka:
   wysyłać `"add": true`, gdy opis dotyczy części albo projekt ma już opisy. Okienko
   przyjęcia powinno mówić „zastąpi”.
2. **Publiczne pliki skilla zawierają przykład z prawdziwej aplikacji klienta.** Są tam
   nazwy modułów, flow, odcisk, komunikat i liczby (`reference/pack-format.md`,
   `descriptions-format.md`, `c4.md`, `SKILL.md`, `check-descriptions.js`). Poprawka:
   zmyślony przykład Sales/Orders, jak w teście 48. To jest już w publicznym repo i w jego
   historii.
3. **Strona About w publicznym MxScout obiecuje rzeczy z Dev:** „comments if you tick
   them” i „the environment you connected to”.

Średni priorytet:
4. **Scalanie w checkerze i w aplikacji działa inaczej.** Dotyczy `audience`, tego samego
   ryzyka z inną rangą i powielania kontekstu. Do tego `merge` nie zapisuje `add`.
5. **Limity aplikacji nie są opisane ani sprawdzane.** Na przykład: 200 procesów, 100
   kroków, 60 flow na proces, 2000 ryzyk i 60 elementów diagramu. Format mówi „tyle kroków,
   ile trzeba”.
6. **Aktualizacja przez kanał agenta opisuje wszystko od nowa.** Agent nie widzi
   zapisanych opisów. Trzeba trzymać `descriptions.json` albo dać kanałowi dostęp do
   zapisanych opisów.
7. **Stare ryzyka nie znikają przy aktualizacji,** bo merge je sumuje.

Niski priorytet:
- „300 znaków” w SKILL, a checker ostrzega przy 400.
- Checker nie ostrzega o:
  - `by` spoza person/app,
  - drodze z `end` i `join` naraz,
  - `replace` bez `add`.
- Kolejność na starcie jest niejasna: najpierw `status` czy `pack` z `todo`.
- `agent.js` jest bezpieczny: token nie trafia na dysk, łączy się tylko z loopback. Brakuje:
  - `redirect: 'error'`,
  - timeoutu,
  - łapania błędu zapisu,
  - zalecenia `MXSCOUT_TOKEN` zamiast `--token`, bo token z `--token` widać w `ps` i w
    historii.
- `business-narrative.md` mówi o „jednej kopii”, a są dwie. README wspomina pliki
  `work.<Module>.md`, o których SKILL nie mówi.

### mendix-docs: do poprawy

Wysoki priorytet:
1. **`.mpr` z Mendix 10+ skopiowany bez `mprcontents/` daje pusty model i kod 0.** Powinien
   kończyć się jasnym błędem.
2. **`update` może zgubić opisy.** Polecenie merge w SKILL nie bierze poprzedniego
   `descriptions.json`, a nadpisany plik częściowy gubi resztę flow modułu.
3. **Brak testu**, że złożona kopia zgadza się z `public/` MxScout. Stąd wzięła się
   nieaktualna kopia.

Średni priorytet:
4. „Nic nie zapisuje do projektu” jest tylko w instrukcji. Kod nie odmawia zapisu pod
   folderem `.mpr`.
5. Polecenia `node docs.js …` zakładają, że bieżący folder to folder skilla. Skill każe
   jednak pracować gdzie indziej, więc potrzebne są pełne ścieżki.
6. `process` zakłada, że `pack.md` już istnieje, i może przeszukać stary.
7. `pack-skill.js` czyści folder docelowy bez sprawdzenia, co w nim jest.
8. Brakuje odpowiednika „przepisz przegląd” (`replace: ["app"]`).

Niski priorytet:
- Mylące komunikaty błędów:
  - przy `--out` bez wartości,
  - przy `module` bez nazwy,
  - przy błędzie zapisu.
- `--modules ,` daje raport z 0 modułami.
- `lang="en"` w raporcie z polskimi opisami.
- `grep` po częstym słowie może zalać kontekst; lepiej dodać `| head`.
- „Pakiet nie zawiera sekretów”: wyrażenia mogą zawierać literały.
- `VERSION` nie zapisuje commita MxScout, z którego skill złożono.
- `selftest` nie używa pliku testowego Mendix 10 (v2).

### mendix-change-proposal: do poprawy
- Opis mówi, że MxScout pisze pliki `"domain-model"`, a Dev pisze tylko `flows`.
- SKILL nazywa przycisk „Export N drawings” i mówi o zakresie z filtrów. Naprawdę przycisk
  to „Export drawings”, a zakres wynika z wybranej roli.
- Reszta się zgadza: katalog 64 typów i funkcje importu w MxScaffold.

### Naprawione tego samego dnia (2026-10-14)

- **mendix-describe 1:** opis części modułów nie kasuje reszty. Skill wysyła wtedy
  `"add": true`, a MxScout przed importem pliku bez `add` ostrzega, że zastąpi obecne
  opisy (test 52).
- **mendix-describe 2:** przykłady w skillu dotyczą zmyślonej aplikacji sprzedażowej, a
  komentarze w kodzie nazywają mierzone projekty „project A–D”. Zmiana jest w
  publicznym MxScout `6051130` i w Dev `6584e74`. W starej historii publicznego repo te
  nazwy dalej są.
- **mendix-describe 3:** strona About w publicznym MxScout nie wspomina już komentarzy
  ani połączonego środowiska.
- **mendix-docs 1 i 2** (wersja 3.0.1):
  - brak `mprcontents/` kończy się jasnym błędem,
  - `update` pisze części `update.*.json` i scala je na wcześniejszy `descriptions.json`,
  - selftest obejmuje Mendix 10+ (10/0).
- **Obsługa ryzyk w MxScout Dev** (false positive z uzasadnieniem, „naprawione”,
  sprawdzenie przy kolejnym update, historia, ryzyka z komentarzy oznaczone jako
  zgłoszone przez człowieka) jest w budowie na gałęzi `risk-triage`.

### Porządki 2026-10-14

Skille Mendix i szkic prezentacji mają jedno miejsce: to repo (advisor-bridge zostaje przy swoim własnym skillu). Z advisor-bridge zniknęły źródło mendix-docs, jego
gotowa kopia, szkic app-report-presentation i ten przewodnik. Historia tych plików do
`00e56d9` jest w gicie advisor-bridge.

### Zmiana 2026-10-14: mendix-describe z Dev

Repo Skills trzyma wersję mendix-describe z **MxScout Dev**. To ta sama wersja co
publiczna, a do tego obsługa ryzyk:
- `id` ryzyka, które agent utrzymuje między kolejnymi update,
- sekcja `## risk triage` w pakiecie,
- ponowne sprawdzanie naprawionych ryzyk,
- false positive nie wracają jako ryzyka,
- ryzyka z komentarzy oznaczone jako zgłoszone przez człowieka, plus `verify`.

`agent.js` łączy się domyślnie z Dev (4288). Do publicznego MxScout:
`MXSCOUT_URL=http://127.0.0.1:4289`. `./sync.sh` bierze mendix-describe z
`~/Projects/MxScout-Dev`, a silnik mendix-docs z publicznego `~/Projects/MxScout`.

### Zmiana 2026-10-14: procesy śledzone, nie streszczane

Pierwsze uruchomienie dało krótkie, ogólne procesy. Skill pisał je z opisów modułów,
„bez ponownego czytania pakietu”. Teraz wygląda to tak (mendix-describe, a w
mendix-docs od 3.1.0):
- **W trakcie czytania modułu** agent zapisuje w `work.<Moduł>.md`, z czego są zrobione
  procesy:
  - gdzie zaczyna się przypadek (przycisk, harmonogram, REST, workflow, zdarzenie),
  - statusy,
  - decyzje i dane, od których zależą,
  - rekordy szukane **po nazwie** (np. zespół znaleziony po nazwie w XPath),
  - komunikaty i e-maile,
  - terminy i strefy czasowe,
  - wywołania innych modułów.
- **Każdy główny proces jest śledzony przez flow, także między modułami**, tak jak przy
  „jeszcze jednym procesie”. Dostaje diagram zawsze, gdy przypadek może pójść więcej niż
  jedną drogą. Przed scaleniem agent czyta procesy jeszcze raz oczami czytelnika.
- **Checker ostrzega**, gdy:
  - opis procesu ma mniej niż 150 słów,
  - opis aplikacji ma mniej niż 300 słów,
  - proces wymienia mniej niż dwa flow.
- **Język:** ten, w którym piszesz, jeśli go nie podasz. Agent pyta, gdy nie jest pewny.
  Wcześniej domyślnie był angielski.
- **app-report-presentation** dostał tę samą zasadę: nowa reguła 11 „A process is
  traced, not summarised”, sekcja „A process page holds what was traced” w
  `page-patterns.md` i nowe punkty w checkliście. Wcześniej mówił, że procesy pisze się
  „z opisów części”.

## Instalacja i aktualizacja z gita

Na nowym komputerze albo u kogoś, komu dasz dostęp do repo:

```bash
git clone https://github.com/ksiejek/skills.git ~/Projects/Skills
~/Projects/Skills/install.sh
```

`install.sh` podłącza każdy skill do `~/.claude/skills/` dowiązaniem do folderu w repo.
Starą kopię przenosi do `~/.claude/skills-backup/` i niczego nie kasuje. Aktualizacja
to samo:

```bash
git -C ~/Projects/Skills pull
```

i nowa sesja Claude Code. Zmiany w skillach robisz w repo Skills: mendix-docs w
`mendix-docs-source/`, a potem uruchamiasz `./sync.sh`. mendix-describe zmieniasz najpierw
w MxScout Dev, potem `./sync.sh`. Na koniec commit i push.

### Zmiana 2026-10-14: strona Changes i polecenie `change`

Na prośbę „opisz zmianę” (np. „klient może anulować zamówienie, dopóki nie wyszło”) agent
robi kolejno:
1. dopytuje o niejasności,
2. śledzi przez flow, jak to działa **teraz**,
3. proponuje **rozwiązanie** w kategoriach Mendixa: co dodać, zmienić albo usunąć
   (microflow, strony, encje, atrybuty, zabezpieczenia), zgodnie z konwencjami aplikacji,
4. wypisuje wpływ, ryzyka, otwarte pytania i szacunek pracy.

Wynik trafia na osobną stronę **Changes**, a nie do Procesów:
- MxScout i MxScout Dev: mendix-describe, plik z `"add": true` zawierający tylko `changes`;
- raport mendix-docs: `/mendix-docs change <co zmienić>` (od 3.2.0).

Agent tylko proponuje, nigdy nie zmienia modelu. W Dev propozycję można też narysować
skillem mendix-change-proposal.

### Zmiana 2026-10-14: mendix-ticket-check i strona Tickets

Nowy skill **mendix-ticket-check**, część MxScout. Jego główne miejsce to MxScout Dev, a w
Skills jest kopia. Wymaga mendix-describe obok siebie, bo `install.sh` podpina oba.

Jak użyć:
1. W MxScout kliknij **Share with an agent** i wklej linię agentowi.
2. Napisz: „Sprawdź to zgłoszenie skillem mendix-ticket-check — czy ma rację bytu:
   <treść z Jiry>”. Można wkleić kilka zgłoszeń naraz.
3. Agent śledzi zachowanie w modelu i daje werdykt: **bug / as designed /
   data-config / cannot tell**, z pewnością i dowodami.
4. Przy błędzie od razu proponuje poprawkę na stronie Changes.
5. Przygotowuje odpowiedź do wklejenia w Jirę, z przyciskiem Copy.
6. Wynik pojawia się na stronie **Tickets** (w menu, sekcja Review).

Bez MxScout: `/mendix-docs ticket <treść>`. Raport HTML ma wtedy stronę Tickets (od
mendix-docs 3.3.0).

Ograniczenie: pakiet AI nie zawiera jeszcze reguł dostępu do encji, warunków
widoczności widgetów ani walidacji encji. Przy zgłoszeniach o tym agent mówi wprost,
czego nie widzi, i odsyła do ekranów Security i Pages.

### Zmiana 2026-10-14: dokumentacja MD w kanale agenta; skill pyta, zanim zacznie

- **Share with an agent** przekazuje razem z pakietem dokumentację jako Markdown:
  `node agent.js docs`. Ma nagłówek (ile flow opisanych, ile nieaktualnych), a każdy
  nieaktualny opis jest oznaczony. Odświeża się po każdym zapisie, Undo i imporcie.
  Obowiązuje ten sam token, ten sam komputer i tylko pamięć.
- **Skill po połączeniu nie opisuje sam.** Robi `status`, potem `docs`, a dalej to, o co
  prosisz:
  - opis całości albo wybranych modułów,
  - update (tylko nowe i zmienione flow),
  - jeszcze jeden proces,
  - zmiana,
  - zgłoszenie,
  - pytanie o działanie aplikacji (odpowiedź ze wskazaniem flow, bez zapisu).

  Wklejona sama linia oznacza, że skill zapyta, co zrobić.
- **Zasada pracy: najpierw dokumentacja jako mapa, potem pakiet jako dowód.** Gdy
  dokumentacja i model się różnią, wygrywa model, a agent nazywa nieaktualny opis.
- **mendix-docs 3.4.0:** `docs.js docs <app.mpr> [descriptions.json]` robi ten sam plik
  MD. Skill czyta go jako mapę i ma nowe polecenie `question`.
