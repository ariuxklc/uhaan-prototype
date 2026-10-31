import { notFound } from "next/navigation";

import { SiteAtmosphere } from "@/components/site-atmosphere";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-3 z-50 -translate-y-24 rounded-full bg-ink px-4 py-2 text-sm text-bg transition-transform focus:translate-y-0"
      >
        {dict.nav.skipToContent}
      </a>
      <SiteAtmosphere />
      <SiteHeader locale={lang} dict={dict} />
      <main id="main">{children}</main>
      <SiteFooter locale={lang} dict={dict} />
    </>
  );
}
