# A business process the business can confirm

MxScout shows a planned process on the **Processes** screen: its name, the
summary as a lead paragraph, the steps as a numbered list, the story as
paragraphs under "How it works", and the roles beside it. There is no
Markdown in those fields — a `#` or a `**` is printed as typed. Structure
comes from paragraphs (one blank line between them) and from the first
sentence of each paragraph, which names what the paragraph is for.

## The fields

```
name     The process in the business's words, 2–6 words. Never a module name.
         "Przypisanie licencji", not "Assignment".
state    new | changed
summary  One or two sentences: what it is for and what the business gets.
         End with "Do potwierdzenia: BR-3, BR-7, BR-8." — the rules this
         process rests on, so a reader knows what they are agreeing to.
steps    4–8 sentences. What a person sees and does, in order, in their
         words. The application is the subject only where the application
         acts on its own ("Aplikacja sprawdza…"). No flow names, no HTTP.
roles    The roles as the business calls them: "Lokalne IT", "Edytor
         limitów", "RMS (rozliczenia)", "Aplikacja (zadanie nocne)".
         Not the model's role names, not English where the plan is Polish.
pages    The prototype screens of this process, "Module.Page", in the order
         a person walks them. A process with no screen gets an empty list —
         never a screen that only looks related.
story    Six paragraphs, below.
```

## The six paragraphs of `story`

Each paragraph opens with its own name and a full stop, then the text. Keep
this order; a reader learns it after two processes and starts skimming to the
part they care about.

1. **Po co to jest.** What hurts today and what is different once this
   exists. Two to four sentences. This is the only place where you may talk
   about value, and the first thing a manager reads.

2. **Jak to przebiega.** The process as a person lives it: what they open,
   what they see, what they choose, how long it takes, what they see while
   they wait. Concrete enough that somebody can disagree with it.

3. **Zasady, które aplikacja pilnuje — prosimy o potwierdzenie każdej z
   nich.** One sentence per rule, each opening with its number from the
   brief: "BR-3: licencję da się nadać tylko wtedy, gdy …". Write the rule in
   full — never "zgodnie z BR-3" — because this paragraph is the thing the
   business actually approves. Where a rule is the keystone of the whole
   application (how cost is computed, who may see what), say so and ask for
   it explicitly.

4. **Co się dzieje, gdy coś pójdzie nie tak.** Timeouts, a system that
   answers late, a partial failure, what the user must do (usually nothing),
   what the application does by itself. Business people ask this question
   every time; answering it before they ask is most of what makes a plan
   trusted.

5. **Czego ten proces nie robi.** The boundary. E-mails not sent, records not
   created, systems not touched, decisions left to a person. Each line is a
   scope decision somebody can still reverse — cheaply, now.

6. **Do rozstrzygnięcia przez biznes.** The open questions that touch this
   process, by number: "P-5: skąd aplikacja ma wiedzieć …". Propose an answer
   where you have one, and say what each answer would cost. A question
   without a proposal gets answered six weeks late.

Paragraphs 5 and 6 may be dropped only when they are genuinely empty — which
is rare, and a process with nothing open is usually a process nobody has
thought about yet.

## What never goes into a process

- Microflow, nanoflow, entity, attribute or enumeration names. They live in
  the guide's own `microflows` and `entities`, which MxScout draws beside the
  process.
- API verbs and paths (`DELETE /groups/{id}/members/$ref`), header names,
  permission names. Write what they mean: "aplikacja usuwa pracownika z grupy
  licencyjnej w Microsofcie".
- English words in a Polish plan where Polish exists: not "assignment", not
  "baseline", not "scope".
- Any sentence whose source you cannot name. See the rule in SKILL.md.

## Worked example

From the License 2.0 plan (`license-2-0`, story LIC-3). Abridged — the real
`story` runs four paragraphs longer.

```
name:    Przypisanie licencji
state:   new
summary: Lokalne IT nadaje pracownikowi licencję Microsoft 365 w granicach
         limitu swojej jednostki. Licencja liczy się jako nadana dopiero
         wtedy, gdy Microsoft potwierdzi ją jako aktywną.
         Do potwierdzenia: BR-2, BR-3, BR-4, BR-7, BR-8, BR-12.
roles:   ["Lokalne IT"]
pages:   ["LicenseCore.Home", "Assignment.Employee_Search",
          "Assignment.Employee_Licenses", "Assignment.Assignment_Confirm"]
steps:
  1. Lokalne IT wyszukuje pracownika; widzi tylko pracowników jednostek,
     do których ma dostęp.
  2. Karta pracownika pokazuje jego obecne licencje oraz typy licencji
     z liczbą wolnych miejsc w jednostce.
  3. Lokalne IT wybiera typ licencji; typy bez wolnych miejsc są zablokowane.
  …
story:
  Po co to jest. To jest serce aplikacji. Dziś nikt w Raben nie widzi
  w jednym miejscu, ile licencji danego typu wolno wydać spółce i ile już
  wydano, więc licencje nadaje się bez kontroli, a RMS refakturuje je na
  spółki na podstawie danych zbieranych ręcznie. […]

  Jak to przebiega. Osoba z lokalnego IT wpisuje nazwisko albo adres
  pracownika i dostaje listę pracowników tylko z tych jednostek, do których
  ma dostęp. […] Po potwierdzeniu operacja trwa zwykle kilka–kilkanaście
  sekund, bo aplikacja czeka na odpowiedź Microsoftu.

  Zasady, które aplikacja pilnuje — prosimy o potwierdzenie każdej z nich.
  BR-2: lokalne IT przypisuje licencje wyłącznie pracownikom jednostek, do
  których ma nadany dostęp […]. BR-3: licencję da się nadać tylko wtedy, gdy
  jednostka ma jeszcze wolne miejsce dla tego typu […]. BR-7: operacja jest
  zakończona sukcesem dopiero wtedy, gdy Microsoft potwierdzi licencję jako
  aktywną […].

  Co się dzieje, gdy coś pójdzie nie tak. Jeżeli Microsoft nie odpowie od
  razu, przypisanie zostaje w stanie „w toku” i aplikacja sama domyka je
  w tle […]. Użytkownik nie musi nic robić ani powtarzać operacji.

  Czego ten proces nie robi. Nie wysyła żadnej wiadomości do pracownika ani
  do przełożonego i nie zmienia routingu poczty (decyzja LIC-14). […]

  Do rozstrzygnięcia przez biznes, zanim to zbudujemy. P-5: skąd aplikacja
  ma wiedzieć, do której jednostki należy pracownik — propozycja to pole
  companyName z Entra ID przełożone na jednostkę regułą utrzymywaną
  w OneVerse; bez tej decyzji nie da się policzyć zużycia […].
```

## Reviewing your own processes before handing them in

Read them as the business will: top to bottom, in order, in one sitting.

- Does every process open with why it exists, in the first sentence?
- Does any paragraph 3 rule appear nowhere in the brief? Then either it is a
  rule the brief is missing — add it there — or you invented it.
- Does a reader with no Mendix knowledge meet a word they cannot know?
- Are the same things called the same name in every process ("jednostka"
  everywhere, or "spółka" everywhere, not both)?
- Is each open question attached to the process where it bites, and does it
  say what you propose?
