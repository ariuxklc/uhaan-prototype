import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitch } from "@/components/header-links";
import { SiteNav } from "@/components/site-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";

export function navItems(locale: Locale, dict: Dictionary) {
  return [
    { href: href(locale, "/projects"), label: dict.nav.projects },
    { href: href(locale, "/schools"), label: dict.nav.schools },
    { href: href(locale, "/team"), label: dict.nav.team },
    { href: href(locale, "/updates"), label: dict.nav.updates },
    { href: href(locale, "/data"), label: dict.nav.data },
    { href: href(locale, "/map"), label: dict.nav.map },
  ];
}

/** Sits over the top of each page: the name, the sections, two switches. */
export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const otherLocale: Locale = locale === "mn" ? "en" : "mn";

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center gap-1 px-5 sm:h-20 sm:px-8">
        <Link href={href(locale)} className="mr-auto flex items-center gap-2.5">
          <BrandMark className="size-7 shrink-0 text-ink" />
          <span className="whitespace-nowrap text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {dict.brand.name}
          </span>
        </Link>

        <SiteNav items={navItems(locale, dict)} label={dict.nav.primary} menuLabel={dict.nav.menu} />

        <LocaleSwitch
          target={otherLocale}
          label={dict.nav.switchLanguage}
          ariaLabel={dict.nav.switchLanguageLabel}
        />
        <ThemeToggle toDark={dict.nav.themeToDark} toLight={dict.nav.themeToLight} />
      </div>
    </header>
  );
}
