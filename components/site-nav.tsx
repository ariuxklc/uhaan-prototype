"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

const linkClass =
  "inline-flex h-10 items-center whitespace-nowrap px-3 text-sm text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:font-medium";

/** Links inline on wide screens; a small menu on narrow ones. */
export function SiteNav({ items, label, menuLabel }: { items: NavItem[]; label: string; menuLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Close on Escape; links close it when chosen.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label={label} className="order-last lg:order-none">
      <ul className="hidden items-center lg:flex">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} className={linkClass}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full text-ink-2 hover:text-ink lg:hidden"
      >
        <span className="sr-only">{menuLabel}</span>
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3.5 7h13M3.5 13h13" />}
        </svg>
      </button>

      {open && (
        <ul
          id={panelId}
          className="absolute inset-x-3 top-[calc(100%+0.25rem)] z-30 rounded-2xl bg-surface p-2 shadow-soft lg:hidden"
        >
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className="flex h-12 items-center rounded-xl px-4 text-base text-ink-2 hover:bg-bg aria-[current=page]:font-medium aria-[current=page]:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
