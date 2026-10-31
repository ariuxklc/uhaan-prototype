"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const REFRESH_EVERY_MS = 5 * 60_000;
/**
 * While cities wait for their first reading, refresh a little slower than the
 * server's pace of one IQAir call per 20 s, so each refresh can add a city.
 * Thirty tries covers a completely cold start of all 22 cities.
 */
const QUEUED_RETRY_MS = 25_000;
const MAX_QUEUED_RETRIES = 30;

/**
 * Keeps an open page current without a reload: re-fetches the server render
 * every few minutes while the tab is visible, and sooner while some cities
 * are still waiting for their first reading. Cached data makes this cheap.
 */
export function AutoRefresh({
  queuedCount,
  renderedAt,
}: {
  queuedCount: number;
  /** Changes with every server render, so retries are re-armed after each refresh. */
  renderedAt: number;
}) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const queuedRetries = useRef(0);

  useEffect(() => {
    lastRefresh.current = Date.now();

    const refresh = () => {
      lastRefresh.current = Date.now();
      router.refresh();
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current >= REFRESH_EVERY_MS) {
        refresh();
      }
    }, 30_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current >= REFRESH_EVERY_MS) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let retry: number | undefined;
    if (queuedCount > 0 && queuedRetries.current < MAX_QUEUED_RETRIES) {
      retry = window.setTimeout(() => {
        queuedRetries.current += 1;
        refresh();
      }, QUEUED_RETRY_MS);
    }

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [queuedCount, renderedAt, router]);

  return null;
}
