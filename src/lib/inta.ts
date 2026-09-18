import { round, toCelsius, toHpa, toKmh, toMm, type PressureUnit, type TempUnit, type WindUnit } from "./units";
import type { StationSnapshot } from "./types";

const INTA_API_URL = "https://chivilcoy.gov.ar/inta/api.php";

const USER_AGENT =
  "ClimaChivilcoy/0.1 (+https://github.com/Bernard2806/Clima-Chivilcoy)";

interface IntaSensor {
  nombreSensor: string;
  valor: string;
  unidad: string;
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "[]" || trimmed === "**") return null;
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function indexSensors(sensors: IntaSensor[]): Map<string, IntaSensor> {
  const map = new Map<string, IntaSensor>();
  for (const sensor of sensors) {
    map.set(sensor.nombreSensor.toLowerCase(), sensor);
  }
  return map;
}

function valueOf(map: Map<string, IntaSensor>, name: string): number | null {
  return toNumber(map.get(name.toLowerCase())?.valor);
}

function pad(value: string): string {
  return value.length === 2 ? value : `0${value}`;
}

function argTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${minute}:${second}-03:00`;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
}

function getArgentinaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export async function getIntaSnapshot(): Promise<StationSnapshot | null> {
  try {
    const today = getArgentinaToday();
    const historyUrl = `${INTA_API_URL}?historico=1&idEquipo=1731&idSensor=11&fechaDesde=${today}&fechaHasta=${today}`;

    const [response, historyResponse] = await Promise.all([
      fetch(INTA_API_URL, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }),
      fetch(historyUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }).catch(() => null),
    ]);
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      sensores?: {
        fechaUltimaActualizacionDatos?: string;
        datosSensores?: IntaSensor[];
      };
    };
    const list = payload.sensores?.datosSensores;
    if (!Array.isArray(list) || list.length === 0) return null;

    const byName = indexSensors(list);
    const tempUnit: TempUnit = "C";
    const windUnit: WindUnit = "km/h";
    const pressureUnit: PressureUnit = "hPa";

    const rawPressure = toNumber(byName.get("presion atmosferica")?.valor);
    const pressure = rawPressure === null ? null : round(toHpa(rawPressure, pressureUnit), 1);

    const rawTemp = valueOf(byName, "Temperatura de Aire exterior");
    const rawDew = valueOf(byName, "Punto de Rocío");
    const rawFeels = valueOf(byName, "Sensación Térmica");
    const rawWind = valueOf(byName, "Vel. Viento");
    const rawGust = valueOf(byName, "Vel. Ráfaga");
    const rawRain = valueOf(byName, "Lluvia Caida");

    const historicalTemps: number[] = [];
    if (historyResponse && historyResponse.ok) {
      try {
        const historyJson = await historyResponse.json();
        if (Array.isArray(historyJson)) {
          for (const item of historyJson) {
            const val = typeof item?.valor === "number" ? item.valor : toNumber(item?.valor);
            if (val !== null && Number.isFinite(val)) {
              historicalTemps.push(val);
            }
          }
        }
      } catch {
      }
    }
    if (rawTemp !== null && Number.isFinite(rawTemp)) {
      historicalTemps.push(rawTemp);
    }

    const temperatureMin =
      historicalTemps.length > 0
        ? round(toCelsius(Math.min(...historicalTemps), tempUnit), 1)
        : null;
    const temperatureMax =
      historicalTemps.length > 0
        ? round(toCelsius(Math.max(...historicalTemps), tempUnit), 1)
        : null;

    const updatedAt = argTimestamp(payload.sensores?.fechaUltimaActualizacionDatos);

    return {
      key: "inta",
      name: "Estación INTA Chivilcoy",
      url: "https://chivilcoy.gov.ar/inta/",
      updatedSeconds:
        updatedAt === null ? null : Math.max(0, Math.round((Date.now() - updatedAt) / 1000)),
      temperature: rawTemp === null ? null : round(toCelsius(rawTemp, tempUnit), 1),
      temperatureMax,
      temperatureMin,
      humidity: valueOf(byName, "Humedad de Aire exterior"),
      dewpoint: rawDew === null ? null : round(toCelsius(rawDew, tempUnit), 1),
      feelsLike: rawFeels === null ? null : round(toCelsius(rawFeels, tempUnit), 1),
      pressure,
      windAvg: rawWind === null ? null : round(toKmh(rawWind, windUnit), 1),
      windGust: rawGust === null ? null : round(toKmh(rawGust, windUnit), 1),
      windDirection: valueOf(byName, "Dir. Viento"),
      rainToday: rawRain === null ? null : round(toMm(rawRain, "mm"), 1),
    };
  } catch {
    return null;
  }
}
