import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// Soft pills: filled primary, quiet secondary, transparent ghost.
const variants = {
  primary: "bg-foreground text-background shadow-soft hover:-translate-y-0.5 hover:shadow-lift hover:opacity-95",
  outline: "bg-subtle text-foreground shadow-sm hover:-translate-y-0.5 hover:bg-foreground hover:text-background",
  ghost: "bg-transparent hover:bg-subtle",
} as const;

const sizes = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "size-10",
} as const;

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
};

export function Button({ className, variant = "primary", size = "md", asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-medium whitespace-nowrap transition-[color,background-color,opacity,transform,box-shadow] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
