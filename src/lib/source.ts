import type { CurrentWeather } from "./types";
import { buildForecast, translateForecastSummary } from "./translate";
import {
  detectTempUnit,
  round,
  toCelsius,
  toHpa,
  toKm,
  toKmh,
  toMm,
  type PressureUnit,
  type RainUnit,
  type TempUnit,
  type WindUnit,
} from "./units";

const BASE_URL = "https://climachivilcoy.com.ar/";

const USER_AGENT =
  "ClimaChivilcoy/0.1 (+https://github.com/Bernard2806/Clima-Chivilcoy)";

const WEBCAM_URL =
  typeof process !== "undefined" && process.env?.WEBCAM_URL
    ? process.env.WEBCAM_URL
    : "https://content.meteobridge.com/cam/3df1b6ca785a216dcf89414ed1e056d7/camplus.jpg";

export interface WebcamImage {
  body: Uint8Array;
  contentType: string;
  fetchedAt: number;
}

const MODULES = {
  temperature: "temperaturemod-Chart-2024.php",
  humidity: "humiditymod-Chart-2024.php",
  dewpoint: "dewpointmod-Chart-2024.php",
  barometer: "barometermod-Chart-2024.php",
  wind: "weather34-wind-2024.php",
  rain: "rainmod-Chart-2024.php",
  rainRate: "rainratemod-Chart-2024.php",
  sunMoon: "weather34-sun-moon-2024.php",
  forecast: "weather34-Chart-forecast-2024.php",
  updated: "data-updated.php",
} as const;

const ENTITIES: Array<[string, string]> = [
  ["&deg;", "\u00b0"],
  ["&deg", "\u00b0"],
  ["&nbsp;", " "],
  ["&amp;", "&"],
  ["&minus;", "-"],
];

export function htmlToText(html: string): string {
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  for (const [entity, value] of ENTITIES) {
    text = text.split(entity).join(value);
  }
  return text.replace(/\s+/g, " ").trim();
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(text: string, pattern: RegExp, group = 1): string | null {
  const match = text.match(pattern);
  return match?.[group]?.trim() ?? null;
}

function pickPair(
  text: string,
  pattern: RegExp,
): [value: string | null, unit: string | null] {
  const match = text.match(pattern);
  return [match?.[1]?.trim() ?? null, match?.[2]?.trim() ?? null];
}

function toTemperature(value: string | null, unit: TempUnit): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : round(toCelsius(parsed, unit));
}

function toSpeed(value: string | null, unit: WindUnit): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : round(toKmh(parsed, unit));
}

function toPressure(value: string | null, unit: PressureUnit): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : round(toHpa(parsed, unit));
}

function toRain(value: string | null, unit: RainUnit): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : round(toMm(parsed, unit));
}

async function fetchText(path: string): Promise<string | null> {
  try {
    const url = new URL(path, BASE_URL);
    url.searchParams.set("units", "metric");
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/csv,*/*" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function normalizeTrend(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("ris")) return "subiendo";
  if (lower.startsWith("fall")) return "bajando";
  if (lower.startsWith("ste")) return "estable";
  const delta = Number.parseFloat(trimmed.replace(/\s+/g, ""));
  if (Number.isFinite(delta)) {
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return "estable";
  }
  return trimmed;
}

const MOON_PHASES: Array<[RegExp, string]> = [
  [/new moon/i, "Luna nueva"],
  [/waxing crescent/i, "Creciente"],
  [/first quarter/i, "Cuarto creciente"],
  [/waxing gibbous/i, "Gibosa creciente"],
  [/full moon/i, "Luna llena"],
  [/waning gibbous/i, "Gibosa menguante"],
  [/(last|third) quarter/i, "Cuarto menguante"],
  [/waning crescent/i, "Menguante"],
];

function translateMoonPhase(value: string | null): string | null {
  if (!value) return null;
  const match = MOON_PHASES.find(([pattern]) => pattern.test(value));
  return match ? match[1] : value;
}

function toMinutes(value: string | null): number | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function daylightFrom(
  sunrise: string | null,
  sunset: string | null,
): string | null {
  const start = toMinutes(sunrise);
  const end = toMinutes(sunset);
  if (start === null || end === null) return null;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function parseUpdatedSeconds(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/Updated\s*:\s*(\d+)\s+(Second|Minute|Hour)/i);
  if (!match) return null;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("second")) return amount;
  if (unit.startsWith("minute")) return amount * 60;
  return amount * 3600;
}

export async function getCurrentWeather(): Promise<CurrentWeather> {
  const entries = Object.entries(MODULES);
  const responses = await Promise.all(
    entries.map(([, path]) => fetchText(path)),
  );
  const raw = Object.fromEntries(
    entries.map(([key], index) => [key, responses[index]]),
  ) as Record<keyof typeof MODULES, string | null>;

  const asText = (key: keyof typeof MODULES): string =>
    raw[key] ? htmlToText(raw[key] as string) : "";

  const temperature = asText("temperature");
  const humidity = asText("humidity");
  const dewpoint = asText("dewpoint");
  const barometer = asText("barometer");
  const wind = asText("wind");
  const rain = asText("rain");
  const rainRate = asText("rainRate");
  const sunMoon = asText("sunMoon");
  const forecast = asText("forecast");

  const tempUnit =
    pick(temperature, /Temperature \u00b0([CF])/) === "F"
      ? "F"
      : detectTempUnit(raw.temperature ?? "");
  const dewUnit =
    pick(dewpoint, /Dewpoint \u00b0([CF])/) === "F"
      ? "F"
      : detectTempUnit(raw.dewpoint ?? "");
  const forecastUnit = detectTempUnit(raw.forecast ?? "");
  const pressureUnit =
    (pick(barometer, /Pressure (hPa|inHg|mmHg)/) as PressureUnit | null) ??
    "hPa";

  const forecastHtml = raw.forecast ?? "";
  const iconPath = pick(
    forecastHtml,
    /<img[^>]+src="(weather34icons2024\/[^"]+)"/i,
  );

  const sunrise = pick(sunMoon, /Next Sunrise: (\d\d:\d\d)/);
  const sunset = pick(sunMoon, /Next Sunset: (\d\d:\d\d)/);

  const windAvgPair = pickPair(wind, /([\d.]+) (km\/h|mph|kts|m\/s) Avg/);
  const windMaxPair = pickPair(wind, /Max ([\d.]+) (km\/h|mph|kts|m\/s)/);
  const windRunPair = pickPair(wind, /([\d.]+) (km|mi) Wind Run/);
  const rainTodayPair = pickPair(rain, /Rainfall ([\d.]+) (mm|in) Today/);
  const rainMonthPair = pickPair(rain, /([\d.]+) (mm|in) \d{4}/);
  const rainRatePair = pickPair(rainRate, /Rain Rate ([\d.]+) (mm|in)/);

  const current: CurrentWeather = {
    source: "ClimaChivilcoy (Weather34 / Meteobridge)",
    fetchedAt: new Date().toISOString(),
    sourceUpdatedSeconds: parseUpdatedSeconds(asText("updated")),
    temperature: toTemperature(
      pick(temperature, /Temperature \u00b0[CF]? ?(-?[\d.]+)/),
      tempUnit,
    ),
    temperatureMax: toTemperature(pick(temperature, /Max (-?[\d.]+)/), tempUnit),
    temperatureMin: toTemperature(pick(temperature, /Min (-?[\d.]+)/), tempUnit),
    feelsLike: toTemperature(
      pick(temperature, /Feels Like (-?[\d.]+)/),
      tempUnit,
    ),
    humidity: toNumber(pick(humidity, /Humidity \(RH\) (\d+)/)),
    humidityMax: toNumber(pick(humidity, /Max (\d+)%/)),
    humidityMin: toNumber(pick(humidity, /Min (\d+)%/)),
    dewpoint: toTemperature(
      pick(dewpoint, /Dewpoint \u00b0[CF]? ?(-?[\d.]+)/),
      dewUnit,
    ),
    dewpointTrend: normalizeTrend(
      pick(dewpoint, /(Rising|Falling|Steady|Subiendo|Bajando)/i),
    ),
    pressure: toPressure(
      pick(barometer, /Pressure (?:hPa|inHg|mmHg) ([\d.]+)/),
      pressureUnit,
    ),
    pressureTrend: normalizeTrend(pick(barometer, /([+\-]\s?[\d.]+)$/)),
    windAvg: toSpeed(windAvgPair[0], (windAvgPair[1] as WindUnit) ?? "km/h"),
    windMax: toSpeed(windMaxPair[0], (windMaxPair[1] as WindUnit) ?? "km/h"),
    windRun: (() => {
      const parsed = toNumber(windRunPair[0]);
      if (parsed === null) return null;
      return round(toKm(parsed, windRunPair[1] === "mi" ? "mi" : "km"), 0);
    })(),
    rainToday: toRain(
      rainTodayPair[0],
      (rainTodayPair[1] as RainUnit) ?? "mm",
    ),
    rainMonth: toRain(
      rainMonthPair[0],
      (rainMonthPair[1] as RainUnit) ?? "mm",
    ),
    rainRate: toRain(rainRatePair[0], (rainRatePair[1] as RainUnit) ?? "mm"),
    sunrise,
    sunset,
    daylight: daylightFrom(sunrise, sunset),
    moonPhase: translateMoonPhase(
      pick(sunMoon, /Moon Phase: ([A-Za-z ]+?) Moon Luminance/),
    ),
    moonLuminance: toNumber(pick(sunMoon, /Moon Luminance: ([\d.]+)%/)),
    moonrise: pick(sunMoon, /Next Moon Rise: (\d\d:\d\d)/),
    moonset: pick(sunMoon, /Next Moon Set: (\d\d:\d\d)/),
    forecast: (() => {
      const rawSummary = pick(forecast, /Forecast -?[\d.]+ ?\u00b0 (.*)$/);
      const parts = buildForecast(rawSummary);
      return {
        temperature: toTemperature(
          pick(forecast, /Forecast (-?[\d.]+)\u00b0/),
          forecastUnit,
        ),
        summary: translateForecastSummary(rawSummary),
        icon: iconPath ? BASE_URL + iconPath : null,
        period: parts.period,
        periodOffsetDays: parts.periodOffsetDays,
        condition: parts.condition,
        details: parts.details,
      };
    })(),
  };

  return current;
}

export async function getWebcam(): Promise<WebcamImage | null> {
  try {
    const response = await fetch(WEBCAM_URL, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/jpeg,image/*,*/*" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) return null;
    return {
      body: new Uint8Array(buffer),
      contentType: response.headers.get("Content-Type") ?? "image/jpeg",
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
