import type { CSSProperties } from "react";

/** The calm opening of each inner page: a title and one line. */
export function PageIntro({ title, intro }: { title: string; intro: string }) {
  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-32 sm:px-8 sm:pb-20 sm:pt-44">
        <h1 className="reveal text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.03] tracking-[-0.035em]">
          {title}
        </h1>
        <p className="reveal mt-5 max-w-xl text-[1.125rem] text-ink-2" style={{ "--i": 1 } as CSSProperties}>
          {intro}
        </p>
      </div>
    </div>
  );
}
