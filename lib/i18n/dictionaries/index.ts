import type { Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/dictionaries/en";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { mn } from "@/lib/i18n/dictionaries/mn";

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, mn };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
