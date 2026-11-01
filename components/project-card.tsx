import Image from "next/image";
import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { ArrowRightIcon } from "@/components/icons";
import { SchoolBadge } from "@/components/school-badge";
import { localize } from "@/content/model";
import type { Project, ProjectStatus } from "@/content/model";
import { projectHue, projectPeople, projectSchools } from "@/lib/content/relations";
import type { SiteContent } from "@/lib/content/source";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";
import type { Hue } from "@/lib/palette";

const STATUS_DOT: Record<ProjectStatus, string> = {
  done: "bg-ink",
  active: "bg-accent live-dot",
  planned: "border border-ink-3",
};

function Cover({ project, hue, locale, large }: { project: Project; hue: Hue; locale: Locale; large: boolean }) {
  if (!project.image) return null;
  return (
    <div
      data-hue={hue}
      className={`relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_50%_45%,var(--hue-fill),transparent_78%)] ${large ? "aspect-[4/3] md:aspect-auto md:h-full md:min-h-[26rem]" : "aspect-[4/3]"}`}
    >
      <Image
        src={project.image.src}
        alt={localize(project.image.alt, locale)}
        fill
        sizes={large ? "(min-width: 768px) 36rem, 90vw" : "(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 90vw"}
        className="object-contain p-6 drop-shadow-[0_18px_30px_rgb(0_0_0/0.18)]"
      />
    </div>
  );
}

/**
 * A project, led by its picture (when it has one) and the people behind it.
 * `large` is the featured layout: cover and text side by side on wide screens.
 */
export function ProjectCard({
  project,
  content,
  locale,
  dict,
  large = false,
  headingLevel = "h3",
  linkToDetails = false,
}: {
  project: Project;
  content: SiteContent;
  locale: Locale;
  dict: Dictionary;
  large?: boolean;
  headingLevel?: "h2" | "h3";
  /** On summary pages, the title links to the project on the projects page. */
  linkToDetails?: boolean;
}) {
  const Heading = headingLevel;
  const people = projectPeople(content, project);
  const schools = projectSchools(content, project);
  const withPhotos = people.filter((person) => person.photo);

  return (
    <article
      id={linkToDetails ? undefined : project.slug}
      className={`flex scroll-mt-28 flex-col gap-6 ${large && project.image ? "md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12" : ""}`}
    >
      <Cover project={project} hue={projectHue(content, project)} locale={locale} large={large} />

      <div className="flex flex-col">
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[project.status]}`} />
          {dict.projectsPage.status[project.status]}
        </p>
        <Heading
          className={`mt-3 font-semibold tracking-[-0.025em] ${large ? "text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight" : "text-xl"}`}
        >
          {linkToDetails ? (
            <Link href={`${href(locale, "/projects")}#${project.slug}`} className="hover:underline hover:decoration-1 hover:underline-offset-4">
              {localize(project.title, locale)}
            </Link>
          ) : (
            localize(project.title, locale)
          )}
        </Heading>
        <p className={`mt-2 text-ink-2 ${large ? "text-[1.0625rem]" : ""}`}>{localize(project.summary, locale)}</p>

        {project.facts && (
          <ul className="mt-4 space-y-1 text-sm text-ink-3">
            {project.facts.map((fact) => (
              <li key={fact.en}>{localize(fact, locale)}</li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {withPhotos.length > 0 && (
              <span className="flex -space-x-2">
                {withPhotos.map((person) => (
                  <Avatar key={person.id} person={person} locale={locale} className="size-8 ring-2 ring-bg" />
                ))}
              </span>
            )}
            <div className="min-w-0 text-sm">
              {people.length > 0 && (
                <p className="text-ink-2">{people.map((person) => localize(person.name, locale)).join(", ")}</p>
              )}
              {schools.length > 0 && (
                <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-ink-3">
                  {schools.map((school) => (
                    <li key={school.slug} className="flex items-center gap-1.5">
                      <SchoolBadge school={school} className="size-5 rounded-md" />
                      {localize(school.name, locale)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {project.path && (
            <Link
              href={href(locale, project.path)}
              aria-label={localize(project.title, locale)}
              className="grid size-10 shrink-0 place-items-center rounded-full text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-transform hover:translate-x-0.5"
            >
              <ArrowRightIcon className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
