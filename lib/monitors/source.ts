import type { Monitor } from "@/content/model";
import type { MonitorReading } from "@/lib/air/types";

/**
 * Where school monitor readings come from. Today: CSV files in
 * `monitor-data/`. With Firebase: a Firestore source reading
 * `monitors/<id>/readings`, returning the same shape, so nothing that shows the
 * readings changes (see docs/ARCHITECTURE.md).
 */
export interface MonitorSource {
  /** Every reading of the monitor, oldest first, at most one per timestamp. */
  readings(monitor: Monitor): Promise<MonitorReading[]>;
}
