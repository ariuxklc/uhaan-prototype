import { getMonitorEntries, getNetworkSnapshot } from "@/lib/air/snapshot";
import { cityDataset, localTime, monitorDataset, parseMonitorQuery, toCsv, toJson } from "@/lib/downloads";
import type { Dataset } from "@/lib/downloads";

/**
 * Open-data downloads, used by the Data page's buttons and form:
 *   cities.csv | cities.json       every IQAir city, latest reading
 *   monitors.csv | monitors.json   school monitor readings, optionally filtered:
 *     ?monitors=sant,nest   some monitors (default: all)
 *     &from=2026-11-01&to=2026-11-30   Ulaanbaatar dates, both included
 *     &average=hour | day   means instead of every reading
 * Served from the same caches as the pages, so a download never adds IQAir calls.
 */
const FILE = /^(cities|monitors)\.(csv|json)$/;

const MINUTE = 60;

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const match = FILE.exec((await params).file);
  if (!match) return new Response("Not found", { status: 404 });
  const [, name, format] = match;

  let dataset: Dataset;
  let maxAge: number;
  let dated = false;
  if (name === "cities") {
    dataset = cityDataset((await getNetworkSnapshot()).cities);
    maxAge = 5 * MINUTE;
  } else {
    const entries = await getMonitorEntries();
    const parsed = parseMonitorQuery(
      new URL(request.url).searchParams,
      entries.map((entry) => entry.monitor.id),
    );
    if ("error" in parsed) {
      return new Response(parsed.error, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    dataset = monitorDataset(entries, parsed.query);
    dated = Boolean(parsed.query.from || parsed.query.to);
    // Monitor files only change with a deploy (or, later, a Firestore write).
    maxAge = 60 * MINUTE;
  }

  const generatedAt = new Date().toISOString();
  // Undated downloads are stamped with the day they were made, in Ulaanbaatar.
  const stamp = dated ? "" : `-${localTime(generatedAt, "Asia/Ulaanbaatar").slice(0, 10)}`;
  const csv = format === "csv";
  return new Response(csv ? toCsv(dataset) : toJson(dataset, generatedAt), {
    headers: {
      "Content-Type": csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="utaani-tagnuul-${dataset.name}${stamp}.${format}"`,
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    },
  });
}
