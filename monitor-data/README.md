# School monitor data

Every school monitor has a folder here, named after its `id` in
`content/monitors.ts`:

| Folder | School |
| --- | --- |
| `sant/` | Sant School |
| `nest/` | Nest School |
| `ub-elite/` | UB Elite School |
| `hobby/` | Hobby School |
| `orchlon/` | Orchlon School |
| `oyunlag/` | Oyunlag School |
| `ub-empathy/` | UB Empathy School |

## Adding readings

1. Copy the monitor's CSV files into its folder (straight from the SD card is
   fine). Any file names; add more files whenever you like.
2. Run `npm test`. It names any file that can't be read, and why.
3. Deploy. The readings appear on the Data page (`/data`) straight away, and on
   the map once the monitor has a `location` in `content/monitors.ts`:

   ```ts
   { id: "sant", school: "sant", location: { lat: 47.9, lng: 106.9 } }, // ← the monitor's real spot
   ```

   To get the numbers, right-click the spot in Google Maps and click the
   coordinates at the top of the menu to copy them (latitude first).

Rows the site can't trust are skipped (the server log says how many and why),
never shown: unreadable times, a clock that was never set (new boards start in
1970 or 2000), times in the future, and rows with no usable value. Impossible
values (negative, or beyond the sensor's range) become empty, never 0. If two
files contain the same time, the later file by name wins.

## What a file should look like

A header row, then one reading per line:

```csv
time,pm25,pm10
2026-11-02 08:00:00,35.2,48.0
2026-11-02 08:01:00,36.0,49.1
```

- **Time** (required): a `time`, `timestamp` or `datetime` column, or separate
  `date` and `time` columns. Dates go year first (`2026-11-02`, `2026/11/02` or
  `2026.11.02`); day-first dates are refused because `02/11` is ambiguous.
  Times without an offset are read as Ulaanbaatar time (UTC+8). A trailing `Z`
  or `+08:00` is respected, and Unix timestamps work too.
- **Values** (at least one): `pm25` (also `pm2.5`, `pm2_5`, `PM2.5 (µg/m³)`),
  `pm10`, and `aqi` only if the monitor computes one itself. PM values are in
  µg/m³.
- **Optional**: `temperature` (°C) and `humidity` (%).
- Commas, semicolons or tabs all work, and so does a decimal comma with
  semicolons (`35,2`).

The site shows PM values exactly as measured and never converts them into an
AQI. An AQI appears only when the monitor's own file has an `aqi` column, and
it is labelled as the monitor's.

## Different headers, or no header

Give the monitor its column names in `content/monitors.ts`:

```ts
{ id: "nest", school: "nest", csv: { columns: { time: "Date Time", pm25: "Dust 2.5" } } },
```

For files without a header row, give column numbers, counting from 0:

```ts
{ id: "hobby", school: "hobby", csv: { columns: { time: 0, pm25: 1, pm10: 2 } } },
```

If a monitor's clock is set to another time zone, add `utcOffset`, e.g.
`csv: { utcOffset: "+00:00" }` for UTC.

## Another monitor

Add an entry to `content/monitors.ts` and a folder here with the same `id`. A
second monitor at the same school gets its own id and a `label`:

```ts
{ id: "sant-roof", school: "sant", label: { mn: "Дээвэр", en: "Rooftop" } },
```

## Later: Firebase

When readings move to Firestore (`monitors/<id>/readings`), these files can be
uploaded once with the same parser, `lib/monitors/csv.ts`. See
`docs/ARCHITECTURE.md`.
