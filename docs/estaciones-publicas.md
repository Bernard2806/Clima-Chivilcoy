# Estaciones — códigos públicos y coordenadas

Documento de referencia con la identificación de cada estación del proyecto en redes
públicas de observación, más su ubicación. Verificado el 2026-09-17/18.

## Punto centro de Chivilcoy

Coordenadas del punto centro de la ciudad, usadas como referencia geográfica:

- Latitud: `-34.8968559839007`
- Longitud: `-60.01908793360461`

## Resumen

| Estación | Nombre en WU | Red / código | Coordenadas (lat, lon) | Elevación | Software de subida |
| --- | --- | --- | --- | --- | --- |
| ClimaChivilcoy | Barrio Alsina (Zona Este) | Weather Underground `ICHIVI1` | -34.903034, -60.002193 | ~50 m | meteobridge |
| LW6EQG | LW6EQG Chivilcoy | Weather Underground `ICHIVI22` | -34.893694, -60.005607 | ~17 m | meteobridge |
| INTA Chivilcoy | — | sin PWS en Weather Underground | -34.890556, -60.005833 | — | API propia |
| AFA Chivilcoy | AFA CHIVILCOY | Weather Underground `ICHIVI27` | -34.865, -60.003 | ~16 m | EasyWeatherPro_V5.2.2 |
| Chivilcoy Zona Sur | Chivilcoy, Zona Sur | Weather Underground `ICHIVI4` | -34.92062, -60.001767 | ~55 m | EasyWeatherV1.6.4 |

Dashboards de Weather Underground:

- ClimaChivilcoy: https://www.wunderground.com/dashboard/pws/ICHIVI1
- LW6EQG: https://www.wunderground.com/dashboard/pws/ICHIVI22
- AFA Chivilcoy: https://www.wunderground.com/dashboard/pws/ICHIVI27
- Chivilcoy Zona Sur: https://www.wunderground.com/dashboard/pws/ICHIVI4

## Hardware

- **ClimaChivilcoy**: consola **Fine Offset WH-1080/3080** (el pie del sitio declara
  `Aurora Meteobridge (WH-1080/3080)`). El sitio se publica con **Meteobridge sobre
  TP-Link** (firmware 6.4) y la plantilla **Weather34 Aurora MKII**; la página
  `weather34-template-legend.php` ("Hardware Info") indica `Meteobridge Interface TP-Link`.
- **LW6EQG**: **Meteobridge** (según el campo `softwareType` de Weather Underground).
- **AFA Chivilcoy (`ICHIVI27`)**: hardware **AcuRite 5-in-1 Weather Station with Wi-Fi**, software `EasyWeatherPro_V5.2.2`.
- **Chivilcoy Zona Sur (`ICHIVI4`)**: software `EasyWeatherV1.6.4`.

## Cómo se verificó

La API pública de Weather Underground redondea las lecturas salvo que se solicite
`numericPrecision=decimal`. Con ese parámetro se compararon observaciones simultáneas
contra cada fuente en vivo.

Comparación del 2026-09-17 23:03:02 (hora local):

| Variable | ClimaChivilcoy live | ICHIVI1 | ICHIVI4 |
| --- | --- | --- | --- |
| Temperatura | 14.9 °C | 14.9 | 15.4 |
| Humedad | 71 % | 71.0 | 69.0 |
| Viento | 3.6 km/h | 3.5 | 0.0 |
| Dirección | NNE 23° | 23 | 95 |
| Software | — | meteobridge | EasyWeatherV1.6.4 |

ICHIVI1 coincide en todas las variables y en el software.

Comparación LW6EQG con ICHIVI22:

| Variable | LW6EQG live | ICHIVI22 |
| --- | --- | --- |
| Temperatura | 16.7 °C | 16.8 |
| Punto de rocío | 10.1 °C | 10.2 |
| Dirección | ENE (67.5°) | 68 |
| Software | — | meteobridge |

## Estación descartada

- **`ICHIVI12`** — "In-Aqua": Weather Underground, Chivilcoy, lat `-34.870264`,
  lon `-59.997462`, elevación ~16 m, hardware `other` (sin identificar), software
  `EasyWeatherV1.7.5`, sobre la **Ruta 30**. **Descartada** por redundancia frente a
  `ICHIVI27` (a solo ~600 m de distancia), hardware genérico sin identificar y datos de presión
  descalibrados (~11,7 hPa de diferencia respecto a la misma cota).

### Comparación entre `ICHIVI12` e `ICHIVI27`

`ICHIVI12` e `ICHIVI27` están a ~600 m entre sí, por lo que son **redundantes** como
fuente y no conviene sumar ambas. En comparación directa, se integró **`ICHIVI27`**:

| Criterio | ICHIVI12 (Descartada) | ICHIVI27 (Integrada) |
| --- | --- | --- |
| Hardware | `other` (sin identificar) | AcuRite 5-in-1 Weather Station with Wi-Fi |
| Software | `EasyWeatherV1.7.5` | `EasyWeatherPro_V5.2.2` (generación "Pro", posterior) |
| Presión (misma hora) | 996,3 hPa | 1008,0 hPa |
| Radiación solar (misma hora) | 0,4 W/m² | 18,9 W/m² |

`ICHIVI27` es la más moderna (hardware identificado y software de generación
posterior). Además, la presión difiere ~11,7 hPa entre ambas pese a la corta distancia
y a la misma elevación, un indicio de barómetro descalibrado en `ICHIVI12`. Por eso
se incorporó **`ICHIVI27`** al ensamble del proyecto y `ICHIVI12` quedó descartada.

## Consulta rápida (Weather Underground API)

```bash
apiKey="e1f10a1e78da46f5b10a1e78da96f525"
curl "https://api.weather.com/v2/pws/observations/current?stationId=ICHIVI1&format=json&units=m&numericPrecision=decimal&apiKey=$apiKey"
```
