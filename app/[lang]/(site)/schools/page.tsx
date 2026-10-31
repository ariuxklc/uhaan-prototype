import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowRightIcon } from "@/components/icons";
import { PageIntro } from "@/components/page-intro";
import { SchoolBadge } from "@/components/school-badge";
import { localize } from "@/content/model";
import { getContent } from "@/lib/content";
import { schoolHue, schoolProjects } from "@/lib/content/relations";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/i18n/metadata";
import { href } from "@/lib/i18n/routes";
import { CONTACT_EMAIL } from "@/lib/site";

type Props = { params: Promise<{ lang: string }> };

export function generateMetadata({ params }: Props) {
  return pageMetadata(params, "/schools", (dict) => ({
    title: dict.schoolsPage.title,
    description: dict.schoolsPage.intro,
  }));
}

export default async function SchoolsPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const content = await getContent();

  return (
    <>
      <PageIntro title={dict.schoolsPage.title} intro={dict.schoolsPage.intro} />

      <div className="mx-auto w-full max-w-6xl px-5 pb-28 sm:px-8">
        <ol className="border-t border-line">
          {content.schools.map((school) => {
            const projects = schoolProjects(content, school);
            return (
              <li
                key={school.slug}
                id={school.slug}
                className="grid scroll-mt-28 gap-4 border-b border-line py-7 md:grid-cols-12 md:items-center"
              >
                <div className="flex items-center gap-4 md:col-span-5">
                  <SchoolBadge school={school} hue={schoolHue(content, school)} locale={lang} className="size-14 rounded-2xl text-2xl" />
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.02em]">{localize(school.name, lang)}</h2>
                    <p className="mt-0.5 text-sm text-ink-3">
                      {school.role === "host" ? dict.schoolsPage.host : dict.schoolsPage.partner}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-7">
                  {projects.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {projects.map((project) => (
                        <li key={project.slug}>
                          <Link
                            href={`${href(lang, "/projects")}#${project.slug}`}
                            className="inline-flex h-9 items-center rounded-full px-3.5 text-sm text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink"
                          >
                            {localize(project.title, lang)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-3">{dict.schoolsPage.noProjects}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-14 flex flex-col gap-6 rounded-3xl bg-surface p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <p className="max-w-md text-lg">{dict.schoolsPage.more}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="button button-primary shrink-0 self-start sm:self-auto">
            {dict.join.contact}
            <ArrowRightIcon className="size-4" />
          </a>
        </div>
      </div>
    </>
  );
}
