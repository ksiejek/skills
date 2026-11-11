# Sprinter · Przykład: AB-3 przed i po
Plik pomocniczy skilla sprinter (tekst przeniesiony bez zmian, TAN-225). Czytasz go, gdy piszesz historyjkę i chcesz wzór.

### Przykład: AB-3 przed i po

Przed (Karol nie wiedział, czy to dla niego i czy ma coś zrobić):

> Tytuł: Czytanie dokumentacji projektu z gita: projekty, stan, PRD, wyszukiwanie.
> Intencja: W trakcie rozmowy Claude musi wiedzieć, jak projekt wygląda dziś: stan,
> architektura, plan i PRD funkcjonalności. Czyta to z repo advisor-bridge, bez Google Drive.
> Kryterium: start_conversation(projekt) w jednym wywołaniu zwraca wszystko na start
> rozmowy: streszczenie projektu, STATE, ARCHITECTURE, PLAN, listę dokumentów…

Po:

Tytuł: Claude w rozmowie na telefonie od razu zna aktualny stan projektu

Intencja:

```
Dziś, kiedy rozmawiasz z Claude na telefonie o którymś projekcie, Claude nic o nim nie wie: ani jaki jest jego stan, ani co jest w planie. Musisz mu to za każdym razem opowiadać.

Po tej historyjce Claude na początku rozmowy sam czyta aktualne dokumenty projektu z repozytorium advisor-bridge na GitHubie (repozytorium to folder z plikami projektu) i od pierwszego zdania wie, o czym mówicie. Google Drive nie jest już do tego potrzebny.

Kto: Claude dopisuje czytanie dokumentów do serwera „Projekty” (łącznik, przez który Claude na telefonie sięga do Twoich projektów; powstaje w historyjce AB-2) i sprawdza je na kopii repozytorium. Ty (Karol): zakładasz na GitHubie klucz dostępu tylko do odczytu tego jednego repozytorium (Claude poda Ci, gdzie kliknąć), a na końcu robisz jedną próbną rozmowę na telefonie.
```

Kryteria:

- Gdy zaczynasz rozmowę o projekcie, Claude mówi „chwilę, czytam projekt” i potem zna jego streszczenie, stan, plan i listę dokumentów bez dalszego czekania.
- Na pytanie „jakie mam projekty?” Claude wymienia je z nazwą, jednym zdaniem opisu i tym, gdzie trafiają ich historyjki (Tandem albo ClickUp).
- Na pytanie o szczegół (np. „co mówi opis funkcji o eskalacji?”) Claude znajduje i czyta właściwy dokument.
- Claude może tylko czytać i tylko repozytorium advisor-bridge: niczego w nim nie zmieni i nie zajrzy do innych repozytoriów.
- Każda odpowiedź zaczyna się od dwóch–trzech zdań streszczenia, które dobrze brzmią czytane na głos.

Polecenie (dla Claude):

```
Kontekst: serwer MCP „Projekty” z AB-2 (repo advisor-bridge). Zaczynasz dopiero, gdy AB-2 jest w Done.

Dodaj narzędzia:
- start_conversation(project): jedno wywołanie zwraca summary projektu, STATE.md, ARCHITECTURE.md, PLAN.md, listę plików .md z jednym zdaniem o każdym i otwarte szkice (AB-4; do czasu AB-4 pusta lista). Jedno wywołanie, bo wywołania w trybie głosowym są wolne (wynik AB-1).
- list_projects(): rejestr projects.json w repo: name, slug, summary, target (tandem | clickup).
- read_doc(project, path) i search_docs(project, query) nad plikami .md projektu (docs/, PRD).

GitHub: fine-grained token, tylko Contents: read, tylko repo advisor-bridge, w zmiennej środowiskowej na serwerze, nigdy w repo. Token zakłada Karol: przez run_ask podaj mu ścieżkę GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token, z wyborem repo i uprawnień, i gdzie go wpisać na serwerze.

Każda odpowiedź ma najpierw pole summary (2–3 zdania do czytania na głos), potem treść. Testy na lokalnej kopii repo (fixture), bez sieci. README: nowe narzędzia i zmienna z tokenem. Decyzje w tickecie.
```


