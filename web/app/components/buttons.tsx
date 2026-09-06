import type { ReactNode } from "react";
import { Download } from "lucide-react";

type ButtonProps = {
  href?: string;
  children: ReactNode;
  download?: boolean | string;
  className?: string;
};

/**
 * Primary Cyber Button — High-tech gradient, top specular highlight & electric neon glow
 */
export function ButtonPrimary({
  href = "#",
  children,
  withIcon = false,
  download,
  className = "",
}: ButtonProps & { withIcon?: boolean }) {
  return (
    <a
      href={href}
      download={download}
      className={`group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-[#1677ff] via-[#2f88ff] to-[#1264df] px-8 py-4 font-display text-sm font-bold text-white shadow-[0_4px_24px_rgba(22,119,255,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(22,119,255,0.65),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0 ${className}`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {withIcon ? (
          <Download className="size-4 transition-transform duration-200 group-hover:translate-y-0.5" strokeWidth={2.2} aria-hidden />
        ) : null}
      </span>
      {/* Light sheen effect */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" aria-hidden />
    </a>
  );
}

/** 
 * Outline Glass Button — Cyber border with subtle ambient backfill
 */
export function ButtonOutline({ href = "#", children, className = "" }: ButtonProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.04] px-8 py-4 font-display text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#38bdf8]/70 hover:bg-[#1677ff]/12 hover:text-[#e0f2fe] hover:shadow-[0_0_20px_rgba(56,189,248,0.22)] active:translate-y-0 ${className}`}
    >
      {children}
    </a>
  );
}