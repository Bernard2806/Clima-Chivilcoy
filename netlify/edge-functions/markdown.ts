const show = (value: unknown, unit: string) =>
  value === null || value === undefined ? "sin dato" : `${value} ${unit}`;

export default async (request: Request) => {
  const response = await fetch(new URL("/api/current", request.url), {
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response?.ok) return;

  const weather = await response.json();
  const alerts = weather.alerts.map(
    (alert: { title: string; level: string }) =>
      `- ${alert.title} (nivel ${alert.level})`,
  );
  const forecast = weather.smnForecast.map(
    (item: {
      dayName: string;
      period: string;
      condition: string;
      temp: number | null;
    }) =>
      `- ${item.dayName}, ${item.period}: ${item.condition}, ${show(item.temp, "°C")}`,
  );

  const markdown = [
    "# Clima en Chivilcoy, Buenos Aires",
    "",
    `Datos de ${weather.stationCount} estaciones locales. Actualizado: ${weather.fetchedAt}.`,
    "",
    "## Condiciones actuales",
    "",
    `- Temperatura: ${show(weather.temperature, "°C")}`,
    `- Sensación térmica: ${show(weather.feelsLike, "°C")}`,
    `- Humedad: ${show(weather.humidity, "%")}`,
    `- Punto de rocío: ${show(weather.dewpoint, "°C")}`,
    `- Presión: ${show(weather.pressure, "hPa")}`,
    `- Viento: ${show(weather.windAvg, "km/h")}`,
    `- Lluvia de hoy: ${show(weather.rainToday, "mm")}`,
    "",
    "## Alertas del SMN",
    "",
    ...(alerts.length > 0 ? alerts : ["Sin alertas vigentes."]),
    "",
    "## Pronóstico extendido del SMN",
    "",
    ...(forecast.length > 0 ? forecast : ["Sin datos."]),
    "",
  ].join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
    },
  });
};

export const config = {
  path: "/",
  header: { accept: "text/markdown" },
};
