import { describe, expect, it } from "vitest";

import { AQI_CATEGORIES, getAqiCategory } from "@/lib/aqi";

describe("getAqiCategory", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "moderate"],
    [100, "moderate"],
    [101, "sensitive"],
    [150, "sensitive"],
    [151, "unhealthy"],
    [200, "unhealthy"],
    [201, "very-unhealthy"],
    [300, "very-unhealthy"],
    [301, "hazardous"],
    [999, "hazardous"],
  ])("puts %i in the %s band", (value, expected) => {
    expect(getAqiCategory(value)?.id).toBe(expected);
  });

  it("rounds fractional values like the published index", () => {
    expect(getAqiCategory(50.4)?.id).toBe("good");
    expect(getAqiCategory(50.5)?.id).toBe("moderate");
  });

  it.each([null, undefined, Number.NaN, -1, Number.POSITIVE_INFINITY])(
    "returns null for missing or invalid input (%s) instead of treating it as zero",
    (value) => {
      expect(getAqiCategory(value as number | null | undefined)).toBeNull();
    },
  );

  it("covers every integer from 0 to 500 with exactly one band", () => {
    for (let value = 0; value <= 500; value += 1) {
      const matches = AQI_CATEGORIES.filter((band) => value >= band.min && value <= band.max);
      expect(matches).toHaveLength(1);
    }
  });
});
