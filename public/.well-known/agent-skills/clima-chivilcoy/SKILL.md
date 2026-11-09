---
name: clima-chivilcoy
description: Consulta el clima en vivo de Chivilcoy, Buenos Aires, con pronóstico y alertas del SMN.
---

# Clima Chivilcoy

Hacé un `GET https://climachivilcoy.netlify.app/api/current`. Responde JSON, no requiere
autenticación y se actualiza cada 60 segundos: no la consultes más seguido.

Campos principales, siempre en unidades métricas:

- `temperature`, `feelsLike`, `dewpoint`: °C
- `humidity`: %
- `pressure`: hPa
- `windAvg`, `windMax`: km/h
- `rainToday`: mm
- `stationCount`: estaciones que aportan datos
- `alerts`: alertas vigentes del SMN
- `smnForecast`: pronóstico extendido del SMN

Cualquier valor puede ser `null` si ninguna estación tiene una lectura reciente.
