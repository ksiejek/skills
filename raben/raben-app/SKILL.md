---
name: raben-app
description: Jak wygląda aplikacja Mendix grupy Raben (HeadQuarters, Intercom, OneVerse, License 2.0 i każda nowa) – moduły startowe MDM_Generic + MDM ze specjalizacjami, MDM.Account zamiast Administration.Account, MxAdmin z OIDC, moduł Queues, Raben Design System (RabenDesign / Theme), dane i konta wypychane z HeadQuarters, role z HQ i ARM; bez MyFirstModule. Warstwa Raben nad ogólnymi skillami MxCraft, które zostają neutralne. Używaj, gdy Karol planuje, buduje albo sprawdza aplikację Raben – „nowa aplikacja Raben”, „start Raben”, „jak w HQ”, „wzorzec Raben”, „MDM_Generic”, „Raben Design System”, „/raben-app”.
---

# raben-app – jak wygląda aplikacja Raben

Ogólne skille (mendix-plan, mxcraft-model, mxcraft-workflow) nie znają Raben i tak ma zostać. Ten skill dokłada
to, co jest wspólne dla aplikacji Raben. Gdy coś się tu nie zgadza z ogólnym skillem, w aplikacji Raben wygrywa ten.
Zbiór zasad rośnie w tickecie LIC-16 („Raben Starting Point”); zmiany zasad zapisuj tutaj.

Wzorce czytasz z prawdziwych aplikacji (tylko odczyt): `~/Mendix/HeadQuarters-main`, `~/Mendix/Intercom-main`,
`~/Mendix/OneVerse-main`. Moduły: `python3 -I $MXCRAFT_SKILLS/tools/mpr/model.py ls <projekt>`, dokumenty:
`model.py find <projekt> <tekst> --module <M>`.

## 1. Moduły startowe

| Moduł | Skąd | Po co |
|---|---|---|
| `MDM_Generic` | z HeadQuarters, bez zmian | odbiornik danych z HQ: usługa REST `mdm/` (`POST cu/*`, `PATCH d/*`), encje `*Generic`, rola modułu `Rest` |
| `MDM` | własny w każdej aplikacji | specjalizacje encji MDM_Generic i mikroflowy umowy (pkt 2) |
| `MxAdmin` | wzorzec z HQ | `MxAdmin.AfterStartUp` (start aplikacji, w nim `OIDC.ASU_OIDC_Startup`) |
| `Queues` | wzorzec z HQ / Intercom | kolejka zadań: `Queues.QueuedItem`, `QueueConfiguration`, przykłady w folderze `_USE_ME`, sprzątanie i statystyki jako zdarzenia harmonogramu |
| `RabenDesign` albo `Theme` | Raben Design System | wygląd Raben (pkt 5) |

Marketplace w każdej aplikacji Raben: `OIDC`, `Encryption`, `CommunityCommons`, `UserCommons`, `ExcelImporter`,
`MxModelReflection`, `DataWidgets`, `Atlas_Core`; często `AuditTrail`. `Administration` zostaje, ale nic w nim
nie budujemy.

Czego nie ma: `MyFirstModule` (z pustej aplikacji usuwamy moduł, `MyFirstLogic` i `Home_Web`; stronę startową
daje własny moduł aplikacji), `Administration.AppUser`, własne dokumenty w `Administration`.

## 2. MDM_Generic → MDM (umowa)

1. Encje MDM to specjalizacje: `MDM.BusinessUnit` ← `MDM_Generic.BusinessUnitGeneric`, `MDM.Country` ←
   `CountryGeneric`, `MDM.Depot` ← `DepotGeneric`. Depot jest potrzebny, nawet gdy aplikacja go nie używa.
2. Konto: `MDM.Account` specjalizuje `System.User` i zastępuje `Administration.Account`. Nie zakładamy innej
   encji użytkownika.
3. MDM_Generic woła po nazwie mikroflowy z folderu `MDM/MDM_Generic/Microflows`: GetOrCreateBU,
   GetOrCreateCountry, GetOrCreateDepot, DeactivateOrDeleteBusinessUnit, DeactivateOrDeleteCountry,
   DeactivateOrDeleteDepot, DeactivateOrDeleteAccount, CreateUpdateAccountInternal, GetUserRoleGUID,
   ShowPasswordForm, ChangePassword. Nazwy, parametry i wyniki jak w HeadQuarters.
4. Pola potrzebne tylko tej aplikacji dodajesz na specjalizacji w MDM (jak `CostCenter` na `MDM.BusinessUnit`
   w Intercom), nigdy w MDM_Generic.
5. Jednostki aplikacji, z których coś zależy (limity, przydziały), wyłączamy, a nie usuwamy.

## 3. Dane i konta z HeadQuarters

1. HQ wypycha jednostki, kraje, oddziały i konta do zarejestrowanych aplikacji: `POST {AppUrl}/rest/mdm/cu/<X>`,
   `PATCH /mdm/d/<X>`. HQ sam bierze słowniki z OneVerse. Aplikacja nie odpytuje HQ (HQ nie ma GET).
2. Rejestracja to dane w HQ, nie zmiana modelu: rekord `MDM_HQ.Application` (AppUrl, Active, flagi danych,
   RestUser i RestPassword).
3. W aplikacji: konto usługi sieciowej z rolą, która ma tylko `MDM_Generic.Rest`. Jego login i hasło idą do HQ.
4. HQ nie ponawia nieudanych wysyłek, a OneVerse kasuje jednostki bez śladu: gdy aplikacja potrzebuje pełnej listy,
   dodaj nocne uzgodnienie `GET {OneVerse}/rest/mdm/get/BusinessUnit` i `Country` (bez `Since`, łączenie po HQID).

## 4. Logowanie i role

1. Logowanie: OIDC z Marketplace na Entra ID, start w `MxAdmin.AfterStartUp`. Każda aplikacja ma swój OIDC.
2. Role: rejestrowane w HQ (`AppUserRole`, `UserRoleGUID` = ModelGUID roli w aplikacji, `ReferenceType` daje zakres,
   np. jednostki); dostęp nadaje i odbiera ARM, a HQ wysyła konto przez `cu/AccountInternal`.
3. Uwaga: konto Rest może przez `cu/AccountInternal` nadać dowolną rolę. Daj mu wyłącznie `MDM_Generic.Rest`.

## 5. Wygląd: Raben Design System

1. Moduł `RabenDesign` z Marketplace. Od 2026-11-06 to nowy komponent liczony od 1.0.0 (Marketplace nie przyjmuje
   niższego numeru pod starą nazwą). Wersję w aplikacji pokazuje `model.py ls` (2026-11-10: Intercom 1.7.1, HeadQuarters
   i OneVerse jeszcze 1.1.6). Źródło: aplikacja `~/Mendix/RabenDesignSystem-main` (opis w jej README; instalacja i klasy
   Data grid 2 w `~/Projects/RabenDesignSystem/README.md`). Paczkę robi `mx create-module-package`
   (`~/Projects/General/raben-design-system/gen/package.sh`).
   Zawiera: Atlas_Core 4.5, 12 layoutów (`RabenDesign_Sidebar`, `_SidebarSecondMenu`, `_TopBar`, `_Anonymous` dla
   niezalogowanych, okna `_PopUp` i `_PopUpRight` z wariantami `_Header`/`_Footer`/`_HeaderFooter`), szablony stron
   `Login` i `AnonymousRedirect` („Raben · Logins”), pozostałe szablony i building blocki „Raben · …” (bez przedrostków
   `BB_`/`PT_`), snippety `PageHeader` i `UserMenu` oraz `raben-grid.js`, `login.html` i logo w `resources/raben/`.
   Strony aplikacji stoją na layoutach RabenDesign, nie na `Atlas_Default`.
   Nie zawiera (usunięte w RDS-18, commit 4adbba2): akcji toastu, kopiowania i powiększania (`ACT_*`), skryptów
   `toasts.js`, `grid-min-width.js`, `side-menu.js` i `toggle-password.js`, design properties (plik jest pusty) ani stylów
   tabel z Intercom (linie tabeli to styl Atlasa `datagrid-bordered`). Paczki i notatki w `~/Projects/RabenDesignSystem/dist`
   (do 1.2.0) są sprzed tej zmiany.
2. Każda aplikacja Raben ma moduł `CustomStyling` (UI resources, w *App Settings → Theme* po RabenDesign; kolejność
   ustawia `tools/mpr/theme_order.py`) z nadpisaniami i stylami własnych ekranów. RabenDesign jest ogólny: to, co przyda
   się każdej aplikacji Raben, idzie do RabenDesign jako ticket RDS. Styl globalny jednej aplikacji (toasty, kopiowanie,
   przypięte kolumny tabel) wybiera i trzyma ta aplikacja: w `CustomStyling`, we własnym module pomocniczym (Intercom:
   `UIHelpers` z akcją `ShowToast` i `_toast.scss`) albo w skryptach `theme/web/js/`. Bez własnych layoutów logowania
   i okien ani `!important` dopisywanych, żeby przebić RabenDesign (zmień zmienną Atlasa albo `--rb-*`). Nazwa
   `CustomStyling` jest taka jak w Intercom i w README RabenDesign; ogólny skill `mxcraft-theme` mówi `CustomTheme`,
   ale w aplikacji Raben wygrywa ten skill.
3. `theme/web` aplikacji: `custom-variables.scss` (`@import` zmiennych RabenDesign przed `$use-css-variables: true;`,
   własne wartości, np. `:root { --rb-brand-caption: "Intercom"; }`, na końcu import Atlasa), `exclusion-variables.scss`
   (import presetu `../../themesource/rabendesign/web/exclusion-variables`) i `index.html` z
   `resources/raben/raben-grid.js?{{cachebust}}` i własnymi skryptami aplikacji z `theme/web/js/` (`login.html` z
   `resources/raben/login.html` przy logowaniu OIDC). HeadQuarters i OneVerse mają jeszcze własny moduł `Theme`;
   nowa aplikacja bierze RabenDesign z Marketplace i `CustomStyling`. Zasady SCSS: skill `mxcraft-theme`
   (od CRAFT-119 także `mxcraft-template`).
4. Makiety stron w MxScout Team: zestaw Raben to `reference/design-kit.json`, wersja 2.0.0 (2026-11-04): pełny CSS
   Raben Design System z artefaktu (bez fontów), ikony jako klasy `rb-i-<nazwa>` z modułu RabenDesign i układ strony
   z prototypu License 2.0; reguły v1 zostały na początku dla starszych makiet. Makietę piszesz markupem RDS (Data
   grid 2, `pageheader`, `card`, `rb-kv`, `rb-tag-*`, `alert-*`, `modal-dialog`), ikony `<i class="rb-icon rb-i-x">`
   (SVG MxScout wycina), strona to `<div class="lp-page">`, popup to `<div class="lp-modal-mock">`. Wzór i generator:
   `~/Mendix/RabenLicense-main/prototype/` (`build.py` prototyp HTML, `mxscout_export.py` makiety planu i ten zestaw).
   Import na serwerze: `docker cp` pliku do `mxscout-team-mxscout-1`, potem w kontenerze ustaw `MXSCOUT_DATABASE_URL`
   z `/proc/1/environ` i `node server/cli.js design-kit import <plik>` (albo Team settings → Design kit); bez tej
   zmiennej CLI zapisuje do pliku `/data/design-kit.json`, którego serwer nie czyta. CSS zestawu ma `max-age` 4 h,
   więc po imporcie Ctrl+F5. Bez zestawu MxScout rysuje neutralnie. Barlow się nie ładuje (font w shadow
   root nie działa, a 200 KB limitu nie mieści fontów), makiety idą fontem systemowym. Zestaw nie trafia do repo
   MxScout. Gdy RabenDesign się zmieni: uruchom `mxscout_export.py --write`, podnieś `version`, zaimportuj ponownie.
5. Ikony w tabelach (Data grid 2): kolumna z ikonami na końcu wiersza (ołówek, kosz, oko) pływa razem z przypiętą
   kolumną MSN: zostaje przy prawej krawędzi, gdy tabela przewija się w bok, i zajmuje tyle miejsca, ile mają same ikony,
   a nie całą szerokość kolumny (Karol, INT-37, 2026-11-04). W Intercom: `themesource/customstyling/web/_shipment.scss` i `_pending.scss`.

## 6. Znane pułapki

- MDM_Generic z HQ nie importuje się czysto: jest sklejony z MDM, myConnect i Integration, a wersje w HQ
  i Intercom się rozjechały. Nowa aplikacja bierze paczkę „MDM_Generic + minimalny MDM” (HQ-5).
- Ponawianie w module Queues z HQ nie działa dobrze; gdy zadanie musi się ponawiać, rozważ Task Queue Mendix 11
  i zapisz decyzję w planie.
- `MDM_Generic.CreateUpdateAccountEntraID` zakłada tylko użytkowników aplikacji, nie wszystkich pracowników.

## 7. Plan i budowa
- Plan aplikacji Raben robisz skillem `mendix-plan`, a moduły z pkt 1 i encje z pkt 2 wpisujesz od razu jako
  start (Sprint Zero), nie jako decyzję do podjęcia.
- Zasady Raben nie trafiają do `mxcraft-skills` ani na tablicę Craftsman (Karol, 2026-11-01). Nowa zasada Raben
  idzie tutaj i do LIC-16.

## 8. Pokazywanie aplikacji Karolowi
- Każdą aplikację Mendix, którą Karol ma obejrzeć (ticket, poprawki, nowa wersja), wystawiasz na jej demo
  `*.seajack.dev` i dajesz mu ten link, nie tunel SSH (Karol, 2026-11-04). Wejście przez Cloudflare Access:
  e-mail Karola przechodzi.
- Demo i paczka są w rejestrze `~/Mx/demo-domains.json` (np. Intercom → `intercom-demo.seajack.dev`,
  `~/Mx/demo/_packages/Intercom.mda`). Nową paczkę bierzesz z kopii testowej (`~/Mendix/<App>-TEST/app/*.mda`),
  starą zostawiasz jako `.prev`, potem w `~/Projects/Tandem`: `node bin/demo-domain.js stop|start|status <host>`.
- Sprawdzasz, że demo serwuje nową wersję (reguła lub tekst ze zmiany) i że adres publiczny kieruje do logowania
  Access. Aplikacja bez wpisu w rejestrze dostaje go przez `demo-domain.js add` (zasady wejścia: Raben przez
  Access, Karol bezpośrednio).
