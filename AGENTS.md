# AGENTS.md

Reglas y contexto para agentes que trabajen en este repositorio.

## Regla importantísima

> **Usar solo `pnpm`.** Nunca `npm`, `yarn` ni `bun`. Todo comando, script, instalación
> o lockfile se hace con `pnpm`. Si una guía o herramienta sugiere otro gestor, traducilo
> a su equivalente de `pnpm` (`pnpm install`, `pnpm add <paquete>`, `pnpm dlx`, etc.).

## Proyecto

App web de clima **simple para uso cotidiano**, que muestra los datos **en vivo** de la
estación de ClimaChivilcoy. A futuro, la idea es usar estos datos para alimentar un
modelo de predicción propio (p. ej. WeatherNex3).

## Alcance v1

- Panel de **condiciones actuales + pronóstico** del día.
- Estética base **simple y cómoda** para consultar rápido.
- Datos que se **actualizan solos** (auto-refresh cada ~60 s), sin recargar a mano.

## Stack y despliegue

- **Astro** con islas. Usar React **solo** si un componente realmente lo necesita.
- **TypeScript** en todo el código.
- Gestor de paquetes: **pnpm exclusivamente**. Nunca `npm` ni `yarn`.
- Despliegue en **Netlify Free** (`@astrojs/netlify`).
- El acceso a datos va por un **endpoint server-side** (API route de Astro / Netlify Function).

## Fuente de datos

Sitio: `https://climachivilcoy.com.ar/` — plantilla **Weather34 Aurora MKII sobre Meteobridge**.
No expone API ni cabeceras **CORS**.

### Reglas de oro

- **NUNCA** hacer `fetch` a la fuente desde el navegador (lo bloquea CORS).
- Todo scraping/parseo ocurre **del lado servidor**. El cliente solo consume nuestro JSON.
- Cachear la respuesta del endpoint **~60 s** (los módulos PHP refrescan cada ~30-60 s).
- Tratar el scraping HTML como **frágil**: aislarlo en `src/lib/`, con tests si es posible.
- No sobrecargar la fuente: nada de polling agresivo ni paralelismo excesivo.

### CSV abiertos (vía estable, texto plano, sin auth)

| Ruta | Contenido | Frecuencia |
| --- | --- | --- |
| `/weather34charts/{YYYY}/{DD}{Mon}{YYYY}.csv` | Serie del día | ~10 min |
| `/weather34charts/{YYYY}/{Month}.csv` | Resumen por día del mes | diario |
| `/weather34charts/{YYYY}.csv` | Resumen del año | diario |

Cobertura: anuales **2020–2026**; diarios de 10 min **2025–2026**; mensuales por mes.

Columnas del CSV diario (0-indexado, verificar contra el código de los charts):

```
0  flag            1  hora             2  temp °C         3  presión hPa
4  lluvia mm       5  UV               6  viento máx m/s 7  viento prom m/s
8  radiación solar 9  punto de rocío °C 10 rain rate      11 dir viento °
12 temp interior °C 13 hum interior %  14 fecha          15 sensación °C
16 rayos           17 hum exterior %   18 lluvia hoy      19-20 reservados
```

- El viento en los charts se muestra en km/h: `valor_m/s × 3.6`.
- `--` / `**` significan **sin sensor / sin dato**.

### Módulos en vivo (fragmentos HTML, refresco ~30-60 s)

- `temperaturemod-Chart-2024.php`, `humiditymod-Chart-2024.php`, `dewpointmod-Chart-2024.php`
- `barometermod-Chart-2024.php`, `weather34-wind-2024.php`, `rainmod-Chart-2024.php`,
  `rainratemod-Chart-2024.php`
- `weather34-sun-moon-2024.php`, `weather34-Chart-forecast-2024.php`
- Otros: `forecastcharts/chartforecast.php`, `outlookwutext.php`, `metarnearby.php`,
  `eqlist.php`, `weather34-webcam-full.php`, `forecastalert.php`, `weather34-warning.php`

Nota: la portada indica `LICENSE EXPIRED 2026-05-03`; la fuente podría discontinuarse.

## Unidades (obligatorio)

- **Solo unidades métricas usadas en Argentina**: °C, km/h, hPa, mm, mm/h, %.
- **Nunca** °F, mph, inHg, pulgadas ni otras unidades extranjeras.
- Forzar `?units=metric` en los requests a la fuente para garantizar el sistema métrico.

## UI

- Toda la interfaz en **español**, simple y directa.
- Estética **Material 3** (Material Design de Google) con `@material/web` e íconos Material Symbols.
- Web **instalable como PWA** (manifest + service worker). Requiere internet para los datos;
  si no hay conexión, mostrar un aviso de error.

## Convenciones de código

- Código y nombres de variables en **inglés**; textos de UI en **español**.
- **No agregar comentarios** salvo que se pidan explícitamente.
- Separar **scraping/parseo** (`src/lib/`) de **UI** (`src/components/`, `src/pages/`).
- Preferir HTML/CSS liviano; evitar dependencias innecesarias.
- Nunca hardcodear secretos ni claves.

## Commits — Conventional Commits en español

Formato: `tipo(scope): descripción`

- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.
- Descripción en **español**, minúscula, modo imperativo, sin punto final.
- Scope opcional y en minúscula: `feat(api): ...`, `fix(ui): ...`.
- Ejemplos:
  - `feat: agrega panel de condiciones actuales`
  - `feat(api): expone endpoint /api/current con cache de 60s`
  - `fix: corrige parseo de la presión`
  - `chore: configura despliegue en netlify`
- **No commitear** salvo pedido explícito del usuario.

## Comandos

Pendientes de definir al scaffoldear el proyecto. Previsto: `pnpm dev`, `pnpm build`,
`pnpm lint`. Si no existen, preguntar al usuario en vez de asumir.

## Entorno

- Trabajo sobre **WSL**; el repo vive en `/mnt/e/...`.
- `node` **no está en el PATH de WSL**; existe Node de Windows (`node.exe` v24.19.0 en
  `/mnt/c/Program Files/nodejs/`). Verificar el runtime antes de correr scripts.
- `pnpm` está disponible (v11.25.0, instalado en Windows en
  `/mnt/c/Users/Bernardo/AppData/Local/pnpm/bin/pnpm`). Es el único gestor permitido.

## Idioma

- Responder y documentar en **español**.
