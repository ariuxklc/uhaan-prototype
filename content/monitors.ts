import type { Monitor } from "@/content/model";

/**
 * School air monitors, one per school to start with. Nothing shows on the site
 * until a monitor has data:
 *
 * 1. Put its CSV files in `monitor-data/<id>/` → listed on the Data page.
 * 2. Set `location` once it is installed → also on the map.
 *
 * Unusual CSV headers? Add `csv: { columns: { pm25: "Dust2.5" } }`.
 * Step by step: monitor-data/README.md.
 */
export const MONITORS: readonly Monitor[] = [
  { id: "sant", school: "sant" },
  { id: "nest", school: "nest" },
  { id: "ub-elite", school: "ub-elite" },
  { id: "hobby", school: "hobby" },
  { id: "orchlon", school: "orchlon" },
  { id: "oyunlag", school: "oyunlag" },
  { id: "ub-empathy", school: "ub-empathy" },
];
