import type { Metadata } from "next";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Title, description and language alternates for an inner page. */
export async function pageMetadata(
  params: Promise<{ lang: string }>,
  path: string,
  pick: (dict: Dictionary) => { title: string; description: string },
): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const { title, description } = pick(getDictionary(locale));
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { mn: `/mn${path}`, en: `/en${path}` },
    },
  };
}
