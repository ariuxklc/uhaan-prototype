import { notFound } from "next/navigation";

import { PageIntro } from "@/components/page-intro";
import { ProjectCard } from "@/components/project-card";
import { getContent } from "@/lib/content";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/i18n/metadata";

type Props = { params: Promise<{ lang: string }> };

export function generateMetadata({ params }: Props) {
  return pageMetadata(params, "/projects", (dict) => ({
    title: dict.projectsPage.title,
    description: dict.projectsPage.intro,
  }));
}

export default async function ProjectsPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const content = await getContent();
  const featured = content.projects.find((project) => project.featured);
  const others = content.projects.filter((project) => project !== featured);

  return (
    <>
      <PageIntro title={dict.projectsPage.title} intro={dict.projectsPage.intro} />

      <div className="mx-auto w-full max-w-6xl px-5 pb-28 sm:px-8">
        {featured && (
          <div className="rounded-[2rem] bg-surface p-5 sm:p-8 lg:p-10">
            <ProjectCard project={featured} content={content} locale={lang} dict={dict} large headingLevel="h2" />
          </div>
        )}
        <ul className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} content={content} locale={lang} dict={dict} headingLevel="h2" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
