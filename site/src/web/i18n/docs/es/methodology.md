---
title: Metodología
description: Cómo contributor.top selecciona y clasifica a los usuarios de GitHub.
---

# Metodología

## A quién se tiene en cuenta

1. Para cada país buscamos en GitHub usuarios cuya **ubicación** de perfil coincide con el país o con una de sus ciudades. La lista de textos de ubicación de cada país está en [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) y acepta pull requests.
2. La búsqueda de GitHub no puede ordenar por contribuciones, así que entre todos los que coinciden tomamos los **{{consider}} usuarios con más seguidores** y clasificamos solo a ellos. La página de cada país muestra cuántos seguidores tiene la persona con menos seguidores de las consideradas.
3. Se excluyen las organizaciones y los bots.
4. Cada persona pertenece exactamente a **un** país: el primero que menciona la ubicación de su perfil. Si se indican varios países, solo cuenta el primero.

## Qué se cuenta

Las contribuciones de los últimos 12 meses, tal como GitHub las cuenta en los perfiles:

- **Contribuciones públicas**: commits, pull requests, issues y revisiones visibles para todos.
- **Todas las contribuciones**: públicas más privadas. Las contribuciones privadas solo se cuentan para quienes eligieron mostrarlas en su perfil; para los demás, esta pestaña muestra el mismo número que la pública.
- **Commits**: solo commits públicos.

En caso de empate, gana quien tiene más seguidores y, después, se ordena por nombre de usuario.

Debajo de cada nombre: `C` commits públicos, `PR` pull requests, `IS` issues, `RV` revisiones y un candado para las contribuciones privadas (pasa el cursor para ver los números exactos).

## Marcas y exclusiones

Unas pocas reglas, iguales para todos, evitan que decidan un ranking los números que no se pueden comprobar o que ha generado un script. Cada marca muestra al pasar el cursor la regla que la produce y los números a los que se aplicó.

| Regla                  | Cuándo                                                                                                                                                                   | Qué ocurre                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Casi todo privado      | El {{private_flag}} % o más de las contribuciones son privadas                                                                                                           | Un candado junto al total en **Todas las contribuciones**                                 |
| Casi nada público      | Las contribuciones públicas no llegan al {{min_public}} % del total                                                                                                      | Fuera de **Todas las contribuciones**; sigue en los demás rankings                        |
| Granja de commits      | {{min_commits}} commits o más, al menos {{ratio}} veces más que pull requests, issues y revisiones juntos                                                                | Un robot en los rankings por país; fuera del ranking mundial y de las insignias mundiales |
| Un repositorio sin uso | {{min_commits}} commits o más, el {{quiet_share}} % o más en un único repositorio propio con menos de {{quiet_stars}} estrellas                                          | Lo mismo que una granja de commits                                                        |
| Excepción              | El {{popular_share}} % de los commits o más va a un repositorio ajeno con {{popular_stars}} estrellas o más, o a cualquier repositorio de una organización que tenga uno | Nunca se marca como automatizado                                                          |

GitHub informa de la actividad privada como un único número que no se puede desglosar ni verificar, así que solo cuenta cuando la respalda trabajo público; un candado por sí solo no excluye a nadie, porque mucha gente trabaja en código cerrado. Quien hace commits directamente en un proyecto muy usado, como suelen hacer quienes mantienen grandes proyectos comunitarios y distribuciones de Linux, no se considera automatizado: solo el propio proyecto puede darle acceso de escritura.

## Cómo comprobar los rankings

Los rankings siguen solo estas reglas y el orden de arriba; nadie se mueve a mano. Los umbrales están en [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), y su única lista manual, `denylist_ids`, solo cambia mediante un pull request público. Los números recogidos de cada país están en la [rama `data`](https://github.com/contributor-top/contributor.top/tree/data) del repositorio, así que cualquier ranking se puede recalcular y comprobar.

## ¿Por qué no aparezco?

- La ubicación de tu perfil no coincide con ningún texto del preset de tu país. La ubicación es texto libre: añade tu ciudad o tu país, o abre un pull request al preset.
- No estás entre los {{consider}} usuarios con más seguidores de tu país.
- Casi todas tus contribuciones son privadas (menos del {{min_public}} % públicas): solo quedas fuera de **Todas las contribuciones**.
- Tus contribuciones son privadas y no se muestran en tu perfil.
- Pediste que te eliminaran (consulta [Privacidad y exclusión](/es/privacy/)).

## Acceso a los datos

Cada ranking también está disponible en JSON: [`/api/index.json`](/api/index.json) lista los países, y `/api/<country>.json` (por ejemplo, `/api/canada.json`) contiene los tres rankings con puesto, nombre de usuario y contribuciones. El ranking mundial está en [`/api/world.json`](/api/world.json). Los archivos son estáticos y se pueden descargar desde cualquier sitio.

Úsalos para investigación sobre código abierto, estadísticas y proyectos comunitarios. No los uses para contactar a personas de forma masiva, para reclutamiento ni para revender los datos. Las personas que se excluyeron nunca aparecen.

## Actualizaciones

Los países se actualizan uno tras otro, empezando por el que lleva más tiempo sin actualizarse. La página de cada país muestra cuándo se actualizó por última vez.

Inspirado en [committers.top](https://committers.top).
