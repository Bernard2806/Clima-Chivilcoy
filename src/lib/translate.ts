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
  [
    /\bWinds? ([NSEW]{1,3})\s+(?:at\s+)?(\d+)\s+to\s+(\d+)\s+km\/h/gi,
    (_match, direction: string, from: string, to: string) =>
      `Vientos del ${orientDirection(direction)} de ${from} a ${to} km/h`,
  ],
  [/\bWinds? light and variable\b/gi, "Vientos leves y variables"],
  [
    /\bLight (rain|showers?|snow)\b/gi,
    (_match, kind: string) => `${precipitationName(kind)} débil`,
  ],
  [
    /\bHeavy (rain|showers?|snow)\b/gi,
    (_match, kind: string) => `${precipitationName(kind)} fuerte`,
  ],
  [/\bDense fog\b/gi, "Niebla densa"],
  [/\bChance of rain\b/gi, "Probabilidad de lluvia"],
  [/\bChance of showers\b/gi, "Probabilidad de chaparrones"],
  [/\bChance of snow\b/gi, "Probabilidad de nieve"],
  [/\bThunderstorms?\b/gi, "Tormentas"],
  [/\bShowers?\b/gi, "Chaparrones"],
  [/\bGenerally clear\b/gi, "Mayormente despejado"],
  [/\bMostly clear\b/gi, "Mayormente despejado"],
  [/\bPartly cloudy\b/gi, "Parcialmente nublado"],
  [/\bMostly cloudy\b/gi, "Mayormente nublado"],
  [/\bPartly sunny\b/gi, "Parcialmente soleado"],
  [/\bOvercast\b/gi, "Cubierto"],
  [/\bCloudy\b/gi, "Nublado"],
  [/\bClouds\b/gi, "Nubes"],
  [/\bSunny\b/gi, "Soleado"],
  [/\bClear\b/gi, "Despejado"],
  [/\bRain\b/gi, "Lluvia"],
  [/\bSnow\b/gi, "Nieve"],
  [/\bFog\b/gi, "Niebla"],
  [/\bHaze\b/gi, "Neblina"],
  [/\bTomorrow\b/gi, "Mañana"],
  [/\bTonight\b/gi, "Esta noche"],
  [/\bToday\b/gi, "Hoy"],
  [/\bHigh\b/gi, "Máx"],
  [/\bLow\b/gi, "Mín"],
];

export function translateForecastSummary(summary: string | null): string | null {
  if (!summary) return null;
  let text = summary.trim();
  for (const [pattern, replacement] of RULES) {
    text = text.replace(pattern, replacement);
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
