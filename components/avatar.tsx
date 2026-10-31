import { PersonPortrait } from "@/components/person-portrait";
import type { Person } from "@/content/model";
import type { Locale } from "@/lib/i18n/config";
import type { Hue } from "@/lib/palette";

/** A small round face: photo if there is one, otherwise the person's initial. */
export function Avatar({
  person,
  hue,
  locale,
  className = "size-8",
  initialClassName = "text-sm",
}: {
  person: Person;
  hue: Hue;
  locale: Locale;
  className?: string;
  initialClassName?: string;
}) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
      <PersonPortrait person={person} hue={hue} locale={locale} sizes="96px" initialClassName={initialClassName} />
    </span>
  );
}
