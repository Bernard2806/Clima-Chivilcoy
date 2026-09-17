import type { CurrentWeather, StationSnapshot } from "./types";
import { round } from "./units";

const CHIVILCOY_URL = "https://climachivilcoy.com.ar/";

const MAX_STALE_SECONDS = 7200;
const FRESH_WINDOW_SECONDS = 120;
const HALF_LIFE_SECONDS = 900;

function calculateWeight(updatedSeconds: number | null | undefined): number {
  if (updatedSeconds === null || updatedSeconds === undefined) {
    return 1.0;
  }
  const age = Math.max(0, updatedSeconds);
  if (age >= MAX_STALE_SECONDS) {
    return 0;
  }
  if (age <= FRESH_WINDOW_SECONDS) {
    return 1.0;
  }
  return Math.pow(0.5, (age - FRESH_WINDOW_SECONDS) / HALF_LIFE_SECONDS);
}

function weightedAverage(
  entries: Array<{ value: number | null | undefined; updatedSeconds: number | null | undefined }>,
  digits: number,
): number | null {
  const clean = entries
    .map((e) => ({
      value: e.value,
      weight: calculateWeight(e.updatedSeconds),
    }))
    .filter(
      (e): e is { value: number; weight: number } =>
        e.value !== null && e.value !== undefined && !Number.isNaN(e.value) && e.weight > 0,
    );

  if (clean.length === 0) {
    const fallback = entries.filter(
      (e): e is { value: number; updatedSeconds: any } =>
        e.value !== null && e.value !== undefined && !Number.isNaN(e.value),
    );
    if (fallback.length === 0) return null;
    const sum = fallback.reduce((total, e) => total + e.value, 0);
    return round(sum / fallback.length, digits);
  }

  const totalWeight = clean.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return null;

  const weightedSum = clean.reduce((sum, e) => sum + e.value * e.weight, 0);
  return round(weightedSum / totalWeight, digits);
}

function maxOf(values: Array<number | null>, digits = 1): number | null {
  const clean = values.filter((value): value is number => value !== null && value !== undefined);
  if (clean.length === 0) return null;
  return round(Math.max(...clean), digits);
}

function chivilcoySnapshot(current: CurrentWeather): StationSnapshot {
  return {
    key: "chivilcoy",
    name: "ClimaChivilcoy",
    url: CHIVILCOY_URL,
    updatedSeconds: current.sourceUpdatedSeconds,
    temperature: current.temperature,
    humidity: current.humidity,
    dewpoint: current.dewpoint,
    feelsLike: current.feelsLike,
    pressure: current.pressure,
    windAvg: current.windAvg,
    windGust: current.windMax,
    windDirection: null,
    rainToday: current.rainToday,
  };
}

export function combineStations(
  current: CurrentWeather,
  inta: StationSnapshot | null,
): CurrentWeather {
  const chivilcoy = chivilcoySnapshot(current);
  const sources = inta ? [chivilcoy, inta] : [chivilcoy];
  const group = sources;

  const avg = (extractor: (s: StationSnapshot) => number | null | undefined, digits: number) =>
    weightedAverage(
      group.map((s) => ({ value: extractor(s), updatedSeconds: s.updatedSeconds })),
      digits,
    );

  const activeSources = group.filter((s) => s.temperature !== null && calculateWeight(s.updatedSeconds) > 0);

  const merged: CurrentWeather = {
    ...current,
    temperature: avg((s) => s.temperature, 1) ?? current.temperature,
    feelsLike: avg((s) => s.feelsLike, 1) ?? current.feelsLike,
    humidity: avg((s) => s.humidity, 0) ?? current.humidity,
    dewpoint: avg((s) => s.dewpoint, 1) ?? current.dewpoint,
    pressure: avg((s) => s.pressure, 0) ?? current.pressure,
    windAvg: avg((s) => s.windAvg, 1) ?? current.windAvg,
    windMax: maxOf(group.map((s) => s.windGust)) ?? current.windMax,
    rainToday: maxOf(group.map((s) => s.rainToday), 1) ?? current.rainToday,
    sources,
    stationCount: activeSources.length > 0 ? activeSources.length : group.filter((s) => s.temperature !== null).length,
  };

  return merged;
}
