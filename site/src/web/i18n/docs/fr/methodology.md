---
title: Méthodologie
description: Comment contributor.top sélectionne et classe les utilisateurs GitHub.
---

# Méthodologie

## Qui est pris en compte

1. Pour chaque pays, nous cherchons sur GitHub les utilisateurs dont la **localisation** du profil correspond au pays ou à l'une de ses villes. La liste des chaînes de localisation de chaque pays se trouve dans [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) et est ouverte aux pull requests.
2. La recherche GitHub ne permet pas de trier par contributions : parmi toutes les personnes qui correspondent, nous prenons donc les **1000 utilisateurs les plus suivis** et ne classons qu'eux. Chaque page de pays indique le nombre réel d'abonnés de la personne la moins suivie prise en compte.
3. Les organisations et les bots sont exclus.
4. Chaque personne appartient à **un seul** pays : le premier mentionné dans la localisation de son profil. Si plusieurs pays sont indiqués, seul le premier compte.

## Ce qui est compté

Les contributions des 12 derniers mois, telles que GitHub les compte sur les profils :

- **Contributions publiques** — commits, pull requests, issues et reviews visibles par tous.
- **Toutes les contributions** — publiques et privées. Les contributions privées ne sont comptées que pour les personnes qui ont choisi de les afficher sur leur profil ; pour tous les autres, cet onglet affiche le même nombre que l'onglet public.
- **Commits** — uniquement les commits publics.

En cas d'égalité, le nombre d'abonnés départage, puis le login.

Sous chaque nom : `C` commits publics, `PR` pull requests, `IS` issues, `RV` reviews et un cadenas pour les contributions privées (survolez pour voir les nombres exacts). GitHub fournit l'activité privée sous la forme d'un seul nombre, impossible à détailler ou à vérifier ; dans le classement **Toutes les contributions**, un petit cadenas à côté du total signale donc les personnes dont les contributions sont presque entièrement (90 % ou plus) privées. Elles ne sont pas retirées : beaucoup de gens travaillent sur du code fermé. Le classement principal n'utilise que les contributions publiques.

Certains comptes affichent un nombre énorme de commits et presque aucune autre activité : ni pull requests, ni issues, ni reviews. C'est à cela que ressemble un script qui commite dans le même dépôt toute la journée, tout comme un compte dont presque tous les commits vont dans un dépôt à lui que personne d'autre n'utilise. Les personnes qui commitent directement dans un projet très utilisé appartenant à quelqu'un d'autre, comme le font souvent les mainteneurs de grands projets communautaires, ne sont pas considérées comme automatisées. Ces comptes sont signalés par un petit robot dans les classements par pays et sont exclus du classement mondial et des badges mondiaux.

## Pourquoi je ne suis pas dans la liste ?

- La localisation de votre profil ne correspond à aucune chaîne du preset de votre pays. La localisation est un texte libre : ajoutez votre ville ou votre pays, ou ouvrez une pull request sur le preset.
- Vous ne faites pas partie des 1000 utilisateurs les plus suivis de votre pays.
- Vos contributions sont privées et ne sont pas affichées sur votre profil.
- Vous avez demandé à être retiré (voir [Confidentialité et retrait](/fr/privacy/)).

## Accès aux données

Chaque classement est aussi disponible en JSON : [`/api/index.json`](/api/index.json) liste les pays, et `/api/<country>.json` (par exemple `/api/canada.json`) contient les trois classements avec le rang, le login et les contributions. Le classement mondial se trouve dans [`/api/world.json`](/api/world.json). Les fichiers sont statiques et peuvent être récupérés depuis n'importe quel site.

Utilisez-les pour de la recherche sur l'open source, des statistiques et des projets communautaires. Ne les utilisez pas pour contacter des personnes en masse, pour du recrutement ou pour revendre les données. Les personnes qui se sont retirées n'y figurent jamais.

## Mises à jour

Les pays sont mis à jour l'un après l'autre, en commençant par celui dont la dernière mise à jour est la plus ancienne. Chaque page de pays indique la date de sa dernière mise à jour.

Inspiré par [committers.top](https://committers.top).
