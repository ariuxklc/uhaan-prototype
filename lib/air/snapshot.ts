import "server-only";

import { cache } from "react";

import type { Monitor, School } from "@/content/model";
import { iqairProvider } from "@/lib/air/iqair-provider";
import { sampleProvider } from "@/lib/air/sample-provider";
import type { AirDataProvider, LocationStatus, MonitorReading } from "@/lib/air/types";
import { getContent } from "@/lib/content";
import { findSchool } from "@/lib/content/relations";
import { DEFAULT_LOCATION_SLUG, LOCATIONS } from "@/lib/locations";
import type { MongoliaLocation } from "@/lib/locations";
import { getMonitorReadings } from "@/lib/monitors";

/**
 * How the site is currently sourcing city data:
 * - `live`: IQAir with a configured key.
 * - `sample`: development fixtures (never used in production).
 * - `unconfigured`: production without a key; every city reads as unavailable.
 */
export type DataMode = "live" | "sample" | "unconfigured";

/** One IQAir city and its latest status. */
export interface CityEntry {
  location: MongoliaLocation;
  status: LocationStatus;
}

/** One school monitor and everything it has recorded. */
export interface MonitorEntry {
  monitor: Monitor;
  school: School | undefined;
  /** Oldest first; empty until the monitor's data is added. */
  readings: MonitorReading[];
}

export interface NetworkSnapshot {
  mode: DataMode;
  /** Every IQAir city, in registry order. */
  cities: CityEntry[];
  /** Every school monitor, with or without readings. */
  monitors: MonitorEntry[];
  /** When this snapshot was assembled; the reference "now" for freshness. */
  assembledAt: number;
}

const unconfiguredProvider: AirDataProvider = {
  id: "iqair",
  async getLatest() {
    return { state: "unavailable", reason: "configuration" };
  },
};

/**
 * Chooses the city data provider. Future providers (e.g. a Firestore-backed
 * store filled by a scheduled ingestion job) plug in here.
 */
function resolveProvider(): { provider: AirDataProvider; mode: DataMode } {
  const isProduction = process.env.NODE_ENV === "production";
  const wantsSample = process.env.UT_DATA_SOURCE === "sample";

  if (!isProduction && wantsSample) return { provider: sampleProvider, mode: "sample" };
  if (process.env.IQAIR_API_KEY?.trim()) return { provider: iqairProvider, mode: "live" };
  if (!isProduction) return { provider: sampleProvider, mode: "sample" };
  return { provider: unconfiguredProvider, mode: "unconfigured" };
}

/** Every school monitor with its readings. Never calls IQAir. */
export const getMonitorEntries = cache(async (): Promise<MonitorEntry[]> => {
  const content = await getContent();
  return Promise.all(
    content.monitors.map(async (monitor) => ({
      monitor,
      school: findSchool(content, monitor.school),
      readings: await getMonitorReadings(monitor),
    })),
  );
});

/** Every city and every school monitor, deduplicated per request. */
export const getNetworkSnapshot = cache(async (): Promise<NetworkSnapshot> => {
  const { provider, mode } = resolveProvider();
  const [cities, monitors] = await Promise.all([
    // Requests start in registry order, so the largest cities claim the
    // rate-limit budget first when the cache is cold.
    Promise.all(
      LOCATIONS.map(async (location) => ({ location, status: await provider.getLatest(location.slug) })),
    ),
    getMonitorEntries(),
  ]);
  return { mode, cities, monitors, assembledAt: Date.now() };
});

/** Just the capital's status, for lightweight uses such as the site backdrop. */
export async function getCapitalStatus(): Promise<LocationStatus> {
  return resolveProvider().provider.getLatest(DEFAULT_LOCATION_SLUG);
}
