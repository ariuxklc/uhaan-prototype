import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DownloadIcon } from "@/components/icons";
import { PageIntro } from "@/components/page-intro";
import { localize } from "@/content/model";
import { getNetworkSnapshot } from "@/lib/air/snapshot";
import type { MonitorEntry } from "@/lib/air/snapshot";
import { localTime } from "@/lib/downloads";
import { formatDay, interpolate } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getSiteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ lang: string }>;
  /** `?monitors=sant` pre-selects monitors, e.g. from a map popup. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateMetadata({ params }: Props) {
  return pageMetadata(params, "/data", (dict) => ({
    title: dict.dataPage.title,
    description: dict.dataPage.intro,
  }));
}

const DAY_MS = 24 * 60 * 60_000;
const ulaanbaatarDay = (iso: string) => localTime(iso, "Asia/Ulaanbaatar").slice(0, 10);

const field =
  "mt-1.5 block h-11 w-full rounded-xl bg-surface px-3 text-[0.9375rem] text-ink shadow-[inset_0_0_0_1px_var(--line)]";

/** "1,204 readings · 2 Nov 2026 – 9 Nov 2026". Readings are oldest first. */
function monitorDetail({ readings }: MonitorEntry, locale: Locale, dict: Dictionary): string {
  const first = formatDay(readings[0]?.observedAt ?? "", locale);
  const last = formatDay(readings.at(-1)?.observedAt ?? "", locale);
  const count = interpolate(dict.dataPage.readings, { n: readings.length.toLocaleString("en-US") });
  return `${count} · ${first === last ? first : `${first} – ${last}`}`;
}

export default async function DataPage({ params, searchParams }: Props) {
  // City readings change hourly; render per request from the shared data cache.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const snapshot = await getNetworkSnapshot();

  const monitors = snapshot.monitors.filter((entry) => entry.readings.length > 0);
  const requested = [(await searchParams).monitors ?? []].flat().flatMap((value) => value.split(","));
  const isChecked = (id: string) => requested.length === 0 || requested.includes(id);
  const firstDay = monitors.map((entry) => ulaanbaatarDay(entry.readings[0]!.observedAt)).sort()[0];
  const lastDay = monitors.map((entry) => ulaanbaatarDay(entry.readings.at(-1)!.observedAt)).sort().at(-1);

  const modeNote =
    snapshot.mode === "sample" ? dict.map.sample : snapshot.mode === "unconfigured" ? dict.map.unconfigured : null;
  const monitorTitle = ({ monitor, school }: MonitorEntry) => {
    const name = school ? localize(school.name, lang) : monitor.id;
    return monitor.label ? `${name} · ${localize(monitor.label, lang)}` : name;
  };

  // A working example for the API section: the last week, as daily averages.
  const exampleTo = ulaanbaatarDay(new Date(snapshot.assembledAt).toISOString());
  const exampleFrom = ulaanbaatarDay(new Date(snapshot.assembledAt - 6 * DAY_MS).toISOString());
  const exampleIds = snapshot.monitors.slice(0, 2).map((entry) => entry.monitor.id);
  const exampleUrl = new URL(
    `/api/data/monitors.csv?monitors=${exampleIds.join(",")}&from=${exampleFrom}&to=${exampleTo}&average=day`,
    getSiteUrl(),
  ).toString();

  return (
    <>
      <PageIntro title={dict.dataPage.title} intro={dict.dataPage.intro} />

      <div className="mx-auto w-full max-w-6xl space-y-16 px-5 pb-28 sm:px-8">
        <section aria-labelledby="cities-title">
          <h2 id="cities-title" className="eyebrow">
            {dict.dataPage.citiesHeading}
          </h2>
          <div className="mt-6 flex flex-col gap-4 border-y border-line py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-2xl">
              <h3 className="text-xl font-semibold tracking-[-0.02em]">{dict.dataPage.citiesTitle}</h3>
              <p className="mt-1 text-sm text-ink-3">
                {dict.dataPage.citiesDetail}
                {modeNote && ` ${modeNote}.`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {(["csv", "json"] as const).map((format) => (
                <a
                  key={format}
                  href={`/api/data/cities.${format}`}
                  download
                  aria-label={interpolate(dict.dataPage.download, {
                    name: dict.dataPage.citiesTitle,
                    format: format.toUpperCase(),
                  })}
                  className="button button-quiet h-10 px-4 text-sm"
                >
                  <DownloadIcon className="size-4" />
                  {format.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="monitors-title">
          <h2 id="monitors-title" className="eyebrow scroll-mt-28">
            {dict.dataPage.monitorsHeading}
          </h2>
          {monitors.length > 0 ? (
            // A plain GET form: the browser builds the download address itself, so it needs no JavaScript.
            <form action="/api/data/monitors.csv" method="get" className="mt-6">
              <fieldset>
                <legend className="sr-only">{dict.dataPage.chooseMonitors}</legend>
                <ul className="border-t border-line">
                  {monitors.map((entry) => (
                    <li key={entry.monitor.id} className="border-b border-line">
                      <label className="flex cursor-pointer items-start gap-4 py-5">
                        <input
                          type="checkbox"
                          name="monitors"
                          value={entry.monitor.id}
                          defaultChecked={isChecked(entry.monitor.id)}
                          className="mt-1 size-5 shrink-0 accent-accent"
                        />
                        <span className="min-w-0">
                          <span className="block text-xl font-semibold tracking-[-0.02em]">{monitorTitle(entry)}</span>
                          <span className="mt-1 block text-sm text-ink-3">{monitorDetail(entry, lang, dict)}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <label className="text-sm text-ink-2">
                  {dict.dataPage.from}
                  <input type="date" name="from" min={firstDay} max={lastDay} className={field} />
                </label>
                <label className="text-sm text-ink-2">
                  {dict.dataPage.to}
                  <input type="date" name="to" min={firstDay} max={lastDay} className={field} />
                </label>
                <label className="text-sm text-ink-2">
                  {dict.dataPage.detail}
                  <select name="average" defaultValue="" className={field}>
                    <option value="">{dict.dataPage.everyReading}</option>
                    <option value="hour">{dict.dataPage.hourly}</option>
                    <option value="day">{dict.dataPage.daily}</option>
                  </select>
                </label>
              </div>
              <p className="mt-3 text-sm text-ink-3">{dict.dataPage.hint}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <button type="submit" className="button button-primary">
                  <DownloadIcon className="size-4" />
                  {dict.dataPage.downloadCsv}
                </button>
                <button type="submit" formAction="/api/data/monitors.json" className="button button-quiet">
                  <DownloadIcon className="size-4" />
                  {dict.dataPage.downloadJson}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-6 rounded-3xl border border-dashed border-line p-8 text-ink-2">
              {dict.dataPage.monitorsEmpty}
            </p>
          )}
        </section>

        <section aria-labelledby="terms-title" className="rounded-3xl bg-surface p-8 sm:p-10">
          <h2 id="terms-title" className="text-lg font-semibold">
            {dict.dataPage.termsTitle}
          </h2>
          <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-ink-2 marker:text-ink-3">
            {dict.dataPage.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-3">
            {dict.dataPage.official}{" "}
            <a href="https://agaar.gov.mn/web" target="_blank" rel="noopener noreferrer" className="link text-ink-2">
              agaar.gov.mn
            </a>
          </p>
        </section>

        <details className="rounded-3xl border border-line px-6 py-5 sm:px-8">
          <summary className="cursor-pointer font-semibold">{dict.dataPage.api.title}</summary>
          <div className="mt-4 space-y-4 text-sm text-ink-2">
            <p>{dict.dataPage.api.intro}</p>
            <pre className="overflow-x-auto rounded-xl bg-surface p-4 text-xs text-ink">
              <code>{exampleUrl}</code>
            </pre>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
              <dt>
                <code>cities.csv</code>, <code>cities.json</code>
              </dt>
              <dd className="text-ink-3">{dict.dataPage.api.cities}</dd>
              <dt>
                <code>monitors.csv</code>, <code>monitors.json</code>
              </dt>
              <dd className="text-ink-3">{dict.dataPage.api.monitors}</dd>
              <dt>
                <code>monitors=</code>
              </dt>
              <dd className="text-ink-3">
                {interpolate(dict.dataPage.api.ids, {
                  ids: snapshot.monitors.map((entry) => entry.monitor.id).join(", "),
                })}
              </dd>
              <dt>
                <code>from=</code>, <code>to=</code>
              </dt>
              <dd className="text-ink-3">{dict.dataPage.api.range}</dd>
              <dt>
                <code>average=</code>
              </dt>
              <dd className="text-ink-3">{dict.dataPage.api.average}</dd>
            </dl>
          </div>
        </details>
      </div>
    </>
  );
}
