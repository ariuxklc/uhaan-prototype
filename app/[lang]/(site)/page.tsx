import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { CSSProperties } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar } from "@/components/avatar";
import { AirIcon, ArrowRightIcon, ChipIcon, DataIcon, ExpandIcon, NetworkIcon } from "@/components/icons";
import { LiveReading } from "@/components/live-reading";
import { MapView } from "@/components/map/map-view";
import { ProjectCard } from "@/components/project-card";
import { Scroller } from "@/components/scroller";
import { localize } from "@/content/model";
import { getNetworkSnapshot } from "@/lib/air/snapshot";
import { getContent } from "@/lib/content";
import { schoolHue, schoolProjects } from "@/lib/content/relations";
import { interpolate } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { href } from "@/lib/i18n/routes";
import { DEFAULT_LOCATION_SLUG } from "@/lib/locations";
import { buildMapProps, countQueued } from "@/lib/map-props";
import type { Hue } from "@/lib/palette";
import { CONTACT_EMAIL } from "@/lib/site";

/** Stage 1 runs until the end of 2026; Stage 2 starts in January 2027. */
const STAGE_TWO_STARTS = Date.parse("2027-01-01T00:00:00+08:00");

const PILLAR_ICONS = [NetworkIcon, ChipIcon, AirIcon, DataIcon];
const PILLAR_HUES: Hue[] = ["teal", "amber", "blue", "violet"];

const delay = (index: number) => ({ "--i": index }) as CSSProperties;

const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const sectionTitle = "text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  // Readings change hourly; render per request from the shared data cache.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const [snapshot, content] = await Promise.all([getNetworkSnapshot(), getContent()]);
  const renderedAt = snapshot.assembledAt;
  const capital =
    snapshot.cities.find((entry) => entry.location.slug === DEFAULT_LOCATION_SLUG) ?? snapshot.cities[0]!;
  const map = buildMapProps(snapshot, lang, dict);
  const currentStage = renderedAt < STAGE_TWO_STARTS ? 1 : 2;
  const featured = content.projects.find((project) => project.featured) ?? content.projects[0];
  const otherProjects = content.projects.filter((project) => project !== featured);
  const founders = content.people.filter((person) => person.founder);

  return (
    <>
      {/* The sky and particles behind this come from the site-wide backdrop. */}
      <section>
        <div className={`${container} flex min-h-[88svh] flex-col justify-end gap-12 pb-14 pt-28 sm:pb-20 md:flex-row md:items-end md:justify-between`}>
          <div className="max-w-2xl">
            <p className="eyebrow reveal">{dict.hero.eyebrow}</p>
            <h1
              className="reveal mt-4 text-[clamp(2.6rem,7.5vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]"
              style={delay(1)}
            >
              {dict.hero.title}
            </h1>
            <p className="reveal mt-6 max-w-xl text-[1.125rem] text-ink-2" style={delay(2)}>
              {dict.hero.lead}
            </p>
            <div className="reveal mt-9 flex flex-wrap gap-3" style={delay(3)}>
              <Link href={href(lang, "/map")} className="button button-primary">
                {dict.hero.ctaMap}
                <ArrowRightIcon className="size-4" />
              </Link>
              <a href="#join" className="button button-quiet">
                {dict.hero.ctaJoin}
              </a>
            </div>
          </div>

          <div className="reveal shrink-0" style={delay(4)}>
            <LiveReading entry={capital} locale={lang} dict={dict} renderedAt={renderedAt} />
          </div>
        </div>
      </section>

      {/* Projects lead: they are what the initiative is about. */}
      <section aria-labelledby="projects-title" className={`${container} py-20 sm:py-28`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="projects-title" className={sectionTitle}>
              {dict.projectsSection.title}
            </h2>
            <p className="mt-2 text-ink-2">{dict.projectsSection.intro}</p>
          </div>
          <Link href={href(lang, "/projects")} className="button button-quiet">
            {dict.projectsSection.all}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {featured && (
          <div className="mt-12 rounded-[2rem] bg-surface p-5 sm:p-8 lg:p-10">
            <ProjectCard project={featured} content={content} locale={lang} dict={dict} large linkToDetails />
          </div>
        )}

        <ul className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {otherProjects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} content={content} locale={lang} dict={dict} linkToDetails />
            </li>
          ))}
        </ul>
      </section>

      {/* The map, edge to edge, with nothing around it. */}
      <section aria-labelledby="map-title">
        <MapView
          variant="embedded"
          className="h-[78svh] min-h-[26rem]"
          {...map}
          lead={
            <div className="glass max-w-xs rounded-2xl px-4 py-3">
              <h2 id="map-title" className="text-base font-semibold">
                {dict.mapSection.title}
              </h2>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-3">
                {map.stations.length > 0 ? dict.mapSection.noteWithMonitors : dict.mapSection.note}
              </p>
            </div>
          }
          actions={
            <Link
              href={href(lang, "/map")}
              className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
            >
              <ExpandIcon className="size-4" />
              <span className="hidden sm:inline">{dict.mapSection.expand}</span>
              <span className="sr-only sm:hidden">{dict.mapSection.expand}</span>
            </Link>
          }
        />
      </section>

      <section id="about" aria-labelledby="about-title" className={`${container} scroll-mt-8 py-24 sm:py-32`}>
        <h2 id="about-title" className={sectionTitle}>
          {dict.pillars.title}
        </h2>
        <ol className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {dict.pillars.items.map((item, index) => {
            const Icon = PILLAR_ICONS[index] ?? NetworkIcon;
            return (
              <li key={item.title}>
                <span
                  aria-hidden="true"
                  data-hue={PILLAR_HUES[index] ?? "blue"}
                  className="hue-tile grid size-12 place-items-center rounded-2xl"
                >
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-[0.9375rem] text-ink-2">{item.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="schools-title" className="border-t border-line py-24 sm:py-28">
        <div className={`${container} flex flex-wrap items-end justify-between gap-6`}>
          <h2 id="schools-title" className={sectionTitle}>
            {dict.schoolsStrip.title}
          </h2>
          <Link href={href(lang, "/schools")} className="button button-quiet">
            {dict.schoolsStrip.all}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <Scroller
          label={dict.schoolsStrip.title}
          previousLabel={dict.schoolsStrip.previous}
          nextLabel={dict.schoolsStrip.next}
          pauseLabel={dict.schoolsStrip.pause}
          playLabel={dict.schoolsStrip.play}
        >
          {content.schools.map((school) => {
            const projectCount = schoolProjects(content, school).length;
            const name = localize(school.name, lang);
            return (
              <li key={school.slug} className="w-[13.5rem] shrink-0 snap-start sm:w-60">
                <Link
                  href={`${href(lang, "/schools")}#${school.slug}`}
                  className="group block overflow-hidden rounded-3xl bg-surface transition-transform duration-300 hover:-translate-y-1"
                >
                  {school.logo && (
                    <div data-hue={schoolHue(content, school)} className="hue-portrait relative aspect-[3/4]">
                      <Image src={school.logo} alt="" fill sizes="15rem" className="object-contain p-10" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-semibold leading-tight">{name}</p>
                    <p className="mt-1 text-sm text-ink-3">
                      {projectCount === 0
                        ? dict.schoolsStrip.gettingStarted
                        : projectCount === 1
                          ? dict.schoolsStrip.projectOne
                          : interpolate(dict.schoolsStrip.projectMany, { n: projectCount })}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </Scroller>
      </section>

      {/* The team: present, but not the headline. */}
      <section aria-labelledby="team-title" className="border-t border-line">
        <div className={`${container} flex flex-col gap-8 py-16 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="shrink-0">
            <h2 id="team-title" className="text-xl font-semibold">
              {dict.teamSection.title}
            </h2>
            <p className="mt-1 text-sm text-ink-3">{dict.join.founded}</p>
          </div>
          <ul className="flex flex-wrap gap-x-8 gap-y-5">
            {founders.map((person) => (
              <li key={person.id} className="flex items-center gap-3">
                <Avatar person={person} locale={lang} className="size-12" />
                <div>
                  <p className="font-medium leading-tight">{localize(person.name, lang)}</p>
                  <p className="text-sm text-ink-3">{localize(person.role, lang)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href={href(lang, "/team")} className="button button-quiet shrink-0 self-start lg:self-auto">
            {dict.teamSection.all}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="roadmap-title" className="border-t border-line">
        <div className={`${container} py-24 sm:py-32`}>
          <h2 id="roadmap-title" className={sectionTitle}>
            {dict.roadmap.title}
          </h2>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-8">
            <span aria-hidden="true" className="absolute left-[5px] top-2 bottom-2 w-px bg-line md:inset-x-0 md:bottom-auto md:left-0 md:top-[5px] md:h-px md:w-auto" />
            {dict.roadmap.items.map((item, index) => {
              const isDone = index < currentStage;
              const isCurrent = index === currentStage;
              return (
                <li key={item.stage} className="relative pl-8 md:pl-0 md:pt-9" aria-current={isCurrent ? "step" : undefined}>
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1 size-[11px] rounded-full md:top-0 ${
                      isCurrent
                        ? "bg-accent ring-4 ring-[color-mix(in_oklab,var(--accent)_20%,transparent)]"
                        : isDone
                          ? "bg-ink"
                          : "border border-ink-3 bg-bg"
                    }`}
                  />
                  <p className="flex items-center gap-2 text-sm text-ink-3">
                    {item.when}
                    {isCurrent && (
                      <span className="rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-accent">
                        {dict.roadmap.now}
                      </span>
                    )}
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold">{item.stage}</h3>
                  <p className="mt-1.5 text-[0.9375rem] text-ink-2">{item.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="join" aria-labelledby="join-title" className="scroll-mt-8 border-t border-line">
        <div className={`${container} py-24 sm:py-36`}>
          <div className="max-w-2xl">
            <h2 id="join-title" className="text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              {dict.join.title}
            </h2>
            <p className="mt-5 text-[1.125rem] text-ink-2">{dict.join.body}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="button button-primary mt-9">
              {dict.join.contact}
              <ArrowRightIcon className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <AutoRefresh queuedCount={countQueued(snapshot)} renderedAt={renderedAt} />
    </>
  );
}
