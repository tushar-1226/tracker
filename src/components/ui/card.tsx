import { cn } from "@/lib/utils";

/** Borderless surface floating on the page (shadow comes from `.bg-surface`). */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-3xl bg-surface p-6", className)} {...props} />;
}

export function CardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[13px] font-medium text-muted", className)} {...props} />;
}
