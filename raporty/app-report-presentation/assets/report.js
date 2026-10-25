/* report.js — renders an application's documentation report from one JSON
 * object. No dependencies, no build step, no network. Every text from the
 * data is set with textContent: nothing here parses markup.
 *
 *   Report.mount(data, rootElement)   draws the whole report
 *   Report.markdown(data)             the same content as one Markdown text
 *   Report.LABELS                     the interface labels, en / pl / de
 *
 * The data (full description with examples in assets/README.md):
 *
 * {
 *   "lang": "en" | "pl" | "de",
 *   "app": { name, kind, source, readAt, summary, story, audience:[{who, what}] },
 *   "provenance": { by, written },                 who wrote the texts, when
 *   "terms": { parts|records|screens: { label, one, few?, many?, other } },
 *   "flowKinds": [{ key, tag, label, one, few?, many?, other }],
 *   "processes": [{ name, summary, story, steps:[{text, who:'person'|'app', role}],
 *                   flows:[name], diagram:[item] }],
 *   "parts": [{ name, thirdParty, summary, story, notes:[{title, text|items|table}],
 *               dependsOn:[{name, count}], runs:[{kind, name, schedule, on}] }],
 *   "flows": [{ name, kind, summary, params:[{name,type}], returns, from:[], roles:[],
 *               calls:[], steps, drawing:[item] }],
 *   "screens": [{ name, summary, roles:[], openedFrom:[], starts:[], shows:[] }],
 *   "dataModel": [{ name, summary, fields:[{name,type}], relations:[{to, many}],
 *                   access:[{role, read, write}] }],
 *   "architecture": { context:{nodes,links}, containers:{nodes,links},
 *                     access:[{role, parts:{Part: text}}], open:[text] },
 *   "themes": { key: { name, text } },
 *   "risks": [{ id, level:'P1'|'P2'|'P3', theme, title, detail, where:[name], fix, part }],
 *   "quality": [{ id, group, warn, count, total, label, sub, explain,
 *                 rule:{quote, source}, items:{columns, rows} }],
 *   "forDevelopers": { where:[{topic, place}], conventions:[{pattern, meaning, count}],
 *                      pitfalls:[text] }
 * }
 *
 * A diagram or drawing item is one of
 *   { "step": text, "who": role, "by": "person"|"app" }        a process step
 *   { "step": text, "kind": "read"|"change"|"save"|"delete"|"call"|"show"|"message"|"var", "value": text }
 *   { "decision": text, "ways": [{ "label", "then": [items], "end": text, "join": step text }] }
 *   { "loop": text, "body": [items] }
 *   { "end": text, "returns": text }
 * A way with "end" finishes there; with "join" it goes on at that step further
 * on; with neither it rejoins the main path under the decision.
 *
 * Names in prose written between backticks (`Orders.submitOrder`) are shown
 * in code font, and become links when the report has a page for them. */
(function () {
  'use strict';

  // ================================================================ labels
  var LABELS = {
    en: {
      'g.app': 'Application', 'g.structure': 'Structure', 'g.review': 'Review',
      'p.overview': 'Overview', 'p.processes': 'Processes', 'p.parts': 'Modules', 'p.architecture': 'Architecture',
      'p.data': 'Data model', 'p.flows': 'Flows', 'p.screens': 'Screens', 'p.risks': 'Risks', 'p.quality': 'Quality',
      'p.developers': 'For developers',
      'search': 'Search', 'search.ph': 'Search names and text…', 'search.names': 'Names', 'search.text': 'In the text',
      'search.none': 'Nothing matches “{q}”.', 'search.hint': 'Type a name or a word. Accents and case do not matter.',
      'copy': 'Copy link', 'copied': 'Link copied', 'md': 'Download as Markdown',
      'theme': 'Theme', 'light': 'Light', 'dark': 'Dark', 'auto': 'Auto', 'auto.t': 'Follow the system',
      'close': 'Close', 'show.all': 'Show all', 'filter': 'Filter', 'none': 'None.', 'open': 'Open',
      'read.more': 'Read the full description', 'read.less': 'Hide the full description',
      'ai.mark': '✦ AI', 'ai.title': 'Written by an AI agent from the source, not read from it',
      // overview
      'ov.eyebrow': '{kind} · documentation', 'ov.glance': 'At a glance', 'ov.prov': 'Numbers and structure are read from the source. The texts were written from it by {by} and can be wrong where the source is ambiguous.',
      'ov.users': 'Who uses it', 'ov.users.sub': '{groups} of people work in it.',
      'ov.talks': 'What it talks to', 'ov.talks.sub': '{partners} around it, placed by the way the data goes.', 'ov.talks.more': 'Every partner and what it exchanges',
      'ov.does': 'What it does', 'ov.does.sub': '{processes}, each followed from start to end.', 'ov.does.more': 'All processes',
      'ov.attn': 'What needs attention', 'ov.attn.sub': '{findings} written from the source, and what the source measures.', 'ov.attn.more': 'All risks',
      'ov.p1s': 'P1 findings', 'ov.facts': 'Read from the source',
      'ov.next': 'Where to go next', 'ov.next.sub': 'Three ways in, by what you came to do.',
      'ov.n1': 'Understand the application', 'ov.n1.t': 'What it is made of, what surrounds it, and how a case moves through it.',
      'ov.n2': 'Read the logic', 'ov.n2.t': 'The units of behaviour step by step, and the records they move.',
      'ov.n3': 'Change it safely', 'ov.n3.t': 'What should be fixed, what the source measures badly, and what breaks easily.',
      'ov.toc': 'On this page', 'ov.file': 'This file', 'ov.file.t': 'One HTML file: it opens offline and loads nothing from anywhere. Every page has its own address; Copy link sends exactly what you see.',
      'ov.about': 'About',
      'glance.kind': 'Kind', 'glance.read': 'Read from',
      'tile.p1': 'fix first', 'tile.p2': 'plan a fix', 'tile.p3': 'worth knowing',
      // processes
      'pr.sub': 'What {app} does, told as {processes}. An agent wrote them from the source; each lists the flows that carry it.',
      'pr.app': 'The application', 'pr.app.meta': 'Full description · {paragraphs}', 'pr.app.summary': 'Summary',
      'pr.eyebrow': 'Process {n} of {m}', 'pr.app.eyebrow': '{app} · full description',
      'pr.steps': 'Steps', 'pr.diagram': 'Diagram', 'pr.how': 'How it works', 'pr.flows': 'Flows that carry it',
      'pr.risks': 'Risks along the way', 'pr.norisk': 'No risk touches these flows.', 'pr.who': 'Who uses it',
      'pr.list': 'The processes', 'pr.prov': 'Written by an agent from the source. Step lists and flow names come from the source; check the wording before you quote it.',
      'pr.notdrawn': 'A straight sequence: the steps above say it all, so it is not drawn.',
      'pr.app.by': 'Application', 'pr.legend.person': 'a person acts', 'pr.legend.app': 'the application acts',
      // drawing
      'fg.start': 'Start', 'fg.rejoins': 'rejoins the main path', 'fg.continues': 'continues at step {n}', 'fg.back': 'goes back to step {n}',
      'fg.otherwise': 'otherwise', 'fg.returns': 'returns {x}', 'fg.decision': 'Decision',
      'k.read': 'Read data', 'k.change': 'Create or change', 'k.save': 'Save', 'k.delete': 'Delete', 'k.call': 'Call',
      'k.show': 'Show screen', 'k.message': 'Message', 'k.var': 'Value',
      // parts
      'pt.sub': '{own} written for {app}, {third} from a third party. Each holds part of the application: its flows, screens and records.',
      'pt.sub.own': '{own}. Each holds part of the application: its flows, screens and records.',
      'pt.own': 'Own', 'pt.third': 'Third-party', 'pt.all': 'All', 'pt.sort': 'Sort', 'pt.az': 'A–Z', 'pt.size': 'Size', 'pt.byrisk': 'Risks',
      'pt.eyebrow.own': 'Own module', 'pt.eyebrow.third': 'Third-party module',
      'pt.about': 'About', 'pt.contents': 'Contents', 'pt.conn': 'Connections', 'pt.risks': 'Risks',
      'pt.what': 'What it does', 'pt.nodesc': 'No description of this part was written.',
      'pt.uses': 'Uses', 'pt.usedby': 'Used by', 'pt.both': 'both ways', 'pt.runs': 'Runs on its own',
      'pt.runs.none': 'Nothing. Everything here starts from a screen or from another part.',
      'pt.uses.none': 'Nothing: it leans on no other part.', 'pt.usedby.none': 'No other part uses it.',
      'pt.norisk': 'No finding names this part.', 'pt.empty': 'Nothing of this kind is listed in this part.',
      'pt.on': 'on', 'pt.off': 'switched off', 'pt.fix': 'Fix',
      // architecture
      'ar.sub': 'What surrounds {app}, what it runs as, how its parts depend on each other, and who reaches what.',
      'ar.context.s': 'Context', 'ar.runtime.s': 'Runtime', 'ar.deps.s': 'Dependencies', 'ar.roles.s': 'Roles', 'ar.open.s': 'Open questions',
      'ar.ctx': 'Context', 'ar.ctx.t': 'Who uses {app} and which systems it exchanges data with: {partners} in {groups}. The table under the picture says what each one exchanges.',
      'ar.rt': 'Runtime', 'ar.rt.t': 'What {app} runs as: who calls in on the left, its own parts in the frame, stores and the systems it calls on the right.',
      'ar.dep': 'Dependencies between parts', 'ar.dep.t': 'Read across a row: the row part uses the column part, the number says how often. A pair that depends both ways is marked; least-used parts are at the top.',
      'ar.roles': 'Roles and access', 'ar.roles.t': 'Which role reaches which part, as the source grants it.',
      'ar.open': 'What the source does not show', 'ar.open.t': '{things} to confirm before relying on this picture. Written by an agent.',
      'ar.partner': 'Partner', 'ar.group': 'Group', 'ar.dir': 'Direction', 'ar.over': 'What goes over',
      'ar.jobs': 'Scheduled jobs', 'ar.eps': 'Entry points', 'ar.jobs.hint': 'As set in the source. Which ones run in production is set per environment.',
      'ar.legend.uses': 'uses', 'ar.legend.both': 'both ways', 'ar.pick': 'Pick a part in the matrix to list what it uses and what uses it.',
      'ar.role': 'Role', 'ar.app': 'Application', 'ar.runtime': '{app} runtime',
      'ctx.people': 'People', 'ctx.both': 'Both ways', 'ctx.in': 'Send data to it', 'ctx.out': 'It calls', 'ctx.other': 'Other',
      'ctx.useit': 'use it', 'ctx.send': 'send data', 'ctx.calls': 'calls',
      // data, flows, screens
      'dm.sub': '{records} in {parts}. Read from the source.', 'dm.fields': 'Fields', 'dm.name': 'Name', 'dm.type': 'Type', 'dm.rel': 'Relations', 'dm.access': 'Who can access it',
      'dm.read': 'read', 'dm.write': 'write', 'dm.noaccess': 'No access rule is listed for it.', 'dm.nofields': 'No fields of its own.',
      'fl.sub': '{flows} in {parts}. Descriptions marked ✦ AI were written by an agent; everything else is read from the source.',
      'fl.params': 'Takes', 'fl.returns': 'Returns', 'fl.from': 'Started from', 'fl.roles': 'Who may start it', 'fl.calls': 'Calls',
      'fl.calledby': 'Called by', 'fl.risks': 'Findings that name it', 'fl.drawing': 'Steps', 'fl.nodraw': 'No drawing of this flow is in the data.',
      'fl.nothing': 'Nothing.', 'fl.filter': 'Filter, e.g. a word, a prefix, a part', 'fl.nomatch': 'No name matches this filter.',
      'sc.sub': '{screens} in {parts}. Who may open each one, from where, and what it starts.',
      'sc.roles': 'Who may open it', 'sc.from': 'Opened from', 'sc.starts': 'What its buttons start', 'sc.shows': 'Records it shows',
      // risks
      'rk.sub': '{findings} in {parts}. An agent wrote them from the source, so check each one before you act on it.',
      'rk.where.gather': 'Where they gather', 'rk.sev': 'Severity', 'rk.pat': 'Patterns', 'rk.count': '{findings}', 'rk.count.f': '{n} of {findings}',
      'rk.group': 'Group', 'rk.bylevel': 'Severity', 'rk.bypart': 'Part', 'rk.nomatch': 'No finding matches these filters.',
      'rk.happens': 'What happens', 'rk.todo': 'What to do', 'rk.where': 'Where', 'rk.same': 'Same pattern elsewhere', 'rk.also': 'Also in {part}',
      'rk.all.pat': 'All {n} with this pattern', 'rk.all.part': 'All {n} in {part}', 'rk.pos': '{level} · {i} of {n}',
      'rk.prev': 'Previous finding', 'rk.next': 'Next finding', 'rk.prov': 'An agent wrote this finding from the source. It sees only the source, not the data or the configuration in production.',
      'rk.dominant': '{n} of the {m} P1 findings are one pattern: {theme}.', 'rk.places': 'places', 'rk.open': 'Open',
      'lv.P1': 'Security and data', 'lv.P2': 'Functional errors', 'lv.P3': 'Maintenance',
      'when.P1': 'Fix before the next release', 'when.P2': 'Fix in one of the next releases', 'when.P3': 'Fix when you next work on it',
      // quality
      'q.sub': '{checks} counted straight from the source and measured against a stated rule. Nothing on this page was written by an agent.',
      'q.of': 'of {n}', 'q.rule': 'The rule', 'q.norule': 'No published rule: the count is information, not a verdict.', 'q.found': 'Found',
      'q.more': '+ {n} more', 'q.none': 'None. Nothing breaks this rule.',
      // developers
      'dv.sub': 'Where things are, how names are built, and what breaks easily — for whoever changes {app} next. Written by an agent.',
      'dv.where': 'Where things are', 'dv.naming': 'Naming', 'dv.pitfalls': 'Before you change', 'dv.pattern': 'Pattern', 'dv.means': 'What it means here',
      'dv.count': 'Names', 'dv.filter': 'Filter the notes', 'dv.nomatch': 'No note matches this filter.',
      'empty.page': 'This page has nothing to show.'
    },
    pl: {
      'g.app': 'Aplikacja', 'g.structure': 'Budowa', 'g.review': 'Ocena',
      'p.overview': 'Przegląd', 'p.processes': 'Procesy', 'p.parts': 'Moduły', 'p.architecture': 'Architektura',
      'p.data': 'Model danych', 'p.flows': 'Przepływy', 'p.screens': 'Ekrany', 'p.risks': 'Ryzyka', 'p.quality': 'Jakość',
      'p.developers': 'Dla programistów',
      'search': 'Szukaj', 'search.ph': 'Szukaj nazw i tekstu…', 'search.names': 'Nazwy', 'search.text': 'W tekście',
      'search.none': 'Nic nie pasuje do „{q}”.', 'search.hint': 'Wpisz nazwę albo słowo. Wielkość liter i znaki diakrytyczne nie mają znaczenia.',
      'copy': 'Kopiuj link', 'copied': 'Skopiowano link', 'md': 'Pobierz jako Markdown',
      'theme': 'Motyw', 'light': 'Jasny', 'dark': 'Ciemny', 'auto': 'Systemowy', 'auto.t': 'Jak w systemie',
      'close': 'Zamknij', 'show.all': 'Pokaż wszystko', 'filter': 'Filtruj', 'none': 'Brak.', 'open': 'Otwórz',
      'read.more': 'Przeczytaj pełny opis', 'read.less': 'Ukryj pełny opis',
      'ai.mark': '✦ AI', 'ai.title': 'Napisane przez agenta AI na podstawie źródła, nie odczytane z niego',
      'ov.eyebrow': '{kind} · dokumentacja', 'ov.glance': 'W skrócie', 'ov.prov': 'Liczby i struktura są odczytane ze źródła. Teksty napisał na jego podstawie {by} i mogą być błędne tam, gdzie źródło jest niejednoznaczne.',
      'ov.users': 'Kto z niej korzysta', 'ov.users.sub': 'Pracują w niej: {groups}.',
      'ov.talks': 'Z czym się łączy', 'ov.talks.sub': 'Wokół niej: {partners}, ułożeni według kierunku danych.', 'ov.talks.more': 'Wszyscy partnerzy i co wymieniają',
      'ov.does': 'Co robi', 'ov.does.sub': 'Główne procesy: {processes}, każdy od początku do końca.', 'ov.does.more': 'Wszystkie procesy',
      'ov.attn': 'Co wymaga uwagi', 'ov.attn.sub': 'Ustalenia napisane na podstawie źródła: {findings}, oraz to, co źródło mierzy.', 'ov.attn.more': 'Wszystkie ryzyka',
      'ov.p1s': 'Ustalenia P1', 'ov.facts': 'Odczytane ze źródła',
      'ov.next': 'Dokąd dalej', 'ov.next.sub': 'Trzy wejścia, zależnie od tego, po co przyszedłeś.',
      'ov.n1': 'Zrozumieć aplikację', 'ov.n1.t': 'Z czego się składa, co ją otacza i jak przechodzi przez nią sprawa.',
      'ov.n2': 'Czytać logikę', 'ov.n2.t': 'Jednostki logiki krok po kroku i rekordy, które przesuwają.',
      'ov.n3': 'Zmieniać bezpiecznie', 'ov.n3.t': 'Co naprawić, co źródło mierzy źle i co łatwo zepsuć.',
      'ov.toc': 'Na tej stronie', 'ov.file': 'Ten plik', 'ov.file.t': 'Jeden plik HTML: otwiera się bez sieci i niczego nie pobiera. Każda strona ma własny adres; Kopiuj link wysyła dokładnie to, co widzisz.',
      'ov.about': 'O aplikacji',
      'glance.kind': 'Rodzaj', 'glance.read': 'Odczytano z',
      'tile.p1': 'najpierw', 'tile.p2': 'zaplanować', 'tile.p3': 'warto wiedzieć',
      'pr.sub': 'Co robi {app}: procesy biznesowe ({processes}). Napisał je agent na podstawie źródła; każdy wymienia przepływy, które go realizują.',
      'pr.app': 'Aplikacja', 'pr.app.meta': 'Pełny opis · {paragraphs}', 'pr.app.summary': 'Podsumowanie',
      'pr.eyebrow': 'Proces {n} z {m}', 'pr.app.eyebrow': '{app} · pełny opis',
      'pr.steps': 'Kroki', 'pr.diagram': 'Diagram', 'pr.how': 'Jak to działa', 'pr.flows': 'Przepływy, które go realizują',
      'pr.risks': 'Ryzyka po drodze', 'pr.norisk': 'Żadne ryzyko nie dotyczy tych przepływów.', 'pr.who': 'Kto z niej korzysta',
      'pr.list': 'Procesy', 'pr.prov': 'Napisane przez agenta na podstawie źródła. Listy kroków i nazwy przepływów pochodzą ze źródła; sprawdź sformułowania, zanim je zacytujesz.',
      'pr.notdrawn': 'Prosta sekwencja: kroki powyżej mówią wszystko, więc nie ma rysunku.',
      'pr.app.by': 'Aplikacja', 'pr.legend.person': 'działa osoba', 'pr.legend.app': 'działa aplikacja',
      'fg.start': 'Start', 'fg.rejoins': 'wraca na główną ścieżkę', 'fg.continues': 'dalej od kroku {n}', 'fg.back': 'wraca do kroku {n}',
      'fg.otherwise': 'w pozostałych', 'fg.returns': 'zwraca {x}', 'fg.decision': 'Decyzja',
      'k.read': 'Odczyt danych', 'k.change': 'Utworzenie lub zmiana', 'k.save': 'Zapis', 'k.delete': 'Usunięcie', 'k.call': 'Wywołanie',
      'k.show': 'Ekran', 'k.message': 'Komunikat', 'k.var': 'Wartość',
      'pt.sub': 'Własne: {own} · zewnętrzne: {third}. Każdy zawiera część aplikacji: jej przepływy, ekrany i rekordy.',
      'pt.sub.own': 'Własne: {own}. Każdy zawiera część aplikacji: jej przepływy, ekrany i rekordy.',
      'pt.own': 'Własne', 'pt.third': 'Zewnętrzne', 'pt.all': 'Wszystkie', 'pt.sort': 'Sortuj', 'pt.az': 'A–Z', 'pt.size': 'Rozmiar', 'pt.byrisk': 'Ryzyka',
      'pt.eyebrow.own': 'Moduł własny', 'pt.eyebrow.third': 'Moduł zewnętrzny',
      'pt.about': 'Opis', 'pt.contents': 'Zawartość', 'pt.conn': 'Powiązania', 'pt.risks': 'Ryzyka',
      'pt.what': 'Co robi', 'pt.nodesc': 'Nie napisano opisu tej części.',
      'pt.uses': 'Używa', 'pt.usedby': 'Używany przez', 'pt.both': 'w obie strony', 'pt.runs': 'Działa samodzielnie',
      'pt.runs.none': 'Nic. Wszystko tutaj startuje z ekranu albo z innej części.',
      'pt.uses.none': 'Nic: nie opiera się na żadnej innej części.', 'pt.usedby.none': 'Żadna inna część go nie używa.',
      'pt.norisk': 'Żadne ustalenie nie wskazuje tej części.', 'pt.empty': 'W tej części nie ma nic tego rodzaju.',
      'pt.on': 'włączone', 'pt.off': 'wyłączone', 'pt.fix': 'Naprawa',
      'ar.sub': 'Co otacza {app}, z czego się składa w działaniu, jak zależą od siebie części i kto do czego ma dostęp.',
      'ar.context.s': 'Kontekst', 'ar.runtime.s': 'Działanie', 'ar.deps.s': 'Zależności', 'ar.roles.s': 'Role', 'ar.open.s': 'Pytania',
      'ar.ctx': 'Kontekst', 'ar.ctx.t': 'Kto korzysta z {app} i z jakimi systemami wymienia dane: partnerzy ({partners}) w grupach ({groups}). Tabela pod rysunkiem mówi, co każdy wymienia.',
      'ar.rt': 'Środowisko uruchomieniowe', 'ar.rt.t': 'Z czego składa się {app} w działaniu: wywołujący po lewej, jej własne części w ramce, magazyny danych i wywoływane systemy po prawej.',
      'ar.dep': 'Zależności między częściami', 'ar.dep.t': 'Czytaj wierszami: część z wiersza używa części z kolumny, liczba mówi, jak często. Para zależna w obie strony jest wyróżniona; najrzadziej używane części są na górze.',
      'ar.roles': 'Role i dostęp', 'ar.roles.t': 'Która rola sięga do której części, tak jak nadaje to źródło.',
      'ar.open': 'Czego źródło nie pokazuje', 'ar.open.t': 'Do potwierdzenia, zanim zaufasz temu obrazowi: {things}. Napisane przez agenta.',
      'ar.partner': 'Partner', 'ar.group': 'Grupa', 'ar.dir': 'Kierunek', 'ar.over': 'Co przechodzi',
      'ar.jobs': 'Zadania harmonogramu', 'ar.eps': 'Punkty wejścia', 'ar.jobs.hint': 'Tak jak ustawia źródło. Które działają na produkcji, ustawia się per środowisko.',
      'ar.legend.uses': 'używa', 'ar.legend.both': 'w obie strony', 'ar.pick': 'Wybierz część w macierzy, aby zobaczyć, czego używa i co jej używa.',
      'ar.role': 'Rola', 'ar.app': 'Aplikacja', 'ar.runtime': '{app} w działaniu',
      'ctx.people': 'Ludzie', 'ctx.both': 'W obie strony', 'ctx.in': 'Wysyłają do niej dane', 'ctx.out': 'Wywołuje je', 'ctx.other': 'Inne',
      'ctx.useit': 'korzystają', 'ctx.send': 'wysyłają', 'ctx.calls': 'wywołuje',
      'dm.sub': 'Rekordy: {records} · części: {parts}. Odczytane ze źródła.', 'dm.fields': 'Pola', 'dm.name': 'Nazwa', 'dm.type': 'Typ', 'dm.rel': 'Relacje', 'dm.access': 'Kto ma dostęp',
      'dm.read': 'odczyt', 'dm.write': 'zapis', 'dm.noaccess': 'Brak reguły dostępu.', 'dm.nofields': 'Brak własnych pól.',
      'fl.sub': 'Elementy: {flows} · części: {parts}. Opisy oznaczone ✦ AI napisał agent; reszta jest odczytana ze źródła.',
      'fl.params': 'Przyjmuje', 'fl.returns': 'Zwraca', 'fl.from': 'Uruchamiany z', 'fl.roles': 'Kto może go uruchomić', 'fl.calls': 'Wywołuje',
      'fl.calledby': 'Wywoływany przez', 'fl.risks': 'Ustalenia, które go wskazują', 'fl.drawing': 'Kroki', 'fl.nodraw': 'W danych nie ma rysunku tego przepływu.',
      'fl.nothing': 'Nic.', 'fl.filter': 'Filtruj, np. słowo, prefiks, część', 'fl.nomatch': 'Żadna nazwa nie pasuje do filtra.',
      'sc.sub': 'Ekrany: {screens} · części: {parts}. Kto może otworzyć każdy z nich, skąd i co uruchamia.',
      'sc.roles': 'Kto może go otworzyć', 'sc.from': 'Otwierany z', 'sc.starts': 'Co uruchamiają jego przyciski', 'sc.shows': 'Rekordy, które pokazuje',
      'rk.sub': 'Ustalenia: {findings} · części: {parts}. Napisał je agent na podstawie źródła, więc sprawdź każde, zanim zaczniesz działać.',
      'rk.where.gather': 'Gdzie się skupiają', 'rk.sev': 'Waga', 'rk.pat': 'Wzorce', 'rk.count': '{findings}', 'rk.count.f': '{n} z {findings}',
      'rk.group': 'Grupuj', 'rk.bylevel': 'Waga', 'rk.bypart': 'Część', 'rk.nomatch': 'Żadne ustalenie nie pasuje do filtrów.',
      'rk.happens': 'Co się dzieje', 'rk.todo': 'Co zrobić', 'rk.where': 'Gdzie', 'rk.same': 'Ten sam wzorzec gdzie indziej', 'rk.also': 'Także w {part}',
      'rk.all.pat': 'Wszystkie z tym wzorcem ({n})', 'rk.all.part': 'Wszystkie w {part} ({n})', 'rk.pos': '{level} · {i} z {n}',
      'rk.prev': 'Poprzednie ustalenie', 'rk.next': 'Następne ustalenie', 'rk.prov': 'To ustalenie napisał agent na podstawie źródła. Widzi tylko źródło, nie dane ani konfigurację na produkcji.',
      'rk.dominant': '{n} z {m} ustaleń P1 to jeden wzorzec: {theme}.', 'rk.places': 'miejsca', 'rk.open': 'Otwórz',
      'lv.P1': 'Bezpieczeństwo i dane', 'lv.P2': 'Błędy działania', 'lv.P3': 'Utrzymanie',
      'when.P1': 'Naprawić przed następnym wydaniem', 'when.P2': 'Naprawić w jednym z najbliższych wydań', 'when.P3': 'Naprawić przy najbliższej pracy nad tym miejscem',
      'q.sub': 'Sprawdzenia ({checks}) policzone wprost ze źródła i zmierzone wobec podanej reguły. Nic na tej stronie nie napisał agent.',
      'q.of': 'z {n}', 'q.rule': 'Reguła', 'q.norule': 'Brak opublikowanej reguły: liczba jest informacją, nie werdyktem.', 'q.found': 'Znalezione',
      'q.more': '+ {n} więcej', 'q.none': 'Brak. Nic nie łamie tej reguły.',
      'dv.sub': 'Gdzie co jest, jak budowane są nazwy i co łatwo zepsuć — dla tego, kto następny zmieni {app}. Napisane przez agenta.',
      'dv.where': 'Gdzie co jest', 'dv.naming': 'Nazewnictwo', 'dv.pitfalls': 'Zanim zmienisz', 'dv.pattern': 'Wzorzec', 'dv.means': 'Co tu oznacza',
      'dv.count': 'Nazwy', 'dv.filter': 'Filtruj notatki', 'dv.nomatch': 'Żadna notatka nie pasuje do filtra.',
      'empty.page': 'Ta strona nie ma nic do pokazania.'
    },
    de: {
      'g.app': 'Anwendung', 'g.structure': 'Aufbau', 'g.review': 'Prüfung',
      'p.overview': 'Übersicht', 'p.processes': 'Prozesse', 'p.parts': 'Module', 'p.architecture': 'Architektur',
      'p.data': 'Datenmodell', 'p.flows': 'Abläufe', 'p.screens': 'Masken', 'p.risks': 'Risiken', 'p.quality': 'Qualität',
      'p.developers': 'Für Entwickler',
      'search': 'Suchen', 'search.ph': 'Namen und Text suchen…', 'search.names': 'Namen', 'search.text': 'Im Text',
      'search.none': 'Nichts passt zu „{q}“.', 'search.hint': 'Einen Namen oder ein Wort eingeben. Groß- und Kleinschreibung und Akzente spielen keine Rolle.',
      'copy': 'Link kopieren', 'copied': 'Link kopiert', 'md': 'Als Markdown herunterladen',
      'theme': 'Darstellung', 'light': 'Hell', 'dark': 'Dunkel', 'auto': 'System', 'auto.t': 'Dem System folgen',
      'close': 'Schließen', 'show.all': 'Alle anzeigen', 'filter': 'Filtern', 'none': 'Keine.', 'open': 'Öffnen',
      'read.more': 'Vollständige Beschreibung lesen', 'read.less': 'Vollständige Beschreibung ausblenden',
      'ai.mark': '✦ KI', 'ai.title': 'Von einem KI-Agenten aus der Quelle geschrieben, nicht aus ihr gelesen',
      'ov.eyebrow': '{kind} · Dokumentation', 'ov.glance': 'Auf einen Blick', 'ov.prov': 'Zahlen und Struktur sind aus der Quelle gelesen. Die Texte hat {by} daraus geschrieben; sie können falsch sein, wo die Quelle mehrdeutig ist.',
      'ov.users': 'Wer sie nutzt', 'ov.users.sub': 'Es arbeiten darin: {groups}.',
      'ov.talks': 'Womit sie verbunden ist', 'ov.talks.sub': 'Um sie herum: {partners}, angeordnet nach der Richtung der Daten.', 'ov.talks.more': 'Alle Partner und was sie austauschen',
      'ov.does': 'Was sie tut', 'ov.does.sub': 'Hauptprozesse: {processes}, jeder von Anfang bis Ende verfolgt.', 'ov.does.more': 'Alle Prozesse',
      'ov.attn': 'Was Aufmerksamkeit braucht', 'ov.attn.sub': 'Befunde aus der Quelle: {findings}, und was die Quelle misst.', 'ov.attn.more': 'Alle Risiken',
      'ov.p1s': 'P1-Befunde', 'ov.facts': 'Aus der Quelle gelesen',
      'ov.next': 'Wie es weitergeht', 'ov.next.sub': 'Drei Einstiege, je nachdem, wozu Sie gekommen sind.',
      'ov.n1': 'Die Anwendung verstehen', 'ov.n1.t': 'Woraus sie besteht, was sie umgibt und wie ein Vorgang durch sie läuft.',
      'ov.n2': 'Die Logik lesen', 'ov.n2.t': 'Die Logikeinheiten Schritt für Schritt und die Datensätze, die sie bewegen.',
      'ov.n3': 'Sicher ändern', 'ov.n3.t': 'Was behoben werden sollte, was die Quelle schlecht misst und was leicht bricht.',
      'ov.toc': 'Auf dieser Seite', 'ov.file': 'Diese Datei', 'ov.file.t': 'Eine HTML-Datei: Sie öffnet sich offline und lädt nichts nach. Jede Seite hat ihre eigene Adresse; Link kopieren sendet genau, was Sie sehen.',
      'ov.about': 'Über die Anwendung',
      'glance.kind': 'Art', 'glance.read': 'Gelesen aus',
      'tile.p1': 'zuerst', 'tile.p2': 'einplanen', 'tile.p3': 'gut zu wissen',
      'pr.sub': 'Was {app} tut, erzählt als Geschäftsprozesse ({processes}). Ein Agent hat sie aus der Quelle geschrieben; jeder nennt die Abläufe, die ihn tragen.',
      'pr.app': 'Die Anwendung', 'pr.app.meta': 'Vollständige Beschreibung · {paragraphs}', 'pr.app.summary': 'Zusammenfassung',
      'pr.eyebrow': 'Prozess {n} von {m}', 'pr.app.eyebrow': '{app} · vollständige Beschreibung',
      'pr.steps': 'Schritte', 'pr.diagram': 'Diagramm', 'pr.how': 'So funktioniert es', 'pr.flows': 'Abläufe, die ihn tragen',
      'pr.risks': 'Risiken auf dem Weg', 'pr.norisk': 'Kein Risiko betrifft diese Abläufe.', 'pr.who': 'Wer sie nutzt',
      'pr.list': 'Die Prozesse', 'pr.prov': 'Von einem Agenten aus der Quelle geschrieben. Schrittlisten und Ablaufnamen stammen aus der Quelle; prüfen Sie den Wortlaut, bevor Sie ihn zitieren.',
      'pr.notdrawn': 'Eine gerade Folge: Die Schritte oben sagen alles, darum gibt es keine Zeichnung.',
      'pr.app.by': 'Anwendung', 'pr.legend.person': 'eine Person handelt', 'pr.legend.app': 'die Anwendung handelt',
      'fg.start': 'Start', 'fg.rejoins': 'zurück auf den Hauptweg', 'fg.continues': 'weiter bei Schritt {n}', 'fg.back': 'zurück zu Schritt {n}',
      'fg.otherwise': 'sonst', 'fg.returns': 'gibt {x} zurück', 'fg.decision': 'Entscheidung',
      'k.read': 'Daten lesen', 'k.change': 'Anlegen oder ändern', 'k.save': 'Speichern', 'k.delete': 'Löschen', 'k.call': 'Aufruf',
      'k.show': 'Maske', 'k.message': 'Meldung', 'k.var': 'Wert',
      'pt.sub': 'Eigene: {own} · fremde: {third}. Jedes enthält einen Teil der Anwendung: Abläufe, Masken und Datensätze.',
      'pt.sub.own': 'Eigene: {own}. Jedes enthält einen Teil der Anwendung: Abläufe, Masken und Datensätze.',
      'pt.own': 'Eigene', 'pt.third': 'Fremde', 'pt.all': 'Alle', 'pt.sort': 'Sortieren', 'pt.az': 'A–Z', 'pt.size': 'Größe', 'pt.byrisk': 'Risiken',
      'pt.eyebrow.own': 'Eigenes Modul', 'pt.eyebrow.third': 'Fremdes Modul',
      'pt.about': 'Über', 'pt.contents': 'Inhalt', 'pt.conn': 'Verbindungen', 'pt.risks': 'Risiken',
      'pt.what': 'Was es tut', 'pt.nodesc': 'Für diesen Teil wurde keine Beschreibung geschrieben.',
      'pt.uses': 'Nutzt', 'pt.usedby': 'Genutzt von', 'pt.both': 'beidseitig', 'pt.runs': 'Läuft von selbst',
      'pt.runs.none': 'Nichts. Alles hier startet aus einer Maske oder einem anderen Teil.',
      'pt.uses.none': 'Nichts: Es stützt sich auf keinen anderen Teil.', 'pt.usedby.none': 'Kein anderer Teil nutzt es.',
      'pt.norisk': 'Kein Befund nennt diesen Teil.', 'pt.empty': 'In diesem Teil gibt es nichts dieser Art.',
      'pt.on': 'an', 'pt.off': 'abgeschaltet', 'pt.fix': 'Behebung',
      'ar.sub': 'Was {app} umgibt, woraus sie zur Laufzeit besteht, wie ihre Teile voneinander abhängen und wer was erreicht.',
      'ar.context.s': 'Kontext', 'ar.runtime.s': 'Laufzeit', 'ar.deps.s': 'Abhängigkeiten', 'ar.roles.s': 'Rollen', 'ar.open.s': 'Offene Fragen',
      'ar.ctx': 'Kontext', 'ar.ctx.t': 'Wer {app} nutzt und mit welchen Systemen sie Daten austauscht: Partner ({partners}) in Gruppen ({groups}). Die Tabelle unter dem Bild sagt, was jeder austauscht.',
      'ar.rt': 'Laufzeit', 'ar.rt.t': 'Woraus {app} zur Laufzeit besteht: Aufrufer links, ihre eigenen Teile im Rahmen, Speicher und aufgerufene Systeme rechts.',
      'ar.dep': 'Abhängigkeiten zwischen Teilen', 'ar.dep.t': 'Zeilenweise lesen: Der Teil der Zeile nutzt den Teil der Spalte, die Zahl sagt, wie oft. Ein beidseitig abhängiges Paar ist markiert; die am wenigsten genutzten Teile stehen oben.',
      'ar.roles': 'Rollen und Zugriff', 'ar.roles.t': 'Welche Rolle welchen Teil erreicht, wie die Quelle es vergibt.',
      'ar.open': 'Was die Quelle nicht zeigt', 'ar.open.t': 'Zu bestätigen, bevor man sich auf dieses Bild verlässt: {things}. Von einem Agenten geschrieben.',
      'ar.partner': 'Partner', 'ar.group': 'Gruppe', 'ar.dir': 'Richtung', 'ar.over': 'Was übertragen wird',
      'ar.jobs': 'Geplante Jobs', 'ar.eps': 'Einstiegspunkte', 'ar.jobs.hint': 'Wie in der Quelle gesetzt. Was in Produktion läuft, wird pro Umgebung eingestellt.',
      'ar.legend.uses': 'nutzt', 'ar.legend.both': 'beidseitig', 'ar.pick': 'Einen Teil in der Matrix wählen, um zu sehen, was er nutzt und wer ihn nutzt.',
      'ar.role': 'Rolle', 'ar.app': 'Anwendung', 'ar.runtime': '{app} zur Laufzeit',
      'ctx.people': 'Menschen', 'ctx.both': 'Beidseitig', 'ctx.in': 'Senden ihr Daten', 'ctx.out': 'Ruft sie auf', 'ctx.other': 'Andere',
      'ctx.useit': 'nutzen', 'ctx.send': 'senden', 'ctx.calls': 'ruft auf',
      'dm.sub': 'Datensätze: {records} · Teile: {parts}. Aus der Quelle gelesen.', 'dm.fields': 'Felder', 'dm.name': 'Name', 'dm.type': 'Typ', 'dm.rel': 'Beziehungen', 'dm.access': 'Wer darauf zugreift',
      'dm.read': 'lesen', 'dm.write': 'schreiben', 'dm.noaccess': 'Keine Zugriffsregel angegeben.', 'dm.nofields': 'Keine eigenen Felder.',
      'fl.sub': 'Einträge: {flows} · Teile: {parts}. Mit ✦ KI markierte Beschreibungen hat ein Agent geschrieben; alles andere ist aus der Quelle gelesen.',
      'fl.params': 'Nimmt', 'fl.returns': 'Gibt zurück', 'fl.from': 'Gestartet aus', 'fl.roles': 'Wer ihn starten darf', 'fl.calls': 'Ruft auf',
      'fl.calledby': 'Aufgerufen von', 'fl.risks': 'Befunde, die ihn nennen', 'fl.drawing': 'Schritte', 'fl.nodraw': 'Für diesen Ablauf liegt keine Zeichnung vor.',
      'fl.nothing': 'Nichts.', 'fl.filter': 'Filtern, z. B. ein Wort, ein Präfix, ein Teil', 'fl.nomatch': 'Kein Name passt zu diesem Filter.',
      'sc.sub': 'Masken: {screens} · Teile: {parts}. Wer jede öffnen darf, von wo, und was sie startet.',
      'sc.roles': 'Wer sie öffnen darf', 'sc.from': 'Geöffnet aus', 'sc.starts': 'Was ihre Schaltflächen starten', 'sc.shows': 'Datensätze, die sie zeigt',
      'rk.sub': 'Befunde: {findings} · Teile: {parts}. Ein Agent hat sie aus der Quelle geschrieben; prüfen Sie jeden, bevor Sie handeln.',
      'rk.where.gather': 'Wo sie sich häufen', 'rk.sev': 'Schwere', 'rk.pat': 'Muster', 'rk.count': '{findings}', 'rk.count.f': '{n} von {findings}',
      'rk.group': 'Gruppieren', 'rk.bylevel': 'Schwere', 'rk.bypart': 'Teil', 'rk.nomatch': 'Kein Befund passt zu diesen Filtern.',
      'rk.happens': 'Was passiert', 'rk.todo': 'Was zu tun ist', 'rk.where': 'Wo', 'rk.same': 'Dasselbe Muster anderswo', 'rk.also': 'Auch in {part}',
      'rk.all.pat': 'Alle mit diesem Muster ({n})', 'rk.all.part': 'Alle in {part} ({n})', 'rk.pos': '{level} · {i} von {n}',
      'rk.prev': 'Vorheriger Befund', 'rk.next': 'Nächster Befund', 'rk.prov': 'Ein Agent hat diesen Befund aus der Quelle geschrieben. Er sieht nur die Quelle, nicht die Daten oder die Konfiguration in Produktion.',
      'rk.dominant': '{n} der {m} P1-Befunde folgen einem Muster: {theme}.', 'rk.places': 'Stellen', 'rk.open': 'Öffnen',
      'lv.P1': 'Sicherheit und Daten', 'lv.P2': 'Funktionale Fehler', 'lv.P3': 'Wartung',
      'when.P1': 'Vor dem nächsten Release beheben', 'when.P2': 'In einem der nächsten Releases beheben', 'when.P3': 'Bei der nächsten Arbeit daran beheben',
      'q.sub': 'Prüfungen ({checks}), direkt aus der Quelle gezählt und an einer genannten Regel gemessen. Nichts auf dieser Seite hat ein Agent geschrieben.',
      'q.of': 'von {n}', 'q.rule': 'Die Regel', 'q.norule': 'Keine veröffentlichte Regel: Die Zahl ist eine Information, kein Urteil.', 'q.found': 'Gefunden',
      'q.more': '+ {n} weitere', 'q.none': 'Keine. Nichts verletzt diese Regel.',
      'dv.sub': 'Wo was ist, wie Namen gebildet werden und was leicht bricht — für alle, die {app} als Nächste ändern. Von einem Agenten geschrieben.',
      'dv.where': 'Wo was ist', 'dv.naming': 'Benennung', 'dv.pitfalls': 'Bevor Sie ändern', 'dv.pattern': 'Muster', 'dv.means': 'Was es hier bedeutet',
      'dv.count': 'Namen', 'dv.filter': 'Notizen filtern', 'dv.nomatch': 'Keine Notiz passt zu diesem Filter.',
      'empty.page': 'Diese Seite hat nichts zu zeigen.'
    }
  };
  // Counted nouns, one string per plural category of the language (Intl.PluralRules).
  var NOUNS = {
    en: {
      step: ['step', 'steps'], process: ['process', 'processes'], finding: ['finding', 'findings'], risk: ['risk', 'risks'],
      place: ['place', 'places'], part: ['module', 'modules'], record: ['record', 'records'], screen: ['screen', 'screens'],
      flow: ['flow', 'flows'], paragraph: ['paragraph', 'paragraphs'], partner: ['partner', 'partners'], group: ['group', 'groups'],
      check: ['check', 'checks'], thing: ['thing', 'things'], field: ['field', 'fields'], call: ['call', 'calls'], item: ['item', 'items']
    },
    pl: {
      step: ['krok', 'kroki', 'kroków'], process: ['proces', 'procesy', 'procesów'], finding: ['ustalenie', 'ustalenia', 'ustaleń'],
      risk: ['ryzyko', 'ryzyka', 'ryzyk'], place: ['miejsce', 'miejsca', 'miejsc'], part: ['moduł', 'moduły', 'modułów'],
      record: ['rekord', 'rekordy', 'rekordów'], screen: ['ekran', 'ekrany', 'ekranów'], flow: ['przepływ', 'przepływy', 'przepływów'],
      paragraph: ['akapit', 'akapity', 'akapitów'], partner: ['partner', 'partnerzy', 'partnerów'], group: ['grupa', 'grupy', 'grup'],
      check: ['sprawdzenie', 'sprawdzenia', 'sprawdzeń'], thing: ['rzecz', 'rzeczy', 'rzeczy'], field: ['pole', 'pola', 'pól'],
      call: ['wywołanie', 'wywołania', 'wywołań'], item: ['element', 'elementy', 'elementów']
    },
    de: {
      step: ['Schritt', 'Schritte'], process: ['Prozess', 'Prozesse'], finding: ['Befund', 'Befunde'], risk: ['Risiko', 'Risiken'],
      place: ['Stelle', 'Stellen'], part: ['Modul', 'Module'], record: ['Datensatz', 'Datensätze'], screen: ['Maske', 'Masken'],
      flow: ['Ablauf', 'Abläufe'], paragraph: ['Absatz', 'Absätze'], partner: ['Partner', 'Partner'], group: ['Gruppe', 'Gruppen'],
      check: ['Prüfung', 'Prüfungen'], thing: ['Punkt', 'Punkte'], field: ['Feld', 'Felder'], call: ['Aufruf', 'Aufrufe'], item: ['Element', 'Elemente']
    }
  };
  var LOCALE = { en: 'en-GB', pl: 'pl-PL', de: 'de-DE' };
  var LEVELS = ['P1', 'P2', 'P3'];

  // ================================================================ DOM helpers
  var SVGNS = 'http://www.w3.org/2000/svg';
  // el('a', { class, text, href, onclick, 'aria-x': … }, [children]) — text is
  // always set as text; children are nodes, strings (as text) or arrays.
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = String(v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    });
    add(n, kids);
    return n;
  }
  function add(n, kids) {
    if (kids === null || kids === undefined || kids === false) return n;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) add(n, c);
      else n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, String(attrs[k])); });
    return n;
  }
  function icon(name, size, cls) {
    var s = svg('svg', { class: 'r-icon' + (cls ? ' ' + cls : ''), width: size || 16, height: size || 16, 'aria-hidden': 'true', focusable: 'false' });
    var u = svg('use', { href: '#i-' + name });
    s.appendChild(u);
    return s;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function paragraphs(text) {
    return String(text || '').split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
  }
  function firstSentence(text) {
    var s = String(text || '').trim(), m = /^(.+?[.!?])(\s+)(?=[A-ZÀ-ÖØ-ÞĄĆĘŁŃÓŚŹŻ0-9„"“])/.exec(s);
    return m ? [m[1], s.slice(m[0].length)] : [s, ''];
  }
  function fold(s) {
    return String(s || '').toLowerCase().replace(/ł/g, 'l').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ================================================================ the report
  function mount(data, root) {
    data = data || {};
    var lang = LABELS[data.lang] ? data.lang : 'en';
    var L = LABELS[lang], LE = LABELS.en;
    var plural = (window.Intl && Intl.PluralRules) ? new Intl.PluralRules(LOCALE[lang]) : { select: function (n) { return n === 1 ? 'one' : 'other'; } };
    var numFmt = (window.Intl && Intl.NumberFormat) ? new Intl.NumberFormat(LOCALE[lang]) : { format: String };
    document.documentElement.setAttribute('lang', lang);

    function t(key, vars) {
      var s = L[key] !== undefined ? L[key] : (LE[key] !== undefined ? LE[key] : key);
      if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
      return s;
    }
    // A count with its noun in the right plural form: N(3, 'step') → "3 steps".
    function formOf(forms, n) {
      if (!forms) return '';
      if (Array.isArray(forms)) {
        var cat = plural.select(n);
        if (forms.length === 2) return cat === 'one' ? forms[0] : forms[1];
        return cat === 'one' ? forms[0] : cat === 'few' ? forms[1] : forms[2];
      }
      var c = plural.select(n);
      return forms[c] || forms.other || forms.many || forms.one || '';
    }
    function N(n, noun) {
      var forms = typeof noun === 'string' ? (noun === 'part' && terms.parts ? terms.parts : noun === 'record' && terms.records ? terms.records : noun === 'screen' && terms.screens ? terms.screens : NOUNS[lang][noun]) : noun;
      return numFmt.format(n) + ' ' + formOf(forms, n);
    }
    function fmtDate(iso) {
      if (!iso) return '';
      var d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
      if (isNaN(d)) return String(iso);
      try { return d.toLocaleDateString(LOCALE[lang], { day: 'numeric', month: lang === 'en' ? 'short' : 'long', year: 'numeric' }); } catch (e) { return String(iso).slice(0, 10); }
    }

    // ---------------------------------------------------------------- the data, normalised
    var app = data.app || {};
    var appName = app.name || 'Application';
    var terms = data.terms || {};
    var by = (data.provenance && data.provenance.by) || 'an agent';
    var processes = (data.processes || []).map(function (p) {
      return { name: p.name, summary: p.summary, story: p.story, flows: p.flows || [], diagram: p.diagram || null,
        steps: (p.steps || []).map(function (s) { return typeof s === 'string' ? { text: s } : s; }) };
    });
    var parts = (data.parts || []).map(function (p) { return Object.assign({ dependsOn: [], runs: [], notes: [] }, p); });
    var partBy = {}; parts.forEach(function (p) { partBy[p.name] = p; });
    var flowKinds = (data.flowKinds && data.flowKinds.length) ? data.flowKinds : [{ key: 'flow', tag: 'FL', label: t('p.flows'), forms: NOUNS[lang].flow }];
    var kindBy = {}; flowKinds.forEach(function (k) { kindBy[k.key] = k; });
    var flows = (data.flows || []).map(function (f) { return Object.assign({ kind: flowKinds[0].key }, f); });
    var flowBy = {}; flows.forEach(function (f) { flowBy[f.name] = f; });
    var screens = data.screens || [];
    var screenBy = {}; screens.forEach(function (s) { screenBy[s.name] = s; });
    var records = data.dataModel || [];
    var recordBy = {}; records.forEach(function (r) { recordBy[r.name] = r; });
    var themes = data.themes || {};
    var arch = data.architecture || {};
    var quality = data.quality || [];
    var dev = data.forDevelopers || {};
    var risks = (data.risks || []).filter(function (r) { return r && r.title && LEVELS.indexOf(r.level) !== -1; }).map(function (r, i) {
      var id = r.id || ('R-' + ('00' + (i + 1)).slice(-3));
      return Object.assign({}, r, { id: id, where: r.where || [], idx: i, part: r.part || partOf((r.where || [])[0]) });
    });
    var riskBy = {}; risks.forEach(function (r) { riskBy[r.id] = r; });
    function partOf(name) {
      if (!name) return null;
      var s = String(name), best = null;
      parts.forEach(function (p) { if ((s === p.name || s.indexOf(p.name + '.') === 0) && (!best || p.name.length > best.length)) best = p.name; });
      return best || (s.indexOf('.') > 0 ? s.slice(0, s.indexOf('.')) : null);
    }
    function sortRisks(list) { return list.slice().sort(function (a, b) { return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.idx - b.idx; }); }
    function risksNaming(names) {
      var set = {}; names.forEach(function (n) { set[n] = true; });
      return sortRisks(risks.filter(function (r) { return r.where.some(function (w) { return set[w]; }); }));
    }
    function levelCount(list, lv) { return list.filter(function (r) { return r.level === lv; }).length; }
    // What each part holds, counted from the lists (or given as counts by the data).
    function partItems(name) {
      return {
        flows: flows.filter(function (f) { return partOf(f.name) === name; }),
        screens: screens.filter(function (s) { return partOf(s.name) === name; }),
        records: records.filter(function (r) { return partOf(r.name) === name; })
      };
    }
    var usedBy = {};
    parts.forEach(function (p) { p.dependsOn.forEach(function (d) { var n = typeof d === 'string' ? d : d.name; (usedBy[n] = usedBy[n] || []).push({ name: p.name, count: d.count || 1 }); }); });
    function depsOf(p) { return p.dependsOn.map(function (d) { return typeof d === 'string' ? { name: d, count: 1 } : d; }); }

    // Names the report has a page for → where that page is.
    var known = {};
    parts.forEach(function (p) { known[p.name] = { page: 'modules', id: p.name, tag: 'MOD' }; });
    records.forEach(function (r) { known[r.name] = { page: 'data', id: r.name, tag: 'REC' }; });
    screens.forEach(function (s) { known[s.name] = { page: 'screens', id: s.name, tag: 'SCR' }; });
    flows.forEach(function (f) { known[f.name] = { page: 'flows', id: f.name, tag: (kindBy[f.kind] || {}).tag || 'FL' }; });
    risks.forEach(function (r) { known[r.id] = { page: 'risks', id: r.id, tag: r.level }; });

    // ---------------------------------------------------------------- pages that exist
    var PAGES = {
      overview: { icon: 'overview', group: 'app', label: t('p.overview') },
      processes: { icon: 'processes', group: 'app', label: t('p.processes'), count: processes.length, has: processes.length > 0 || !!app.story },
      modules: { icon: 'parts', group: 'app', label: (terms.parts && terms.parts.label) || t('p.parts'), count: parts.length, has: parts.length > 0 },
      architecture: { icon: 'architecture', group: 'app', label: t('p.architecture'), has: !!(arch.context || arch.containers || (arch.open || []).length || (arch.access || []).length || parts.some(function (p) { return p.dependsOn.length; })) },
      data: { icon: 'data', group: 'structure', label: (terms.records && terms.records.label) || t('p.data'), count: records.length, has: records.length > 0 },
      screens: { icon: 'screens', group: 'structure', label: (terms.screens && terms.screens.label) || t('p.screens'), count: screens.length, has: screens.length > 0 },
      risks: { icon: 'risks', group: 'review', label: t('p.risks'), count: risks.length, has: risks.length > 0 },
      quality: { icon: 'quality', group: 'review', label: t('p.quality'), count: quality.length, has: quality.length > 0 },
      developers: { icon: 'developers', group: 'review', label: t('p.developers'), count: (dev.where || []).length + (dev.conventions || []).length + (dev.pitfalls || []).length, has: !!((dev.where || []).length || (dev.conventions || []).length || (dev.pitfalls || []).length) }
    };
    PAGES.overview.has = true;
    PAGES.developers.has = PAGES.developers.count > 0;
    var MENU = [
      ['app', t('g.app'), ['overview', 'processes', 'modules', 'architecture']],
      ['structure', t('g.structure'), ['data'].concat(flowKinds.map(function (k) { return 'flows:' + k.key; })).concat(['screens'])],
      ['review', t('g.review'), ['risks', 'quality', 'developers']]
    ];
    function flowsOfKind(k) { return flows.filter(function (f) { return f.kind === k; }); }
    function entry(key) {
      if (key.indexOf('flows:') === 0) {
        var k = kindBy[key.slice(6)], n = flowsOfKind(k.key).length;
        return { key: key, icon: k.key === 'job' ? 'jobs' : 'flows', label: k.label, count: n, has: n > 0, route: { page: 'flows', q: { kind: k.key } } };
      }
      var p = PAGES[key];
      return { key: key, icon: p.icon, label: p.label, count: p.count, has: p.has, route: { page: key } };
    }
    function flowNoun(kind) { var k = kindBy[kind]; return k ? (k.forms || [k.one, k.other]) : NOUNS[lang].flow; }
    function flowForms(k) { return k.forms || (k.few ? { one: k.one, few: k.few, many: k.many, other: k.other || k.many } : [k.one || k.label, k.other || k.label]); }

    // ---------------------------------------------------------------- addresses
    function parseHash() {
      var h = String(location.hash || '').replace(/^#\/?/, '');
      var qi = h.indexOf('?'), path = qi < 0 ? h : h.slice(0, qi), qs = qi < 0 ? '' : h.slice(qi + 1);
      var seg = path.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
      var q = {};
      qs.split('&').forEach(function (kv) {
        if (!kv) return;
        var i = kv.indexOf('=');
        try { q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1)); } catch (e) { /* a broken pair is ignored */ }
      });
      return { page: seg[0] || 'overview', id: seg.length > 1 ? seg.slice(1).join('/') : null, q: q };
    }
    function href(r) {
      var s = '#/' + (r.page || 'overview') + (r.id !== null && r.id !== undefined && r.id !== '' ? '/' + encodeURIComponent(String(r.id)) : '');
      var q = r.q || {}, ks = Object.keys(q).filter(function (k) { return q[k] !== null && q[k] !== undefined && q[k] !== ''; });
      return ks.length ? s + '?' + ks.map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); }).join('&') : s;
    }
    function go(r) { location.hash = href(r).slice(1); }
    function link(r, attrs, kids) { attrs = attrs || {}; attrs.href = href(r); return el('a', attrs, kids); }
    function nameLink(name, cls) {
      var k = known[name];
      var node = qn(name);
      return k ? link({ page: k.page, id: k.id }, { class: 'r-name-link' + (cls ? ' ' + cls : '') }, node) : el('span', { class: cls || null }, node);
    }

    // ---------------------------------------------------------------- small components
    // A qualified name: the part muted, the name in ink. Breaks anywhere, never hyphenated.
    function qn(name) {
      var s = String(name), p = partOf(s), rest = p && s.indexOf(p + '.') === 0 ? s.slice(p.length + 1) : null;
      return el('span', { class: 'r-qn' }, rest !== null ? [el('span', { class: 'r-qn-part', text: p + '.' }), rest] : [s]);
    }
    function kindTag(tag, cls) { return el('span', { class: 'r-tag' + (cls ? ' ' + cls : ''), text: tag }); }
    function lvBadge(lv, wide) { return el('span', { class: 'r-lv ' + lv.toLowerCase() + (wide ? ' wide' : ''), text: wide ? lv + ' · ' + t('lv.' + lv) : lv }); }
    function aiMark() { return el('span', { class: 'r-ai', title: t('ai.title'), text: t('ai.mark') }); }
    function caption(text, n, extra) { return el('h3', { class: 'r-cap' }, [text, n !== undefined && n !== null ? el('span', { class: 'r-cap-n', text: ' · ' + n }) : null, extra || null]); }
    function empty(text, cls) { return el('p', { class: 'r-empty' + (cls ? ' ' + cls : ''), text: text }); }
    function prov(text) { return el('p', { class: 'r-prov' }, [icon('info', 14), el('span', { text: text })]); }
    // Text with `names` in it: code font, and a link when the report has the name.
    function inline(text) {
      var out = [], s = String(text || ''), parts2 = s.split('`');
      parts2.forEach(function (seg, i) {
        if (i % 2 === 0) { if (seg) out.push(seg); return; }
        var k = known[seg];
        if (k) out.push(link({ page: k.page, id: k.id }, { class: 'r-code link' }, seg));
        else out.push(el('code', { class: 'r-code', text: seg }));
      });
      return out;
    }
    function prose(text, cls) { return paragraphs(text).map(function (p) { return el('p', { class: cls || null }, inline(p)); }); }
    function foldBlock(text) {
      var ps = paragraphs(text);
      if (!ps.length) return null;
      var sum = el('summary', { class: 'r-fold-btn' }, [el('span', { class: 'r-fold-more', text: t('read.more') }), el('span', { class: 'r-fold-less', text: t('read.less') }), icon('chevron-down', 16)]);
      return el('details', { class: 'r-fold' }, [sum, el('div', { class: 'r-prose' }, prose(text))]);
    }
    function seg(options, current, onPick, label) {
      return el('div', { class: 'r-seg', role: 'group', 'aria-label': label || null }, options.map(function (o) {
        return el('button', { type: 'button', class: o[0] === current ? 'on' : null, 'aria-pressed': o[0] === current ? 'true' : 'false', onclick: function () { onPick(o[0]); } }, [o[2] ? icon(o[2], 14) : null, el('span', { text: o[1] })]);
      }));
    }
    function sectionHead(title, sub, more) {
      return el('div', { class: 'r-sec-h' }, [el('div', { class: 'r-sec-t' }, [el('h2', { text: title }), sub ? el('p', null, inline(sub)) : null]), more || null]);
    }
    function moreLink(r, text) { return link(r, { class: 'r-more' }, [el('span', { text: text }), icon('arrow', 14)]); }

    // ---------------------------------------------------------------- the shell
    clear(root);
    root.classList.add('r-app');
    var navLinks = {};
    var theme = initTheme();
    var brand = el('div', { class: 'r-brand' }, [
      el('span', { class: 'r-brand-tile', 'aria-hidden': 'true', text: (app.initial || appName.charAt(0) || '·').toUpperCase() }),
      el('span', { class: 'r-brand-text' }, [el('b', { text: appName }), app.source ? el('small', { text: app.source }) : null])
    ]);
    var nav = el('nav', { class: 'r-nav', 'aria-label': appName }, MENU.map(function (g) {
      var items = g[2].map(entry).filter(function (e) { return e.has; });
      if (!items.length) return null;
      return el('div', { class: 'r-nav-group' }, [el('span', { class: 'r-nav-cap', text: g[1] }), items.map(function (e) {
        var a = link(e.route, { class: 'r-nav-item' }, [icon(e.icon, 16), el('span', { class: 'r-nav-label', text: e.label }), e.count !== undefined ? el('span', { class: 'r-count', text: numFmt.format(e.count) }) : null]);
        navLinks[e.key] = a;
        return a;
      })]);
    }));
    var themeBtns = {};
    var themeBox = el('div', { class: 'r-theme', role: 'group', 'aria-label': t('theme') }, [['light', 'sun'], ['dark', 'moon'], ['auto', 'auto']].map(function (x) {
      themeBtns[x[0]] = el('button', { type: 'button', title: x[0] === 'auto' ? t('auto.t') : t(x[0]), onclick: function () { theme.set(x[0]); } }, [icon(x[1], 14), el('span', { text: t(x[0]) })]);
      return themeBtns[x[0]];
    }));
    var mdBtn = el('button', { type: 'button', class: 'r-md', onclick: downloadMd }, [icon('download', 14), el('span', { text: t('md') })]);
    var side = el('aside', { class: 'r-side' }, [brand, nav, el('div', { class: 'r-side-foot' }, [mdBtn, themeBox])]);
    var h1 = el('h1'), sub = el('p', { class: 'r-sub' });
    var tools = el('div', { class: 'r-tools' });
    var copyBtn = el('button', { type: 'button', class: 'r-btn', onclick: copyLink }, [icon('link', 14), el('span', { text: t('copy') })]);
    var searchBtn = el('button', { type: 'button', class: 'r-searchbox', 'aria-haspopup': 'dialog', 'aria-label': t('search'), onclick: function () { openSearch(); } },
      [icon('search', 15), el('span', { class: 'r-searchbox-t', text: t('search.ph') }), el('kbd', { text: /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ K' : 'Ctrl K' })]);
    var head = el('header', { class: 'r-head' }, [el('div', { class: 'r-title' }, [h1, sub]), tools, copyBtn, searchBtn]);
    var body = el('main', { class: 'r-body', id: 'r-main', tabindex: '-1' });
    var island = el('div', { class: 'r-island' }, [head, body]);
    add(root, [side, island]);

    var route = null, lastPage = null;
    function render() {
      var prev = route;
      route = parseHash();
      var page = route.page;
      if (page === 'flows' && !flows.length) page = 'overview';
      if (!PAGES[page] && page !== 'flows') page = 'overview';
      if (PAGES[page] && !PAGES[page].has) page = 'overview';
      route.page = page;
      var keep = scrollsOf(body);
      var samePage = prev && prev.page === page;
      clear(tools); clear(body);
      var navKey = page;
      if (page === 'flows') { var f0 = flowBy[route.id]; navKey = 'flows:' + (route.q.kind && kindBy[route.q.kind] ? route.q.kind : f0 ? f0.kind : flowKinds[0].key); }
      Object.keys(navLinks).forEach(function (k) {
        var on = k === navKey;
        navLinks[k].classList.toggle('on', on);
        if (on) navLinks[k].setAttribute('aria-current', 'page'); else navLinks[k].removeAttribute('aria-current');
      });
      root.setAttribute('data-page', page);
      ({ overview: pageOverview, processes: pageProcesses, modules: pageParts, architecture: pageArchitecture, data: pageData,
        flows: pageFlows, screens: pageScreens, risks: pageRisks, quality: pageQuality, developers: pageDevelopers })[page]();
      document.title = h1.textContent + ' · ' + appName;
      if (samePage) putScrolls(body, keep); else { body.scrollTop = 0; window.scrollTo(0, 0); }
      if (route.q.s) requestAnimationFrame(function () { var n = body.querySelector('[data-sec="' + route.q.s + '"]'); if (n) n.scrollIntoView({ block: 'start' }); });
      lastPage = page;
    }
    function setHead(title, subline) { h1.textContent = title; clear(sub); add(sub, inline(subline || '')); }
    function scrollsOf(box) {
      var o = { _: box.scrollTop };
      Array.prototype.forEach.call(box.querySelectorAll('[data-keep]'), function (n) { o[n.getAttribute('data-keep')] = n.scrollTop; });
      return o;
    }
    function putScrolls(box, o) {
      box.scrollTop = o._ || 0;
      Array.prototype.forEach.call(box.querySelectorAll('[data-keep]'), function (n) { var v = o[n.getAttribute('data-keep')]; if (v) n.scrollTop = v; });
    }
    // A list and the one item in full beside it; the list keeps its scroll.
    function split(listNode, detailNode, key) {
      return el('div', { class: 'r-split' }, [el('div', { class: 'r-list', 'data-keep': key + '-list' }, listNode), el('div', { class: 'r-detail', 'data-keep': key + '-detail' }, detailNode)]);
    }
    function doc(kids, cls) { return el('div', { class: 'r-doc' + (cls ? ' ' + cls : ''), 'data-keep': 'doc' }, kids); }

    // ================================================================ Overview
    function pageOverview() {
      setHead(t('p.overview'), '');
      var lead = firstSentence(app.summary);
      var foldMode = !(data.layout && data.layout.fullDescription === 'page');
      var secs = [];
      var p1 = sortRisks(risks.filter(function (r) { return r.level === 'P1'; }));
      // the hero: name, lead, the rest, the call to action; at a glance beside it
      var glance = [];
      if (app.kind) glance.push([t('glance.kind'), app.kind, null, 'txt']);
      if (processes.length) glance.push([t('p.processes'), numFmt.format(processes.length), { page: 'processes', id: '1' }]);
      if (parts.length) {
        var third = parts.filter(function (p) { return p.thirdParty; }).length;
        glance.push([PAGES.modules.label, numFmt.format(parts.length - third) + (third ? ' · ' + numFmt.format(third) + ' ' + t('pt.third').toLowerCase() : ''), { page: 'modules' }]);
      }
      flowKinds.forEach(function (k) { var n = flowsOfKind(k.key).length; if (n) glance.push([k.label, numFmt.format(n), { page: 'flows', q: { kind: k.key } }]); });
      if (screens.length) glance.push([PAGES.screens.label, numFmt.format(screens.length), { page: 'screens' }]);
      if (records.length) glance.push([PAGES.data.label, numFmt.format(records.length), { page: 'data' }]);
      if (risks.length) glance.push([t('p.risks'), numFmt.format(risks.length) + (p1.length ? ' · ' + p1.length + ' P1' : ''), { page: 'risks' }, p1.length ? 'p1' : null]);
      if (quality.length) glance.push([t('p.quality'), numFmt.format(quality.length), { page: 'quality' }]);
      if (app.readAt) glance.push([t('glance.read'), fmtDate(app.readAt), null, 'txt']);
      var hero = el('section', { class: 'r-ov-hero', 'data-sec': 'about', id: 'about' }, [
        el('div', { class: 'r-ov-intro' }, [
          el('span', { class: 'r-eyebrow', text: t('ov.eyebrow', { kind: app.kind || t('ar.app') }) }),
          el('h2', { class: 'r-ov-name', text: appName }),
          lead[0] ? el('p', { class: 'r-ov-lead' }, inline(lead[0])) : null,
          lead[1] ? el('p', { class: 'r-ov-rest' }, inline(lead[1])) : null,
          // The full description one step away: folded here (default), or on a page of its own
          // (data.layout.fullDescription = "page": the button opens Processes, item 0).
          foldMode && app.story ? foldBlock(app.story) : null,
          el('div', { class: 'r-ov-cta' }, [
            !foldMode && app.story ? link({ page: 'processes', id: '0' }, { class: 'r-cta' }, [el('span', { text: t('read.more') }), icon('arrow', 14)]) : null,
            el('span', { class: 'r-ov-prov', text: t('ov.prov', { by: by }) })
          ])
        ]),
        glance.length ? el('div', { class: 'r-glance' }, [el('div', { class: 'r-glance-h', text: t('ov.glance') }), el('dl', null, glance.map(function (g) {
          return [el('dt', { text: g[0] }), el('dd', { class: g[3] || null }, g[2] ? link(g[2], { class: 'r-glance-v' }, g[1]) : g[1])];
        }))]) : null
      ]);
      secs.push(['about', t('ov.about'), hero]);
      var aud = app.audience || [];
      if (aud.length) secs.push(['users', t('ov.users'), el('section', { class: 'r-ov-sec', 'data-sec': 'users', id: 'users' }, [
        sectionHead(t('ov.users'), t('ov.users.sub', { groups: N(aud.length, 'group') })),
        el('div', { class: 'r-users' }, aud.map(function (u) {
          return el('div', { class: 'r-user' }, [el('span', { class: 'r-user-i', 'aria-hidden': 'true' }, icon(u.icon || 'person', 16)), el('div', null, [el('b', { text: u.who }), u.what ? el('span', null, inline(u.what)) : null])]);
        }))
      ])]);
      var cg = contextGroups(arch.context);
      if (cg) secs.push(['talks', t('ov.talks'), el('section', { class: 'r-ov-sec', 'data-sec': 'talks', id: 'talks' }, [
        sectionHead(t('ov.talks'), t('ov.talks.sub', { partners: N(cg.nodes, 'partner') }), PAGES.architecture.has ? moreLink({ page: 'architecture', q: { s: 'context' } }, t('ov.talks.more')) : null),
        el('div', { class: 'r-scroll-x' }, contextDiagram(cg, false))
      ])]);
      if (processes.length) secs.push(['does', t('ov.does'), el('section', { class: 'r-ov-sec', 'data-sec': 'does', id: 'does' }, [
        sectionHead(t('ov.does'), t('ov.does.sub', { processes: N(processes.length, 'process') }), moreLink({ page: 'processes', id: '1' }, t('ov.does.more'))),
        el('div', { class: 'r-ov-procs' }, processes.map(function (p, i) {
          return link({ page: 'processes', id: String(i + 1) }, { class: 'r-ov-proc' }, [
            el('span', { class: 'r-ov-proc-n', text: pad2(i + 1) }),
            el('span', { class: 'r-ov-proc-t' }, [el('b', { text: p.name }), p.summary ? el('span', null, inline(p.summary)) : null,
              el('small', { text: [N(p.steps.length, 'step'), N(p.flows.length, 'flow')].join(' · ') })]),
            icon('chevron', 16)
          ]);
        }))
      ])]);
      if (risks.length || quality.length) {
        var facts = quality.filter(function (q) { return q.count; }).slice(0, 4);
        secs.push(['attention', t('ov.attn'), el('section', { class: 'r-ov-sec', 'data-sec': 'attention', id: 'attention' }, [
          sectionHead(t('ov.attn'), t('ov.attn.sub', { findings: N(risks.length, 'finding') }), risks.length ? moreLink({ page: 'risks' }, t('ov.attn.more')) : null),
          el('div', { class: 'r-health' }, [
            el('div', { class: 'r-health-l' }, [
              risks.length ? el('div', { class: 'r-lv3' }, LEVELS.map(function (lv) {
                return link({ page: 'risks', q: { level: lv } }, { class: 'r-lv3-t ' + lv.toLowerCase() }, [el('b', { text: numFmt.format(levelCount(risks, lv)) }), el('span', { text: lv + ' · ' + t('tile.' + lv.toLowerCase()) })]);
              })) : null,
              facts.length ? el('div', { class: 'r-facts' }, [caption(t('ov.facts')), facts.map(function (q) {
                return link({ page: 'quality', id: q.id }, { class: 'r-fact' }, [el('span', { text: q.label }), el('span', { class: 'r-mono', text: numFmt.format(q.count) + (q.total ? ' / ' + numFmt.format(q.total) : '') })]);
              })]) : null
            ]),
            p1.length ? el('div', { class: 'r-p1' }, [caption(t('ov.p1s'), p1.length), p1.map(function (r) {
              return link({ page: 'risks', id: r.id }, { class: 'r-p1-row' }, [el('span', { text: r.title }), el('span', { class: 'r-mono', text: r.part || r.id })]);
            })]) : null
          ])
        ])]);
      }
      var next = [
        [t('ov.n1'), t('ov.n1.t'), ['modules', 'architecture', 'processes']],
        [t('ov.n2'), t('ov.n2.t'), flowKinds.map(function (k) { return 'flows:' + k.key; }).concat(['data', 'screens'])],
        [t('ov.n3'), t('ov.n3.t'), ['risks', 'quality', 'developers']]
      ].map(function (g) { return [g[0], g[1], g[2].map(entry).filter(function (e) { return e.has; })]; }).filter(function (g) { return g[2].length; });
      secs.push(['next', t('ov.next'), el('section', { class: 'r-ov-sec', 'data-sec': 'next', id: 'next' }, [
        sectionHead(t('ov.next'), t('ov.next.sub')),
        el('div', { class: 'r-next' }, next.map(function (g) {
          return el('div', { class: 'r-next-g' }, [el('h3', { text: g[0] }), el('p', { text: g[1] }), el('ul', null, g[2].map(function (e) {
            return el('li', null, link(e.route, null, [el('span', { text: e.label }), e.count !== undefined ? el('span', { class: 'r-mono', text: numFmt.format(e.count) }) : null, icon('arrow', 14)]));
          }))]);
        }))
      ])]);
      var toc = el('aside', { class: 'r-toc' }, [
        el('nav', { class: 'r-toc-l', 'aria-label': t('ov.toc') }, [caption(t('ov.toc')), secs.map(function (s) { return link({ page: 'overview', q: { s: s[0] } }, { class: 'r-toc-a' }, s[1]); })]),
        el('div', { class: 'r-toc-file' }, [el('b', { text: t('ov.file') }), el('span', { text: t('ov.file.t') })])
      ]);
      add(body, doc(el('div', { class: 'r-ov' }, [el('div', { class: 'r-ov-doc' }, secs.map(function (s) { return s[2]; })), toc])));
    }

    // ================================================================ Processes
    function processRisks(p) { return risksNaming(p.flows); }
    function pageProcesses() {
      var n = route.id === null ? (processes.length ? 1 : 0) : Math.max(0, Math.min(processes.length, parseInt(route.id, 10) || 0));
      if (!app.story && !app.summary && n === 0 && processes.length) n = 1;
      setHead(t('p.processes'), t('pr.sub', { app: appName, processes: N(processes.length, 'process') }));
      var paras = paragraphs(app.story);
      var rows = [];
      if (app.story || app.summary) rows.push({ no: '—', name: t('pr.app'), meta: paras.length ? t('pr.app.meta', { paragraphs: N(paras.length, 'paragraph') }) : t('pr.app.summary'), i: 0 });
      processes.forEach(function (p, i) {
        var r = processRisks(p).length;
        rows.push({ no: pad2(i + 1), name: p.name, i: i + 1, meta: [N(p.steps.length, 'step'), N(p.flows.length, 'flow'), r ? N(r, 'risk') : null].filter(Boolean).join(' · ') });
      });
      var list = el('div', { class: 'r-pl', role: 'list' }, rows.map(function (r) {
        return el('div', { role: 'listitem' }, link({ page: 'processes', id: String(r.i) }, { class: 'r-pl-item' + (r.i === n ? ' on' : ''), 'aria-current': r.i === n ? 'page' : null }, [
          el('span', { class: 'r-pl-n', text: r.no }), el('span', { class: 'r-pl-t' }, [el('b', { text: r.name }), el('small', { text: r.meta })])]));
      }));
      var wrap = el('article', { class: 'r-pd' });
      if (n === 0) {
        var aud = app.audience || [];
        add(wrap, [
          el('div', { class: 'r-pd-head' }, [el('span', { class: 'r-eyebrow', text: t('pr.app.eyebrow', { app: appName }) }), el('h2', { text: t('pr.app') }),
            app.summary ? el('p', { class: 'r-pd-lead' }, inline(app.summary)) : null,
            aud.length ? el('div', { class: 'r-pd-who' }, [el('b', { text: t('pr.who') + '.' }), el('ul', null, aud.map(function (u) { return el('li', null, [el('b', { text: u.who }), u.what ? ' ' + u.what : null]); }))]) : null]),
          el('div', { class: 'r-pd-grid' }, [
            paras.length ? el('section', { class: 'r-pd-story' }, [caption(t('pr.how')), el('div', { class: 'r-prose' }, prose(app.story))]) : null,
            processes.length ? el('section', { class: 'r-pd-side' }, [caption(t('pr.list'), processes.length), el('div', { class: 'r-rows' }, processes.map(function (p, i) {
              return link({ page: 'processes', id: String(i + 1) }, { class: 'r-pd-idx' }, [el('span', { class: 'r-pd-no', text: pad2(i + 1) }), el('span', null, [el('b', { text: p.name }), p.summary ? el('span', null, inline(p.summary)) : null])]);
            }))]) : null
          ])
        ]);
      } else {
        var p = processes[n - 1], touched = processRisks(p);
        add(wrap, el('div', { class: 'r-pd-head' }, [el('span', { class: 'r-eyebrow', text: t('pr.eyebrow', { n: pad2(n), m: processes.length }) }), el('h2', { text: p.name }), p.summary ? el('p', { class: 'r-pd-lead' }, inline(p.summary)) : null]));
        if (p.steps.length) add(wrap, el('section', { class: 'r-pd-sec' }, [caption(t('pr.steps'), p.steps.length), el('ol', { class: 'r-steps' }, p.steps.map(function (s, i) {
          var person = s.who === 'person';
          return el('li', null, [el('span', { class: 'r-steps-n', text: String(i + 1) }), el('span', { class: 'r-steps-t' }, inline(s.text)),
            s.who ? el('span', { class: 'r-steps-who' + (person ? ' person' : ' app') }, [icon(person ? 'person' : 'app', 14), el('span', { text: person ? (s.role || '') : t('pr.app.by') })]) : null]);
        }))]));
        if (p.diagram && p.diagram.length) {
          add(wrap, el('section', { class: 'r-pd-sec' }, [el('div', { class: 'r-pd-dh' }, [caption(t('pr.diagram')), el('span', { class: 'r-legend' }, [
            el('span', null, [el('span', { class: 'r-fg-tile r-k-person s20', 'aria-hidden': 'true' }, icon('person', 12)), t('pr.legend.person')]),
            el('span', null, [el('span', { class: 'r-fg-tile r-k-app s20', 'aria-hidden': 'true' }, icon('app', 12)), t('pr.legend.app')])])]),
            el('div', { class: 'r-drawing' }, drawFlow(p.diagram, { process: true }))]));
        }
        add(wrap, el('div', { class: 'r-pd-grid' }, [
          paragraphs(p.story).length ? el('section', { class: 'r-pd-story' }, [caption(t('pr.how')), el('div', { class: 'r-prose' }, prose(p.story))]) : null,
          el('div', { class: 'r-pd-side' }, [
            el('section', null, [caption(t('pr.flows'), p.flows.length), el('div', { class: 'r-rows' }, p.flows.map(flowRow))]),
            el('section', null, [caption(t('pr.risks'), touched.length), touched.length ? el('div', { class: 'r-rows' }, touched.map(riskRow)) : empty(t('pr.norisk'))])
          ])
        ]));
      }
      add(wrap, prov(t('pr.prov')));
      add(body, split(list, wrap, 'proc'));
    }
    function flowRow(name) {
      var f = flowBy[name], k = f ? kindBy[f.kind] : null;
      var kids = [kindTag(k ? k.tag : '··'), el('span', { class: 'r-row-qn' }, qn(name)), el('span', { class: 'r-row-n', text: f && f.steps ? N(f.steps, 'step') : '' })];
      return f ? link({ page: 'flows', id: name }, { class: 'r-row' }, kids) : el('div', { class: 'r-row' }, kids);
    }
    function riskRow(r) { return link({ page: 'risks', id: r.id }, { class: 'r-row r-row-risk' }, [lvBadge(r.level), el('span', { class: 'r-row-title', text: r.title })]); }

    // ================================================================ Parts (modules)
    function pageParts() {
      var own = parts.filter(function (p) { return !p.thirdParty; }), third = parts.filter(function (p) { return p.thirdParty; });
      setHead(PAGES.modules.label, third.length ? t('pt.sub', { own: N(own.length, 'part'), third: N(third.length, 'part'), app: appName }) : t('pt.sub.own', { own: N(own.length, 'part') }));
      var sort = route.q.sort || 'az', scope = route.q.scope || 'all';
      function size(p) { var it = partItems(p.name); return it.flows.length + it.screens.length + it.records.length; }
      function rk(p) { return risks.filter(function (r) { return r.part === p.name; }); }
      var shown = parts.filter(function (p) { return scope === 'all' || (scope === 'own' ? !p.thirdParty : p.thirdParty); });
      shown.sort(function (a, b) {
        if (!a.thirdParty !== !b.thirdParty) return a.thirdParty ? 1 : -1;
        if (sort === 'size') return size(b) - size(a) || a.name.localeCompare(b.name);
        if (sort === 'risk') { var ra = rk(a), rb = rk(b); return levelCount(rb, 'P1') - levelCount(ra, 'P1') || rb.length - ra.length || a.name.localeCompare(b.name); }
        return a.name.localeCompare(b.name);
      });
      var cur = partBy[route.id] || shown[0] || parts[0];
      function q(o) { return Object.assign({ sort: sort === 'az' ? null : sort, scope: scope === 'all' ? null : scope }, o); }
      var head2 = el('div', { class: 'r-list-head' }, [
        seg([['az', t('pt.az')], ['size', t('pt.size')], ['risk', t('pt.byrisk')]], sort, function (v) { go({ page: 'modules', id: cur && cur.name, q: q({ sort: v === 'az' ? null : v }) }); }, t('pt.sort')),
        third.length ? seg([['all', t('pt.all')], ['own', t('pt.own')], ['third', t('pt.third')]], scope, function (v) { go({ page: 'modules', id: cur && cur.name, q: q({ scope: v === 'all' ? null : v }) }); }) : null
      ]);
      var list = el('div', null, [head2, el('div', { class: 'r-items', role: 'list' }, shown.map(function (p) {
        var it = partItems(p.name), r = rk(p), p1 = levelCount(r, 'P1');
        var meta = [it.flows.length ? N(it.flows.length, 'flow') : null, it.screens.length ? N(it.screens.length, 'screen') : null, it.records.length ? N(it.records.length, 'record') : null].filter(Boolean).join(' · ');
        return el('div', { role: 'listitem' }, link({ page: 'modules', id: p.name, q: q({}) }, { class: 'r-item' + (cur && p.name === cur.name ? ' on' : ''), 'aria-current': cur && p.name === cur.name ? 'page' : null }, [
          el('span', { class: 'r-item-t' }, [el('b', { class: 'r-mono', text: p.name }), el('small', { text: meta || '—' })]),
          el('span', { class: 'r-item-r' }, [p1 ? el('span', { class: 'r-lv p1 wide', text: p1 + ' P1' }) : null, r.length ? el('span', { class: 'r-count', text: String(r.length) }) : null])
        ]));
      }))]);
      if (!cur) { add(body, split(list, empty(t('empty.page')), 'parts')); return; }
      var it = partItems(cur.name), pr = sortRisks(rk(cur)), deps = depsOf(cur), users = usedBy[cur.name] || [];
      var tab = route.q.tab || 'about';
      var tabs = [['about', t('pt.about'), null], ['contents', t('pt.contents'), it.flows.length + it.screens.length + it.records.length], ['connections', t('pt.conn'), deps.length + users.length], ['risks', t('pt.risks'), pr.length]];
      var facts = [];
      flowKinds.forEach(function (k) { var n = it.flows.filter(function (f) { return f.kind === k.key; }).length; if (n) facts.push([N(n, flowForms(k)), 'contents']); });
      if (it.screens.length) facts.push([N(it.screens.length, 'screen'), 'contents']);
      if (it.records.length) facts.push([N(it.records.length, 'record'), 'contents']);
      if (deps.length) facts.push([t('pt.uses') + ' ' + deps.length, 'connections']);
      if (users.length) facts.push([t('pt.usedby') + ' ' + users.length, 'connections']);
      if (pr.length) facts.push([LEVELS.filter(function (l) { return levelCount(pr, l); }).map(function (l) { return levelCount(pr, l) + ' ' + l; }).join(' · '), 'risks', levelCount(pr, 'P1') ? 'p1' : null]);
      var detail = el('article', { class: 'r-part' }, [
        el('div', { class: 'r-pd-head' }, [el('span', { class: 'r-eyebrow', text: cur.thirdParty ? t('pt.eyebrow.third') : t('pt.eyebrow.own') }), el('h2', { class: 'r-mono', text: cur.name }),
          cur.summary ? el('p', { class: 'r-pd-lead' }, [inline(cur.summary), ' ', aiMark()]) : null]),
        facts.length ? el('div', { class: 'r-facts-row' }, facts.map(function (f) { return link({ page: 'modules', id: cur.name, q: q({ tab: f[1] }) }, { class: 'r-fact-btn' + (f[2] ? ' ' + f[2] : '') }, f[0]); })) : null,
        el('div', { class: 'r-tabs', role: 'tablist' }, tabs.map(function (x) {
          return link({ page: 'modules', id: cur.name, q: q({ tab: x[0] === 'about' ? null : x[0] }) }, { class: 'r-tab' + (x[0] === tab ? ' on' : ''), role: 'tab', 'aria-selected': x[0] === tab ? 'true' : 'false' }, [x[1], x[2] !== null ? el('i', { text: String(x[2]) }) : null]);
        })),
        el('div', { class: 'r-tabpanel', role: 'tabpanel' }, partTab(cur, tab, it, pr, deps, users))
      ]);
      add(body, split(list, detail, 'parts'));
    }
    function partTab(p, tab, it, pr, deps, users) {
      if (tab === 'contents') {
        var cols = [];
        flowKinds.forEach(function (k) { var l = it.flows.filter(function (f) { return f.kind === k.key; }); if (l.length) cols.push([k.label, l.map(function (f) { return [f.name, f.steps ? N(f.steps, 'step') : '', k.tag]; })]); });
        if (it.screens.length) cols.push([PAGES.screens.label, it.screens.map(function (s) { return [s.name, '', 'SCR']; })]);
        if (it.records.length) cols.push([PAGES.data.label, it.records.map(function (r) { return [r.name, r.fields ? N(r.fields.length, 'field') : '', 'REC']; })]);
        if (!cols.length) return empty(t('pt.empty'));
        return el('div', { class: 'r-contents' }, cols.map(function (c) {
          return el('section', null, [caption(c[0], c[1].length), el('div', { class: 'r-rows' }, c[1].map(function (x) {
            return nameRow(x[0], x[2], x[1]);
          }))]);
        }));
      }
      if (tab === 'connections') {
        var runs = p.runs || [];
        return el('div', { class: 'r-contents' }, [
          el('section', null, [caption(t('pt.uses'), deps.length), deps.length ? el('div', { class: 'r-rows' }, deps.map(function (d) {
            var both = (usedBy[p.name] || []).some(function (u) { return u.name === d.name; });
            return connRow(d.name, N(d.count || 1, 'call'), both);
          })) : empty(t('pt.uses.none'))]),
          el('section', null, [caption(t('pt.usedby'), users.length), users.length ? el('div', { class: 'r-rows' }, users.map(function (u) {
            var both = depsOf(p).some(function (d) { return d.name === u.name; });
            return connRow(u.name, N(u.count, 'call'), both);
          })) : empty(t('pt.usedby.none'))]),
          el('section', null, [caption(t('pt.runs'), runs.length), runs.length ? el('div', { class: 'r-rows' }, runs.map(runRow)) : empty(t('pt.runs.none'))])
        ]);
      }
      if (tab === 'risks') {
        if (!pr.length) return empty(t('pt.norisk'));
        return el('div', { class: 'r-rows' }, pr.map(function (r) {
          return link({ page: 'risks', id: r.id }, { class: 'r-row r-row-risk tall' }, [lvBadge(r.level), el('span', { class: 'r-row-tt' }, [el('b', { text: r.title }), r.fix ? el('small', { text: r.fix.replace(/`/g, '') }) : null]), el('span', { class: 'r-open' }, [t('rk.open'), icon('arrow', 13)])]);
        }));
      }
      var notes = p.notes || [];
      return el('div', { class: 'r-about' }, [
        el('section', { class: 'r-pd-story' }, [caption(t('pt.what')), paragraphs(p.story).length ? [el('div', { class: 'r-prose' }, prose(p.story)), prov(t('pr.prov'))] : empty(t('pt.nodesc'))]),
        notes.map(function (n) {
          return el('section', { class: 'r-note' }, [caption(n.title), n.text ? el('div', { class: 'r-prose small' }, prose(n.text)) : null,
            n.items && n.items.length ? el('ul', { class: 'r-bullets' }, n.items.map(function (x) { return el('li', null, inline(x)); })) : null,
            n.table ? table(n.table.columns, n.table.rows, true) : null]);
        })
      ]);
    }
    function nameRow(name, tag, meta) {
      var k = known[name];
      var kids = [kindTag(tag), el('span', { class: 'r-row-qn' }, qn(name)), el('span', { class: 'r-row-n', text: meta || '' })];
      return k ? link({ page: k.page, id: k.id }, { class: 'r-row' }, kids) : el('div', { class: 'r-row' }, kids);
    }
    function connRow(name, meta, both) {
      return link({ page: 'modules', id: name }, { class: 'r-row r-row-conn' }, [el('span', { class: 'r-mono r-row-qn', text: name }), el('span', { class: 'r-row-n', text: meta }), both ? el('span', { class: 'r-badge warn', text: t('pt.both') }) : el('span')]);
    }
    function runRow(r) {
      var job = r.kind === 'job';
      return el('div', { class: 'r-row r-row-run' + (job && r.on === false ? ' off' : '') }, [
        job ? el('span', { class: 'r-dot' + (r.on === false ? '' : ' on'), 'aria-hidden': 'true' }) : icon('external', 14),
        el('span', { class: 'r-row-qn' }, known[r.name] ? nameLink(r.name) : el('span', { class: 'r-mono', text: r.name })),
        el('span', { class: 'r-row-n', text: job ? [r.schedule, r.on === false ? t('pt.off') : t('pt.on')].filter(Boolean).join(' · ') : (r.kind || '') })
      ]);
    }
    function table(cols, rows, firstMono) {
      return el('div', { class: 'r-table' }, el('table', null, [
        el('thead', null, el('tr', null, cols.map(function (c) { return el('th', { text: c }); }))),
        el('tbody', null, rows.map(function (r) {
          return el('tr', null, cols.map(function (c, i) {
            var v = r[i] === undefined || r[i] === null ? '' : String(r[i]);
            if (known[v]) return el('td', { class: 'r-mono' }, nameLink(v));
            if (i === 0 && firstMono && /^\S+$/.test(v)) return el('td', { class: 'r-mono' }, qn(v));
            return el('td', { class: /^[\d.,\s]+$/.test(v) ? 'num' : null }, inline(v));
          }));
        }))
      ]));
    }

    // ================================================================ Architecture
    function pageArchitecture() {
      var secs = [];
      var cg = contextGroups(arch.context);
      if (cg) {
        var appNode = cg.app;
        var rows = arch.context.nodes.filter(function (n) { return n !== appNode; }).map(function (n) {
          var into = arch.context.links.filter(function (l) { return l.from === n.id && l.to === appNode.id; });
          var from = arch.context.links.filter(function (l) { return l.from === appNode.id && l.to === n.id; });
          var dir = into.length && from.length ? '↔ ' : from.length ? '→ ' : '→ ';
          var dtext = into.length && from.length ? '↔ ' + appNode.name : from.length ? appNode.name + ' →' : '→ ' + appNode.name;
          return [n.name, n.group || '', dtext, into.concat(from).map(function (l) { return l.label; }).filter(Boolean).concat(n.note ? [n.note] : []).join(' · '), from.length ? 'out' : ''];
        });
        secs.push(['context', t('ar.ctx'), t('ar.ctx.t', { app: appName, partners: N(cg.nodes, 'partner'), groups: N(cg.groups.length, 'group') }), [
          el('div', { class: 'r-scroll-x' }, contextDiagram(cg, true)),
          el('div', { class: 'r-table r-ar-table' }, el('table', null, [
            el('thead', null, el('tr', null, [t('ar.partner'), t('ar.group'), t('ar.dir'), t('ar.over')].map(function (c) { return el('th', { text: c }); }))),
            el('tbody', null, rows.map(function (r) { return el('tr', null, [el('td', null, el('b', { text: r[0] })), el('td', { text: r[1] }), el('td', { class: 'r-dir' + (r[4] ? ' out' : '') , text: r[2] }), el('td', { text: r[3] })]); }))
          ]))
        ]]);
      }
      var jobs = [], eps = [];
      parts.forEach(function (p) { (p.runs || []).forEach(function (r) { (r.kind === 'job' ? jobs : eps).push(r); }); });
      if (arch.containers && arch.containers.nodes && arch.containers.nodes.length) {
        secs.push(['runtime', t('ar.rt'), t('ar.rt.t', { app: appName }), [
          el('div', { class: 'r-scroll-x' }, runtimeDiagram(arch.containers)),
          (jobs.length || eps.length) ? el('div', { class: 'r-two' }, [
            eps.length ? el('div', null, [caption(t('ar.eps'), eps.length), el('div', { class: 'r-rows' }, eps.map(runRow))]) : null,
            jobs.length ? el('div', null, [caption(t('ar.jobs'), jobs.length), el('div', { class: 'r-rows' }, jobs.map(runRow)), el('p', { class: 'r-hint', text: t('ar.jobs.hint') })]) : null
          ]) : null
        ]]);
      }
      if (parts.some(function (p) { return p.dependsOn.length; })) secs.push(['deps', t('ar.dep'), t('ar.dep.t'), dsm()]);
      if ((arch.access || []).length) secs.push(['roles', t('ar.roles'), t('ar.roles.t'), rolesMatrix(arch.access)]);
      if ((arch.open || []).length) secs.push(['open', t('ar.open'), t('ar.open.t', { things: N(arch.open.length, 'thing') }), el('ol', { class: 'r-numbered' }, arch.open.map(function (x, i) { return el('li', null, [el('span', { class: 'r-mono', text: pad2(i + 1) }), el('span', null, inline(x))]); }))]);
      setHead(t('p.architecture'), t('ar.sub', { app: appName }));
      add(tools, el('nav', { class: 'r-anchors', 'aria-label': t('p.architecture') }, secs.map(function (s, i) {
        return link({ page: 'architecture', q: { s: s[0] } }, { class: route.q.s === s[0] ? 'on' : null }, [el('span', { class: 'r-mono', text: String(i + 1) }), t('ar.' + s[0] + '.s')]);
      })));
      add(body, doc(el('div', { class: 'r-ar' }, secs.map(function (s, i) {
        return el('section', { class: 'r-ar-sec', 'data-sec': s[0], id: 'sec-' + s[0] }, [
          el('div', { class: 'r-ar-h' }, [el('span', { class: 'r-ar-no', text: String(i + 1) }), el('div', null, [el('h2', { text: s[1] }), el('p', null, inline(s[2]))])]),
          s[3]
        ]);
      }))));
    }
    // The context's groups around the application, placed by the way the data goes:
    // people and systems that only send to it on the left, systems it only calls on
    // the right, a group with links both ways above it.
    function contextGroups(d) {
      if (!d || !d.nodes) return null;
      var appNode = d.nodes.filter(function (n) { return n.kind === 'app'; })[0];
      if (!appNode) return null;
      var links = d.links || [], byName = {}, groups = [], count = 0;
      d.nodes.forEach(function (n) {
        if (n === appNode) return;
        count++;
        var into = links.filter(function (l) { return l.from === n.id && l.to === appNode.id; });
        var from = links.filter(function (l) { return l.from === appNode.id && l.to === n.id; });
        var dir = n.kind === 'person' ? 'person' : into.length && from.length ? 'both' : into.length ? 'in' : from.length ? 'out' : 'none';
        var key = n.group || ('\u0000' + dir), g = byName[key];
        if (!g) { g = byName[key] = { name: n.group || t({ person: 'ctx.people', both: 'ctx.both', 'in': 'ctx.in', out: 'ctx.out', none: 'ctx.other' }[dir]), nodes: [], people: true, into: false, from: false }; groups.push(g); }
        g.nodes.push({ name: n.name, note: n.note, kind: n.kind, via: into.concat(from).map(function (l) { return l.label; }).filter(Boolean).join(', ') || n.note });
        if (n.kind !== 'person') g.people = false;
        if (into.length) g.into = true;
        if (from.length) g.from = true;
      });
      if (!groups.length) return null;
      var top = [], left = [], right = [];
      groups.forEach(function (g) {
        if (g.people) { g.verb = t('ctx.useit'); left.push(g); }
        else if (g.into && g.from) { g.verb = ''; top.push(g); }
        else if (g.into) { g.verb = t('ctx.send'); left.push(g); }
        else { g.verb = g.from ? t('ctx.calls') : ''; right.push(g); }
      });
      return { app: appNode, groups: groups, nodes: count, top: top, left: left, right: right };
    }
    function contextDiagram(c, notes) {
      function group(g) {
        return el('div', { class: 'r-ctx-g' }, [el('span', { class: 'r-ctx-gl', text: g.name }), g.nodes.map(function (n) {
          return el('span', { class: 'r-ctx-chip', title: n.note || null }, [el('span', { class: 'r-ctx-ic', 'aria-hidden': 'true' }, icon(n.kind === 'person' ? 'person' : n.kind === 'store' ? 'database' : n.kind === 'queue' ? 'queue' : 'system', 13)),
            el('span', { class: 'r-ctx-ct' }, [el('b', { text: n.name }), (notes ? n.note : n.via) ? el('span', { text: notes ? n.note : n.via }) : null])]);
        })]);
      }
      function conn(verb, row, col, dir) {
        var c2 = el('div', { class: 'r-ctx-conn' + (dir === 'none' ? ' plain' : '') }, [el('span', { class: 'r-ctx-cl', text: verb || '' }), el('span', { class: 'r-ctx-arrow', 'aria-hidden': 'true' })]);
        c2.style.gridRow = String(row); c2.style.gridColumn = String(col);
        return c2;
      }
      var rows = Math.max(c.left.length, c.right.length, 1), kids = [];
      if (c.top.length) kids.push(el('div', { class: 'r-ctx-top' }, [el('div', { class: 'r-ctx-tops' }, c.top.map(group)), el('span', { class: 'r-ctx-both', 'aria-hidden': 'true' })]));
      c.left.forEach(function (g, i) { var n = group(g); n.style.gridRow = String(i + 2); n.style.gridColumn = '1'; kids.push(n, conn(g.verb, i + 2, 2)); });
      var mid = el('div', { class: 'r-ctx-app' }, [el('span', { class: 'r-eyebrow', text: app.kind || t('ar.app') }), el('b', { text: c.app.name }), c.app.note ? el('span', { text: c.app.note }) : null]);
      mid.style.gridRow = '2 / span ' + rows; mid.style.gridColumn = '3';
      kids.push(mid);
      c.right.forEach(function (g, i) { var n = group(g); n.style.gridRow = String(i + 2); n.style.gridColumn = '5'; kids.push(conn(g.verb, i + 2, 4, g.verb ? null : 'none'), n); });
      return el('div', { class: 'r-ctx' + (c.top.length ? ' has-top' : ''), role: 'img', 'aria-label': t('ar.ctx') }, kids);
    }
    // The runtime: callers on the left, the application's own parts one under
    // another in a dashed frame, stores and called systems on the right. Every
    // line is orthogonal, leaves and enters a box at its own port on the side,
    // bends in its own lane between the columns, never crosses a box (a line
    // from the left straight to the right runs over the frame), and ends with
    // its arrow on the box's edge.
    function runtimeDiagram(d) {
      var links = (d.links || []).filter(function (l) { return l.from !== l.to; }), byId = {};
      d.nodes.forEach(function (n) { byId[n.id] = n; });
      var isPart = function (id) { return byId[id] && byId[id].kind === 'part'; };
      var partsN = d.nodes.filter(function (n) { return n.kind === 'part'; });
      var left = [], right = [];
      d.nodes.forEach(function (n) {
        if (n.kind === 'part') return;
        var toParts = links.some(function (l) { return l.from === n.id && isPart(l.to); });
        var fromParts = links.some(function (l) { return l.to === n.id && isPart(l.from); });
        if (n.kind === 'person' || (toParts && !fromParts && n.kind !== 'store' && n.kind !== 'queue')) left.push(n); else right.push(n);
      });
      var Hn = 72, GAP_Y = 30, GAP_X = 172, ZONE = 92, W_L = 184, W_P = 196, W_R = 196, FRAME = 22, TOP = 72;
      var xL = 0, xP = W_L + GAP_X + FRAME, xR = xP + W_P + FRAME + GAP_X;
      var pos = {};
      partsN.forEach(function (p, i) { pos[p.id] = { x: xP, y: TOP + i * (Hn + GAP_Y), w: W_P, col: 'P' }; });
      function others(n) { return links.filter(function (l) { return (l.from === n.id && pos[l.to] && isPart(l.to)) || (l.to === n.id && pos[l.from] && isPart(l.from)); }).map(function (l) { return pos[l.from === n.id ? l.to : l.from].y; }); }
      // An outside box sits level with the parts it talks to; the column keeps its order and spacing.
      function column(list, x, w, col) {
        var items = list.map(function (n, i) { var ys = others(n); return { n: n, i: i, ideal: ys.length ? ys.reduce(function (a, b) { return a + b; }, 0) / ys.length : TOP + i * (Hn + GAP_Y) }; });
        items.sort(function (a, b) { return a.ideal - b.ideal || a.i - b.i; });
        var y = -1e9;
        items.forEach(function (it) { it.y = Math.max(it.ideal, y + Hn + GAP_Y); y = it.y; });
        if (items.length) {
          var shift = items.reduce(function (s, it) { return s + it.ideal - it.y; }, 0) / items.length;
          var minY = Math.min.apply(null, items.map(function (it) { return it.y; }));
          shift = Math.max(shift, TOP - minY);
          items.forEach(function (it) { pos[it.n.id] = { x: x, y: Math.round(it.y + shift), w: w, col: col }; });
        }
      }
      column(left, xL, W_L, 'L');
      column(right, xR, W_R, 'R');
      // Ports: the links on one side of a box spread along it, ordered by where their other end is.
      var ends = [];
      var routes = links.map(function (l) {
        var a = pos[l.from], b = pos[l.to];
        if (!a || !b) return null;
        var r = { l: l, a: a, b: b };
        if (a.col === b.col) { r.sideA = 'R'; r.sideB = 'R'; r.same = true; }
        else if (a.x < b.x) { r.sideA = 'R'; r.sideB = 'L'; }
        else { r.sideA = 'L'; r.sideB = 'R'; }
        ends.push({ r: r, end: 'a', box: a, side: r.sideA, other: b }, { r: r, end: 'b', box: b, side: r.sideB, other: a });
        return r;
      }).filter(Boolean);
      var bySide = {};
      ends.forEach(function (e) { var k = e.box.x + ':' + e.box.y + ':' + e.side; (bySide[k] = bySide[k] || []).push(e); });
      Object.keys(bySide).forEach(function (k) {
        var list = bySide[k].sort(function (u, v) { return (u.other.y - v.other.y) || (u.end === 'a' ? -1 : 1); });
        list.forEach(function (e, i) {
          var y = e.box.y + Hn * (i + 1) / (list.length + 1);
          e.r[e.end === 'a' ? 'ya' : 'yb'] = Math.round(y);
          e.r[e.end === 'a' ? 'xa' : 'xb'] = e.side === 'R' ? e.box.x + e.box.w : e.box.x;
        });
      });
      // Lanes: each bending line gets its own vertical in the gap it crosses.
      var gaps = {};
      routes.forEach(function (r) {
        if (r.same) r.gap = 'S' + r.a.col;
        else if (r.a.col !== 'P' && r.b.col !== 'P') { r.cross = true; (gaps.LP = gaps.LP || []).push(r); (gaps.PR = gaps.PR || []).push(r); return; }
        else r.gap = (r.a.col === 'L' || r.b.col === 'L') ? 'LP' : 'PR';
        if (r.same || Math.abs(r.ya - r.yb) > 0.5) (gaps[r.gap] = gaps[r.gap] || []).push(r);
      });
      Object.keys(gaps).forEach(function (g) {
        var list = gaps[g].sort(function (u, v) { return (Math.min(u.ya, u.yb) - Math.min(v.ya, v.yb)) || (u.ya - v.ya); });
        var x0, x1;
        // Labels sit next to the outside box (ZONE px of the gap); lanes keep out of that stretch.
        if (g === 'LP') { x0 = xL + W_L + ZONE; x1 = xP - FRAME - 6; }
        else if (g === 'PR') { x0 = xP + W_P + FRAME + 6; x1 = xR - ZONE; }
        else { x0 = (g === 'SP' ? xP + W_P : g === 'SL' ? xL + W_L : xR + W_R); x1 = x0 + (g === 'SP' ? FRAME - 4 : 40); }
        list.forEach(function (r, i) { var x = Math.round(x0 + (x1 - x0) * (i + 1) / (list.length + 1)); if (r.cross) r[g === 'LP' ? 'lane1' : 'lane2'] = x; else r.lane = x; });
      });
      var maxY = 0;
      Object.keys(pos).forEach(function (id) { maxY = Math.max(maxY, pos[id].y + Hn); });
      var Wd = xR + W_R + (gaps.SR ? 48 : 8), Hd = maxY + 16;
      var stage = el('div', { class: 'r-rt', role: 'img', 'aria-label': t('ar.rt') });
      stage.style.width = Wd + 'px'; stage.style.height = Hd + 'px';
      var sv = svg('svg', { class: 'r-rt-svg', width: Wd, height: Hd, 'aria-hidden': 'true' });
      stage.appendChild(sv);
      if (partsN.length) {
        var fy = TOP - 34, fh = (partsN.length - 1) * (Hn + GAP_Y) + Hn + 34 + 16;
        sv.appendChild(svg('rect', { class: 'r-rt-frame', x: xP - FRAME, y: fy, width: W_P + 2 * FRAME, height: fh, rx: 14 }));
        var fl = el('span', { class: 'r-rt-frame-l', text: t('ar.runtime', { app: appName }) });
        fl.style.left = (xP - FRAME + 14) + 'px'; fl.style.top = (fy + 10) + 'px'; fl.style.maxWidth = (W_P + 2 * FRAME - 28) + 'px';
        stage.appendChild(fl);
      }
      routes.forEach(function (r) {
        var pts;
        // A line from the left straight to the right goes over the frame, never through a part.
        if (r.cross) { var over = TOP - 34 - 14; pts = [[r.xa, r.ya], [r.lane1, r.ya], [r.lane1, over], [r.lane2, over], [r.lane2, r.yb], [r.xb, r.yb]]; }
        else if (r.lane === undefined) pts = [[r.xa, r.ya], [r.xb, r.yb]];
        else pts = [[r.xa, r.ya], [r.lane, r.ya], [r.lane, r.yb], [r.xb, r.yb]];
        var n = pts.length, z = pts[n - 1], q = pts[n - 2], dx = Math.sign(z[0] - q[0]), dy = Math.sign(z[1] - q[1]);
        var base = [z[0] - dx * 7, z[1] - dy * 7], dd = 'M' + pts[0][0] + ' ' + pts[0][1];
        for (var i = 1; i < n - 1; i++) dd += ' L' + pts[i][0] + ' ' + pts[i][1];
        dd += ' L' + base[0] + ' ' + base[1];
        sv.appendChild(svg('path', { class: 'r-rt-edge', d: dd }));
        sv.appendChild(svg('path', { class: 'r-rt-arrow', d: 'M' + z[0] + ' ' + z[1] + ' L' + (base[0] - dy * 4.5) + ' ' + (base[1] + dx * 4.5) + ' L' + (base[0] + dy * 4.5) + ' ' + (base[1] - dx * 4.5) + ' Z' }));
        if (r.l.label) {
          // Beside the outside box, where no lane runs: after the left column, before the right one.
          var le = el('span', { class: 'r-rt-label', text: r.l.label }), outA = r.a.col !== 'P';
          if (r.same) { le.style.left = (r.lane + 6) + 'px'; le.style.top = ((r.ya + r.yb) / 2) + 'px'; le.classList.add('l'); }
          else if ((outA ? r.a : r.b).col === 'L') { le.style.left = (xL + W_L + 8) + 'px'; le.style.top = (outA ? r.ya : r.yb) + 'px'; le.classList.add('l'); }
          else { le.style.left = (xR - 12) + 'px'; le.style.top = (outA ? r.ya : r.yb) + 'px'; le.classList.add('r'); }
          le.style.maxWidth = (ZONE - 14) + 'px';
          stage.appendChild(le);
        }
      });
      d.nodes.forEach(function (n) {
        var p = pos[n.id];
        if (!p) return;
        var box = el('div', { class: 'r-rt-node ' + n.kind, title: n.name + (n.note ? ' — ' + n.note : '') }, [
          el('span', { class: 'r-rt-nh' }, [el('span', { class: 'r-rt-ic' }, icon({ person: 'person', store: 'database', queue: 'queue', part: 'part' }[n.kind] || 'system', 14)), el('b', { text: n.name })]),
          n.note ? el('span', { class: 'r-rt-note', text: n.note }) : null
        ]);
        box.style.left = p.x + 'px'; box.style.top = p.y + 'px'; box.style.width = p.w + 'px'; box.style.height = Hn + 'px';
        stage.appendChild(box);
      });
      return stage;
    }
    // The dependency structure matrix: a row uses a column. Least-used parts at the top.
    function dsm() {
      var names = parts.map(function (p) { return p.name; });
      function val(a, b) { var d = depsOf(partBy[a]).filter(function (x) { return x.name === b; })[0]; return d ? (d.count || 1) : 0; }
      var inn = {}; names.forEach(function (n) { inn[n] = names.reduce(function (s, m) { return s + val(m, n); }, 0); });
      names.sort(function (a, b) { return inn[a] - inn[b] || a.localeCompare(b); });
      var max = 1; names.forEach(function (a) { names.forEach(function (b) { max = Math.max(max, val(a, b)); }); });
      var pick = route.q.part && partBy[route.q.part] ? route.q.part : null;
      function sel(n) { return { page: 'architecture', q: { s: 'deps', part: n === pick ? null : n } }; }
      var grid = el('div', { class: 'r-dsm', role: 'table' }, [
        el('div', { class: 'r-dsm-r head', role: 'row' }, [el('span', { class: 'r-dsm-corner' }), names.map(function (n) { return el('span', { class: 'r-dsm-ch' + (n === pick ? ' on' : ''), role: 'columnheader', text: n }); })]),
        names.map(function (a) {
          return el('div', { class: 'r-dsm-r', role: 'row' }, [link(sel(a), { class: 'r-dsm-rh' + (a === pick ? ' on' : ''), role: 'rowheader' }, a), names.map(function (b) {
            if (a === b) return el('span', { class: 'r-dsm-c self', role: 'cell' });
            var v = val(a, b), mutual = v && val(b, a);
            var lvl = v ? Math.min(4, 1 + Math.floor(3 * v / max)) : 0;
            return el('span', { class: 'r-dsm-c' + (mutual ? ' mu' : v ? ' v' + lvl : '') + ((a === pick || b === pick) && !v ? ' cross' : ''), role: 'cell', title: v ? a + ' → ' + b + ': ' + v : null, text: v ? String(v) : '' });
          })]);
        })
      ]);
      var side2;
      if (pick) {
        var uses = depsOf(partBy[pick]), ub = usedBy[pick] || [];
        side2 = el('div', { class: 'r-ar-pick' }, [el('b', { class: 'r-mono', text: pick }),
          caption(t('pt.uses'), uses.length), uses.length ? el('div', { class: 'r-rows' }, uses.map(function (d) { return connRow(d.name, N(d.count || 1, 'call'), val(d.name, pick) > 0); })) : empty(t('pt.uses.none')),
          caption(t('pt.usedby'), ub.length), ub.length ? el('div', { class: 'r-rows' }, ub.map(function (d) { return connRow(d.name, N(d.count, 'call'), val(pick, d.name) > 0); })) : empty(t('pt.usedby.none'))]);
      } else side2 = el('p', { class: 'r-hint' }, t('ar.pick'));
      return el('div', { class: 'r-ar-grid' }, [el('div', { class: 'r-ar-mx' }, [el('div', { class: 'r-scroll-x' }, grid), el('div', { class: 'r-legend' }, [
        el('span', null, [el('i', { class: 'lg-a' }), t('ar.legend.uses')]), el('span', null, [el('i', { class: 'lg-m' }), t('ar.legend.both')])])]), side2]);
    }
    function rolesMatrix(rows) {
      var cols = parts.filter(function (p) { return rows.some(function (r) { return r.parts && r.parts[p.name]; }); }).map(function (p) { return p.name; });
      return el('div', { class: 'r-table r-roles' }, el('table', null, [
        el('thead', null, el('tr', null, [el('th', { text: t('ar.role') }), cols.map(function (c) { return el('th', { class: 'r-mono', text: c }); })])),
        el('tbody', null, rows.map(function (r) {
          return el('tr', null, [el('td', null, el('b', { text: r.role })), cols.map(function (c) {
            var v = r.parts && r.parts[c];
            return el('td', { class: 'r-acc' + (v && /write|zapis|schreib/i.test(v) ? ' w' : v ? ' r' : '') }, v ? [el('span', { class: 'r-acc-dot', 'aria-hidden': 'true' }), el('span', { text: String(v) })] : el('span', { class: 'r-acc-no', text: '—' }));
          })]);
        }))
      ]));
    }

    // ================================================================ Data model, flows, screens
    function groupedList(items, cur, pageKey, tagOf, metaOf, filterText) {
      var groups = {}, order = [];
      items.forEach(function (x) { var p = partOf(x.name) || '—'; if (!groups[p]) { groups[p] = []; order.push(p); } groups[p].push(x); });
      return el('div', { class: 'r-items', role: 'list' }, order.map(function (g) {
        return [el('div', { class: 'r-items-g' }, [el('span', { class: 'r-mono', text: g }), el('span', { class: 'r-count', text: String(groups[g].length) })]), groups[g].map(function (x) {
          var on = cur && x.name === cur.name, p = partOf(x.name), short = p && x.name.indexOf(p + '.') === 0 ? x.name.slice(p.length + 1) : x.name;
          return el('div', { role: 'listitem' }, link({ page: pageKey, id: x.name, q: filterText ? { f: filterText } : null }, { class: 'r-item' + (on ? ' on' : ''), 'aria-current': on ? 'page' : null }, [
            tagOf ? kindTag(tagOf(x)) : null, el('span', { class: 'r-item-t' }, [el('b', { class: 'r-mono', text: short }), metaOf(x) ? el('small', { text: metaOf(x) }) : null])]));
        })];
      }));
    }
    function filterBox(value, onChange) {
      var inp = el('input', { type: 'search', class: 'r-filter', placeholder: t('fl.filter'), 'aria-label': t('filter'), value: value || '' });
      var timer = null;
      inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { onChange(inp.value); }, 160); });
      return el('label', { class: 'r-filter-box' }, [icon('filter', 14), inp]);
    }
    function matches(x, f) { var s = fold(f); return !s || fold(x.name + ' ' + (x.summary || '')).indexOf(s) !== -1; }
    function keepFilterFocus() { var i = body.querySelector('.r-filter'); if (i && route.q.f) { i.focus(); var v = i.value; i.setSelectionRange(v.length, v.length); } }

    function pageData() {
      var f = route.q.f || '';
      var shown = records.filter(function (r) { return matches(r, f); });
      var cur = recordBy[route.id] || shown[0];
      var partsWith = {}; records.forEach(function (r) { partsWith[partOf(r.name)] = 1; });
      setHead(PAGES.data.label, t('dm.sub', { records: N(records.length, 'record'), parts: N(Object.keys(partsWith).length, 'part') }));
      var list = el('div', null, [el('div', { class: 'r-list-head' }, filterBox(f, function (v) { go({ page: 'data', id: cur && cur.name, q: { f: v } }); })),
        shown.length ? groupedList(shown, cur, 'data', null, function (r) { return r.fields ? N(r.fields.length, 'field') : ''; }, f) : empty(t('fl.nomatch'), 'pad')]);
      if (!cur) { add(body, split(list, empty(t('empty.page')), 'data')); return; }
      var owns = (cur.relations || []).map(function (x) { return x.to; });
      var refBy = records.filter(function (r) { return (r.relations || []).some(function (x) { return x.to === cur.name; }) && r.name !== cur.name && owns.indexOf(r.name) === -1; });
      var detail = el('article', { class: 'r-obj' }, [
        el('div', { class: 'r-pd-head' }, [el('span', { class: 'r-eyebrow', text: (partOf(cur.name) || '') + ' · ' + PAGES.data.label }), el('h2', { class: 'r-mono' }, qn(cur.name)), cur.summary ? el('p', { class: 'r-pd-lead small' }, [inline(cur.summary), ' ', aiMark()]) : null]),
        el('section', { class: 'r-obj-sec' }, [caption(t('dm.fields'), (cur.fields || []).length), (cur.fields || []).length ? table([t('dm.name'), t('dm.type')], cur.fields.map(function (x) { return [x.name, x.type || '']; }), true) : empty(t('dm.nofields'))]),
        el('section', { class: 'r-obj-sec' }, [caption(t('dm.rel'), (cur.relations || []).length + refBy.length), (cur.relations || []).length + refBy.length ? el('div', { class: 'r-rows' }, [
          (cur.relations || []).map(function (x) { return nameRow(x.to, 'REC', x.many || ''); }),
          refBy.map(function (r) { var rel = (r.relations || []).filter(function (x) { return x.to === cur.name; })[0]; return nameRow(r.name, 'REC', '← ' + (rel.many || '').split('-').reverse().join('-')); })
        ]) : empty(t('none'))]),
        el('section', { class: 'r-obj-sec' }, [caption(t('dm.access'), (cur.access || []).length), (cur.access || []).length ? el('div', { class: 'r-rows' }, cur.access.map(function (a) {
          return el('div', { class: 'r-row r-row-acc' }, [el('b', { text: a.role }), el('span', { class: 'r-can' + (a.read ? '' : ' no'), text: t('dm.read') }), el('span', { class: 'r-can' + (a.write ? ' w' : ' no'), text: t('dm.write') })]);
        })) : empty(t('dm.noaccess'))])
      ]);
      add(body, split(list, detail, 'data'));
      keepFilterFocus();
    }
    function pageFlows() {
      var f0 = flowBy[route.id];
      var kind = route.q.kind && kindBy[route.q.kind] ? route.q.kind : f0 ? f0.kind : flowKinds[0].key;
      var k = kindBy[kind], all = flowsOfKind(kind), f = route.q.f || '';
      var shown = all.filter(function (x) { return matches(x, f); });
      var cur = f0 && f0.kind === kind ? f0 : shown[0];
      var partsWith = {}; all.forEach(function (x) { partsWith[partOf(x.name)] = 1; });
      setHead(k.label, t('fl.sub', { flows: N(all.length, flowForms(k)), parts: N(Object.keys(partsWith).length, 'part') }));
      var list = el('div', null, [el('div', { class: 'r-list-head' }, filterBox(f, function (v) { go({ page: 'flows', id: cur && cur.name, q: { kind: kind, f: v } }); })),
        shown.length ? groupedList(shown, cur, 'flows', function (x) { return (kindBy[x.kind] || k).tag; }, function (x) { return x.steps ? N(x.steps, 'step') : ''; }, f) : empty(t('fl.nomatch'), 'pad')]);
      if (!cur) { add(body, split(list, empty(t('empty.page')), 'flows')); return; }
      var callers = flows.filter(function (x) { return (x.calls || []).indexOf(cur.name) !== -1; }).map(function (x) { return x.name; });
      var from = (cur.from || []).filter(function (x) { return callers.indexOf(x) === -1; });
      var rs = risksNaming([cur.name]);
      function names(list2) { return list2.length ? el('div', { class: 'r-chips' }, list2.map(function (n) { return known[n] ? link({ page: known[n].page, id: known[n].id }, { class: 'r-chip r-mono' }, qn(n)) : el('span', { class: 'r-chip r-mono plain' }, qn(n)); })) : el('span', { class: 'r-muted', text: t('fl.nothing') }); }
      var facts = [
        [t('fl.params'), (cur.params || []).length ? el('div', { class: 'r-chips' }, cur.params.map(function (p) { return el('span', { class: 'r-chip r-mono plain' }, [p.name, p.type ? el('span', { class: 'r-muted', text: ': ' + p.type }) : null]); })) : el('span', { class: 'r-muted', text: t('fl.nothing') })],
        cur.returns ? [t('fl.returns'), el('span', { class: 'r-mono', text: cur.returns })] : null,
        [t('fl.from'), names(from.concat(callers))],
        (cur.roles || []).length ? [t('fl.roles'), el('div', { class: 'r-chips' }, cur.roles.map(function (r) { return el('span', { class: 'r-chip plain', text: r }); }))] : null,
        [t('fl.calls'), names(cur.calls || [])]
      ].filter(Boolean);
      var detail = el('article', { class: 'r-obj' }, [
        el('div', { class: 'r-pd-head' }, [el('span', { class: 'r-eyebrow' }, [kindTag(k.tag, 'acc'), ' ', partOf(cur.name) || '']), el('h2', { class: 'r-mono' }, qn(cur.name)),
          cur.summary ? el('p', { class: 'r-pd-lead small' }, [inline(cur.summary), ' ', aiMark()]) : null]),
        el('dl', { class: 'r-dl' }, facts.map(function (x) { return [el('dt', { text: x[0] }), el('dd', null, x[1])]; })),
        rs.length ? el('section', { class: 'r-obj-sec' }, [caption(t('fl.risks'), rs.length), el('div', { class: 'r-rows' }, rs.map(riskRow))]) : null,
        el('section', { class: 'r-obj-sec' }, [caption(t('fl.drawing'), cur.steps || null), cur.drawing && cur.drawing.length ? el('div', { class: 'r-drawing' }, drawFlow(cur.drawing, { params: (cur.params || []).map(function (p) { return p.name; }) })) : empty(t('fl.nodraw'))])
      ]);
      add(body, split(list, detail, 'flows'));
      keepFilterFocus();
    }
    function pageScreens() {
      var f = route.q.f || '';
      var shown = screens.filter(function (s) { return matches(s, f); });
      var cur = screenBy[route.id] || shown[0];
      var partsWith = {}; screens.forEach(function (s) { partsWith[partOf(s.name)] = 1; });
      setHead(PAGES.screens.label, t('sc.sub', { screens: N(screens.length, 'screen'), parts: N(Object.keys(partsWith).length, 'part') }));
      var list = el('div', null, [el('div', { class: 'r-list-head' }, filterBox(f, function (v) { go({ page: 'screens', id: cur && cur.name, q: { f: v } }); })),
        shown.length ? groupedList(shown, cur, 'screens', function () { return 'SCR'; }, function (s) { return (s.roles || []).join(', '); }, f) : empty(t('fl.nomatch'), 'pad')]);
      if (!cur) { add(body, split(list, empty(t('empty.page')), 'screens')); return; }
      function names(list2) { return list2 && list2.length ? el('div', { class: 'r-chips' }, list2.map(function (n) { return known[n] ? link({ page: known[n].page, id: known[n].id }, { class: 'r-chip r-mono' }, qn(n)) : el('span', { class: 'r-chip plain', text: n }); })) : el('span', { class: 'r-muted', text: t('fl.nothing') }); }
      var detail = el('article', { class: 'r-obj' }, [
        el('div', { class: 'r-pd-head' }, [el('span', { class: 'r-eyebrow' }, [kindTag('SCR', 'acc'), ' ', partOf(cur.name) || '']), el('h2', { class: 'r-mono' }, qn(cur.name)), cur.summary ? el('p', { class: 'r-pd-lead small' }, [inline(cur.summary), ' ', aiMark()]) : null]),
        el('dl', { class: 'r-dl' }, [[t('sc.roles'), (cur.roles || []).length ? el('div', { class: 'r-chips' }, cur.roles.map(function (r) { return el('span', { class: 'r-chip plain', text: r }); })) : el('span', { class: 'r-muted', text: t('fl.nothing') })],
          [t('sc.from'), names(cur.openedFrom)], [t('sc.starts'), names(cur.starts)], [t('sc.shows'), names(cur.shows)]].map(function (x) { return [el('dt', { text: x[0] }), el('dd', null, x[1])]; })),
        (function () { var rs = risksNaming([cur.name]); return rs.length ? el('section', { class: 'r-obj-sec' }, [caption(t('fl.risks'), rs.length), el('div', { class: 'r-rows' }, rs.map(riskRow))]) : null; })()
      ]);
      add(body, split(list, detail, 'screens'));
      keepFilterFocus();
    }

    // ================================================================ Risks
    function pageRisks() {
      var F = { level: route.q.level || null, theme: route.q.theme || null, part: route.q.part || null };
      var groupBy = route.q.group === 'part' ? 'part' : 'level';
      function pass(r, except) {
        return (except === 'level' || !F.level || r.level === F.level) && (except === 'theme' || !F.theme || r.theme === F.theme) && (except === 'part' || !F.part || r.part === F.part);
      }
      var shown = sortRisks(risks.filter(function (r) { return pass(r); }));
      var partsWith = {}; risks.forEach(function (r) { if (r.part) partsWith[r.part] = 1; });
      setHead(t('p.risks'), t('rk.sub', { findings: N(risks.length, 'finding'), parts: N(Object.keys(partsWith).length, 'part') }));
      function q(o) { return Object.assign({ level: F.level, theme: F.theme, part: F.part, group: groupBy === 'part' ? 'part' : null }, o); }
      var cur = riskBy[route.id];
      if (!cur || !pass(cur)) cur = shown[0] || null;
      if (riskBy[route.id] && !pass(riskBy[route.id])) cur = riskBy[route.id];
      function toggle(key, val) { var o = {}; o[key] = F[key] === val ? null : val; return { page: 'risks', id: cur ? cur.id : null, q: q(o) }; }

      // the profile: where they gather, severity, patterns
      var byPart = {}, partOrder = [];
      risks.forEach(function (r) { var p = r.part || '—'; if (!byPart[p]) { byPart[p] = []; partOrder.push(p); } });
      risks.forEach(function (r) { if (pass(r, 'part')) byPart[r.part || '—'].push(r); });
      var stableOrder = partOrder.slice().sort(function (a, b) { return risks.filter(function (r) { return (r.part || '—') === b; }).length - risks.filter(function (r) { return (r.part || '—') === a; }).length || a.localeCompare(b); });
      var maxPart = 1; stableOrder.forEach(function (p) { maxPart = Math.max(maxPart, byPart[p].length); });
      var facetParts = el('div', { class: 'r-fc' }, [el('div', { class: 'r-fc-h' }, [caption(t('rk.where.gather')), F.part ? link(toggle('part', F.part), { class: 'r-fc-clear' }, t('show.all')) : null]),
        el('div', { class: 'r-fc-rows' }, stableOrder.map(function (p) {
          var l = byPart[p];
          return link(toggle('part', p), { class: 'r-fc-part' + (F.part === p ? ' on' : '') + (l.length ? '' : ' dim'), 'aria-pressed': F.part === p ? 'true' : 'false' }, [el('span', { class: 'r-mono', text: p }),
            el('span', { class: 'r-modbar', 'aria-hidden': 'true' }, LEVELS.map(function (lv) { var n = levelCount(l, lv); return n ? el('span', { class: 'b-' + lv.toLowerCase(), style: 'width:' + (100 * n / maxPart) + '%' }) : null; })),
            el('span', { class: 'r-fc-n', text: String(l.length) })]);
        }))]);
      var sevList = risks.filter(function (r) { return pass(r, 'level'); });
      var facetSev = el('div', { class: 'r-fc' }, [el('div', { class: 'r-fc-h' }, [caption(t('rk.sev')), F.level ? link(toggle('level', F.level), { class: 'r-fc-clear' }, t('show.all')) : null]),
        el('div', { class: 'r-sevbar', 'aria-hidden': 'true' }, LEVELS.map(function (lv) { var n = levelCount(sevList, lv); return n ? el('span', { class: 'b-' + lv.toLowerCase() + (F.level && F.level !== lv ? ' dim' : ''), style: 'flex-grow:' + n }) : null; })),
        el('div', { class: 'r-fc-rows' }, LEVELS.map(function (lv) {
          var n = levelCount(sevList, lv);
          return link(toggle('level', lv), { class: 'r-fc-sev ' + lv.toLowerCase() + (F.level === lv ? ' on' : '') + (n ? '' : ' dim'), 'aria-pressed': F.level === lv ? 'true' : 'false' }, [lvBadge(lv), el('span', { class: 'r-fc-t' }, [el('b', { text: t('lv.' + lv) }), el('small', { text: t('when.' + lv) })]), el('span', { class: 'r-fc-n', text: String(n) })]);
        }))]);
      var themeKeys = Object.keys(themes);
      var facetPat = null;
      if (themeKeys.length) {
        var patList = risks.filter(function (r) { return pass(r, 'theme'); });
        var p1s = risks.filter(function (r) { return r.level === 'P1'; }), dom = null;
        themeKeys.forEach(function (k) { var n = p1s.filter(function (r) { return r.theme === k; }).length; if (p1s.length >= 2 && n * 2 > p1s.length) dom = [k, n]; });
        facetPat = el('div', { class: 'r-fc' }, [el('div', { class: 'r-fc-h' }, [caption(t('rk.pat')), F.theme ? link(toggle('theme', F.theme), { class: 'r-fc-clear' }, t('show.all')) : null]),
          dom ? el('p', { class: 'r-insight' }, el('b', { text: t('rk.dominant', { n: dom[1], m: p1s.length, theme: themes[dom[0]].name }) })) : null,
          el('div', { class: 'r-pats' }, themeKeys.map(function (k) {
            var l = patList.filter(function (r) { return r.theme === k; }), p1 = levelCount(l, 'P1');
            return link(toggle('theme', k), { class: 'r-pat' + (F.theme === k ? ' on' : '') + (l.length ? '' : ' dim'), title: themes[k].text || null, 'aria-pressed': F.theme === k ? 'true' : 'false' }, [p1 ? el('span', { class: 'r-p1dot', 'aria-hidden': 'true' }) : null, el('span', { text: themes[k].name }), el('span', { class: 'r-fc-n', text: String(l.length) })]);
          }))]);
      }
      var strip = el('div', { class: 'r-rk-strip' + (facetPat ? '' : ' two') }, [facetParts, facetSev, facetPat]);

      // the list
      var chips = [];
      if (F.level) chips.push([F.level + ' · ' + t('lv.' + F.level), 'level']);
      if (F.theme && themes[F.theme]) chips.push([themes[F.theme].name, 'theme']);
      if (F.part) chips.push([F.part, 'part']);
      var groups = [];
      if (groupBy === 'part') {
        var gp = {}; shown.forEach(function (r) { var p = r.part || '—'; if (!gp[p]) { gp[p] = []; groups.push([p, gp[p]]); } gp[p].push(r); });
      } else LEVELS.forEach(function (lv) { var l = shown.filter(function (r) { return r.level === lv; }); if (l.length) groups.push([lv, l]); });
      var listNode = el('div', { class: 'r-rk-list' }, [
        el('div', { class: 'r-rk-lh' }, [el('div', { class: 'r-rk-lh-row' }, [el('b', { text: shown.length === risks.length ? N(risks.length, 'finding') : t('rk.count.f', { n: shown.length, findings: N(risks.length, 'finding') }) }),
          seg([['level', t('rk.bylevel')], ['part', t('rk.bypart')]], groupBy, function (v) { go({ page: 'risks', id: cur ? cur.id : null, q: q({ group: v === 'part' ? 'part' : null }) }); }, t('rk.group'))]),
          chips.length ? el('div', { class: 'r-rk-chips' }, chips.map(function (c) { return link(toggle(c[1], F[c[1]]), { class: 'r-rk-chip' }, [el('span', { text: c[0] }), icon('close', 12)]); })) : null]),
        shown.length ? groups.map(function (g) {
          return [groupBy === 'part' ? el('div', { class: 'r-rk-g' }, [el('b', { class: 'r-mono', text: g[0] }), el('span', { class: 'r-fc-n', text: String(g[1].length) })])
            : el('div', { class: 'r-rk-g' }, [lvBadge(g[0]), el('b', { text: t('lv.' + g[0]) }), el('small', { text: t('when.' + g[0]) }), el('span', { class: 'r-fc-n', text: String(g[1].length) })]),
          g[1].map(function (r) {
            var on = cur && cur.id === r.id;
            return link({ page: 'risks', id: r.id, q: q({}) }, { class: 'r-rk-row' + (on ? ' on' : ''), 'aria-current': on ? 'true' : null }, [lvBadge(r.level),
              el('span', { class: 'r-rk-t' }, [el('b', { text: r.title }), el('small', { text: [r.part, r.theme && themes[r.theme] ? themes[r.theme].name : null, N(r.where.length, 'place')].filter(Boolean).join(' · ') })])]);
          })];
        }) : el('div', { class: 'r-pad' }, [empty(t('rk.nomatch')), link({ page: 'risks' }, { class: 'r-btn' }, t('show.all'))])
      ]);

      // one finding
      var detail = cur ? riskDetail(cur, shown, q) : el('div', { class: 'r-pad' }, empty(t('rk.nomatch')));
      add(tools, null);
      add(body, el('div', { class: 'r-rk' }, [strip, el('div', { class: 'r-split r-rk-body' }, [el('div', { class: 'r-list', 'data-keep': 'risk-list' }, listNode), el('div', { class: 'r-detail', 'data-keep': 'risk-detail' }, detail)])]));
      requestAnimationFrame(function () { var on = body.querySelector('.r-rk-row.on'), box = body.querySelector('.r-rk-list') && body.querySelector('.r-rk-list').parentNode; if (on && box) keepInView(box, on); });
    }
    function keepInView(box, node) {
      var b = box.getBoundingClientRect(), r = node.getBoundingClientRect();
      if (r.top < b.top + 60) box.scrollTop += r.top - b.top - 60; else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 12;
    }
    function riskDetail(r, shown, q) {
      var sameLevel = shown.filter(function (x) { return x.level === r.level; });
      var pos = sameLevel.indexOf(r), all = shown.indexOf(r);
      var prev = all > 0 ? shown[all - 1] : null, next = all >= 0 && all < shown.length - 1 ? shown[all + 1] : null;
      function nav(x, ic, label) { return x ? link({ page: 'risks', id: x.id, q: q({}) }, { class: 'r-icon-btn', 'aria-label': label, title: label }, icon(ic, 14)) : el('span', { class: 'r-icon-btn off', 'aria-hidden': 'true' }, icon(ic, 14)); }
      var same = r.theme ? sortRisks(risks.filter(function (x) { return x !== r && x.theme === r.theme; })) : [];
      var also = r.part ? sortRisks(risks.filter(function (x) { return x !== r && x.part === r.part; })) : [];
      return el('article', { class: 'r-rk-main' }, [
        el('div', { class: 'r-rk-top' }, [el('div', { class: 'r-rk-navs' }, [nav(prev, 'up', t('rk.prev')), nav(next, 'chevron-down', t('rk.next')),
          pos >= 0 ? el('span', { text: t('rk.pos', { level: r.level, i: pos + 1, n: sameLevel.length }) }) : null]), el('span', { class: 'r-mono r-muted', text: r.id })]),
        el('div', { class: 'r-rk-head' }, [
          el('div', { class: 'r-rk-pills' }, [el('span', { class: 'r-rk-sev ' + r.level.toLowerCase(), text: r.level + ' · ' + t('lv.' + r.level) }),
            r.theme && themes[r.theme] ? link({ page: 'risks', id: r.id, q: { theme: r.theme } }, { class: 'r-rk-pill' }, themes[r.theme].name) : null,
            r.part ? link({ page: 'risks', id: r.id, q: { part: r.part } }, { class: 'r-rk-pill r-mono' }, r.part) : null]),
          el('h2', { text: r.title }), el('p', { class: 'r-rk-when', text: t('when.' + r.level) + '.' })
        ]),
        r.detail ? el('section', { class: 'r-rk-sec' }, [caption(t('rk.happens')), el('div', { class: 'r-prose' }, prose(r.detail))]) : null,
        r.fix ? el('section', { class: 'r-rk-fix' }, [el('h3', { class: 'r-cap acc' }, [icon('check', 14), t('rk.todo')]), el('p', null, inline(r.fix))]) : null,
        r.where.length ? el('section', { class: 'r-rk-sec' }, [caption(t('rk.where'), N(r.where.length, 'place')), el('div', { class: 'r-rows' }, r.where.map(function (w) {
          var k = known[w];
          var kids = [kindTag(k ? k.tag : '··'), el('span', { class: 'r-row-qn' }, qn(w)), k ? el('span', { class: 'r-open' }, [t('rk.open'), icon('arrow', 13)]) : el('span')];
          return k ? link({ page: k.page, id: k.id }, { class: 'r-row r-row-where' }, kids) : el('div', { class: 'r-row r-row-where' }, kids);
        }))]) : null,
        same.length ? el('section', { class: 'r-rk-sec' }, [el('div', { class: 'r-rk-sec-h' }, [caption(t('rk.same')), same.length > 6 ? link({ page: 'risks', q: { theme: r.theme } }, { class: 'r-more' }, t('rk.all.pat', { n: same.length + 1 })) : null]),
          el('div', { class: 'r-rows' }, same.slice(0, 6).map(riskRow))]) : null,
        also.length ? el('section', { class: 'r-rk-sec' }, [el('div', { class: 'r-rk-sec-h' }, [caption(t('rk.also', { part: r.part })), link({ page: 'risks', q: { part: r.part } }, { class: 'r-more' }, t('rk.all.part', { n: also.length + 1, part: r.part }))]),
          el('div', { class: 'r-rows' }, also.slice(0, 5).map(riskRow))]) : null,
        prov(t('rk.prov'))
      ]);
    }

    // ================================================================ Quality
    function pageQuality() {
      setHead(t('p.quality'), t('q.sub', { checks: N(quality.length, 'check') }));
      var cur = quality.filter(function (q) { return q.id === route.id; })[0] || quality[0];
      var cards = el('div', { class: 'r-q-cards' }, quality.map(function (q) {
        var on = q === cur;
        return link({ page: 'quality', id: q.id }, { class: 'r-q-card' + (on ? ' on' : ''), 'aria-current': on ? 'true' : null }, [
          el('span', { class: 'r-q-g' }, [el('span', { text: q.group || '' }), el('span', { class: 'r-q-dot' + (q.warn && q.count ? ' warn' : ''), 'aria-hidden': 'true' })]),
          el('span', { class: 'r-q-v' }, [el('span', { class: 'r-mono', text: numFmt.format(q.count || 0) }), q.total ? el('small', { text: t('q.of', { n: numFmt.format(q.total) }) }) : null]),
          el('b', { text: q.label }), q.sub ? el('small', { text: q.sub }) : null]);
      }));
      var rows = (cur.items && cur.items.rows) || [], cols = (cur.items && cur.items.columns) || [];
      var MAX = 20;
      var detail = el('div', { class: 'r-q-detail' }, [
        el('div', { class: 'r-q-left' }, [el('h2', { text: cur.label }), cur.explain ? el('div', { class: 'r-prose' }, prose(cur.explain)) : null,
          cur.rule && cur.rule.quote ? el('figure', { class: 'r-q-rule' }, [el('span', { class: 'r-cap', text: t('q.rule') }), el('blockquote', { text: cur.rule.quote }), cur.rule.source ? el('figcaption', { text: cur.rule.source }) : null])
            : el('p', { class: 'r-hint', text: t('q.norule') })]),
        el('div', { class: 'r-q-right' }, [caption(t('q.found'), numFmt.format(cur.count || 0)), rows.length ? [table(cols, rows.slice(0, MAX), true), rows.length > MAX ? el('p', { class: 'r-hint', text: t('q.more', { n: rows.length - MAX }) }) : null] : empty(t('q.none'))])
      ]);
      add(body, doc(el('div', { class: 'r-q' }, [cards, detail])));
    }

    // ================================================================ For developers
    function pageDevelopers() {
      setHead(t('p.developers'), t('dv.sub', { app: appName }));
      var tabs = [['where', t('dv.where'), dev.where || []], ['naming', t('dv.naming'), dev.conventions || []], ['pitfalls', t('dv.pitfalls'), dev.pitfalls || []]].filter(function (x) { return x[2].length; });
      var tab = tabs.filter(function (x) { return x[0] === route.q.tab; })[0] || tabs[0];
      var f = route.q.f || '', s = fold(f);
      function hit(text) { return !s || fold(text).indexOf(s) !== -1; }
      var content;
      if (tab[0] === 'where') {
        var l = tab[2].filter(function (x) { return hit(x.topic + ' ' + x.place); });
        content = l.length ? el('div', { class: 'r-dv-where' }, l.map(function (x) { return el('div', { class: 'r-dv-q' }, [el('b', { text: x.topic }), el('p', null, inline(x.place))]); })) : empty(t('dv.nomatch'));
      } else if (tab[0] === 'naming') {
        var l2 = tab[2].filter(function (x) { return hit(x.pattern + ' ' + x.meaning); });
        content = l2.length ? el('div', { class: 'r-table' }, el('table', null, [el('thead', null, el('tr', null, [t('dv.pattern'), t('dv.means'), t('dv.count')].map(function (c, i) { return el('th', { class: i === 2 ? 'num' : null, text: c }); }))),
          el('tbody', null, l2.map(function (x) { return el('tr', null, [el('td', null, el('code', { class: 'r-code', text: x.pattern })), el('td', null, inline(x.meaning)), el('td', { class: 'num', text: x.count !== undefined ? numFmt.format(x.count) : '—' })]); }))])) : empty(t('dv.nomatch'));
      } else {
        var l3 = tab[2].map(function (x, i) { return [x, i]; }).filter(function (x) { return hit(x[0]); });
        content = l3.length ? el('ol', { class: 'r-numbered' }, l3.map(function (x) { return el('li', null, [el('span', { class: 'r-mono', text: pad2(x[1] + 1) }), el('span', null, inline(x[0]))]); })) : empty(t('dv.nomatch'));
      }
      var inp = el('input', { type: 'search', class: 'r-filter', placeholder: t('dv.filter'), 'aria-label': t('dv.filter'), value: f });
      var timer = null;
      inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { go({ page: 'developers', q: { tab: tab[0] === 'where' ? null : tab[0], f: inp.value } }); }, 160); });
      add(body, doc(el('div', { class: 'r-dv' }, [
        el('div', { class: 'r-dv-bar' }, [el('div', { class: 'r-tabs', role: 'tablist' }, tabs.map(function (x) {
          return link({ page: 'developers', q: { tab: x[0] === 'where' ? null : x[0] } }, { class: 'r-tab' + (x === tab ? ' on' : ''), role: 'tab', 'aria-selected': x === tab ? 'true' : 'false' }, [x[1], el('i', { text: String(x[2].length) })]);
        })), el('label', { class: 'r-filter-box' }, [icon('filter', 14), inp])]),
        content, prov(t('pr.prov'))
      ])));
      if (f) { inp.focus(); inp.setSelectionRange(f.length, f.length); }
    }

    // ================================================================ the flow drawing
    // A process diagram and a flow are drawn alike, top to bottom: the main path
    // straight down, every other way out of a decision to the right with its own
    // steps under its label, either rejoining the main path, continuing at a
    // step further on ("join"), or ending. Rows of one three-column grid: the
    // node, the line leading right, and what leaves to the side.
    var FAM = { person: ['person', 'r-k-person'], app: ['app', 'r-k-app'], read: ['read', 'r-k-read'], change: ['change', 'r-k-change'], save: ['save', 'r-k-save'],
      'delete': ['delete', 'r-k-save'], call: ['call', 'r-k-call'], show: ['show', 'r-k-change'], message: ['message', 'r-k-var'], 'var': [null, 'r-k-var'] };
    function toWorkflow(items, opts) {
      var no = 0, at = {};
      (function number(list) {
        (list || []).forEach(function (x) {
          if (x.step !== undefined) at[x.step] = ++no;
          else if (x.decision !== undefined) { ++no; (x.ways || []).forEach(function (w) { number(w.then); }); }
          else if (x.loop !== undefined) { ++no; number(x.body); }
        });
      })(items);
      no = 0;
      function ends(list) { var last = list[list.length - 1]; return !!last && (last.t === 'end' || last.t === 'go' || (last.t === 'split' && last.branches.every(function (b) { return b.ends; }))); }
      function conv(list) {
        return (list || []).map(function (x) {
          if (x.step !== undefined) {
            var fam = opts.process ? (x.by === 'person' || (x.who && x.by !== 'app') ? 'person' : 'app') : (FAM[x.kind] ? x.kind : 'var');
            var kick = opts.process ? (fam === 'person' ? (x.who || '') : t('pr.app.by')) : t('k.' + fam);
            return { t: 'step', no: ++no, fam: fam, kick: kick, title: x.step, value: x.value || null };
          }
          if (x.decision !== undefined) {
            var n = ++no;
            return { t: 'split', no: n, title: x.decision, branches: (x.ways || []).map(function (w) {
              var b = conv(w.then);
              if (w.end) b.push({ t: 'end', label: w.end });
              else if (w.join && at[w.join]) b.push({ t: 'go', no: at[w.join], back: at[w.join] <= n });
              return { label: w.label, body: b, ends: ends(b) };
            }) };
          }
          if (x.loop !== undefined) { var ln = ++no; return { t: 'loop', no: ln, title: x.loop, body: conv(x.body) }; }
          if (x.end !== undefined) return { t: 'end', label: x.end, returns: x.returns || null };
          return null;
        }).filter(Boolean);
      }
      return conv(items);
    }
    function count(list) { var n = 0; (list || []).forEach(function (b) { n++; if (b.t === 'split') b.branches.forEach(function (x) { n += count(x.body); }); if (b.body) n += count(b.body); }); return n; }
    // Which way stays on the main path: one that does not end before one that does;
    // among those, the shorter (the side shows the detour); when all end, the longer.
    function mainBranch(sp) {
      var bs = sp.branches;
      if (bs.length < 2) return 0;
      var sizes = bs.map(function (b) { return count(b.body); }), big = sizes.indexOf(Math.max.apply(null, sizes));
      if (sizes[big] >= 8 && sizes.every(function (n, i) { return i === big || sizes[big] > 2 * n; })) return big;
      var allEnd = bs.every(function (b) { return b.ends; });
      var idx = bs.map(function (b, i) { return i; });
      idx.sort(function (i, j) {
        var a = bs[i], b = bs[j];
        if (a.ends !== b.ends) return a.ends ? 1 : -1;
        var d = count(a.body) - count(b.body);
        if (d) return allEnd ? -d : d;
        return i - j;
      });
      return idx[0];
    }
    function drawFlow(items, opts) {
      opts = opts || {};
      var fits = [];
      function tile(fam, size) {
        var f = FAM[fam] || FAM['var'];
        var n = el('span', { class: 'r-fg-tile ' + f[1] + ' s' + size, 'aria-hidden': 'true' });
        if (f[0]) n.appendChild(icon(f[0], size > 24 ? 15 : 13)); else n.textContent = 'x=';
        return n;
      }
      function card(b, small) {
        return el('div', { class: 'r-fg-card' + (small ? ' small' : '') + (opts.process ? ' biz' : '') }, [tile(b.fam, small ? 24 : 30),
          el('span', { class: 'r-fg-text' }, [b.kick ? el('span', { class: 'r-fg-kind', text: b.kick }) : null, el('span', { class: 'r-fg-main', text: b.title }), b.value ? el('span', { class: 'r-fg-value', text: b.value }) : null]),
          el('span', { class: 'r-fg-no', text: String(b.no) })]);
      }
      function decision(b, small) {
        return el('div', { class: 'r-fg-decision' + (small ? ' small' : '') }, [el('span', { class: 'r-fg-rhomb', 'aria-hidden': 'true' }), el('span', { class: 'r-fg-dec-t', text: b.title || t('fg.decision') }), el('span', { class: 'r-fg-no', text: String(b.no) })]);
      }
      function endPill(b) { return el('span', { class: 'r-fg-pill r-fg-end' }, [el('span', { class: 'r-fg-ring', 'aria-hidden': 'true' }), el('span', { text: b.label }), b.returns ? el('span', { class: 'r-fg-mono', text: '· ' + t('fg.returns', { x: b.returns }) }) : null]); }
      function sideEnd(b) { return el('span', { class: 'r-fg-side-end' }, [el('span', { class: 'r-fg-ring small', 'aria-hidden': 'true' }), el('span', { text: b.label })]); }
      function goText(b) { return b.back ? t('fg.back', { n: b.no }) : t('fg.continues', { n: b.no }); }
      function rejoin(text) { return el('span', { class: 'r-fg-rejoin' }, [icon('rejoin', 13), el('span', { text: text })]); }
      function sideWay(label, body2, ends2) {
        var out = [el('span', { class: 'r-fg-label', text: label === null || label === undefined ? t('fg.otherwise') : label })];
        sideItems(body2).forEach(function (n) { out.push(n); });
        if (!ends2) out.push(rejoin(t('fg.rejoins')));
        return el('div', { class: 'r-fg-way' }, out);
      }
      function sideItems(list) {
        var out = [];
        (list || []).forEach(function (b) {
          if (b.t === 'step') out.push(card(b, true));
          else if (b.t === 'split') { out.push(decision(b, true)); out.push(el('div', { class: 'r-fg-nest' }, b.branches.map(function (br) { return sideWay(br.label, br.body, br.ends); }))); }
          else if (b.t === 'loop') out.push(el('div', { class: 'r-fg-nest loop' }, [el('span', { class: 'r-fg-label', text: b.title })].concat(sideItems(b.body))));
          else if (b.t === 'end') out.push(sideEnd(b));
          else if (b.t === 'go') out.push(rejoin(goText(b)));
        });
        return out;
      }
      function row(main, side, o) { o = o || {}; return { main: main, side: side, full: !!o.full, wide: !!o.wide, last: !!o.last }; }
      function gap(label) { return { gap: true, label: label }; }
      function place(node, r, c) { node.style.gridRow = r; node.style.gridColumn = c; return node; }
      function assemble(rows) {
        var wide = rows.some(function (r) { return r.side || (r.full && r.wide); });
        var grid = el('div', { class: 'r-fg-grid' + (wide ? '' : ' single') });
        grid.fgWide = wide;
        for (var k = rows.length - 1; k >= 0; k--) { if (!rows[k].gap) { rows[k].last = true; break; } }
        var spanEnd = [], stretchAfter = {};
        rows.forEach(function (r, i) {
          if (!r.side) return;
          var span = 1;
          while (i + span < rows.length && !rows[i + span].side && !rows[i + span].full) span++;
          spanEnd[i] = i + span - 1; stretchAfter[i + span - 1] = true;
        });
        var line = [], stretchLine = {}, n = 0;
        rows.forEach(function (r, i) { line[i] = ++n; if (stretchAfter[i]) stretchLine[i] = ++n; });
        var firstCell = [], stretchCell = {};
        rows.forEach(function (r, i) {
          if (r.gap) firstCell[i] = place(el('div', { class: 'r-fg-cell r-fg-gap', 'aria-hidden': 'true' }, [el('span', { class: 'r-fg-vline' }), r.label ? el('span', { class: 'r-fg-gap-label', text: r.label }) : null]), String(line[i]), '1');
          else {
            var spans = r.full && r.wide;
            firstCell[i] = place(el('div', { class: 'r-fg-cell' + (spans ? ' full' : '') + (r.side ? ' with-side' : '') }, [r.main, r.last || r.full ? null : el('span', { class: 'r-fg-extend', 'aria-hidden': 'true' })]), String(line[i]), spans ? '1 / -1' : '1');
          }
          grid.appendChild(firstCell[i]);
          if (stretchAfter[i]) {
            stretchCell[i] = place(el('div', { class: 'r-fg-cell r-fg-stretch', 'aria-hidden': 'true' }, rows[i].last ? [] : [el('span', { class: 'r-fg-vline' })]), String(stretchLine[i]), '1');
            grid.appendChild(stretchCell[i]);
          }
        });
        rows.forEach(function (r, i) {
          if (!r.side) return;
          grid.appendChild(place(el('div', { class: 'r-fg-link', 'aria-hidden': 'true' }, el('span', { class: 'r-fg-hline' })), String(line[i]), '2'));
          var cell = place(el('div', { class: 'r-fg-side-cell' }, r.side), line[i] + ' / ' + (stretchLine[spanEnd[i]] + 1), '3');
          fits.push({ grid: grid, side: cell, first: firstCell[i], stretch: stretchCell[spanEnd[i]] });
          grid.appendChild(cell);
        });
        return grid;
      }
      function mainRows(list, rows, startLabel) {
        var pending = startLabel || null;
        function push(r) { if (rows.length) rows.push(gap(pending)); pending = null; rows.push(r); }
        (list || []).forEach(function (b) {
          if (b.t === 'step') push(row(card(b, false), null));
          else if (b.t === 'split') {
            var mi = mainBranch(b), main = b.branches[mi], sides = b.branches.filter(function (x, i) { return i !== mi; });
            push(row(decision(b, false), sides.length ? el('div', { class: 'r-fg-side' }, sides.map(function (br) { return sideWay(br.label, br.body, br.ends); })) : null));
            var lab = main ? (main.label === null || main.label === undefined ? t('fg.otherwise') : main.label) : null;
            if (main && main.body.length) { mainRows(main.body, rows, lab); pending = null; } else pending = lab;
          } else if (b.t === 'loop') {
            var inner = assemble(mainRows(b.body, [], null));
            push(row(el('div', { class: 'r-fg-loop' }, [el('span', { class: 'r-fg-loop-h' }, [icon('loop', 13), el('span', { text: b.title })]), inner]), null, { full: true, wide: inner.fgWide }));
          } else if (b.t === 'end') push(row(endPill(b), null, { last: true }));
          else if (b.t === 'go') push(row(rejoin(goText(b)), null, { last: true }));
        });
        return rows;
      }
      var params = opts.params || [];
      var start = el('span', { class: 'r-fg-pill r-fg-start' }, [el('span', { class: 'r-fg-start-dot', 'aria-hidden': 'true' }), el('span', { text: t('fg.start') }), params.length ? el('span', { class: 'r-fg-mono', text: params.join(' · ') }) : null]);
      var top = assemble(mainRows(toWorkflow(items, opts), [row(start, null)], null));
      var rootN = el('div', { class: 'r-fg' + (top.fgWide ? '' : ' single') }, top);
      whenShown(rootN, function () { fit(fits); });
      return rootN;
    }
    // A way out to the side does not size the rows beside it; once laid out, the
    // stretch of line at the end of those rows gets exactly the height it lacks.
    function fit(fits) {
      var depth = function (n) { var d = 0; while (n && n.parentElement) { if (n.classList && n.classList.contains('r-fg-grid')) d++; n = n.parentElement; } return d; };
      var list = fits.filter(function (f) { return f.side.isConnected && f.side.offsetParent !== null; }).sort(function (a, b) { return depth(b.grid) - depth(a.grid); });
      list.forEach(function (f) { f.stretch.style.height = '0px'; });
      list.forEach(function (f) {
        var top = f.first.getBoundingClientRect().top, room = f.stretch.getBoundingClientRect().top - top;
        var need = f.side.firstChild.getBoundingClientRect().height + 12;
        f.stretch.style.height = Math.max(0, Math.ceil(need - room)) + 'px';
      });
    }
    function whenShown(node, fn) {
      var tries = 0, width = -1;
      (function tick() {
        if (!node.isConnected || node.offsetParent === null) { if (tries++ < 200) setTimeout(tick, 25); return; }
        width = node.getBoundingClientRect().width;
        fn();
        if (window.ResizeObserver) new ResizeObserver(function () { var w = node.getBoundingClientRect().width; if (Math.abs(w - width) > 1) { width = w; fn(); } }).observe(node);
      })();
    }

    // ================================================================ search
    var searchIndex = null;
    function buildIndex() {
      var names = [], texts = [];
      processes.forEach(function (p, i) { names.push({ tag: 'PRC', name: p.name, r: { page: 'processes', id: String(i + 1) } }); texts.push({ where: p.name, text: [p.summary, p.story].concat(p.steps.map(function (s) { return s.text; })).join(' '), r: { page: 'processes', id: String(i + 1) } }); });
      parts.forEach(function (p) { names.push({ tag: 'MOD', name: p.name, mono: true, r: { page: 'modules', id: p.name } }); texts.push({ where: p.name, text: [p.summary, p.story].concat((p.notes || []).map(function (n) { return [n.title, n.text, (n.items || []).join(' ')].join(' '); })).join(' '), r: { page: 'modules', id: p.name } }); });
      flows.forEach(function (f) { names.push({ tag: (kindBy[f.kind] || {}).tag || 'FL', name: f.name, mono: true, r: { page: 'flows', id: f.name } }); if (f.summary) texts.push({ where: f.name, text: f.summary, r: { page: 'flows', id: f.name } }); });
      screens.forEach(function (s) { names.push({ tag: 'SCR', name: s.name, mono: true, r: { page: 'screens', id: s.name } }); if (s.summary) texts.push({ where: s.name, text: s.summary, r: { page: 'screens', id: s.name } }); });
      records.forEach(function (r) { names.push({ tag: 'REC', name: r.name, mono: true, r: { page: 'data', id: r.name } }); if (r.summary) texts.push({ where: r.name, text: r.summary + ' ' + (r.fields || []).map(function (f) { return f.name; }).join(' '), r: { page: 'data', id: r.name } }); });
      risks.forEach(function (r) { names.push({ tag: r.level, name: r.title, r: { page: 'risks', id: r.id } }); texts.push({ where: r.id + ' · ' + r.title, text: [r.detail, r.fix].join(' '), r: { page: 'risks', id: r.id } }); });
      quality.forEach(function (q) { names.push({ tag: 'CHK', name: q.label, r: { page: 'quality', id: q.id } }); });
      if (app.story || app.summary) texts.push({ where: t('pr.app'), text: [app.summary, app.story].join(' '), r: { page: 'processes', id: '0' } });
      (dev.where || []).forEach(function (x) { texts.push({ where: t('dv.where'), text: x.topic + ' — ' + x.place, r: { page: 'developers' } }); });
      (dev.pitfalls || []).forEach(function (x) { texts.push({ where: t('dv.pitfalls'), text: x, r: { page: 'developers', q: { tab: 'pitfalls' } } }); });
      (arch.open || []).forEach(function (x) { texts.push({ where: t('ar.open'), text: x, r: { page: 'architecture', q: { s: 'open' } } }); });
      names.forEach(function (n) { n.key = fold(n.name); });
      texts.forEach(function (x) { x.text = x.text.replace(/`/g, ''); x.key = fold(x.text); });
      return { names: names, texts: texts };
    }
    var dlg = null;
    function openSearch(initial) {
      if (!searchIndex) searchIndex = buildIndex();
      if (dlg) { dlg.input.focus(); return; }
      var before = document.activeElement;
      var input = el('input', { type: 'search', class: 'r-search-in', placeholder: t('search.ph'), 'aria-label': t('search'), autocomplete: 'off', spellcheck: 'false' });
      var results = el('div', { class: 'r-search-res', role: 'listbox' });
      var box = el('div', { class: 'r-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('search') }, [
        el('div', { class: 'r-search-bar' }, [icon('search', 16), input, el('button', { type: 'button', class: 'r-icon-btn', 'aria-label': t('close'), onclick: closeSearch }, icon('close', 14))]), results]);
      var scrim = el('div', { class: 'r-scrim', onclick: function (e) { if (e.target === scrim) closeSearch(); } }, box);
      document.body.appendChild(scrim);
      dlg = { scrim: scrim, input: input, before: before, sel: 0 };
      function show() {
        clear(results);
        var q = fold(input.value.trim());
        if (!q) { add(results, el('p', { class: 'r-search-hint', text: t('search.hint') })); return; }
        var nm = searchIndex.names.filter(function (n) { return n.key.indexOf(q) !== -1; }).sort(function (a, b) { return a.key.indexOf(q) - b.key.indexOf(q) || a.name.length - b.name.length; }).slice(0, 12);
        var tx = searchIndex.texts.filter(function (x) { return x.key.indexOf(q) !== -1; }).slice(0, 10);
        if (!nm.length && !tx.length) { add(results, el('p', { class: 'r-search-hint', text: t('search.none', { q: input.value.trim() }) })); return; }
        if (nm.length) add(results, [el('div', { class: 'r-search-cap', text: t('search.names') }), nm.map(function (n) { return link(n.r, { class: 'r-search-row', role: 'option', onclick: closeSearch }, [kindTag(n.tag, /^P\d$/.test(n.tag) ? n.tag.toLowerCase() : null), el('span', { class: n.mono ? 'r-mono' : null }, n.mono ? qn(n.name) : n.name)]); })]);
        if (tx.length) add(results, [el('div', { class: 'r-search-cap', text: t('search.text') }), tx.map(function (x) {
          var i = x.key.indexOf(q), a = Math.max(0, i - 50), snippet = x.text.slice(a, i + q.length + 80);
          var j = i - a;
          return link(x.r, { class: 'r-search-row text', role: 'option', onclick: closeSearch }, [el('b', { text: x.where }), el('span', null, [(a ? '…' : '') + snippet.slice(0, j), el('mark', { text: snippet.slice(j, j + q.length) }), snippet.slice(j + q.length) + '…'])]);
        })]);
        dlg.sel = 0; mark();
      }
      function rowsNow() { return Array.prototype.slice.call(results.querySelectorAll('.r-search-row')); }
      function mark() { rowsNow().forEach(function (r, i) { r.classList.toggle('on', i === dlg.sel); if (i === dlg.sel) r.setAttribute('aria-selected', 'true'); else r.removeAttribute('aria-selected'); }); }
      input.addEventListener('input', show);
      box.addEventListener('keydown', function (e) {
        var rs = rowsNow();
        if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
        else if (e.key === 'ArrowDown' && rs.length) { e.preventDefault(); dlg.sel = (dlg.sel + 1) % rs.length; mark(); rs[dlg.sel].scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'ArrowUp' && rs.length) { e.preventDefault(); dlg.sel = (dlg.sel - 1 + rs.length) % rs.length; mark(); rs[dlg.sel].scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'Enter' && document.activeElement === input && rs[dlg.sel]) { e.preventDefault(); rs[dlg.sel].click(); }
        else if (e.key === 'Tab') {
          var f = Array.prototype.slice.call(box.querySelectorAll('input, button, a[href]'));
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      });
      if (initial) input.value = initial;
      show();
      input.focus();
    }
    function closeSearch() {
      if (!dlg) return;
      var d = dlg; dlg = null;
      d.scrim.parentNode.removeChild(d.scrim);
      if (d.before && d.before.focus) try { d.before.focus(); } catch (e) { /* gone */ }
    }
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openSearch(); return; }
      var tag = (e.target && e.target.tagName) || '';
      if (e.key === '/' && !dlg && !/INPUT|TEXTAREA|SELECT/.test(tag) && !(e.target && e.target.isContentEditable)) { e.preventDefault(); openSearch(); }
    });

    // ================================================================ theme, link, Markdown, print
    function initTheme() {
      var KEY = 'report-theme', choice = 'auto';
      try { choice = localStorage.getItem(KEY) || 'auto'; } catch (e) { /* storage blocked: Auto */ }
      var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      function apply() {
        var dark = choice === 'dark' || (choice === 'auto' && mq && mq.matches);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        Object.keys(themeBtns).forEach(function (k) { themeBtns[k].classList.toggle('on', k === choice); themeBtns[k].setAttribute('aria-pressed', k === choice ? 'true' : 'false'); });
      }
      if (mq) { var on = function () { if (choice === 'auto') apply(); }; if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }
      return { set: function (c) { choice = c; try { localStorage.setItem(KEY, c); } catch (e) { /* not remembered */ } apply(); }, apply: apply };
    }
    function copyLink() {
      var url = location.href;
      function done() {
        var label = copyBtn.querySelector('span');
        label.textContent = t('copied'); copyBtn.classList.add('ok');
        setTimeout(function () { label.textContent = t('copy'); copyBtn.classList.remove('ok'); }, 2000);
      }
      function fallback() {
        var ta = el('textarea', { class: 'r-offscreen', 'aria-hidden': 'true' }); ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { /* nothing more to try */ }
        document.body.removeChild(ta); done();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
    }
    function downloadMd() {
      var text = markdown(data);
      var a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })), download: String(appName).replace(/[^\w.-]+/g, '-') + '-documentation.md' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }
    var printTheme = null;
    window.addEventListener('beforeprint', function () {
      printTheme = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', 'light');
      Array.prototype.forEach.call(document.querySelectorAll('details.r-fold'), function (d) { if (!d.open) { d.open = true; d.setAttribute('data-print-opened', ''); } });
    });
    window.addEventListener('afterprint', function () {
      if (printTheme) document.documentElement.setAttribute('data-theme', printTheme);
      Array.prototype.forEach.call(document.querySelectorAll('details[data-print-opened]'), function (d) { d.open = false; d.removeAttribute('data-print-opened'); });
    });

    theme.apply();
    window.addEventListener('hashchange', render);
    render();
    return { render: render, openSearch: openSearch };
  }

  // ================================================================ the Markdown copy
  // The same content in the same page order; drawings become numbered lists and
  // tables. Pure: no DOM, so build.js can write it in Node too.
  function markdown(data) {
    data = data || {};
    var lang = LABELS[data.lang] ? data.lang : 'en', L = LABELS[lang], LE = LABELS.en;
    function t(k, v) { var s = L[k] !== undefined ? L[k] : LE[k] !== undefined ? LE[k] : k; if (v) s = s.replace(/\{(\w+)\}/g, function (m, x) { return v[x] !== undefined ? v[x] : m; }); return s; }
    var out = [];
    function w(s) { out.push(s === undefined ? '' : s); }
    function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[<>]/g, function (c) { return c === '<' ? '&lt;' : '&gt;'; }); }
    function cell(s) { return esc(s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' '); }
    function paras(s) { String(s || '').split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean).forEach(function (p) { w(esc(p)); w(); }); }
    function tableMd(head, rows) { if (!rows.length) return; w('| ' + head.map(cell).join(' | ') + ' |'); w('|' + head.map(function () { return '---'; }).join('|') + '|'); rows.forEach(function (r) { w('| ' + r.map(cell).join(' | ') + ' |'); }); w(); }
    function steps(list, depth) {
      var pad = new Array(depth + 1).join('   ');
      (list || []).forEach(function (x) {
        if (x.step !== undefined) w(pad + '- ' + esc(x.step) + (x.who ? ' (' + esc(x.who) + ')' : '') + (x.value ? ' — ' + esc(x.value) : ''));
        else if (x.decision !== undefined) { w(pad + '- **' + esc(x.decision) + '**'); (x.ways || []).forEach(function (wy) { w(pad + '   - ' + esc(wy.label || t('fg.otherwise')) + ':' + (wy.end ? ' → ' + esc(wy.end) : wy.join ? ' → ' + esc(wy.join) : '')); steps(wy.then, depth + 2); }); }
        else if (x.loop !== undefined) { w(pad + '- ' + esc(x.loop) + ':'); steps(x.body, depth + 1); }
        else if (x.end !== undefined) w(pad + '- → ' + esc(x.end) + (x.returns ? ' (' + esc(x.returns) + ')' : ''));
      });
    }
    var app = data.app || {};
    w('# ' + esc(app.name || 'Application')); w();
    if (app.source) { w('_' + esc(app.source) + '_'); w(); }
    paras(app.summary);
    if ((app.audience || []).length) { w('## ' + t('ov.users')); w(); app.audience.forEach(function (u) { w('- **' + esc(u.who) + '** — ' + esc(u.what || '')); }); w(); }
    var procs = data.processes || [];
    if (procs.length || app.story) {
      w('## ' + t('p.processes')); w();
      if (app.story) { w('### ' + t('pr.app')); w(); paras(app.story); }
      procs.forEach(function (p, i) {
        w('### ' + (i + 1) + '. ' + esc(p.name)); w(); paras(p.summary);
        if ((p.steps || []).length) { w('**' + t('pr.steps') + '**'); w(); p.steps.forEach(function (s, j) { var x = typeof s === 'string' ? { text: s } : s; w((j + 1) + '. ' + esc(x.text) + (x.role ? ' (' + esc(x.role) + ')' : '')); }); w(); }
        if ((p.diagram || []).length) { w('**' + t('pr.diagram') + '**'); w(); steps(p.diagram, 0); w(); }
        if (p.story) { w('**' + t('pr.how') + '**'); w(); paras(p.story); }
        if ((p.flows || []).length) { w('**' + t('pr.flows') + ':** ' + p.flows.map(function (f) { return '`' + f + '`'; }).join(', ')); w(); }
      });
    }
    var parts = data.parts || [];
    if (parts.length) {
      w('## ' + ((data.terms && data.terms.parts && data.terms.parts.label) || t('p.parts'))); w();
      parts.forEach(function (p) {
        w('### `' + p.name + '`' + (p.thirdParty ? ' (' + t('pt.third') + ')' : '')); w(); paras(p.summary); paras(p.story);
        (p.notes || []).forEach(function (n) { w('**' + esc(n.title) + '**'); w(); if (n.text) paras(n.text); (n.items || []).forEach(function (x) { w('- ' + esc(x)); }); if ((n.items || []).length) w(); if (n.table) tableMd(n.table.columns, n.table.rows); });
        var deps = (p.dependsOn || []).map(function (d) { return typeof d === 'string' ? d : d.name + (d.count ? ' (' + d.count + ')' : ''); });
        if (deps.length) { w(t('pt.uses') + ': ' + deps.join(', ')); w(); }
      });
    }
    var arch = data.architecture || {};
    if (arch.context || arch.containers || (arch.open || []).length) {
      w('## ' + t('p.architecture')); w();
      if (arch.context && arch.context.nodes) {
        var appN = arch.context.nodes.filter(function (n) { return n.kind === 'app'; })[0], links = arch.context.links || [];
        if (appN) {
          w('### ' + t('ar.ctx')); w();
          tableMd([t('ar.partner'), t('ar.group'), t('ar.dir'), t('ar.over')], arch.context.nodes.filter(function (n) { return n !== appN; }).map(function (n) {
            var i = links.filter(function (l) { return l.from === n.id && l.to === appN.id; }), o = links.filter(function (l) { return l.from === appN.id && l.to === n.id; });
            return [n.name, n.group || '', i.length && o.length ? '↔ ' + appN.name : o.length ? appN.name + ' →' : '→ ' + appN.name, i.concat(o).map(function (l) { return l.label; }).filter(Boolean).concat(n.note ? [n.note] : []).join(' · ')];
          }));
        }
      }
      if (arch.containers && (arch.containers.nodes || []).length) {
        var byId = {}; arch.containers.nodes.forEach(function (n) { byId[n.id] = n.name; });
        w('### ' + t('ar.rt')); w();
        arch.containers.nodes.forEach(function (n) { w('- ' + esc(n.kind) + ' **' + esc(n.name) + '**' + (n.note ? ' — ' + esc(n.note) : '')); }); w();
        (arch.containers.links || []).forEach(function (l) { w('- ' + esc(byId[l.from]) + ' → ' + esc(byId[l.to]) + (l.label ? ' (' + esc(l.label) + ')' : '')); }); w();
      }
      if ((arch.access || []).length) { w('### ' + t('ar.roles')); w(); tableMd([t('ar.role'), t('p.parts')], arch.access.map(function (r) { return [r.role, Object.keys(r.parts || {}).map(function (k) { return k + ' (' + r.parts[k] + ')'; }).join(', ')]; })); }
      if ((arch.open || []).length) { w('### ' + t('ar.open')); w(); arch.open.forEach(function (x, i) { w((i + 1) + '. ' + esc(x)); }); w(); }
    }
    if ((data.dataModel || []).length) {
      w('## ' + ((data.terms && data.terms.records && data.terms.records.label) || t('p.data'))); w();
      data.dataModel.forEach(function (r) { w('### `' + r.name + '`'); w(); paras(r.summary); tableMd([t('dm.fields'), ''], (r.fields || []).map(function (f) { return [f.name, f.type || '']; })); if ((r.relations || []).length) { w(t('dm.rel') + ': ' + r.relations.map(function (x) { return '`' + x.to + '` (' + (x.many || '') + ')'; }).join(', ')); w(); } });
    }
    var kinds = (data.flowKinds && data.flowKinds.length) ? data.flowKinds : [{ key: undefined, label: t('p.flows') }];
    kinds.forEach(function (k) {
      var list = (data.flows || []).filter(function (f) { return k.key === undefined || (f.kind || kinds[0].key) === k.key; });
      if (!list.length) return;
      w('## ' + esc(k.label)); w();
      list.forEach(function (f) {
        if (!f.drawing) { w('- `' + f.name + '`' + (f.summary ? ' — ' + esc(f.summary) : '')); return; }
        w(); w('### `' + f.name + '`'); w(); paras(f.summary); steps(f.drawing, 0); w();
      });
      w();
    });
    if ((data.screens || []).length) { w('## ' + ((data.terms && data.terms.screens && data.terms.screens.label) || t('p.screens'))); w(); data.screens.forEach(function (s) { w('- `' + s.name + '`' + (s.summary ? ' — ' + esc(s.summary) : '') + ((s.roles || []).length ? ' (' + s.roles.map(esc).join(', ') + ')' : '')); }); w(); }
    var risks = (data.risks || []).filter(function (r) { return r && r.title; });
    if (risks.length) {
      w('## ' + t('p.risks')); w(); w('> ' + t('rk.prov')); w();
      LEVELS.forEach(function (lv) {
        var l = risks.filter(function (r) { return r.level === lv; });
        if (!l.length) return;
        w('### ' + lv + ' · ' + t('lv.' + lv) + ' — ' + t('when.' + lv)); w();
        l.forEach(function (r, i) {
          w('#### ' + (r.id ? r.id + ' · ' : '') + esc(r.title)); w();
          if (r.detail) { paras(r.detail); }
          if (r.fix) { w('**' + t('rk.todo') + ':** ' + esc(r.fix)); w(); }
          if ((r.where || []).length) { w('**' + t('rk.where') + ':** ' + r.where.map(function (x) { return '`' + x + '`'; }).join(', ')); w(); }
        });
      });
    }
    if ((data.quality || []).length) {
      w('## ' + t('p.quality')); w();
      data.quality.forEach(function (q) {
        w('### ' + esc(q.label) + ' — ' + (q.count || 0) + (q.total ? ' ' + t('q.of', { n: q.total }) : '')); w(); paras(q.explain);
        if (q.rule && q.rule.quote) { w('> ' + esc(q.rule.quote) + (q.rule.source ? ' — ' + esc(q.rule.source) : '')); w(); }
        if (q.items) tableMd(q.items.columns || [], q.items.rows || []);
      });
    }
    var dev = data.forDevelopers || {};
    if ((dev.where || []).length || (dev.conventions || []).length || (dev.pitfalls || []).length) {
      w('## ' + t('p.developers')); w();
      if ((dev.where || []).length) { w('### ' + t('dv.where')); w(); dev.where.forEach(function (x) { w('- **' + esc(x.topic) + '** — ' + esc(x.place)); }); w(); }
      if ((dev.conventions || []).length) { w('### ' + t('dv.naming')); w(); tableMd([t('dv.pattern'), t('dv.means'), t('dv.count')], dev.conventions.map(function (c) { return [c.pattern, c.meaning, c.count !== undefined ? String(c.count) : '—']; })); }
      if ((dev.pitfalls || []).length) { w('### ' + t('dv.pitfalls')); w(); dev.pitfalls.forEach(function (x, i) { w((i + 1) + '. ' + esc(x)); }); w(); }
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  var api = { mount: mount, markdown: markdown, LABELS: LABELS, NOUNS: NOUNS, version: '1.0.0' };
  if (typeof window !== 'undefined') window.Report = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
