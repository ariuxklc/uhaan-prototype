import { afterEach, describe, expect, it, vi } from "vitest";

import realPayload from "@/tests/fixtures/iqair-city.json";
import { fetchIqairCity } from "@/lib/iqair/client";
import { classifyIqairMessage, IqairError } from "@/lib/iqair/errors";
import { parseCityResponse } from "@/lib/iqair/parse";
import { getLocation } from "@/lib/locations";

/** The fixture, loosened so tests can delete and corrupt fields. */
interface MutablePayload {
  status: string;
  data: {
    current?: {
      pollution: Record<string, unknown>;
      weather?: Record<string, unknown>;
    };
    units?: Record<string, string>;
  };
}

function mutable(): MutablePayload {
  return JSON.parse(JSON.stringify(realPayload)) as MutablePayload;
}

describe("parseCityResponse", () => {
  it("parses a real /v2/city payload (Community plan)", () => {
    const parsed = parseCityResponse(realPayload);
    expect(parsed).toEqual({
      observedAt: "2026-10-09T15:00:00.000Z",
      aqiUs: 154,
      aqiCn: 88,
      mainPollutantUs: "pm25",
      pollutants: null,
      weather: {
        observedAt: "2026-10-09T15:00:00.000Z",
        temperatureC: 5,
        feelsLikeC: 5,
        humidityPct: 37,
        pressureHpa: 993,
        windSpeedMs: 1.94,
        windFromDeg: 149,
        icon: "01n",
      },
      coordinates: { lat: 47.90771, lng: 106.88324 },
    });
  });

  it("keeps missing weather fields as null, never zero", () => {
    const payload = mutable();
    delete payload.data.current!.weather!.tp;
    payload.data.current!.weather!.hu = null;
    payload.data.current!.weather!.ws = "fast";
    const parsed = parseCityResponse(payload);
    expect(parsed.weather?.temperatureC).toBeNull();
    expect(parsed.weather?.humidityPct).toBeNull();
    expect(parsed.weather?.windSpeedMs).toBeNull();
    expect(parsed.weather?.pressureHpa).toBe(993);
  });

  it("drops implausible values instead of displaying them", () => {
    const payload = mutable();
    payload.data.current!.weather!.tp = 140;
    payload.data.current!.weather!.hu = 180;
    payload.data.current!.pollution.aqicn = -4;
    const parsed = parseCityResponse(payload);
    expect(parsed.weather?.temperatureC).toBeNull();
    expect(parsed.weather?.humidityPct).toBeNull();
    expect(parsed.aqiCn).toBeNull();
  });

  it("returns null weather when the block is absent", () => {
    const payload = mutable();
    delete payload.data.current!.weather;
    expect(parseCityResponse(payload).weather).toBeNull();
  });

  it("rejects payloads without a usable US AQI or timestamp", () => {
    for (const mutate of [
      (p: MutablePayload) => delete p.data.current!.pollution.aqius,
      (p: MutablePayload) => (p.data.current!.pollution.aqius = null),
      (p: MutablePayload) => (p.data.current!.pollution.ts = "yesterday-ish"),
      (p: MutablePayload) => delete p.data.current,
    ]) {
      const payload = mutable();
      mutate(payload);
      expect(() => parseCityResponse(payload)).toThrowError(IqairError);
    }
  });

  it("reads per-pollutant detail when a paid plan provides it", () => {
    const payload = mutable();
    payload.data.current!.pollution.p2 = { conc: 61.2, aqius: 154, aqicn: 84 };
    payload.data.current!.pollution.co = { conc: 1.1, aqius: 12 };
    payload.data.units = { p2: "ugm3", co: "ppm" };
    const parsed = parseCityResponse(payload);
    expect(parsed.pollutants).toEqual({
      pm25: { concentration: 61.2, unit: "µg/m³", aqiUs: 154 },
      co: { concentration: 1.1, unit: "ppm", aqiUs: 12 },
    });
  });

  it("maps API error codes to error kinds", () => {
    const fail = (message: string) => ({ status: "fail", data: { message } });
    const kindOf = (payload: unknown) => {
      try {
        parseCityResponse(payload);
      } catch (error) {
        return (error as IqairError).kind;
      }
      return "none";
    };
    expect(kindOf(fail("call_limit_reached"))).toBe("rate-limited");
    expect(kindOf(fail("too_many_requests"))).toBe("rate-limited");
    expect(kindOf(fail("incorrect_api_key"))).toBe("configuration");
    expect(kindOf(fail("permission_denied (you don't have access to this endpoint"))).toBe("configuration");
    expect(kindOf(fail("city_not_found"))).toBe("not-found");
    expect(kindOf(fail("something_new"))).toBe("upstream");
    expect(kindOf("<html>")).toBe("upstream");
  });

  it("classifies messages case-insensitively", () => {
    expect(classifyIqairMessage("CALL_LIMIT_REACHED")).toBe("rate-limited");
  });
});

describe("fetchIqairCity", () => {
  const location = getLocation("ulaanbaatar")!;
  const secret = "test-key-123";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the city by its IQAir identifiers", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(realPayload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const parsed = await fetchIqairCity(location, secret);
    expect(parsed.aqiUs).toBe(154);
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toBe("/v2/city");
    expect(url.searchParams.get("city")).toBe("Ulaanbaatar");
    expect(url.searchParams.get("state")).toBe("Ulaanbaatar");
    expect(url.searchParams.get("country")).toBe("Mongolia");
  });

  it("treats HTTP 429 as rate limiting", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    await expect(fetchIqairCity(location, secret)).rejects.toMatchObject({ kind: "rate-limited" });
  });

  it("never puts the API key in error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError(`fetch failed for https://api.airvisual.com/v2/city?key=${secret}`);
      }),
    );
    const error = await fetchIqairCity(location, secret).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(IqairError);
    expect((error as Error).message).not.toContain(secret);
  });
});
