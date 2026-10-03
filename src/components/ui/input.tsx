import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full border border-foreground/25 bg-transparent px-4 text-sm transition-colors duration-200 outline-none placeholder:text-muted focus:border-foreground aria-invalid:border-foreground aria-invalid:border-dashed",
        className,
      )}
      {...props}
    />
  );
}
