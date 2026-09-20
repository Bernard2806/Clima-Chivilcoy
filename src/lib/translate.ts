type Replacer = string | ((substring: string, ...args: any[]) => string);

function orientDirection(direction: string): string {
  return direction.toUpperCase().replace(/W/g, "O");
}

function precipitationName(kind: string): string {
  const key = kind.toLowerCase();
  if (key.startsWith("shower")) return "Chaparrones";
  if (key.startsWith("snow")) return "Nieve";
  return "Lluvia";
}

const RULES: Array<[RegExp, Replacer]> = [
  // Wind shifts with from/to directions and speeds
  [
    /\b([NSEW]{1,3})\s+winds?\s+shifting\s+to\s+([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+to\s+(\d+)\s+km\/h/gi,
    (_match, d1: string, d2: string, from: string, to: string) =>
      `Vientos del ${orientDirection(d1)} rotando al ${orientDirection(d2)} de ${from} a ${to} km/h`,
  ],
  [
    /\bWinds?\s+([NSEW]{1,3})\s+shifting\s+to\s+([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+to\s+(\d+)\s+km\/h/gi,
    (_match, d1: string, d2: string, from: string, to: string) =>
      `Vientos del ${orientDirection(d1)} rotando al ${orientDirection(d2)} de ${from} a ${to} km/h`,
  ],
  [
    /\b([NSEW]{1,3})\s+winds?\s+shifting\s+to\s+([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+km\/h/gi,
    (_match, d1: string, d2: string, speed: string) =>
      `Vientos del ${orientDirection(d1)} rotando al ${orientDirection(d2)} a ${speed} km/h`,
  ],
  [
    /\bWinds?\s+([NSEW]{1,3})\s+shifting\s+to\s+([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+km\/h/gi,
    (_match, d1: string, d2: string, speed: string) =>
      `Vientos del ${orientDirection(d1)} rotando al ${orientDirection(d2)} a ${speed} km/h`,
  ],
  [
    /\bWinds?\s+([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+to\s+(\d+)\s+km\/h/gi,
    (_match, direction: string, from: string, to: string) =>
      `Vientos del ${orientDirection(direction)} de ${from} a ${to} km/h`,
  ],
  [
    /\b([NSEW]{1,3})\s+winds?\s+(?:at\s+)?(\d+)\s+to\s+(\d+)\s+km\/h/gi,
    (_match, direction: string, from: string, to: string) =>
      `Vientos del ${orientDirection(direction)} de ${from} a ${to} km/h`,
  ],
  [
    /\bWinds?\s+([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+km\/h/gi,
    (_match, direction: string, speed: string) =>
      `Vientos del ${orientDirection(direction)} a ${speed} km/h`,
  ],
  [
    /\b([NSEW]{1,3})\s+winds?\s+(?:at\s+)?(\d+)\s+km\/h/gi,
    (_match, direction: string, speed: string) =>
      `Vientos del ${orientDirection(direction)} a ${speed} km/h`,
  ],
  [/\bWinds?\s+light\s+and\s+variable\b/gi, "Vientos leves y variables"],
  [/\bWinds?\s+variable\b/gi, "Vientos variables"],
  [/\bWindy\s+and\s+partly\s+cloudy\b/gi, "Ventoso y parcialmente nublado"],
  [/\bWindy\s+and\s+mostly\s+cloudy\b/gi, "Ventoso y mayormente nublado"],
  [/\bWindy\b/gi, "Ventoso"],

  // Diurnal timing & transitions
  [/\bdeveloping\s+in\s+the\s+afternoon\b/gi, "desarrollándose por la tarde"],
  [/\bdeveloping\s+in\s+the\s+morning\b/gi, "desarrollándose por la mañana"],
  [/\bdeveloping\s+in\s+the\s+evening\b/gi, "desarrollándose hacia la noche"],
  [/\bdeveloping\s+overnight\b/gi, "desarrollándose durante la noche"],
  [/\bdeveloping\s+late\b/gi, "desarrollándose hacia el final del día"],
  [/\bdeveloping\s+early\b/gi, "desarrollándose temprano"],
  [/\bdeveloping\b/gi, "desarrollándose"],
  [/\bmainly\s+in\s+the\s+afternoon\b/gi, "principalmente por la tarde"],
  [/\bmainly\s+in\s+the\s+morning\b/gi, "principalmente por la mañana"],
  [/\bmainly\s+in\s+the\s+evening\b/gi, "principalmente hacia la noche"],
  [/\bmainly\s+overnight\b/gi, "principalmente durante la noche"],
  [/\bearly\s+in\s+the\s+morning\b/gi, "temprano en la mañana"],
  [/\blate\s+in\s+the\s+day\b/gi, "hacia el final del día"],
  [/\blate\s+in\s+the\s+evening\b/gi, "tarde en la noche"],
  [/\bin\s+the\s+afternoon\b/gi, "por la tarde"],
  [/\bin\s+the\s+morning\b/gi, "por la mañana"],
  [/\bin\s+the\s+evening\b/gi, "hacia la noche"],
  [/\bovernight\b/gi, "durante la noche"],
  [/\bthis\s+evening\b/gi, "esta noche"],
  [/\bthis\s+afternoon\b/gi, "esta tarde"],
  [/\bshowers\s+early\b/gi, "chaparrones temprano"],
  [/\bshowers\s+late\b/gi, "chaparrones tarde"],
  [/\brain\s+early\b/gi, "lluvia temprano"],
  [/\brain\s+late\b/gi, "lluvia tarde"],
  [/\bthen\s+becoming\b/gi, "luego pasando a"],
  [/\bbecoming\b/gi, "pasando a"],

  // Metrics & chances (evaluated before individual words)
  [/\bChance\s+of\s+rain\s+(\d+)%/gi, "Probabilidad de lluvia $1%"],
  [/\bChance\s+of\s+rain\b/gi, "Probabilidad de lluvia"],
  [/\bChance\s+of\s+precipitation\s+(\d+)%/gi, "Probabilidad de precipitación $1%"],
  [/\bChance\s+of\s+precipitation\b/gi, "Probabilidad de precipitación"],
  [/\bChance\s+of\s+showers\b/gi, "Probabilidad de chaparrones"],
  [/\bChance\s+of\s+snow\b/gi, "Probabilidad de nieve"],
  [/\bPrecip\s+([\d.]+)\s*mm\b/gi, "Precipitación $1 mm"],
  [/\bPrecip\b/gi, "Precipitación"],
  [/\bHumidity\s+(\d+)\s*%/gi, "Humedad $1%"],
  [/\bHumidity\b/gi, "Humedad"],
  [/\bUVINDEX\s+(\d+)\b/gi, "Índice UV $1"],
  [/\bUVINDEX\b/gi, "Índice UV"],
  [/\bHigh\b/gi, "Máx"],
  [/\bLow\b/gi, "Mín"],

  // Storms and rain
  [/\bScattered\s+thunderstorms\b/gi, "Tormentas aisladas"],
  [/\bIsolated\s+thunderstorms\b/gi, "Tormentas aisladas"],
  [/\bSevere\s+thunderstorms\b/gi, "Tormentas severas"],
  [/\bThunderstorms?\b/gi, "Tormentas"],
  [/\bPassing\s+showers\b/gi, "Chaparrones pasajeros"],
  [/\bScattered\s+showers\b/gi, "Chaparrones aislados"],
  [/\bIsolated\s+showers\b/gi, "Chaparrones aislados"],
  [/\bShowers?\b/gi, "Chaparrones"],
  [
    /\bLight\s+(rain|showers?|snow)\b/gi,
    (_match, kind: string) => `${precipitationName(kind)} débil`,
  ],
  [
    /\bHeavy\s+(rain|showers?|snow)\b/gi,
    (_match, kind: string) => `${precipitationName(kind)} fuerte`,
  ],
  [/\bDense\s+fog\b/gi, "Niebla densa"],
  [/\bRain\b/gi, "Lluvia"],
  [/\bSnow\b/gi, "Nieve"],
  [/\bFog\b/gi, "Niebla"],
  [/\bHaze\b/gi, "Neblina"],

  // Sky cover
  [/\bPassing\s+clouds\b/gi, "Nubosidad variable"],
  [/\bIntervals\s+of\s+clouds\s+and\s+sunshine\b/gi, "Intervalos de sol y nubes"],
  [/\bTimes\s+of\s+sun\s+and\s+clouds\b/gi, "Intervalos de sol y nubes"],
  [/\bPartly\s+cloudy\s+skies\b/gi, "Cielo parcialmente nublado"],
  [/\bPartly\s+cloudy\b/gi, "Parcialmente nublado"],
  [/\bMostly\s+cloudy\b/gi, "Mayormente nublado"],
  [/\bGenerally\s+clear\b/gi, "Mayormente despejado"],
  [/\bMostly\s+clear\b/gi, "Mayormente despejado"],
  [/\bPartly\s+sunny\b/gi, "Parcialmente soleado"],
  [/\bMainly\s+sunny\b/gi, "Mayormente soleado"],
  [/\bClear\s+skies\b/gi, "Cielo despejado"],
  [/\bA\s+few\s+clouds\b/gi, "Pocas nubes"],
  [/\bFew\s+clouds\b/gi, "Pocas nubes"],
  [/\bOvercast\b/gi, "Cubierto"],
  [/\bCloudy\b/gi, "Nublado"],
  [/\bClouds\b/gi, "Nubes"],
  [/\bSunny\b/gi, "Soleado"],
  [/\bClear\b/gi, "Despejado"],

  // Periods and weekdays
  [/\bTomorrow\s+Night\b/gi, "Mañana a la noche"],
  [/\bTomorrow\b/gi, "Mañana"],
  [/\bTonight\b/gi, "Esta noche"],
  [/\bToday\b/gi, "Hoy"],
  [/\bMonday\s+Night\b/gi, "Lunes a la noche"],
  [/\bMonday\b/gi, "Lunes"],
  [/\bTuesday\s+Night\b/gi, "Martes a la noche"],
  [/\bTuesday\b/gi, "Martes"],
  [/\bWednesday\s+Night\b/gi, "Miércoles a la noche"],
  [/\bWednesday\b/gi, "Miércoles"],
  [/\bThursday\s+Night\b/gi, "Jueves a la noche"],
  [/\bThursday\b/gi, "Jueves"],
  [/\bFriday\s+Night\b/gi, "Viernes a la noche"],
  [/\bFriday\b/gi, "Viernes"],
  [/\bSaturday\s+Night\b/gi, "Sábado a la noche"],
  [/\bSaturday\b/gi, "Sábado"],
  [/\bSunday\s+Night\b/gi, "Domingo a la noche"],
  [/\bSunday\b/gi, "Domingo"],
];

export function translateForecastSummary(summary: string | null): string | null {
  if (!summary) return null;
  let text = summary.trim();
  for (const [pattern, replacement] of RULES) {
    text =
      typeof replacement === "function"
        ? text.replace(pattern, replacement)
        : text.replace(pattern, replacement);
  }
  return text;
}

interface PeriodRule {
  pattern: RegExp;
  label: string;
  offsetDays: number;
}

const PERIOD_RULES: PeriodRule[] = [
  { pattern: /^Tomorrow Night\b/i, label: "Mañana a la noche", offsetDays: 1 },
  { pattern: /^Tonight\b/i, label: "Esta noche", offsetDays: 0 },
  { pattern: /^Overnight\b/i, label: "Esta noche", offsetDays: 0 },
  { pattern: /^Tomorrow\b/i, label: "Mañana", offsetDays: 1 },
  { pattern: /^This (?:Evening|Afternoon)\b/i, label: "Hoy", offsetDays: 0 },
  { pattern: /^Today\b/i, label: "Hoy", offsetDays: 0 },
  { pattern: /^Monday Night\b/i, label: "Lunes a la noche", offsetDays: 1 },
  { pattern: /^Monday\b/i, label: "Lunes", offsetDays: 1 },
  { pattern: /^Tuesday Night\b/i, label: "Martes a la noche", offsetDays: 2 },
  { pattern: /^Tuesday\b/i, label: "Martes", offsetDays: 2 },
  { pattern: /^Wednesday Night\b/i, label: "Miércoles a la noche", offsetDays: 3 },
  { pattern: /^Wednesday\b/i, label: "Miércoles", offsetDays: 3 },
  { pattern: /^Thursday Night\b/i, label: "Jueves a la noche", offsetDays: 4 },
  { pattern: /^Thursday\b/i, label: "Jueves", offsetDays: 4 },
  { pattern: /^Friday Night\b/i, label: "Viernes a la noche", offsetDays: 5 },
  { pattern: /^Friday\b/i, label: "Viernes", offsetDays: 5 },
  { pattern: /^Saturday Night\b/i, label: "Sábado a la noche", offsetDays: 6 },
  { pattern: /^Saturday\b/i, label: "Sábado", offsetDays: 6 },
  { pattern: /^Sunday Night\b/i, label: "Domingo a la noche", offsetDays: 7 },
  { pattern: /^Sunday\b/i, label: "Domingo", offsetDays: 7 },
];

export interface ForecastParts {
  period: string | null;
  periodOffsetDays: number | null;
  condition: string | null;
  details: string[];
}

export function buildForecast(raw: string | null): ForecastParts {
  const empty: ForecastParts = {
    period: null,
    periodOffsetDays: null,
    condition: null,
    details: [],
  };
  if (!raw) return empty;

  let text = raw.trim();
  let period: string | null = null;
  let periodOffsetDays: number | null = null;

  for (const rule of PERIOD_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      text = text.slice(match[0].length).trim();
      period = rule.label;
      periodOffsetDays = rule.offsetDays;
      break;
    }
  }

  const sentences = text
    .split(/\.\s+/)
    .map((sentence) => sentence.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((sentence) => translateForecastSummary(sentence) ?? sentence);

  const condition = sentences.shift() ?? null;

  return { period, periodOffsetDays, condition, details: sentences };
}

export interface MaterialWeatherIcon {
  icon: string;
  theme: string;
}

export function getConditionMaterialIcon(
  cond: string | null | undefined,
  isNight = false,
): MaterialWeatherIcon {
  const text = String(cond ?? "").toLowerCase();

  if (text.includes("tormenta") || text.includes("thunder")) {
    return { icon: "thunderstorm", theme: "thunderstorm" };
  }
  if (
    text.includes("lluvia") ||
    text.includes("chaparron") ||
    text.includes("rain") ||
    text.includes("shower") ||
    text.includes("llovizna")
  ) {
    return { icon: "rainy", theme: "rainy" };
  }
  if (text.includes("nieve") || text.includes("snow") || text.includes("nevada")) {
    return { icon: "weather_snowy", theme: "weather_snowy" };
  }
  if (
    text.includes("niebla") ||
    text.includes("neblina") ||
    text.includes("fog") ||
    text.includes("haze")
  ) {
    return { icon: "foggy", theme: "foggy" };
  }
  if (text.includes("ventoso") || text.includes("windy")) {
    return { icon: "air", theme: "air" };
  }
  if (
    text.includes("parcialmente") ||
    text.includes("algo nublado") ||
    text.includes("partly") ||
    text.includes("intervalos")
  ) {
    return isNight
      ? { icon: "nights_stay", theme: "partly_cloudy_night" }
      : { icon: "partly_cloudy_day", theme: "partly_cloudy_day" };
  }
  if (
    text.includes("mayormente nublado") ||
    text.includes("nublado") ||
    text.includes("cubierto") ||
    text.includes("cloud") ||
    text.includes("overcast")
  ) {
    return { icon: "cloud", theme: "cloud" };
  }
  if (
    text.includes("despejado") ||
    text.includes("soleado") ||
    text.includes("clear") ||
    text.includes("sunny")
  ) {
    return isNight
      ? { icon: "nights_stay", theme: "clear_night" }
      : { icon: "wb_sunny", theme: "wb_sunny" };
  }

  return isNight
    ? { icon: "nights_stay", theme: "clear_night" }
    : { icon: "wb_sunny", theme: "wb_sunny" };
}
