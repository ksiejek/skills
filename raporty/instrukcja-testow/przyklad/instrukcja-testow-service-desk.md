# Service Desk: sprawy księgowości dla zespołu myConnect – instrukcja testów

_Instrukcja testów · Service Desk_

**Jak wejść na testowy Service Desk i sprawdzić, jak księgowość i operatorzy myConnect prowadzą razem jedną sprawę.**

**Dla kogo:** Testerzy Service Desku (bez wiedzy technicznej) · **Scenariusze:** 6 · **Status:** Sprawdzona w przeglądarce · **Data:** 2026-10-28

## Spis treści

1. W skrócie
2. Jak wejść na środowisko testowe
3. Konta testowe
4. S0. Wejście na środowisko testowe
5. S1. Księgowość widzi swoje sprawy dla myConnect
6. S2. Księgowość odpowiada w sprawie
7. S3. Operator myConnect widzi odpowiedź księgowości
8. S4. Sprawa bez numeru przesyłki trafia do zespołu transportu
9. S5. Pracownik nie widzi spraw księgowości
10. Gdy coś nie działa
11. Czego ta instrukcja nie obejmuje
12. Jak zgłosić błąd

## 1. W skrócie

Sprawdzasz jedną nową funkcję: księgowość zgłasza w Service Desku sprawę dotyczącą przesyłki, a zespół myConnect ją prowadzi. Najpierw wchodzisz na środowisko testowe (rozdział 2), potem przechodzisz scenariusze po kolei, każdy z kontem podanym przy nim. Jeden scenariusz zajmuje kilka minut.

| Scenariusz | Kto testuje | Cel |
| --- | --- | --- |
| S0. Wejście na środowisko testowe | TEST Ksiegowosc (MyConnect requester) | Dojść od adresu do strony wyboru konta. |
| S1. Księgowość widzi swoje sprawy dla myConnect | TEST Ksiegowosc (MyConnect requester) | Sprawdzić, że księgowość widzi na liście swoje sprawy, ich stan i odpowiedzi zespołu myConnect. |
| S2. Księgowość odpowiada w sprawie | TEST Ksiegowosc (MyConnect requester) | Sprawdzić, że księgowość może dopisać odpowiedź do swojej sprawy. |
| S3. Operator myConnect widzi odpowiedź księgowości | TEST myConnect operator DPL62 Intercom | Sprawdzić, że operator myConnect widzi w sprawie wiadomości księgowości, nie tylko swoje. |
| S4. Sprawa bez numeru przesyłki trafia do zespołu transportu | TEST myConnect operator DPL62 RND | Sprawdzić, że sprawa zgłoszona bez numeru przesyłki jest u operatora transportu. |
| S5. Pracownik nie widzi spraw księgowości | TEST Pracownik (employee) | Sprawdzić, że zwykły pracownik nie widzi cudzych spraw dla myConnect. |

> **Sprawdzone:** Claude przeszedł tę instrukcję w przeglądarce krok po kroku, tymi samymi kontami: **wszystkie scenariusze przechodzą** (2026-10-28 05:36). Kroków tylko dla człowieka (1, np. kod z maila) przeglądarka nie robi; Claude przeszedł dalej tą samą bramką.

## 2. Jak wejść na środowisko testowe

Service Desk do testów działa na komputerze Mac Studio, nie w chmurze. Ma tylko dane testowe: niczego nie zepsujesz, a to, co wpiszesz, nie trafi do prawdziwych osób. Aplikacja nie wysyła maili.

| Co | Jak |
| --- | --- |
| Adres | **https://servicedesk-test.seajack.dev** |
| Logowanie | Służbowy e-mail @raben-group.com i jednorazowy kod z maila. Hasła nie ma. |
| Uruchomienie aplikacji | Gdy aplikacja śpi, pod adresem widzisz przycisk „Uruchom aplikację” (albo „Spróbuj ponownie”). Kliknij go; start trwa do dwóch minut, strona odświeży się sama. |
| Samo się wyłącza | Po 2 godzinach bez ruchu, a także po 1–2 godzinach pracy (ograniczenie wersji testowej). |
| Ponowne uruchomienie | Odśwież adres i kliknij „Uruchom aplikację” albo „Spróbuj ponownie”. Konta i dane zostają, przepada tylko niezapisany formularz. |

1. **Krok 1.** Otwórz adres **https://servicedesk-test.seajack.dev**. Zobaczysz stronę „Log in to Service Desk demo (testerzy)”.
2. **Krok 2.** W polu **Email** wpisz swój służbowy adres @raben-group.com i kliknij **Send login code**.
3. **Krok 3.** Przepisz kod z maila (przychodzi w minutę) i zatwierdź. Kod działa raz.
4. **Krok 4.** Jeśli aplikacja śpi, kliknij **Uruchom aplikację** albo **Spróbuj ponownie** i poczekaj, aż strona sama się odświeży.
5. **Krok 5.** Na stronie „Wybierz, kim chcesz być w aplikacji” kliknij konto podane w scenariuszu. Bramka zaloguje Cię sama.
6. **Krok 6.** Aby później zmienić konto, otwórz **https://servicedesk-test.seajack.dev/_gate/as** albo kliknij ciemną zakładkę z ludzikiem przy prawej krawędzi ekranu.

> **Okienko:** Po wejściu może pojawić się okienko „Install the app”. Kliknij „Don't show again”; nic nie instalujesz.

## 3. Konta testowe

Każda rola ma swoje konto. Wybierasz je na stronie wyboru konta („Wybierz, kim chcesz być w aplikacji”); hasła nie wpisujesz. Jedna rola na jedno okno przeglądarki.

| Rola | Konto (tak jak na stronie wyboru) | Do czego |
| --- | --- | --- |
| Księgowość | TEST Ksiegowosc (MyConnect requester) | zgłasza sprawy dla zespołu myConnect i odpowiada w nich |
| Operator myConnect, depot Gądki | TEST myConnect operator DPL62 Intercom | prowadzi sprawy z Service Desku dla depotu |
| Operator myConnect, transport | TEST myConnect operator DPL62 RND | dostaje sprawy bez numeru przesyłki |
| Pracownik | TEST Pracownik (employee) | zwykły pracownik; spraw księgowości nie widzi |

## 4. S0. Wejście na środowisko testowe

**Cel:** Dojść od adresu do strony wyboru konta.

**Konto:** TEST Ksiegowosc (MyConnect requester)

1. **Krok 1.** Otwórz adres https://servicedesk-test.seajack.dev i sprawdź, że widzisz pole Email i przycisk Send login code.
2. **Krok 2.** Wpisz służbowy e-mail, kliknij Send login code i przepisz kod z maila.
3. **Krok 3.** Jeśli aplikacja śpi, kliknij Uruchom aplikację (albo Spróbuj ponownie) i poczekaj na stronę wyboru konta.

> **Oczekiwany wynik:** Widzisz stronę „Wybierz, kim chcesz być w aplikacji” z listą kont testowych, między innymi TEST Ksiegowosc.

## 5. S1. Księgowość widzi swoje sprawy dla myConnect

**Cel:** Sprawdzić, że księgowość widzi na liście swoje sprawy, ich stan i odpowiedzi zespołu myConnect.

**Konto:** TEST Ksiegowosc (MyConnect requester)

1. **Krok 1.** Zaloguj się jako TEST Ksiegowosc (MyConnect requester). Jeśli pojawi się okienko „Install the app”, kliknij „Don't show again”.
2. **Krok 2.** Na stronie startowej, w części „Current requests”, znajdź sprawę **#8821** ze stanem „Waiting for response”.
3. **Krok 3.** Kliknij tę sprawę.
4. **Krok 4.** Zejdź do zakładki **Messages** i przeczytaj ostatnią wiadomość od operatora.

> **Oczekiwany wynik:** Widzisz sprawę #8821 ze stanem „Waiting for response”, depotem Gądki i prośbą operatora o list przewozowy. Księgowość nie ma przycisku zmiany stanu sprawy (nie ma „Change to”): stan zmienia tylko zespół myConnect.

## 6. S2. Księgowość odpowiada w sprawie

**Cel:** Sprawdzić, że księgowość może dopisać odpowiedź do swojej sprawy.

**Konto:** TEST Ksiegowosc (MyConnect requester). **Zanim zaczniesz:** zrób scenariusz S1; zostań w sprawie #8821.

1. **Krok 1.** Zaloguj się jako TEST Ksiegowosc (MyConnect requester) i otwórz sprawę **#8821** (jak w S1).
2. **Krok 2.** W zakładce **Messages** kliknij **New message**.
3. **Krok 3.** W polu **Description** wpisz: „Test instrukcji: list przewozowy w załączeniu jutro.”
4. **Krok 4.** Kliknij **Send message**.

> **Oczekiwany wynik:** Okno się zamyka, a w zakładce Messages pojawia się Twoja wiadomość z dzisiejszą datą i nazwą TEST Ksiegowosc.

## 7. S3. Operator myConnect widzi odpowiedź księgowości

**Cel:** Sprawdzić, że operator myConnect widzi w sprawie wiadomości księgowości, nie tylko swoje.

**Konto:** TEST myConnect operator DPL62 Intercom. **Zanim zaczniesz:** zrób scenariusz S2 (wiadomość księgowości musi już być w sprawie).

1. **Krok 1.** Zmień konto na TEST myConnect operator DPL62 Intercom.
2. **Krok 2.** Na stronie startowej, na liście **My tickets**, znajdź wiersz z numerem **8821**.
3. **Krok 3.** Kliknij numer 8821.
4. **Krok 4.** Przewiń w dół do wiadomości w sprawie.

> **Oczekiwany wynik:** Widzisz wiadomość księgowości „Test instrukcji: list przewozowy w załączeniu jutro.” z jej nazwą. Na górze operator ma przyciski zmiany stanu: „In progress” i „Resolve”.

## 8. S4. Sprawa bez numeru przesyłki trafia do zespołu transportu

**Cel:** Sprawdzić, że sprawa zgłoszona bez numeru przesyłki jest u operatora transportu.

**Konto:** TEST myConnect operator DPL62 RND

1. **Krok 1.** Zmień konto na TEST myConnect operator DPL62 RND.
2. **Krok 2.** Strona startowa jest pusta. Kliknij **myConnect** w menu po lewej stronie.
3. **Krok 3.** Na liście **My team tickets** znajdź sprawę z numerem **8823**.

> **Oczekiwany wynik:** Sprawa 8823 („without shipment number”, stan New) jest na liście zespołu operatora transportu, a zgłaszającym jest TEST Ksiegowosc.

## 9. S5. Pracownik nie widzi spraw księgowości

**Cel:** Sprawdzić, że zwykły pracownik nie widzi cudzych spraw dla myConnect.

**Konto:** TEST Pracownik (employee)

1. **Krok 1.** Zmień konto na TEST Pracownik (employee).
2. **Krok 2.** Obejrzyj stronę startową i listę „Current requests”.

> **Oczekiwany wynik:** Na liście nie ma spraw księgowości (#8819–#8823) ani pozycji menu „myConnect”.

## 10. Gdy coś nie działa

1. **Strona „Aplikacja nie wystartowała” albo przycisk „Uruchom aplikację”.** Aplikacja sama się wyłączyła. Kliknij „Spróbuj ponownie” albo „Uruchom aplikację” i poczekaj do dwóch minut.
2. **Błąd połączenia w trakcie testu.** Odśwież adres bramki i uruchom aplikację jeszcze raz; zacznij scenariusz od początku.
3. **„The current license does not allow more users to sign in”.** Za dużo osób jest zalogowanych naraz (najwyżej 6). Napisz do Karola.
4. **Nie przyszedł kod z maila.** Sprawdź folder spam i odczekaj minutę. Po kilku prośbach z rzędu odczekaj 15 minut.

## 11. Czego ta instrukcja nie obejmuje

- Zakładanie nowej sprawy przez księgowość: na środowisku testowym brakuje pełnej listy kategorii.
- Maile o korespondencji wewnętrznej: środowisko testowe nie wysyła maili.
- Praca z asystentem w Teams i z Claude operatora: mają osobne instrukcje.
- Drobne poprawki i zmiany niewidoczne dla użytkownika (porządki, wygląd bez zmian, praca w tle).

## 12. Jak zgłosić błąd

1. Zapisz numer scenariusza i kroku, w którym coś poszło inaczej.
2. Zrób zrzut ekranu całego okna.
3. Napisz, co zrobiłeś, co zobaczyłeś i czego się spodziewałeś, i wyślij to do Karola razem ze zrzutem.

---
Instrukcja testów · Service Desk · przygotował Claude dla Karola
