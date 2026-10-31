"use client";

import { useEffect, useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/icons";

const THEME_STORAGE_KEY = "ut-theme";

type Theme = "light" | "dark";

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the
 * wrong theme. An explicit choice is remembered; otherwise the OS decides.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=s==="dark"||s==="light"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){}})();`;

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

/** The `data-theme` attribute on <html> is the single source of truth. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle({
  toDark,
  toLight,
  className = "",
}: {
  toDark: string;
  toLight: string;
  className?: string;
}) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);

  // Follow the OS setting until the visitor makes an explicit choice.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (!readStoredTheme()) {
        document.documentElement.dataset.theme = event.matches ? "dark" : "light";
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the switch still applies.
    }
  }

  const label = theme === "dark" ? toLight : toDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      {/* Icons follow the attribute set by the init script, so they are right before hydration. */}
      <SunIcon className="hidden size-5 dark:block" />
      <MoonIcon className="block size-5 dark:hidden" />
    </button>
  );
}
