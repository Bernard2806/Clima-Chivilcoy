# Clima Chivilcoy

App web simple para consultar el clima **en vivo** de Chivilcoy, Buenos Aires. Muestra
las condiciones actuales y el pronóstico, con **actualización automática cada 60 segundos**.

## ¿De dónde salen los datos?

De la estación meteorológica local publicada en **https://climachivilcoy.com.ar/**, que
corre la plantilla **Weather34 Aurora MKII sobre Meteobridge**. La estación mide y publica
sus datos; esta web **no genera ni estima** nada, sólo lee y muestra esas mediciones.

Como el sitio no expone una API ni cabeceras **CORS**, los datos se obtienen **del lado del
servidor** (un endpoint de Astro desplegado en Netlify) y se sirven como JSON al navegador.
Nunca se consulta la fuente directamente desde el cliente.

## ¿Por qué es más preciso que las apps de clima cotidianas?

- Es una **estación física ubicada en la ciudad**: mide temperatura, humedad, presión, viento
  y lluvia en el lugar, no valores interpolados desde puntos lejanos.
- Se actualiza cada **~30-60 segundos**. Las apps comerciales suelen refrescar cada 10-30
  minutos y se apoyan en modelos regionales.
- Muestra **datos medidos** (máxima/mínima del día, lluvia acumulada, ráfagas) en lugar de
  promedios de grilla.

En resumen: para responder *"¿cómo está el clima acá ahora?"*, la estación local es más fiel;
para el pronóstico extendido, las apps globales siguen siendo mejores.

## Cómo funciona

- **Astro** con salida estática + endpoint on-demand: la página es estática y `/api/current`
  se renderiza en el servidor.
- El endpoint **cachea 60 s** para no sobrecargar la fuente.
- La UI consulta `/api/current` y se **auto-actualiza** cada 60 s.
- Scraping/parseo aislado en `src/lib/`; UI en `src/pages/`.

## Desarrollo

```bash
pnpm install
pnpm dev     # servidor local
pnpm build   # build de producción
```

> Este repositorio usa **pnpm exclusivamente**. No usar `npm` ni `yarn`.

## Fuente de datos

- Sitio: https://climachivilcoy.com.ar/
- Plantilla: Weather34 Aurora MKII sobre Meteobridge.

> Nota: la portada del sitio indica `LICENSE EXPIRED 2026-05-03`; la fuente podría
> discontinuarse en el futuro.
