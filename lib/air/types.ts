import type { LatLng } from "@/lib/locations";
import type { PollutantId } from "@/lib/pollutants";

/**
 * Where a reading came from. Every reading carries its source so that data
 * from different providers (IQAir cities, our school monitors) is never
 * pooled anonymously.
 */
export interface ReadingSource {
  /** Stable provider identifier. */
  provider: "iqair" | "sample" | "school-monitor";
  /** Spatial resolution of the value. IQAir's free plan publishes city-level data. */
  resolution: "city" | "station";
  /** Human-readable attribution, shown wherever the value is displayed. */
  attribution: string;
  attributionUrl: string;
}

export interface PollutantReading {
  /** Concentration in `unit`; `null` when not published. */
  concentration: number | null;
  unit: string | null;
  aqiUs: number | null;
}

export interface WeatherReading {
  observedAt: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  windSpeedMs: number | null;
  /** Meteorological convention: the direction the wind blows from, N = 0°. */
  windFromDeg: number | null;
  /** OpenWeather-style icon code published by IQAir, e.g. "01d", "13n". */
  icon: string | null;
}

export interface AirReading {
  locationSlug: string;
  source: ReadingSource;
  /** Timestamp of the pollution observation, as published by the source. */
  observedAt: string;
  /** When this server retrieved the reading from the source. */
  retrievedAt: string;
  aqiUs: number;
  aqiCn: number | null;
  mainPollutantUs: PollutantId | null;
  /** Per-pollutant detail. Only paid IQAir plans publish it; `null` otherwise. */
  pollutants: Partial<Record<PollutantId, PollutantReading>> | null;
  weather: WeatherReading | null;
  coordinates: LatLng | null;
}

export type UnavailableReason =
  /** Not fetched yet: requests are paced to respect the source's rate limit. */
  | "queued"
  /** The source answered with an error or malformed data. */
  | "upstream"
  /** The source no longer knows this location. */
  | "not-found"
  /** The server is missing or has an invalid API key. */
  | "configuration";

export type LocationStatus =
  | { state: "ok"; reading: AirReading }
  | { state: "unavailable"; reason: UnavailableReason };

export interface AirDataProvider {
  readonly id: ReadingSource["provider"];
  getLatest(locationSlug: string): Promise<LocationStatus>;
}

/**
 * One row from a school monitor, exactly as the device recorded it: a measured
 * concentration is never turned into an AQI here. With Firebase, this is the
 * shape of each `monitors/<id>/readings/<observedAt>` document.
 */
export interface MonitorReading {
  /** ISO 8601, UTC. */
  observedAt: string;
  /** PM2.5 in µg/m³. */
  pm25: number | null;
  /** PM10 in µg/m³. */
  pm10: number | null;
  /** US AQI, only when the monitor's own CSV records one. */
  aqiUs: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
}

/** Provenance of every school monitor reading. */
export const SCHOOL_MONITOR_SOURCE: ReadingSource = {
  provider: "school-monitor",
  resolution: "station",
  attribution: "Utaani Tagnuul school monitors",
  attributionUrl: "/data",
};
