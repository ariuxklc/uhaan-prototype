/**
 * US EPA Air Quality Index categories.
 *
 * IQAir reports a calculated US AQI for every city, so the site displays that
 * index as published. Nothing here converts concentrations into an index.
 */

export const AQI_CATEGORY_IDS = [
  "good",
  "moderate",
  "sensitive",
  "unhealthy",
  "very-unhealthy",
  "hazardous",
] as const;

export type AqiCategoryId = (typeof AQI_CATEGORY_IDS)[number];

export interface AqiCategory {
  id: AqiCategoryId;
  /** Inclusive lower bound of the band. */
  min: number;
  /** Inclusive upper bound of the band; the last band is open-ended. */
  max: number;
}

export const AQI_CATEGORIES: readonly AqiCategory[] = [
  { id: "good", min: 0, max: 50 },
  { id: "moderate", min: 51, max: 100 },
  { id: "sensitive", min: 101, max: 150 },
  { id: "unhealthy", min: 151, max: 200 },
  { id: "very-unhealthy", min: 201, max: 300 },
  { id: "hazardous", min: 301, max: Number.POSITIVE_INFINITY },
];

export function isValidAqi(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Returns the band for a US AQI value, or `null` when the value is missing or
 * invalid. Fractional values are rounded first, matching how the index is
 * published.
 */
export function getAqiCategory(value: number | null | undefined): AqiCategory | null {
  if (!isValidAqi(value)) return null;
  const rounded = Math.round(value);
  return AQI_CATEGORIES.find((band) => rounded >= band.min && rounded <= band.max) ?? null;
}

/**
 * Band colours for the map's canvas glow, where CSS variables aren't
 * available. Keep in sync with the `--aqi-*` tokens in `app/globals.css`.
 */
export const AQI_HEX: Record<AqiCategoryId, string> = {
  good: "#4fae5a",
  moderate: "#e9b52c",
  sensitive: "#ef8a2f",
  unhealthy: "#cd3f35",
  "very-unhealthy": "#8e4fa3",
  hazardous: "#7a2333",
};
