import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

import { createCsvSource } from "@/lib/monitors/csv-source";

// A throwaway folder, so the tests never touch the real monitor-data/.
const dir = mkdtempSync(join(tmpdir(), "monitor-data-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function write(monitor: string, name: string, text: string) {
  mkdirSync(join(dir, monitor), { recursive: true });
  writeFileSync(join(dir, monitor, name), text);
}

describe("CSV monitor source", () => {
  const source = createCsvSource(dir);

  it("has no readings for a monitor without a folder", async () => {
    expect(await source.readings({ id: "nobody", school: "sant" })).toEqual([]);
  });

  it("merges a monitor's files oldest first, the later file winning a shared time", async () => {
    write("sant", "a.csv", "time,pm25\n2026-10-02 08:01,2\n2026-10-02 08:00,1\n");
    write("sant", "b.csv", "time,pm25\n2026-10-02 08:01,20\n2026-10-02 08:02,3\n");
    const readings = await source.readings({ id: "sant", school: "sant" });
    expect(readings.map((reading) => [reading.observedAt, reading.pm25])).toEqual([
      ["2026-10-02T00:00:00.000Z", 1],
      ["2026-10-02T00:01:00.000Z", 20],
      ["2026-10-02T00:02:00.000Z", 3],
    ]);
  });

  it("skips a file it can't read and says why, keeping the others", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    write("nest", "good.csv", "time,pm10\n2026-10-02 08:00,40\n");
    write("nest", "notes.csv", "when,dust\n1,2\n");
    expect(await source.readings({ id: "nest", school: "nest" })).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("nest/notes.csv was not read: there is no time column"),
    );
    warn.mockRestore();
  });

  it("picks up files added while the site is running", async () => {
    write("hobby", "1.csv", "time,pm25\n2026-10-02 08:00,1\n");
    expect(await source.readings({ id: "hobby", school: "hobby" })).toHaveLength(1);
    write("hobby", "2.csv", "time,pm25\n2026-10-02 09:00,2\n");
    expect(await source.readings({ id: "hobby", school: "hobby" })).toHaveLength(2);
  });
});
