import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { ArrowRightIcon } from "@/components/icons";
import { PageIntro } from "@/components/page-intro";
import { localize } from "@/content/model";
import type { Person } from "@/content/model";
import { getContent } from "@/lib/content";
import type { SiteContent } from "@/lib/content";
import { findSchool, personHue, personProjects } from "@/lib/content/relations";
import { isLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/i18n/metadata";
import { href } from "@/lib/i18n/routes";
import { CONTACT_EMAIL } from "@/lib/site";

type Props = { params: Promise<{ lang: string }> };

export function generateMetadata({ params }: Props) {
  return pageMetadata(params, "/team", (dict) => ({
    title: dict.teamPage.title,
    description: dict.teamPage.intro,
  }));
}

/** Compact: a face, a name, a role, and what they're working on. */
function PersonCard({
  person,
  content,
  locale,
  dict,
}: {
  person: Person;
  content: SiteContent;
  locale: Locale;
  dict: Dictionary;
}) {
  const school = findSchool(content, person.school);
  const projects = personProjects(content, person);
  return (
    <li className="flex gap-4 rounded-3xl bg-surface p-5">
      <Avatar person={person} hue={personHue(content, person)} locale={locale} className="size-16" initialClassName="text-2xl" />
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{localize(person.name, locale)}</p>
        <p className="text-sm text-ink-2">{localize(person.role, locale)}</p>
        {school && <p className="text-sm text-ink-3">{localize(school.name, locale)}</p>}
        {projects.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-ink-3">{dict.teamPage.worksOn}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`${href(locale, "/projects")}#${project.slug}`}
                    className="inline-flex h-7 items-center rounded-full px-2.5 text-xs text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink"
                  >
                    {localize(project.title, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

export default async function TeamPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const content = await getContent();
  const founders = content.people.filter((person) => person.founder);
  const members = content.people.filter((person) => !person.founder);

  return (
    <>
      <PageIntro title={dict.teamPage.title} intro={dict.teamPage.intro} />

      <div className="mx-auto w-full max-w-6xl space-y-16 px-5 pb-28 sm:px-8">
        <section aria-labelledby="founders-title">
          <h2 id="founders-title" className="eyebrow">
            {dict.teamPage.founders}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {founders.map((person) => (
              <PersonCard key={person.id} person={person} content={content} locale={lang} dict={dict} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="members-title">
          <h2 id="members-title" className="eyebrow">
            {dict.teamPage.members}
          </h2>
          {members.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((person) => (
                <PersonCard key={person.id} person={person} content={content} locale={lang} dict={dict} />
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col gap-6 rounded-3xl border border-dashed border-line p-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-ink-2">{dict.teamPage.membersEmpty}</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="button button-quiet shrink-0 self-start sm:self-auto">
                {dict.join.contact}
                <ArrowRightIcon className="size-4" />
              </a>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
