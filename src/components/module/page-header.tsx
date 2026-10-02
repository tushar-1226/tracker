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
  return (
    <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted md:text-base">{description}</p>}
      </div>
      {actions}
    </Reveal>
  );
}
