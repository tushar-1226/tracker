import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border bg-surface p-6", className)} {...props} />;
}

export function CardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] font-semibold tracking-[0.18em] uppercase", className)}
      {...props}
    />
  );
}
