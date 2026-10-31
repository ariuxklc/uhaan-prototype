/**
 * The mark: a scout's lens looking through layers of haze, with a single
 * "blip" picked out. Inherits `currentColor`; the blip uses the accent.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="12.25" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M8.5 12.25h15M7 17h12.5M10.5 21.75h8.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="17" r="2" fill="var(--accent)" />
    </svg>
  );
}
