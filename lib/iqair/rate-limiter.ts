/**
 * Sliding-window limiter for outgoing IQAir calls within one server process.
 *
 * The free plan allows 5 calls a minute. We stay one call below that per
 * process, and pause entirely for a while after IQAir reports the limit was
 * reached (another instance may have spent the budget).
 */
export class SlidingWindowLimiter {
  private readonly calls: number[] = [];
  private pausedUntil = 0;

  constructor(
    private readonly maxCalls: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a call and returns true if one is allowed right now. */
  tryAcquire(): boolean {
    const now = this.now();
    if (now < this.pausedUntil) return false;

    while (this.calls.length > 0 && now - this.calls[0]! >= this.windowMs) {
      this.calls.shift();
    }
    if (this.calls.length >= this.maxCalls) return false;

    this.calls.push(now);
    return true;
  }

  /** Blocks all calls for `durationMs`, e.g. after an upstream limit error. */
  pause(durationMs: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.now() + durationMs);
  }
}

/**
 * A hard ceiling on calls per UTC day within one server process: a safety net
 * so that no bug or traffic spike can burn through the plan's daily quota.
 */
export class DailyCap {
  private day = "";
  private used = 0;

  constructor(
    private readonly limit: number,
    private readonly now: () => number = Date.now,
  ) {}

  private roll() {
    const today = new Date(this.now()).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
    }
  }

  hasRemaining(): boolean {
    this.roll();
    return this.used < this.limit;
  }

  /** Records one call. Call only after deciding to make the request. */
  consume(): void {
    this.roll();
    this.used += 1;
  }
}
