---
title: Metodologia
description: Come contributor.top seleziona e classifica gli utenti GitHub.
---

# Metodologia

## Chi viene considerato

1. Per ogni paese cerchiamo su GitHub gli utenti la cui **località** nel profilo corrisponde al paese o a una delle sue città. L'elenco delle stringhe di località di ogni paese si trova in [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) ed è aperto alle pull request.
2. La ricerca di GitHub non può ordinare per contributi, quindi tra tutte le persone che corrispondono prendiamo i **1000 utenti più seguiti** e classifichiamo solo loro. Ogni pagina di paese mostra il numero effettivo di follower della persona meno seguita tra quelle considerate.
3. Organizzazioni e bot sono esclusi.
4. Ogni persona appartiene a **un solo** paese: il primo menzionato nella località del suo profilo. Se sono indicati più paesi, conta solo il primo.

## Cosa viene contato

I contributi degli ultimi 12 mesi, così come GitHub li conta nei profili:

- **Contributi pubblici** — commit, pull request, issue e review visibili a tutti.
- **Tutti i contributi** — pubblici più privati. I contributi privati vengono contati solo per chi ha scelto di mostrarli sul proprio profilo; per tutti gli altri questa scheda mostra lo stesso numero di quella pubblica.
- **Commit** — solo i commit pubblici.

In caso di parità decide il numero di follower, poi il login.

Sotto ogni nome: `C` commit pubblici, `PR` pull request, `IS` issue, `RV` review e un lucchetto per i contributi privati (passa il mouse sopra per vedere i numeri esatti). GitHub riporta l'attività privata come un unico numero che non si può scomporre né verificare, quindi nella classifica **Tutti i contributi** un piccolo lucchetto accanto al totale segnala le persone i cui contributi sono quasi interamente (90% o più) privati. Non vengono rimosse: molte persone lavorano su codice closed source. La classifica principale usa solo i contributi pubblici.

Alcuni account riportano un numero enorme di commit e quasi nessun'altra attività: niente pull request, issue o review. È l'aspetto di uno script che fa commit nello stesso repository tutto il giorno, così come di un account i cui commit finiscono quasi tutti in un suo repository che nessun altro usa. Chi fa commit direttamente in un progetto molto usato di qualcun altro, come fanno spesso i maintainer di grandi progetti della community, non viene considerato automatizzato. Questi account sono segnalati con un piccolo robot nelle classifiche dei paesi e sono esclusi dalla classifica mondiale e dai badge mondiali.

## Perché non sono in lista?

- La località del tuo profilo non corrisponde a nessuna stringa del preset del tuo paese. La località è testo libero: aggiungi la tua città o il tuo paese, oppure apri una pull request sul preset.
- Non sei tra i 1000 utenti più seguiti del tuo paese.
- I tuoi contributi sono privati e non sono mostrati sul tuo profilo.
- Hai chiesto di essere rimosso (vedi [Privacy e rimozione](/it/privacy/)).

## Accesso ai dati

Ogni classifica è disponibile anche in JSON: [`/api/index.json`](/api/index.json) elenca i paesi e `/api/<country>.json` (ad esempio `/api/canada.json`) contiene tutte e tre le classifiche con posizione, login e contributi. La classifica mondiale è in [`/api/world.json`](/api/world.json). I file sono statici e possono essere scaricati da qualsiasi sito.

Usali per ricerche sull'open source, statistiche e progetti della community. Non usarli per contattare persone in massa, per attività di recruiting o per rivendere i dati. Chi ha chiesto la rimozione non vi è mai incluso.

## Aggiornamenti

I paesi vengono aggiornati uno dopo l'altro, a partire da quello aggiornato meno di recente. Ogni pagina di paese mostra quando è stata aggiornata l'ultima volta.

Ispirato a [committers.top](https://committers.top).
