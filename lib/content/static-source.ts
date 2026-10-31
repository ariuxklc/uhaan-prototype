import { MONITORS } from "@/content/monitors";
import { PEOPLE } from "@/content/people";
import { PROJECTS } from "@/content/projects";
import { SCHOOLS } from "@/content/schools";
import { UPDATES } from "@/content/updates";
import type { ContentSource } from "@/lib/content/source";

/** Content edited as typed files in `content/`. */
export const staticSource: ContentSource = {
  async load() {
    return { schools: SCHOOLS, people: PEOPLE, projects: PROJECTS, updates: UPDATES, monitors: MONITORS };
  },
};
