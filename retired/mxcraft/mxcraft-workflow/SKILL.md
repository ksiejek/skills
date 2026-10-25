---
name: mxcraft-workflow
description: Prowadzenie pracy nad aplikacją Mendix tak jak zespół Mendix – historyjki z punktami, refinement, sprinty, tickety testów i historia – zapisywane w MxCraft. Używaj zawsze, gdy w projekcie MxCraft coś planujesz, szacujesz, budujesz, testujesz albo zmieniasz status pracy.
---

# MxCraft – jak zapisywać pracę

Pracujesz jako doświadczony developer Mendix w zespole z Karolem.
Wszystko, co robisz, ma być widać w MxCraft: http://127.0.0.1:4290/ (strona) i `workspace/` (pliki).
Karol ma czuć, że prowadzi zwykły projekt Mendix: historyjka, refinement, sprint, punkty, testy, akceptacja.

## Zasady stylu (z planu)
- Krótkie zdania. Jedna rzecz naraz.
- Decyzje jako 2–4 opcje, po jednym zdaniu. Potem czekaj na wybór.
- Nie uciekaj do przodu: następny krok dopiero po przeglądzie Karola.
- Słownictwo Mendix (entity, microflow, sub-microflow, page, snippet, module role, XPath).

## Narzędzie
Zapisujesz przez `node bin/db.js` (z katalogu repo MxCraft). Strona odświeża się sama.

```
node bin/db.js list projects                              # projekty
node bin/db.js list projects/<projekt>/stories            # tickety
node bin/db.js get  projects/<projekt>/stories/<KLUCZ>
node bin/db.js next-key <projekt>                         # np. SD-11
node bin/db.js set    projects/<projekt>/stories/<KLUCZ> plik.json   # nowy ticket (cały dokument)
node bin/db.js update projects/<projekt>/stories/<KLUCZ> -          # zmiana pól, JSON ze stdin
node bin/db.js log  <projekt> <KLUCZ> "Co zrobiłeś, jednym zdaniem."
```

Przy każdej zmianie statusu, punktów lub wyniku testu dopisz `log`.

### Sprint z orkiestratorem (MXC-134)
Gdy kilka historyjek jednego projektu idzie równolegle na lustrze JSON (`bin/mxcraft-mirror.js unpack`),
jeden orkiestrator na projekt planuje, a każdy worker (sesja na historyjkę) trzyma się tego rytmu:

```
node bin/mxcraft-orchestrate.js plan   <lustro> --project <p> [--keys A,B]   # mapa i fazy, raz przed sprintem
node bin/mxcraft-orchestrate.js lock   <lustro> <KLUCZ> --project <p>        # kod 3 = czekasz, spróbuj później
node bin/mxcraft-orchestrate.js load   <lustro> <KLUCZ> <folder-workera>     # tylko Twoje dokumenty
node bin/mxcraft-orchestrate.js renew  <lustro> <KLUCZ>                      # co kilka minut pracy
node bin/mxcraft-orchestrate.js patch  <lustro> <KLUCZ> <folder-workera> --project <p> --out patch.txt
node bin/mxcraft-orchestrate.js unlock <lustro> <KLUCZ> --project <p>
```

Treść z `patch.txt` dołącz do ticketu (`story_attach`). Złą łatkę cofa `revert <lustro> <KLUCZ>`,
bez ruszania innych historyjek. Historyjka bez nazw z modelu w treści idzie sama: dopisz `docs`.

### Scalenie sprintu (MXC-136)
Łatki żyją w lustrze przez cały sprint; do `.mpr` trafiają dopiero przy scaleniu, i tylko historyjki Done.
`run` uruchamiasz wyłącznie wtedy, gdy Karol wprost poprosił o scalenie; nigdy nie commitujesz.

```
node bin/mxcraft-merge.js plan <lustro> --project <p>            # co wejdzie, co zostaje; nic nie zapisuje
node bin/mxcraft-merge.js run  <lustro> --project <p> --confirm  # kopia, tag, .mpr, mx check, build, testy
```

Błąd na którymkolwiek etapie przywraca projekt z kopii; konflikt albo zmiana modelu poza lustrem zatrzymuje
scalenie przed zapisem. Sukces zakłada jeden ticket scalenia (Testing, Karol) z `commit-message.txt`.
`update` scala obiekty, a tablice zastępuje w całości: przy `acceptance`, `questions`, `log` wyślij całą nową listę.

## Ticket (`projects/<projekt>/stories/<KLUCZ>.json`)

| Pole | Znaczenie |
|---|---|
| `key`, `num` | `SD-11`, `11` – z `next-key` |
| `title` | krótko, co ma powstać |
| `type` | `story`, `test`, `bug`, `refinement`, `task` |
| `status` | `backlog` → `todo` → `running` → `testing` → `done` |
| `refined` | `true`, gdy refinement zakończony i ticket gotowy do sprintu |
| `points`, `pointsBy`, `pointsWhy` | 1, 2, 3, 5, 8, 13; `"claude"`; dlaczego tyle – jedno, dwa zdania |
| `sprintId` | `s1`, `s2`… albo `null` (backlog) |
| `parent` | dla testu: klucz historyjki |
| `intent` | uzgodniona intencja – wynik rozmowy, nie rozmowa |
| `acceptance` | lista kryteriów akceptacji: tekst albo `{ "text", "done": true }`, gdy kryterium już spełnione |
| `questions` | `[{ "q": "pytanie z opcjami", "a": "odpowiedź Karola albo pusto" }]` |
| `decisions` | `[{ "text": "co", "why": "dlaczego", "rejected": ["odrzucone opcje"] }]` |
| `standards` | id standardów budowania, których dotyczy historyjka zmieniająca model (z `standards/standards.json`) |
| `changes` | `[{ "module", "kind", "before", "after" }]` – zmiany w modelu |
| `steps`, `expected`, `result`, `evidence` | test: kroki, oczekiwany wynik, `pending`/`pass`/`fail`, co dokładnie sprawdziłeś |
| `assignee` | `"claude"` albo `"karol"` – u kogo jest piłka. Ty bierzesz z To do; w Testing przepisz na `"karol"` |
| `tokens`, `timeSec` | `{ "in": 212000, "out": 48000 }` i czas pracy w sekundach – dopisuj po każdym kroku; sprint sumuje je sam |
| `order` | kolejność w sprincie (liczba); bez niej decyduje `num` |
| `prompt` | polecenie od Karola dla Ciebie w tej historyjce (co zrobić, czego nie ruszać) |
| `by` | `"claude"` dla ticketów, które zakładasz |
| `createdAt`, `updatedAt` | ISO |
| `log` | `[{ "at", "by": "claude", "text" }]` |

Sprint: `projects/<projekt>/sprints/s<N>.json` – `number`, `name`, `goal`, `start`, `end`, `status` (`planned`, `active`, `done`). Sprinty są tygodniowe; `planned` z najniższym numerem to „Następny sprint” w backlogu.

Role (Sprinter): Karol jest Product Ownerem, Scrum Masterem i Testerem, Ty Developerem. Bierzesz historyjki z To do w kolejności sprintu, przenosisz przez Running do Testing i podpinasz testy pod Karola (`assignee: "karol"`). Done tylko po zaliczonym teście. Tokeny są jedyną miarą kosztu, bez przeliczania na pieniądze.

## Rytm historyjki
1. **Refinement.** Załóż ticket w `backlog`. Dopisz `intent`, `acceptance`, `questions` z opcjami. Oszacuj `points` i napisz `pointsWhy`. Zatrzymaj się na pytaniach.
2. **Gotowe.** Po odpowiedziach Karola: `refined: true`. Zaproponuj sprint; Karol przenosi albo zgadza się, żebyś przeniósł.
3. **Running.** Gdy zaczynasz pracę: `status: running` + `log`. W projekcie Mendix od razu `node bin/mxcraft-ports.js <projekt>`: przy kolizji (kod 1) przekaż Karolowi linię ze skryptu z wolną parą portów; portów sam nie zmieniaj.
4. **Testing.** Gdy skończysz: załóż tickety `type: test` z `parent`, `steps`, `expected`. Wykonaj je. Zapisz `result` i `evidence` – konkretnie, co uruchomiłeś i co wyszło. Niezaliczony test = `fail` + opis, historyjka zostaje w Testing.
5. **Done.** Tylko gdy testy zaliczone i Karol przyjął wynik (np. w Studio Pro). Zapisz to w `log`.

Nigdy nie oznaczaj testu jako zaliczonego, jeśli go nie wykonałeś. Test, którego nie możesz wykonać (np. potrzebny plik Karola), zostaje `pending` z wpisem, na co czeka.

## Standardy budowania
MxScout wie, co jest źle w modelu; katalog standardów mówi, jak budować, żeby nie było.
Kopia jest w `standards/` (`standards.md` do czytania, `standards.json` dla programu); źródło prawdy to MxScout
(`skills/mendix-describe/reference/standards.json`). Nie edytuj kopii: zmiana idzie do MxScout, potem `node bin/sync-standards.js`.

- Wpis = jedna kontrola MxScout, pod jej id (`anon`, `scope-write`, `guard-page-hides`, `secret-constant`…):
  co jest źle, jak budować dobrze, jak poprawić istniejący model, kod Mendix (MXS003–MXS010 tylko przy `anon`), źródło.
  Ryzyko MxScout `mx-<id>-…` odpowiada wpisowi `<id>`.
- Części „no check”: `judged-*` (to, co ocenia agent według poziomów ryzyka) i `conv-*` (konwencje nazw Mendixa: ACT_, SUB_, _Overview, ENUM_…).
- **Zasada.** Refinement historyjki, która zmienia model (encja, atrybut, asocjacja, access rule, rola modułu,
  microflow, nanoflow, strona, stała, published service), wymienia standardy, które jej dotyczą, po id —
  w polu `standards` ticketu (np. `["scope-write", "guard-page-hides", "conv-microflow-prefix"]`) i jednym kryterium
  akceptacji „Zgodne ze standardami: scope-write, guard-page-hides, conv-microflow-prefix”.
  Jak dobrać: przejdź `standards.md` po kolei; standard dotyczy historyjki, gdy zmiana dotyka tego, o czym mówi
  „Build it this way” (np. nowa access rule → `access-wider`, `access-unwritten`, `scope-write`; nowy microflow za przyciskiem →
  `guard-page-hides`, `guard-bypass-xpath`, `conv-microflow-prefix`; nowa stała → `secret-constant`, `constant-note`).
- Przy budowie trzymaj się wymienionych standardów; odstępstwo zapisz w `decisions` z powodem.
- **Plan przed zapisem do .mpr** (MXC-39): pierwszy `story_comment` z `decision` po planie wymienia standardy po id
  i przy każdym jedno zdanie, jak jest spełniony, np. „scope-write: status encji tylko do odczytu dla ról biznesowych,
  zmiana stanu tylko mikroflowem z decyzją po stanie i właścicielu, reguła zapisu z XPath po stanie”;
  „guard-page-hides: nowy wywoływalny flow sprawdza stan i właściciela przed pierwszym zapisem”;
  „market-admin: role admina nowego modułu Marketplace tylko na roli admina”.
- **Brama po zapisie** (MXC-39, `server/scout-hold.js`): nowe ustalenie **P1** MxScout po zapisie zatrzymuje historyjkę
  w Running — `story_move` do testing/autotest odmawia z komunikatem po polsku i nazwą standardu (`story.scoutGate.hold`).
  Popraw model albo zapisz listę ustaleń w tickecie i czekaj na decyzję Karola w komentarzu (jego wpis po kontroli
  zwalnia blokadę). Nowe P2/P3 i pierwsza kontrola bez porównania: ostrzeżenie (`scoutHold` w odpowiedzi), opisz je
  w podsumowaniu. `test_add` sam dopisuje krok „check-security: N nowych ustaleń (było N, jest N)”, a `run_report`
  tę samą liczbę do `result.model`.
- Każdy zapis do modelu dla historyjki rób z `--story=<projekt>/<KLUCZ>` (`mxcraft-engine.js move|rename`,
  `mxcraft-create.js`): MxCraft sam uruchamia kontrolę MxScout przed i po zapisie i dopisuje do historyjki nowe
  i zniknięte ryzyka (`story.scoutGate`, sekcja „Kontrola MxScout po zapisie”). Zmiana zrobiona gdzie indziej
  (Studio Pro): `node bin/scout-gate.js <projekt> <KLUCZ>`. Nowe P1/P2 omów w raporcie; brak MxScout to notatka,
  nie blokada. `agent.js review` zostaje dla MxScout: pisze `mxscout/review.json` w repo Mendix.
- Ten sam `--story` oddaje MxScout rekord zmiany: jeden wpis Assist `mxcraft-<klucz>` (Workbook) ze wszystkimi
  zmianami historyjki, przez `agent.js send` (przy zamkniętym MxScout czeka w skrzynce projektu). Kolejny zapis
  zastępuje wpis. Gdy nie dotarł, albo po zamknięciu historyjki: `node bin/scout-record.js <projekt> <KLUCZ>`.

- **Tworzenie i edycja przez formularz** (MXC-124): gdy historyjka dodaje stronę, na której ktoś tworzy albo edytuje
  obiekt, buduj ją domyślnie operacją `createEditForm` w `mxcraft-create.js` (engine/README.md, „Create and edit
  through a form”): obiekt nietrwały `<Encja>Form`, zapis do trwałego dopiero w `ACT_<Encja>_Save`, bez autocommitów,
  przy edycji porównanie `changedDate` i przy konflikcie różnice z wyborem „zapisz mimo to” / „anuluj”. Encja musi mieć
  `changedDate`; brak – zapytaj Karola (`run_ask`), czy go włączyć. Istniejących stron nie przerabiaj bez osobnej historyjki.

## Model
Model projektu to `projects/<projekt>/modules/<Moduł>.json` z importu `model.json` MxScout (na stronie: „Importuj model MxScout”).
Notatki do modułu: `projects/<projekt>/notes/<Moduł>.json` – `{ "module", "text", "at", "by": "claude" }`.
Czytaj moduły, zanim zaproponujesz zmianę w strukturze.
