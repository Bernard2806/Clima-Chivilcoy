import { getLw6eqgSnapshot } from "../src/lib/lw6eqg.ts";
import { getIntaSnapshot } from "../src/lib/inta.ts";
import { getCurrentWeather } from "../src/lib/source.ts";
import { combineStations } from "../src/lib/ensemble.ts";

async function run() {
  console.log("Fetching all stations...");
  const [current, inta, lw6eqg] = await Promise.all([
    getCurrentWeather(),
    getIntaSnapshot().catch(() => null),
    getLw6eqgSnapshot().catch(() => null),
  ]);

  console.log("LW6EQG Snapshot:", lw6eqg);
  console.log("INTA Snapshot:", inta);
  console.log("ClimaChivilcoy Temp:", current.temperature);

  const combined = combineStations(current, [inta, lw6eqg]);
  console.log("Combined Station Count:", combined.stationCount);
  console.log("Combined Sources:", combined.sources.map(s => s.name));
  console.log("Combined Temperature:", combined.temperature);
  console.log("Combined Humidity:", combined.humidity);
  console.log("Combined Pressure:", combined.pressure);

  if (!combined.sources.some(s => s.key === "lw6eqg")) {
    console.error("LW6EQG is missing from combined sources!");
    process.exit(1);
  }

  console.log("All ensemble tests passed!");
}

run();
