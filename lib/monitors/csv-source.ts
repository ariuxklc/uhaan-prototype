import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { MonitorReading } from "@/lib/air/types";
import { MonitorCsvError, parseMonitorCsv } from "@/lib/monitors/csv";
import type { MonitorSource } from "@/lib/monitors/source";

/** One folder per monitor: `monitor-data/<monitor id>/*.csv`. */
export const MONITOR_DATA_DIR = path.join(process.cwd(), "monitor-data");

const reported = new Set<string>();

function warnOnce(message: string) {
  if (reported.has(message)) return;
  reported.add(message);
  console.warn(message);
}

async function csvFiles(folder: string): Promise<string[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    // No folder means no data yet, which is normal.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Reads `<dir>/<monitor id>/*.csv`, re-parsing a monitor only when its files change. */
export function createCsvSource(dir: string): MonitorSource {
  const parsed = new Map<string, { key: string; readings: MonitorReading[] }>();

  return {
    async readings(monitor) {
      const folder = path.join(dir, monitor.id);
      const names = await csvFiles(folder);
      if (names.length === 0) return [];

      const stats = await Promise.all(names.map((name) => stat(path.join(folder, name))));
      const key = JSON.stringify([monitor.csv ?? null, names, stats.map((info) => [info.size, info.mtimeMs])]);
      const cached = parsed.get(monitor.id);
      if (cached?.key === key) return cached.readings;

      // Files are read in name order; when two rows share a time, the later file wins.
      const byTime = new Map<string, MonitorReading>();
      for (const name of names) {
        const file = `${path.basename(dir)}/${monitor.id}/${name}`;
        try {
          const { readings, skipped } = parseMonitorCsv(await readFile(path.join(folder, name), "utf8"), monitor.csv);
          const [first] = skipped;
          if (first) {
            warnOnce(`[monitors] ${file}: skipped ${skipped.length} row(s); first at line ${first.line}: ${first.reason}`);
          }
          for (const reading of readings) byTime.set(reading.observedAt, reading);
        } catch (error) {
          if (!(error instanceof MonitorCsvError)) throw error;
          warnOnce(`[monitors] ${file} was not read: ${error.message}`);
        }
      }

      const readings = [...byTime.values()].sort((a, b) => (a.observedAt < b.observedAt ? -1 : 1));
      parsed.set(monitor.id, { key, readings });
      return readings;
    },
  };
}

/** Monitor readings from the CSV files committed in `monitor-data/`. */
export const csvSource = createCsvSource(MONITOR_DATA_DIR);
