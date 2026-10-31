import type { Monitor, Person, Project, School, Update } from "@/content/model";
import type { RawContent } from "@/lib/content/validate";

/** Everything the site shows about the initiative itself, each list in display order. */
export interface SiteContent {
  schools: readonly School[];
  people: readonly Person[];
  projects: readonly Project[];
  updates: readonly Update[];
  /** School air monitors; their readings come from `lib/monitors`. */
  monitors: readonly Monitor[];
}

/**
 * Where content comes from. Today it is the typed files in `content/`; with
 * Firebase it becomes a Firestore source returning each collection's
 * documents as they are stored. `getContent()` validates and orders whatever a
 * source returns, so pages and components never change.
 */
export interface ContentSource {
  load(): Promise<RawContent>;
}
