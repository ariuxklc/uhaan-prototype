/** Pollutants IQAir can report, keyed by the site's own identifiers. */
export const POLLUTANT_IDS = ["pm25", "pm10", "o3", "no2", "so2", "co"] as const;

export type PollutantId = (typeof POLLUTANT_IDS)[number];

/** IQAir's short pollutant codes (`mainus`, `maincn` and per-pollutant keys). */
const IQAIR_CODE_TO_POLLUTANT: Record<string, PollutantId> = {
  p2: "pm25",
  p1: "pm10",
  o3: "o3",
  n2: "no2",
  s2: "so2",
  co: "co",
};

export const POLLUTANT_TO_IQAIR_CODE: Record<PollutantId, string> = {
  pm25: "p2",
  pm10: "p1",
  o3: "o3",
  no2: "n2",
  so2: "s2",
  co: "co",
};

export function pollutantFromIqairCode(code: unknown): PollutantId | null {
  if (typeof code !== "string") return null;
  return IQAIR_CODE_TO_POLLUTANT[code] ?? null;
}
