import { describe, expect, it } from "vitest";

import type { Person, Project, School } from "@/content/model";
import {
  findSchool,
  personHue,
  personProjects,
  projectHue,
  projectPeople,
  projectSchools,
  schoolHue,
  schoolProjects,
} from "@/lib/content/relations";
import type { SiteContent } from "@/lib/content/source";
import { staticSource } from "@/lib/content/static-source";
import { validateContent } from "@/lib/content/validate";

const text = (value: string) => ({ mn: value, en: value });

const school = (slug: string): School => ({ slug, name: text(slug), role: "partner" });
const person = (id: string): Person => ({ id, name: text(id), role: text("Member"), school: "a", founder: false });
const project = (slug: string, schools: string[], people?: string[]): Project => ({
  slug,
  title: text(slug),
  summary: text(slug),
  status: "planned",
  icon: "map",
  schools,
  people,
});

const content: SiteContent = {
  schools: [school("a"), school("b")],
  people: [person("p1"), person("p2")],
  projects: [project("x", ["a"], ["p1", "gone"]), project("y", ["a", "b", "missing"], ["p2"])],
  updates: [],
  monitors: [],
};

describe("content relations", () => {
  it("resolves references and drops ones that no longer exist", () => {
    const [x, y] = content.projects;
    expect(projectPeople(content, x!).map((entry) => entry.id)).toEqual(["p1"]);
    expect(projectSchools(content, y!).map((entry) => entry.slug)).toEqual(["a", "b"]);
    expect(schoolProjects(content, content.schools[0]!).map((entry) => entry.slug)).toEqual(["x", "y"]);
    expect(personProjects(content, content.people[1]!).map((entry) => entry.slug)).toEqual(["y"]);
    expect(findSchool(content, "b")?.slug).toBe("b");
    expect(findSchool(content, "missing")).toBeUndefined();
  });

  it("colours entries by their place in the list", () => {
    expect(schoolHue(content, content.schools[0]!)).toBe("teal");
    expect(schoolHue(content, content.schools[1]!)).toBe("amber");
    expect(personHue(content, content.people[0]!)).toBe("teal");
    // Projects start two steps along so they don't echo the schools.
    expect(projectHue(content, content.projects[0]!)).toBe("blue");
  });

  it("works on the real content", async () => {
    const { content: real } = validateContent(await staticSource.load());
    const featured = real.projects.find((entry) => entry.featured);
    expect(featured).toBeDefined();
    expect(projectPeople(real, featured!).length).toBeGreaterThan(0);
    expect(projectSchools(real, featured!).length).toBeGreaterThan(0);
  });
});
