import { NAV_ITEMS } from "@/components/layout/nav";
import { Reveal } from "@/components/motion/reveal";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const index = NAV_ITEMS.findIndex((i) => i.label === title);
  return (
    <Reveal className="mb-10 border-b-2 border-foreground pb-6 md:mb-14">
      <div className="flex items-baseline justify-between gap-4 border-b pb-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
        <span>{index >= 0 ? `(${String(index + 1).padStart(2, "0")})` : "(—)"}</span>
        {description && <span className="truncate text-right text-muted">{description}</span>}
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-[3.25rem] leading-[0.85] font-bold tracking-[-0.055em] uppercase md:text-[7.5rem]">{title}</h1>
        {actions}
      </div>
    </Reveal>
  );
}
