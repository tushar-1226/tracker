import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// Editorial buttons: square, small letter-spaced labels, invert on hover.
const variants = {
  primary: "border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground",
  outline: "border border-foreground bg-transparent hover:bg-foreground hover:text-background",
  ghost: "bg-transparent hover:bg-subtle",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-10 px-4 text-[11px]",
  lg: "h-12 px-6 text-xs",
  icon: "size-9",
} as const;

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-[color,background-color,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
