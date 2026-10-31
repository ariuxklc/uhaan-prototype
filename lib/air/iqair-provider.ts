import "server-only";

import { unstable_cache } from "next/cache";

import type { AirDataProvider, AirReading, LocationStatus, ReadingSource } from "@/lib/air/types";
import { fetchIqairCity } from "@/lib/iqair/client";
import { IqairError } from "@/lib/iqair/errors";
import { DailyCap, SlidingWindowLimiter } from "@/lib/iqair/rate-limiter";
import { getLocation, LOCATIONS } from "@/lib/locations";

const IQAIR_SOURCE: ReadingSource = {
  provider: "iqair",
  resolution: "city",
  attribution: "IQAir",
  attributionUrl: "https://www.iqair.com/mongolia",
};

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

/**
 * The free plan answers "Too Many Requests" to any call made within roughly
 * 12 seconds of the previous one (measured; see docs/ARCHITECTURE.md). Each
 * server process waits at least 20 seconds between calls (3 a minute), which
 * leaves room for a second instance without tripping the 5-a-minute limit.
 */
const limiter = new SlidingWindowLimiter(1, 20 * SECOND);

/**
 * Safety net: the refresh tiers need at most ~160 calls a day, so a process
 * that has made 300 today is misbehaving and stops calling until tomorrow
 * (the plan allows 500 a day).
 */
const dailyCap = new DailyCap(300);

const PAUSE_AFTER = {
  /** Asked to slow down. */
  pace: 30 * SECOND,
  /** A daily or monthly quota is spent. */
  quota: 30 * MINUTE,
  /** Bad or expired key: nothing will work until someone fixes it. */
  configuration: 15 * MINUTE,
} as const;

/**
 * Failed cities aren't cached, so without a backoff a city that keeps failing
 * would be retried on every request. Retries back off from 5 minutes to 2 hours.
 */
const FAILURE_BACKOFF = { initial: 5 * MINUTE, max: 2 * 60 * MINUTE } as const;
const failures = new Map<string, { retryAt: number; delay: number }>();

/** Concurrent requests for the same city share one upstream call. */
const inFlight = new Map<string, Promise<AirReading>>();

function recordFailure(slug: string) {
  const previous = failures.get(slug);
  const delay = previous ? Math.min(previous.delay * 2, FAILURE_BACKOFF.max) : FAILURE_BACKOFF.initial;
  failures.set(slug, { retryAt: Date.now() + delay, delay });
}

async function requestReading(slug: string): Promise<AirReading> {
  const location = getLocation(slug);
  if (!location) throw new IqairError("not-found", `Unknown location "${slug}".`);

  const apiKey = process.env.IQAIR_API_KEY?.trim();
  if (!apiKey) throw new IqairError("configuration", "IQAIR_API_KEY is not set.");

  const failure = failures.get(slug);
  if (failure && Date.now() < failure.retryAt) {
    throw new IqairError("upstream", `Backing off ${slug} after earlier failures.`, { deferred: true });
  }

  // Thrown inside the cache wrapper: a stale cached reading keeps being served
  // and the refresh is retried on a later request.
  if (!dailyCap.hasRemaining() || !limiter.tryAcquire()) {
    throw new IqairError("rate-limited", `Deferred ${slug}: pacing IQAir calls.`, { deferred: true });
  }
  dailyCap.consume();

  try {
    const observation = await fetchIqairCity(location, apiKey);
    failures.delete(slug);
    return {
      ...observation,
      locationSlug: slug,
      source: IQAIR_SOURCE,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof IqairError) {
      if (error.kind === "rate-limited") {
        limiter.pause(error.quotaExhausted ? PAUSE_AFTER.quota : PAUSE_AFTER.pace);
        if (error.quotaExhausted) console.warn(`[iqair] quota reached; pausing calls (${error.message})`);
      } else if (error.kind === "configuration") {
        limiter.pause(PAUSE_AFTER.configuration);
      } else {
        recordFailure(slug);
      }
    } else {
      recordFailure(slug);
    }
    throw error;
  }
}

function loadReading(slug: string): Promise<AirReading> {
  const pending = inFlight.get(slug);
  if (pending) return pending;

  const request = requestReading(slug).finally(() => inFlight.delete(slug));
  inFlight.set(slug, request);
  return request;
}

/**
 * Bump when the shape of `AirReading` changes, so readings cached by an older
 * build are not served to newer code.
 */
const CACHE_VERSION = "iqair-city-v1";

/**
 * `unstable_cache` keys include the callback's source text, which minification
 * can change from one build to the next and would empty the cache on every
 * deploy. A bound function always stringifies as "function () { [native
 * code] }", so the key depends only on the key parts and the slug argument.
 */
const stableLoadReading = loadReading.bind(null);

/**
 * One persistent cache entry per city, each with its own refresh interval.
 * Entries are shared across requests (and instances, on platforms with a
 * shared data cache), which is what keeps the site within the monthly quota.
 */
const cachedLoaders = new Map(
  LOCATIONS.map((location) => [
    location.slug,
    unstable_cache(stableLoadReading, [CACHE_VERSION], {
      revalidate: location.refreshMinutes * 60,
      tags: ["iqair", `iqair:${location.slug}`],
    }),
  ]),
);

const reportedConfigurationErrors = new Set<string>();

function toStatus(error: unknown, slug: string): LocationStatus {
  if (error instanceof IqairError) {
    switch (error.kind) {
      case "rate-limited":
        return { state: "unavailable", reason: "queued" };
      case "not-found":
        console.warn(`[iqair] ${slug}: ${error.message}`);
        return { state: "unavailable", reason: "not-found" };
      case "configuration":
        if (!reportedConfigurationErrors.has(error.message)) {
          reportedConfigurationErrors.add(error.message);
          console.error(`[iqair] configuration problem: ${error.message}`);
        }
        return { state: "unavailable", reason: "configuration" };
      case "upstream":
        if (!error.deferred) console.warn(`[iqair] ${slug}: ${error.message}`);
        return { state: "unavailable", reason: "upstream" };
    }
  }
  console.error(`[iqair] ${slug}: unexpected error`, error);
  return { state: "unavailable", reason: "upstream" };
}

export const iqairProvider: AirDataProvider = {
  id: "iqair",
  async getLatest(slug) {
    const loader = cachedLoaders.get(slug);
    if (!loader) return { state: "unavailable", reason: "not-found" };
    try {
      return { state: "ok", reading: await loader(slug) };
    } catch (error) {
      return toStatus(error, slug);
    }
  },
};
