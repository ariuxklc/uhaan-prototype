import type { MetadataRoute } from "next";

import { LOCALES } from "@/lib/i18n/config";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const url = (path: string) => new URL(path, base).toString();

  const paths = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/map", changeFrequency: "hourly" as const, priority: 0.8 },
    ...["/projects", "/schools", "/team", "/updates", "/data"].map((path) => ({
      path,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return paths.flatMap(({ path, changeFrequency, priority }) =>
    LOCALES.map((locale) => ({
      url: url(`/${locale}${path}`),
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((other) => [other, url(`/${other}${path}`)])),
      },
    })),
  );
}
