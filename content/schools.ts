import type { School } from "@/content/model";

/**
 * Schools shown on the site: the host school and confirmed partners only.
 * Schools still in discussion are added once their partnership is approved.
 * Names are written as the schools use them; correct here if needed.
 */
export const SCHOOLS: readonly School[] = [
  { slug: "sant", name: { mn: "Сант Сургууль", en: "Sant School" }, role: "host" },
  { slug: "nest", name: { mn: "Nest Сургууль", en: "Nest School" }, role: "partner" },
  { slug: "ub-elite", name: { mn: "Улаанбаатар Элит олон улсын Сургууль", en: "Ulaanbaatar Elite International School" }, role: "partner" },
  { slug: "hobby", name: { mn: "Хобби Сургууль", en: "Hobby School" }, role: "partner" },
  { slug: "orchlon", name: { mn: "Орчлон Сургууль", en: "Orchlon School" }, role: "partner" },
  { slug: "oyunlag", name: { mn: "Оюунлаг Сургууль", en: "Oyunlag School" }, role: "partner" },
  { slug: "ub-empathy", name: { mn: "Улаанбааиар Эмпати Сургууль", en: "Ulaanbaatar Empathy School" }, role: "partner" },
  { slug: "asu", name: { mn: "Улаанбаатар дахь Америк Сургууль", en: "American School of Ulaanbaatar" }, role: "partner" },
];
