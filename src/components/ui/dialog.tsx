"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Bottom sheet on phones, floating panel on larger screens. */
export function DialogContent({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[6px] data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out] dark:bg-black/50" />
      <D.Content
        className={cn(
          "fixed bottom-0 left-1/2 z-50 max-h-[92dvh] w-full -translate-x-1/2 overflow-y-auto overscroll-contain rounded-t-[2rem] bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,540px)] sm:-translate-y-1/2 sm:rounded-[2rem] sm:p-8",
          "data-[state=closed]:animate-[dialog-out_150ms_ease-in] data-[state=open]:animate-[sheet-in_420ms_var(--ease-out-expo)] sm:data-[state=open]:animate-[dialog-in_350ms_var(--ease-out-expo)]",
          className,
        )}
      >
        <div aria-hidden className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-subtle sm:hidden" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-xl font-semibold tracking-tight">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close aria-label="Close" className="-mt-1 -mr-2 inline-flex size-9 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background">
            <X className="size-4" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
