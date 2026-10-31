import { isLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";

/** Builds an in-site path for a locale, e.g. `href("mn", "/city/darkhan")`. */
export function href(locale: Locale, path = "/"): string {
  const normalized = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

/** Swaps the locale prefix of a pathname, keeping the rest of the path. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) {
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  }
  return href(target, pathname);
}
