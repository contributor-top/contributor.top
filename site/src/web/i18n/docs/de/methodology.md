---
title: Methodik
description: Wie contributor.top GitHub-Nutzer auswählt und rankt.
---

# Methodik

## Wer berücksichtigt wird

1. Für jedes Land suchen wir auf GitHub nach Nutzern, deren **Standort** im Profil zum Land oder zu einer seiner Städte passt. Die Liste der Standortangaben für jedes Land liegt in [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) und ist offen für Pull Requests.
2. Die GitHub-Suche kann nicht nach Beiträgen sortieren, daher nehmen wir unter allen Treffern die **1000 Nutzer mit den meisten Followern** und ranken nur diese. Jede Länderseite zeigt die tatsächliche Follower-Zahl der Person mit den wenigsten Followern unter den Berücksichtigten.
3. Organisationen und Bots werden ausgeschlossen.
4. Jede Person gehört zu genau **einem** Land: dem ersten, das im Standort ihres Profils genannt wird. Sind mehrere Länder angegeben, zählt nur das erste.

## Was gezählt wird

Beiträge der letzten 12 Monate, so wie GitHub sie in Profilen zählt:

- **Öffentliche Beiträge** – Commits, Pull Requests, Issues und Reviews, die für alle sichtbar sind.
- **Alle Beiträge** – öffentliche plus private. Private Beiträge zählen nur bei Personen, die sich entschieden haben, sie in ihrem Profil anzuzeigen; bei allen anderen zeigt dieser Tab dieselbe Zahl wie der öffentliche.
- **Commits** – nur öffentliche Commits.

Bei Gleichstand entscheidet die Follower-Zahl, danach der Login.

Unter jedem Namen: `C` öffentliche Commits, `PR` Pull Requests, `IS` Issues, `RV` Reviews und ein Schloss für private Beiträge (mit der Maus darüberfahren für genaue Zahlen). GitHub meldet private Aktivität als eine einzige Zahl, die sich weder aufschlüsseln noch überprüfen lässt. Deshalb markiert im Ranking **Alle Beiträge** ein kleines Schloss neben der Gesamtzahl Personen, deren Beiträge fast vollständig (zu 90 % oder mehr) privat sind. Sie werden nicht entfernt: Viele arbeiten an Closed-Source-Code. Das Hauptranking verwendet nur öffentliche Beiträge.

Manche Konten melden eine enorme Zahl an Commits und fast keine andere Aktivität: keine Pull Requests, Issues oder Reviews. So sieht ein Skript aus, das den ganzen Tag in dasselbe Repository committet, und ebenso ein Konto, dessen Commits fast alle in ein eigenes Repository gehen, das sonst niemand nutzt. Wer direkt in ein viel genutztes Projekt einer anderen Person committet, wie es Maintainer großer Community-Projekte oft tun, gilt nicht als automatisiert. Solche Konten sind in den Länderrankings mit einem kleinen Roboter markiert und fehlen im Weltranking und in den Welt-Badges.

## Warum bin ich nicht dabei?

- Der Standort in deinem Profil passt zu keiner Angabe im Preset deines Landes. Der Standort ist Freitext: Trage deine Stadt oder dein Land ein oder öffne einen Pull Request für das Preset.
- Du gehörst nicht zu den 1000 Nutzern mit den meisten Followern in deinem Land.
- Deine Beiträge sind privat und werden in deinem Profil nicht angezeigt.
- Du hast um Entfernung gebeten (siehe [Datenschutz und Opt-out](/de/privacy/)).

## Datenzugriff

Jedes Ranking gibt es auch als JSON: [`/api/index.json`](/api/index.json) listet die Länder auf, und `/api/<country>.json` (zum Beispiel `/api/canada.json`) enthält alle drei Rankings mit Platz, Login und Beiträgen. Das Weltranking liegt in [`/api/world.json`](/api/world.json). Die Dateien sind statisch und können von jeder Website abgerufen werden.

Verwende sie für Open-Source-Forschung, Statistiken und Community-Projekte. Verwende sie nicht, um Personen massenhaft zu kontaktieren, für Recruiting-Ansprachen oder um die Daten weiterzuverkaufen. Personen, die sich abgemeldet haben, sind nie enthalten.

## Aktualisierungen

Die Länder werden nacheinander aktualisiert, das am längsten nicht aktualisierte zuerst. Jede Länderseite zeigt, wann sie zuletzt aktualisiert wurde.

Inspiriert von [committers.top](https://committers.top).
