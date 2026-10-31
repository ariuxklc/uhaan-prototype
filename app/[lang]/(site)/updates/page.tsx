import Image from "next/image";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/page-intro";
import { localize } from "@/content/model";
import { getContent } from "@/lib/content";
import { formatMonth } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/i18n/metadata";

type Props = { params: Promise<{ lang: string }> };

export function generateMetadata({ params }: Props) {
  return pageMetadata(params, "/updates", (dict) => ({
    title: dict.updatesPage.title,
    description: dict.updatesPage.intro,
  }));
}

export default async function UpdatesPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const { updates } = await getContent();

  const groups = [
    { id: "upcoming", title: dict.updatesPage.upcoming, items: updates.filter((update) => update.upcoming) },
    { id: "past", title: dict.updatesPage.past, items: updates.filter((update) => !update.upcoming) },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <PageIntro title={dict.updatesPage.title} intro={dict.updatesPage.intro} />

      <div className="mx-auto w-full max-w-6xl space-y-16 px-5 pb-28 sm:px-8">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`${group.id}-title`}>
            <h2 id={`${group.id}-title`} className="eyebrow">
              {group.title}
            </h2>
            <ol className="mt-6 border-t border-line">
              {group.items.map((update) => (
                <li key={update.id} className="grid gap-2 border-b border-line py-8 md:grid-cols-12 md:gap-8">
                  <p className="text-sm tabular-nums text-ink-3 md:col-span-3 md:pt-1">
                    <time dateTime={update.date}>{formatMonth(update.date, lang)}</time>
                  </p>
                  <div className="md:col-span-9">
                    <p className="text-sm text-accent">{dict.updatesPage.kinds[update.kind]}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{localize(update.title, lang)}</h3>
                    <p className="mt-1 text-ink-2">{localize(update.place, lang)}</p>
                    {update.summary && <p className="mt-3 max-w-xl text-ink-3">{localize(update.summary, lang)}</p>}
                    {update.image && (
                      <div className="relative mt-6 aspect-[16/9] max-w-xl overflow-hidden rounded-2xl">
                        <Image
                          src={update.image.src}
                          alt={localize(update.image.alt, lang)}
                          fill
                          sizes="(min-width: 768px) 36rem, 90vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
