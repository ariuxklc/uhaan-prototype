import { describe, expect, it } from "vitest";

import { validateContent } from "@/lib/content/validate";
import type { RawContent } from "@/lib/content/validate";

const text = (value: string) => ({ mn: `${value} (mn)`, en: value });

const school = (slug: string, extra: object = {}) => ({ slug, name: text(slug), role: "partner", ...extra });
const update = (id: string, date: string, extra: object = {}) => ({
  id,
  kind: "presentation",
  date,
  title: text(id),
  place: text("School"),
  ...extra,
});

const empty: RawContent = { schools: [], people: [], projects: [], updates: [], monitors: [] };

describe("validateContent", () => {
  it("drops invalid entries and says why, keeping the rest", () => {
    const { content, problems } = validateContent({
      ...empty,
      schools: [
        school("sant", { role: "host" }),
        school("Bad Slug"),
        { slug: "half", name: { en: "Only English" }, role: "partner" },
        school("sant"),
        "not an object",
      ],
    });
    expect(content.schools.map((entry) => entry.slug)).toEqual(["sant"]);
    expect(problems).toEqual([
      { collection: "schools", entry: "Bad Slug", message: "slug must be lowercase letters, digits and dashes" },
      { collection: "schools", entry: "half", message: "name.mn must be non-empty text" },
      { collection: "schools", entry: "sant", message: "duplicate slug" },
      { collection: "schools", entry: "#5", message: "is not an object" },
    ]);
  });

  it("orders by `order` when given and keeps source order otherwise", () => {
    const { content } = validateContent({
      ...empty,
      schools: [school("c"), school("b", { order: 2 }), school("a", { order: 1 }), school("d")],
    });
    expect(content.schools.map((entry) => entry.slug)).toEqual(["a", "b", "c", "d"]);
  });

  it("lists updates newest first, whatever order they arrive in", () => {
    const { content, problems } = validateContent({
      ...empty,
      updates: [update("old", "2025-03"), update("year", "2026"), update("new", "2026-08"), update("bad", "Aug 2026")],
    });
    expect(content.updates.map((entry) => entry.id)).toEqual(["new", "year", "old"]);
    expect(problems.map((problem) => problem.entry)).toEqual(["bad"]);
  });

  it("keeps only known fields and never stores undefined", () => {
    const { content } = validateContent({
      ...empty,
      schools: [school("sant", { order: 1, logo: null, createdAt: "2026-01-01", secretNote: "internal" })],
      people: [{ id: "p", name: text("P"), role: text("Lead"), school: "sant" }],
    });
    expect(content.schools[0]).toEqual({ slug: "sant", name: text("sant"), role: "partner" });
    expect(Object.values(content.schools[0]!)).not.toContain(undefined);
    // A missing `founder` means not a founder.
    expect(content.people[0]).toEqual({ id: "p", name: text("P"), role: text("Lead"), school: "sant", founder: false });
  });

  it("accepts local and https images but not other links", () => {
    const person = (photo: string) => ({ id: "p", name: text("P"), role: text("Lead"), school: "sant", photo });
    const check = (photo: string) => validateContent({ ...empty, schools: [school("sant")], people: [person(photo)] });
    expect(check("/media/people/p.jpg").problems).toEqual([]);
    expect(check("https://firebasestorage.googleapis.com/v0/b/x/o/p.jpg").problems).toEqual([]);
    expect(check("http://example.com/p.jpg").content.people).toEqual([]);
    expect(check("//example.com/p.jpg").content.people).toEqual([]);
    expect(check("javascript:alert(1)").content.people).toEqual([]);
  });

  it("reports links to missing schools and people without dropping the entry", () => {
    const { content, problems } = validateContent({
      ...empty,
      schools: [school("sant")],
      people: [{ id: "p", name: text("P"), role: text("Lead"), school: "gone" }],
      projects: [
        {
          slug: "map",
          title: text("Map"),
          summary: text("Summary"),
          status: "active",
          icon: "map",
          schools: ["sant", "elsewhere"],
          people: ["p", "nobody"],
          path: "/map",
        },
      ],
    });
    expect(content.people).toHaveLength(1);
    expect(content.projects).toHaveLength(1);
    expect(problems.map((problem) => `${problem.collection}/${problem.entry}: ${problem.message}`)).toEqual([
      'people/p: unknown school "gone"',
      'projects/map: unknown school "elsewhere"',
      'projects/map: unknown person "nobody"',
    ]);
  });

  it("rejects projects without schools and paths that leave the site", () => {
    const project = (extra: object) => ({
      slug: "x",
      title: text("X"),
      summary: text("X"),
      status: "planned",
      icon: "map",
      schools: ["sant"],
      ...extra,
    });
    const check = (extra: object) => validateContent({ ...empty, schools: [school("sant")], projects: [project(extra)] });
    expect(check({}).content.projects).toHaveLength(1);
    expect(check({ schools: [] }).problems[0]?.message).toBe("schools needs at least one school");
    expect(check({ path: "https://example.com" }).content.projects).toEqual([]);
    expect(check({ path: "//example.com" }).content.projects).toEqual([]);
    expect(check({ status: "someday" }).problems[0]?.message).toBe("status must be one of: done, active, planned");
  });

  it("checks monitors: a real school, a spot in Mongolia and readable CSV settings", () => {
    const check = (monitor: object) => validateContent({ ...empty, schools: [school("sant")], monitors: [monitor] });

    expect(check({ id: "sant", school: "sant" }).content.monitors).toEqual([{ id: "sant", school: "sant" }]);
    expect(
      check({
        id: "sant",
        school: "sant",
        location: { lat: 47.92, lng: 106.92 },
        label: text("Rooftop"),
        csv: { columns: { time: "Date Time", pm25: 1 }, utcOffset: "+08:00" },
      }).problems,
    ).toEqual([]);

    // Swapped coordinates land outside Mongolia.
    expect(check({ id: "sant", school: "sant", location: { lat: 106.92, lng: 47.92 } }).problems[0]?.message).toMatch(
      /^location must be in Mongolia/,
    );
    expect(check({ id: "sant", school: "sant", csv: { columns: { pm1: "PM1.0" } } }).content.monitors).toEqual([]);
    expect(check({ id: "sant", school: "sant", csv: { columns: { pm25: -1 } } }).content.monitors).toEqual([]);
    expect(check({ id: "sant", school: "sant", csv: { utcOffset: "UTC+8" } }).problems[0]?.message).toBe(
      'csv.utcOffset must look like "+08:00"',
    );

    // A monitor whose school is gone is kept (its data is still real) but reported.
    const orphan = check({ id: "old", school: "closed" });
    expect(orphan.content.monitors).toHaveLength(1);
    expect(orphan.problems).toEqual([{ collection: "monitors", entry: "old", message: 'unknown school "closed"' }]);
  });
});
