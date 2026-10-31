import type { CityEntry, MonitorEntry } from "@/lib/air/snapshot";
import { getAqiCategory } from "@/lib/aqi";
import type { AqiCategoryId } from "@/lib/aqi";
import { getFreshness } from "@/lib/freshness";
import type { Freshness } from "@/lib/freshness";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCATION_SLUG } from "@/lib/locations";

/** What the map needs to know about one IQAir city, already localised. */
export interface CitySummary {
  slug: string;
  name: string;
  province: string;
  isCapital: boolean;
  lat: number;
  lng: number;
  aqi: number | null;
  category: AqiCategoryId | "none";
  categoryName: string | null;
  /** One-line health advice for the band. */
  advice: string | null;
  observedAt: string | null;
  freshness: Freshness | null;
  /** Shown instead of a value when there is no reading. */
  statusLabel: string | null;
}

/** One school monitor on the map: its latest reading, as the monitor recorded it. */
export interface StationSummary {
  id: string;
  /** The school's name, plus the monitor's label when it has one. */
  name: string;
  lat: number;
  lng: number;
  /** µg/m³ */
  pm25: number | null;
  /** µg/m³ */
  pm10: number | null;
  /** The monitor's own US AQI, only when its CSV records one. */
  aqi: number | null;
  /** Band of `aqi`; "none" when the monitor records concentrations only. */
  category: AqiCategoryId | "none";
  categoryName: string | null;
  observedAt: string;
  freshness: Freshness;
}

export function toCitySummaries(
  entries: CityEntry[],
  locale: Locale,
  dict: Dictionary,
  renderedAt: number,
): CitySummary[] {
  return entries.map(({ location, status }) => {
    const reading = status.state === "ok" ? status.reading : null;
    const category = getAqiCategory(reading?.aqiUs);
    const coordinates = reading?.coordinates ?? location.coordinates;
    return {
      slug: location.slug,
      name: location.name[locale],
      province: location.province[locale],
      isCapital: location.slug === DEFAULT_LOCATION_SLUG,
      lat: coordinates.lat,
      lng: coordinates.lng,
      aqi: reading?.aqiUs ?? null,
      category: category?.id ?? "none",
      categoryName: category ? dict.aqi.categories[category.id].name : null,
      advice: category ? dict.aqi.categories[category.id].advice : null,
      observedAt: reading?.observedAt ?? null,
      freshness: reading ? getFreshness(reading.observedAt, renderedAt) : null,
      statusLabel: status.state === "unavailable" ? dict.status[status.reason] : null,
    };
  });
}

/** Monitors appear on the map once they have a location and at least one reading. */
export function toStationSummaries(
  entries: MonitorEntry[],
  locale: Locale,
  dict: Dictionary,
  renderedAt: number,
): StationSummary[] {
  return entries.flatMap(({ monitor, school, readings }) => {
    const latest = readings.at(-1);
    if (!monitor.location || !latest) return [];
    const category = getAqiCategory(latest.aqiUs);
    const schoolName = school ? school.name[locale] : monitor.id;
    return [
      {
        id: monitor.id,
        name: monitor.label ? `${schoolName} · ${monitor.label[locale]}` : schoolName,
        lat: monitor.location.lat,
        lng: monitor.location.lng,
        pm25: latest.pm25,
        pm10: latest.pm10,
        aqi: latest.aqiUs,
        category: category?.id ?? "none",
        categoryName: category ? dict.aqi.categories[category.id].name : null,
        observedAt: latest.observedAt,
        freshness: getFreshness(latest.observedAt, renderedAt),
      },
    ];
  });
}
