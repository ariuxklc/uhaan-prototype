"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

import { AQI_HEX } from "@/lib/aqi";
import { formatRelativeTime, interpolate } from "@/lib/format";
import type { RelativeTimeStrings } from "@/lib/format";
import { DEFAULT_LOCATION_SLUG, findNearestLocation, getLocation, MONGOLIA_BOUNDS } from "@/lib/locations";
import type { CitySummary, StationSummary } from "@/lib/view-model";

export type MapVariant = "embedded" | "full";

export interface NetworkMapLabels {
  updated: string;
  source: string;
  locate: string;
  time: RelativeTimeStrings;
  station: {
    /** "School monitor" */
    kind: string;
    /** "µg/m³" */
    unit: string;
    /** Note under an AQI that the monitor itself recorded. */
    ownAqi: string;
    source: string;
    /** Link text to the monitor's downloads. */
    download: string;
    /** The Data page in the visitor's language, e.g. "/en/data". */
    dataHref: string;
  };
}

/**
 * CARTO basemaps require a key. It is public by nature (it is visible in every
 * tile request), so the project's key is the default.
 */
const DEFAULT_CARTO_KEY = "cb1_2a2s_1_794f31f70af4528163bdac67";
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() || DEFAULT_CARTO_KEY;
const CARTO_QUERY = `?key=${encodeURIComponent(CARTO_KEY)}`;
const TILE_URL = {
  light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
  dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${CARTO_QUERY}`,
};
const ATTRIBUTION = [
  'Air quality <a href="https://www.iqair.com/" target="_blank" rel="noopener noreferrer">IQAir</a>',
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
].join(" · ");

const MONGOLIA: L.LatLngBoundsLiteral = [
  [MONGOLIA_BOUNDS.south, MONGOLIA_BOUNDS.west],
  [MONGOLIA_BOUNDS.north, MONGOLIA_BOUNDS.east],
];

const LOCATE_ICON =
  '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="5.25"/><circle cx="10" cy="10" r="1.25" fill="currentColor" stroke="none"/><path d="M10 1.75v2.5M10 15.75v2.5M1.75 10h2.5M15.75 10h2.5"/></svg>';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/* ------------------------------------------------------------------ *
 * Glow layer: a soft radial glow around each reading, in its band colour,
 * sized by the value. A visual aid, not an interpolated surface.
 * ------------------------------------------------------------------ */

interface GlowPoint {
  lat: number;
  lng: number;
  aqi: number;
  rgb: [number, number, number];
}

const REDRAW_EVENTS = "move zoom viewreset resize";
const MAX_PIXEL_RATIO = 2;

/*
 * The glow describes whole cities. Zoomed in on streets it would only cover
 * them, so it fades out between city and neighbourhood zoom.
 */
const GLOW_FULL_ZOOM = 10;
const GLOW_GONE_ZOOM = 14;

function glowStrength(zoom: number): number {
  return Math.min(1, Math.max(0, (GLOW_GONE_ZOOM - zoom) / (GLOW_GONE_ZOOM - GLOW_FULL_ZOOM)));
}

class GlowLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private frame: number | null = null;
  private points: GlowPoint[] = [];
  private host: L.Map | null = null;

  setPoints(points: GlowPoint[]): this {
    this.points = [...points].sort((a, b) => a.aqi - b.aqi);
    this.schedule();
    return this;
  }

  override onAdd(map: L.Map): this {
    this.host = map;
    this.canvas = L.DomUtil.create("canvas", "ut-aura leaflet-layer");
    map.getPanes().overlayPane.appendChild(this.canvas);
    map.on(REDRAW_EVENTS, this.schedule);
    this.schedule();
    return this;
  }

  override onRemove(map: L.Map): this {
    map.off(REDRAW_EVENTS, this.schedule);
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.canvas?.remove();
    this.canvas = null;
    this.host = null;
    return this;
  }

  private schedule = () => {
    if (this.frame !== null) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = null;
      this.draw();
    });
  };

  /** Roughly the urban area, growing with pollution, and never too small to see. */
  private radiusPixels(map: L.Map, point: GlowPoint, center: L.Point): number {
    const meters = Math.min(70_000, 16_000 + point.aqi * 130);
    const metersPerDegree = 111_320 * Math.cos((point.lat * Math.PI) / 180);
    const edge = map.latLngToContainerPoint([point.lat, point.lng + meters / metersPerDegree]);
    return Math.min(260, Math.max(46, Math.abs(edge.x - center.x)));
  }

  private draw() {
    const map = this.host;
    const canvas = this.canvas;
    const context = canvas?.getContext("2d");
    if (!map || !canvas || !context) return;

    const size = map.getSize();
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = Math.round(size.x * ratio);
    const height = Math.round(size.y * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }

    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.x, size.y);
    const strength = glowStrength(map.getZoom());
    if (strength === 0) return;
    context.globalAlpha = strength;

    for (const point of this.points) {
      const center = map.latLngToContainerPoint([point.lat, point.lng]);
      const radius = this.radiusPixels(map, point, center);
      const [r, g, b] = point.rgb;
      const gradient = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
      gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.32)`);
      gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      context.fillStyle = gradient;
      context.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Markers and popups
 * ------------------------------------------------------------------ */

/** Below this zoom (a phone showing all of Mongolia) markers are plain dots, as in the prototype. */
const PILL_MIN_ZOOM = 4.75;

type MarkerTier = "dot" | "pill";

function tierForZoom(zoom: number): MarkerTier {
  return zoom < PILL_MIN_ZOOM ? "dot" : "pill";
}

function markerIcon(city: CitySummary, tier: MarkerTier): L.DivIcon {
  const classes = [
    "ut-marker",
    `ut-marker--${tier}`,
    city.isCapital ? "ut-marker--capital" : "",
    city.aqi === null ? "ut-marker--none" : "",
    city.freshness === "outdated" ? "ut-marker--outdated" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (tier === "dot") {
    const size = city.isCapital ? 16 : 12;
    return L.divIcon({
      className: classes,
      html: `<span class="ut-marker__body" data-aqi="${city.category}"></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 2],
    });
  }

  const width = city.isCapital ? 44 : city.aqi !== null && city.aqi >= 100 ? 36 : 32;
  const height = city.isCapital ? 30 : 24;
  return L.divIcon({
    className: classes,
    html: `<span class="ut-marker__body" data-aqi="${city.category}">${city.aqi ?? "–"}</span>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
    popupAnchor: [0, -height / 2 - 2],
  });
}

function markerLabel(city: CitySummary): string {
  return city.aqi !== null
    ? `${city.name}: ${city.aqi} US AQI, ${city.categoryName ?? ""}`
    : `${city.name}: ${city.statusLabel ?? "—"}`;
}

function popupHtml(city: CitySummary, labels: NetworkMapLabels): string {
  const value =
    city.aqi !== null
      ? `<span class="aqi-pill" data-aqi="${city.category}">${city.aqi}</span>
         <span class="band-ink" data-aqi="${city.category}" style="font-weight:500">${escapeHtml(city.categoryName ?? "")}</span>`
      : `<span class="aqi-pill" data-aqi="none">–</span>
         <span style="color:var(--ink-3)">${escapeHtml(city.statusLabel ?? "")}</span>`;

  const updated = city.observedAt
    ? `${escapeHtml(interpolate(labels.updated, { time: formatRelativeTime(city.observedAt, Date.now(), labels.time) }))} · `
    : "";

  return `
    <div style="min-width:12.5rem;max-width:16rem">
      <p style="margin:0;font-size:1rem;font-weight:600">${escapeHtml(city.name)}</p>
      <p style="margin:0;color:var(--ink-3);font-size:.8125rem">${escapeHtml(city.province)}</p>
      <p style="margin:.6rem 0 0;display:flex;align-items:center;gap:.5rem">${value}</p>
      ${city.advice ? `<p style="margin:.5rem 0 0;color:var(--ink-2)">${escapeHtml(city.advice)}</p>` : ""}
      <p style="margin:.6rem 0 0;color:var(--ink-3);font-size:.75rem">${updated}${escapeHtml(labels.source)}</p>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * School monitors: square chips with an accent ring, shown from city
 * zoom upwards. A chip is coloured only when the monitor itself recorded
 * an AQI; measured concentrations (µg/m³) stay neutral.
 * ------------------------------------------------------------------ */

/** Below this zoom every school sits on top of Ulaanbaatar's own marker. */
const STATION_MIN_ZOOM = 9;

function stationIcon(station: StationSummary): L.DivIcon {
  const value = station.aqi ?? station.pm25 ?? station.pm10;
  const classes = [
    "ut-marker",
    "ut-marker--station",
    station.aqi === null ? "ut-marker--measured" : "",
    station.freshness === "outdated" ? "ut-marker--outdated" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const width = value !== null && value >= 99.5 ? 36 : 30;
  return L.divIcon({
    className: classes,
    html: `<span class="ut-marker__body" data-aqi="${station.category}">${value === null ? "–" : Math.round(value)}</span>`,
    iconSize: [width, 24],
    iconAnchor: [width / 2, 12],
    popupAnchor: [0, -14],
  });
}

function stationLabel(station: StationSummary, labels: NetworkMapLabels): string {
  const { kind, unit } = labels.station;
  const value =
    station.aqi !== null
      ? `${station.aqi} US AQI, ${station.categoryName ?? ""}`
      : station.pm25 !== null
        ? `PM2.5 ${station.pm25} ${unit}`
        : `PM10 ${station.pm10 ?? "–"} ${unit}`;
  return `${station.name} (${kind}): ${value}`;
}

function stationPopupHtml(station: StationSummary, labels: NetworkMapLabels): string {
  const { kind, unit, ownAqi, source, download, dataHref } = labels.station;
  // Opens the Data page with just this monitor ticked.
  const downloadHref = `${dataHref}?monitors=${encodeURIComponent(station.id)}#monitors-title`;
  const aqi =
    station.aqi !== null
      ? `<p style="margin:.6rem 0 0;display:flex;align-items:center;gap:.5rem">
           <span class="aqi-pill" data-aqi="${station.category}">${station.aqi}</span>
           <span class="band-ink" data-aqi="${station.category}" style="font-weight:500">${escapeHtml(station.categoryName ?? "")}</span>
         </p>
         <p style="margin:.25rem 0 0;color:var(--ink-3);font-size:.75rem">${escapeHtml(ownAqi)}</p>`
      : "";
  const measured: Array<[string, number | null]> = [
    ["PM2.5", station.pm25],
    ["PM10", station.pm10],
  ];
  const values = measured
    .filter(([, value]) => value !== null)
    .map(
      ([name, value]) =>
        `<span><span style="color:var(--ink-3)">${name}</span> <strong style="font-weight:600">${value}</strong> <span style="color:var(--ink-3)">${escapeHtml(unit)}</span></span>`,
    )
    .join("");
  const updated = interpolate(labels.updated, {
    time: formatRelativeTime(station.observedAt, Date.now(), labels.time),
  });

  return `
    <div style="min-width:12.5rem;max-width:16rem">
      <p style="margin:0;font-size:1rem;font-weight:600">${escapeHtml(station.name)}</p>
      <p style="margin:0;color:var(--ink-3);font-size:.8125rem">${escapeHtml(kind)}</p>
      ${aqi}
      ${values ? `<p style="margin:.6rem 0 0;display:flex;flex-wrap:wrap;gap:.25rem 1rem">${values}</p>` : ""}
      <p style="margin:.6rem 0 0;color:var(--ink-3);font-size:.75rem">${escapeHtml(updated)} · ${escapeHtml(source)}</p>
      <p style="margin:.6rem 0 0"><a class="link" style="color:var(--ink);font-weight:500" href="${escapeHtml(downloadHref)}">${escapeHtml(download)}</a></p>
    </div>`;
}

/**
 * Leaflet map of every city and school monitor, driven imperatively. The map
 * is built once; new data (from periodic refreshes) only swaps markers and
 * glow, so the visitor's pan and zoom survive updates.
 */
export default function NetworkMap({
  cities,
  stations,
  labels,
  variant,
  onLocateFailed,
}: {
  cities: CitySummary[];
  stations: StationSummary[];
  labels: NetworkMapLabels;
  variant: MapVariant;
  onLocateFailed?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const stationsRef = useRef<L.LayerGroup | null>(null);
  const glowRef = useRef<GlowLayer | null>(null);
  const markerBySlug = useRef(new Map<string, L.Marker>());
  const citiesRef = useRef(cities);
  const tierRef = useRef<MarkerTier>("pill");
  const onLocateFailedRef = useRef(onLocateFailed);
  // Once school monitors are on the map, it opens on Ulaanbaatar, where they are.
  const hasStations = stations.length > 0;

  useEffect(() => {
    onLocateFailedRef.current = onLocateFailed;
  }, [onLocateFailed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isEmbedded = variant === "embedded";
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      // Inside a scrolling page the map must not trap the scroll: wheel zoom
      // turns on after a click, and on phones one finger scrolls the page.
      scrollWheelZoom: !isEmbedded,
      dragging: !(isEmbedded && L.Browser.mobile),
      minZoom: 3,
      // Street level, so the city and a school's surroundings are readable.
      maxZoom: 18,
      maxBounds: L.latLngBounds(MONGOLIA).pad(0.6),
      maxBoundsViscosity: 0.8,
      zoomSnap: 0.25,
    });
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution(ATTRIBUTION);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tiles = L.tileLayer(TILE_URL[currentTheme()], { subdomains: "abcd", maxZoom: 19 }).addTo(map);

    if (!isEmbedded && "geolocation" in navigator) {
      const locate = new L.Control({ position: "bottomright" });
      locate.onAdd = () => {
        const bar = L.DomUtil.create("div", "leaflet-bar");
        const button = L.DomUtil.create("button", "", bar);
        button.type = "button";
        button.title = labels.locate;
        button.setAttribute("aria-label", labels.locate);
        button.innerHTML = LOCATE_ICON;
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.on(button, "click", () => {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
              const nearest = findNearestLocation({ lat: coords.latitude, lng: coords.longitude });
              const marker = nearest ? markerBySlug.current.get(nearest.location.slug) : undefined;
              if (!marker) {
                onLocateFailedRef.current?.();
                return;
              }
              map.once("moveend", () => marker.openPopup());
              map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 7), { duration: 0.8 });
            },
            () => onLocateFailedRef.current?.(),
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
          );
        });
        return bar;
      };
      locate.addTo(map);
    }

    const isNarrow = container.clientWidth < 640;
    const capital = getLocation(DEFAULT_LOCATION_SLUG)?.coordinates;
    if (hasStations && capital) {
      map.setView([capital.lat, capital.lng], isNarrow ? 10.5 : 11);
    } else {
      map.fitBounds(MONGOLIA, { padding: isNarrow ? [8, 8] : isEmbedded ? [24, 24] : [48, 48] });
    }
    tierRef.current = tierForZoom(map.getZoom());

    // School monitors only from city zoom up; below it they would all pile onto Ulaanbaatar.
    const stationLayer = L.layerGroup();
    stationsRef.current = stationLayer;
    const syncStations = () => {
      const show = map.getZoom() >= STATION_MIN_ZOOM;
      if (show && !map.hasLayer(stationLayer)) stationLayer.addTo(map);
      if (!show && map.hasLayer(stationLayer)) stationLayer.remove();
    };
    syncStations();

    // Switch between dots and numbered pills as the visitor zooms.
    map.on("zoomend", () => {
      syncStations();
      const tier = tierForZoom(map.getZoom());
      if (tier === tierRef.current) return;
      tierRef.current = tier;
      for (const city of citiesRef.current) {
        markerBySlug.current.get(city.slug)?.setIcon(markerIcon(city, tier));
      }
    });

    if (isEmbedded) {
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());
    }

    // Keep the basemap in step with the site theme.
    const observer = new MutationObserver(() => tiles.setUrl(TILE_URL[currentTheme()]));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    glowRef.current = new GlowLayer().addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    const markers = markerBySlug.current;

    return () => {
      observer.disconnect();
      map.remove();
      markersRef.current = null;
      stationsRef.current = null;
      glowRef.current = null;
      markers.clear();
    };
  }, [variant, labels.locate, hasStations]);

  // Swap markers and glow whenever the data changes.
  useEffect(() => {
    citiesRef.current = cities;
    const layer = markersRef.current;
    const stationLayer = stationsRef.current;
    const glow = glowRef.current;
    if (!layer || !stationLayer || !glow) return;

    glow.setPoints(
      cities.flatMap((city) =>
        city.aqi !== null && city.category !== "none"
          ? [{ lat: city.lat, lng: city.lng, aqi: city.aqi, rgb: hexToRgb(AQI_HEX[city.category]) }]
          : [],
      ),
    );

    layer.clearLayers();
    markerBySlug.current.clear();
    // Draw the worst last so it sits on top where markers overlap.
    const ordered = [...cities].sort((a, b) => (a.aqi ?? -1) - (b.aqi ?? -1));
    for (const city of ordered) {
      const label = markerLabel(city);
      const marker = L.marker([city.lat, city.lng], {
        icon: markerIcon(city, tierRef.current),
        title: label,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: city.isCapital ? 1000 : 0,
      })
        // Built when opened, so "updated … ago" is always current.
        .bindPopup(() => popupHtml(city, labels), { autoPanPadding: [24, 24] })
        .addTo(layer);
      // Leaflet gives marker icons role="button", whose name would otherwise
      // come from the visible number alone.
      marker.getElement()?.setAttribute("aria-label", label);
      markerBySlug.current.set(city.slug, marker);
    }

    stationLayer.clearLayers();
    for (const station of stations) {
      const label = stationLabel(station, labels);
      const marker = L.marker([station.lat, station.lng], {
        icon: stationIcon(station),
        title: label,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: 500,
      }).bindPopup(() => stationPopupHtml(station, labels), { autoPanPadding: [24, 24] });
      // The layer comes and goes with the zoom, and Leaflet rebuilds the icon each time.
      marker.on("add", () => marker.getElement()?.setAttribute("aria-label", label));
      marker.addTo(stationLayer);
    }
  }, [cities, stations, labels]);

  return <div ref={containerRef} className="ut-map absolute inset-0" />;
}
