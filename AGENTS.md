# AGENTS.md

Reglas y contexto para agentes que trabajen en este repositorio.

## Regla importantísima

> **Usar solo `pnpm`.** Nunca `npm`, `yarn` ni `bun`. Todo comando, script, instalación
> o lockfile se hace con `pnpm`. Si una guía o herramienta sugiere otro gestor, traducilo
> a su equivalente de `pnpm` (`pnpm install`, `pnpm add <paquete>`, `pnpm dlx`, etc.).

## Proyecto

App web de clima **en vivo de Chivilcoy (Buenos Aires)**. Combina lecturas de **cinco
estaciones meteorológicas locales** en un **ensamble ponderado por frescura**, y suma
**pronóstico y alertas oficiales del SMN**, **cámara en vivo** y **visor de radar/satélite**.

Es un proyecto **no oficial** que solo consume datos publicados por terceros (ver
`docs/estaciones-publicas.md`). A futuro, la idea es usar estos datos para alimentar un
modelo de predicción propio (p. ej. WeatherNex3).

## Alcance

- **Condiciones actuales** (temperatura, sensación, humedad, punto de rocío, presión,
  viento, lluvia, sol y luna) calculadas como promedio ponderado de las estaciones activas.
- **Desglose por estación**: lectura individual, antigüedad y enlace a su portal.
- **Pronóstico** de la estación local + **extendido oficial del SMN** (6 días).
- **Alertas oficiales del SMN** (avisos a corto plazo, alertas y temperaturas extremas).
- **Cámara en vivo** de la estación y **visor plegable de radar/satélite**.
- **Auto-refresco** (~60 s; cámara ~2 min), recarga manual y *pull-to-refresh* en móvil.
- **PWA instalable**, unidades métricas siempre.

## Stack y despliegue

- **Astro** (v7) con islas. **No se usa React** hoy: la UI se resuelve con Astro + JS
  vanilla dentro de `index.astro`. Solo sumar React si un componente lo justifica de verdad.
- **TypeScript** en todo el código (`src/`).
- Gestor de paquetes: **pnpm exclusivamente**. Nunca `npm` ni `yarn`.
- Despliegue en **Netlify Free** (`@astrojs/netlify` v8).
- **Producción:** https://climachivilcoy.netlify.app/ — deploy automático desde `main`.
  El `site` de Astro está fijado a esa URL en `astro.config.mjs`.
- `netlify.toml` fija `NODE_VERSION = "22"` y `command = "pnpm build"`.
- El acceso a datos va por **endpoints server-side** (API routes de Astro / Netlify Functions):
  `/api/current` (JSON del clima) y `/api/webcam` (imagen de la cámara).

## Fuentes de datos

El ensamble combina **cinco estaciones**, cada una parseada en su propio módulo de `src/lib/`:

| Estación | Fuente | Tipo | Módulo |
| --- | --- | --- | --- |
| ClimaChivilcoy (Barrio Alsina) | [climachivilcoy.com.ar](https://climachivilcoy.com.ar/) | HTML (Weather34/Meteobridge) | `source.ts` |
| INTA Chivilcoy | [chivilcoy.gov.ar/inta/api.php](https://chivilcoy.gov.ar/inta/api.php) | API JSON | `inta.ts` |
| LW6EQG Chivilcoy | [lw6eqg.ar](https://lw6eqg.ar/) | HTML | `lw6eqg.ts` |
| AFA Chivilcoy (`ICHIVI27`) | Weather Underground API | JSON | `wu.ts` |
| Chivilcoy Zona Sur (`ICHIVI4`) | Weather Underground API | JSON | `wu.ts` |

Además, **SMN** (Servicio Meteorológico Nacional) aporta alertas y pronóstico extendido
vía su FeatureServer de ArcGIS (`smn.ts`). Códigos, coordenadas y hardware de cada estación
están documentados en [docs/estaciones-publicas.md](./docs/estaciones-publicas.md).

### Reglas de oro

- **NUNCA** hacer `fetch` a las fuentes desde el navegador (CORS). Todo scraping/parseo
  ocurre **del lado servidor** en `src/lib/`; el cliente solo consume `/api/current`.
- Cachear la respuesta del endpoint **~60 s** (las fuentes refrescan cada ~30-60 s).
- Tratar el scraping HTML como **frágil**: aislarlo en `src/lib/` y no romper el parseo
  de una estación por culpa de otra (cada snapshot se obtiene con `.catch(() => null)`).
- No sobrecargar las fuentes: nada de polling agresivo ni paralelismo excesivo; usar
  `AbortSignal.timeout(...)` en todos los `fetch`.
- Las estaciones caídas se **descartan solas**: el ensamble pondera por frescura
  (`ensemble.ts`) y las lecturas viejas pierden peso hasta quedar fuera.

### Ensamble (`src/lib/ensemble.ts`)

- El valor combinado es un **promedio ponderado por antigüedad** (`updatedSeconds`) de cada
  estación, con vida media de ~15 min y ventana fresca de ~2 min.
- La estación base es ClimaChivilcoy (`getCurrentWeather()`); las otras cuatro son
  `StationSnapshot` opcionales que se combinan encima.
- Campos sin dato se resuelven con `?? current.<campo>` (fallback a ClimaChivilcoy).

### Módulos en vivo de ClimaChivilcoy (fragmentos HTML, refresco ~30-60 s)

`source.ts` parsea estos PHP de la plantilla Weather34 Aurora MKII:

- `temperaturemod-Chart-2024.php`, `humiditymod-Chart-2024.php`, `dewpointmod-Chart-2024.php`
- `barometermod-Chart-2024.php`, `weather34-wind-2024.php`, `rainmod-Chart-2024.php`,
  `rainratemod-Chart-2024.php`
- `weather34-sun-moon-2024.php`, `weather34-Chart-forecast-2024.php`, `data-updated.php`

Nota: la portada de la fuente indica `LICENSE EXPIRED 2026-05-03`; la fuente podría
discontinuarse. Las demás estaciones (INTA, LW6EQG, WU) son las que dan resiliencia.

### Cámara y radar/satélite

- **Cámara**: `/api/webcam` sirve la imagen de Meteobridge (`content.meteobridge.com`,
  configurable con la env `WEBCAM_URL`). Se cachea ~15 s en el server.
- **Radar/satélite**: se cargan **del lado cliente** (iframe de RainViewer + imágenes
  estáticas de GOES-19 de NOAA). No pasan por nuestros endpoints.

## Unidades (obligatorio)

- **Solo unidades métricas usadas en Argentina**: °C, km/h, hPa, mm, mm/h, %.
- **Nunca** °F, mph, inHg, pulgadas ni otras unidades extranjeras.
- Forzar `?units=metric` en los requests a la fuente (Weather34) para garantizar el sistema
  métrico. Las conversiones viven en `src/lib/units.ts`.

## UI

- Toda la interfaz en **español**, simple y directa.
- Estética **Material 3** estilo **Google Pixel Weather** (modo oscuro), con `@material/web`
  e íconos Material Symbols. Todo el markup y CSS vive en `src/pages/index.astro`.
- Web **instalable como PWA** (manifest + service worker). El service worker es
  **network-only**: no cachea datos ni shell; si no hay conexión se muestra un aviso de error.

## Convenciones de código

- Código y nombres de variables en **inglés**; textos de UI en **español**.
- **No agregar comentarios** salvo que se pidan explícitamente.
- Separar **scraping/parseo y fuentes** (`src/lib/`) de **UI** (`src/pages/`).
- Preferir HTML/CSS liviano; evitar dependencias innecesarias.
- Nunca hardcodear secretos ni claves: usar variables de entorno (p. ej. `WU_API_KEY`).

## Commits — Conventional Commits en español

Formato: `tipo(scope): descripción`

- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.
- Descripción en **español**, minúscula, modo imperativo, sin punto final.
- Scope opcional y en minúscula: `feat(api): ...`, `fix(ui): ...`.
- Ejemplos:
  - `feat: agrega panel de condiciones actuales`
  - `feat(api): expone endpoint /api/current con cache de 60s`
  - `feat(estaciones): agrega estaciones ichivi27 e ichivi4 al ensamble`
  - `fix: corrige parseo de la presión`
  - `chore: configura despliegue en netlify`
- **No commitear** salvo pedido explícito del usuario.

## Comandos

```bash
pnpm install   # instalar dependencias
pnpm dev       # servidor local
pnpm build     # build de producción
pnpm preview   # previsualizar el build
pnpm icons     # regenera los íconos PWA (public/icons, favicon, apple-touch-icon)
```

No hay `pnpm lint` ni `pnpm typecheck` definidos. Para validar tipos usar
`pnpm astro check` si está disponible; si no, no asumir y preguntar al usuario.

## Entorno

- Trabajo sobre **WSL**; el repo vive en `/mnt/e/...`.
- `node` **no está en el PATH de WSL**; existe Node de Windows (`node.exe` v24.19.0 en
  `/mnt/c/Program Files/nodejs/`). Verificar el runtime antes de correr scripts.
- `pnpm` está disponible (v11.25.0, instalado en Windows en
  `/mnt/c/Users/Bernardo/AppData/Local/pnpm/bin/pnpm`). Es el único gestor permitido.
- `scripts/` incluye utilidades de desarrollo (`generate-icons.mjs`, `test-lw6eqg.mjs`);
  no forman parte del build de producción.

## Idioma

- Responder y documentar en **español**.
