"use client";

import { useEffect, useRef } from "react";

import { AQI_HEX } from "@/lib/aqi";
import type { AqiCategoryId } from "@/lib/aqi";

interface Particle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  phase: number;
  tinted: boolean;
}

const NEUTRAL = [128, 128, 122] as const;
const MAX_PIXEL_RATIO = 2;

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** More pollution, more particles: roughly what a smoggy day looks like. */
function particleCount(aqi: number | null, area: number): number {
  const perMegapixel = 60 + (aqi ?? 40) * 1.5;
  return Math.round(Math.min(420, Math.max(40, (perMegapixel * area) / 1_000_000)));
}

/**
 * A field of slowly drifting particles behind the hero, coloured by the
 * capital's current AQI band and denser when the air is worse. Decorative and
 * hidden from assistive technology; still for visitors who prefer less motion.
 */
export function AirParticles({
  aqi,
  band,
  className = "",
}: {
  aqi: number | null;
  band: AqiCategoryId | "none";
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tint = band === "none" ? NEUTRAL : rgb(AQI_HEX[band]);
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame: number | null = null;
    let visible = true;

    const seed = () => {
      const count = particleCount(aqi, width * height);
      particles = Array.from({ length: count }, () => {
        const large = Math.random() < 0.12;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: large ? 2.6 + Math.random() * 2 : 1 + Math.random() * 1.6,
          alpha: 0.22 + Math.random() * 0.4,
          speed: 0.08 + Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          tinted: Math.random() < 0.7,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      seed();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const [r, g, b] = particle.tinted ? tint : NEUTRAL;
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
        if (!reduceMotion) {
          // A light breeze to the right, with a gentle wander.
          particle.x += particle.speed + Math.sin(time / 1800 + particle.phase) * 0.12;
          particle.y += Math.cos(time / 2200 + particle.phase) * 0.14;
          if (particle.x > width + 4) particle.x = -4;
          if (particle.y > height + 4) particle.y = -4;
          if (particle.y < -4) particle.y = height + 4;
        }
      }
    };

    const loop = (time: number) => {
      draw(time);
      frame = visible && document.visibilityState === "visible" ? window.requestAnimationFrame(loop) : null;
    };

    const start = () => {
      if (reduceMotion) {
        draw(0);
        return;
      }
      if (frame === null) frame = window.requestAnimationFrame(loop);
    };

    resize();
    start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    resizeObserver.observe(canvas);

    // Pause when the hero is off screen or the tab is hidden.
    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
    });
    intersection.observe(canvas);
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [aqi, band]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
