"use client";

import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { ButtonOutline, ButtonPrimary } from "./buttons";
import { useLatestRelease } from "../hooks/useLatestRelease";

/**
 * CTA — Futuristic cyber portal with radial lighting,
 * trust badges, and primary action buttons.
 */
export function Cta() {
  const { downloadUrl, version, loading } = useLatestRelease();

  return (
    <section id="download" className="relative scroll-mt-[84px] overflow-hidden border-y border-white/[0.08] bg-[#03060f]">
      {/* Energy Glow Portal */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#03060f]/60 to-[#03060f]"
      />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center gap-10 px-6 py-24 text-center lg:px-24 lg:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 backdrop-blur-md shadow-[0_0_15px_rgba(0,242,254,0.15)]">
          <Zap className="size-3.5 fill-cyan-400" />
          TẢI XUỐNG MIỄN PHÍ VÀ BẮT ĐẦU NGAY
        </div>

        <div className="flex max-w-[780px] flex-col items-center gap-4">
          <h2 className="font-display text-[36px] font-black uppercase tracking-tight text-white drop-shadow-lg sm:text-[52px] sm:leading-[1.1]">
            NÓI KHÔNG VỚI NÂNG CẤP ĐẮT ĐỎ
          </h2>
          <p className="max-w-[640px] text-base sm:text-lg leading-relaxed text-slate-400">
            Khôi phục hiệu năng thuần khiết của phần cứng. Chẩn đoán hệ thống, bật tối ưu hóa luồng và thống trị mọi giải đấu cùng DAWA Optimizer.
          </p>
        </div>

        {/* Compatibility & Trust Chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
            <CheckCircle2 className="size-3.5 text-cyan-400" />
            Windows 10 / 11 64-bit
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            Vanguard & EAC Safe
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
            <Zap className="size-3.5 text-amber-400" />
            Khôi phục 1 chạm (Restore Point)
          </span>
          {version && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-cyan-300 backdrop-blur-sm">
              <CheckCircle2 className="size-3.5" />
              Phiên bản {version}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <ButtonPrimary href={downloadUrl} download withIcon>
            {loading ? "Đang chuẩn bị link..." : "Tải DAWA ngay (.exe)"}
          </ButtonPrimary>
          <ButtonOutline href="#catalog">Khám phá dịch vụ DAWA</ButtonOutline>
        </div>
      </div>
    </section>
  );
}