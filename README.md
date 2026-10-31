# Утааны Тагнуул · Utaani Tagnuul

Website for Utaani Tagnuul, a student-led initiative from Sant School that
connects schools across Ulaanbaatar through electronics, environmental projects
and an open air-quality map. Mongolian (`/mn`, default) and English (`/en`).

| Page | What it shows |
| --- | --- |
| Home (`/[lang]`) | The project, the live map as a full-bleed section, what we do, schools, team, roadmap, how to join |
| Projects, Schools, Team, Updates | Short pages built from the files in `content/` |
| Data (`/[lang]/data`) | Downloads (CSV and JSON) with the terms of use: the latest reading of every city, and school monitor readings filtered by monitor and dates, as recorded or as hourly/daily averages. Every download is also a plain URL for scripts. |
| Map (`/[lang]/map`) | The map on its own, full screen: IQAir's US AQI for Ulaanbaatar and the 21 aimag centres, plus our school monitors once they're online |

## How do I…

| I want to… | Do this |
| --- | --- |
| Add a school | Add it to `content/schools.ts`, once the partnership is approved. |
| Add a person | Add them to `content/people.ts`, only once they agree to be listed. |
| Add a project | Add it to `content/projects.ts` (`status`: `done`, `active` or `planned`). |
| Add a presentation, workshop, media appearance or event | Add it to `content/updates.ts` with `kind` set to `presentation`, `workshop`, `media` or `event`, and a `"YYYY-MM"` or `"YYYY"` date. Set `upcoming: true` for planned ones. |
| Add school monitor readings | Copy the CSV files into `monitor-data/<monitor>/`. Details: [monitor-data/README.md](monitor-data/README.md). |
| Put a monitor on the map | Set its `location` in `content/monitors.ts`. |
| Add another monitor | Add it to `content/monitors.ts` and create a folder with the same `id` in `monitor-data/`. |
| Add a photo or logo | See [Photos and logos](#photos-and-logos). |
| Change text on the site (buttons, headings) | Edit both `lib/i18n/dictionaries/en.ts` and `mn.ts`. |
| Move content and readings to Firebase | Follow "Firebase" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#firebase). Nothing else in the site changes. |

Then run `npm test`. It checks that every entry is complete in both languages,
only refers to schools and people that exist, that every image is really in
`public/media/`, and that every monitor CSV can be read. A mistake shows up as a
failing test naming the file and the problem, not as a broken page. (On the
live site, an invalid entry is left out and logged rather than breaking a page.)

### Photos and logos

Put images in `public/media/` and point to them from the content files:

| What | Folder | Field | Tips |
| --- | --- | --- | --- |
| Faces | `public/media/people/` | `photo` in `people.ts` | Portrait (4:5), at least 800px tall. Only with the person's OK. |
| School logos | `public/media/schools/` | `logo` in `schools.ts` | Square, transparent PNG or SVG. |
| Project photos | `public/media/projects/` | `image` in `projects.ts` | Cut-outs look best on the soft background. |
| Event photos | `public/media/updates/` | `image` in `updates.ts` | Landscape (16:9). |

For example, `photo: "/media/people/ariunbayar.jpg"`. Until a photo or logo is
added, nothing is shown in its place: no initials, monograms or icon covers.
Images are resized and converted automatically by Next.js.

## Quick start

```bash
npm install
cp .env.example .env.local   # then add your IQAir key
npm run dev
```

No key? In development the site uses clearly labelled **sample data** for the
cities. Set `UT_DATA_SOURCE=sample` to use it even with a key (saves API quota).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (Vitest), including the checks above |
| `npm run check` | Route types + `tsc`, ESLint, tests |

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `IQAIR_API_KEY` | Yes, in production | Server-only. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public origin for canonical URLs, sitemap and social cards. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Where "Write to us" goes. Defaults to the communications lead. |
| `NEXT_PUBLIC_CARTO_API_KEY` | No | CARTO basemap key (public by nature). Defaults to the project's key. |
| `UT_DATA_SOURCE` | No | `sample` forces sample city data in development. Ignored in production. |

## How it fits together

Three kinds of data, each read through one function:

| Data | Lives in | Read with |
| --- | --- | --- |
| Schools, people, projects, updates, monitors | `content/*.ts` | `getContent()` (`lib/content`) |
| What each school monitor recorded | `monitor-data/<monitor>/*.csv` | `getMonitorReadings()` (`lib/monitors`) |
| Current US AQI for 22 cities | IQAir's API, cached | `getNetworkSnapshot()` (`lib/air/snapshot.ts`), which also gathers the monitors |

Each one has a single "source" line where Firebase plugs in later. The full
picture, with folders and the Firebase steps, is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

City readings come from IQAir's free **Community** plan (city-level US AQI;
station data needs a paid plan): 5 calls/minute, 500/day, 10,000/month, and in
practice no two calls within ~12 seconds. The site caches each city
(Ulaanbaatar hourly, Erdenet and Darkhan every 2 hours, the rest every 4),
serves the last good reading while refreshing, waits at least 20 seconds
between calls, backs off when IQAir says no, and stops for the day after 300
calls: about 4,900 calls a month (49%) at worst, checked by a test. Deploy
somewhere with a shared, persistent data cache (Vercel, or one long-running
`next start`).

## Attribution and terms

Air-quality data © [IQAir](https://www.iqair.com), used under the AirVisual API
Community plan. IQAir's conditions, as they gave them to the project: the data
is for **non-commercial** use only, is provided **for reference** and must not
be used as evidence in legal proceedings, and anyone who displays or shares it
must **cite IQAir as the source**. The site shows this on the map, in the
footer, on the Data page and inside every download; keep it if you fork the
project, and keep the site non-commercial (no ads or paid features).

School monitor readings come from low-cost sensors: indicative, not official
measurements. Map © OpenStreetMap contributors, © CARTO. Not an official source
and not affiliated with IQAir or any government agency; official monitoring is
at [agaar.gov.mn](https://agaar.gov.mn/web) (the national air-quality system)
and [agaar.mn](https://agaar.mn).
