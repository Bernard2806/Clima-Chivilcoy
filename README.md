<div align="center">

<img src="./public/favicon.svg" alt="Clima Chivilcoy" width="96" />

# Clima Chivilcoy

**Clima en vivo de Chivilcoy (Buenos Aires), desde estaciones meteorológicas locales.**

Condiciones actuales, pronóstico, alertas oficiales y cámara en vivo, con datos de estaciones
físicas reales y actualización automática.

[![Ver en vivo](https://img.shields.io/badge/%F0%9F%8C%90%20Ver%20en%20vivo-climachivilcoy.netlify.app-111318)](https://climachivilcoy.netlify.app/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/fb8808d4-d874-47d5-a36e-84c543366ad1/deploy-status)](https://app.netlify.com/projects/climachivilcoy/deploys)
![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)
![Unidades](https://img.shields.io/badge/unidades-m%C3%A9tricas-blue)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-green)

</div>

---

## ✨ Qué ofrece

- ⛅ **Condiciones actuales**: temperatura, sensación, humedad, punto de rocío, presión, viento,
  lluvia, sol y luna.
- 📅 **Pronóstico** del día y **extendido del SMN**, con **alertas oficiales**.
- 🛰️ **Ensamble de estaciones locales** con **desglose por estación** (valor y antigüedad).
- 📷 **Cámara en vivo** de la estación y **visor de radar/satélite**.
- 🔄 **Auto-refresco** (~60 s; cámara ~2 min) y recarga manual al instante.
- 📱 **PWA instalable** en Android, iPhone y escritorio. **Unidades métricas** siempre.
- 🎨 Interfaz **Material 3**, en español.

## 🛰️ Estaciones

Combina cinco fuentes, cada una con su cobertura:

| Estación | Fuente |
| --- | --- |
| ClimaChivilcoy | [climachivilcoy.com.ar](https://climachivilcoy.com.ar/) (Meteobridge · Weather34) |
| INTA Chivilcoy | [chivilcoy.gov.ar/inta](https://chivilcoy.gov.ar/inta/) (API JSON) |
| LW6EQG Chivilcoy | [lw6eqg.ar](https://lw6eqg.ar/) |
| AFA Chivilcoy (`ICHIVI27`) | Weather Underground |
| Chivilcoy Zona Sur (`ICHIVI4`) | Weather Underground |

El valor combinado se calcula con **peso por frescura** de cada estación, de modo que las lecturas
más recientes mandan y las estaciones caídas se descartan solas. Detalle de códigos, hardware y
coordenadas en [docs/estaciones-publicas.md](./docs/estaciones-publicas.md).

## 🏗️ Arquitectura

- **Astro** con islas: página estática + endpoints on-demand (`/api/current`, `/api/webcam`).
- Todo el **scraping/parseo ocurre del lado servidor** (la fuente no expone CORS); el navegador
  sólo consume nuestros endpoints, con **caché ~60 s**.
- Lógica de fuentes aislada en `src/lib/`; UI en `src/pages/`.
- **Service worker network-only**: la app es instalable y nunca sirve datos viejos.

## 👨‍💻 Desarrollo

```bash
pnpm install   # instalar dependencias
pnpm dev       # servidor local
pnpm build     # build de producción
pnpm preview   # previsualizar el build
```

> Este repositorio usa **pnpm exclusivamente**. No `npm`, ni `yarn`, ni `bun`.

## 🤝 Créditos

Proyecto **no oficial** que sólo consume datos publicados. El mérito es de quienes generan y
mantienen la información: las estaciones **ClimaChivilcoy**, **INTA Chivilcoy** y **LW6EQG**, los
usuarios de **Weather Underground**, el **SMN** (alertas y pronóstico), **Weather34 Aurora MKII**
de Brian Underdown y **Meteobridge**. La interfaz usa **Material 3** (`@material/web`).
Las marcas, plantillas y datos pertenecen a sus respectivos autores.

## 📄 Licencia

El **código** está bajo [MIT](./LICENSE). Los **datos meteorológicos** y las plantillas de
terceros **no** están cubiertos por esta licencia y pertenecen a sus autores.
