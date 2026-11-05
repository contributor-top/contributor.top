---
title: Privacy e rimozione
description: Quali dati usa contributor.top e come farsi rimuovere.
---

# Privacy e rimozione

## Cosa usiamo

Solo dati pubblici dei profili GitHub: l'ID numerico del tuo account, il login, il nome visualizzato, il numero di follower e i conteggi dei contributi degli ultimi 12 mesi. Il nome visualizzato compare accanto al tuo login sul sito, come su GitHub, ma non è incluso nei file JSON; cambia quando lo cambi su GitHub, al successivo aggiornamento del tuo paese. Non conserviamo la tua email, la bio, l'azienda, lo stato né il testo esatto della tua località. I dati non vengono venduti né condivisi con recruiter o siti di annunci di lavoro.

## Come farsi rimuovere

Imposta su GitHub uno stato con un messaggio che contiene `contributor.top opt-out`, visibile a tutti, con «Clear after: Don't clear». Verrai rimosso da tutte le classifiche e da tutti i badge al successivo aggiornamento del tuo paese (entro circa due giorni); se l'aggiornamento del tuo paese continua a fallire, lo stato viene comunque controllato all'inizio di ogni esecuzione del collector. Dopo puoi togliere lo stato: la rimozione resta.

Non c'è volutamente nessun modulo o issue da compilare: una richiesta pubblica legherebbe per sempre il tuo login alla rimozione. Lo stato non richiede alcun contatto con noi e viene letto solo dal tuo profilo, quindi nessuno può rimuovere o aggiungere qualcun altro.

Conserviamo solo un hash con chiave dell'ID del tuo account, perché tu non venga aggiunto di nuovo, in un elenco cifrato che viene cifrato di nuovo a ogni esecuzione: da esso non si può sapere né chi si è rimosso, né quante persone, né quando. Per tornare, imposta uno stato che contiene `contributor.top opt-in`.

## Cosa non possiamo controllare

Le copie fatte prima della rimozione: vecchi commit del repository pubblico, archivi web, fork e cache dei motori di ricerca. Chiunque confronti le classifiche nel tempo può vedere che non sei più in lista, come per chiunque si trasferisca o esca dalla top. Gli avatar vengono caricati dai server di GitHub e ogni pagina chiede all'API di GitHub il numero di stelle del repository, quindi GitHub vede l'indirizzo IP del visitatore. Il sito non usa strumenti di analisi né cookie.

## Contatti

Domande su questa pagina: [apri una issue](https://github.com/contributor-top/contributor.top/issues).
