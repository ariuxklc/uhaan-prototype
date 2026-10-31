/**
 * Shapes for the project's own content (schools, people, projects, updates,
 * monitors).
 *
 * Kept as typed data in the repository for now, so the team can edit it in one
 * place. Each collection maps one-to-one onto a future Firestore collection.
 */

import type { Locale } from "@/lib/i18n/config";
import type { Bilingual, LatLng } from "@/lib/locations";

export type { Bilingual };

export function localize(text: Bilingual, locale: Locale): string {
  return text[locale];
}

/** An image in `public/media/…`, e.g. "/media/people/ariunbayar.jpg". */
export interface Picture {
  src: string;
  alt: Bilingual;
}

export interface School {
  slug: string;
  name: Bilingual;
  role: "host" | "partner";
  /** Square logo in `public/media/schools/`. A coloured monogram is shown without one. */
  logo?: string;
}

export interface Person {
  id: string;
  name: Bilingual;
  role: Bilingual;
  /** School slug. */
  school: string;
  founder: boolean;
  /**
   * Portrait in `public/media/people/` (ideally 4:5, at least 800px tall).
   * Only add a photo the person has agreed to share. Without one, a coloured
   * card with their initial is shown.
   */
  photo?: string;
}

export type ProjectStatus = "done" | "active" | "planned";

/** Picture on a project's cover when it has no photo. */
export type ProjectIcon = "map" | "sensor" | "network" | "workshop";

export interface Project {
  slug: string;
  title: Bilingual;
  summary: Bilingual;
  status: ProjectStatus;
  icon: ProjectIcon;
  /** Shown large at the top of the home page's projects. */
  featured?: boolean;
  /** School slugs taking part. */
  schools: string[];
  /** Ids from `people.ts` of the people working on it. */
  people?: string[];
  /** Short facts shown under the summary, e.g. parts and cost. */
  facts?: Bilingual[];
  /** In-site path where the project can be seen, e.g. "/map". */
  path?: string;
  image?: Picture;
}

export type UpdateKind = "presentation" | "workshop" | "media" | "event";

export interface Update {
  id: string;
  kind: UpdateKind;
  /** "YYYY-MM" when the month is known, otherwise "YYYY". */
  date: string;
  title: Bilingual;
  place: Bilingual;
  summary?: Bilingual;
  /** Planned items appear under "Coming up". */
  upcoming?: boolean;
  /** Cover photo in `public/media/updates/`. */
  image?: Picture;
}

/** The values a monitor's CSV files can hold (see `monitor-data/README.md`). */
export type MonitorColumn = "time" | "date" | "pm25" | "pm10" | "aqi" | "temperature" | "humidity";

/** How to read a monitor's CSV files. Only needed when they differ from the usual layout. */
export interface MonitorCsvFormat {
  /** Header name for each value, or a 0-based column number for files without a header row. */
  columns?: Partial<Record<MonitorColumn, string | number>>;
  /** Offset of times written without one. Defaults to Ulaanbaatar time, "+08:00". */
  utcOffset?: string;
}

/**
 * An air monitor at a school. Its readings are the CSV files in
 * `monitor-data/<id>/` (with Firebase: the `monitors/<id>/readings` documents).
 */
export interface Monitor {
  /** Its folder in `monitor-data/`, e.g. "sant". */
  id: string;
  /** Slug of its school. */
  school: string;
  /** Where it is installed. Until this is set its data can be downloaded, but it isn't on the map. */
  location?: LatLng;
  /** Tells monitors at the same school apart, e.g. { mn: "Дээвэр", en: "Rooftop" }. */
  label?: Bilingual;
  csv?: MonitorCsvFormat;
}
