import type { APIRoute } from "astro";
import { getCurrentWeather } from "../../lib/source";
import { getIntaSnapshot } from "../../lib/inta";
import { getLw6eqgSnapshot } from "../../lib/lw6eqg";
import { getSmnAlerts, getSmnForecast } from "../../lib/smn";
import { combineStations } from "../../lib/ensemble";
import type { CurrentWeather } from "../../lib/types";

export const prerender = false;

const TTL_MS = 60_000;
const STALE_LIMIT_MS = 15 * 60_000;
const FRESH_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=120";
const DEGRADED_CACHE_CONTROL = "public, max-age=0, s-maxage=30";

let cache: { data: CurrentWeather; storedAt: number; expires: number } | null =
  null;
let pending: Promise<CurrentWeather | null> | null = null;

function json(data: CurrentWeather, cacheControl: string): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

async function fetchWeather(): Promise<CurrentWeather> {
  const [current, inta, lw6eqg, alerts, smnForecast] = await Promise.all([
    getCurrentWeather(),
    getIntaSnapshot().catch(() => null),
    getLw6eqgSnapshot().catch(() => null),
    getSmnAlerts().catch(() => []),
    getSmnForecast().catch(() => []),
  ]);
  const combined = combineStations(current, [inta, lw6eqg]);
  return {
    ...combined,
    alerts: alerts ?? [],
    smnForecast: smnForecast ?? [],
  };
}

function refreshWeather(): Promise<CurrentWeather | null> {
  pending ??= fetchWeather()
    .catch(() => null)
    .finally(() => {
      pending = null;
    });
  return pending;
}

function withElapsedAge(
  data: CurrentWeather,
  elapsedMs: number,
): CurrentWeather {
  if (data.sourceUpdatedSeconds === null) return data;
  return {
    ...data,
    sourceUpdatedSeconds:
      data.sourceUpdatedSeconds + Math.round(elapsedMs / 1000),
  };
}

export const GET: APIRoute = async () => {
  const now = Date.now();

  if (cache && cache.expires > now) {
    return json(cache.data, FRESH_CACHE_CONTROL);
  }

  const data = await refreshWeather();

  if (data && data.stationCount > 0) {
    cache = { data, storedAt: now, expires: now + TTL_MS };
    return json(data, FRESH_CACHE_CONTROL);
  }

  if (cache && now - cache.storedAt < STALE_LIMIT_MS) {
    return json(
      withElapsedAge(cache.data, now - cache.storedAt),
      DEGRADED_CACHE_CONTROL,
    );
  }

  if (data && (data.alerts.length > 0 || data.smnForecast.length > 0)) {
    return json(data, DEGRADED_CACHE_CONTROL);
  }

  return new Response(
    JSON.stringify({ error: "No se pudo obtener el clima" }),
    {
      status: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
};
