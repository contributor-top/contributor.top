---
title: Datenschutz und Opt-out
description: Welche Daten contributor.top verwendet und wie du dich entfernen lässt.
---

# Datenschutz und Opt-out

## Was wir verwenden

Nur öffentliche Daten aus GitHub-Profilen: deine numerische Konto-ID, dein Login, dein Anzeigename, deine Follower-Zahl und die Anzahl deiner Beiträge der letzten 12 Monate. Der Anzeigename wird auf der Website wie auf GitHub neben deinem Login angezeigt, ist aber nicht Teil der JSON-Dateien; er ändert sich, wenn du ihn auf GitHub änderst, bei der nächsten Aktualisierung deines Landes. Wir speichern weder deine E-Mail-Adresse noch deine Bio, Firma, deinen Status oder den genauen Text deines Standorts. Die Daten werden nicht verkauft und nicht an Recruiter oder Jobbörsen weitergegeben.

## Dich entfernen

Setze deinen GitHub-Status auf eine Nachricht, die `contributor.top opt-out` enthält, sichtbar für alle, mit „Clear after: Don't clear“. Du wirst bei der nächsten Aktualisierung deines Landes (innerhalb von etwa zwei Tagen) aus allen Rankings und Badges entfernt; schlägt die Aktualisierung deines Landes wiederholt fehl, wird der Status trotzdem zu Beginn jedes Collector-Laufs geprüft. Danach kannst du den Status wieder entfernen; das Opt-out bleibt bestehen.

Es gibt absichtlich kein Formular und kein Issue zum Ausfüllen: Eine öffentliche Anfrage würde deinen Login für immer mit der Entfernung verknüpfen. Der Status erfordert keinen Kontakt mit uns und wird nur aus deinem eigenen Profil gelesen, sodass niemand eine andere Person entfernen oder hinzufügen kann.

Wir speichern nur einen Hash mit Schlüssel deiner Konto-ID, damit du nicht wieder aufgenommen wirst, und zwar in einer verschlüsselten Liste, die bei jedem Lauf neu verschlüsselt wird: Daraus lässt sich weder ablesen, wer oder wie viele Personen sich abgemeldet haben, noch wann. Um zurückzukehren, setze einen Status, der `contributor.top opt-in` enthält.

## Was wir nicht kontrollieren können

Kopien, die vor der Entfernung entstanden sind: alte Commits des öffentlichen Repositorys, Webarchive, Forks und Suchmaschinen-Caches. Wer die Rankings über die Zeit vergleicht, kann sehen, dass du nicht mehr aufgeführt bist, wie bei allen, die umziehen oder aus den Top herausfallen. Avatare werden von den Servern von GitHub geladen, und jede Seite fragt die API von GitHub nach der Anzahl der Sterne des Repositorys, daher sieht GitHub die IP-Adresse der Besucher. Die Website verwendet keine Analysedienste und keine Cookies.

## Kontakt

Fragen zu dieser Seite: [Issue öffnen](https://github.com/contributor-top/contributor.top/issues).
