import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-foreground text-background hover:opacity-85",
  outline: "border bg-transparent hover:bg-subtle",
  ghost: "bg-transparent hover:bg-subtle",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
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
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[opacity,background-color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
