import type { PollutantReading, WeatherReading } from "@/lib/air/types";
import { classifyIqairMessage, IqairError, isQuotaMessage } from "@/lib/iqair/errors";
import type { LatLng } from "@/lib/locations";
import { POLLUTANT_IDS, POLLUTANT_TO_IQAIR_CODE, pollutantFromIqairCode } from "@/lib/pollutants";
import type { PollutantId } from "@/lib/pollutants";

/** The parts of an IQAir `/v2/city` response the site relies on. */
export interface ParsedCityObservation {
  observedAt: string;
  aqiUs: number;
  aqiCn: number | null;
  mainPollutantUs: PollutantId | null;
  pollutants: Partial<Record<PollutantId, PollutantReading>> | null;
  weather: WeatherReading | null;
  coordinates: LatLng | null;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/**
 * Returns the number when it is finite and inside the plausible range,
 * otherwise `null`. Missing values stay missing; they never become zero.
 */
function numberInRange(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

const UNIT_LABELS: Record<string, string> = {
  ugm3: "µg/m³",
  ppb: "ppb",
  ppm: "ppm",
  mgm3: "mg/m³",
};

function parseCoordinates(location: unknown): LatLng | null {
  if (!isObject(location) || !Array.isArray(location.coordinates)) return null;
  const [lng, lat] = location.coordinates;
  const latitude = numberInRange(lat, -90, 90);
  const longitude = numberInRange(lng, -180, 180);
  return latitude === null || longitude === null ? null : { lat: latitude, lng: longitude };
}

function parseWeather(weather: unknown): WeatherReading | null {
  if (!isObject(weather) || !isTimestamp(weather.ts)) return null;
  return {
    observedAt: new Date(weather.ts).toISOString(),
    temperatureC: numberInRange(weather.tp, -80, 60),
    feelsLikeC: numberInRange(weather.heatIndex, -90, 80),
    humidityPct: numberInRange(weather.hu, 0, 100),
    pressureHpa: numberInRange(weather.pr, 500, 1100),
    windSpeedMs: numberInRange(weather.ws, 0, 120),
    windFromDeg: numberInRange(weather.wd, 0, 360),
    icon: typeof weather.ic === "string" && /^\d{2}[dn]$/.test(weather.ic) ? weather.ic : null,
  };
}

function parsePollutants(
  pollution: JsonObject,
  units: unknown,
): Partial<Record<PollutantId, PollutantReading>> | null {
  const unitMap = isObject(units) ? units : {};
  const result: Partial<Record<PollutantId, PollutantReading>> = {};

  for (const id of POLLUTANT_IDS) {
    const code = POLLUTANT_TO_IQAIR_CODE[id];
    const detail = pollution[code];
    if (!isObject(detail)) continue;
    const rawUnit = unitMap[code];
    result[id] = {
      concentration: numberInRange(detail.conc, 0, 100_000),
      unit: typeof rawUnit === "string" ? (UNIT_LABELS[rawUnit] ?? rawUnit) : null,
      aqiUs: numberInRange(detail.aqius, 0, 2000),
    };
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Validates an IQAir `/v2/city` payload. Throws `IqairError` for API errors or
 * payloads without a usable US AQI; optional fields degrade to `null`.
 */
export function parseCityResponse(payload: unknown): ParsedCityObservation {
  if (!isObject(payload)) {
    throw new IqairError("upstream", "IQAir returned a non-object payload.");
  }

  if (payload.status !== "success") {
    const message =
      isObject(payload.data) && typeof payload.data.message === "string"
        ? payload.data.message
        : String(payload.status ?? "unknown_error");
    throw new IqairError(classifyIqairMessage(message), `IQAir: ${message}`, {
      quotaExhausted: isQuotaMessage(message),
    });
  }

  const data = payload.data;
  const current = isObject(data) ? data.current : undefined;
  const pollution = isObject(current) ? current.pollution : undefined;

  if (!isObject(data) || !isObject(current) || !isObject(pollution)) {
    throw new IqairError("upstream", "IQAir payload is missing current pollution data.");
  }

  const aqiUs = numberInRange(pollution.aqius, 0, 2000);
  if (aqiUs === null || !isTimestamp(pollution.ts)) {
    throw new IqairError("upstream", "IQAir payload has no valid US AQI or timestamp.");
  }

  return {
    observedAt: new Date(pollution.ts).toISOString(),
    aqiUs: Math.round(aqiUs),
    aqiCn: numberInRange(pollution.aqicn, 0, 2000),
    mainPollutantUs: pollutantFromIqairCode(pollution.mainus),
    pollutants: parsePollutants(pollution, data.units),
    weather: parseWeather(current.weather),
    coordinates: parseCoordinates(data.location),
  };
}
