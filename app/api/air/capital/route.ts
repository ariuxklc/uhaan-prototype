import { getCapitalStatus } from "@/lib/air/snapshot";
import { getAqiCategory } from "@/lib/aqi";

/**
 * Ulaanbaatar's current band, for the site backdrop on otherwise static pages.
 * Reads the same cached reading as the pages (no extra IQAir calls) and is
 * cached by the CDN for five minutes.
 */
export async function GET() {
  const status = await getCapitalStatus();
  const aqi = status.state === "ok" ? status.reading.aqiUs : null;
  return Response.json(
    { aqi, band: getAqiCategory(aqi)?.id ?? "none" },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
