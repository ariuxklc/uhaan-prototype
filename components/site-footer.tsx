import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { navItems } from "@/components/site-header";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 text-sm text-ink-3 sm:px-8 md:grid-cols-2">
        <div>
          <Link href={href(locale)} className="inline-flex items-center gap-2.5 text-ink">
            <BrandMark className="size-6" />
            <span className="font-semibold">{dict.brand.name}</span>
          </Link>
          <p className="mt-3 max-w-sm">{dict.join.founded}</p>
        </div>

        <div className="md:text-right">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
            {navItems(locale, dict).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-2 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 md:ml-auto md:max-w-md">
            {dict.footer.data}:{" "}
            <a href="https://www.iqair.com/" target="_blank" rel="noopener noreferrer" className="link text-ink-2">
              IQAir
            </a>
            . {dict.footer.reference} {dict.footer.official}{" "}
            <a href="https://agaar.gov.mn/web" target="_blank" rel="noopener noreferrer" className="link text-ink-2">
              agaar.gov.mn
            </a>{" "}
            {dict.footer.and}{" "}
            <a href="https://agaar.mn/" target="_blank" rel="noopener noreferrer" className="link text-ink-2">
              agaar.mn
            </a>
            . {dict.footer.nonprofit}
          </p>
        </div>
      </div>
    </footer>
  );
}
