"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@/components/icons";

/** Drift speed in CSS pixels per second: slow enough to read while it moves. */
const DRIFT_SPEED = 24;
/** Rest at either end before drifting back the other way. */
const END_REST_MS = 2500;
/** Rest after the row comes into view, and after the visitor scrolls it themselves. */
const ENTER_REST_MS = 1000;
const IDLE_REST_MS = 6000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * A horizontal row of cards that drifts slowly on its own and turns around at
 * each end. It holds still while the visitor hovers, focuses, swipes or
 * scrolls it, never moves for people who prefer reduced motion, and has a
 * pause button (WCAG 2.2.2). Previous/next buttons help mouse users. The row
 * bleeds to the screen edges but its first card lines up with the page content.
 */
export function Scroller({
  children,
  label,
  previousLabel,
  nextLabel,
  pauseLabel,
  playLabel,
}: {
  children: ReactNode;
  label: string;
  previousLabel: string;
  nextLabel: string;
  pauseLabel: string;
  playLabel: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const restUntil = useRef(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [overflows, setOverflows] = useState(false);
  const [stopped, setStopped] = useState(false);
  // Still until hydrated: the server can't know the visitor's preference.
  const reduceMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  const canDrift = !reduceMotion && overflows;
  const drifting = canDrift && !stopped;

  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const start = element.scrollLeft <= 4;
    const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
    setEdges((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
    setOverflows(element.scrollWidth > element.clientWidth + 4);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [update]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !drifting) return;

    const canHover = window.matchMedia("(hover: hover)");
    let frame = 0;
    let last = performance.now();
    let visible = false;
    let direction = 1;
    // Our own position: browsers round scrollLeft, which would stall a slow drift.
    let position = element.scrollLeft;
    let synced = true;

    const rest = (ms: number) => {
      restUntil.current = Math.max(restUntil.current, performance.now() + ms);
    };
    const onInteract = () => rest(IDLE_REST_MS);
    const interactions = ["wheel", "pointerdown", "touchstart", "keydown"] as const;
    for (const type of interactions) element.addEventListener(type, onInteract, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      const nowVisible = entry?.isIntersecting ?? false;
      if (nowVisible && !visible) rest(ENTER_REST_MS);
      visible = nowVisible;
    });
    observer.observe(element);

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const elapsed = Math.min(now - last, 100);
      last = now;
      const holding =
        !visible ||
        now < restUntil.current ||
        element.matches(":focus-within") ||
        (canHover.matches && element.matches(":hover"));
      if (holding) {
        synced = false;
        return;
      }
      if (!synced) {
        position = element.scrollLeft;
        synced = true;
      }
      const max = element.scrollWidth - element.clientWidth;
      if (max <= 0) return;
      position += (direction * DRIFT_SPEED * elapsed) / 1000;
      if (position >= max || position <= 0) {
        position = Math.min(max, Math.max(0, position));
        direction = position >= max ? -1 : 1;
        rest(END_REST_MS);
      }
      element.scrollLeft = position;
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      for (const type of interactions) element.removeEventListener(type, onInteract);
    };
  }, [drifting]);

  const scroll = (direction: 1 | -1) => {
    const element = ref.current;
    if (!element) return;
    restUntil.current = performance.now() + IDLE_REST_MS;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  };

  const buttonClass =
    "grid size-10 place-items-center rounded-full text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-opacity hover:bg-surface disabled:opacity-30";

  return (
    <div>
      <div className="mx-auto flex min-h-10 w-full max-w-6xl justify-end gap-2 px-5 sm:px-8">
        {canDrift && (
          <button
            type="button"
            onClick={() => setStopped((value) => !value)}
            aria-label={stopped ? playLabel : pauseLabel}
            className={buttonClass}
          >
            {stopped ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={edges.start}
          aria-label={previousLabel}
          className={`${buttonClass} max-sm:hidden`}
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={edges.end}
          aria-label={nextLabel}
          className={`${buttonClass} max-sm:hidden`}
        >
          <ArrowRightIcon className="size-4" />
        </button>
      </div>
      <ul
        ref={ref}
        aria-label={label}
        // Snapping would fight the drift, so cards only snap while it is off.
        className={`mt-6 flex gap-4 overflow-x-auto px-[max(1.25rem,calc((100vw-72rem)/2+2rem))] pb-4 [scroll-padding-inline:max(1.25rem,calc((100vw-72rem)/2+2rem))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${drifting ? "" : "snap-x snap-mandatory"}`}
      >
        {children}
      </ul>
    </div>
  );
}
