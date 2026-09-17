import type { CurrentWeather, StationSnapshot } from "./types";
import { round } from "./units";

const CHIVILCOY_URL = "https://climachivilcoy.com.ar/";

function average(values: Array<number | null>, digits: number): number | null {
  const clean = values.filter((value): value is number => value !== null && value !== undefined);
  if (clean.length === 0) return null;
  const sum = clean.reduce((total, value) => total + value, 0);
  return round(sum / clean.length, digits);
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

  const merged: CurrentWeather = {
    ...current,
    temperature: average(group.map((s) => s.temperature), 1) ?? current.temperature,
    feelsLike: average(group.map((s) => s.feelsLike), 1) ?? current.feelsLike,
    humidity: average(group.map((s) => s.humidity), 0) ?? current.humidity,
    dewpoint: average(group.map((s) => s.dewpoint), 1) ?? current.dewpoint,
    pressure: current.pressure ?? average(group.map((s) => s.pressure), 0),
    windAvg: current.windAvg ?? average(group.map((s) => s.windAvg), 1),
    windMax: maxOf(group.map((s) => s.windGust)) ?? current.windMax,
    rainToday:
      current.rainToday ?? maxOf(group.map((s) => s.rainToday), 1),
    sources,
    stationCount: group.filter((s) => s.temperature !== null).length,
  };

  return merged;
}
