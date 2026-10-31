import type {
  Bilingual,
  Monitor,
  MonitorColumn,
  MonitorCsvFormat,
  Person,
  Picture,
  Project,
  ProjectIcon,
  ProjectStatus,
  School,
  Update,
  UpdateKind,
} from "@/content/model";
import type { SiteContent } from "@/lib/content/source";
import { MONGOLIA_BOUNDS } from "@/lib/locations";
import type { LatLng } from "@/lib/locations";

/** Content as a source delivers it: unchecked, possibly in any order. */
export interface RawContent {
  schools: readonly unknown[];
  people: readonly unknown[];
  projects: readonly unknown[];
  updates: readonly unknown[];
  monitors: readonly unknown[];
}

export interface ContentProblem {
  collection: keyof SiteContent;
  /** The entry's slug or id, or its position when it has none. */
  entry: string;
  message: string;
}

const SCHOOL_ROLES: readonly School["role"][] = ["host", "partner"];
const PROJECT_STATUSES: readonly ProjectStatus[] = ["done", "active", "planned"];
const PROJECT_ICONS: readonly ProjectIcon[] = ["map", "sensor", "network", "workshop"];
const UPDATE_KINDS: readonly UpdateKind[] = ["presentation", "workshop", "media", "event"];
const MONITOR_COLUMNS: readonly MonitorColumn[] = ["time", "date", "pm25", "pm10", "aqi", "temperature", "humidity"];
const UTC_OFFSET = /^[+-](?:0\d|1[0-4]):[0-5]\d$/;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/;
const SITE_PATH = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;

type Fields = Record<string, unknown>;

class InvalidField extends Error {}

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new InvalidField(`${field} must be non-empty text`);
  return value;
}

function bilingual(value: unknown, field: string): Bilingual {
  if (!isRecord(value)) throw new InvalidField(`${field} needs Mongolian and English text`);
  return { mn: text(value.mn, `${field}.mn`), en: text(value.en, `${field}.en`) };
}

function slug(value: unknown, field: string): string {
  if (typeof value !== "string" || !SLUG.test(value)) {
    throw new InvalidField(`${field} must be lowercase letters, digits and dashes`);
  }
  return value;
}

function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new InvalidField(`${field} must be true or false`);
  return value;
}

function oneOf<T extends string>(options: readonly T[]) {
  return (value: unknown, field: string): T => {
    const match = options.find((option) => option === value);
    if (match === undefined) throw new InvalidField(`${field} must be one of: ${options.join(", ")}`);
    return match;
  };
}

function list<T>(read: (value: unknown, field: string) => T) {
  return (value: unknown, field: string): T[] => {
    if (!Array.isArray(value)) throw new InvalidField(`${field} must be a list`);
    return value.map((item, index) => read(item, `${field}[${index}]`));
  };
}

/** A file in `public/` ("/media/…") or a full https URL, e.g. from Cloud Storage. */
function imageSource(value: unknown, field: string): string {
  const source = text(value, field);
  if (source.startsWith("/") ? source.startsWith("//") : !source.startsWith("https://")) {
    throw new InvalidField(`${field} must start with "/media/" or "https://"`);
  }
  return source;
}

function picture(value: unknown, field: string): Picture {
  if (!isRecord(value)) throw new InvalidField(`${field} needs a src and alt text`);
  return { src: imageSource(value.src, `${field}.src`), alt: bilingual(value.alt, `${field}.alt`) };
}

function sitePath(value: unknown, field: string): string {
  if (typeof value !== "string" || !SITE_PATH.test(value)) throw new InvalidField(`${field} must be a path like "/map"`);
  return value;
}

/** Missing and `null` both mean "not set". */
function optional<T>(value: unknown, field: string, read: (value: unknown, field: string) => T): T | undefined {
  return value === undefined || value === null ? undefined : read(value, field);
}

/** Leaves out unset fields rather than storing `undefined`, which Firestore rejects. */
function compact<T extends object>(entry: T): T {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined)) as T;
}

function parseSchool(raw: Fields): School {
  return compact({
    slug: slug(raw.slug, "slug"),
    name: bilingual(raw.name, "name"),
    role: oneOf(SCHOOL_ROLES)(raw.role, "role"),
    logo: optional(raw.logo, "logo", imageSource),
  });
}

function parsePerson(raw: Fields): Person {
  return compact({
    id: slug(raw.id, "id"),
    name: bilingual(raw.name, "name"),
    role: bilingual(raw.role, "role"),
    school: slug(raw.school, "school"),
    founder: optional(raw.founder, "founder", bool) ?? false,
    photo: optional(raw.photo, "photo", imageSource),
  });
}

function parseProject(raw: Fields): Project {
  const schools = list(slug)(raw.schools, "schools");
  if (schools.length === 0) throw new InvalidField("schools needs at least one school");
  return compact({
    slug: slug(raw.slug, "slug"),
    title: bilingual(raw.title, "title"),
    summary: bilingual(raw.summary, "summary"),
    status: oneOf(PROJECT_STATUSES)(raw.status, "status"),
    icon: oneOf(PROJECT_ICONS)(raw.icon, "icon"),
    featured: optional(raw.featured, "featured", bool),
    schools,
    people: optional(raw.people, "people", list(slug)),
    facts: optional(raw.facts, "facts", list(bilingual)),
    path: optional(raw.path, "path", sitePath),
    image: optional(raw.image, "image", picture),
  });
}

function parseUpdate(raw: Fields): Update {
  const date = text(raw.date, "date");
  if (!DATE.test(date)) throw new InvalidField('date must be "YYYY" or "YYYY-MM"');
  return compact({
    id: slug(raw.id, "id"),
    kind: oneOf(UPDATE_KINDS)(raw.kind, "kind"),
    date,
    title: bilingual(raw.title, "title"),
    place: bilingual(raw.place, "place"),
    summary: optional(raw.summary, "summary", bilingual),
    upcoming: optional(raw.upcoming, "upcoming", bool),
    image: optional(raw.image, "image", picture),
  });
}

/** A point in Mongolia; catches swapped or mistyped coordinates. */
function location(value: unknown, field: string): LatLng {
  if (!isRecord(value) || typeof value.lat !== "number" || typeof value.lng !== "number") {
    throw new InvalidField(`${field} needs numeric lat and lng`);
  }
  const { lat, lng } = value;
  const { south, north, west, east } = MONGOLIA_BOUNDS;
  if (!(lat >= south && lat <= north && lng >= west && lng <= east)) {
    throw new InvalidField(`${field} must be in Mongolia (Ulaanbaatar is about lat 47.9, lng 106.9)`);
  }
  return { lat, lng };
}

function csvFormat(value: unknown, field: string): MonitorCsvFormat {
  if (!isRecord(value)) throw new InvalidField(`${field} must be an object`);
  const columns = optional(value.columns, `${field}.columns`, (raw, name) => {
    if (!isRecord(raw)) throw new InvalidField(`${name} must be an object`);
    return Object.fromEntries(
      Object.entries(raw).map(([key, column]) => {
        if (!MONITOR_COLUMNS.some((known) => known === key)) {
          throw new InvalidField(`${name}.${key} is unknown; use ${MONITOR_COLUMNS.join(", ")}`);
        }
        const isHeaderName = typeof column === "string" && column.trim() !== "";
        const isColumnNumber = typeof column === "number" && Number.isInteger(column) && column >= 0;
        if (!isHeaderName && !isColumnNumber) {
          throw new InvalidField(`${name}.${key} must be a header name or a column number`);
        }
        return [key, column];
      }),
    ) as MonitorCsvFormat["columns"];
  });
  const utcOffset = optional(value.utcOffset, `${field}.utcOffset`, (raw, name) => {
    if (typeof raw !== "string" || !UTC_OFFSET.test(raw)) throw new InvalidField(`${name} must look like "+08:00"`);
    return raw;
  });
  return compact({ columns, utcOffset });
}

function parseMonitor(raw: Fields): Monitor {
  return compact({
    id: slug(raw.id, "id"),
    school: slug(raw.school, "school"),
    location: optional(raw.location, "location", location),
    label: optional(raw.label, "label", bilingual),
    csv: optional(raw.csv, "csv", csvFormat),
  });
}

/** Entries with a numeric `order` come first, lowest first; the rest keep their source order. */
function byOrder(entries: readonly unknown[]): unknown[] {
  const rank = (entry: unknown) =>
    isRecord(entry) && typeof entry.order === "number" && Number.isFinite(entry.order)
      ? entry.order
      : Number.POSITIVE_INFINITY;
  return [...entries].sort((a, b) => {
    const difference = rank(a) - rank(b);
    return Number.isNaN(difference) ? 0 : difference;
  });
}

/**
 * Checks content from any source, so a typo in one entry never breaks a page.
 * Invalid entries are dropped and reported; valid ones are rebuilt with only
 * known fields, in display order: by `order` when given, updates newest first.
 */
export function validateContent(raw: RawContent): { content: SiteContent; problems: ContentProblem[] } {
  const problems: ContentProblem[] = [];

  function parseAll<T>(
    collection: keyof SiteContent,
    entries: readonly unknown[],
    key: "slug" | "id",
    parse: (raw: Fields) => T,
  ): T[] {
    const seen = new Set<string>();
    return entries.flatMap((entry, index) => {
      const id = isRecord(entry) ? entry[key] : undefined;
      const name = typeof id === "string" ? id : `#${index + 1}`;
      try {
        if (!isRecord(entry)) throw new InvalidField("is not an object");
        if (seen.has(name)) throw new InvalidField(`duplicate ${key}`);
        const parsed = parse(entry);
        seen.add(name);
        return [parsed];
      } catch (error) {
        if (!(error instanceof InvalidField)) throw error;
        problems.push({ collection, entry: name, message: error.message });
        return [];
      }
    });
  }

  const schools = parseAll("schools", byOrder(raw.schools), "slug", parseSchool);
  const people = parseAll("people", byOrder(raw.people), "id", parsePerson);
  const projects = parseAll("projects", byOrder(raw.projects), "slug", parseProject);
  const updates = parseAll("updates", raw.updates, "id", parseUpdate).sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? 1 : -1,
  );
  const monitors = parseAll("monitors", byOrder(raw.monitors), "id", parseMonitor);

  // Broken links are reported but kept: the pages simply skip missing entries.
  const schoolSlugs = new Set(schools.map((school) => school.slug));
  const personIds = new Set(people.map((person) => person.id));
  const report = (collection: keyof SiteContent, entry: string, message: string) =>
    problems.push({ collection, entry, message });

  for (const person of people) {
    if (!schoolSlugs.has(person.school)) report("people", person.id, `unknown school "${person.school}"`);
  }
  for (const project of projects) {
    for (const slug of project.schools) {
      if (!schoolSlugs.has(slug)) report("projects", project.slug, `unknown school "${slug}"`);
    }
    for (const id of project.people ?? []) {
      if (!personIds.has(id)) report("projects", project.slug, `unknown person "${id}"`);
    }
  }
  if (projects.filter((project) => project.featured).length > 1) {
    report("projects", "featured", "more than one featured project; the first is shown");
  }
  for (const monitor of monitors) {
    if (!schoolSlugs.has(monitor.school)) report("monitors", monitor.id, `unknown school "${monitor.school}"`);
  }

  return { content: { schools, people, projects, updates, monitors }, problems };
}
