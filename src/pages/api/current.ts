import type { APIRoute } from "astro";
import { getCurrentWeather } from "../../lib/source";
import { getIntaSnapshot } from "../../lib/inta";
import { getLw6eqgSnapshot } from "../../lib/lw6eqg";
import { getIchivi27Snapshot, getIchivi4Snapshot } from "../../lib/wu";
import { getSmnAlerts, getSmnForecast } from "../../lib/smn";
import { combineStations } from "../../lib/ensemble";
import type { CurrentWeather } from "../../lib/types";

export const prerender = false;

const TTL_MS = 60_000;

let cache: { data: CurrentWeather; expires: number } | null = null;

function json(data: CurrentWeather, cacheControl: string): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

export const GET: APIRoute = async () => {
  const now = Date.now();

  try {
    if (!cache || cache.expires <= now) {
      const [current, inta, lw6eqg, ichivi27, ichivi4, alerts, smnForecast] = await Promise.all([
        getCurrentWeather(),
        getIntaSnapshot().catch(() => null),
        getLw6eqgSnapshot().catch(() => null),
        getIchivi27Snapshot().catch(() => null),
        getIchivi4Snapshot().catch(() => null),
        getSmnAlerts().catch(() => []),
        getSmnForecast().catch(() => []),
      ]);
      const combined = combineStations(current, [inta, lw6eqg, ichivi27, ichivi4]);
      const data: CurrentWeather = {
        ...combined,
        alerts: alerts ?? [],
        smnForecast: smnForecast ?? [],
      };
      cache = { data, expires: now + TTL_MS };
    }
    return json(
      cache.data,
      "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
    );
  } catch {
    if (cache) {
      return json(cache.data, "public, max-age=0, s-maxage=30");
    }
    return new Response(
      JSON.stringify({ error: "No se pudo obtener el clima" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }
};
