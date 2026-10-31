import { describe, expect, it } from "vitest";

import type { CityEntry, MonitorEntry } from "@/lib/air/snapshot";
import type { MonitorReading } from "@/lib/air/types";
import {
  averageReadings,
  cityDataset,
  inDateRange,
  IQAIR_TERMS,
  localTime,
  monitorDataset,
  monitorDownloadName,
  parseMonitorQuery,
  toCsv,
  toJson,
} from "@/lib/downloads";
import { getLocation } from "@/lib/locations";

const cities: CityEntry[] = [
  {
    location: getLocation("ulaanbaatar")!,
    status: {
      state: "ok",
      reading: {
        locationSlug: "ulaanbaatar",
        source: { provider: "iqair", resolution: "city", attribution: "IQAir", attributionUrl: "https://www.iqair.com" },
        observedAt: "2026-10-09T15:00:00.000Z",
        retrievedAt: "2026-10-09T15:05:00.000Z",
        aqiUs: 154,
        aqiCn: 88,
        mainPollutantUs: "pm25",
        pollutants: null,
        weather: null,
        coordinates: null,
      },
    },
  },
  { location: getLocation("khovd")!, status: { state: "unavailable", reason: "queued" } },
];

/** A reading at the given Ulaanbaatar time ("2026-11-02 08:15"). */
function reading(ulaanbaatarTime: string, values: Partial<MonitorReading> = {}): MonitorReading {
  const observedAt = new Date(`${ulaanbaatarTime.replace(" ", "T")}:00+08:00`).toISOString();
  return { observedAt, pm25: null, pm10: null, aqiUs: null, temperatureC: null, humidityPct: null, ...values };
}

const sant: MonitorEntry = {
  monitor: { id: "sant", school: "sant", location: { lat: 47.92, lng: 106.92 } },
  school: { slug: "sant", name: { mn: "Сант сургууль", en: "Sant School" }, role: "host" },
  readings: [
    reading("2026-11-01 23:50", { pm25: 50 }),
    reading("2026-11-02 08:00", { pm25: 35.2, aqiUs: 99 }),
    reading("2026-11-02 08:30", { pm25: 40, pm10: 60 }),
    reading("2026-11-02 09:10", { pm25: 20 }),
  ],
};
const nest: MonitorEntry = {
  monitor: { id: "nest", school: "nest" },
  school: { slug: "nest", name: { mn: "Nest сургууль", en: "Nest School" }, role: "partner" },
  readings: [reading("2026-11-02 08:00", { pm10: 30 })],
};

const query = (search: string) => parseMonitorQuery(new URLSearchParams(search), ["sant", "nest", "hobby"]);

describe("city downloads", () => {
  it("give local times in each place's own time zone", () => {
    expect(localTime("2026-11-02T00:00:00.000Z", "Asia/Ulaanbaatar")).toBe("2026-11-02 08:00");
    expect(localTime("2026-11-02T00:00:00.000Z", "Asia/Hovd")).toBe("2026-11-02 07:00");
  });

  it("list every city, with empty values and the reason when there is no reading", () => {
    const { rows } = cityDataset(cities);
    expect(rows[0]).toMatchObject({
      city: "Ulaanbaatar",
      city_mn: "Улаанбаатар",
      us_aqi: 154,
      cn_aqi: 88,
      temperature_c: null,
      observed_at_utc: "2026-10-09T15:00:00.000Z",
      observed_at_local: "2026-10-09 23:00",
      status: "ok",
      source: "IQAir",
    });
    expect(rows[1]).toMatchObject({ city: "Khovd", us_aqi: null, observed_at_local: null, status: "queued", source: null });
  });

  it("write CSV that Excel opens correctly, with empty cells for missing values", () => {
    const lines = toCsv(cityDataset(cities)).split("\r\n");
    expect(lines[0]?.startsWith("﻿city,city_mn,province,province_mn,latitude,longitude,us_aqi")).toBe(true);
    expect(lines[2]).toBe("Khovd,Ховд,Khovd,Ховд,48.00556,91.64194,,,,,,,,,,,,queued,");
  });

  it("carry IQAir's terms", () => {
    const json = JSON.parse(toJson(cityDataset(cities), "2026-11-03T00:00:00.000Z"));
    expect(json.terms).toBe(IQAIR_TERMS);
    expect(IQAIR_TERMS).toMatch(/non-commercial/i);
    expect(IQAIR_TERMS).toMatch(/legal proceedings/);
    expect(IQAIR_TERMS).toMatch(/cite IQAir/i);
  });
});

describe("CSV writer", () => {
  it("quotes cells that need it", () => {
    const csv = toCsv({
      name: "x",
      description: "",
      columns: ["a", "b"],
      rows: [{ a: 'Say "hi", ok', b: null }],
      attribution: "",
      terms: "",
    });
    expect(csv).toBe('﻿a,b\r\n"Say ""hi"", ok",\r\n');
  });
});

describe("parseMonitorQuery", () => {
  it("means everything when nothing is asked for, or the form sends empty fields", () => {
    const everything = { query: { monitors: null, from: null, to: null, average: null } };
    expect(query("")).toEqual(everything);
    expect(query("from=&to=&average=")).toEqual(everything);
  });

  it("accepts monitors from repeated checkboxes or a comma list, in registry order", () => {
    expect(query("monitors=nest&monitors=sant")).toEqual({
      query: { monitors: ["sant", "nest"], from: null, to: null, average: null },
    });
    expect(query("monitors=hobby,sant,sant")).toMatchObject({ query: { monitors: ["sant", "hobby"] } });
  });

  it("swaps reversed dates and reads averaging", () => {
    expect(query("from=2026-11-30&to=2026-11-01&average=day")).toEqual({
      query: { monitors: null, from: "2026-11-01", to: "2026-11-30", average: "day" },
    });
  });

  it("explains what's wrong instead of guessing", () => {
    expect(query("monitors=snat")).toEqual({ error: 'Unknown monitor "snat". Monitors: sant, nest, hobby.' });
    expect(query("from=02/11/2026")).toEqual({ error: '"from" must be a date like 2026-11-02.' });
    expect(query("to=2026-02-30")).toEqual({ error: '"to" must be a date like 2026-11-02.' });
    expect(query("average=week")).toEqual({ error: '"average" must be "hour" or "day".' });
  });
});

describe("monitor downloads", () => {
  it("keep whole Ulaanbaatar days, both included", () => {
    const times = (from: string | null, to: string | null) =>
      inDateRange(sant.readings, from, to).map((entry) => localTime(entry.observedAt, "Asia/Ulaanbaatar"));
    expect(times("2026-11-02", "2026-11-02")).toEqual(["2026-11-02 08:00", "2026-11-02 08:30", "2026-11-02 09:10"]);
    expect(times(null, "2026-11-01")).toEqual(["2026-11-01 23:50"]);
    expect(times(null, null)).toHaveLength(4);
  });

  it("average per Ulaanbaatar hour and day, skipping missing values and counting readings", () => {
    const hours = averageReadings(sant.readings, "hour");
    expect(hours.map((hour) => [localTime(hour.periodStart, "Asia/Ulaanbaatar"), hour.readings, hour.pm25, hour.pm10])).toEqual([
      ["2026-11-01 23:00", 1, 50, null],
      ["2026-11-02 08:00", 2, 37.6, 60],
      ["2026-11-02 09:00", 1, 20, null],
    ]);
    const days = averageReadings(sant.readings, "day");
    expect(days.map((day) => [localTime(day.periodStart, "Asia/Ulaanbaatar"), day.readings, day.pm25])).toEqual([
      ["2026-11-01 00:00", 1, 50],
      ["2026-11-02 00:00", 3, 31.7],
    ]);
  });

  it("write every reading as recorded, for the chosen monitors", () => {
    const parsed = query("monitors=sant&from=2026-11-02&to=2026-11-02");
    if ("error" in parsed) throw new Error(parsed.error);
    const dataset = monitorDataset([sant, nest], parsed.query);
    expect(dataset.name).toBe("monitors-sant-2026-11-02-to-2026-11-02");
    expect(dataset.rows).toHaveLength(3);
    expect(dataset.rows[0]).toEqual({
      monitor: "sant",
      school: "Sant School",
      school_mn: "Сант сургууль",
      latitude: 47.92,
      longitude: 106.92,
      observed_at_utc: "2026-11-02T00:00:00.000Z",
      observed_at_local: "2026-11-02 08:00",
      pm2_5_ugm3: 35.2,
      pm10_ugm3: null,
      us_aqi: 99,
      temperature_c: null,
      humidity_pct: null,
      source: "Utaani Tagnuul school monitors",
    });
  });

  it("leave AQI out of averages, because an average of AQI values is not an AQI", () => {
    const parsed = query("average=hour");
    if ("error" in parsed) throw new Error(parsed.error);
    const dataset = monitorDataset([sant, nest], parsed.query);
    expect(dataset.columns).not.toContain("us_aqi");
    expect(dataset.columns).toContain("readings");
    expect(dataset.rows.map((row) => [row.monitor, row.period_start_local, row.readings, row.pm2_5_ugm3_mean])).toEqual([
      ["sant", "2026-11-01 23:00", 1, 50],
      ["sant", "2026-11-02 08:00", 2, 37.6],
      ["sant", "2026-11-02 09:00", 1, 20],
      ["nest", "2026-11-02 08:00", 1, null],
    ]);
    const json = JSON.parse(toJson(dataset, "2026-11-03T00:00:00.000Z"));
    expect(json.description).toMatch(/not an AQI/);
  });

  it("name files after what they contain", () => {
    expect(monitorDownloadName({ monitors: null, from: null, to: null, average: null })).toBe("monitors");
    expect(monitorDownloadName({ monitors: ["sant", "nest"], from: "2026-11-01", to: null, average: "day" })).toBe(
      "monitors-sant-nest-2026-11-01-to-latest-daily",
    );
  });
});
