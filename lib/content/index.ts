import "server-only";

import { cache } from "react";

import type { ContentSource, SiteContent } from "@/lib/content/source";
import { staticSource } from "@/lib/content/static-source";
import { validateContent } from "@/lib/content/validate";

export type { SiteContent } from "@/lib/content/source";

/** The active content source. A Firestore source is swapped in here. */
const source: ContentSource = staticSource;

/** Each problem is logged once per server process, not on every render. */
const reported = new Set<string>();

/** Site content, checked and in display order, loaded once per render. */
export const getContent = cache(async (): Promise<SiteContent> => {
  const { content, problems } = validateContent(await source.load());
  for (const { collection, entry, message } of problems) {
    const line = `[content] ${collection}/${entry}: ${message}`;
    if (!reported.has(line)) {
      reported.add(line);
      console.warn(line);
    }
  }
  return content;
});
