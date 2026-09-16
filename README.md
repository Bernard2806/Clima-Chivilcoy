# Clima Chivilcoy

App web simple para consultar el clima **en vivo** de Chivilcoy, Buenos Aires. Muestra
las condiciones actuales y el pronóstico, con **actualización automática cada 60 segundos**.

Está pensada para uso cotidiano y como base para, más adelante, alimentar un modelo de
predicción propio.

## ¿De dónde salen los datos?

**Todos los datos provienen de la estación meteorológica local publicada en
[https://climachivilcoy.com.ar/](https://climachivilcoy.com.ar/).** Esta web no genera,
estima ni modela nada: sólo **lee y muestra** las mediciones de esa estación.

Ese sitio corre sobre:

- **Meteobridge**: sistema (hardware + software) que toma las lecturas de la estación física
  y las publica en la web.
- **Weather34 Aurora MKII**: plantilla PHP que arma el panel a partir de esos datos. Cada
  panel (temperatura, viento, lluvia, etc.) es un pequeño archivo `.php` que se refresca solo
  cada ~30-60 segundos.

### El problema del acceso

La fuente **no expone una API pública** ni envía cabeceras **CORS**, por lo que un navegador
no puede consultarla directamente. Por eso el acceso se hace **del lado del servidor**:

1. Un endpoint de Astro (`/api/current`) corre en el servidor (Netlify Function).
2. Ese endpoint pide los fragmentos HTML y los CSV a la fuente, los parsea y arma un JSON.
3. El navegador consume **sólo nuestro JSON**. Nunca se consulta la fuente desde el cliente.

Además se fuerza `?units=metric` en cada request para garantizar el sistema métrico.

## Cómo se obtienen los datos

### 1. Módulos en vivo (fragmentos HTML, refresco ~30-60 s)

Cada métrica actual sale de un endpoint independiente:

| Módulo | Datos que aporta |
| --- | --- |
| `temperaturemod-Chart-2024.php` | Temperatura actual, máxima, mínima y sensación térmica |
| `humiditymod-Chart-2024.php` | Humedad relativa, máxima y mínima |
| `dewpointmod-Chart-2024.php` | Punto de rocío y su tendencia |
| `barometermod-Chart-2024.php` | Presión y su tendencia |
| `weather34-wind-2024.php` | Viento promedio, ráfaga máxima y recorrido del viento |
| `rainmod-Chart-2024.php` | Lluvia de hoy, del mes y del año |
| `rainratemod-Chart-2024.php` | Intensidad de lluvia (mm/h) |
| `weather34-sun-moon-2024.php` | Amanecer, atardecer, luz diurna y datos de la luna |
| `weather34-Chart-forecast-2024.php` | Pronóstico (temperatura, ícono y texto) |
| `data-updated.php` | Antigüedad del último dato recibido |

El parseo de estos fragmentos es **frágil** por naturaleza (depende del HTML de la
plantilla) y por eso vive aislado en `src/lib/`.

### 2. Archivos CSV abiertos (vía estable, texto plano)

La propia web publica sus datos históricos como CSV, sin autenticación:

| Ruta | Contenido | Frecuencia |
| --- | --- | --- |
| `/weather34charts/{YYYY}/{DD}{Mon}{YYYY}.csv` | Serie del día (una fila cada ~10 min) | ~10 min |
| `/weather34charts/{YYYY}/{Month}.csv` | Resumen por día del mes | diario |
| `/weather34charts/{YYYY}.csv` | Resumen del año | diario |

Cobertura disponible: anuales **2020–2026**; series diarias de 10 min **2025–2026**;
resúmenes mensuales por mes.

Columnas del CSV diario (0-indexado):

```
0  flag            1  hora             2  temp °C         3  presión hPa
4  lluvia mm       5  UV               6  viento máx m/s 7  viento prom m/s
8  radiación solar 9  punto de rocío °C 10 rain rate      11 dir viento °
12 temp interior °C 13 hum interior %  14 fecha          15 sensación °C
16 rayos           17 hum exterior %   18 lluvia hoy      19-20 reservados
```

> En los gráficos de la fuente el viento se muestra en km/h (`valor_m/s × 3.6`).
> Los valores `--` o `**` significan **sin sensor / sin dato**.

## ¿Por qué es más preciso que las apps de clima cotidianas?

- Es una **estación física ubicada en la ciudad**: mide temperatura, humedad, presión, viento
  y lluvia en el lugar, no valores interpolados desde puntos lejanos.
- Se actualiza cada **~30-60 segundos**. Las apps comerciales suelen refrescar cada 10-30
  minutos y se apoyan en modelos regionales.
- Muestra **datos medidos** (máxima/mínima del día, lluvia acumulada, ráfagas) en lugar de
  promedios de grilla.

En resumen: para responder *"¿cómo está el clima acá ahora?"*, la estación local es más fiel;
para el pronóstico extendido, las apps globales siguen siendo mejores.

## Unidades

Siempre en **unidades métricas usadas en Argentina**, forzando `?units=metric` en la fuente:

- Temperatura y punto de rocío: **°C**
- Viento: **km/h**
- Presión: **hPa**
- Lluvia: **mm** / **mm/h**
- Humedad: **%**

Si la fuente llegara a responder en unidades imperiales, el cliente aplica **conversiones
defensivas** (°F→°C, mph/kts/m/s→km/h, inHg/mmHg→hPa, in→mm) para no mostrar valores raros.

## Cómo funciona (arquitectura)

- **Astro** con salida estática + endpoint on-demand: la página es estática y `/api/current`
  se renderiza en el servidor.
- El endpoint **cachea 60 s** para no sobrecargar la fuente.
- La UI consulta `/api/current` y se **auto-actualiza** cada 60 s.
- La interfaz sigue **Material 3** (Material Design de Google) con los web components
  `@material/web` e íconos **Material Symbols**.
- Scraping/parseo aislado en `src/lib/`; UI en `src/pages/`.

### Endpoint `/api/current`

Devuelve un JSON con, entre otros: `temperature`, `temperatureMax/Min`, `feelsLike`,
`humidity`, `dewpoint`, `pressure`, `windAvg/Max`, `rainToday/Month/Rate`, `sunrise`,
`sunset`, `moonPhase`, `forecast` y `sourceUpdatedSeconds`.

## Instalación como app (PWA)

La web es una **PWA**: se puede instalar como aplicación desde el navegador, sin tiendas.

- **Android / Chrome:** botón **Instalar** (o menú ⋮ → "Instalar aplicación").
- **iPhone / Safari:** Compartir → **"Agregar a pantalla de inicio"**.
- **Escritorio:** ícono de instalar en la barra de direcciones.

Una vez instalada abre en pantalla completa, con su propio ícono, y se actualiza igual que en
el navegador.

### Necesita internet

La app **requiere conexión** para mostrar datos. Si no hay internet muestra un aviso
("Sin conexión a internet") y el estado de error en el encabezado; al volver la conexión se
reconecta y actualiza sola. El *app shell* (página, íconos y estilos) se cachea para que la
app abra incluso sin conexión y pueda mostrar el aviso.

## Desarrollo

```bash
pnpm install
pnpm dev     # servidor local
pnpm build   # build de producción
```

> Este repositorio usa **pnpm exclusivamente**. No usar `npm` ni `yarn`.

## Fuente y notas

- Sitio: [https://climachivilcoy.com.ar/](https://climachivilcoy.com.ar/)
- Plantilla: Weather34 Aurora MKII sobre Meteobridge.
- La fuente no ofrece API ni CORS; su scraping puede romperse si cambian la plantilla.
- La portada del sitio indica `LICENSE EXPIRED 2026-05-03`; la fuente podría discontinuarse
  en el futuro.

## Créditos

Este proyecto **no es oficial** y sólo consume datos publicados públicamente. Todo el mérito
es de quienes generan, publican y mantienen la información:

- **Datos meteorológicos:** estación **ClimaChivilcoy** —
  [climachivilcoy.com.ar](https://climachivilcoy.com.ar/). Gracias a quien la opera y mantiene.
- **Plantilla del panel:** **Weather34 Aurora MKII**, creada por **Brian Underdown
  (Weather34)**.
- **Plataforma de publicación:** **Meteobridge** (smartbedded / [meteobridge.com](https://www.meteobridge.com/)).
- **Íconos meteorológicos:** set de **Weather34**.
- **Texto de pronóstico:** **Weather Underground**, servido a través de Meteobridge.
- **Logo de la app:** basado en íconos de **[Heroicons](https://heroicons.com/)** (MIT, Tailwind Labs).
- **Interfaz (UX):** **[Material 3](https://m3.material.io/)** de Google, con `@material/web`
  e íconos **Material Symbols** (Apache-2.0).
- **Stack de esta app:** [Astro](https://astro.build/), TypeScript y [Netlify](https://www.netlify.com/).

Las marcas, plantillas y datos pertenecen a sus respectivos autores.

## Licencia

El **código** de este proyecto está bajo la licencia [MIT](./LICENSE).

Los **datos meteorológicos** y las plantillas de terceros (Weather34, Meteobridge, Weather
Underground) **no** están cubiertos por esta licencia y pertenecen a sus respectivos autores
(ver [Créditos](#créditos)).
