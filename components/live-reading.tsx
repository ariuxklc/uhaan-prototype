import Link from "next/link";

import { RelativeTime } from "@/components/relative-time";
import type { CityEntry } from "@/lib/air/snapshot";
import { getAqiCategory } from "@/lib/aqi";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";

/** The capital's current reading, small and quiet, linking to the map. */
export function LiveReading({
  entry,
  locale,
  dict,
  renderedAt,
}: {
  entry: CityEntry;
  locale: Locale;
  dict: Dictionary;
  renderedAt: number;
}) {
  const reading = entry.status.state === "ok" ? entry.status.reading : null;
  const category = getAqiCategory(reading?.aqiUs);
  const band = category?.id ?? "none";

  return (
    <Link
      href={href(locale, "/map")}
      data-aqi={band}
      className="group glass inline-flex flex-col gap-1.5 rounded-2xl px-5 py-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="flex items-center gap-2 text-[0.8125rem] text-ink-3">
        <span aria-hidden="true" className={`band-fill size-2 rounded-full ${reading ? "live-dot" : ""}`} />
        {dict.live.label}
      </span>
      <span className="flex items-baseline gap-2.5">
        <span className="text-4xl font-semibold tabular-nums tracking-[-0.03em] text-ink">
          {reading ? reading.aqiUs : "—"}
        </span>
        <span className="band-ink text-[0.9375rem] font-medium">
          {category ? dict.aqi.categories[category.id].name : dict.status.noReading}
        </span>
      </span>
      <span className="text-xs text-ink-3">
        {dict.aqi.unit}
        {reading && (
          <>
            {" · "}
            <RelativeTime iso={reading.observedAt} renderedAt={renderedAt} strings={dict.time} />
          </>
        )}
        {" · IQAir"}
      </span>
    </Link>
  );
}
