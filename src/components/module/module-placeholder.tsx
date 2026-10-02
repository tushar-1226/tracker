import { NAV_ITEMS } from "@/components/layout/nav";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "./page-header";

/** Temporary page for modules that are planned but not built yet. */
export function ModulePlaceholder({ href }: { href: string }) {
  const item = NAV_ITEMS.find((i) => i.href === href)!;
  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <Reveal delay={0.1}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border">
            <item.icon className="size-6" />
          </div>
          <div>
            <p className="font-medium">Coming in Phase {item.phase}</p>
            <p className="mt-1 text-sm text-muted">This section is planned — see PLAN.md.</p>
          </div>
        </div>
      </Reveal>
    </>
  );
}
