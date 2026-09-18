import type { SmnAlert, SmnAlertLevel, SmnForecastItem } from "./types";

const SMN_FEATURE_SERVER =
  "https://utility.arcgis.com/usrsvcs/servers/eafad8dd86ca4f49b788397d0977a207/rest/services/Hosted/Servicio_Meteorologico_Nacional/FeatureServer";

const CHIVILCOY_LON = -60.0058;
const CHIVILCOY_LAT = -34.8906;

const CACHE_TTL_MS = 300_000;
let cachedAlerts: { data: SmnAlert[]; expires: number } | null = null;

const FORECAST_CACHE_TTL_MS = 1800_000;
let cachedForecast: { data: SmnForecastItem[]; expires: number } | null = null;

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

function conditionToIcon(cond: string | null | undefined): string {
  const c = String(cond ?? "").toLowerCase();
  if (c.includes("tormenta")) return "thunderstorm";
  if (c.includes("lluvia") || c.includes("llovizna") || c.includes("chaparron")) return "rainy";
  if (c.includes("nieve") || c.includes("nevada")) return "weather_snowy";
  if (c.includes("niebla") || c.includes("neblina")) return "foggy";
  if (c.includes("algo nublado") || c.includes("ligeramente nublado") || c.includes("parcialmente")) return "partly_cloudy_day";
  if (c.includes("nublado") || c.includes("cubierto")) return "cloud";
  if (c.includes("despejado")) return "wb_sunny";
  if (c.includes("ventoso")) return "air";
  return "wb_sunny";
}

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Hoy";
  if (index === 1) return "Mañana";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const raw = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(".", "");
  } catch {
    return dateStr;
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

export async function getSmnForecast(): Promise<SmnForecastItem[]> {
  const now = Date.now();
  if (cachedForecast && cachedForecast.expires > now) {
    return cachedForecast.data;
  }

  try {
    const url = `${SMN_FEATURE_SERVER}/2/query?where=localidad=%279+de+Julio%27&outFields=*&orderByFields=fecha_pronostico+ASC&f=json`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ClimaChivilcoy/0.1 (+https://github.com/Bernard2806/Clima-Chivilcoy)",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (!response.ok) return cachedForecast ? cachedForecast.data : [];
    const json = (await response.json()) as { features?: Array<{ attributes?: Record<string, any> }> };
    if (!Array.isArray(json.features) || json.features.length === 0) {
      return cachedForecast ? cachedForecast.data : [];
    }

    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());

    const map = new Map<string, any[]>();
    for (const f of json.features) {
      const a = f.attributes;
      if (!a?.fecha_pronostico) continue;
      const dateStr = new Date(a.fecha_pronostico).toISOString().slice(0, 10);
      if (dateStr < todayStr) continue;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(a);
    }

    const forecastList: SmnForecastItem[] = [];
    let index = 0;

    for (const [date, items] of map.entries()) {
      const mins = items.map((i) => i.temperatura_minima).filter((v): v is number => typeof v === "number");
      const maxs = items.map((i) => i.temperatura_maxima).filter((v): v is number => typeof v === "number");
      const probs = items.map((i) => i.probabilidad_lluvia_maxima).filter((v): v is number => typeof v === "number");

      const afternoon = items.find((i) => i.franja_horaria === "Tarde") || items[0];
      const condition = afternoon.clima || "Tiempo bueno";
      const icon = conditionToIcon(condition);

      const windParts: string[] = [];
      if (afternoon.direccion_viento) windParts.push(afternoon.direccion_viento);
      if (afternoon.velocidad_viento_maxima) windParts.push(`${afternoon.velocidad_viento_maxima} km/h`);

      forecastList.push({
        date,
        dayName: getDayLabel(date, index),
        period: afternoon.franja_horaria || "Día",
        temp: afternoon.temperatura ?? null,
        tempMin: mins.length > 0 ? Math.min(...mins) : null,
        tempMax: maxs.length > 0 ? Math.max(...maxs) : null,
        condition,
        icon,
        rainProb: probs.length > 0 ? Math.max(...probs) : 0,
        wind: windParts.length > 0 ? windParts.join(" ") : null,
      });

      index++;
      if (forecastList.length >= 6) break;
    }

    cachedForecast = { data: forecastList, expires: now + FORECAST_CACHE_TTL_MS };
    return forecastList;
  } catch {
    return cachedForecast ? cachedForecast.data : [];
  }
}
