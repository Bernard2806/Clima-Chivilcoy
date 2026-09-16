export type TempUnit = "C" | "F";
export type WindUnit = "km/h" | "mph" | "kts" | "m/s";
export type PressureUnit = "hPa" | "inHg" | "mmHg";
export type RainUnit = "mm" | "in";
export type DistanceUnit = "km" | "mi";

export function toCelsius(value: number, unit: TempUnit): number {
  return unit === "F" ? ((value - 32) * 5) / 9 : value;
}

export function toKmh(value: number, unit: WindUnit): number {
  switch (unit) {
    case "mph":
      return value * 1.609344;
    case "kts":
      return value * 1.852;
    case "m/s":
      return value * 3.6;
    default:
      return value;
  }
}

export function toKm(value: number, unit: DistanceUnit): number {
  return unit === "mi" ? value * 1.609344 : value;
}

export function toHpa(value: number, unit: PressureUnit): number {
  switch (unit) {
    case "inHg":
      return value * 33.8638866667;
    case "mmHg":
      return value * 1.333223684;
    default:
      return value;
  }
}

export function toMm(value: number, unit: RainUnit): number {
  return unit === "in" ? value * 25.4 : value;
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function detectTempUnit(html: string): TempUnit {
  if (/(&deg;?|°)\s*F\b/i.test(html) || /fahrenheit/i.test(html)) return "F";
  return "C";
}

export function detectPressureUnit(html: string): PressureUnit {
  if (/inHg/i.test(html)) return "inHg";
  if (/mmHg/i.test(html)) return "mmHg";
  return "hPa";
}

export function detectRainUnit(html: string): RainUnit {
  if (/inches|\bin\b(?=[^a-z])/i.test(html) && !/\bmm\b/i.test(html)) return "in";
  return "mm";
}
