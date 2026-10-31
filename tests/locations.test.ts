import { describe, expect, it } from "vitest";

import {
  distanceKm,
  estimateMonthlyCalls,
  findNearestLocation,
  getLocation,
  LOCATIONS,
  MONGOLIA_BOUNDS,
} from "@/lib/locations";

/** IQAir Community plan limits. */
const MONTHLY_LIMIT = 10_000;
const DAILY_LIMIT = 500;

describe("location registry", () => {
  it("covers the capital and all 21 aimag centres exactly once", () => {
    expect(LOCATIONS).toHaveLength(22);
    expect(new Set(LOCATIONS.map((location) => location.slug)).size).toBe(22);
    expect(new Set(LOCATIONS.map((location) => location.iqair.state)).size).toBe(22);
  });

  it("uses URL-safe slugs and complete bilingual names", () => {
    for (const location of LOCATIONS) {
      expect(location.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(location.name.en.trim()).not.toBe("");
      expect(location.name.mn).toMatch(/[\u0400-\u04FF]/);
      expect(location.province.mn).toMatch(/[\u0400-\u04FF]/);
    }
  });

  it("places every reference point inside Mongolia", () => {
    for (const { coordinates, slug } of LOCATIONS) {
      expect(coordinates.lat, slug).toBeGreaterThan(MONGOLIA_BOUNDS.south);
      expect(coordinates.lat, slug).toBeLessThan(MONGOLIA_BOUNDS.north);
      expect(coordinates.lng, slug).toBeGreaterThan(MONGOLIA_BOUNDS.west);
      expect(coordinates.lng, slug).toBeLessThan(MONGOLIA_BOUNDS.east);
    }
  });

  it("puts the western aimags on Hovd time", () => {
    const hovd = LOCATIONS.filter((location) => location.timeZone === "Asia/Hovd").map((l) => l.slug);
    expect(hovd.sort()).toEqual(["altai", "khovd", "olgii", "ulaangom", "uliastai"]);
  });

  it("keeps worst-case usage well inside the free plan's quota", () => {
    const monthly = estimateMonthlyCalls();
    expect(monthly).toBeLessThanOrEqual(MONTHLY_LIMIT * 0.5);
    expect(monthly / 30).toBeLessThanOrEqual(DAILY_LIMIT * 0.35);
  });
});

describe("geography helpers", () => {
  it("measures Ulaanbaatar to Darkhan at roughly 200 km", () => {
    const km = distanceKm(getLocation("ulaanbaatar")!.coordinates, getLocation("darkhan")!.coordinates);
    expect(km).toBeGreaterThan(180);
    expect(km).toBeLessThan(230);
  });

  it("finds the nearest covered city", () => {
    expect(findNearestLocation({ lat: 47.92, lng: 106.92 })?.location.slug).toBe("ulaanbaatar");
    expect(findNearestLocation({ lat: 49.0, lng: 104.1 })?.location.slug).toBe("erdenet");
  });
});
