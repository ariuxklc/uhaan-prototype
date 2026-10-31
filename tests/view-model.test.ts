import { describe, expect, it } from "vitest";

import type { Monitor } from "@/content/model";
import type { CityEntry, MonitorEntry, NetworkSnapshot } from "@/lib/air/snapshot";
import type { AirReading, MonitorReading } from "@/lib/air/types";
import { en } from "@/lib/i18n/dictionaries/en";
import { getLocation } from "@/lib/locations";
import { buildMapProps } from "@/lib/map-props";
import { toCitySummaries, toStationSummaries } from "@/lib/view-model";

const NOW = Date.parse("2026-10-09T15:30:00.000Z");

function reading(slug: string, aqiUs: number): AirReading {
  return {
    locationSlug: slug,
    source: { provider: "iqair", resolution: "city", attribution: "IQAir", attributionUrl: "https://www.iqair.com" },
    observedAt: "2026-10-09T15:00:00.000Z",
    retrievedAt: "2026-10-09T15:05:00.000Z",
    aqiUs,
    aqiCn: null,
    mainPollutantUs: "pm25",
    pollutants: null,
    weather: null,
    coordinates: null,
  };
}

function entry(slug: string, aqi: number | null): CityEntry {
  const location = getLocation(slug)!;
  return aqi === null
    ? { location, status: { state: "unavailable", reason: "queued" } }
    : { location, status: { state: "ok", reading: reading(slug, aqi) } };
}

function monitorReading(observedAt: string, values: Partial<MonitorReading> = {}): MonitorReading {
  return { observedAt, pm25: 35.2, pm10: 48, aqiUs: null, temperatureC: null, humidityPct: null, ...values };
}

function station(monitor: Partial<Monitor>, readings: MonitorReading[]): MonitorEntry {
  return {
    monitor: { id: "sant", school: "sant", ...monitor },
    school: { slug: "sant", name: { mn: "Сант сургууль", en: "Sant School" }, role: "host" },
    readings,
  };
}

const snapshot = (
  mode: NetworkSnapshot["mode"],
  cities: CityEntry[],
  monitors: MonitorEntry[] = [],
): NetworkSnapshot => ({ mode, cities, monitors, assembledAt: NOW });

describe("toCitySummaries", () => {
  it("localises and keeps missing readings missing", () => {
    const [ub, darkhan] = toCitySummaries([entry("ulaanbaatar", 154), entry("darkhan", null)], "en", en, NOW);
    expect(ub).toMatchObject({
      name: "Ulaanbaatar",
      aqi: 154,
      category: "unhealthy",
      categoryName: "Unhealthy",
      advice: en.aqi.categories.unhealthy.advice,
      freshness: "live",
      isCapital: true,
    });
    expect(darkhan).toMatchObject({
      aqi: null,
      category: "none",
      categoryName: null,
      advice: null,
      statusLabel: en.status.queued,
      freshness: null,
    });
  });

  it("falls back to registry coordinates when the reading has none", () => {
    const [summary] = toCitySummaries([entry("darkhan", 40)], "en", en, NOW);
    expect(summary).toMatchObject({ lat: 49.427188, lng: 105.952284 });
  });
});

describe("toStationSummaries", () => {
  const location = { lat: 47.92, lng: 106.92 };

  it("shows a monitor's latest reading as recorded, without inventing an AQI", () => {
    const [summary] = toStationSummaries(
      [station({ location }, [monitorReading("2026-10-09T14:00:00.000Z", { pm25: 80 }), monitorReading("2026-10-09T15:00:00.000Z")])],
      "en",
      en,
      NOW,
    );
    expect(summary).toEqual({
      id: "sant",
      name: "Sant School",
      lat: 47.92,
      lng: 106.92,
      pm25: 35.2,
      pm10: 48,
      aqi: null,
      category: "none",
      categoryName: null,
      observedAt: "2026-10-09T15:00:00.000Z",
      freshness: "live",
    });
  });

  it("uses the monitor's own AQI when its CSV records one, and its label", () => {
    const [summary] = toStationSummaries(
      [station({ location, label: { mn: "Дээвэр", en: "Rooftop" } }, [monitorReading("2026-10-09T15:00:00.000Z", { aqiUs: 98 })])],
      "en",
      en,
      NOW,
    );
    expect(summary).toMatchObject({ name: "Sant School · Rooftop", aqi: 98, category: "moderate", categoryName: "Moderate" });
  });

  it("leaves monitors off the map until they have a location and a reading", () => {
    const summaries = toStationSummaries(
      [station({}, [monitorReading("2026-10-09T15:00:00.000Z")]), station({ location }, [])],
      "en",
      en,
      NOW,
    );
    expect(summaries).toEqual([]);
  });

  it("labels old readings as outdated", () => {
    const [summary] = toStationSummaries([station({ location }, [monitorReading("2026-10-01T15:00:00.000Z")])], "en", en, NOW);
    expect(summary?.freshness).toBe("outdated");
  });
});

describe("buildMapProps", () => {
  it("says how many cities are still loading", () => {
    const props = buildMapProps(snapshot("live", [entry("ulaanbaatar", 154), entry("darkhan", null)]), "en", en);
    expect(props.status).toBe("Loading more cities (1)…");
  });

  it("has no status when every city has a reading", () => {
    expect(buildMapProps(snapshot("live", [entry("ulaanbaatar", 154)]), "en", en).status).toBeNull();
  });

  it("always labels sample and unconfigured data", () => {
    expect(buildMapProps(snapshot("sample", [entry("ulaanbaatar", 154)]), "en", en).status).toBe(en.map.sample);
    expect(buildMapProps(snapshot("unconfigured", []), "en", en).status).toBe(en.map.unconfigured);
  });

  it("adds school monitors and their legend line only when one is on the map", () => {
    const without = buildMapProps(snapshot("live", [entry("ulaanbaatar", 154)]), "en", en);
    expect(without.stations).toEqual([]);
    expect(without.legend.stations).toBeNull();

    const monitors = [station({ location: { lat: 47.92, lng: 106.92 } }, [monitorReading("2026-10-09T15:00:00.000Z")])];
    const withStations = buildMapProps(snapshot("live", [entry("ulaanbaatar", 154)], monitors), "en", en);
    expect(withStations.stations).toHaveLength(1);
    expect(withStations.legend.stations).toBe(en.monitor.legend);
  });
});
