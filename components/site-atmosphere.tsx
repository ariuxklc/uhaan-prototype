"use client";

import { useEffect, useRef, useState } from "react";

import { AirParticles } from "@/components/air-particles";
import { AQI_CATEGORY_IDS, isValidAqi } from "@/lib/aqi";
import type { AqiCategoryId } from "@/lib/aqi";

type Band = AqiCategoryId | "none";

/** How quiet the backdrop gets at the bottom of the page (0 = gone, 1 = unchanged). */
const FLOOR = 0.35;

function isBand(value: unknown): value is Band {
  return value === "none" || (AQI_CATEGORY_IDS as readonly unknown[]).includes(value);
}

/**
 * The air behind every page: a sky tinted by Ulaanbaatar's current reading and
 * particles as dense as the air is dirty. It stays fixed to the screen and
 * fades as the visitor scrolls further down, so content always leads.
 */
export function SiteAtmosphere() {
  const layer = useRef<HTMLDivElement>(null);
  const [air, setAir] = useState<{ aqi: number | null; band: Band }>({ aqi: null, band: "none" });

  // One small, CDN-cached request; the layout keeps this mounted across pages.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/air/capital", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (!data || typeof data !== "object") return;
        const { aqi, band } = data as { aqi?: unknown; band?: unknown };
        if (isBand(band)) setAir({ aqi: isValidAqi(aqi) ? aqi : null, band });
      })
      .catch(() => {
        // Offline or aborted: the neutral sky is a fine fallback.
      });
    return () => controller.abort();
  }, []);

  // Fade with scroll depth.
  useEffect(() => {
    let frame: number | null = null;
    const apply = () => {
      frame = null;
      const element = layer.current;
      if (!element) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const progress = room > 0 ? Math.min(1, window.scrollY / room) : 0;
      element.style.opacity = String(1 - (1 - FLOOR) * progress);
    };
    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={layer} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div data-sky={air.band} className="sky absolute inset-0" />
      <AirParticles
        aqi={air.aqi}
        band={air.band}
        className="absolute inset-0 size-full [mask-image:radial-gradient(150%_130%_at_100%_0%,black_35%,transparent_82%)]"
      />
    </div>
  );
}
