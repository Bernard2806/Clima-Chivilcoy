import type { APIRoute } from "astro";
import { getWebcam, type WebcamImage } from "../../lib/source";

export const prerender = false;

const TTL_MS = 15_000;

interface CachedWebcam {
  body: Uint8Array;
  contentType: string;
  fetchedAt: number;
  expires: number;
}

let cache: CachedWebcam | null = null;
let pending: Promise<WebcamImage | null> | null = null;

function respond(
  entry: { body: Uint8Array; contentType: string; fetchedAt: number },
  cacheControl: string,
): Response {
  return new Response(entry.body, {
    status: 200,
    headers: {
      "Content-Type": entry.contentType,
      "Cache-Control": cacheControl,
      "X-Webcam-Fetched-At": new Date(entry.fetchedAt).toISOString(),
    },
  });
}

export const GET: APIRoute = async () => {
  const now = Date.now();

  if (cache && cache.expires > now) {
    return respond(
      cache,
      "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
    );
  }

  if (!pending) {
    pending = getWebcam()
      .then((result) => {
        if (result) {
          cache = { ...result, expires: Date.now() + TTL_MS };
        }
        return result;
      })
      .finally(() => {
        pending = null;
      });
  }

  const fresh = await pending;

  if (fresh) {
    return respond(fresh, "public, max-age=0, s-maxage=20, stale-while-revalidate=40");
  }

  if (cache) {
    return respond(cache, "public, max-age=0, s-maxage=10");
  }

  return new Response("No se pudo obtener la cámara", {
    status: 502,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
