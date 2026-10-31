"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/format";
import type { RelativeTimeStrings } from "@/lib/format";

/**
 * "12 min ago", kept current while the page is open. The first render uses
 * the server's clock (`renderedAt`), so hydration matches; afterwards the
 * browser's clock takes over.
 */
export function RelativeTime({
  iso,
  renderedAt,
  strings,
  className,
}: {
  iso: string;
  renderedAt: number;
  strings: RelativeTimeStrings;
  className?: string;
}) {
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <time dateTime={iso} className={className}>
      {formatRelativeTime(iso, now, strings)}
    </time>
  );
}
