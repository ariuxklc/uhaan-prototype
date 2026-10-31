import Image from "next/image";

import { localize } from "@/content/model";
import type { School } from "@/content/model";
import type { Locale } from "@/lib/i18n/config";
import type { Hue } from "@/lib/palette";

/** A school's logo, or a monogram tile in the school's colour. */
export function SchoolBadge({
  school,
  hue,
  locale,
  className = "size-10 rounded-xl text-base",
}: {
  school: School;
  /** Colour of the monogram tile; see `schoolHue`. */
  hue: Hue;
  locale: Locale;
  className?: string;
}) {
  if (school.logo) {
    return (
      <span className={`relative block shrink-0 overflow-hidden bg-surface ${className}`}>
        <Image src={school.logo} alt="" fill sizes="64px" className="object-contain p-1" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      data-hue={hue}
      className={`hue-tile grid shrink-0 place-items-center font-semibold ${className}`}
    >
      {localize(school.name, locale).charAt(0)}
    </span>
  );
}
