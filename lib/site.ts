/** Public origin used for canonical URLs, sitemaps and social cards. */
export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // Fall through to the local default when misconfigured.
    }
  }
  return new URL("http://localhost:3000");
}

/**
 * Where "Write to us" goes. Defaults to the project's communications lead, as
 * listed in the project scope document; override with a shared project address
 * when one exists.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "choidelgerg@gmail.com";
