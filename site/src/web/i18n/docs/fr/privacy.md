---
title: Confidentialité et retrait
description: Quelles données contributor.top utilise et comment s'en faire retirer.
---

# Confidentialité et retrait

## Ce que nous utilisons

Uniquement des données publiques des profils GitHub : l'identifiant numérique de votre compte, votre login, votre nom d'affichage, votre nombre d'abonnés et vos nombres de contributions des 12 derniers mois. Le nom d'affichage apparaît à côté de votre login sur le site, comme sur GitHub, mais ne figure pas dans les fichiers JSON ; il change quand vous le modifiez sur GitHub, à la prochaine mise à jour de votre pays. Nous ne conservons pas votre e-mail, votre bio, votre entreprise, votre statut ni le texte exact de votre localisation. Les données ne sont pas vendues et ne sont pas partagées avec des recruteurs ou des sites d'offres d'emploi.

## Vous retirer

Définissez sur GitHub un statut dont le message contient `contributor.top opt-out`, visible par tous, avec « Clear after: Don't clear ». Vous serez retiré de tous les classements et badges à la prochaine mise à jour de votre pays (sous deux jours environ) ; si la mise à jour de votre pays échoue à répétition, le statut est tout de même vérifié au début de chaque exécution du collecteur. Ensuite, vous pouvez supprimer le statut : le retrait reste en place.

Il n'y a volontairement ni formulaire ni issue à remplir : une demande publique lierait votre login au retrait pour toujours. Le statut ne nécessite aucun contact avec nous et n'est lu que sur votre propre profil, si bien que personne ne peut retirer ou ajouter quelqu'un d'autre.

Nous ne conservons qu'un hachage à clé de l'identifiant de votre compte, pour ne pas vous ajouter de nouveau, dans une liste chiffrée qui est rechiffrée à chaque exécution : on ne peut y lire ni qui s'est retiré, ni combien de personnes, ni quand. Pour revenir, définissez un statut contenant `contributor.top opt-in`.

## Ce que nous ne pouvons pas contrôler

Les copies faites avant le retrait : anciens commits du dépôt public, archives web, forks et caches des moteurs de recherche. Quiconque compare les classements au fil du temps peut voir que vous n'y figurez plus, comme pour toute personne qui déménage ou sort du top. Les avatars sont chargés depuis les serveurs de GitHub, et chaque page demande à l'API de GitHub le nombre d'étoiles du dépôt : GitHub voit donc l'adresse IP du visiteur. Le site n'utilise ni outil d'analyse ni cookies.

## Contact

Des questions sur cette page ? [Ouvrez une issue](https://github.com/contributor-top/contributor.top/issues).
