import { Reveal } from "@/components/motion/reveal";
import { SectionIcon } from "./section-icon";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Kept for callers that translate the title; no longer shown. */
  navLabel?: string;
}) {
  return (
    <Reveal className="relative mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[2rem] bg-surface px-6 py-7 shadow-soft md:mb-10 md:px-9 md:py-10">
      <span aria-hidden className="tint-glow pointer-events-none absolute inset-0" />
      <span aria-hidden className="pointer-events-none absolute -right-14 -bottom-28 size-64 rounded-full border-[26px] border-tint/[0.08]" />
      <span aria-hidden className="pointer-events-none absolute right-10 -bottom-16 size-32 rounded-full border-[14px] border-tint/[0.06]" />
      <div className="relative min-w-0">
        <SectionIcon />
        <h1 className="text-[2.25rem] leading-[1.05] font-semibold tracking-tight md:text-[3.25rem]">
          {title}
          <span className="text-tint">.</span>
        </h1>
        {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="relative">{actions}</div>}
    </Reveal>
  );
}
