import type { Update } from "@/content/model";

/** Presentations, media and events, newest first. */
export const UPDATES: readonly Update[] = [
  {
    id: "school-introductions",
    kind: "presentation",
    date: "2026-10",
    title: { mn: "Сургуулиудад хийх танилцуулга", en: "Introductions at partner schools" },
    place: { mn: "Хамтрагч сургуулиуд", en: "Partner schools" },
    summary: {
      mn: "Санаачилгаа танилцуулж, сонирхсон сурагчдыг урина.",
      en: "Presenting the initiative and inviting interested students to join.",
    },
    upcoming: true,
  },
  {
    id: "cop17-green-zone",
    kind: "presentation",
    date: "2026-08",
    title: {
      mn: "Youth Initiatives to Bridge the Data Gap",
      en: "Youth Initiatives to Bridge the Data Gap",
    },
    place: { mn: "UNCCD COP17, Ногоон бүс, Улаанбаатар", en: "UNCCD COP17 Green Zone, Ulaanbaatar" },
    summary: {
      mn: "Агаарын чанарын прототипоо хамтран танилцуулсан.",
      en: "Co-presented the air-quality prototype.",
    },
  },
  {
    id: "tv9-live",
    kind: "media",
    date: "2026",
    title: { mn: "TV9 шууд нэвтрүүлэг", en: "Live on TV9" },
    place: { mn: "TV9", en: "TV9" },
    summary: {
      mn: "Санаачилгын тухай шууд нэвтрүүлэгт оролцсон.",
      en: "Featured in a live broadcast about the initiative.",
    },
  },
];
