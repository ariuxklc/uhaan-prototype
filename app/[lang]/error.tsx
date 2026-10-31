"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

// Kept inline so the error boundary doesn't pull whole dictionaries into the bundle.
const COPY = {
  mn: {
    title: "Алдаа гарлаа",
    body: "Мэдээг ачаалж чадсангүй. Ихэвчлэн түр зуурын асуудал байдаг.",
    retry: "Дахин оролдох",
  },
  en: {
    title: "Something went wrong",
    body: "The bulletin couldn't be loaded. This is usually temporary.",
    retry: "Try again",
  },
} as const;

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ lang?: string }>();
  const copy = params.lang === "en" ? COPY.en : COPY.mn;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-24 sm:px-6 lg:px-10">
      <p className="label">{error.digest ?? "Error"}</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.03em]">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-[34rem] text-ink-2">{copy.body}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex rounded-full bg-ink px-5 py-2.5 font-medium text-paper"
      >
        {copy.retry}
      </button>
    </div>
  );
}
