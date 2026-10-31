import { describe, expect, it } from "vitest";

import { DailyCap, SlidingWindowLimiter } from "@/lib/iqair/rate-limiter";

function clock(start = 0) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe("SlidingWindowLimiter", () => {
  it("allows up to the limit within a window", () => {
    const time = clock();
    const limiter = new SlidingWindowLimiter(4, 60_000, time.now);
    expect([1, 2, 3, 4, 5].map(() => limiter.tryAcquire())).toEqual([true, true, true, true, false]);
  });

  it("frees capacity as calls leave the window", () => {
    const time = clock();
    const limiter = new SlidingWindowLimiter(2, 60_000, time.now);
    limiter.tryAcquire();
    time.advance(30_000);
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);
    time.advance(30_000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("refuses all calls while paused", () => {
    const time = clock();
    const limiter = new SlidingWindowLimiter(4, 60_000, time.now);
    limiter.pause(65_000);
    expect(limiter.tryAcquire()).toBe(false);
    time.advance(64_999);
    expect(limiter.tryAcquire()).toBe(false);
    time.advance(1);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("does not shorten an existing pause", () => {
    const time = clock();
    const limiter = new SlidingWindowLimiter(4, 60_000, time.now);
    limiter.pause(60_000);
    limiter.pause(1_000);
    time.advance(2_000);
    expect(limiter.tryAcquire()).toBe(false);
  });
});

describe("DailyCap", () => {
  it("stops at the limit and resets on the next UTC day", () => {
    const time = clock(Date.parse("2026-10-10T08:00:00Z"));
    const cap = new DailyCap(2, time.now);
    expect(cap.hasRemaining()).toBe(true);
    cap.consume();
    cap.consume();
    expect(cap.hasRemaining()).toBe(false);
    time.advance(16 * 60 * 60 * 1000); // past midnight UTC
    expect(cap.hasRemaining()).toBe(true);
  });
});
