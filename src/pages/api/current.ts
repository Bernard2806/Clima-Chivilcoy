import type { APIRoute } from "astro";
import { getCurrentWeather } from "../../lib/source";
import { getIntaSnapshot } from "../../lib/inta";
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
      const [current, inta] = await Promise.all([
        getCurrentWeather(),
        getIntaSnapshot().catch(() => null),
      ]);
      const data = combineStations(current, inta);
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
