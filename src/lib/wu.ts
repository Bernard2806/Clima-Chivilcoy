import { round } from "./units";
import type { StationSnapshot } from "./types";

const WU_API_BASE = "https://api.weather.com/v2/pws";
const WU_API_KEY = process.env.WU_API_KEY || "e1f10a1e78da46f5b10a1e78da96f525";

const USER_AGENT =
  "ClimaChivilcoy/0.1 (+https://github.com/Bernard2806/Clima-Chivilcoy)";

interface WuObservation {
  epoch?: number;
  humidity?: number | null;
  winddir?: number | null;
  metric?: {
    temp?: number | null;
    heatIndex?: number | null;
    dewpt?: number | null;
    windChill?: number | null;
    windSpeed?: number | null;
    windGust?: number | null;
    pressure?: number | null;
    precipTotal?: number | null;
  };
}

interface WuDailySummary {
  metric?: {
    tempHigh?: number | null;
    tempLow?: number | null;
  };
}

function calculateFeelsLike(
  temp: number | null,
  heatIndex: number | null | undefined,
  windChill: number | null | undefined,
): number | null {
  if (temp === null) return null;
  if (temp >= 21 && heatIndex !== null && heatIndex !== undefined && Number.isFinite(heatIndex)) {
    return round(heatIndex, 1);
  }
  if (temp <= 10 && windChill !== null && windChill !== undefined && Number.isFinite(windChill)) {
    return round(windChill, 1);
  }
  return temp;
}

export async function getWuStationSnapshot(
  stationId: string,
  name: string,
  key: "ichivi27" | "ichivi4",
): Promise<StationSnapshot | null> {
  try {
    const currentUrl = `${WU_API_BASE}/observations/current?stationId=${encodeURIComponent(
      stationId,
    )}&format=json&units=m&numericPrecision=decimal&apiKey=${WU_API_KEY}`;

    const dailyUrl = `${WU_API_BASE}/dailysummary/7day?stationId=${encodeURIComponent(
      stationId,
    )}&format=json&units=m&numericPrecision=decimal&apiKey=${WU_API_KEY}`;

    const [currentRes, dailyRes] = await Promise.all([
      fetch(currentUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }),
      fetch(dailyUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }).catch(() => null),
    ]);

    if (!currentRes.ok) return null;

    const currentData = (await currentRes.json()) as {
      observations?: WuObservation[];
    };
    const obs = currentData.observations?.[0];
    if (!obs || !obs.metric) return null;

    const metric = obs.metric;
    const temp =
      metric.temp !== null && metric.temp !== undefined && Number.isFinite(metric.temp)
        ? round(metric.temp, 1)
        : null;

    let temperatureMax: number | null = null;
    let temperatureMin: number | null = null;

    if (dailyRes && dailyRes.ok) {
      try {
        const dailyData = (await dailyRes.json()) as {
          summaries?: WuDailySummary[];
        };
        const lastSummary = dailyData.summaries?.[dailyData.summaries.length - 1];
        if (lastSummary?.metric) {
          if (
            lastSummary.metric.tempHigh !== null &&
            lastSummary.metric.tempHigh !== undefined &&
            Number.isFinite(lastSummary.metric.tempHigh)
          ) {
            temperatureMax = round(lastSummary.metric.tempHigh, 1);
          }
          if (
            lastSummary.metric.tempLow !== null &&
            lastSummary.metric.tempLow !== undefined &&
            Number.isFinite(lastSummary.metric.tempLow)
          ) {
            temperatureMin = round(lastSummary.metric.tempLow, 1);
          }
        }
      } catch {
      }
    }

    if (temp !== null) {
      if (temperatureMax === null || temp > temperatureMax) {
        temperatureMax = temp;
      }
      if (temperatureMin === null || temp < temperatureMin) {
        temperatureMin = temp;
      }
    }

    const updatedSeconds =
      obs.epoch && Number.isFinite(obs.epoch)
        ? Math.max(0, Math.round(Date.now() / 1000 - obs.epoch))
        : null;

    const feelsLike = calculateFeelsLike(temp, metric.heatIndex, metric.windChill);

    return {
      key,
      name,
      url: `https://www.wunderground.com/dashboard/pws/${stationId}`,
      updatedSeconds,
      temperature: temp,
      temperatureMax,
      temperatureMin,
      humidity:
        obs.humidity !== null && obs.humidity !== undefined && Number.isFinite(obs.humidity)
          ? Math.round(obs.humidity)
          : null,
      dewpoint:
        metric.dewpt !== null && metric.dewpt !== undefined && Number.isFinite(metric.dewpt)
          ? round(metric.dewpt, 1)
          : null,
      feelsLike,
      pressure:
        metric.pressure !== null && metric.pressure !== undefined && Number.isFinite(metric.pressure)
          ? round(metric.pressure, 1)
          : null,
      windAvg:
        metric.windSpeed !== null && metric.windSpeed !== undefined && Number.isFinite(metric.windSpeed)
          ? round(metric.windSpeed, 1)
          : null,
      windGust:
        metric.windGust !== null && metric.windGust !== undefined && Number.isFinite(metric.windGust)
          ? round(metric.windGust, 1)
          : null,
      windDirection:
        obs.winddir !== null && obs.winddir !== undefined && Number.isFinite(obs.winddir)
          ? obs.winddir
          : null,
      rainToday:
        metric.precipTotal !== null && metric.precipTotal !== undefined && Number.isFinite(metric.precipTotal)
          ? round(metric.precipTotal, 1)
          : null,
    };
  } catch {
    return null;
  }
}

export function getIchivi27Snapshot(): Promise<StationSnapshot | null> {
  return getWuStationSnapshot("ICHIVI27", "AFA Chivilcoy", "ichivi27");
}

export function getIchivi4Snapshot(): Promise<StationSnapshot | null> {
  return getWuStationSnapshot("ICHIVI4", "Chivilcoy Zona Sur", "ichivi4");
}
