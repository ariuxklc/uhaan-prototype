/**
 * How current a reading is, judged by the age of its original timestamp.
 *
 * Thresholds reflect the update cadence: IQAir publishes hourly, the capital
 * is refreshed every hour and other cities every two to four hours.
 */
export type Freshness = "live" | "recent" | "stale" | "outdated" | "unknown";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const FRESHNESS_LIMITS = {
  live: 90 * MINUTE,
  recent: 4 * HOUR,
  stale: 24 * HOUR,
} as const;

/** Small clock skew between servers is tolerated before a time counts as "future". */
const FUTURE_TOLERANCE = 10 * MINUTE;

export function getFreshness(observedAt: string, now: number = Date.now()): Freshness {
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed) || !Number.isFinite(now)) return "unknown";

  const age = now - observed;
  if (age < -FUTURE_TOLERANCE) return "unknown";
  if (age <= FRESHNESS_LIMITS.live) return "live";
  if (age <= FRESHNESS_LIMITS.recent) return "recent";
  if (age <= FRESHNESS_LIMITS.stale) return "stale";
  return "outdated";
}
