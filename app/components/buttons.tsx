import type { ReactNode } from "react";
import { Download } from "lucide-react";

type ButtonProps = {
  href?: string;
  children: ReactNode;
  download?: boolean | string;
};

/**
 * Primary button — Figma spec: bg #ff1b2d, radius 4, padding 16/32,
 * Archivo Black 14px, gap 8 between label and icon.
 */
export function ButtonPrimary({
  href = "#",
  children,
  withIcon = false,
  download,
}: ButtonProps & { withIcon?: boolean }) {
  return (
    <a
      href={href}
      download={download}
      className="inline-flex items-center justify-center gap-2 rounded bg-rduc-red px-8 py-4 font-display text-sm text-white transition-colors hover:bg-[#ff3a49]"
    >
      {children}
      {withIcon ? (
        <Download className="size-4" strokeWidth={2} aria-hidden />
      ) : null}
    </a>
  );
}

/** Outline button — Figma spec: transparent bg, 1px white border, radius 4. */
export function ButtonOutline({ href = "#", children }: ButtonProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded border border-white px-8 py-4 font-display text-sm text-white transition-colors hover:bg-white/10"
    >
      {children}
    </a>
  );
}