import Image from "next/image";

import { localize } from "@/content/model";
import type { Person } from "@/content/model";
import type { Locale } from "@/lib/i18n/config";

/**
 * A person's photo, or nothing until there is one. Fills its parent; the
 * parent sets size and shape.
 */
export function PersonPortrait({ person, locale, sizes }: { person: Person; locale: Locale; sizes: string }) {
  if (!person.photo) return null;
  return (
    <Image
      src={person.photo}
      alt={localize(person.name, locale)}
      fill
      sizes={sizes}
      className="object-cover"
    />
  );
}
