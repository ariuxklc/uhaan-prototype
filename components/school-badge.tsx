import Image from "next/image";

import type { School } from "@/content/model";

/** A school's logo, or nothing until it has one. */
export function SchoolBadge({
  school,
  className = "size-10 rounded-xl",
}: {
  school: School;
  className?: string;
}) {
  if (!school.logo) return null;
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-surface ${className}`}>
      <Image src={school.logo} alt="" fill sizes="64px" className="object-contain p-[8%]" />
    </span>
  );
}
