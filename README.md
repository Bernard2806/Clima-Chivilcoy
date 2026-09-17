<div align="center">

<img src="./public/favicon.svg" alt="Clima Chivilcoy" width="96" />

# Clima Chivilcoy

**Clima en vivo de Chivilcoy (Buenos Aires), directo desde las estaciones locales.**

Condiciones actuales y pronóstico, con datos reales de estaciones meteorológicas físicas y
actualización automática.

[![Netlify Status](https://api.netlify.com/api/v1/badges/fb8808d4-d874-47d5-a36e-84c543366ad1/deploy-status)](https://app.netlify.com/projects/climachivilcoy/deploys)
[![Sitio en vivo](https://img.shields.io/badge/ver%20en%20vivo-climachivilcoy.netlify.app-111318?logo=googlechrome&logoColor=white)](https://climachivilcoy.netlify.app/)
![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-green)
![Unidades](https://img.shields.io/badge/unidades-m%C3%A9tricas-blue)

</div>

---

## ✨ Qué ofrece

| | |
| --- | --- |
| ⛅ | **Condiciones actuales + pronóstico** del día, simples y a mano. |
| 📊 | Panel de temperatura, sensación, humedad, punto de rocío, presión, viento, lluvia, sol y luna. |
| 🛰️ | **Dos estaciones locales combinadas**: ClimaChivilcoy e INTA Chivilcoy (ensamble por variable). |
| 📷 | **Cámara en vivo** de la estación, con lecturas sobreimpresas y vista a pantalla completa. |
| 🔄 | **Auto-refresco**: datos ~60 s, cámara ~2 min — más recarga manual al instante. |
| 📱 | **PWA instalable** en Android, iPhone y escritorio. |
| 🇦🇷 | **Unidades métricas** argentinas, siempre. |
| 🎨 | Interfaz **Material 3** (Material Design). |

## 🔎 De dónde salen los datos

Esta web **no genera, estima ni modela el clima**: lee y muestra mediciones de estaciones
físicas reales ubicadas en Chivilcoy. Combina dos fuentes.

### Estación 1 — ClimaChivilcoy

Panel público en [climachivilcoy.com.ar](https://climachivilcoy.com.ar/), sobre
**Meteobridge** (hardware de la estación) con la plantilla **Weather34 Aurora MKII**. No expone
API ni CORS, así que **todo el acceso se hace del lado del servidor**:

- **Módulos en vivo** (fragmentos HTML, refresco ~30-60 s): cada métrica sale de un `.php`.
- **CSV abiertos** (texto plano, sin auth): series históricas diarias/mensuales/anuales.

### Estación 2 — INTA Chivilcoy

[Estación del INTA](https://chivilcoy.gov.ar/inta/) que expone un endpoint **JSON** en
`https://chivilcoy.gov.ar/inta/api.php` (con `Access-Control-Allow-Origin: *`). Aporta
temperatura, humedad, punto de rocío, sensación térmica, presión, viento, ráfaga, dirección y
lluvia, **ya en unidades métricas**. Refresca con menor frecuencia (cada pocos minutos).

## 🧮 Cómo se combinan (ensamble por variable)

Las dos estaciones calzan bien en las variables lentas, pero **divergen en viento y presión**
(están en sitios distintos y miden el viento con exposiciones diferentes; la presión difiere por
el método de reducción). Por eso no se promedia todo a ciegas, sino con reglas por variable:

| Variable | Regla |
| --- | --- |
| Temperatura · Sensación · Humedad · Punto de rocío | **Promedio** de ambas (cuando hay lectura). |
| Ráfaga máxima | **Máximo** entre las dos. |
| Velocidad del viento | **ClimaChivilcoy** (más frecuente y coherente). |
| Presión | **ClimaChivilcoy** (no promediar: son criterios de reducción distintos). |

La UI muestra un **desglose por estación** con su valor crudo y su antigüedad ("hace 30 s" /
"hace 14 min"), así el dato combinado nunca tapa la fuente. Si una estación falla, todo degrada
limpiamente a la otra.

## 🏗️ Arquitectura

- **Astro** con islas: página estática + endpoints on-demand (`/api/current`, `/api/webcam`).
- **Scraping/parseo aislado** en `src/lib/` (`source.ts`, `inta.ts`, `ensemble.ts`, `translate.ts`);
  UI en `src/pages/`.
- `/api/current` pide ambos orígenes en paralelo, los parsea, arma el JSON combinado y
  **cachea ~60 s** para no sobrecargar la fuente. Se fuerza `?units=metric` en cada request.
- `/api/webcam` actúa de **proxy** de la imagen de la cámara (cumple la regla de nunca tocar la
  fuente desde el navegador), con caché corta y modo `?refresh=1` para forzar al toque.
- El cliente consume **sólo nuestros endpoints** (JSON + imagen), nunca la fuente.
- **Service worker network-only**: basta para que la app sea instalable, y así **no sirve
  contenido viejo cacheado**.

### Endpoint `/api/current`

Devuelve, entre otros: `temperature`, `feelsLike`, `temperatureMax/Min`, `humidity`, `dewpoint`,
`pressure`, `windAvg/Max`, `rainToday/Month/Rate`, `sunrise`, `sunset`, `moonPhase`, `forecast`,
`sourceUpdatedSeconds`, más `sources[]` y `stationCount` para el desglose por estación.

## 📷 Cámara en vivo

Imagen de la estación servida por Meteobridge (`.../camplus.jpg`, con lecturas sobreimpresas).
Se muestra via `/api/webcam` y **se actualiza sola cada ~2 min**; se puede **forzar al instante**
con el botón ↻ (en la tarjeta o dentro del modo pantalla completa). Tocando la imagen se abre a
pantalla completa.

## 📱 PWA instalable

- **Android / Chrome:** botón **Instalar** (o menú ⋮ → "Instalar aplicación").
- **iPhone / Safari:** Compartir → **"Agregar a pantalla de inicio"**.
- **Escritorio:** ícono de instalar en la barra de direcciones.

En teléfonos y tablets aparece además un botón flotante para instalar; si la app ya está
instalada, no se muestra. Para refrescar: deslizá hacia abajo desde el tope, o usá el botón del
encabezado.

> **Necesita internet.** Los datos son en vivo y **no se cachean**: sin conexión se ve el aviso
> "Sin conexión a internet" y el estado de error. Al reconectar, se actualiza solo.

## 🌡️ Unidades

Siempre **métricas argentinas**, forzando `?units=metric` en la fuente: **°C**, **km/h**,
**hPa**, **mm** / **mm/h**, **%**. Si la fuente respondiera en imperiales, se aplican
**conversiones defensivas** (°F→°C, mph/kts/m/s→km/h, inHg/mmHg→hPa, in→mm).

## 🧩 Fuente de datos: detalle

### Módulos en vivo de ClimaChivilcoy (fragmentos HTML, refresco ~30-60 s)

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
| `weather34-Chart-forecast-2024.php` | Pronóstico (período, condición, máx/mín, viento e ícono) |
| `data-updated.php` | Antigüedad del último dato recibido |

El parseo de estos fragmentos es **frágil** (depende del HTML de la plantilla) y por eso vive
aislado en `src/lib/`.

### CSV abiertos de ClimaChivilcoy (texto plano, sin auth)

| Ruta | Contenido | Frecuencia |
| --- | --- | --- |
| `/weather34charts/{YYYY}/{DD}{Mon}{YYYY}.csv` | Serie del día (una fila cada ~10 min) | ~10 min |
| `/weather34charts/{YYYY}/{Month}.csv` | Resumen por día del mes | diario |
| `/weather34charts/{YYYY}.csv` | Resumen del año | diario |

Cobertura: anuales **2020–2026**; series diarias de 10 min **2025–2026**; resúmenes mensuales.

Columnas del CSV diario (0-indexado):

```text
0  flag            1  hora             2  temp °C         3  presión hPa
4  lluvia mm       5  UV               6  viento máx m/s 7  viento prom m/s
8  radiación solar 9  punto de rocío °C 10 rain rate      11 dir viento °
12 temp interior °C 13 hum interior %  14 fecha          15 sensación °C
16 rayos           17 hum exterior %   18 lluvia hoy      19-20 reservados
```

> En los gráficos de la fuente el viento se muestra en km/h (`valor_m/s × 3.6`).
> Los valores `--` o `**` significan **sin sensor / sin dato**.

## 👨‍💻 Desarrollo

```bash
pnpm install   # instalar dependencias
pnpm dev       # servidor local
pnpm build     # build de producción
pnpm preview   # previsualizar el build
```

> Este repositorio usa **pnpm exclusivamente**. No `npm`, ni `yarn`, ni `bun`.

Estructura:

```text
src/
  lib/       scraping y parseo (source.ts, inta.ts, ensemble.ts, translate.ts, units.ts, types.ts)
  pages/
    index.astro        panel principal (isla interactiva + PWA)
    api/current.ts     endpoint combinado de clima
    api/webcam.ts      proxy de la cámara
public/      manifest, service worker, íconos y favicon de INTA
```

## 🤝 Créditos

Proyecto **no oficial** que sólo consume datos publicados. El mérito es de quienes generan y
mantienen la información:

- **Datos:** estaciones **ClimaChivilcoy** ([climachivilcoy.com.ar](https://climachivilcoy.com.ar/))
  e **INTA Chivilcoy** ([chivilcoy.gov.ar/inta](https://chivilcoy.gov.ar/inta/)).
- **Panel y plantilla:** **Weather34 Aurora MKII** de **Brian Underdown (Weather34)**; íconos
  meteorológicos del set de Weather34.
- **Publicación:** **Meteobridge** (smartbedded · [meteobridge.com](https://www.meteobridge.com/)).
- **Pronóstico (texto):** **Weather Underground**, servido vía Meteobridge.
- **Interfaz:** **[Material 3](https://m3.material.io/)** de Google, con `@material/web` e íconos
  **Material Symbols** (Apache-2.0).
- **Stack:** [Astro](https://astro.build/), TypeScript y [Netlify](https://www.netlify.com/).

Las marcas, plantillas y datos pertenecen a sus respectivos autores.

## 📄 Licencia

El **código** de este proyecto está bajo la licencia [MIT](./LICENSE). Los **datos
meteorológicos** y las plantillas de terceros (Weather34, Meteobridge, Weather Underground) **no**
están cubiertos por esta licencia y pertenecen a sus autores.
