import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Bilingual } from "@/content/model";
import { MONITORS } from "@/content/monitors";
import { PEOPLE } from "@/content/people";
import { PROJECTS } from "@/content/projects";
import { SCHOOLS } from "@/content/schools";
import { UPDATES } from "@/content/updates";
import { staticSource } from "@/lib/content/static-source";
import { validateContent } from "@/lib/content/validate";
import { formatMonth } from "@/lib/format";

const schoolSlugs = new Set(SCHOOLS.map((school) => school.slug));

function expectBilingual(text: Bilingual, where: string) {
  expect(text.en.trim(), where).not.toBe("");
  expect(text.mn.trim(), where).not.toBe("");
}

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("project content", () => {
  it("has exactly one host school and unique slugs", () => {
    expect(SCHOOLS.filter((school) => school.role === "host")).toHaveLength(1);
    expectUnique(SCHOOLS.map((school) => school.slug));
  });

  it("only refers to schools that exist", () => {
    for (const person of PEOPLE) expect(schoolSlugs.has(person.school), person.id).toBe(true);
    const personIds = new Set(PEOPLE.map((person) => person.id));
    for (const project of PROJECTS) {
      expect(project.schools.length, project.slug).toBeGreaterThan(0);
      for (const slug of project.schools) expect(schoolSlugs.has(slug), project.slug).toBe(true);
      for (const id of project.people ?? []) expect(personIds.has(id), `${project.slug}: ${id}`).toBe(true);
    }
    expect(PROJECTS.filter((project) => project.featured).length).toBeLessThanOrEqual(1);
  });

  it("is complete in both languages", () => {
    for (const school of SCHOOLS) expectBilingual(school.name, school.slug);
    for (const person of PEOPLE) {
      expectBilingual(person.name, person.id);
      expectBilingual(person.role, person.id);
    }
    for (const project of PROJECTS) {
      expectBilingual(project.title, project.slug);
      expectBilingual(project.summary, project.slug);
      project.facts?.forEach((fact) => expectBilingual(fact, project.slug));
    }
    for (const update of UPDATES) {
      expectBilingual(update.title, update.id);
      expectBilingual(update.place, update.id);
      if (update.summary) expectBilingual(update.summary, update.id);
    }
  });

  it("uses unique ids and well-formed dates", () => {
    expectUnique(PEOPLE.map((person) => person.id));
    expectUnique(PROJECTS.map((project) => project.slug));
    expectUnique(UPDATES.map((update) => update.id));
    for (const update of UPDATES) expect(update.date, update.id).toMatch(/^\d{4}(-(0[1-9]|1[0-2]))?$/);
  });

  it("passes the same checks any content source gets, unchanged", async () => {
    const { content, problems } = validateContent(await staticSource.load());
    expect(problems).toEqual([]);
    // Nothing dropped or reordered: the files are already in display order.
    expect(content).toEqual({ schools: SCHOOLS, people: PEOPLE, projects: PROJECTS, updates: UPDATES, monitors: MONITORS });
  });

  it("only references media files that exist", () => {
    const media = [
      ...PEOPLE.flatMap((person) => (person.photo ? [person.photo] : [])),
      ...SCHOOLS.flatMap((school) => (school.logo ? [school.logo] : [])),
      ...PROJECTS.flatMap((project) => (project.image ? [project.image.src] : [])),
      ...UPDATES.flatMap((update) => (update.image ? [update.image.src] : [])),
    ];
    for (const src of media) {
      expect(src, src).toMatch(/^\/media\//);
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
  });

  it("lists at least the founders", () => {
    expect(PEOPLE.filter((person) => person.founder).length).toBeGreaterThan(0);
  });
});

describe("formatMonth", () => {
  it("formats a month in both languages and leaves a bare year alone", () => {
    expect(formatMonth("2026-08", "en")).toBe("Aug 2026");
    expect(formatMonth("2026-08", "mn")).toBe("2026 оны 8-р сар");
    expect(formatMonth("2026", "en")).toBe("2026");
  });
});
