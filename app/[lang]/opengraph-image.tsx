import { ImageResponse } from "next/og";

import { isLocale, LOCALES } from "@/lib/i18n/config";

export const alt = "Utaani Tagnuul: students measuring the air we breathe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

const COPY = {
  mn: {
    brand: "Утааны Тагнуул",
    sub: "Utaani Tagnuul",
    headline: "Амьсгалах агаараа бид өөрсдөө хэмжинэ.",
    footer: "Улаанбаатарын сурагчдын санаачилга",
  },
  en: {
    brand: "Utaani Tagnuul",
    sub: "Утааны Тагнуул",
    headline: "We measure the air we breathe.",
    footer: "A student initiative from Ulaanbaatar",
  },
} as const;

/**
 * Fetches static Golos Text instances containing just the glyphs used here
 * (including Mongolian Ө and Ү), so the Cyrillic renders. The image renderer
 * can't use variable fonts, and Google only serves Roboto Flex's default
 * instance statically. Returns null when offline; the card then falls back to
 * Latin-only text.
 */
async function loadFont(weight: 400 | 700, text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Golos+Text:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl, { signal: AbortSignal.timeout(5_000) })).text();
    const fontUrl = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!fontUrl) return null;
    const response = await fetch(fontUrl, { signal: AbortSignal.timeout(5_000) });
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const requested = COPY[isLocale(lang) ? lang : "mn"];
  const glyphs = Object.values(COPY).flatMap(Object.values).join("");
  const [bold, regular] = await Promise.all([loadFont(700, glyphs), loadFont(400, glyphs)]);
  const fontData = bold && regular ? { bold, regular } : null;
  // Without the font, Cyrillic can't be drawn: use the English card.
  const copy = fontData ? requested : COPY.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f6f6f2",
          backgroundImage: "radial-gradient(circle at 88% 0%, #d9e6f5 0%, rgba(246,246,242,0) 60%)",
          color: "#1b1c1f",
          padding: "72px 80px",
          fontFamily: fontData ? "Golos" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12.25" stroke="#1b1c1f" strokeWidth="2.5" />
            <path d="M8.5 12.25h15M7 17h12.5M10.5 21.75h8.5" stroke="#1b1c1f" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="23.5" cy="17" r="2.2" fill="#2f5fb3" />
          </svg>
          <span style={{ fontSize: 30, fontWeight: 700 }}>{copy.brand}</span>
          {fontData && <span style={{ fontSize: 22, fontWeight: 400, color: "#6b6d72" }}>{copy.sub}</span>}
        </div>

        <div style={{ display: "flex", maxWidth: 900, fontSize: 76, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3 }}>
          {copy.headline}
        </div>

        <span style={{ fontSize: 24, fontWeight: 400, color: "#4b4d52" }}>{copy.footer}</span>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            { name: "Golos", data: fontData.bold, weight: 700, style: "normal" },
            { name: "Golos", data: fontData.regular, weight: 400, style: "normal" },
          ]
        : undefined,
    },
  );
}
