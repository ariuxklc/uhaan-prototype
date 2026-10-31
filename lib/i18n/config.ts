export const LOCALES = ["mn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Mongolian first: the site is built for people living in Mongolia. */
export const DEFAULT_LOCALE: Locale = "mn";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const HTML_LANG: Record<Locale, string> = { mn: "mn", en: "en" };
