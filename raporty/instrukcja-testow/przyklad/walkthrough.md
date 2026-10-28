# Przejście instrukcji: Service Desk: sprawy księgowości dla zespołu myConnect – instrukcja testów

Cała instrukcja przechodzi. 2026-10-28T05:36:55.988Z, adres https://mac-studio-karol.tailaf34e0.ts.net:8443.

## S0. Wejście na środowisko testowe ✓

Konto: TEST Ksiegowosc (MyConnect requester) · zrzut: S0.png

- ✓ 1. Otwórz adres https://servicedesk-test.seajack.dev i sprawdź, że widzisz pole Email i przycisk Send login code.
- 👤 2. Wpisz służbowy e-mail, kliknij Send login code i przepisz kod z maila. — kod przychodzi na skrzynkę testera; Claude wchodzi dalej tą samą bramką jako właściciel
- ✓ 3. Jeśli aplikacja śpi, kliknij Uruchom aplikację (albo Spróbuj ponownie) i poczekaj na stronę wyboru konta.
- ✓ wynik. Widzisz stronę „Wybierz, kim chcesz być w aplikacji” z listą kont testowych, między innymi TEST Ksiegowosc.

## S1. Księgowość widzi swoje sprawy dla myConnect ✓

Konto: TEST Ksiegowosc (MyConnect requester) · zrzut: S1.png

- ✓ 1. Zaloguj się jako TEST Ksiegowosc (MyConnect requester). Jeśli pojawi się okienko „Install the app”, kliknij „Don't show again”.
- ✓ 2. Na stronie startowej, w części „Current requests”, znajdź sprawę **#8821** ze stanem „Waiting for response”.
- ✓ 3. Kliknij tę sprawę.
- ✓ 4. Zejdź do zakładki **Messages** i przeczytaj ostatnią wiadomość od operatora.
- ✓ wynik. Widzisz sprawę #8821 ze stanem „Waiting for response”, depotem Gądki i prośbą operatora o list przewozowy. Księgowość nie ma przycisku zmiany stanu sprawy (nie ma „Change to”): stan zmienia tylko zespół myConnect.

## S2. Księgowość odpowiada w sprawie ✓

Konto: TEST Ksiegowosc (MyConnect requester) · zrzut: S2.png

- ✓ 1. Zaloguj się jako TEST Ksiegowosc (MyConnect requester) i otwórz sprawę **#8821** (jak w S1).
- ✓ 2. W zakładce **Messages** kliknij **New message**.
- ✓ 3. W polu **Description** wpisz: „Test instrukcji: list przewozowy w załączeniu jutro.”
- ✓ 4. Kliknij **Send message**.
- ✓ wynik. Okno się zamyka, a w zakładce Messages pojawia się Twoja wiadomość z dzisiejszą datą i nazwą TEST Ksiegowosc.

## S3. Operator myConnect widzi odpowiedź księgowości ✓

Konto: TEST myConnect operator DPL62 Intercom · zrzut: S3.png

- ✓ 1. Zmień konto na TEST myConnect operator DPL62 Intercom.
- ✓ 2. Na stronie startowej, na liście **My tickets**, znajdź wiersz z numerem **8821**.
- ✓ 3. Kliknij numer 8821.
- ✓ 4. Przewiń w dół do wiadomości w sprawie.
- ✓ wynik. Widzisz wiadomość księgowości „Test instrukcji: list przewozowy w załączeniu jutro.” z jej nazwą. Na górze operator ma przyciski zmiany stanu: „In progress” i „Resolve”.

## S4. Sprawa bez numeru przesyłki trafia do zespołu transportu ✓

Konto: TEST myConnect operator DPL62 RND · zrzut: S4.png

- ✓ 1. Zmień konto na TEST myConnect operator DPL62 RND.
- ✓ 2. Strona startowa jest pusta. Kliknij **myConnect** w menu po lewej stronie.
- ✓ 3. Na liście **My team tickets** znajdź sprawę z numerem **8823**.
- ✓ wynik. Sprawa 8823 („without shipment number”, stan New) jest na liście zespołu operatora transportu, a zgłaszającym jest TEST Ksiegowosc.

## S5. Pracownik nie widzi spraw księgowości ✓

Konto: TEST Pracownik (employee) · zrzut: S5.png

- ✓ 1. Zmień konto na TEST Pracownik (employee).
- ✓ 2. Obejrzyj stronę startową i listę „Current requests”.
- ✓ wynik. Na liście nie ma spraw księgowości (#8819–#8823) ani pozycji menu „myConnect”.
