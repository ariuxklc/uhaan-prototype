import { describe, expect, it } from "vitest";

import type { MonitorCsvFormat } from "@/content/model";
import { MonitorCsvError, parseMonitorCsv } from "@/lib/monitors/csv";

const NOW = Date.parse("2026-11-03T00:00:00.000Z");
const parse = (text: string, format: MonitorCsvFormat = {}) => parseMonitorCsv(text, format, NOW);

/** 08:00 in Ulaanbaatar on 2 November 2026. */
const UB_MORNING = "2026-11-02T00:00:00.000Z";
const empty = { pm25: null, pm10: null, aqiUs: null, temperatureC: null, humidityPct: null };

describe("parseMonitorCsv", () => {
  it("reads the usual layout, taking times without an offset as Ulaanbaatar time", () => {
    const { readings, skipped } = parse("time,pm25,pm10\n2026-11-02 08:00:00,35.2,48.0\n");
    expect(skipped).toEqual([]);
    expect(readings).toEqual([{ ...empty, observedAt: UB_MORNING, pm25: 35.2, pm10: 48 }]);
  });

  it("recognises common header spellings and units, and ignores PM1.0", () => {
    const { readings } = parse(
      "Timestamp,PM1.0 (ug/m3),PM2.5 (µg/m³),PM10 (µg/m³),Temperature (°C),RH (%),US AQI\n" +
        "2026-11-02T00:00:00Z,20,30.5,41,-12.5,64,90\n",
    );
    expect(readings).toEqual([
      { observedAt: UB_MORNING, pm25: 30.5, pm10: 41, aqiUs: 90, temperatureC: -12.5, humidityPct: 64 },
    ]);
  });

  it("joins separate date and time columns, with semicolons and decimal commas", () => {
    const { readings } = parse("Date;Time;PM2.5;PM10\n2026.11.02;08:00;35,2;48\n");
    expect(readings).toEqual([{ ...empty, observedAt: UB_MORNING, pm25: 35.2, pm10: 48 }]);
  });

  it("accepts tabs, quotes, a byte-order mark, comment lines and Unix timestamps", () => {
    const seconds = Date.parse(UB_MORNING) / 1000;
    const text = `﻿# logger v2\nts\tpm2_5\tpm10\n${seconds}\t"12.5"\t20\n${seconds * 1000 + 60_000}\t13\t21\n`;
    expect(parse(text).readings).toEqual([
      { ...empty, observedAt: UB_MORNING, pm25: 12.5, pm10: 20 },
      { ...empty, observedAt: "2026-11-02T00:01:00.000Z", pm25: 13, pm10: 21 },
    ]);
  });

  it("respects explicit offsets and a monitor's utcOffset", () => {
    expect(parse("time,pm25\n2026-11-02T08:00:00+08:00,1\n").readings[0]?.observedAt).toBe(UB_MORNING);
    expect(parse("time,pm25\n2026-11-02 00:00,1\n", { utcOffset: "+00:00" }).readings[0]?.observedAt).toBe(UB_MORNING);
  });

  it("uses configured header names, or column numbers for files without a header", () => {
    const named = parse("Date Time,Dust 2.5,Dust 10\n2026-11-02 08:00,35,48\n", {
      columns: { time: "Date Time", pm25: "Dust 2.5", pm10: "dust 10" },
    });
    expect(named.readings).toEqual([{ ...empty, observedAt: UB_MORNING, pm25: 35, pm10: 48 }]);

    const numbered = parse("2026-11-02 08:00,35,48\n", { columns: { time: 0, pm25: 1, pm10: 2 } });
    expect(numbered.readings).toEqual([{ ...empty, observedAt: UB_MORNING, pm25: 35, pm10: 48 }]);
  });

  it("skips rows it can't trust, says why, and never turns gaps into zeros", () => {
    const { readings, skipped } = parse(
      [
        "time,pm25,pm10",
        "2026-11-02 08:00,,48",
        "2026-11-02 08:01,-1,999999",
        "1970-01-01 00:00:10,35,48",
        "2026-12-25 08:00,35,48",
        "02/11/2026 08:00,35,48",
        "2026-11-31 08:00,35,48",
        "2026-11-02 08:0",
      ].join("\n"),
    );
    expect(readings).toEqual([{ ...empty, observedAt: UB_MORNING, pm10: 48 }]);
    expect(skipped).toEqual([
      { line: 3, reason: "no usable PM2.5, PM10 or AQI value" },
      { line: 4, reason: "the monitor's clock wasn't set" },
      { line: 5, reason: "the time is in the future" },
      { line: 6, reason: "unreadable time (use YYYY-MM-DD HH:mm)" },
      { line: 7, reason: "unreadable time (use YYYY-MM-DD HH:mm)" },
      { line: 8, reason: "unreadable time (use YYYY-MM-DD HH:mm)" },
    ]);
  });

  it("refuses files it can't read at all, saying what's wrong", () => {
    expect(() => parse("")).toThrow(MonitorCsvError);
    expect(() => parse("when,dust\n2026-11-02 08:00,35\n")).toThrow(
      "there is no time column (the headers are: when, dust)",
    );
    expect(() => parse("time,dust\n2026-11-02 08:00,35\n")).toThrow("there is no PM2.5, PM10 or AQI column");
    expect(() => parse("2026-11-02 08:00,35,48\n")).toThrow("the file has no header row");
    expect(() => parse("time,pm25\n2026-11-02 08:00,35\n", { columns: { pm25: "PM2.5" } })).toThrow(
      'there is no "PM2.5" column',
    );
    expect(() => parse("time,pm25\n", { utcOffset: "UTC+8" })).toThrow('utcOffset "UTC+8"');
  });
});
