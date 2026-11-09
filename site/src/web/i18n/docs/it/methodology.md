---
title: Metodologia
description: Come contributor.top seleziona e classifica gli utenti GitHub.
---

# Metodologia

## Chi viene considerato

1. Per ogni paese cerchiamo su GitHub gli utenti la cui **località** nel profilo corrisponde al paese o a una delle sue città. L'elenco delle stringhe di località di ogni paese si trova in [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) ed è aperto alle pull request.
2. La ricerca di GitHub non può ordinare per contributi, quindi tra tutte le persone che corrispondono prendiamo i **{{consider}} utenti più seguiti** e classifichiamo solo loro. Ogni pagina di paese mostra il numero effettivo di follower della persona meno seguita tra quelle considerate.
3. Organizzazioni e bot sono esclusi.
4. Ogni persona appartiene a **un solo** paese: il primo menzionato nella località del suo profilo. Se sono indicati più paesi, conta solo il primo.

## Cosa viene contato

I contributi degli ultimi 12 mesi, così come GitHub li conta nei profili:

- **Contributi pubblici** — commit, pull request, issue e review visibili a tutti.
- **Tutti i contributi** — pubblici più privati. I contributi privati vengono contati solo per chi ha scelto di mostrarli sul proprio profilo; per tutti gli altri questa scheda mostra lo stesso numero di quella pubblica.
- **Commit** — solo i commit pubblici.

In caso di parità decide il numero di follower, poi il login.

Sotto ogni nome: `C` commit pubblici, `PR` pull request, `IS` issue, `RV` review e un lucchetto per i contributi privati (passa il mouse sopra per vedere i numeri esatti).

## Segnalazioni ed esclusioni

Poche regole, uguali per tutti, impediscono che numeri non verificabili o prodotti da uno script decidano una classifica. Ogni segnalazione mostra al passaggio del mouse la regola che l'ha prodotta e i numeri a cui è stata applicata.

| Regola                   | Quando                                                                                                                                                                | Cosa succede                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Quasi tutto privato      | Il {{private_flag}}% o più dei contributi è privato                                                                                                                   | Un lucchetto accanto al totale in **Tutti i contributi**                                   |
| Quasi niente di pubblico | I contributi pubblici sono meno del {{min_public}}% del totale                                                                                                        | Fuori da **Tutti i contributi**, presente nelle altre classifiche                          |
| Fabbrica di commit       | {{min_commits}} commit o più, almeno {{ratio}} volte tanti quanti pull request, issue e review insieme                                                                | Un robot nelle classifiche dei paesi; fuori dalla classifica mondiale e dai badge mondiali |
| Un repository inattivo   | {{min_commits}} commit o più, il {{quiet_share}}% o più in un solo repository proprio con meno di {{quiet_stars}} stelle                                              | Come una fabbrica di commit                                                                |
| Eccezione                | Il {{popular_share}}% dei commit o più va in un repository altrui con {{popular_stars}} stelle o più, o in un qualsiasi repository di un'organizzazione che ne ha uno | Mai segnalato come automatizzato                                                           |

GitHub riporta l'attività privata come un unico numero che non si può scomporre né verificare, quindi conta solo dove il lavoro pubblico la sostiene; un lucchetto da solo non esclude nessuno, perché molte persone lavorano su codice chiuso. Chi fa commit direttamente in un progetto molto usato, come spesso fanno i maintainer di grandi progetti comunitari e di distribuzioni Linux, non è considerato automatizzato: solo il progetto stesso può dargli accesso in scrittura.

## Verificare le classifiche

Le classifiche seguono solo queste regole e l'ordine indicato sopra; nessuno viene spostato a mano. Le soglie vengono da [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), e la sua unica lista manuale, `denylist_ids`, cambia solo tramite una pull request pubblica. I numeri raccolti per ogni paese sono nel [branch `data`](https://github.com/contributor-top/contributor.top/tree/data) del repository, quindi ogni classifica si può ricalcolare e verificare.

## Perché non sono in lista?

- La località del tuo profilo non corrisponde a nessuna stringa del preset del tuo paese. La località è testo libero: aggiungi la tua città o il tuo paese, oppure apri una pull request sul preset.
- Non sei tra i {{consider}} utenti più seguiti del tuo paese.
- Quasi tutti i tuoi contributi sono privati (meno del {{min_public}}% pubblici): resti fuori solo da **Tutti i contributi**.
- I tuoi contributi sono privati e non sono mostrati sul tuo profilo.
- Hai chiesto di essere rimosso (vedi [Privacy e rimozione](/it/privacy/)).

## Accesso ai dati

Ogni classifica è disponibile anche in JSON: [`/api/index.json`](/api/index.json) elenca i paesi e `/api/<country>.json` (ad esempio `/api/canada.json`) contiene tutte e tre le classifiche con posizione, login e contributi. La classifica mondiale è in [`/api/world.json`](/api/world.json). I file sono statici e possono essere scaricati da qualsiasi sito.

Usali per ricerche sull'open source, statistiche e progetti della community. Non usarli per contattare persone in massa, per attività di recruiting o per rivendere i dati. Chi ha chiesto la rimozione non vi è mai incluso.

## Aggiornamenti

I paesi vengono aggiornati uno dopo l'altro, a partire da quello aggiornato meno di recente. Ogni pagina di paese mostra quando è stata aggiornata l'ultima volta.

Ispirato a [committers.top](https://committers.top).
