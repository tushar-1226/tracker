import { cn } from "@/lib/utils";

/** Grayscale cover with a typographic fallback. Covers come from Open Library (remote, unoptimised). */
export function BookCover({ src, title, className }: { src: string | null; title: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-xl border bg-subtle", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover grayscale contrast-[1.05]" />
      ) : (
        <span className="absolute inset-0 flex items-end p-2.5 text-[11px] leading-tight font-medium">{title}</span>
      )}
    </div>
  );
}
