import type { Person, Project, School } from "@/content/model";
import type { SiteContent } from "@/lib/content/source";
import { hueAt } from "@/lib/palette";
import type { Hue } from "@/lib/palette";

/** Resolves ids to entries, dropping ids that no longer exist. */
function resolve<T>(ids: readonly string[], list: readonly T[], key: (entry: T) => string): T[] {
  return ids.flatMap((id) => {
    const entry = list.find((candidate) => key(candidate) === id);
    return entry ? [entry] : [];
  });
}

export function findSchool(content: SiteContent, slug: string): School | undefined {
  return content.schools.find((school) => school.slug === slug);
}

export function projectPeople(content: SiteContent, project: Project): Person[] {
  return resolve(project.people ?? [], content.people, (person) => person.id);
}

export function projectSchools(content: SiteContent, project: Project): School[] {
  return resolve(project.schools, content.schools, (school) => school.slug);
}

export function personProjects(content: SiteContent, person: Person): Project[] {
  return content.projects.filter((project) => project.people?.includes(person.id));
}

export function schoolProjects(content: SiteContent, school: School): Project[] {
  return content.projects.filter((project) => project.schools.includes(school.slug));
}

/*
 * Identity colours follow list order, so each entry keeps its colour on every
 * page and neighbours differ. Projects start two steps along so the first
 * project and the first school do not share a colour.
 */
export function schoolHue(content: SiteContent, school: School): Hue {
  return hueAt(content.schools.findIndex((entry) => entry.slug === school.slug));
}

export function projectHue(content: SiteContent, project: Project): Hue {
  return hueAt(content.projects.findIndex((entry) => entry.slug === project.slug) + 2);
}
