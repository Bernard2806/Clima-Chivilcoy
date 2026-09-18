import type { SmnAlert, SmnAlertLevel } from "./types";

const SMN_FEATURE_SERVER =
  "https://utility.arcgis.com/usrsvcs/servers/eafad8dd86ca4f49b788397d0977a207/rest/services/Hosted/Servicio_Meteorologico_Nacional/FeatureServer";

const CHIVILCOY_LON = -60.0058;
const CHIVILCOY_LAT = -34.8906;

const CACHE_TTL_MS = 300_000;
let cachedAlerts: { data: SmnAlert[]; expires: number } | null = null;

function normalizeLevel(val: string | number | null | undefined): SmnAlertLevel {
  if (typeof val === "number") {
    if (val >= 5) return "rojo";
    if (val === 4) return "naranja";
    if (val === 3) return "amarillo";
    return "verde";
  }
  const str = String(val ?? "").toLowerCase();
  if (str.includes("rojo") || str.includes("red")) return "rojo";
  if (str.includes("naranja") || str.includes("orange")) return "naranja";
  if (str.includes("amarillo") || str.includes("yellow") || str.includes("advertencia")) return "amarillo";
  return "verde";
}

function levelColor(level: SmnAlertLevel): string {
  switch (level) {
    case "rojo":
      return "#d32f2f";
    case "naranja":
      return "#f57c00";
    case "amarillo":
      return "#fbc02d";
    default:
      return "#2e7d32";
  }
}

function toIso(timestamp: number | null | undefined): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

async function fetchLayerFeatures(layerId: number): Promise<any[]> {
  const url = `${SMN_FEATURE_SERVER}/${layerId}/query?geometry=${CHIVILCOY_LON},${CHIVILCOY_LAT}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outFields=*&f=json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ClimaChivilcoy/0.1 (+https://github.com/Bernard2806/Clima-Chivilcoy)",
    },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });

  if (!response.ok) return [];
  const json = (await response.json()) as { features?: Array<{ attributes?: Record<string, any> }> };
  if (!Array.isArray(json.features)) return [];
  return json.features.map((f) => f.attributes ?? {});
}

export async function getSmnAlerts(): Promise<SmnAlert[]> {
  const now = Date.now();
  if (cachedAlerts && cachedAlerts.expires > now) {
    return cachedAlerts.data;
  }

  try {
    const [satFeatures, acpFeatures, tempFeatures] = await Promise.all([
      fetchLayerFeatures(3).catch(() => []),
      fetchLayerFeatures(4).catch(() => []),
      fetchLayerFeatures(5).catch(() => []),
    ]);

    const alerts: SmnAlert[] = [];

    for (const item of acpFeatures) {
      const title = item.titulo || "Aviso a Corto Plazo";
      const level: SmnAlertLevel = item.gravedad?.toLowerCase().includes("severa") ? "rojo" : "naranja";
      alerts.push({
        id: `acp-${item.objectid ?? item.alert_id ?? Math.random().toString(36).slice(2)}`,
        type: "corto_plazo",
        level,
        levelColor: levelColor(level),
        title,
        event: "Tormentas severas (Aviso a Corto Plazo)",
        description: item.region ? `Región afectada: ${item.region}` : null,
        instructions: item.instrucciones ?? null,
        timeFrame: null,
        startsAt: toIso(item.fecha_inicio),
        expiresAt: toIso(item.fecha_fin),
        updatedAt: toIso(item.fecha_inicio),
      });
    }

    for (const item of satFeatures) {
      const level = normalizeLevel(item.id_nivel_alerta ?? item.nivel_alerta);
      if (level === "verde") continue;

      const event = item.tipo_evento || "Fenómeno meteorológico";
      alerts.push({
        id: `sat-${item.objectid ?? Math.random().toString(36).slice(2)}`,
        type: "alerta",
        level,
        levelColor: levelColor(level),
        title: `Alerta ${item.nivel_alerta ?? level.toUpperCase()}: ${event}`,
        event,
        description: item.descripcion?.trim() ?? null,
        instructions: item.instrucciones?.trim() ?? null,
        timeFrame: item.franja_horaria ?? null,
        startsAt: toIso(item.fecha_alerta),
        expiresAt: null,
        updatedAt: toIso(item.fecha_actualizacion),
      });
    }

    for (const item of tempFeatures) {
      const level = normalizeLevel(item.id_nivel_alerta);
      if (level === "verde") continue;

      const eventType = item.event_type || "Temperaturas extremas";
      alerts.push({
        id: `temp-${item.objectid ?? Math.random().toString(36).slice(2)}`,
        type: "temperatura",
        level,
        levelColor: levelColor(level),
        title: `Alerta ${item.alert_type ?? level.toUpperCase()} por ${eventType}`,
        event: `Temperaturas extremas (${eventType})`,
        description: `Alerta oficial por temperaturas extremas (${eventType}) para la región.`,
        instructions: null,
        timeFrame: null,
        startsAt: null,
        expiresAt: null,
        updatedAt: toIso(item.fecha_actualizacion),
      });
    }

    cachedAlerts = { data: alerts, expires: now + CACHE_TTL_MS };
    return alerts;
  } catch {
    return cachedAlerts ? cachedAlerts.data : [];
  }
}
