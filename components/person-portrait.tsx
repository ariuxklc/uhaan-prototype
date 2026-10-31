import Image from "next/image";

import { localize } from "@/content/model";
import type { Person } from "@/content/model";
import type { Locale } from "@/lib/i18n/config";
import type { Hue } from "@/lib/palette";

/** First letter of the given name: first word in English, last word in Mongolian. */
function personInitial(person: Person, locale: Locale): string {
  const words = localize(person.name, locale).split(" ");
  const given = locale === "mn" ? words[words.length - 1] : words[0];
  return given?.charAt(0) ?? "";
}

/**
 * A person's photo, or, until there is one, a soft card in their colour with
 * their initial. Fills its parent; the parent sets size and shape.
 */
export function PersonPortrait({
  person,
  hue,
  locale,
  sizes,
  initialClassName = "text-6xl",
}: {
  person: Person;
  /** Colour of the placeholder card; see `personHue`. */
  hue: Hue;
  locale: Locale;
  sizes: string;
  initialClassName?: string;
}) {
  if (person.photo) {
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
  return (
    <div
      data-hue={hue}
      aria-hidden="true"
      className="hue-portrait absolute inset-0 grid place-items-center"
    >
      <span className={`font-semibold tracking-[-0.04em] ${initialClassName}`}>{personInitial(person, locale)}</span>
    </div>
  );
}
