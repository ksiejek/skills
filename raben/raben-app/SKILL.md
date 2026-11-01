---
name: raben-app
description: Jak wygląda aplikacja Mendix grupy Raben (HeadQuarters, Intercom, OneVerse, License 2.0 i każda nowa) – moduły startowe MDM_Generic + MDM ze specjalizacjami, MDM.Account zamiast Administration.Account, MxAdmin z OIDC, moduł Queues, Raben Design System (RabenDesign / Theme), dane i konta wypychane z HeadQuarters, role z HQ i ARM; bez MyFirstModule. Warstwa Raben nad ogólnymi skillami MxCraft, które zostają neutralne. Używaj, gdy Karol planuje, buduje albo sprawdza aplikację Raben – „nowa aplikacja Raben”, „start Raben”, „jak w HQ”, „wzorzec Raben”, „MDM_Generic”, „Raben Design System”, „/raben-app”.
---

# raben-app – jak wygląda aplikacja Raben

Ogólne skille (mxcraft-plan, mxcraft-model, mxcraft-workflow) nie znają Raben i tak ma zostać. Ten skill dokłada
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

1. Moduł `RabenDesign` (`~/Projects/RabenDesignSystem/dist/RabenDesign.mpk`, opis w jego README): Atlas_Core 4.5,
   layouty `RabenDesign_Sidebar`, `RabenDesign_TopBar`, `RabenDesign_PopUp`, building blocki i szablony stron
   „Raben · …”. Strony aplikacji stoją na `RabenDesign_Sidebar` albo `RabenDesign_TopBar`, nie na `Atlas_Default`.
2. Po imporcie: `@import` zmiennych RabenDesign w `theme/web/custom-variables.scss` przed
   `$use-css-variables: true;` i `raben-grid.js` w `theme/web/index.html` (kroki w README).
3. Starsze aplikacje mają własny moduł `Theme`; nowa aplikacja bierze RabenDesign. Zmiany CSS motywu: skill
   `mxcraft-theme-scss`.

## 6. Znane pułapki

- MDM_Generic z HQ nie importuje się czysto: jest sklejony z MDM, myConnect i Integration, a wersje w HQ
  i Intercom się rozjechały. Nowa aplikacja bierze paczkę „MDM_Generic + minimalny MDM” (HQ-5).
- Ponawianie w module Queues z HQ nie działa dobrze; gdy zadanie musi się ponawiać, rozważ Task Queue Mendix 11
  i zapisz decyzję w planie.
- `MDM_Generic.CreateUpdateAccountEntraID` zakłada tylko użytkowników aplikacji, nie wszystkich pracowników.

## 7. Plan i budowa
- Plan aplikacji Raben robisz skillem `mxcraft-plan`, a moduły z pkt 1 i encje z pkt 2 wpisujesz od razu jako
  start (Sprint Zero), nie jako decyzję do podjęcia.
- Zasady Raben nie trafiają do `mxcraft-skills` ani na tablicę Craftsman (Karol, 2026-11-01). Nowa zasada Raben
  idzie tutaj i do LIC-16.
