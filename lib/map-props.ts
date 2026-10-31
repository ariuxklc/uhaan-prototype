import type { NetworkSnapshot } from "@/lib/air/snapshot";
import { AQI_CATEGORY_IDS } from "@/lib/aqi";
import { interpolate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";
import { toCitySummaries, toStationSummaries } from "@/lib/view-model";

/** Cities still waiting for their first reading because upstream calls are paced. */
export function countQueued(snapshot: NetworkSnapshot): number {
  return snapshot.cities.filter(
    (entry) => entry.status.state === "unavailable" && entry.status.reason === "queued",
  ).length;
}

/** Everything the map needs, serialisable for the client. */
export function buildMapProps(snapshot: NetworkSnapshot, locale: Locale, dict: Dictionary) {
  const queued = countQueued(snapshot);
  const status =
    snapshot.mode === "sample"
      ? dict.map.sample
      : snapshot.mode === "unconfigured"
        ? dict.map.unconfigured
        : queued > 0
          ? interpolate(dict.map.queued, { n: queued })
          : null;
  const stations = toStationSummaries(snapshot.monitors, locale, dict, snapshot.assembledAt);

  return {
    cities: toCitySummaries(snapshot.cities, locale, dict, snapshot.assembledAt),
    stations,
    labels: {
      updated: dict.map.updated,
      source: dict.map.source,
      locate: dict.map.locate,
      time: dict.time,
      station: {
        kind: dict.monitor.label,
        unit: dict.monitor.unit,
        ownAqi: dict.monitor.ownAqi,
        source: dict.brand.name,
        download: dict.monitor.download,
        dataHref: href(locale, "/data"),
      },
    },
    legend: {
      title: dict.map.legend,
      names: Object.fromEntries(
        AQI_CATEGORY_IDS.map((id) => [id, dict.aqi.categories[id].name]),
      ) as Record<(typeof AQI_CATEGORY_IDS)[number], string>,
      stations: stations.length > 0 ? dict.monitor.legend : null,
    },
    loadingLabel: dict.map.loading,
    locateFailedLabel: dict.map.locateFailed,
    status,
  };
}
