import { cn } from "@/lib/utils";

// The "ASM" brand mark. Decorative: the product name always appears next to it as text.
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-9 items-center justify-center rounded-lg px-2 text-sm font-bold italic", className)}
    >
      ASM
    </span>
  );
}
