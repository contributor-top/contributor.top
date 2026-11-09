---
title: Méthodologie
description: Comment contributor.top sélectionne et classe les utilisateurs GitHub.
---

# Méthodologie

## Qui est pris en compte

1. Pour chaque pays, nous cherchons sur GitHub les utilisateurs dont la **localisation** du profil correspond au pays ou à l'une de ses villes. La liste des chaînes de localisation de chaque pays se trouve dans [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) et est ouverte aux pull requests.
2. La recherche GitHub ne permet pas de trier par contributions : parmi toutes les personnes qui correspondent, nous prenons donc les **{{consider}} utilisateurs les plus suivis** et ne classons qu'eux. Chaque page de pays indique le nombre réel d'abonnés de la personne la moins suivie prise en compte.
3. Les organisations et les bots sont exclus.
4. Chaque personne appartient à **un seul** pays : le premier mentionné dans la localisation de son profil. Si plusieurs pays sont indiqués, seul le premier compte.

## Ce qui est compté

Les contributions des 12 derniers mois, telles que GitHub les compte sur les profils :

- **Contributions publiques** — commits, pull requests, issues et reviews visibles par tous.
- **Toutes les contributions** — publiques et privées. Les contributions privées ne sont comptées que pour les personnes qui ont choisi de les afficher sur leur profil ; pour tous les autres, cet onglet affiche le même nombre que l'onglet public.
- **Commits** — uniquement les commits publics.

En cas d'égalité, le nombre d'abonnés départage, puis le login.

Sous chaque nom : `C` commits publics, `PR` pull requests, `IS` issues, `RV` reviews et un cadenas pour les contributions privées (survolez pour voir les nombres exacts).

## Marques et exclusions

Quelques règles, les mêmes pour tous, empêchent des nombres invérifiables ou produits par un script de décider d'un classement. Chaque marque affiche au survol la règle qui l'a déclenchée et les nombres auxquels elle s'applique.

| Règle                  | Quand                                                                                                                                                                                | Effet                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Presque tout privé     | {{private_flag}} % ou plus des contributions sont privées                                                                                                                            | Un cadenas à côté du total dans **Toutes les contributions**                                 |
| Presque rien de public | Les contributions publiques font moins de {{min_public}} % du total                                                                                                                  | Absent de **Toutes les contributions**, présent dans les autres classements                  |
| Ferme à commits        | {{min_commits}} commits ou plus, au moins {{ratio}} fois plus que de pull requests, issues et reviews réunies                                                                        | Un robot dans les classements par pays ; absent du classement mondial et des badges mondiaux |
| Un dépôt sans écho     | {{min_commits}} commits ou plus, dont {{quiet_share}} % ou plus dans un seul dépôt personnel de moins de {{quiet_stars}} étoiles                                                     | Comme une ferme à commits                                                                    |
| Exception              | {{popular_share}} % des commits ou plus vont dans le dépôt de quelqu'un d'autre ayant {{popular_stars}} étoiles ou plus, ou dans n'importe quel dépôt d'une organisation qui en a un | Jamais signalé comme automatisé                                                              |

GitHub fournit l'activité privée sous la forme d'un seul nombre, impossible à détailler ou à vérifier ; elle ne compte donc que si un travail public l'étaye. Un cadenas seul n'exclut personne : beaucoup travaillent sur du code fermé. Les personnes qui committent directement dans un projet très utilisé, comme le font souvent les mainteneurs de grands projets communautaires et de distributions Linux, ne sont pas considérées comme automatisées : seul le projet peut leur donner ce droit.

## Vérifier les classements

Les classements suivent uniquement ces règles et l'ordre ci-dessus ; personne n'est déplacé à la main. Les seuils viennent de [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), dont la seule liste manuelle, `denylist_ids`, ne change que par une pull request publique. Les nombres collectés pour chaque pays se trouvent dans la [branche `data`](https://github.com/contributor-top/contributor.top/tree/data) du dépôt : tout classement peut être recalculé et vérifié.

## Pourquoi je ne suis pas dans la liste ?

- La localisation de votre profil ne correspond à aucune chaîne du preset de votre pays. La localisation est un texte libre : ajoutez votre ville ou votre pays, ou ouvrez une pull request sur le preset.
- Vous ne faites pas partie des {{consider}} utilisateurs les plus suivis de votre pays.
- Presque toutes vos contributions sont privées (moins de {{min_public}} % publiques) : vous êtes absent de **Toutes les contributions** seulement.
- Vos contributions sont privées et ne sont pas affichées sur votre profil.
- Vous avez demandé à être retiré (voir [Confidentialité et retrait](/fr/privacy/)).

## Accès aux données

Chaque classement est aussi disponible en JSON : [`/api/index.json`](/api/index.json) liste les pays, et `/api/<country>.json` (par exemple `/api/canada.json`) contient les trois classements avec le rang, le login et les contributions. Le classement mondial se trouve dans [`/api/world.json`](/api/world.json). Les fichiers sont statiques et peuvent être récupérés depuis n'importe quel site.

Utilisez-les pour de la recherche sur l'open source, des statistiques et des projets communautaires. Ne les utilisez pas pour contacter des personnes en masse, pour du recrutement ou pour revendre les données. Les personnes qui se sont retirées n'y figurent jamais.

## Mises à jour

Les pays sont mis à jour l'un après l'autre, en commençant par celui dont la dernière mise à jour est la plus ancienne. Chaque page de pays indique la date de sa dernière mise à jour.

Inspiré par [committers.top](https://committers.top).
