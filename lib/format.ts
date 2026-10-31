import type { Locale } from "@/lib/i18n/config";

/**
 * Text helpers that produce identical output on the server and in the
 * browser: relative-time wording comes from our own strings rather than the
 * runtime's locale data (Mongolian coverage varies between browsers).
 */

export interface RelativeTimeStrings {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  inFuture: string;
}

/** Interpolates `{name}` placeholders. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function formatRelativeTime(iso: string, now: number, strings: RelativeTimeStrings): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < -10) return strings.inFuture;
  if (minutes < 1) return strings.justNow;
  if (minutes < 60) return interpolate(strings.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return interpolate(strings.hoursAgo, { n: hours });
  return interpolate(strings.daysAgo, { n: Math.floor(hours / 24) });
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-08" → "Aug 2026" / "2026 оны 8-р сар"; a bare year stays a year. */
export function formatMonth(date: string, locale: Locale): string {
  const [year = "", monthText] = date.split("-");
  const month = Number(monthText);
  if (!monthText || !Number.isInteger(month) || month < 1 || month > 12) return year;
  return locale === "mn" ? `${year} оны ${month}-р сар` : `${EN_MONTHS[month - 1]} ${year}`;
}

/** Ulaanbaatar is UTC+8 all year (no daylight saving since 2017). */
const ULAANBAATAR_OFFSET_MS = 8 * 60 * 60_000;

/** An ISO time → its day in Ulaanbaatar: "2 Nov 2026" / "2026.11.02". */
export function formatDay(iso: string, locale: Locale): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const local = new Date(time + ULAANBAATAR_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;
  const day = local.getUTCDate();
  return locale === "mn"
    ? `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`
    : `${day} ${EN_MONTHS[month - 1]} ${year}`;
}
