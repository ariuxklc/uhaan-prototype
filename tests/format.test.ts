import { describe, expect, it } from "vitest";

import { formatRelativeTime, interpolate } from "@/lib/format";
import { getFreshness } from "@/lib/freshness";
import { en } from "@/lib/i18n/dictionaries/en";
import { mn } from "@/lib/i18n/dictionaries/mn";

const ISO = "2026-10-09T15:00:00.000Z";
const at = (minutes: number) => Date.parse(ISO) + minutes * 60_000;

describe("formatRelativeTime", () => {
  it("describes elapsed time in both languages", () => {
    expect(formatRelativeTime(ISO, at(0), en.time)).toBe("just now");
    expect(formatRelativeTime(ISO, at(12), en.time)).toBe("12 min ago");
    expect(formatRelativeTime(ISO, at(12), mn.time)).toBe("12 мин өмнө");
    expect(formatRelativeTime(ISO, at(185), en.time)).toBe("3 h ago");
    expect(formatRelativeTime(ISO, at(185), mn.time)).toBe("3 цагийн өмнө");
    expect(formatRelativeTime(ISO, at(60 * 72), en.time)).toBe("3 days ago");
    expect(formatRelativeTime(ISO, at(-30), en.time)).toBe(en.time.inFuture);
  });

  it("returns nothing for an unparseable timestamp", () => {
    expect(formatRelativeTime("not a date", at(0), en.time)).toBe("");
  });
});

describe("getFreshness", () => {
  it.each([
    [10, "live"],
    [90, "live"],
    [91, "recent"],
    [240, "recent"],
    [241, "stale"],
    [24 * 60, "stale"],
    [24 * 60 + 1, "outdated"],
    [-5, "live"],
    [-60, "unknown"],
  ])("a reading %i minutes old is %s", (minutes, expected) => {
    expect(getFreshness(ISO, at(minutes))).toBe(expected);
  });

  it("is unknown for unparseable timestamps", () => {
    expect(getFreshness("garbage", Date.now())).toBe("unknown");
  });
});

describe("interpolate", () => {
  it("fills named placeholders and leaves unknown ones", () => {
    expect(interpolate("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});
