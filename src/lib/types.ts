export interface Forecast {
  temperature: number | null;
  summary: string | null;
  icon: string | null;
  period: string | null;
  periodOffsetDays: number | null;
  condition: string | null;
  details: string[];
}

export interface CurrentWeather {
  source: string;
  fetchedAt: string;
  sourceUpdatedSeconds: number | null;
  temperature: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  feelsLike: number | null;
  humidity: number | null;
  humidityMax: number | null;
  humidityMin: number | null;
  dewpoint: number | null;
  dewpointTrend: string | null;
  pressure: number | null;
  pressureTrend: string | null;
  windAvg: number | null;
  windMax: number | null;
  windRun: number | null;
  rainToday: number | null;
  rainMonth: number | null;
  rainRate: number | null;
  sunrise: string | null;
  sunset: string | null;
  daylight: string | null;
  moonPhase: string | null;
  moonLuminance: number | null;
  moonrise: string | null;
  moonset: string | null;
  forecast: Forecast;
}
