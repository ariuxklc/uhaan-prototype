import type { Project } from "@/content/model";

/** Projects run by the initiative and its schools, newest first. */
export const PROJECTS: readonly Project[] = [
  {
    slug: "air-map",
    title: { mn: "Агаарын чанарын нээлттэй газрын зураг", en: "Open air-quality map" },
    summary: {
      mn: "Улаанбаатар болон аймгийн төвүүдийн агаарын чанарыг нэг газрын зураг дээр. Сургуулиудын мэдрэгч нэмэгдэх тусам илүү нарийн болно.",
      en: "Air quality for Ulaanbaatar and the aimag centres on one map, getting more detailed as school monitors come online.",
    },
    status: "active",
    icon: "map",
    schools: ["sant"],
    people: ["ariunbayar"],
    path: "/map",
  },
  {
    slug: "monitor-prototype",
    title: { mn: "Хямд өртөгтэй агаарын мэдрэгч", en: "Low-cost air monitor" },
    summary: {
      mn: "Тоосонцрын мэдрэгчээс өгөгдлийн сан, вэб газрын зураг хүртэлх бүрэн прототип.",
      en: "A working prototype, from particle sensor to database to live web map.",
    },
    status: "done",
    icon: "sensor",
    featured: true,
    schools: ["sant"],
    people: ["tuguldur", "ariunbayar"],
    image: {
      src: "/media/projects/monitor-prototype.webp",
      alt: {
        mn: "Саарал хайрцаг дотор утсаар холбогдсон мэдрэгч, самбар, жижиг дэлгэц бүхий прототип",
        en: "The prototype: sensor, board and small display wired together in a grey enclosure",
      },
    },
    facts: [
      { mn: "ESP8266 · SDS011 · OLED дэлгэц · SD карт", en: "ESP8266 · SDS011 · OLED display · SD card" },
      { mn: "Нэг ширхэг ≈ 98–153 мянган ₮", en: "About ₮98,000–153,000 each" },
    ],
  },
  {
    slug: "school-network",
    title: { mn: "Сургуулиудын мэдрэгчийн сүлжээ", en: "School monitoring network" },
    summary: {
      mn: "Оролцогч сургууль бүрт мэдрэгч суурилуулж, нэгдсэн газрын зурагт холбоно.",
      en: "Monitors installed school by school and connected to the shared map.",
    },
    status: "planned",
    icon: "network",
    // Organised by the host school; partners are credited once they take part.
    schools: ["sant"],
  },
  {
    slug: "workshops",
    title: { mn: "Электроник, Arduino-ийн сургалт", en: "Electronics & Arduino workshops" },
    summary: {
      mn: "Сурагчид сурагчдад зориулж явуулах дадлагын сургалтууд.",
      en: "Hands-on sessions run by students, for students.",
    },
    status: "planned",
    icon: "workshop",
    schools: ["sant"],
  },
];
