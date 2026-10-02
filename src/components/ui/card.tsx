import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border bg-surface p-6", className)} {...props} />;
}

export function CardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs font-medium tracking-wide text-muted uppercase", className)}
      {...props}
    />
  );
}
