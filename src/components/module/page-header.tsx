import { Reveal } from "@/components/motion/reveal";

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
    <Reveal className="relative mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[2rem] bg-surface px-6 py-7 shadow-soft md:mb-10 md:px-8 md:py-9">
      <span aria-hidden className="pointer-events-none absolute -right-12 -bottom-24 size-56 rounded-full border-[24px] border-foreground/[0.035]" />
      <div className="min-w-0">
        <h1 className="text-[2.25rem] leading-[1.05] font-semibold tracking-tight md:text-[3.25rem]">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
      </div>
      {actions}
    </Reveal>
  );
}
