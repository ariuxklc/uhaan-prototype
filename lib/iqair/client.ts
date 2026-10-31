import { IqairError } from "@/lib/iqair/errors";
import { parseCityResponse } from "@/lib/iqair/parse";
import type { ParsedCityObservation } from "@/lib/iqair/parse";
import type { MongoliaLocation } from "@/lib/locations";

const IQAIR_API_BASE = "https://api.airvisual.com/v2";
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Fetches current city-level data from IQAir's `/v2/city` endpoint.
 *
 * Framework-agnostic on purpose: caching and pacing live in the caller, so a
 * scheduled ingestion job can reuse this unchanged.
 */
export async function fetchIqairCity(
  location: Pick<MongoliaLocation, "iqair">,
  apiKey: string,
  init: { signal?: AbortSignal } = {},
): Promise<ParsedCityObservation> {
  const url = new URL(`${IQAIR_API_BASE}/city`);
  url.searchParams.set("city", location.iqair.city);
  url.searchParams.set("state", location.iqair.state);
  url.searchParams.set("country", location.iqair.country);
  url.searchParams.set("key", apiKey);

  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown";
    throw new IqairError("upstream", `IQAir request failed (${reason}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.status === 429) throw new IqairError("rate-limited", "IQAir: HTTP 429");
    throw new IqairError("upstream", `IQAir returned non-JSON (HTTP ${response.status}).`);
  }

  // IQAir reports most failures in the JSON body, sometimes with a 4xx status.
  return parseCityResponse(payload);
}
