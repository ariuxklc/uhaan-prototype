"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { MapVariant, NetworkMapLabels } from "@/components/map/network-map";
import { AQI_CATEGORIES } from "@/lib/aqi";
import type { AqiCategoryId } from "@/lib/aqi";
import type { CitySummary, StationSummary } from "@/lib/view-model";

// Leaflet touches `window` on import, so it only ever loads in the browser.
const NetworkMap = dynamic(() => import("@/components/map/network-map"), { ssr: false });

export interface MapViewProps {
  variant: MapVariant;
  cities: CitySummary[];
  /** School monitors with a location and at least one reading. */
  stations: StationSummary[];
  labels: NetworkMapLabels;
  /** `stations` is the legend line for school monitors, shown only when there are any. */
  legend: { title: string; names: Record<AqiCategoryId, string>; stations: string | null };
  loadingLabel: string;
  locateFailedLabel: string;
  /** A short message when data is incomplete or not live (queued, sample, unconfigured). */
  status?: string | null;
  /** Top-left overlay. */
  lead?: ReactNode;
  /** Top-right overlay. */
  actions?: ReactNode;
  className?: string;
}

function Legend({ title, names, stations }: MapViewProps["legend"]) {
  return (
    <div className="glass rounded-xl px-3 pb-2 pt-1.5">
      <p className="text-[0.6875rem] font-medium text-ink-3">{title}</p>
      <ol className="mt-1 flex gap-0.5" aria-label={title}>
        {AQI_CATEGORIES.map((band) => (
          <li key={band.id} data-aqi={band.id} title={names[band.id]} className="flex flex-col">
            <span aria-hidden="true" className="band-fill block h-1.5 w-7 rounded-sm sm:w-9" />
            <span aria-hidden="true" className="mt-1 text-[0.625rem] tabular-nums text-ink-3">
              {band.min}
            </span>
            <span className="sr-only">
              {Number.isFinite(band.max) ? `${band.min}–${band.max}` : `${band.min}+`}: {names[band.id]}
            </span>
          </li>
        ))}
      </ol>
      {stations && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.6875rem] text-ink-3">
          <span aria-hidden="true" className="block size-2.5 rounded-[3px] bg-surface shadow-[0_0_0_1.5px_var(--accent)]" />
          {stations}
        </p>
      )}
    </div>
  );
}

/**
 * The map with nothing around it: full-bleed, with a few quiet floating
 * controls. The embedded variant waits until it is near the viewport before
 * loading Leaflet.
 */
export function MapView({
  variant,
  cities,
  stations,
  labels,
  legend,
  loadingLabel,
  locateFailedLabel,
  status,
  lead,
  actions,
  className = "",
}: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(variant === "full");
  const [locateFailed, setLocateFailed] = useState(false);

  useEffect(() => {
    if (variant === "full") return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [variant]);

  useEffect(() => {
    if (!locateFailed) return;
    const timer = window.setTimeout(() => setLocateFailed(false), 4_000);
    return () => window.clearTimeout(timer);
  }, [locateFailed]);

  const onLocateFailed = useCallback(() => setLocateFailed(true), []);
  const notice = locateFailed ? locateFailedLabel : status;

  return (
    <div ref={ref} className={`relative overflow-hidden bg-bg ${className}`}>
      <p className="absolute inset-0 grid place-items-center text-sm text-ink-3">{loadingLabel}</p>

      <div className="absolute inset-0 isolate">
        {isNear && (
          <NetworkMap
            cities={cities}
            stations={stations}
            labels={labels}
            variant={variant}
            onLocateFailed={onLocateFailed}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto min-w-0">{lead}</div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      {notice && (
        <p
          role="status"
          className="glass pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8125rem] text-ink sm:top-4"
        >
          {notice}
        </p>
      )}

      {/* Raised clear of the map attribution, which runs along the bottom edge. */}
      <div className="pointer-events-none absolute bottom-7 left-3 z-10 sm:bottom-4 sm:left-4">
        <div className="pointer-events-auto">
          <Legend {...legend} />
        </div>
      </div>
    </div>
  );
}
