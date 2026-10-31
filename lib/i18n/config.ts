export const LOCALES = ["mn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Mongolian first: the site is built for people living in Mongolia. */
export const DEFAULT_LOCALE: Locale = "mn";
export const LOCALE_COOKIE = "ut-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const HTML_LANG: Record<Locale, string> = { mn: "mn", en: "en" };

/**
 * Picks the best supported locale from an Accept-Language header, honouring
 * q-values. Falls back to Mongolian.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag = "", ...params] = entry.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
      return {
        language: tag.toLowerCase().split("-")[0] ?? "",
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { language } of ranked) {
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}
