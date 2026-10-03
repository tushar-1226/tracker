import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-[11px] font-semibold tracking-[0.18em] uppercase", className)}
      {...props}
    />
  );
}
