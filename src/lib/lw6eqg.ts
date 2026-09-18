import { round, toCelsius, toHpa, toKmh, toMm } from "./units";
import type { StationSnapshot } from "./types";

const LW6EQG_URL = "https://lw6eqg.ar/";

const USER_AGENT =
  "ClimaChivilcoy/0.1 (+https://github.com/Bernard2806/Clima-Chivilcoy)";

const CARDINAL_DEGREES: Record<string, number> = {
  n: 0,
  nne: 22.5,
  ne: 45,
  ene: 67.5,
  e: 90,
  ese: 112.5,
  se: 135,
  sse: 157.5,
  s: 180,
  ssw: 202.5,
  sw: 225,
  wsw: 247.5,
  w: 270,
  wnw: 292.5,
  nw: 315,
  nnw: 337.5,
};

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed || trimmed === "--" || trimmed === "**" || trimmed === "-") return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseUpdatedSeconds(html: string): number | null {
  const match = html.match(
    /(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})/i,
  );
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const pad = (s: string) => (s.length === 1 ? `0${s}` : s);
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((Date.now() - parsed) / 1000));
}

function parseWindDirection(html: string): number | null {
  const match = html.match(/Dirección:\s*([A-Za-z]+)/i);
  if (!match) return null;
  const code = match[1].trim().toLowerCase();
  return CARDINAL_DEGREES[code] ?? null;
}

export async function getLw6eqgSnapshot(): Promise<StationSnapshot | null> {
  try {
    const response = await fetch(LW6EQG_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const html = await response.text();

    const tempMatch =
      html.match(/Temperatura\s*([0-9.,-]+)\s*°C/i) ||
      html.match(/<div id=["']temp["']>\s*<p>\s*([0-9.,-]+)/i);
    const rawTemp = toNumber(tempMatch?.[1]);

    const feelsMatch = html.match(/Sensación térmica:\s*([0-9.,-]+)\s*°C/i);
    const rawFeels = toNumber(feelsMatch?.[1]);

    const dewMatch = html.match(/Punto de rocío:\s*([0-9.,-]+)\s*°C/i);
    const rawDew = toNumber(dewMatch?.[1]);

    const maxTempMatch = html.match(/Máxima temperatura:\s*([0-9.,-]+)\s*°C/i);
    const rawMaxTemp = toNumber(maxTempMatch?.[1]);

    const minTempMatch = html.match(/Mínima temperatura:\s*([0-9.,-]+)\s*°C/i);
    const rawMinTemp = toNumber(minTempMatch?.[1]);

    const humMatch =
      html.match(/Humedad\s*(?:<br\s*\/?>)?\s*([0-9.,-]+)\s*%/i) ||
      html.match(/<div id=["']humidity["']>\s*<p>\s*([0-9.,-]+)/i);
    const rawHumidity = toNumber(humMatch?.[1]);

    const windMatch = html.match(/Viento\s*(?:<br\s*\/?>)?\s*([0-9.,-]+)\s*km\/h/i);
    const rawWind = toNumber(windMatch?.[1]);

    const gustMatch = html.match(/Velocidad \(ráfaga\):\s*([0-9.,-]+)\s*km\/h/i);
    const rawGust = toNumber(gustMatch?.[1]);

    const rainMatch = html.match(/Lluvia de hoy:\s*([0-9.,-]+)\s*mm/i);
    const rawRain = toNumber(rainMatch?.[1]);

    const presMatch =
      html.match(/Presión\s*(?:<br\s*\/?>)?\s*([0-9.,-]+)\s*hPa/i) ||
      html.match(/<div id=["']pressure["']>\s*<p>\s*([0-9.,-]+)/i);
    const rawPressure = toNumber(presMatch?.[1]);

    const updatedSeconds = parseUpdatedSeconds(html);
    const windDirection = parseWindDirection(html);

    return {
      key: "lw6eqg",
      name: "LW6EQG Chivilcoy",
      url: LW6EQG_URL,
      updatedSeconds,
      temperature: rawTemp === null ? null : round(toCelsius(rawTemp, "C"), 1),
      temperatureMax: rawMaxTemp === null ? null : round(toCelsius(rawMaxTemp, "C"), 1),
      temperatureMin: rawMinTemp === null ? null : round(toCelsius(rawMinTemp, "C"), 1),
      humidity: rawHumidity === null ? null : Math.round(rawHumidity),
      dewpoint: rawDew === null ? null : round(toCelsius(rawDew, "C"), 1),
      feelsLike: rawFeels === null ? null : round(toCelsius(rawFeels, "C"), 1),
      pressure: rawPressure === null ? null : round(toHpa(rawPressure, "hPa"), 1),
      windAvg: rawWind === null ? null : round(toKmh(rawWind, "km/h"), 1),
      windGust: rawGust === null ? null : round(toKmh(rawGust, "km/h"), 1),
      windDirection,
      rainToday: rawRain === null ? null : round(toMm(rawRain, "mm"), 1),
    };
  } catch {
    return null;
  }
}
