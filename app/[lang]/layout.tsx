import "@/app/globals.css";

import type { Metadata, Viewport } from "next";
import { Geologica } from "next/font/google";
import { notFound } from "next/navigation";

import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import { DEFAULT_LOCALE, HTML_LANG, isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteUrl } from "@/lib/site";

// One calm family for everything. Mongolian needs Ө and Ү (U+04E8, U+04AE);
// a font listing a "cyrillic-ext" subset doesn't guarantee them, so any
// replacement must be checked glyph by glyph. Geologica has both.
const sans = Geologica({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-geologica",
  display: "swap",
});

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121315" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return {
    metadataBase: getSiteUrl(),
    title: { default: dict.meta.title, template: `%s · ${dict.brand.name}` },
    description: dict.meta.description,
    applicationName: dict.brand.name,
    alternates: {
      canonical: `/${locale}`,
      languages: { mn: "/mn", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: dict.brand.name,
      locale: locale === "mn" ? "mn_MN" : "en_GB",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={HTML_LANG[lang]} data-theme="light" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
