import Link from "next/link";
import { lang } from "next/root-params";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";

export default async function NotFound() {
  const value = await lang();
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center px-5 sm:px-8">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-semibold">{dict.notFound.title}</h1>
      <Link href={href(locale)} className="button button-primary mt-8 self-start">
        {dict.notFound.back}
      </Link>
    </main>
  );
}
