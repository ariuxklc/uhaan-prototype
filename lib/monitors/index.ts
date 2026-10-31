import "server-only";

import type { Monitor } from "@/content/model";
import type { MonitorReading } from "@/lib/air/types";
import { csvSource } from "@/lib/monitors/csv-source";
import type { MonitorSource } from "@/lib/monitors/source";

/** The active source of monitor readings. A Firestore source is swapped in here. */
const source: MonitorSource = csvSource;

/** Every reading of one monitor, oldest first. Empty until its data is added. */
export function getMonitorReadings(monitor: Monitor): Promise<MonitorReading[]> {
  return source.readings(monitor);
}
