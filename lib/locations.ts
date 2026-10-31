/**
 * Every place the site reports on. One entry per IQAir "city" in Mongolia:
 * the capital plus the 21 aimag (province) centres.
 *
 * `iqair` holds the exact identifiers the API expects (its own romanisation,
 * verified against /v2/states and /v2/cities). Display names use the common
 * modern spelling instead.
 */

export type MongolianTimeZone = "Asia/Ulaanbaatar" | "Asia/Hovd";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bilingual {
  en: string;
  mn: string;
}

export interface MongoliaLocation {
  slug: string;
  name: Bilingual;
  province: Bilingual;
  iqair: { city: string; state: string; country: "Mongolia" };
  /** Reference point published by IQAir for the city. */
  coordinates: LatLng;
  timeZone: MongolianTimeZone;
  /**
   * How long a reading is served from cache before it is fetched again.
   * Together these must keep the site inside the free plan's 10,000 calls a
   * month; see `estimateMonthlyCalls` and its test.
   */
  refreshMinutes: number;
}

const CAPITAL_REFRESH = 60;
const MAJOR_CITY_REFRESH = 120;
const AIMAG_CENTRE_REFRESH = 240;

/** Ordered by population so the largest cities are fetched first on a cold cache. */
export const LOCATIONS: readonly MongoliaLocation[] = [
  {
    slug: "ulaanbaatar",
    name: { en: "Ulaanbaatar", mn: "Улаанбаатар" },
    province: { en: "Capital city", mn: "Нийслэл" },
    iqair: { city: "Ulaanbaatar", state: "Ulaanbaatar", country: "Mongolia" },
    coordinates: { lat: 47.90771, lng: 106.88324 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: CAPITAL_REFRESH,
  },
  {
    slug: "erdenet",
    name: { en: "Erdenet", mn: "Эрдэнэт" },
    province: { en: "Orkhon", mn: "Орхон" },
    iqair: { city: "Erdenet", state: "Orhon", country: "Mongolia" },
    coordinates: { lat: 49.03333, lng: 104.08333 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: MAJOR_CITY_REFRESH,
  },
  {
    slug: "darkhan",
    name: { en: "Darkhan", mn: "Дархан" },
    province: { en: "Darkhan-Uul", mn: "Дархан-Уул" },
    iqair: { city: "Darhan", state: "Darhan Uul", country: "Mongolia" },
    coordinates: { lat: 49.427188, lng: 105.952284 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: MAJOR_CITY_REFRESH,
  },
  {
    slug: "choibalsan",
    name: { en: "Choibalsan", mn: "Чойбалсан" },
    province: { en: "Dornod", mn: "Дорнод" },
    iqair: { city: "Choibalsan", state: "East Aimak", country: "Mongolia" },
    coordinates: { lat: 48.07257, lng: 114.53264 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "murun",
    name: { en: "Mörön", mn: "Мөрөн" },
    province: { en: "Khövsgöl", mn: "Хөвсгөл" },
    iqair: { city: "Murun-kuren", state: "Hovsgol", country: "Mongolia" },
    coordinates: { lat: 49.63417, lng: 100.1625 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "khovd",
    name: { en: "Khovd", mn: "Ховд" },
    province: { en: "Khovd", mn: "Ховд" },
    iqair: { city: "Khovd", state: "Hovd", country: "Mongolia" },
    coordinates: { lat: 48.00556, lng: 91.64194 },
    timeZone: "Asia/Hovd",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "olgii",
    name: { en: "Ölgii", mn: "Өлгий" },
    province: { en: "Bayan-Ölgii", mn: "Баян-Өлгий" },
    iqair: { city: "OElgii", state: "Bayan-Olgiy", country: "Mongolia" },
    coordinates: { lat: 48.96833, lng: 89.9625 },
    timeZone: "Asia/Hovd",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "bayankhongor",
    name: { en: "Bayankhongor", mn: "Баянхонгор" },
    province: { en: "Bayankhongor", mn: "Баянхонгор" },
    iqair: { city: "Bayanhongor", state: "Bayanhongor", country: "Mongolia" },
    coordinates: { lat: 46.19444, lng: 100.71806 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "ulaangom",
    name: { en: "Ulaangom", mn: "Улаангом" },
    province: { en: "Uvs", mn: "Увс" },
    iqair: { city: "Ulaangom", state: "Uvs", country: "Mongolia" },
    coordinates: { lat: 49.98111, lng: 92.06667 },
    timeZone: "Asia/Hovd",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "arvaikheer",
    name: { en: "Arvaikheer", mn: "Арвайхээр" },
    province: { en: "Övörkhangai", mn: "Өвөрхангай" },
    iqair: { city: "Arvayheer", state: "OEvoerhangay", country: "Mongolia" },
    coordinates: { lat: 46.259496, lng: 102.777319 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "sainshand",
    name: { en: "Sainshand", mn: "Сайншанд" },
    province: { en: "Dornogovi", mn: "Дорноговь" },
    iqair: { city: "Saynshand", state: "East Gobi Aymag", country: "Mongolia" },
    coordinates: { lat: 44.88239, lng: 110.11631 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "dalanzadgad",
    name: { en: "Dalanzadgad", mn: "Даланзадгад" },
    province: { en: "Ömnögovi", mn: "Өмнөговь" },
    iqair: { city: "Dalandzadgad", state: "OEmnoegovi", country: "Mongolia" },
    coordinates: { lat: 43.57083, lng: 104.425 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "sukhbaatar",
    name: { en: "Sükhbaatar", mn: "Сүхбаатар" },
    province: { en: "Selenge", mn: "Сэлэнгэ" },
    iqair: { city: "Suhbaatar", state: "Selenge", country: "Mongolia" },
    coordinates: { lat: 50.23139, lng: 106.20778 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "tsetserleg",
    name: { en: "Tsetserleg", mn: "Цэцэрлэг" },
    province: { en: "Arkhangai", mn: "Архангай" },
    iqair: { city: "Tsetserleg", state: "Arhangay", country: "Mongolia" },
    coordinates: { lat: 47.474958, lng: 101.448494 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "chinggis",
    name: { en: "Chinggis City", mn: "Чингис хот" },
    province: { en: "Khentii", mn: "Хэнтий" },
    iqair: { city: "Undurkhaan", state: "Hentiy", country: "Mongolia" },
    coordinates: { lat: 47.31944, lng: 110.65556 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "zuunmod",
    name: { en: "Zuunmod", mn: "Зуунмод" },
    province: { en: "Töv", mn: "Төв" },
    iqair: { city: "Dzuunmod", state: "Central Aimak", country: "Mongolia" },
    coordinates: { lat: 47.70694, lng: 106.95278 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "altai",
    name: { en: "Altai", mn: "Алтай" },
    province: { en: "Govi-Altai", mn: "Говь-Алтай" },
    iqair: { city: "Altai", state: "Govi-Altay", country: "Mongolia" },
    coordinates: { lat: 46.37222, lng: 96.25833 },
    timeZone: "Asia/Hovd",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "uliastai",
    name: { en: "Uliastai", mn: "Улиастай" },
    province: { en: "Zavkhan", mn: "Завхан" },
    iqair: { city: "Uliastay", state: "Dzabkhan", country: "Mongolia" },
    coordinates: { lat: 47.74167, lng: 96.84444 },
    timeZone: "Asia/Hovd",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "baruun-urt",
    name: { en: "Baruun-Urt", mn: "Баруун-Урт" },
    province: { en: "Sükhbaatar", mn: "Сүхбаатар" },
    iqair: { city: "Baruun-Urt", state: "Suhbaatar", country: "Mongolia" },
    coordinates: { lat: 46.68056, lng: 113.27917 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "mandalgovi",
    name: { en: "Mandalgovi", mn: "Мандалговь" },
    province: { en: "Dundgovi", mn: "Дундговь" },
    iqair: { city: "Mandalgovi", state: "Middle Govi", country: "Mongolia" },
    coordinates: { lat: 45.7625, lng: 106.27083 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "bulgan",
    name: { en: "Bulgan", mn: "Булган" },
    province: { en: "Bulgan", mn: "Булган" },
    iqair: { city: "Bulgan", state: "Bulgan", country: "Mongolia" },
    coordinates: { lat: 48.8125, lng: 103.53472 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
  {
    slug: "choir",
    name: { en: "Choir", mn: "Чойр" },
    province: { en: "Govisümber", mn: "Говьсүмбэр" },
    iqair: { city: "Choyr", state: "Govi-Sumber", country: "Mongolia" },
    coordinates: { lat: 46.36111, lng: 108.36111 },
    timeZone: "Asia/Ulaanbaatar",
    refreshMinutes: AIMAG_CENTRE_REFRESH,
  },
];

export const DEFAULT_LOCATION_SLUG = "ulaanbaatar";

const LOCATIONS_BY_SLUG = new Map(LOCATIONS.map((location) => [location.slug, location]));

export function getLocation(slug: string): MongoliaLocation | undefined {
  return LOCATIONS_BY_SLUG.get(slug);
}

/** Upper bound on IQAir calls in a 30-day month if every page view found stale data. */
export function estimateMonthlyCalls(locations: readonly MongoliaLocation[] = LOCATIONS): number {
  const perDay = locations.reduce(
    (total, location) => total + Math.ceil((24 * 60) / location.refreshMinutes),
    0,
  );
  return perDay * 30;
}

/** Great-circle distance in kilometres. */
export function distanceKm(from: LatLng, to: LatLng): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function findNearestLocation(
  point: LatLng,
  locations: readonly MongoliaLocation[] = LOCATIONS,
): { location: MongoliaLocation; distanceKm: number } | null {
  let nearest: { location: MongoliaLocation; distanceKm: number } | null = null;
  for (const location of locations) {
    const distance = distanceKm(point, location.coordinates);
    if (!nearest || distance < nearest.distanceKm) {
      nearest = { location, distanceKm: distance };
    }
  }
  return nearest;
}

/** Rough bounding box of Mongolia, used to sanity-check coordinates. */
export const MONGOLIA_BOUNDS = {
  south: 41.5,
  west: 87.7,
  north: 52.2,
  east: 119.95,
} as const;
