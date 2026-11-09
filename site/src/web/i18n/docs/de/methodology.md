---
title: Methodik
description: Wie contributor.top GitHub-Nutzer auswählt und rankt.
---

# Methodik

## Wer berücksichtigt wird

1. Für jedes Land suchen wir auf GitHub nach Nutzern, deren **Standort** im Profil zum Land oder zu einer seiner Städte passt. Die Liste der Standortangaben für jedes Land liegt in [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) und ist offen für Pull Requests.
2. Die GitHub-Suche kann nicht nach Beiträgen sortieren, daher nehmen wir unter allen Treffern die **{{consider}} Nutzer mit den meisten Followern** und ranken nur diese. Jede Länderseite zeigt die tatsächliche Follower-Zahl der Person mit den wenigsten Followern unter den Berücksichtigten.
3. Organisationen und Bots werden ausgeschlossen.
4. Jede Person gehört zu genau **einem** Land: dem ersten, das im Standort ihres Profils genannt wird. Sind mehrere Länder angegeben, zählt nur das erste.

## Was gezählt wird

Beiträge der letzten 12 Monate, so wie GitHub sie in Profilen zählt:

- **Öffentliche Beiträge** – Commits, Pull Requests, Issues und Reviews, die für alle sichtbar sind.
- **Alle Beiträge** – öffentliche plus private. Private Beiträge zählen nur bei Personen, die sich entschieden haben, sie in ihrem Profil anzuzeigen; bei allen anderen zeigt dieser Tab dieselbe Zahl wie der öffentliche.
- **Commits** – nur öffentliche Commits.

Bei Gleichstand entscheidet die Follower-Zahl, danach der Login.

Unter jedem Namen: `C` öffentliche Commits, `PR` Pull Requests, `IS` Issues, `RV` Reviews und ein Schloss für private Beiträge (mit der Maus darüberfahren für genaue Zahlen).

## Markierungen und Ausschlüsse

Einige wenige Regeln, für alle gleich, verhindern, dass Zahlen, die sich nicht überprüfen lassen oder die ein Skript erzeugt hat, über ein Ranking entscheiden. Jede Markierung zeigt beim Darüberfahren die Regel dahinter und die Zahlen, auf die sie angewendet wurde.

| Regel                  | Wann                                                                                                                                                                                  | Was passiert                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Überwiegend privat     | {{private_flag}} % oder mehr der Beiträge sind privat                                                                                                                                 | Ein Schloss neben der Gesamtzahl in **Alle Beiträge**    |
| Fast nichts öffentlich | Öffentliche Beiträge machen weniger als {{min_public}} % der Gesamtzahl aus                                                                                                           | Nicht in **Alle Beiträge**, aber in den anderen Rankings |
| Commit-Farm            | {{min_commits}} Commits oder mehr, mindestens {{ratio}}-mal so viele wie Pull Requests, Issues und Reviews zusammen                                                                   | In keinem Ranking                                        |
| Ein stilles Repository | {{min_commits}} Commits oder mehr, davon {{quiet_share}} % oder mehr in einem eigenen Repository mit weniger als {{quiet_stars}} Sternen                                              | Wie bei einer Commit-Farm                                |
| Ausnahme               | {{popular_share}} % der Commits oder mehr gehen in ein fremdes Repository mit {{popular_stars}} Sternen oder mehr oder in ein beliebiges Repository einer Organisation, die eines hat | Nie als automatisiert markiert                           |

GitHub meldet private Aktivität als eine einzige Zahl, die sich weder aufschlüsseln noch überprüfen lässt; sie zählt daher nur, wo öffentliche Arbeit sie stützt. Ein Schloss allein entfernt niemanden, denn viele arbeiten an Closed-Source-Code. Wer direkt in ein weit verbreitetes Projekt committet, wie es Maintainer großer Community-Projekte und Linux-Distributionen oft tun, gilt nicht als automatisiert: Nur das Projekt selbst kann dort Schreibrechte geben.

## Die Rankings überprüfen

Die Rankings folgen nur diesen Regeln und der obigen Reihenfolge; niemand wird von Hand verschoben. Die Schwellenwerte stehen in [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), und deren einzige manuelle Liste, `denylist_ids`, ändert sich nur durch einen öffentlichen Pull Request. Die für jedes Land gesammelten Zahlen liegen im [Branch `data`](https://github.com/contributor-top/contributor.top/tree/data) des Repositorys, sodass sich jedes Ranking nachrechnen und überprüfen lässt.

## Warum bin ich nicht dabei?

- Der Standort in deinem Profil passt zu keiner Angabe im Preset deines Landes. Der Standort ist Freitext: Trage deine Stadt oder dein Land ein oder öffne einen Pull Request für das Preset.
- Du gehörst nicht zu den {{consider}} Nutzern mit den meisten Followern in deinem Land.
- Fast alle deine Beiträge sind privat (unter {{min_public}} % öffentlich): Dann fehlst du nur in **Alle Beiträge**.
- Deine Commits wirken automatisiert (siehe die Regeln oben): Solche Konten stehen in keinem Ranking.
- Deine Beiträge sind privat und werden in deinem Profil nicht angezeigt.
- Du hast um Entfernung gebeten (siehe [Datenschutz und Opt-out](/de/privacy/)).

## Datenzugriff

Jedes Ranking gibt es auch als JSON: [`/api/index.json`](/api/index.json) listet die Länder auf, und `/api/<country>.json` (zum Beispiel `/api/canada.json`) enthält alle drei Rankings mit Platz, Login und Beiträgen. Das Weltranking liegt in [`/api/world.json`](/api/world.json). Die Dateien sind statisch und können von jeder Website abgerufen werden.

Verwende sie für Open-Source-Forschung, Statistiken und Community-Projekte. Verwende sie nicht, um Personen massenhaft zu kontaktieren, für Recruiting-Ansprachen oder um die Daten weiterzuverkaufen. Personen, die sich abgemeldet haben, sind nie enthalten.

## Aktualisierungen

Die Länder werden nacheinander aktualisiert, das am längsten nicht aktualisierte zuerst. Jede Länderseite zeigt, wann sie zuletzt aktualisiert wurde.

Inspiriert von [committers.top](https://committers.top).
