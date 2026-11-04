# A business process the business can confirm

People read this. Not "stakeholders skim it" — a person sits down, reads one
process, and has to be able to say "yes" or "no, not like that". Everything
below follows from that one fact.

## The mistake to avoid first

A process is **not one block of prose with labels glued into it**. Writing

> Po co to jest. To jest serce aplikacji. Dziś nikt w Raben nie widzi […]
>
> Jak to przebiega. Osoba z lokalnego IT wpisuje nazwisko […]

gives a reader a wall of text whose labels are neither headings nor
sentences — they read as a stumble, and nothing can be found in them. The
labels were always meant to be **captions over sections**. Give the process
its parts as data, each one drawn as what it is: a caption and paragraphs, a
numbered list, a framed list of questions. Then the reader's eye goes
straight to the part they care about, and the rules they must approve are a
numbered list they can tick, not sentences buried in a paragraph.

## The parts of a process

```
name     The process in the business's words, 2–6 words. Never a module name.
state    new | changed
summary  One or two sentences: what it is for and what the business gets.
         It is the lead, always visible. No rule numbers crammed in here.
steps    4–8 sentences, drawn as a numbered list. What a person sees and
         does, in order, in their words. The application is the subject only
         where it acts on its own. No flow names, no HTTP.
roles    The roles as the business calls them: "Lokalne IT", "Edytor
         limitów", "RMS (rozliczenia)", "Aplikacja (zadanie nocne)".
pages    The prototype screens, "Module.Page", in the order a person walks
         them. A process with no screen gets an empty list.
why      Paragraphs: what hurts today, what is different once this exists.
         Two to four sentences. Drawn under the caption "Po co to jest".
how      Paragraphs: the process as a person lives it — what they open, what
         they see, what they choose, how long it takes, what they see while
         they wait. Concrete enough that somebody can disagree with it.
rules    The rules the business approves, each its own record:
         { id: "BR-3", text: "…", key: true }
         Drawn as a numbered list, one rule per line, the id as a badge.
         key marks a rule the whole application rests on — how cost is
         computed, who may see what — which is drawn pulled out, framed.
         Write the rule in full. Never "zgodnie z BR-3": this list IS the
         thing being approved.
onError  Paragraphs: what happens when a system answers late, partly, or not
         at all; what the user must do (usually nothing); what the
         application does by itself. Business people ask this every time.
outOfScope  Short sentences, drawn as a list: what this will not do. Each
         line is a scope decision somebody can still reverse, cheaply, now.
open     The questions this process waits on, each its own record:
         { id: "P-5", text: "…", proposal: "…", to: "business" }
         Drawn framed, apart from the prose, because they are the only part
         that asks the reader for something other than a yes. MxScout keeps
         each as a question of the plan the business answers on its Plan page
         (see "Planning again" in the team part): proposal is the plan's own
         assumption until someone answers — always give one — and to says who
         answers: business (the default), it (the company's IT), owner.
diagram  Only when the case can go different ways. A straight sequence is
         already a numbered list; a column of boxes adds nothing to it.
```

Nothing is a heading written inside a text field. If the reader's copy of
MxScout cannot draw one of these parts yet, leave that part out rather than
folding it back into the prose — the fix is in the tool, not in the writing.

## What never goes into a process

- Microflow, nanoflow, entity, attribute or enumeration names. They live in
  the guide's own `microflows` and `entities`, drawn beside the process.
- API verbs and paths (`DELETE /groups/{id}/members/$ref`), header names,
  permission names. Write what they mean: "aplikacja usuwa pracownika z grupy
  licencyjnej w Microsofcie".
- English words in a Polish plan where Polish exists: not "assignment", not
  "baseline", not "scope".
- Any sentence whose source you cannot name — a document, a decision, or an
  open question. There is no fourth kind.

## Worked example

From the License 2.0 plan (`license-2-0`, story LIC-3), abridged.

```
name:    Zamiana licencji podstawowej (E1 → E3)
state:   new
summary: Podniesienie pracownikowi licencji podstawowej jako jedna operacja:
         najpierw nowa licencja, potwierdzenie, dopiero potem zabranie
         starej — tak, żeby pracownik ani przez chwilę nie został bez poczty.
roles:   ["Lokalne IT"]
pages:   ["Assignment.Employee_Licenses", "Assignment.BaselineSwitch_Confirm"]

steps:
  1. Lokalne IT wybiera pracownikowi nową licencję podstawową.
  2. Aplikacja rozpoznaje zamianę i pokazuje, co i w jakiej kolejności zrobi.
  3. Aplikacja dodaje pracownika do grupy nowej licencji i czeka na
     potwierdzenie Microsoftu, że jest aktywna.
  4. Dopiero po potwierdzeniu usuwa pracownika z grupy starej licencji.

why:  Licencja podstawowa to ta, z której pracownik ma pocztę. Pracownik może
      mieć tylko jedną taką licencję. Gdyby zamiana polegała na zwykłym
      odpięciu starej i nadaniu nowej, między jednym a drugim pracownik
      zostałby bez poczty, a w najgorszym razie Microsoft zacząłby usuwać
      jego skrzynkę.

rules:
  - id: BR-9   key: true
    text: Kolejność jest sztywna: dodaj nową licencję, potwierdź, że jest
          aktywna, dopiero potem usuń starą. Nigdy odwrotnie.
  - id: BR-22
    text: Pracownik nie może mieć dwóch licencji podstawowych naraz; jedynym
          wyjątkiem jest chwila zamiany, oznaczona jako „zamiana w toku”.

onError: Jeżeli nowa licencja się nie uaktywni, przebieg zatrzymuje się przed
      usunięciem starej — pracownik zostaje przy starej licencji i nic nie
      traci. Zamiana trafia na listę problemów z informacją, na którym kroku
      stanęła, i można ją powtórzyć.

outOfScope:
  - Nie zmienia routingu poczty z zewnątrz po zmianie licencji (decyzja LIC-14).
  - Nie zakłada ani nie kasuje konta pracownika w Microsofcie.

open:
  - id: P-1
    text: Po zmianie licencji podstawowej trzeba dziś zaktualizować routing
          poczty z zewnątrz (Postfix), a decyzja LIC-14 mówi, że ta aplikacja
          tego nie robi.
    proposal: Potwierdzić skreślenie wymagania i wskazać, kto zajmie się
          routingiem po zamianie.

diagram: tak — przebieg ma rozgałęzienie (nowa licencja potwierdzona albo nie).
```

## Reviewing your own processes before handing them in

Read them as the business will: top to bottom, in order, in one sitting.

1. Can the reader find the rules without reading the prose? If the rules are
   sentences inside a paragraph, the answer is no.
2. Does every process open with why it exists, before how it works?
3. Does any rule appear nowhere in the brief? Then either the brief is
   missing it — add it there — or you invented it.
4. Does a reader with no Mendix knowledge meet a word they cannot know?
5. Are the same things called the same name in every process ("jednostka"
   everywhere, or "spółka" everywhere, never both)?
6. Does each open question say what you propose, not only what is unknown?
7. Is there a diagram where the case branches, and none where it does not?
