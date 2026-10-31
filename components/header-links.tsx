"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { switchLocalePath } from "@/lib/i18n/routes";

export function LocaleSwitch({
  target,
  label,
  ariaLabel,
  className = "",
}: {
  target: Locale;
  label: string;
  ariaLabel: string;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={switchLocalePath(pathname, target)}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      prefetch={false}
      className={`inline-flex h-10 items-center rounded-full px-3 text-sm text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      {label}
    </Link>
  );
}
