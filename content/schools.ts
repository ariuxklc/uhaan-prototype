import type { School } from "@/content/model";

/**
 * Schools shown on the site: the host school and confirmed partners only.
 * Schools still in discussion are added once their partnership is approved.
 * Names are written as the schools use them; correct here if needed.
 */
export const SCHOOLS: readonly School[] = [
  { slug: "sant", name: { mn: "Сант Сургууль", en: "Sant School" }, role: "host", logo: "/media/schools/sant.svg" },
  { slug: "nest", name: { mn: "Nest Сургууль", en: "Nest School" }, role: "partner", logo: "/media/schools/nest.svg" },
  { slug: "ub-elite", name: { mn: "Улаанбаатар Элит олон улсын Сургууль", en: "Ulaanbaatar Elite International School" }, role: "partner", logo: "/media/schools/ub-elite.svg" },
  { slug: "hobby", name: { mn: "Хобби Сургууль", en: "Hobby School" }, role: "partner", logo: "/media/schools/hobby.png" },
  { slug: "orchlon", name: { mn: "Орчлон Сургууль", en: "Orchlon School" }, role: "partner", logo: "/media/schools/orchlon.png" },
  { slug: "oyunlag", name: { mn: "Оюунлаг Сургууль", en: "Oyunlag School" }, role: "partner", logo: "/media/schools/oyunlag.svg" },
  { slug: "ub-empathy", name: { mn: "Улаанбаатар Эмпати Сургууль", en: "Ulaanbaatar Empathy School" }, role: "partner", logo: "/media/schools/ub-empathy.png" },
  { slug: "asu", name: { mn: "Улаанбаатар дахь Америк Сургууль", en: "American School of Ulaanbaatar" }, role: "partner", logo: "/media/schools/asu.svg" },
  { slug: "shine-mongol", name: { mn: "Шинэ Монгол Харүмафүжи Сургууль", en: "Shine Mongol Harumafuji School" }, role: "partner", logo: "/media/schools/shine-mongol.png" },
];
