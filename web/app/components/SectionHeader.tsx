type SectionHeaderProps = {
  badge: string;
  title: string;
  sub: string;
};

/**
 * Shared section header — High-tech HUD aesthetic with glowing radar badge,
 * bold cyber typography and balanced subtext.
 */
export function SectionHeader({ badge, title, sub }: SectionHeaderProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1248px] flex-col items-center gap-4 text-center">
      <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(0,242,254,0.15)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
        </span>
        <span>{badge}</span>
      </div>
      <h2 className="max-w-[920px] font-display text-[32px] font-black uppercase tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)] sm:text-[42px] sm:leading-[1.15]">
        {title}
      </h2>
      <p className="max-w-[680px] text-base leading-relaxed text-slate-400 sm:text-lg">{sub}</p>
    </div>
  );
}