import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AutoRefresh } from "@/components/auto-refresh";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitch } from "@/components/header-links";
import { ArrowLeftIcon, InfoIcon } from "@/components/icons";
import { MapView } from "@/components/map/map-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNetworkSnapshot } from "@/lib/air/snapshot";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";
import { buildMapProps, countQueued } from "@/lib/map-props";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  return {
    title: dict.meta.mapTitle,
    description: dict.meta.mapDescription,
    alternates: {
      canonical: `/${locale}/map`,
      languages: { mn: "/mn/map", en: "/en/map" },
    },
  };
}

/** The map on its own: the whole screen, a way back, and nothing else. */
export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const snapshot = await getNetworkSnapshot();
  const map = buildMapProps(snapshot, lang, dict);
  const otherLocale: Locale = lang === "mn" ? "en" : "mn";
  const infoPoints = map.stations.length > 0 ? [...dict.map.infoPoints, dict.map.infoMonitors] : dict.map.infoPoints;

  return (
    <main>
      <h1 className="sr-only">{dict.meta.mapTitle}</h1>
      <MapView
        variant="full"
        className="h-dvh"
        {...map}
        lead={
          <Link
            href={href(lang)}
            aria-label={dict.map.back}
            className="glass inline-flex h-10 items-center gap-2 rounded-full pl-3 pr-4 text-sm font-semibold"
          >
            <ArrowLeftIcon className="size-4 text-ink-3" />
            <BrandMark className="size-5" />
            <span className="hidden sm:inline">{dict.brand.name}</span>
          </Link>
        }
        actions={
          <>
            <details className="group relative">
              <summary
                aria-label={dict.map.info}
                title={dict.map.info}
                className="glass grid size-10 cursor-pointer list-none place-items-center rounded-full [&::-webkit-details-marker]:hidden"
              >
                <InfoIcon className="size-[1.125rem]" />
              </summary>
              <div className="glass absolute right-0 top-12 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-4 text-sm leading-relaxed text-ink-2">
                <p className="font-semibold text-ink">{dict.map.info}</p>
                <ul className="mt-2 space-y-2">
                  {infoPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link href={href(lang, "/data")} className="link mt-3 inline-block font-medium text-ink">
                  {dict.map.download}
                </Link>
              </div>
            </details>
            <LocaleSwitch
              target={otherLocale}
              label={dict.nav.switchLanguage}
              ariaLabel={dict.nav.switchLanguageLabel}
              className="glass !text-ink"
            />
            <ThemeToggle toDark={dict.nav.themeToDark} toLight={dict.nav.themeToLight} className="glass" />
          </>
        }
      />
      <AutoRefresh queuedCount={countQueued(snapshot)} renderedAt={snapshot.assembledAt} />
    </main>
  );
}
