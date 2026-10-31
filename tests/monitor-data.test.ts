import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MONITORS } from "@/content/monitors";
import { parseMonitorCsv } from "@/lib/monitors/csv";

/**
 * Checks the real CSV files in `monitor-data/`, so a file the site can't read
 * fails `npm test` with its name and the reason, instead of silently missing
 * from the site.
 */
const DATA_DIR = join(process.cwd(), "monitor-data");

const files = MONITORS.flatMap((monitor) => {
  const folder = join(DATA_DIR, monitor.id);
  const names = existsSync(folder) ? readdirSync(folder).filter((name) => name.toLowerCase().endsWith(".csv")) : [];
  return names.map((name) => ({ monitor, file: `monitor-data/${monitor.id}/${name}`, path: join(folder, name) }));
});

describe("monitor-data/", () => {
  it("has a folder for every monitor, and none for monitors that don't exist", () => {
    const folders = readdirSync(DATA_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(folders).toEqual(MONITORS.map((monitor) => monitor.id).sort());
  });

  it("only holds CSV files the site can read", () => {
    for (const { monitor, file, path } of files) {
      let readings: unknown[];
      try {
        ({ readings } = parseMonitorCsv(readFileSync(path, "utf8"), monitor.csv));
      } catch (error) {
        throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
      expect(readings.length, `${file} has no usable rows`).toBeGreaterThan(0);
    }
  });
});
