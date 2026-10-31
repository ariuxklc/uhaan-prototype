import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/dictionaries/en";
import { mn } from "@/lib/i18n/dictionaries/mn";
import { switchLocalePath } from "@/lib/i18n/routes";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value] as [string, string]] : leaves(value, `${prefix}${key}.`),
  );
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("dictionaries", () => {
  const english = new Map(leaves(en as unknown as Tree));
  const mongolian = new Map(leaves(mn as unknown as Tree));

  it("have exactly the same keys", () => {
    expect([...mongolian.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("have no empty strings", () => {
    for (const [key, value] of [...english, ...mongolian]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("use the same placeholders in both languages", () => {
    for (const [key, value] of english) {
      expect(placeholders(mongolian.get(key) ?? ""), key).toEqual(placeholders(value));
    }
  });

  it("write Mongolian copy in Cyrillic", () => {
    const latinOnly = [...mongolian].filter(
      ([key, value]) =>
        /[a-z]{4,}/i.test(value.replace(/\{\w+\}/g, "")) &&
        !/[\u0400-\u04FF]/.test(value) &&
        // Brand, unit and language-switch strings are intentionally Latin.
        !["nav.switchLanguage", "aqi.unit", "map.legend", "map.source"].includes(key),
    );
    expect(latinOnly).toEqual([]);
  });
});

describe("switchLocalePath", () => {
  it("swaps the locale and keeps the rest of the path", () => {
    expect(switchLocalePath("/mn/city/darkhan", "en")).toBe("/en/city/darkhan");
    expect(switchLocalePath("/en", "mn")).toBe("/mn");
    expect(switchLocalePath("/about", "en")).toBe("/en/about");
  });
});
