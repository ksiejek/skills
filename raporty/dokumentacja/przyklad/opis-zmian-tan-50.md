# Historyjka czekająca na Karola nie blokuje już kolejki

_Opis zmian · Tandem_

**Gdy historyjka czeka na krok, który może wykonać tylko Karol, Tandem odkłada ją na bok i od razu bierze następną niezależną. Dotyczy projektów poza Mendix.**

**Dla kogo:** Karol (Product Owner) · **Zmiana:** TAN-50 · **Status:** Przykładowy dokument · **Data:** 27 października 2026

## Spis treści

1. W skrócie
2. Po co ta zmiana
3. Co się zmieniło
4. Jak to sprawdzić
5. Następne kroki

## 1. W skrócie

Dotąd każda historyjka, która stanęła na kroku „zrób to w Studio Pro” albo „zaloguj się do op”, **zatrzymywała cały projekt**. Teraz ona czeka z napisem „Czeka na Karola”, a Tandem pracuje dalej.

**Dziś.** Jedna historyjka czeka na Ciebie, cały projekt stoi.

**Po zmianie.** Historyjka czeka na swojej gałęzi, następna niezależna rusza w osobnym worktree.

## 2. Po co ta zmiana

- Nie tracisz czasu pracy agentów, gdy odpowiedź przyjdzie za kilka godzin.
- Widzisz od razu, **na co dokładnie** czeka historyjka (akcja jest na karcie).
- Po Twojej odpowiedzi historyjka wraca do pracy zaraz po bieżącej.

> **Wyjątek:** W projektach **Mendix** zasada „jeden job na projekt” zostaje: blokada nadal zatrzymuje projekt.

## 3. Co się zmieniło

| Obszar | Było | Jest |
| --- | --- | --- |
| Karta historyjki | Czerwona ramka „Potrzebna odpowiedź” | Napis „Czeka na Karola” z opisem akcji |
| Kolejka | Stoi, dopóki nie odpowiesz | Rusza następna historyjka, która nie zależy od zablokowanej ani nie dzieli z nią plików |
| Limit | Brak | Najwyżej **dwie** odłożone historyjki na projekt, potem projekt się zatrzymuje |

## 4. Jak to sprawdzić

Środowisko: Tandem na Macu, **http://127.0.0.1:4291/**, projekt bez Mendix. Potrzebne są trzy historyjki w To do; pierwsza kończy się pytaniem do Karola.

1. **Zablokuj.** Uruchom pierwszą historyjkę; w kroku wymagającym Ciebie wybierz „Czeka na Karola”.
2. **Sprawdź kartę.** Karta pokazuje napis i opis akcji, nie czerwoną ramkę.
3. **Następna rusza.** Druga, niezależna historyjka przechodzi do Running w osobnym worktree.
4. **Odpowiedz.** Po odpowiedzi pierwsza wraca do pracy dopiero po zakończeniu bieżącej.

1. **Zależna historyjka.** Trzecia historyjka zależy od pierwszej: **nie** może ruszyć, dopóki pierwsza czeka.
2. **Limit dwóch.** Przy trzeciej odłożonej historyjce projekt się zatrzymuje.

## 5. Następne kroki

- ✓ **Karol testuje** scenariusz z sekcji „Jak to sprawdzić” na własnym sprincie.
- ✓ **Uwagi** wpisz w historyjce; poprawka wejdzie w następnej turze.

---
Historyjka czekająca na Karola · Przykładowy dokument · Claude · 27 października 2026
