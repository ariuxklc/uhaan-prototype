import type { SVGProps } from "react";

/**
 * A small, consistent icon set drawn for this site: 20px grid, 1.5px strokes,
 * round joins. Decorative by default; the control around each icon carries
 * the accessible name.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10h11.5M11 5.5l4.5 4.5-4.5 4.5" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 10H4.5M9 5.5 4.5 10 9 14.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.5v9M5.75 8.5 10 12.75l4.25-4.25M4 16.5h12" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 5v10M12.5 5v10" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 4.75v10.5L15.5 10z" />
    </Icon>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5 11.5 8.5M3.5 16.5l5-5" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 9v4.5" />
      <circle cx="10" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v1.75M10 16.25V18M2 10h1.75M16.25 10H18M4.34 4.34l1.24 1.24M14.42 14.42l1.24 1.24M4.34 15.66l1.24-1.24M14.42 5.58l1.24-1.24" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16.25 12.4A6.75 6.75 0 0 1 7.6 3.75a6.75 6.75 0 1 0 8.65 8.65Z" />
    </Icon>
  );
}

/* Icons for the "What we do" tiles. */

export function NetworkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="6" r="2.25" />
      <circle cx="15" cy="5" r="2.25" />
      <circle cx="10.5" cy="15" r="2.25" />
      <path d="M7.2 5.8 12.8 5.2M6.1 8 9.4 13M14 7.1l-2.6 5.8" />
    </Icon>
  );
}

export function ChipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" />
      <path d="M8 2.5v3M12 2.5v3M8 14.5v3M12 14.5v3M2.5 8h3M2.5 12h3M14.5 8h3M14.5 12h3" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function AirIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 7.5h8.25a2.25 2.25 0 1 0-2.25-2.25M2.5 11h11.75a2.5 2.5 0 1 1-2.5 2.5M2.5 14.5h5" />
    </Icon>
  );
}

export function DataIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="9" cy="4.75" rx="5.5" ry="2" />
      <path d="M3.5 4.75v10.5c0 1.1 2.46 2 5.5 2M14.5 4.75V9M3.5 10c0 1.1 2.46 2 5.5 2" />
      <path d="M12.5 17.5 17 13M13.5 13H17v3.5" />
    </Icon>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 5.25 7.5 3.5l5 1.75 4.75-1.75v11.25L12.5 16.5l-5-1.75-4.75 1.75Z" />
      <path d="M7.5 3.5v11.25M12.5 5.25V16.5" />
    </Icon>
  );
}

export function WorkshopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6.5" cy="6" r="2.25" />
      <circle cx="13.5" cy="6" r="2.25" />
      <path d="M2.5 16c.4-2.6 2-4 4-4s3.6 1.4 4 4M9.5 16c.4-2.6 2-4 4-4s3.6 1.4 4 4" />
    </Icon>
  );
}
