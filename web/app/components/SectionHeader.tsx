type SectionHeaderProps = {
  badge: string;
  title: string;
  sub: string;
};

/**
 * Shared section header — Figma spec: centered stack, gap 16,
 * red dot + JetBrains Mono 700 12px label, Archivo Black 40px title,
 * Archivo 16px muted subtitle (max-width 640).
 */
export function SectionHeader({ badge, title, sub }: SectionHeaderProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1248px] flex-col items-center gap-4 text-center">
      <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-rduc-red">
        <span className="size-2 rounded-sm bg-rduc-red" aria-hidden />
        {badge}
      </p>
      <h2 className="max-w-[900px] font-display text-[32px] leading-tight sm:text-[40px] sm:leading-[44px]">
        {title}
      </h2>
      <p className="max-w-[640px] text-base leading-[1.6] text-rduc-muted">{sub}</p>
    </div>
  );
}