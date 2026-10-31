import type { MonitorColumn, MonitorCsvFormat } from "@/content/model";
import type { MonitorReading } from "@/lib/air/types";

/**
 * Reads one CSV file from a school monitor: an SD-card log or a spreadsheet
 * export. Framework-free, so an upload script or Cloud Function can reuse it.
 *
 * It finds columns by their usual names (or `format.columns`), accepts comma,
 * semicolon or tab separators, and skips rows it can't trust instead of
 * guessing. Values stay exactly as the monitor wrote them: missing or
 * impossible values become `null`, never 0, and no concentration is ever
 * turned into an AQI.
 */

/** The whole file can't be read, e.g. it has no time column. */
export class MonitorCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonitorCsvError";
  }
}

export interface SkippedRow {
  /** 1-based line in the file. */
  line: number;
  reason: string;
}

export interface MonitorCsvResult {
  /** In file order. */
  readings: MonitorReading[];
  skipped: SkippedRow[];
}

/** Times written without an offset are Ulaanbaatar time. */
export const DEFAULT_UTC_OFFSET = "+08:00";

/** Earlier times mean the monitor's clock wasn't set (new boards start in 1970 or 2000). */
const EARLIEST = Date.parse("2020-01-01T00:00:00Z");
/** Slack for a clock that runs a little fast. */
const FUTURE_SLACK_MS = 24 * 60 * 60_000;

type ValueColumn = Exclude<MonitorColumn, "time" | "date">;
type Columns = Partial<Record<MonitorColumn, number>>;

const COLUMNS: readonly MonitorColumn[] = ["time", "date", "pm25", "pm10", "aqi", "temperature", "humidity"];

/** Plausible ranges. Anything outside is a sensor fault and becomes `null`. */
const RANGES: Record<ValueColumn, readonly [number, number]> = {
  pm25: [0, 1000], // the SDS011 reads up to 999.9 µg/m³
  pm10: [0, 1000],
  aqi: [0, 1000],
  temperature: [-60, 60],
  humidity: [0, 100],
};

const MISSING = new Set(["", "nan", "null", "none", "na", "n/a", "-", "--"]);
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const DATE_TIME =
  /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?\s*(z|[+-]\d{2}:?\d{2})?$/i;

/** Recognises the usual header names: "PM2.5 (µg/m³)", "pm2_5", "Timestamp", "RH"… */
function guessColumn(header: string): MonitorColumn | null {
  const name = header
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[\s_-]+/g, "");
  if (/^(timestamp|datetime|time|ts|utc|observedat)$/.test(name)) return "time";
  if (name === "date") return "date";
  const pm = /^pm(\d+(?:[.,]\d+)?)/.exec(name);
  if (pm) {
    const digits = pm[1] ?? "";
    const size = digits === "25" ? 2.5 : Number(digits.replace(",", "."));
    return size === 2.5 ? "pm25" : size === 10 ? "pm10" : null;
  }
  if (/^(aqi|usaqi|aqius)$/.test(name)) return "aqi";
  if (/^(temperature|temp)c?$/.test(name)) return "temperature";
  if (/^(humidity|hum|rh)(pct)?$/.test(name)) return "humidity";
  return null;
}

/** "+08:00" or "+0800" → minutes east of UTC. */
function parseOffset(text: string): number | null {
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  if (minutes > 14 * 60) return null;
  return match[1] === "-" ? -minutes : minutes;
}

/** Unix seconds or milliseconds, or "YYYY-MM-DD HH:mm[:ss]" with an optional offset. */
function parseTime(cell: string, offsetMinutes: number): number | null {
  if (/^\d{9,10}$/.test(cell)) return Number(cell) * 1000;
  if (/^\d{12,13}$/.test(cell)) return Number(cell);

  const match = DATE_TIME.exec(cell);
  if (!match) return null;
  const field = (group: number) => Number(match[group] ?? 0);
  const [year, month, day, hour, minute, second] = [field(1), field(2), field(3), field(4), field(5), field(6)];
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;

  const millis = Math.round(Number(`0.${match[7] ?? "0"}`) * 1000);
  const utc = Date.UTC(year, month - 1, day, hour, minute, second, millis);
  // Date.UTC rolls 31 April over into May; refuse instead.
  if (new Date(utc).getUTCDate() !== day) return null;

  const zone = match[8];
  const zoneMinutes = zone === undefined ? offsetMinutes : zone.toLowerCase() === "z" ? 0 : parseOffset(zone);
  return zoneMinutes === null ? null : utc - zoneMinutes * 60_000;
}

function parseNumber(cell: string, decimalComma: boolean): number | null {
  if (MISSING.has(cell.toLowerCase())) return null;
  const normalized = decimalComma ? cell.replace(",", ".") : cell;
  return NUMBER.test(normalized) ? Number(normalized) : null;
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const line =
    text.split(/\r?\n/, 50).find((candidate) => candidate.trim() !== "" && !candidate.trimStart().startsWith("#")) ??
    "";
  const count = (delimiter: string) => line.split(delimiter).length - 1;
  return ([",", ";", "\t"] as const).reduce((best, delimiter) => (count(delimiter) > count(best) ? delimiter : best));
}

/** Splits one line, honouring "quoted, cells" and "" escapes. */
function splitLine(line: string, delimiter: string): string[] {
  if (!line.includes('"')) return line.split(delimiter);
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells;
}

/** A header row has no cell that reads as a number or a time. */
function isHeader(cells: string[], offset: number, decimalComma: boolean): boolean {
  return cells.every((cell) => parseNumber(cell, decimalComma) === null && parseTime(cell, offset) === null);
}

function resolveColumns(header: string[] | null, configured: MonitorCsvFormat["columns"] = {}): Columns {
  const listed = header ? ` (the headers are: ${header.join(", ")})` : "";
  const columns: Columns = {};

  for (const key of COLUMNS) {
    const wanted = configured[key];
    if (typeof wanted === "number") {
      columns[key] = wanted;
    } else if (typeof wanted === "string") {
      if (!header) throw new MonitorCsvError(`the file has no header row, so csv.columns.${key} must be a column number`);
      const index = header.findIndex((name) => name.toLowerCase() === wanted.trim().toLowerCase());
      if (index < 0) throw new MonitorCsvError(`there is no "${wanted}" column${listed}`);
      columns[key] = index;
    }
  }

  if (header) {
    const taken = new Set(Object.values(columns));
    header.forEach((name, index) => {
      const key = guessColumn(name);
      if (key && columns[key] === undefined && !taken.has(index)) {
        columns[key] = index;
        taken.add(index);
      }
    });
  } else if (Object.keys(columns).length === 0) {
    throw new MonitorCsvError('the file has no header row: add one, e.g. "time,pm25,pm10", or set csv.columns');
  }

  if (columns.time === undefined && columns.date === undefined) {
    throw new MonitorCsvError(`there is no time column${listed}`);
  }
  if (columns.pm25 === undefined && columns.pm10 === undefined && columns.aqi === undefined) {
    throw new MonitorCsvError(`there is no PM2.5, PM10 or AQI column${listed}`);
  }
  return columns;
}

/** One column with the full time, or a date column plus a time-of-day column. */
function readTime(time: string, date: string, offset: number): number | null {
  return (time ? parseTime(time, offset) : null) ?? (date ? parseTime(`${date} ${time}`.trim(), offset) : null);
}

/** One reading, or the reason the row was skipped. */
function readRow(
  cells: string[],
  columns: Columns,
  offset: number,
  decimalComma: boolean,
  now: number,
): MonitorReading | string {
  const cell = (key: MonitorColumn) => {
    const index = columns[key];
    return index === undefined ? "" : (cells[index] ?? "");
  };

  const time = readTime(cell("time"), cell("date"), offset);
  if (time === null) return "unreadable time (use YYYY-MM-DD HH:mm)";
  if (time < EARLIEST) return "the monitor's clock wasn't set";
  if (time > now + FUTURE_SLACK_MS) return "the time is in the future";

  const value = (key: ValueColumn) => {
    const number = parseNumber(cell(key), decimalComma);
    const [min, max] = RANGES[key];
    return number !== null && number >= min && number <= max ? number : null;
  };
  const reading: MonitorReading = {
    observedAt: new Date(time).toISOString(),
    pm25: value("pm25"),
    pm10: value("pm10"),
    aqiUs: value("aqi"),
    temperatureC: value("temperature"),
    humidityPct: value("humidity"),
  };
  if (reading.pm25 === null && reading.pm10 === null && reading.aqiUs === null) {
    return "no usable PM2.5, PM10 or AQI value";
  }
  return reading;
}

/**
 * Parses a monitor's CSV text. Throws `MonitorCsvError` when the file as a
 * whole can't be read; individual bad rows are skipped and listed.
 */
export function parseMonitorCsv(
  text: string,
  format: MonitorCsvFormat = {},
  now: number = Date.now(),
): MonitorCsvResult {
  const offset = parseOffset(format.utcOffset ?? DEFAULT_UTC_OFFSET);
  if (offset === null) throw new MonitorCsvError(`utcOffset "${format.utcOffset}" should look like "+08:00"`);

  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = detectDelimiter(body);
  const decimalComma = delimiter !== ",";
  const lines = body.split(/\r\n|\n|\r/);

  let columns: Columns | null = null;
  const readings: MonitorReading[] = [];
  const skipped: SkippedRow[] = [];

  for (const [index, line] of lines.entries()) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const cells = splitLine(line, delimiter).map((cell) => cell.trim());
    if (!columns) {
      // The first real line is either the header or, in a headerless file, data.
      const header = isHeader(cells, offset, decimalComma) ? cells : null;
      columns = resolveColumns(header, format.columns);
      if (header) continue;
    }
    const result = readRow(cells, columns, offset, decimalComma, now);
    if (typeof result === "string") skipped.push({ line: index + 1, reason: result });
    else readings.push(result);
  }

  if (!columns) throw new MonitorCsvError("the file is empty");
  return { readings, skipped };
}
