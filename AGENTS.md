# AGENTS.md: Utaani Tagnuul (Утааны Тагнуул)

Website of Utaani Tagnuul, a student-led initiative from Sant School that
connects schools in Ulaanbaatar through electronics, environmental projects and
an open air-quality map. Mongolian (`/mn`, default) and English (`/en`). Read
`docs/ARCHITECTURE.md` before changing data flow, caching or rate limiting.

## Product direction

- Minimal and easy on the eyes. Emphasise the project itself (what it is, the
  map, how to join), not surrounding detail. Keep copy short; add text only when
  a visitor needs it.
- The map is one part of the site. Wherever it appears it is shown whole and
  full-bleed, with only small floating controls, as in the original prototype:
  a section on the home page and the full-screen `/map` page.
- Everything the map shows can be downloaded from the Data page (`/data`), with
  its source and terms of use attached.

## Stack

Next.js 16 App Router (React 19, TypeScript strict), Tailwind CSS v4 (tokens in
`app/globals.css`), Leaflet (used directly, no React wrapper), Vitest. One
typeface: Geologica. Hosted on Vercel. No database yet; Firebase (Spark plan,
data only) is planned (see the architecture doc). Don't add state, UI, mapping or data-fetching libraries without a clear
need.

## Critical rules

1. **Data integrity**
   - Show IQAir's published US AQI as is. Never compute, smooth or invent index
     values, and never convert concentrations into an AQI yourself.
   - Missing, invalid or failed values are `null` and render as a dash or a
     status message. Never coerce them to `0`, and never count them as clean.
   - Keep every reading's original `observedAt` and show its age; never make old
     data look current.
   - Keep provenance (`source.provider`, `source.resolution`). Never pool readings
     from different providers anonymously. Sample data
     (`lib/air/sample-provider.ts`) is development-only and must stay labelled.
   - A city-level value is an average for the city. Don't describe it as a
     measurement at a street or the marker's exact point. The map glow is a
     visual aid, not an interpolated surface; the map's info panel says so.
   - School monitor readings are shown as recorded: PM2.5 and PM10 in µg/m³.
     An AQI appears only when the monitor's own CSV has one, and it is labelled
     as the monitor's. Monitors carry `provider: "school-monitor"`,
     `resolution: "station"` and are never pooled with IQAir values.
   - `monitor-data/` holds real readings only. Never commit made-up or sample
     rows there; tests write their fixtures to a temporary folder.
   - Downloads may offer hourly or daily *means* of measured values (PM2.5,
     PM10, temperature, humidity), always with the number of readings behind
     each mean and never counting missing values as 0. Never average AQI values;
     the monitors' own AQI appears only as recorded.

2. **IQAir quota and terms**
   - Free Community plan: 5 calls/min, 500/day, 10,000/month, and in practice no
     two calls within ~12 s. All calls go through `lib/air/iqair-provider.ts`
     (cache, ≥ 20 s between calls, backoff, 300-a-day cap per process).
     Never call `fetchIqairCity` from a page, component or route handler
     directly.
   - Don't use `export const dynamic = "force-dynamic"` on data pages; it bypasses
     `unstable_cache`. Use `await connection()`.
   - Changing refresh tiers in `lib/locations.ts` must keep
     `tests/locations.test.ts` passing (≤ 50% of the monthly quota).
   - Bump `CACHE_VERSION` in the provider when the `AirReading` shape changes.
   - Keep IQAir attribution on the map (attribution control) and in the footer.
     Keep the project non-commercial (no ads or paid features) while on this plan.
   - IQAir's conditions for showing or sharing its data (from IQAir, October
     2026): non-commercial use only; for reference, never as evidence in legal
     proceedings; cite IQAir as the source. Keep them on the Data page, in the
     map's info panel and inside every download (`IQAIR_TERMS` in
     `lib/downloads.ts`).

3. **Secrets and privacy**
   - `IQAIR_API_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`, pass it to
     a client component, or include request URLs in logs or errors (the key is a
     query parameter). `next.config.ts` disables full fetch URLs in logs.
   - `.env.local` is git-ignored; only `.env.example` is committed.
   - Don't publish students' personal details beyond what the team has approved.
     `content/people.ts` lists only people who agreed to be shown (currently the
     founders). `content/schools.ts` lists only approved partners; never publish
     pending partnerships, funding details or internal coordination notes. The
     contact address is configurable via `NEXT_PUBLIC_CONTACT_EMAIL`.
   - Content is factual: no invented projects, members, dates or events. When a
     date is only known to the month or year, store it that way.
   - Photos of people go in `public/media/people/` only with that person's
     agreement. Don't use stock or third-party images (the deck's component
     pictures and background art are not ours to reuse).

4. **Server/client boundaries**
   - Components are Server Components unless they need state, effects or browser
     APIs. Anything importing `leaflet` is a client component loaded through
     `components/map/map-view.tsx` (`dynamic(..., { ssr: false })`).
   - Server-only modules start with `import "server-only"`.
   - Pages get content from `getContent()` (`lib/content`) and resolve links
     between entries with `lib/content/relations.ts`. Don't import the arrays in
     `content/*.ts` anywhere except `lib/content/static-source.ts` and tests;
     that single source is where Firebase plugs in.
   - Monitor readings come from `getMonitorReadings()` (`lib/monitors`), usually
     through `getNetworkSnapshot()` or `getMonitorEntries()`. Only
     `lib/monitors/csv-source.ts` reads `monitor-data/`; that source is where
     Firestore plugs in.
   - Time-dependent text must hydrate cleanly: pass the server's `renderedAt`
     (`snapshot.assembledAt`) to `RelativeTime`.

5. **Internationalisation**
   - Every user-facing string exists in both `lib/i18n/dictionaries/en.ts` and
     `mn.ts` (the type system and `tests/i18n.test.ts` enforce matching keys and
     placeholders).
   - Don't interpolate city names into Mongolian phrases that need a case ending
     (…-ийн, …-д); rephrase instead.

6. **Accessibility and design**
   - Never rely on colour alone: every AQI colour comes with its value or band
     name as text (markers carry an `aria-label`). Text colours must meet WCAG AA
     in both themes; check new colours.
   - Respect `prefers-reduced-motion`. Keep visible focus styles and the skip link.
   - Anything that moves on its own (the schools strip) holds while hovered,
     focused or touched, has a pause button, and stays still for reduced motion.
   - Use the design tokens (`bg-bg`, `text-ink-2`, `glass`, `data-aqi` + `band-*`)
     rather than raw colours.
   - Any font must actually contain Mongolian Ө and Ү (U+04E8, U+04AE and their
     lowercase forms). Check the glyphs; Google's "cyrillic-ext" subset label is
     not enough.

## Layout

```text
app/[lang]/(site)/    home, projects, schools, team, updates, data (header and footer)
app/[lang]/map/       full-screen map (no header or footer)
app/[lang]/           root layout, not-found, error, OG image
app/api/air/capital/  capital's AQI band for the site-wide backdrop (CDN-cached)
app/api/data/[file]/  downloads (cities, monitors, monitor-<id>; .csv or .json)
components/           UI; map/ holds the Leaflet map (markers + glow) and its view
content/              schools, people, projects, updates, monitors; typed, bilingual
monitor-data/         school monitor CSVs, one folder per monitor id (see its README)
lib/content/          content source (static today, Firestore later), validation, relations
lib/monitors/         monitor CSV parser and source (CSV today, Firestore later)
lib/firebase/         server-only Firebase Admin app and Firestore
lib/iqair/            framework-free IQAir client, parser, errors, rate limiter
lib/air/              reading types, IQAir/sample providers, request snapshot
lib/view-model.ts     serialisable city and station summaries for the map
lib/map-props.ts      snapshot → map props (cities, stations, labels, status)
lib/downloads.ts      download rows, CSV/JSON writers, terms of use
lib/i18n/             locales, dictionaries, route helpers
lib/aqi.ts            US AQI bands and colours
lib/locations.ts      the 22 IQAir cities, identifiers, refresh tiers, geo helpers
proxy.ts              locale redirect + remembered-locale cookie
tests/                Vitest unit tests
```

## Validation

Run before finishing any change:

```bash
npm run check   # next typegen + tsc, eslint, vitest
npm run build
```

Don't silence errors with `any`, `@ts-ignore` or disabled lint rules. If a
command can't run (missing network or key), say so.
