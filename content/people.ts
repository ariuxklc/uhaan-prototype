import type { Person } from "@/content/model";

/**
 * People listed publicly. Only add someone once they have agreed to be shown.
 * Mongolian names follow the usual initial-then-given-name form.
 */
export const PEOPLE: readonly Person[] = [
  {
    id: "choidelger",
    name: { mn: "Г. Чойдэлгэр", en: "Choidelger Ganbat" },
    role: { mn: "Хамтран үүсгэн байгуулагч · Харилцааны ахлагч", en: "Co-founder · Communications lead" },
    school: "sant",
    founder: true,
  },
  {
    id: "ariunbayar",
    name: { mn: "Э. Ариунбаяр", en: "Ariunbayar Enkhtaivan" },
    role: { mn: "Хамтран үүсгэн байгуулагч · Програм хангамжийн ахлагч", en: "Co-founder · Software lead" },
    school: "sant",
    founder: true,
  },
  {
    id: "tuguldur",
    name: { mn: "Г. Төгөлдөр", en: "Tuguldur Ganbold" },
    role: { mn: "Хамтран үүсгэн байгуулагч · Техник хангамжийн ахлагч", en: "Co-founder · Hardware lead" },
    school: "sant",
    founder: true,
  },
];
