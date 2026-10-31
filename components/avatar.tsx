import { PersonPortrait } from "@/components/person-portrait";
import type { Person } from "@/content/model";
import type { Locale } from "@/lib/i18n/config";

/** A small round face. Shows nothing for someone without a photo. */
export function Avatar({
  person,
  locale,
  className = "size-8",
}: {
  person: Person;
  locale: Locale;
  className?: string;
}) {
  if (!person.photo) return null;
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
      <PersonPortrait person={person} locale={locale} sizes="96px" />
    </span>
  );
}
