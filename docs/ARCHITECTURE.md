# Architecture

How the site works, on one page. "The big picture" and "Folders" are enough to
find anything; the sections after them go deeper, one kind of data at a time.

## Goals

1. Present the initiative simply, with its live air map shown whole and
   full-bleed, and answer one question fast: *how clean is the air, and how
   fresh is that information?*
2. Never overstate the data. Missing is missing, old is labelled old, a
   city-level average is never presented as a street-level measurement, and a
   measured concentration is never turned into an AQI.
3. Stay comfortably inside the free IQAir plan and honour its terms.
4. Move to Firebase by swapping sources, not by rewriting pages.

## The big picture

Every page is built from three kinds of data:

```text
 content/*.ts              monitor-data/<id>/*.csv          IQAir API
 (edited by the team)      (school monitor logs)            (city-level US AQI)
       │                          │                               │
       ▼                          ▼                               ▼
 lib/content               lib/monitors                    lib/iqair + lib/air/iqair-provider
 getContent()              getMonitorReadings()            (cache, pacing, backoff)
 validate, order           parse, merge                           │
       │                          │                               │
       └────────────┬─────────────┴───────────────────────────────┘
                    ▼
       lib/air/snapshot.ts   getNetworkSnapshot()
       { cities, monitors }, assembled once per request
                    │
   ┌────────────────┼──────────────────────────┐
   ▼                ▼                          ▼
 pages            the map                    downloads
 app/[lang]/…     lib/view-model.ts          lib/downloads.ts
                  lib/map-props.ts           app/api/data/[file]
                  components/map/
```

Pages that only show content (projects, schools, team, updates) call
`getContent()` directly; pages with live data (home, map, data) also call
`getNetworkSnapshot()`.

Each kind of data sits behind a small interface with one active source, chosen
in one line. That line is where Firebase plugs in:

| Data | Interface | Source today | Chosen in |
| --- | --- | --- | --- |
| Content | `ContentSource` (`lib/content/source.ts`) | `staticSource`: the files in `content/` | `lib/content/index.ts` |
| Monitor readings | `MonitorSource` (`lib/monitors/source.ts`) | `csvSource`: the files in `monitor-data/` | `lib/monitors/index.ts` |
| City readings | `AirDataProvider` (`lib/air/types.ts`) | `iqairProvider` (`sampleProvider` in development) | `resolveProvider()` in `lib/air/snapshot.ts` |

Checking and shaping happen *after* the source (`lib/content/validate.ts`,
`lib/monitors/csv.ts`, `lib/iqair/parse.ts`), so a new source only has to
return raw data.

## Folders

```text
app/[lang]/(site)/    pages with header and footer: home, projects, schools, team, updates, data
app/[lang]/map/       the full-screen map (no header or footer)
app/[lang]/           root layout, not-found, error, OG image
app/api/air/capital/  Ulaanbaatar's AQI band for the site-wide backdrop (CDN-cached)
app/api/data/[file]/  downloads: cities and monitors (filtered by query), as .csv or .json
components/           UI; map/ holds the Leaflet map (markers, glow) and its lazy view
content/              what the team edits: schools, people, projects, updates, monitors
monitor-data/         school monitor CSV files, one folder per monitor (see its README)
lib/content/          getContent(): source → validate → display order; relations.ts links entries
lib/monitors/         getMonitorReadings(): the CSV parser and the CSV source
lib/iqair/            IQAir HTTP client, parser, errors, rate limiter (no Next.js imports)
lib/air/              reading types, IQAir and sample providers, the per-request snapshot
lib/view-model.ts     snapshot → localised city and station summaries
lib/map-props.ts      everything the map component receives
lib/downloads.ts      download rows, CSV and JSON writers, terms of use
lib/i18n/             locales, dictionaries (mn + en), route helpers
lib/locations.ts      the 22 IQAir cities: identifiers, refresh tiers, geo helpers
lib/aqi.ts            US AQI bands and colours
proxy.ts              locale redirect (always to /mn)
tests/                Vitest unit tests
```

## Content

`content/` holds typed, bilingual data, one file per future Firestore
collection: `schools`, `people`, `projects`, `updates`, `monitors`. Their
shapes are in `content/model.ts`.

- Pages and components get content only through `getContent()`
  (`lib/content/index.ts`, cached per request) and resolve links between
  entries with `lib/content/relations.ts`. Only `static-source.ts` and tests
  import the arrays in `content/*.ts`.
- A source's `load()` returns raw, unchecked lists (`RawContent`).
  `getContent()` passes them through `validateContent()`, which drops invalid
  entries and logs each problem once (`[content] collection/entry: message`),
  reports links to missing schools or people but keeps the entry, keeps only
  known fields, and never stores `undefined` (Firestore rejects it; `null`
  means unset).
- Order: schools, people, projects and monitors sort by an optional numeric
  `order`, otherwise they keep source order; updates sort by date, newest
  first. Identity colours follow list position, so each entry keeps its colour
  on every page.
- Images are a `/media/…` path or an `https://` URL (e.g. Cloud Storage).

## School monitors

A monitor is an entry in `content/monitors.ts` (`id`, `school`, and optionally
`location`, `label` and `csv` settings) plus a folder `monitor-data/<id>/`.
Every approved school already has both, so bringing a monitor online is
copying its CSV files in. `monitor-data/README.md` is the guide for that.

1. **Reading.** `csvSource` (`lib/monitors/csv-source.ts`, server-only) lists
   the folder's `.csv` files, parses each one, and merges them oldest first
   (when two files share a time, the later file by name wins). The result stays
   in memory until a file or the monitor's settings change. An empty folder
   simply means no data yet.
2. **Parsing.** `lib/monitors/csv.ts` has no framework imports, so an upload
   script or Cloud Function can reuse it. It finds columns by their usual names
   or by `csv.columns`, accepts comma, semicolon and tab separators, reads
   times without an offset as Ulaanbaatar time, and skips rows it can't trust:
   unreadable or day-first dates, clocks that were never set, times in the
   future, and rows with no value. Out-of-range values become `null`.
   `tests/monitor-data.test.ts` fails on any committed file the site can't read.
3. **Values as recorded.** A `MonitorReading` (`lib/air/types.ts`) holds PM2.5
   and PM10 in µg/m³, the monitor's own US AQI only if its CSV has one, and
   optional temperature and humidity. The site never converts a concentration
   into an AQI. Provenance is `provider: "school-monitor"`,
   `resolution: "station"`, and monitor values are never pooled with IQAir's.
4. **Showing.** `getNetworkSnapshot()` returns every monitor with its readings
   (`snapshot.monitors`). A monitor appears on the Data page once it has
   readings, and on the map once it also has a `location`. On the map it is a
   square chip with an accent ring, shown from city zoom (9) up. The chip is
   coloured by band only when the monitor recorded an AQI, and neutral for
   µg/m³. Once any monitor is on the map, the map opens on Ulaanbaatar instead
   of all of Mongolia, the legend and info panel mention monitors, and the home
   map's note changes to match.
5. **Deploying.** The CSVs are read from disk at request time;
   `outputFileTracingIncludes` in `next.config.ts` ships them with the pages and
   download routes on serverless hosts.

## City readings from IQAir

### Request flow

```text
page ─▶ getNetworkSnapshot()   (React cache, per request; pages use `await connection()`)
          │  resolveProvider(): iqair | sample | unconfigured
          ▼
        lib/air/iqair-provider.ts
          one unstable_cache entry per city, revalidated per refresh tier
          │  on a miss or a stale entry:
          ▼
        pacing (SlidingWindowLimiter, DailyCap) ─▶ lib/iqair/client.ts ─▶ IQAir /v2/city
                                                     └▶ lib/iqair/parse.ts (validation)
```

Pages are rendered per request but read from the persistent data cache, so a
render costs a few cache lookups, not API calls. Do **not** use
`export const dynamic = "force-dynamic"`: it sets
`fetchCache = "force-no-store"`, which makes `unstable_cache` bypass the cache
and would spend quota on every view.

**Stable cache keys.** `unstable_cache` builds its key from the callback's
source text plus the key parts. Minification can rename identifiers between
builds, which would orphan every cached reading on each deploy and force a slow
cold refill. The provider therefore caches a *bound* function, whose source
text is always `function () { [native code] }`, so keys depend only on
`CACHE_VERSION` and the city slug.

**Why `unstable_cache` and not `"use cache"`.** `"use cache"` (Cache
Components) defaults to an in-memory cache per instance, so on serverless each
instance would fetch its own copy and multiply API usage. `unstable_cache`
writes to the shared incremental cache that persists across requests,
instances and deployments. If the project moves to Cache Components, use
`"use cache: remote"` with a shared cache handler to keep that property.

### Rate limits, measured

IQAir documents 5 calls/minute, 500/day and 10,000/month for the Community
plan. Measured behaviour (October 2026) is stricter: a second call within
roughly 12 seconds of the previous one returns HTTP 429 "Too Many Requests",
even when the calls are sequential. The provider therefore:

- waits at least **20 seconds** between calls in each server process (3 a
  minute, so even two instances stay under 5 a minute);
- pauses for 30 seconds after any upstream 429, 30 minutes after a quota error
  and 15 minutes after a key error;
- backs off a city that keeps failing, from 5 minutes up to 2 hours;
- stops calling for the rest of the UTC day after **300 calls** in one process
  (the refresh tiers need about 160).

Calls that can't be made right away are deferred, never queued. A stale reading
keeps being served and is refreshed on a later request. A city with no reading
yet (cold cache) shows "next reading on its way", and open pages poll
`router.refresh()` every 25 seconds until all cities are in (about 8 minutes
from a completely empty cache).

Refresh tiers live in `lib/locations.ts`. `tests/locations.test.ts` asserts that
the worst case stays under 50% of the monthly quota and 35% of the daily quota.

### Data model

- `AirReading` (`lib/air/types.ts`) keeps provenance (`source.provider`,
  `source.resolution`, attribution), the original `observedAt`, our
  `retrievedAt`, the published US and China AQI, the main pollutant, optional
  per-pollutant detail, weather and coordinates. Invalid or missing values are
  `null`, never `0`.
- `LocationStatus` is either `ok` with a reading or `unavailable` with a reason
  (`queued`, `upstream`, `not-found`, `configuration`) that the UI explains.

## Downloads

The Data page (`app/[lang]/(site)/data/page.tsx`) serves two files from
`app/api/data/[file]/route.ts`, each as `.csv` or `.json`:

| File | Contents | Cached at the CDN |
| --- | --- | --- |
| `cities` | Every IQAir city: latest US and China AQI, main pollutant, weather, times, status. The free plan keeps no history, so there are no dates to choose. | 5 minutes |
| `monitors` | School monitor readings, narrowed down by the query below | 1 hour |

```text
/api/data/monitors.csv?monitors=sant,nest&from=2026-11-01&to=2026-11-30&average=day
  monitors   ids, comma-separated or repeated (default: all)
  from, to   Ulaanbaatar dates, both included (default: everything; reversed dates are swapped)
  average    hour | day (default: every reading, as recorded)
```

On the page this is a plain GET form (checkbox per monitor, two date fields, a
detail menu, CSV and JSON buttons), so it works without JavaScript; a monitor's
map popup links to it with that monitor pre-ticked (`/data?monitors=<id>`).
`parseMonitorQuery()` reads the query and answers mistakes (an unknown monitor,
a malformed date) with a 400 that says what's wrong.

Averages (`averageReadings()`) are means per Ulaanbaatar hour or day of PM2.5,
PM10, temperature and humidity, with a `readings` count per period. A missing
value is left out of its mean, never counted as 0. The monitors' own AQI is
never averaged, because an average of AQI values is not an AQI; it appears only
in "every reading" files.

Rows come from `lib/downloads.ts`, where CSV and JSON share one column list.
Missing values are empty cells (CSV) or `null` (JSON), never 0, and times are
given in UTC and local time. CSV starts with a byte-order mark so Excel reads
Mongolian names correctly. Every JSON file carries a description of its rows,
its attribution and its terms: IQAir's (`IQAIR_TERMS`: non-commercial use, for
reference only, not evidence in legal proceedings, cite IQAir) or the
monitors'. Downloads read the same caches as the pages, so they never add IQAir
calls.

## Firebase

The site is hosted on Vercel; Firebase (project `uhaan-3c0ae`, Spark plan)
only stores data. No data comes from Firebase yet; each step below replaces one
source and can be done on its own. Use the Admin SDK on the server only,
through `lib/firebase/admin.ts` (`firestore()`), with the service-account key
in the server-only `FIREBASE_SERVICE_ACCOUNT` environment variable, and never
let the browser talk to Firestore for this data: the site reads everything on
the server.

### 1. Content (schools, people, projects, updates, monitors)

- **Collections** `schools`, `people`, `projects`, `updates`, `monitors`: one
  document per entry with the fields in `content/model.ts`, bilingual text as
  `{ mn, en }` maps, references as slug/id strings, and an optional `order`
  number.
- **Source.** Write `lib/content/firestore-source.ts`. Its `load()` returns each
  collection's documents with their ids, e.g.
  `schools: docs.map((doc) => ({ slug: doc.id, ...doc.data() }))` (`slug` for
  schools and projects, `id` for people, updates and monitors). It does no
  checking or sorting, because `getContent()` validates and orders whatever a
  source returns and leaves out invalid documents instead of breaking a page.
  Point `source` in `lib/content/index.ts` at it.
- **Freshness.** Wrap `load()` in
  `unstable_cache(…, ["content-v1"], { tags: ["content"], revalidate: 300 })`
  so pages pick up edits within five minutes. For instant updates, add a route
  handler that checks a shared secret and calls `revalidateTag("content")`,
  called by a Cloud Function on Firestore writes.
- **Photos.** Upload to Cloud Storage, store the `https://` URL in `photo`,
  `logo` or `image.src`, and allow that host in `images.remotePatterns` in
  `next.config.ts`.
- **Editing.** The Firebase console is enough for a small team from day one. A
  friendlier admin page needs Firebase Auth with an allow-list of editors and
  Firestore rules that let only them write.
- Interface copy (hero, roadmap, buttons) stays in `lib/i18n/dictionaries/`.

### 2. School monitor readings

- **Documents** `monitors/<id>/readings/<observedAt>`, each shaped like
  `MonitorReading`: `observedAt`, `pm25`, `pm10`, `aqiUs`, `temperatureC`,
  `humidityPct`, with `null` for anything not measured.
- **Source.** Write `lib/monitors/firestore-source.ts` implementing
  `MonitorSource` (readings oldest first) and point `source` in
  `lib/monitors/index.ts` at it. For long histories, keep a `latest` document
  per monitor for the map and page through readings for downloads.
- **Existing CSVs.** Upload them once with a small script that reuses
  `parseMonitorCsv()` and batch-writes the results.
- **Live monitors.** Monitors can post readings to a Cloud Function (or a
  route handler) with a per-device secret. Validate every write on the server
  (known monitor, plausible time and ranges, as `lib/monitors/csv.ts` does) and
  never let a device write another monitor's readings.

### 3. City readings (optional)

A scheduled Cloud Function can call `fetchIqairCity()` (`lib/iqair/client.ts`,
framework-free) for each entry in `LOCATIONS`, at least 20 seconds apart, and
write `locations/<slug>/readings/<observedAt>` plus a `latest` document. That
also builds the history the free API can't provide. Then implement
`AirDataProvider` as a `firestoreProvider` that reads the `latest` documents and
select it in `resolveProvider()` (`lib/air/snapshot.ts`); the website then no
longer needs the IQAir key. Keep IQAir's attribution and terms wherever the
data appears.

## Internationalisation

Locales are path segments (`/mn`, `/en`). `proxy.ts` redirects locale-less URLs
to Mongolian. All
interface copy lives in typed dictionaries (`lib/i18n/dictionaries`); `mn.ts`
must match the shape of `en.ts`, and tests check keys, placeholders and script.
Relative times use our own strings, so server and browser output always match.

## Design system

Calm and minimal: soft off-white and off-black (never pure), one quiet blue
accent, one typeface (Geologica, checked glyph by glyph for Mongolian Ө and Ү;
Unbounded and Martian Mono, for instance, lack both despite listing a
"cyrillic-ext" subset). Tokens are CSS variables in `app/globals.css`, exposed
to Tailwind v4 through `@theme inline`; light and dark themes swap them via
`data-theme` on `<html>`, set before first paint by an inline script. AQI
colours come from `data-aqi` attributes (`--band`, `--band-on`, `--band-ink`);
all text colours meet WCAG AA in both themes.

Every page with a header sits on a fixed backdrop
(`components/site-atmosphere.tsx`): a sky tinted by Ulaanbaatar's current band
(`data-sky`) and particles as dense as the air is dirty, fading to 35% as the
visitor scrolls down. It reads `/api/air/capital`, a tiny CDN-cached route
served from the provider's cache, so it never adds IQAir calls. The schools
strip drifts sideways at 24 px/s, turns around at each end, holds while
hovered, focused or scrolled by hand, has a pause button (WCAG 2.2.2) and stays
still under `prefers-reduced-motion`.

The map follows the original prototype: full-bleed, AQI markers over a canvas
glow sized and coloured by each city's reading (`GlowLayer` in
`components/map/network-map.tsx`). At country zoom city markers are dots;
zoomed in they show the number. School monitors are square chips (see "School
monitors"). Leaflet overrides in `globals.css` are prefixed with
`.ut-map.leaflet-container` because `leaflet.css` loads later.
