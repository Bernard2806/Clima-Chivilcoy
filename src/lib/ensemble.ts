import type { CurrentWeather, StationSnapshot } from "./types";
import { round } from "./units";

const CHIVILCOY_URL = "https://climachivilcoy.com.ar/";

const MAX_STALE_SECONDS = 7200;
const FRESH_WINDOW_SECONDS = 120;
const HALF_LIFE_SECONDS = 900;
const UNKNOWN_AGE_WEIGHT = 0.25;

function calculateWeight(updatedSeconds: number | null | undefined): number {
  if (updatedSeconds === null || updatedSeconds === undefined) {
    return UNKNOWN_AGE_WEIGHT;
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

  if (clean.length === 0) return null;

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

function minOf(values: Array<number | null>, digits = 1): number | null {
  const clean = values.filter((value): value is number => value !== null && value !== undefined);
  if (clean.length === 0) return null;
  return round(Math.min(...clean), digits);
}

function chivilcoySnapshot(current: CurrentWeather): StationSnapshot {
  return {
    key: "chivilcoy",
    name: "ClimaChivilcoy",
    url: CHIVILCOY_URL,
    updatedSeconds: current.sourceUpdatedSeconds,
    temperature: current.temperature,
    temperatureMax: current.temperatureMax,
    temperatureMin: current.temperatureMin,
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
  extra: Array<StationSnapshot | null | undefined> | StationSnapshot | null = [],
): CurrentWeather {
  const chivilcoy = chivilcoySnapshot(current);
  const extraList = Array.isArray(extra) ? extra : [extra];
  const validExtra = extraList.filter(
    (s): s is StationSnapshot => s !== null && s !== undefined,
  );
  const sources = [chivilcoy, ...validExtra];
  const group = sources;

  const avg = (extractor: (s: StationSnapshot) => number | null | undefined, digits: number) =>
    weightedAverage(
      group.map((s) => ({ value: extractor(s), updatedSeconds: s.updatedSeconds })),
      digits,
    );

  const activeSources = group.filter((s) => s.temperature !== null && calculateWeight(s.updatedSeconds) > 0);

  const reachable = group.filter((s) => calculateWeight(s.updatedSeconds) > 0);
  const knownAge = reachable.filter((s) => s.updatedSeconds !== null && s.updatedSeconds !== undefined);
  const extremeSources = knownAge.length > 0 ? knownAge : reachable;

  const mergedTemperature = avg((s) => s.temperature, 1);

  const rawMax = maxOf(extremeSources.map((s) => s.temperatureMax));
  const temperatureMax =
    rawMax !== null && mergedTemperature !== null
      ? round(Math.max(rawMax, mergedTemperature), 1)
      : rawMax;

  const rawMin = minOf(extremeSources.map((s) => s.temperatureMin));
  const temperatureMin =
    rawMin !== null && mergedTemperature !== null
      ? round(Math.min(rawMin, mergedTemperature), 1)
      : rawMin;

  const merged: CurrentWeather = {
    ...current,
    temperature: mergedTemperature,
    temperatureMax,
    temperatureMin,
    feelsLike: avg((s) => s.feelsLike, 1),
    humidity: avg((s) => s.humidity, 0),
    dewpoint: avg((s) => s.dewpoint, 1),
    pressure: avg((s) => s.pressure, 0),
    windAvg: avg((s) => s.windAvg, 1),
    windMax: maxOf(extremeSources.map((s) => s.windGust)),
    rainToday: maxOf(extremeSources.map((s) => s.rainToday), 1),
    sources,
    stationCount: activeSources.length,
  };

  return merged;
}
