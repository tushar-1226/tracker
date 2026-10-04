import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl bg-subtle px-4 text-[15px] transition-[background-color,box-shadow] duration-200 outline-none placeholder:text-muted focus:bg-surface focus:shadow-[0_0_0_2px_var(--foreground)] aria-invalid:shadow-[0_0_0_2px_var(--muted)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
