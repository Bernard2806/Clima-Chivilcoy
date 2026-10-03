import type { APIRoute } from "astro";
import sharp from "sharp";
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

async function processImage(image: WebcamImage): Promise<WebcamImage> {
  try {
    const optimized = await sharp(image.body)
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
    return {
      body: new Uint8Array(optimized),
      contentType: "image/jpeg",
      fetchedAt: image.fetchedAt,
    };
  } catch {
    return image;
  }
}

function respond(
  entry: { body: Uint8Array; contentType: string; fetchedAt: number },
  cacheControl: string,
): Response {
  return new Response(entry.body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": entry.contentType,
      "Cache-Control": cacheControl,
      "X-Webcam-Fetched-At": new Date(entry.fetchedAt).toISOString(),
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const now = Date.now();
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  if (cache && !force && cache.expires > now) {
    return respond(
      cache,
      "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
    );
  }

  if (!pending) {
    pending = getWebcam()
      .then(async (result) => {
        if (result) {
          const optimized = await processImage(result);
          cache = { ...optimized, expires: Date.now() + TTL_MS };
          return optimized;
        }
        return null;
      })
      .finally(() => {
        pending = null;
      });
  }

  const fresh = await pending;

  if (fresh) {
    return respond(
      fresh,
      "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
    );
  }

  if (cache) {
    return respond(cache, "public, max-age=0, s-maxage=10");
  }

  return new Response("No se pudo obtener la cámara", {
    status: 502,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
