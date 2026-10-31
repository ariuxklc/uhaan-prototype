import "server-only";

import type { AirDataProvider, AirReading, ReadingSource } from "@/lib/air/types";
import { getLocation } from "@/lib/locations";
import type { PollutantId } from "@/lib/pollutants";

/**
 * Development-only, made-up readings so the interface can be built without an
 * API key or without spending quota. Every reading is marked `provider:
 * "sample"`, and the layout shows a banner whenever this provider is active.
 */
const SAMPLE_SOURCE: ReadingSource = {
  provider: "sample",
  resolution: "city",
  attribution: "Sample data (not real measurements)",
  attributionUrl: "/data",
};

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const SAMPLE_ICONS = ["01d", "02d", "03d", "04d", "13d", "50d", "01n", "02n"];
const SAMPLE_MAIN: PollutantId[] = ["pm25", "pm25", "pm25", "pm10"];

function buildReading(slug: string): AirReading | null {
  const location = getLocation(slug);
  if (!location) return null;

  const hourStart = new Date();
  hourStart.setUTCMinutes(0, 0, 0);
  const seed = hash(`${slug}:${hourStart.toISOString().slice(0, 13)}`);
  const base = slug === "ulaanbaatar" ? 150 : 30 + (hash(slug) % 140);
  const aqiUs = Math.max(8, Math.round(base + ((seed % 41) - 20)));

  return {
    locationSlug: slug,
    source: SAMPLE_SOURCE,
    observedAt: hourStart.toISOString(),
    retrievedAt: new Date().toISOString(),
    aqiUs,
    aqiCn: Math.round(aqiUs * 0.6),
    mainPollutantUs: SAMPLE_MAIN[seed % SAMPLE_MAIN.length] ?? null,
    pollutants: null,
    weather: {
      observedAt: hourStart.toISOString(),
      temperatureC: -12 + (seed % 20),
      feelsLikeC: -15 + (seed % 20),
      humidityPct: 30 + (seed % 50),
      pressureHpa: 1005 + (seed % 25),
      windSpeedMs: (seed % 70) / 10,
      windFromDeg: seed % 360,
      icon: SAMPLE_ICONS[seed % SAMPLE_ICONS.length] ?? null,
    },
    coordinates: location.coordinates,
  };
}

export const sampleProvider: AirDataProvider = {
  id: "sample",
  async getLatest(slug) {
    const reading = buildReading(slug);
    return reading
      ? { state: "ok", reading }
      : { state: "unavailable", reason: "not-found" };
  },
};
