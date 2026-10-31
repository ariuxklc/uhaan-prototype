import type { Person } from "@/content/model";

/**
 * People listed publicly. Only add someone once they have agreed to be shown.
 * Mongolian names follow the usual initial-then-given-name form.
 */
export const PEOPLE: readonly Person[] = [
  {
    id: "choidelger",
    name: { mn: "Г. Чойдэлгэр", en: "Choidelger Ganbat" },
    role: { mn: "Харилцааны ахлагч", en: "Communications lead" },
    school: "sant",
    founder: true,
  },
  {
    id: "ariunbayar",
    name: { mn: "Э. Ариунбаяр", en: "Ariunbayar Enkhtaivan" },
    role: { mn: "Програм хангамжийн ахлагч", en: "Software lead" },
    school: "sant",
    founder: true,
  },
  {
    id: "tuguldur",
    name: { mn: "Г. Төгөлдөр", en: "Tuguldur Ganbold" },
    role: { mn: "Техник хангамжийн ахлагч", en: "Hardware lead" },
    school: "sant",
    founder: true,
  },
];
