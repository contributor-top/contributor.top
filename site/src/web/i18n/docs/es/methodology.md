---
title: Metodología
description: Cómo contributor.top selecciona y clasifica a los usuarios de GitHub.
---

# Metodología

## A quién se tiene en cuenta

1. Para cada país buscamos en GitHub usuarios cuya **ubicación** de perfil coincide con el país o con una de sus ciudades. La lista de textos de ubicación de cada país está en [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) y acepta pull requests.
2. La búsqueda de GitHub no puede ordenar por contribuciones, así que entre todos los que coinciden tomamos los **1000 usuarios con más seguidores** y clasificamos solo a ellos. La página de cada país muestra cuántos seguidores tiene la persona con menos seguidores de las consideradas.
3. Se excluyen las organizaciones y los bots.
4. Cada persona pertenece exactamente a **un** país: el primero que menciona la ubicación de su perfil. Si se indican varios países, solo cuenta el primero.

## Qué se cuenta

Las contribuciones de los últimos 12 meses, tal como GitHub las cuenta en los perfiles:

- **Contribuciones públicas**: commits, pull requests, issues y revisiones visibles para todos.
- **Todas las contribuciones**: públicas más privadas. Las contribuciones privadas solo se cuentan para quienes eligieron mostrarlas en su perfil; para los demás, esta pestaña muestra el mismo número que la pública.
- **Commits**: solo commits públicos.

En caso de empate, gana quien tiene más seguidores y, después, se ordena por nombre de usuario.

Debajo de cada nombre: `C` commits públicos, `PR` pull requests, `IS` issues, `RV` revisiones y un candado para las contribuciones privadas (pasa el cursor para ver los números exactos). GitHub informa de la actividad privada como un único número que no se puede desglosar ni verificar, por eso en el ranking **Todas las contribuciones** un pequeño candado junto al total marca a las personas cuyas contribuciones son casi por completo (90 % o más) privadas. No se las excluye: mucha gente trabaja en código cerrado. El ranking principal usa solo contribuciones públicas.

Algunas cuentas registran una cantidad enorme de commits y casi ninguna otra actividad: ni pull requests, ni issues, ni revisiones. Así es como se ve un script que hace commits al mismo repositorio todo el día, y también una cuenta cuyos commits van casi todos a un repositorio propio que nadie más usa. Quienes hacen commits directamente a un proyecto ajeno muy usado, como suelen hacer los mantenedores de grandes proyectos comunitarios, no se consideran automatizados. Estas cuentas se marcan con un pequeño robot en los rankings de países y quedan fuera del ranking mundial y de las insignias mundiales.

## ¿Por qué no aparezco?

- La ubicación de tu perfil no coincide con ningún texto del preset de tu país. La ubicación es texto libre: añade tu ciudad o tu país, o abre un pull request al preset.
- No estás entre los 1000 usuarios con más seguidores de tu país.
- Tus contribuciones son privadas y no se muestran en tu perfil.
- Pediste que te eliminaran (consulta [Privacidad y exclusión](/es/privacy/)).

## Acceso a los datos

Cada ranking también está disponible en JSON: [`/api/index.json`](/api/index.json) lista los países, y `/api/<country>.json` (por ejemplo, `/api/canada.json`) contiene los tres rankings con puesto, nombre de usuario y contribuciones. El ranking mundial está en [`/api/world.json`](/api/world.json). Los archivos son estáticos y se pueden descargar desde cualquier sitio.

Úsalos para investigación sobre código abierto, estadísticas y proyectos comunitarios. No los uses para contactar a personas de forma masiva, para reclutamiento ni para revender los datos. Las personas que se excluyeron nunca aparecen.

## Actualizaciones

Los países se actualizan uno tras otro, empezando por el que lleva más tiempo sin actualizarse. La página de cada país muestra cuándo se actualizó por última vez.

Inspirado en [committers.top](https://committers.top).
