import type { CityEntry, MonitorEntry } from "@/lib/air/snapshot";
import { SCHOOL_MONITOR_SOURCE } from "@/lib/air/types";
import type { MonitorReading } from "@/lib/air/types";

/**
 * The open-data downloads (`/api/data/…`): one row shape per dataset, written
 * out as CSV or JSON. Values are what the site shows: missing values are empty
 * (CSV) or `null` (JSON), never 0.
 */

export type Cell = string | number | null;

export interface Dataset {
  /** Used in the file name, e.g. "cities" or "monitors-sant-daily". */
  name: string;
  /** What each row is, in one sentence (included in JSON files). */
  description: string;
  columns: readonly string[];
  rows: Record<string, Cell>[];
  attribution: string;
  terms: string;
}

/** IQAir's conditions for sharing its data, as they gave them to the project. */
export const IQAIR_TERMS =
  "Air-quality data from IQAir (https://www.iqair.com). Non-commercial use only. Provided for reference; " +
  "not to be used as evidence in legal proceedings. Cite IQAir as the source when you display or share it.";

export const MONITOR_TERMS =
  "Measured by Utaani Tagnuul's school monitors: low-cost sensors, so values are indicative, not official " +
  "measurements. Cite Utaani Tagnuul as the source.";

const CITY_COLUMNS = [
  "city",
  "city_mn",
  "province",
  "province_mn",
  "latitude",
  "longitude",
  "us_aqi",
  "cn_aqi",
  "main_pollutant",
  "temperature_c",
  "humidity_pct",
  "wind_speed_ms",
  "wind_from_deg",
  "pressure_hpa",
  "observed_at_utc",
  "observed_at_local",
  "retrieved_at_utc",
  "status",
  "source",
] as const;

const MONITOR_COLUMNS = [
  "monitor",
  "school",
  "school_mn",
  "latitude",
  "longitude",
  "observed_at_utc",
  "observed_at_local",
  "pm2_5_ugm3",
  "pm10_ugm3",
  "us_aqi",
  "temperature_c",
  "humidity_pct",
  "source",
] as const;

/** Averages: no AQI column, because an average of AQI values is not an AQI. */
const AVERAGE_COLUMNS = [
  "monitor",
  "school",
  "school_mn",
  "latitude",
  "longitude",
  "period",
  "period_start_utc",
  "period_start_local",
  "readings",
  "pm2_5_ugm3_mean",
  "pm10_ugm3_mean",
  "temperature_c_mean",
  "humidity_pct_mean",
  "source",
] as const;

const ULAANBAATAR = "Asia/Ulaanbaatar";
/** Ulaanbaatar is UTC+8 all year (no daylight saving since 2017). */
const ULAANBAATAR_OFFSET_MS = 8 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

const localFormats = new Map<string, Intl.DateTimeFormat>();

/** "2026-11-02 08:00" in the given time zone: easy to read and to sort, and Excel parses it. */
export function localTime(iso: string, timeZone: string): string {
  let format = localFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    localFormats.set(timeZone, format);
  }
  const parts = Object.fromEntries(format.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/* ------------------------------------------------------------------ *
 * Cities
 * ------------------------------------------------------------------ */

/** Every IQAir city: its latest reading, or an empty row with the reason there is none. */
export function cityDataset(cities: CityEntry[]): Dataset {
  const rows = cities.map(({ location, status }): Record<(typeof CITY_COLUMNS)[number], Cell> => {
    const reading = status.state === "ok" ? status.reading : null;
    const point = reading?.coordinates ?? location.coordinates;
    const weather = reading?.weather ?? null;
    return {
      city: location.name.en,
      city_mn: location.name.mn,
      province: location.province.en,
      province_mn: location.province.mn,
      latitude: point.lat,
      longitude: point.lng,
      us_aqi: reading?.aqiUs ?? null,
      cn_aqi: reading?.aqiCn ?? null,
      main_pollutant: reading?.mainPollutantUs ?? null,
      temperature_c: weather?.temperatureC ?? null,
      humidity_pct: weather?.humidityPct ?? null,
      wind_speed_ms: weather?.windSpeedMs ?? null,
      wind_from_deg: weather?.windFromDeg ?? null,
      pressure_hpa: weather?.pressureHpa ?? null,
      observed_at_utc: reading?.observedAt ?? null,
      observed_at_local: reading ? localTime(reading.observedAt, location.timeZone) : null,
      retrieved_at_utc: reading?.retrievedAt ?? null,
      status: status.state === "ok" ? "ok" : status.reason,
      source: reading?.source.attribution ?? null,
    };
  });
  return {
    name: "cities",
    description: "The latest reading of every city. IQAir's free plan keeps no history.",
    columns: CITY_COLUMNS,
    rows,
    attribution: "IQAir",
    terms: IQAIR_TERMS,
  };
}

/* ------------------------------------------------------------------ *
 * School monitors: which monitors, which days, and how much detail
 * ------------------------------------------------------------------ */

export type Averaging = "hour" | "day";

/** What a monitor download asks for; `null` means "everything". */
export interface MonitorQuery {
  /** Monitor ids, in registry order. */
  monitors: string[] | null;
  /** Ulaanbaatar dates ("2026-11-02"), both included. */
  from: string | null;
  to: string | null;
  /** Means per hour or day instead of every reading. */
  average: Averaging | null;
}

export const EVERYTHING: MonitorQuery = { monitors: null, from: null, to: null, average: null };

/** "2026-11-02" → the UTC time of midnight in Ulaanbaatar, or `null` if it isn't a real date. */
function ulaanbaatarMidnight(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = Date.UTC(year, month - 1, date);
  if (new Date(utc).getUTCMonth() !== month - 1 || new Date(utc).getUTCDate() !== date) return null;
  return utc - ULAANBAATAR_OFFSET_MS;
}

/**
 * Reads `?monitors=sant,nest&from=2026-11-01&to=2026-11-30&average=day`, as
 * sent by the Data page's form (which repeats `monitors=` per checkbox) or
 * written by hand. Empty values mean "everything"; reversed dates are swapped.
 */
export function parseMonitorQuery(
  params: URLSearchParams,
  knownIds: readonly string[],
): { query: MonitorQuery } | { error: string } {
  const ids = params
    .getAll("monitors")
    .flatMap((value) => value.split(","))
    .map((id) => id.trim())
    .filter(Boolean);
  const unknown = ids.find((id) => !knownIds.includes(id));
  if (unknown) return { error: `Unknown monitor "${unknown}". Monitors: ${knownIds.join(", ")}.` };

  let from = params.get("from")?.trim() || null;
  let to = params.get("to")?.trim() || null;
  for (const [name, value] of [
    ["from", from],
    ["to", to],
  ] as const) {
    if (value !== null && ulaanbaatarMidnight(value) === null) {
      return { error: `"${name}" must be a date like 2026-11-02.` };
    }
  }
  if (from && to && from > to) [from, to] = [to, from];

  const average = params.get("average")?.trim() || null;
  if (average !== null && average !== "hour" && average !== "day") {
    return { error: `"average" must be "hour" or "day".` };
  }

  return {
    query: {
      monitors: ids.length > 0 ? knownIds.filter((id) => ids.includes(id)) : null,
      from,
      to,
      average,
    },
  };
}

/** The readings on the given Ulaanbaatar days, both included. */
export function inDateRange(readings: MonitorReading[], from: string | null, to: string | null): MonitorReading[] {
  const start = from ? (ulaanbaatarMidnight(from) ?? -Infinity) : -Infinity;
  const end = to ? (ulaanbaatarMidnight(to) ?? Infinity) + DAY_MS : Infinity;
  if (start === -Infinity && end === Infinity) return readings;
  return readings.filter((reading) => {
    const time = Date.parse(reading.observedAt);
    return time >= start && time < end;
  });
}

export interface AveragedReading {
  /** Start of the Ulaanbaatar hour or day, ISO 8601 UTC. */
  periodStart: string;
  /** How many readings were averaged. */
  readings: number;
  pm25: number | null;
  pm10: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
}

type Averaged = "pm25" | "pm10" | "temperatureC" | "humidityPct";
const AVERAGED: readonly Averaged[] = ["pm25", "pm10", "temperatureC", "humidityPct"];

/**
 * Means per Ulaanbaatar hour or day. A missing value is left out of its mean,
 * never counted as 0; a period with no value for a column gets `null`. Means
 * are rounded to 0.1, the sensors' own precision.
 */
export function averageReadings(readings: MonitorReading[], period: Averaging): AveragedReading[] {
  const size = period === "hour" ? HOUR_MS : DAY_MS;
  const buckets = new Map<number, { count: number; sums: Record<Averaged, { total: number; n: number }> }>();

  for (const reading of readings) {
    const time = Date.parse(reading.observedAt);
    const start = Math.floor((time + ULAANBAATAR_OFFSET_MS) / size) * size - ULAANBAATAR_OFFSET_MS;
    let bucket = buckets.get(start);
    if (!bucket) {
      bucket = {
        count: 0,
        sums: {
          pm25: { total: 0, n: 0 },
          pm10: { total: 0, n: 0 },
          temperatureC: { total: 0, n: 0 },
          humidityPct: { total: 0, n: 0 },
        },
      };
      buckets.set(start, bucket);
    }
    bucket.count += 1;
    for (const key of AVERAGED) {
      const value = reading[key];
      if (value !== null) {
        bucket.sums[key].total += value;
        bucket.sums[key].n += 1;
      }
    }
  }

  const mean = ({ total, n }: { total: number; n: number }) => (n === 0 ? null : Math.round((total / n) * 10) / 10);
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, { count, sums }]) => ({
      periodStart: new Date(start).toISOString(),
      readings: count,
      pm25: mean(sums.pm25),
      pm10: mean(sums.pm10),
      temperatureC: mean(sums.temperatureC),
      humidityPct: mean(sums.humidityPct),
    }));
}

/** "monitors", or e.g. "monitors-sant-nest-2026-11-01-to-2026-11-30-daily", for the file name. */
export function monitorDownloadName(query: MonitorQuery): string {
  const parts = ["monitors", ...(query.monitors ?? [])];
  if (query.from || query.to) parts.push(`${query.from ?? "start"}-to-${query.to ?? "latest"}`);
  if (query.average) parts.push(query.average === "hour" ? "hourly" : "daily");
  return parts.join("-");
}

/** School monitor readings, filtered by monitor and date, as recorded or averaged. */
export function monitorDataset(entries: MonitorEntry[], query: MonitorQuery = EVERYTHING): Dataset {
  const selected = query.monitors ? entries.filter((entry) => query.monitors?.includes(entry.monitor.id)) : entries;
  const base = { name: monitorDownloadName(query), attribution: SCHOOL_MONITOR_SOURCE.attribution, terms: MONITOR_TERMS };
  const about = (entry: MonitorEntry) => ({
    monitor: entry.monitor.id,
    school: entry.school?.name.en ?? null,
    school_mn: entry.school?.name.mn ?? null,
    latitude: entry.monitor.location?.lat ?? null,
    longitude: entry.monitor.location?.lng ?? null,
  });

  if (!query.average) {
    const rows = selected.flatMap((entry) =>
      inDateRange(entry.readings, query.from, query.to).map(
        (reading): Record<(typeof MONITOR_COLUMNS)[number], Cell> => ({
          ...about(entry),
          observed_at_utc: reading.observedAt,
          observed_at_local: localTime(reading.observedAt, ULAANBAATAR),
          pm2_5_ugm3: reading.pm25,
          pm10_ugm3: reading.pm10,
          us_aqi: reading.aqiUs,
          temperature_c: reading.temperatureC,
          humidity_pct: reading.humidityPct,
          source: SCHOOL_MONITOR_SOURCE.attribution,
        }),
      ),
    );
    return { ...base, description: "Every reading, as each monitor recorded it.", columns: MONITOR_COLUMNS, rows };
  }

  const period = query.average;
  const rows = selected.flatMap((entry) =>
    averageReadings(inDateRange(entry.readings, query.from, query.to), period).map(
      (average): Record<(typeof AVERAGE_COLUMNS)[number], Cell> => ({
        ...about(entry),
        period,
        period_start_utc: average.periodStart,
        period_start_local: localTime(average.periodStart, ULAANBAATAR),
        readings: average.readings,
        pm2_5_ugm3_mean: average.pm25,
        pm10_ugm3_mean: average.pm10,
        temperature_c_mean: average.temperatureC,
        humidity_pct_mean: average.humidityPct,
        source: SCHOOL_MONITOR_SOURCE.attribution,
      }),
    ),
  );
  return {
    ...base,
    description:
      `${period === "hour" ? "Hourly" : "Daily"} means (Ulaanbaatar time) of each monitor's readings; ` +
      "`readings` is how many were averaged. Missing values are left out, not counted as 0. " +
      "The monitors' own AQI is not averaged, because an average of AQI values is not an AQI.",
    columns: AVERAGE_COLUMNS,
    rows,
  };
}

/* ------------------------------------------------------------------ *
 * Writers
 * ------------------------------------------------------------------ */

function csvCell(value: Cell): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(dataset: Dataset): string {
  const lines = [
    dataset.columns.join(","),
    ...dataset.rows.map((row) => dataset.columns.map((column) => csvCell(row[column] ?? null)).join(",")),
  ];
  // The byte-order mark makes Excel read the Mongolian names as UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function toJson(dataset: Dataset, generatedAt: string): string {
  const { name, description, attribution, terms, rows } = dataset;
  return JSON.stringify({ dataset: name, description, generatedAt, attribution, terms, rows });
}
